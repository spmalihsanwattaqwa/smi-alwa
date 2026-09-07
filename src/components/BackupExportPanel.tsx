import React, { useState } from 'react';
import { 
  Download, 
  Upload, 
  Database, 
  FileSpreadsheet, 
  Settings, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  HardDrive, 
  CloudLightning,
  ChevronRight,
  Info,
  ShieldAlert,
  Trash2,
  Cloud,
  Folder,
  FolderPlus,
  File,
  ExternalLink
} from 'lucide-react';
import { googleSignIn, getAccessToken } from '../lib/firebase';
import { PengaturanSistem } from '../types';
import { DEFAULT_SISTEM_CONFIG } from '../data';
import { realtimeSync } from '../lib/realtimeSync';
import { sanitizeIdNumber } from '../utils_id';
import { formatDateToDDMMYYYY, isDateKeyOrValue } from '../utils_date';
import { 
  downloadUstadzExcelTemplate, 
  downloadUstadzCsvTemplate, 
  parseExcelOrCsvFile, 
  mapRowToUstadz, 
  saveImportedUstadzList 
} from '../utils_excel_import';

interface BackupExportPanelProps {
  pendaftar?: any[];
  config?: PengaturanSistem;
  updateConfig?: (cfg: PengaturanSistem) => void;
  availableYears?: string[];
  isEditable?: boolean;
}

export default function BackupExportPanel({ 
  pendaftar = [], 
  config = DEFAULT_SISTEM_CONFIG,
  updateConfig,
  availableYears = ['2024/2025', '2025/2026', '2026/2027', '2027/2028'],
  isEditable = true
}: BackupExportPanelProps) {
  // Navigation tabs inside the Backup Page
  const [activeSubTab, setActiveSubTab] = useState<'lokal' | 'sheets' | 'impor' | 'drive'>('lokal');
  
  // Year selection for backup
  const [selectedTahunBackup, setSelectedTahunBackup] = useState<string>(() => {
    return localStorage.getItem('cfg_tahun_ajaran_aktif')?.split(' ')[0] || '2026/2027';
  });

  // Status states
  const [alertMsg, setAlertMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Default official working Google Apps Script Web App for Pondok Tahfidz Al-Ihsan
  const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbxRwSRDJfp9V7w-B1ggihfImbg3oKLAO2_oIbRVLOS8-c5_h1UYU5pYczNT-bQwkpuI/exec';

  // Use values from config prop, falling back to localStorage for transition period
  const rawScriptUrl = (config.appsScriptUrl || localStorage.getItem('cfg_apps_script_url') || '').trim();
  const appsScriptUrl = (!rawScriptUrl || rawScriptUrl.includes('...') || rawScriptUrl.includes('AKfycb...') || rawScriptUrl.includes('docs.google.com/spreadsheets'))
    ? DEFAULT_URL
    : rawScriptUrl;
  const cloudSpreadsheetId = config.spreadsheetId || localStorage.getItem('cfg_cloud_spreadsheet_id') || '1pANnXmFHN1KOIFavrjMJ5NgfobMuGdMiBcsSb0EjE9Q';
  const ustadzFolderId = config.ustadzFolderId || localStorage.getItem('cfg_ustadz_folder_id') || '';
  const siswaFolderId = config.siswaFolderId || localStorage.getItem('cfg_siswa_folder_id') || '';
  const isImportFeatureEnabled = config.importFeatureEnabled !== undefined ? config.importFeatureEnabled : (localStorage.getItem('cfg_import_feature_enabled') !== 'false');

  const setAppsScriptUrl = (val: string) => {
    let clean = val.trim();
    if (!clean || clean.includes('...') || clean.includes('AKfycb...') || clean.includes('docs.google.com/spreadsheets')) {
      clean = DEFAULT_URL;
    }
    if (updateConfig) {
      updateConfig({ ...config, appsScriptUrl: clean });
    }
    localStorage.setItem('cfg_apps_script_url', clean);
  };

  const setCloudSpreadsheetId = (val: string) => {
    if (updateConfig) {
      updateConfig({ ...config, spreadsheetId: val });
    }
    localStorage.setItem('cfg_cloud_spreadsheet_id', val);
  };

  const setUstadzFolderId = (val: string) => {
    if (updateConfig) {
      updateConfig({ ...config, ustadzFolderId: val });
    }
    localStorage.setItem('cfg_ustadz_folder_id', val);
  };

  const setSiswaFolderId = (val: string) => {
    if (updateConfig) {
      updateConfig({ ...config, siswaFolderId: val });
    }
    localStorage.setItem('cfg_siswa_folder_id', val);
  };

  const setIsImportFeatureEnabled = (val: boolean) => {
    if (updateConfig) {
      updateConfig({ ...config, importFeatureEnabled: val });
    }
    localStorage.setItem('cfg_import_feature_enabled', String(val));
  };

  // State for import merge method ('append' or 'overwrite')
  const [importMethod, setImportMethod] = useState<'append' | 'overwrite'>('append');

  const [isCreatingFolders, setIsCreatingFolders] = useState(false);

  const handleCreateDriveFolders = async () => {
    setIsCreatingFolders(true);
    try {
      let token = getAccessToken();
      if (!token) {
        const result = await googleSignIn();
        if (!result) throw new Error('Mohon login ke Google terlebih dahulu');
        token = result.accessToken;
      }

      // 1. Create Main Root Folder (if needed)
      const rootFolderName = `DOKUMEN SEKOLAH AL-IHSAN`;
      const rootRes = await fetch('/api/drive/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: rootFolderName })
      });
      const rootData = await rootRes.json();
      if (!rootRes.ok) throw new Error(rootData.error || 'Gagal membuat folder root');
      const rootId = rootData.id;

      // 2. Create Ustadz Folder
      const uRes = await fetch('/api/drive/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: 'BERKAS USTADZ & GURU', parentId: rootId })
      });
      const uData = await uRes.json();
      if (!uRes.ok) throw new Error(uData.error || 'Gagal membuat folder ustadz');
      setUstadzFolderId(uData.id);
      localStorage.setItem('cfg_ustadz_folder_id', uData.id);

      // 3. Create Siswa Folder
      const sRes = await fetch('/api/drive/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: 'BERKAS SISWA & SANTRI', parentId: rootId })
      });
      const sData = await sRes.json();
      if (!sRes.ok) throw new Error(sData.error || 'Gagal membuat folder siswa');
      setSiswaFolderId(sData.id);
      localStorage.setItem('cfg_siswa_folder_id', sData.id);

      triggerAlert("Alhamdulillah! Folder dokumen Ustadz dan Siswa berhasil dibuat di Google Drive.", "success");
    } catch (err: any) {
      triggerAlert("Gagal membuat folder: " + err.message, "error");
    } finally {
      setIsCreatingFolders(false);
    }
  };

  const handleCloudSync = async () => {
    let targetId = cloudSpreadsheetId.trim();
    
    // Auto-extract ID from URL if user pasted a full URL
    if (targetId.includes('docs.google.com/spreadsheets/d/')) {
      const match = targetId.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        targetId = match[1];
        setCloudSpreadsheetId(targetId);
      }
    }

    setIsSyncing(true);
    try {
      let token = getAccessToken();
      if (!token) {
        const result = await googleSignIn();
        if (!result) throw new Error('Mohon login ke Google terlebih dahulu');
        token = result.accessToken;
      }

      // Gather all local tables with records
      const syncPayload: Record<string, any> = {};
      LOCAL_STORAGE_KEYS.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            syncPayload[key] = JSON.parse(data);
          } catch {
            // Handle non-JSON strings (like config strings)
            syncPayload[key] = data;
          }
        }
      });

      const response = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          data: syncPayload,
          spreadsheetId: targetId,
          appsScriptUrl: appsScriptUrl || localStorage.getItem('cfg_apps_script_url') || ''
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Gagal sinkronisasi' }));
        throw new Error(errorData.error || 'Gagal sinkronisasi');
      }

      const result = await response.json();

      if (result.spreadsheetId) {
        setCloudSpreadsheetId(result.spreadsheetId);
        localStorage.setItem('cfg_cloud_spreadsheet_id', result.spreadsheetId);
      }

      triggerAlert("Alhamdulillah! Sinkronisasi Seluruh Data Master & Akademik ke Cloud berhasil!", "success");
    } catch (err: any) {
      triggerAlert("Sinkronisasi Gagal: " + err.message, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const LOCAL_STORAGE_KEYS = [
    'db_pendaftar',
    'db_berita',
    'db_config',
    'db_school_profile',
    'db_students',
    'db_teachers_attendance',
    'db_visimisi',
    'db_struktur',
    'db_kelas',
    'db_pelajaran',
    'db_jadwal',
    'pesan_masuk',
    'db_ustadz_master',
    'db_beasiswa',
    'db_beranda_config',
    'cfg_tahun_ajaran_aktif',
    'cfg_semester_aktif',
    'db_student_attendance_v2',
    'db_teachers_attendance_history',
    'db_event_attendance',
    'db_pelajaran_v2',
    'db_grade_categories_v2',
    'db_grades_v2',
    'db_grades_karakter_v2',
    'db_student_mutations',
    'cfg_apps_script_url',
    'db_majelis_tahfidz',
    'db_tahfidz_records_v2',
    'db_rbac_config',
    'db_portal_access',
    'cfg_available_years',
    'db_spm_archives',
    'db_student_archives',
    'cfg_drive_mode',
    'cfg_drive_root_id',
    'cfg_siswa_folder_id',
    'cfg_ustadz_folder_id',
    'cfg_cloud_spreadsheet_id'
  ];

  // Google Apps Script source code template for users to copy
  const appsScriptCode = `/**
 * GOOGLE APPS SCRIPT - DATABASE SINKRONISASI REAL-TIME DUA ARAH
 * Pondok Pesantren / SMP Terpadu Al-Ihsan
 * 
 * Petunjuk Penggunaan:
 * 1. Buka spreadsheet baru di Google Drive Anda.
 * 2. Klik menu "Ekstensi" -> "Apps Script".
 * 3. Hapus seluruh kode bawaan, lalu paste kode ini sepenuhnya.
 * 4. Klik ikon Save (Disket).
 * 5. Klik tombol "Terapkan" (Deploy) -> "Penerapan Baru" (New Deployment).
 * 6. Pilih jenis penerapan: "Aplikasi Web" (Web App).
 * 7. Pada "Jalankan sebagai" (Execute as): Pilih "Saya" (Me).
 * 8. Pada "Siapa yang memiliki akses" (Who has access): Pilih "Siapa saja" (Anyone).
 * 9. Klik "Terapkan" (Deploy), lalu izinkan hak akses jika muncul jendela Google.
 * 10. Salin URL Aplikasi Web yang berakhiran "/exec", lalu tempelkan di kotak isian URL Web App.
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No post data received" })).setMimeType(ContentService.MimeType.JSON);
    }

    var rawJson = e.postData.contents;
    var payload = JSON.parse(rawJson);
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var syncedKeys = [];
    
    // Proses sinkronisasi untuk setiap tabel
    for (var key in payload) {
      if (!payload.hasOwnProperty(key)) continue;
      var rawRecords = payload[key];
      if (rawRecords === null || rawRecords === undefined) continue;
      
      // Dukung array maupun single config object
      var records = Array.isArray(rawRecords) ? rawRecords : [rawRecords];
      if (records.length === 0) continue;
      
      var sheetName = getFriendlySheetName(key);
      var sheet = spreadsheet.getSheetByName(sheetName);
      if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName);
      } else {
        sheet.clear(); // Bersihkan data usang untuk ditimpa penuh
      }
      
      // Ambil daftar header unik dari semua baris
      var headerMap = {};
      var keys = [];
      for (var r = 0; r < records.length; r++) {
        var rec = records[r];
        if (typeof rec === 'object' && rec !== null) {
          for (var prop in rec) {
            if (rec.hasOwnProperty(prop) && !headerMap[prop]) {
              headerMap[prop] = true;
              keys.push(prop);
            }
          }
        }
      }
      
      if (keys.length === 0) {
        keys = ['value'];
        records = records.map(function(v) { return { value: v }; });
      }
      
      // Tulis header
      sheet.appendRow(keys);
      
      // Tulis baris data
      for (var i = 0; i < records.length; i++) {
        var rowData = [];
        for (var j = 0; j < keys.length; j++) {
          var val = records[i] ? records[i][keys[j]] : "";
          if (typeof val === 'object' && val !== null) {
            rowData.push(JSON.stringify(val));
          } else {
            rowData.push(val === undefined || val === null ? "" : val);
          }
        }
        sheet.appendRow(rowData);
      }
      
      // Format Header (Background hijau Al-Ihsan & Teks Tebal Putih)
      sheet.getRange(1, 1, 1, keys.length).setFontWeight("bold").setBackground("#0f766e").setFontColor("#ffffff");
      sheet.setFrozenRows(1);
      syncedKeys.push(sheetName);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      message: "Sinkronisasi real-time berhasil!",
      syncedSheets: syncedKeys,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = spreadsheet.getSheets();
    var result = {};
    
    var reverseMap = {
      'MASTER_PPDB': 'db_pendaftar',
      'MASTER_SISWA': 'db_students',
      'MASTER_GURU_USTADZ': 'db_ustadz_master',
      'MASTER_BEASISWA': 'db_beasiswa',
      'MASTER_ROMBEL_KELAS': 'db_kelas',
      'MASTER_MAPEL_KURIKULUM': 'db_pelajaran',
      'MASTER_MAPEL_NILAI': 'db_pelajaran_v2',
      'JADWAL_PELAJARAN': 'db_jadwal',
      'ABSENSI_SISWA_HARIAN': 'db_student_attendance_v2',
      'ABSENSI_GURU_LOG': 'db_teachers_attendance',
      'ABSENSI_GURU_DETAIL': 'db_teachers_attendance_history',
      'ABSENSI_EVENT_KEGIATAN': 'db_event_attendance',
      'NILAI_AKADEMIK': 'db_grades_v2',
      'NILAI_KARAKTER': 'db_grades_karakter_v2',
      'KATEGORI_NILAI': 'db_grade_categories_v2',
      'CATATAN_TAHFIDZ': 'db_tahfidz_records_v2',
      'DAFTAR_MAJELIS': 'db_majelis_tahfidz',
      'ARSIP_MUTASI_SISWA': 'db_student_mutations',
      'ARSIP_ALUMNI_LULUS': 'db_student_archives',
      'ARSIP_SPM_BULANAN': 'db_spm_archives',
      'BERITA_SEKOLAH': 'db_berita',
      'CONFIG_SISTEM': 'db_config',
      'CONFIG_HAK_AKSES': 'db_rbac_config',
      'PROFIL_SEKOLAH': 'db_school_profile',
      'VISI_MISI': 'db_visimisi',
      'STRUKTUR_ORGANISASI': 'db_struktur',
      'CONFIG_BERANDA': 'db_beranda_config',
      'PESAN_KONTAK_WEB': 'pesan_masuk',
      'INFO_TAHUN_AJARAN': 'cfg_tahun_ajaran_aktif',
      'INFO_SEMESTER': 'cfg_semester_aktif',
      'AKSES_PORTAL': 'db_portal_access'
    };

    for (var i = 0; i < sheets.length; i++) {
      var sheet = sheets[i];
      var name = sheet.getName();
      var key = reverseMap[name] || name.toLowerCase();
      
      var data = sheet.getDataRange().getValues();
      if (!data || data.length < 2) continue;
      
      var headers = data[0];
      var rows = [];
      for (var r = 1; r < data.length; r++) {
        var row = data[r];
        var obj = {};
        var hasContent = false;
        for (var c = 0; c < headers.length; c++) {
          var h = headers[c];
          if (!h) continue;
          var val = row[c];
          if (val !== "" && val !== null && val !== undefined) {
            hasContent = true;
          }
          if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
            try { val = JSON.parse(val); } catch(e) {}
          }
          obj[h] = val;
        }
        if (hasContent) {
          rows.push(obj);
        }
      }
      result[key] = rows;
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      count: Object.keys(result).length,
      data: result,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getFriendlySheetName(key) {
  var mapping = {
    'db_pendaftar': 'MASTER_PPDB',
    'db_students': 'MASTER_SISWA',
    'db_ustadz_master': 'MASTER_GURU_USTADZ',
    'db_beasiswa': 'MASTER_BEASISWA',
    'db_kelas': 'MASTER_ROMBEL_KELAS',
    'db_pelajaran': 'MASTER_MAPEL_KURIKULUM',
    'db_pelajaran_v2': 'MASTER_MAPEL_NILAI',
    'db_jadwal': 'JADWAL_PELAJARAN',
    'db_student_attendance_v2': 'ABSENSI_SISWA_HARIAN',
    'db_teachers_attendance': 'ABSENSI_GURU_LOG',
    'db_teachers_attendance_history': 'ABSENSI_GURU_DETAIL',
    'db_event_attendance': 'ABSENSI_EVENT_KEGIATAN',
    'db_grades_v2': 'NILAI_AKADEMIK',
    'db_grades_karakter_v2': 'NILAI_KARAKTER',
    'db_grade_categories_v2': 'KATEGORI_NILAI',
    'db_tahfidz_records_v2': 'CATATAN_TAHFIDZ',
    'db_majelis_tahfidz': 'DAFTAR_MAJELIS',
    'db_student_mutations': 'ARSIP_MUTASI_SISWA',
    'db_student_archives': 'ARSIP_ALUMNI_LULUS',
    'db_spm_archives': 'ARSIP_SPM_BULANAN',
    'db_berita': 'BERITA_SEKOLAH',
    'db_config': 'CONFIG_SISTEM',
    'db_rbac_config': 'CONFIG_HAK_AKSES',
    'db_school_profile': 'PROFIL_SEKOLAH',
    'db_visimisi': 'VISI_MISI',
    'db_struktur': 'STRUKTUR_ORGANISASI',
    'db_beranda_config': 'CONFIG_BERANDA',
    'pesan_masuk': 'PESAN_KONTAK_WEB',
    'cfg_tahun_ajaran_aktif': 'INFO_TAHUN_AJARAN',
    'cfg_semester_aktif': 'INFO_SEMESTER',
    'db_portal_access': 'AKSES_PORTAL',
    'db_academic_calendar': 'KALENDER_AKADEMIK',
    'db_pondok_agenda': 'AGENDA_PONDOK'
  };
  return mapping[key] || key.toUpperCase();
}`;

  // Helper: Copy Apps Script to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  // Trigger Local Storage Backup (JSON Download)
  const handleDownloadFullBackup = () => {
    try {
      const backupData: Record<string, any> = {};
      LOCAL_STORAGE_KEYS.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            let parsed = JSON.parse(value);
            
            // Filter by academic year if it's a data list and we have a year selected
            if (Array.isArray(parsed) && selectedTahunBackup && selectedTahunBackup !== 'Semua') {
              parsed = parsed.filter((item: any) => 
                !item.academicYear || item.academicYear === selectedTahunBackup
              );
            }
            
            backupData[key] = parsed;
          } catch {
            backupData[key] = value;
          }
        }
      });

      // Wrap with metadata
      const finalPayload = {
        appId: "smp-indonesia-integrated",
        timestamp: new Date().toISOString(),
        formattedDate: new Date().toLocaleString('id-ID'),
        academicYear: selectedTahunBackup,
        data: backupData
      };

      const fileJsonStr = JSON.stringify(finalPayload, null, 2);
      const blob = new Blob([fileJsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const dateStr = new Date().toISOString().split('T')[0];
      const filenameYear = selectedTahunBackup === 'Semua' ? 'SEMUA_TAHUN' : selectedTahunBackup.replace('/', '-');
      link.download = `BACKUP_${filenameYear}_SMP_ALWA_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      triggerAlert('File cadangan penuh (Full Backup) berhasil diekspor ke lokal harddisk anda.', 'success');
    } catch (err: any) {
      triggerAlert('Gagal membuat file cadangan: ' + err.message, 'error');
    }
  };

  // Helper: Toggle the import feature status
  const handleToggleImportFeature = () => {
    const newVal = !isImportFeatureEnabled;
    setIsImportFeatureEnabled(newVal);
    localStorage.setItem('cfg_import_feature_enabled', String(newVal));
    triggerAlert(`Fitur impor data dari Excel berhasil ${newVal ? 'DIAKTIFKAN' : 'DINONAKTIFKAN'}.`, 'success');
  };

  // Helper: Robust CSV parser supporting Semicolon (Excel friendly) and Comma
  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length < 2) return [];

    // Auto detect separator: comma or semicolon
    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : ',';

    const splitLine = (line: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === separator && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = splitLine(firstLine).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
    
    const records: Array<Record<string, string>> = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = splitLine(lines[i]).map(c => c.replace(/^"|"$/g, '').trim());
      if (cells.length === 0 || (cells.length === 1 && cells[0] === "")) continue;

      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (header) {
          record[header] = cells[index] !== undefined ? cells[index] : "";
        }
      });
      records.push(record);
    }
    return records;
  };

  // Helper: Download student import template CSV
  const downloadStudentTemplate = () => {
    const headers = [
      'namaLengkap', 'nisn', 'nik', 'jenisKelamin', 'tempatLahir', 'tanggalLahir', 
      'noWaUtama', 'sekolahAsal', 'provinsi', 'kabupaten', 'kecamatan', 'kelurahan', 
      'dusun', 'namaAyah', 'namaIbu'
    ];
    const sampleData = [
      'Andi Wijaya;0081234123;3171010101980001;Laki-laki;Bogor;14/05/2013;081234567812;SDN Pesantren;Jawa Barat;Bogor;Ciawi;Ciawi;Dusun Kaler;Hadi Wijaya;Siti Aminah',
      'Citra Kirana;0092451001;3171010101980002;Perempuan;Bandung;21/08/2013;08569871231;SDN 1 Lembang;Jawa Barat;Bandung;Lembang;Lembang;Dusun Kidul;Agus Subiyakto;Lilis Marlia'
    ];
    const csvContent = '\uFEFF' + [headers.join(';'), ...sampleData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'TEMPLATE_IMPORT_SISWA_PPDB.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerAlert('Template file Excel/CSV Calon Siswa (PPDB) berhasil diunduh.', 'success');
  };

  // Helper: Download ustadz import template (.xlsx / .csv)
  const downloadUstadzTemplate = () => {
    try {
      downloadUstadzExcelTemplate();
      triggerAlert('Template file Excel Guru/Ustadz (.xlsx) berhasil diunduh.', 'success');
    } catch {
      downloadUstadzCsvTemplate();
      triggerAlert('Template file CSV Guru/Ustadz berhasil diunduh.', 'success');
    }
  };

  // Helper: Handle importing students list
  const handleImportSiswaExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawText = event.target?.result as string;
        const parsedRecords = parseCSV(rawText);

        if (parsedRecords.length === 0) {
          throw new Error('Tidak ada baris data valid yang ditemukan dalam file.');
        }

        const combinedTahun = localStorage.getItem('cfg_tahun_ajaran_aktif') || '2026/2027 Ganjil';
        const activeTahun = combinedTahun.split(' ')[0] || '2026/2027';
        const startYear = activeTahun.split('/')[0] || '2026';

        const formattedStudents = parsedRecords.map((rec, i) => {
          const generatedId = 's_imp_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substr(2, 5);
          const generatedNis = rec.nis || `98${Math.floor(100 + Math.random() * 900)}`;
          
          const rawGender = rec.jeniskelamin || rec.jenis_kelamin || rec.gender || 'Laki-laki';
          const normalizedGender = rawGender.toLowerCase().includes('p') || rawGender.toLowerCase().includes('wanita') || rawGender.toLowerCase().includes('perempuan') ? 'PEREMPUAN' : 'LAKI-LAKI';

          const prov = rec.provinsi || 'Jawa Tengah';
          const kab = rec.kabupaten || rec.kabupatenkota || rec.kabupaten_kota || 'Kebumen';
          const kec = rec.kecamatan || 'Candimulyo';
          const kel = rec.kelurahan || 'Candimulyo';
          const dus = rec.dusun || '-';

          const namaLengkap = rec.namalengkap || rec.nama_lengkap || rec.nama || 'Siswa Baru';
          const noHp = rec.nowautama || rec.no_wa_utama || rec.nowa || rec.nohp || rec.no_hp || '';
          const ortu = rec.namaayah || rec.nama_ayah || rec.namaibu || rec.nama_ibu || '-';

          return {
            id: generatedId,
            nisn: sanitizeIdNumber(rec.nisn) || '',
            nama: namaLengkap,
            kelas: 'Belum Diatur',
            ortu: ortu,
            noHp: sanitizeIdNumber(noHp) || '',
            nis: sanitizeIdNumber(generatedNis) || '',
            nik: sanitizeIdNumber(rec.nik) || '',
            alamat: rec.alamat || `Dusun ${dus}, Kel. ${kel}, Kec. ${kec}, Kab/Kota ${kab}, Prov ${prov}`,
            gender: normalizedGender,
            tempatLahir: rec.tempatlahir || rec.tempat_lahir || 'Kebumen',
            tanggalLahir: formatDateToDDMMYYYY(rec.tanggallahir || rec.tanggal_lahir, '15/05/2013'),

            // Extra registration data columns
            nomorPendaftaran: rec.nomorpendaftaran || rec.nomor_pendaftaran || `PPDB-${startYear}-${Math.floor(1000 + Math.random() * 9000)}`,
            tanggalDaftar: formatDateToDDMMYYYY(rec.tanggaldaftar || rec.tanggal_daftar, formatDateToDDMMYYYY(new Date())),
            agama: rec.agama || 'Islam',
            rt: rec.rt || '01',
            rw: rec.rw || '02',
            kelurahan: kel,
            kecamatan: kec,
            kabupatenKota: kab,
            provinsi: prov,
            dusun: dus,
            jarakRumah: Number(rec.jarakrumah || rec.jarak_rumah || 100),
            sekolahAsal: rec.sekolahasal || rec.sekolah_asal || 'SDN Pesantren',
            nilaiRapor: Number(rec.nilairapor || rec.nilai_rapor || 80),
            jalur: (rec.jalur || 'Zonasi'),
            namaAyah: rec.namaayah || rec.nama_ayah || '',
            namaIbu: rec.namaibu || rec.nama_ibu || '',
            pekerjaanAyah: rec.pekerjaanayah || rec.pekerjaan_ayah || '-',
            pekerjaanIbu: rec.pekerjaanibu || rec.pekerjaan_ibu || '-',
            noHpOrangTua: sanitizeIdNumber(noHp) || '',
            jenisKelamin: normalizedGender,
            academicYear: activeTahun,
            status: 'Aktif',
            
            // Custom fields mapping
            jumlahHafalan: rec.jumlahhafalan || rec.jumlah_hafalan || '',
            saudara: rec.saudara || '1',
            noKK: sanitizeIdNumber(rec.nokk || rec.no_kk) || '',
            statusIbu: rec.statusibu || rec.status_ibu || 'Hidup',
            nikIbu: sanitizeIdNumber(rec.nikibu || rec.nik_ibu) || '',
            hpIbu: sanitizeIdNumber(rec.hpibu || rec.hp_ibu) || '',
            statusAyah: rec.statusayah || rec.status_ayah || 'Hidup',
            nikAyah: sanitizeIdNumber(rec.nikayah || rec.nik_ayah) || '',
            hpAyah: sanitizeIdNumber(rec.hpayah || rec.hp_ayah) || '',
            jmlSaudara: rec.jmlsaudara || rec.jml_saudara || rec.saudara || '1',
            foto: rec.foto || ''
          };
        });

        let finalStudentsList = [];
        const currentSaved = localStorage.getItem('db_students');
        const currentList = currentSaved ? JSON.parse(currentSaved) : [];

        if (importMethod === 'append') {
          const existingNisns = new Set(currentList.map((s: any) => s.nisn).filter(Boolean));
          const existingNames = new Set(currentList.map((s: any) => (s.nama || s.namaLengkap)?.toLowerCase()).filter(Boolean));
          const filteredNew = formattedStudents.filter(s => {
            const hasDuplicateNisn = s.nisn && existingNisns.has(s.nisn);
            const hasDuplicateName = existingNames.has(s.nama.toLowerCase());
            return !hasDuplicateNisn && !hasDuplicateName;
          });
          finalStudentsList = [...currentList, ...filteredNew];
          triggerAlert(`Berhasil menggabungkan ${filteredNew.length} siswa baru (dari total ${formattedStudents.length} baris) ke database siswa. ${formattedStudents.length - filteredNew.length} dilewati karena NISN/Nama ganda.`, 'success');
        } else {
          finalStudentsList = formattedStudents;
          triggerAlert(`Berhasil mengimpor dan menimpa database siswa dengan ${formattedStudents.length} siswa baru dari Excel.`, 'success');
        }

        localStorage.setItem('db_students', JSON.stringify(finalStudentsList));
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);

      } catch (err: any) {
        triggerAlert('Gagal memproses file impor siswa: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  // Helper: Handle importing ustadz list from Excel (.xlsx, .xls) or CSV
  const handleImportUstadzExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rawRecords = await parseExcelOrCsvFile(file);

      if (!rawRecords || rawRecords.length === 0) {
        throw new Error('Tidak ada baris data valid yang ditemukan dalam berkas.');
      }

      const formattedUstadz = rawRecords.map((rec, i) => mapRowToUstadz(rec, i));

      // Filter out completely blank rows
      const validUstadz = formattedUstadz.filter(u => {
        return (u.nama && u.nama !== 'Ustadz Baru' && u.nama.trim() !== '') || (u.nip && u.nip.trim() !== '');
      });

      const finalCandidates = validUstadz.length > 0 ? validUstadz : formattedUstadz;

      let finalUstadzList = [];
      const currentSaved = localStorage.getItem('db_ustadz_master');
      const currentList = currentSaved ? JSON.parse(currentSaved) : [];

      if (importMethod === 'append') {
        const existingNips = new Set(currentList.map((u: any) => (u.nip || '').trim()).filter(Boolean));
        const existingNames = new Set(currentList.map((u: any) => (u.nama || '').trim().toLowerCase()).filter(Boolean));
        
        const filteredNew = finalCandidates.filter(u => {
          if (u.nip && existingNips.has(u.nip.trim())) return false;
          if (!u.nip && u.nama && existingNames.has(u.nama.trim().toLowerCase())) return false;
          return true;
        });

        finalUstadzList = [...currentList, ...filteredNew];
        await saveImportedUstadzList(finalUstadzList);
        triggerAlert(`Berhasil menggabungkan ${filteredNew.length} ustadz baru (dari total ${finalCandidates.length} baris di file Excel) ke database sistem.`, 'success');
      } else {
        finalUstadzList = finalCandidates;
        await saveImportedUstadzList(finalUstadzList);
        triggerAlert(`Berhasil menimpa seluruh database ustadz dengan ${finalCandidates.length} ustadz dari file Excel.`, 'success');
      }

      e.target.value = '';
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err: any) {
      triggerAlert('Gagal memproses file impor ustadz: ' + (err?.message || err), 'error');
      if (e.target) e.target.value = '';
    }
  };

  // Trigger Local Storage Restore (JSON Import)
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmRestore = window.confirm(
      "PERINGATAN: Memulihkan database dari file cadangan akan menimpa seluruh data aktif saat ini! Apakah Anda yakin ingin melanjutkan?"
    );
    if (!confirmRestore) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawResult = event.target?.result as string;
        const payload = JSON.parse(rawResult);

        // Simple validation checks
        if (!payload || typeof payload !== 'object') {
          throw new Error('Format file JSON tidak valid.');
        }

        const dataBlock = payload.data || payload; // Support wrapped or unwrapped format
        if (typeof dataBlock !== 'object' || dataBlock === null) {
          throw new Error('Blok data utama cadangan tidak ditemukan.');
        }

        // Start restoring keys
        let restoredCount = 0;
        Object.keys(dataBlock).forEach(key => {
          if (LOCAL_STORAGE_KEYS.includes(key)) {
            const dataVal = dataBlock[key];
            const valStr = typeof dataVal === 'string' ? dataVal : JSON.stringify(dataVal);
            localStorage.setItem(key, valStr);
            restoredCount++;
          }
        });

        if (restoredCount === 0) {
          throw new Error('Tidak ada kunci database Pondok Tahfidz yang cocok dalam file ini.');
        }

        triggerAlert(`Berhasil! Memulihkan ${restoredCount} database sekolah. Halaman akan dimuat ulang dalam 3 detik...`, 'success');
        
        // Auto reload page to apply database import
        setTimeout(() => {
          window.location.reload();
        }, 3000);

      } catch (err: any) {
        triggerAlert('Gagal memulihkan data: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleResetSystem = () => {
    const confirmReset = window.confirm(
      "PERINGATAN KRITIKAL: Tindakan ini akan MENGHAPUS SELURUH DATA (Siswa, Guru, Nilai, Pengaturan) dari browser ini secara permanen. Apakah Anda yakin?"
    );
    if (!confirmReset) return;

    LOCAL_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
    localStorage.removeItem('db_config');
    localStorage.removeItem('cfg_tahun_ajaran_aktif');
    localStorage.removeItem('cfg_semester_aktif');
    localStorage.removeItem('session_user_role');
    localStorage.removeItem('session_guru_name');

    triggerAlert('Seluruh data sistem telah dibersihkan. Halaman akan dimuat ulang...', 'success');
    setTimeout(() => window.location.reload(), 2000);
  };

  // Helper to safely parse JSON from localStorage
  const getSafeStorageLength = (key: string, isObject: boolean = false) => {
    try {
      const data = localStorage.getItem(key);
      if (!data) return 0;
      const parsed = JSON.parse(data);
      if (isObject && parsed && typeof parsed === 'object') {
        return Object.keys(parsed).length;
      }
      if (Array.isArray(parsed)) {
        return parsed.length;
      }
      return 0;
    } catch (e) {
      return 0;
    }
  };

  // Helper trigger alerts
  const triggerAlert = (text: string, type: 'success' | 'error') => {
    setAlertMsg({ text, type });
    setTimeout(() => setAlertMsg(null), 5000);
  };

  // Generate Excel-friendly CSV exporter
  const exportToCSV = (storageKey: string, filename: string) => {
    try {
      const rawData = localStorage.getItem(storageKey);
      if (!rawData) {
        triggerAlert(`Tabel data "${filename.replace('.csv', '')}" masih kosong di database!`, 'error');
        return;
      }

      const parsed = JSON.parse(rawData);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        triggerAlert(`Tidak ada baris data untuk diekspor pada tabel "${filename.replace('.csv', '')}".`, 'error');
        return;
      }

      // Extract headers from keys of the first item
      const headers = Object.keys(parsed[0]);
      
      // Parse array rows
      const csvRows = [];
      csvRows.push(headers.join(';')); // Use semicolon for excel automatic cell division in many locales

      parsed.forEach(row => {
        const values = headers.map(header => {
          const val = row[header];
          // Escape quotes and convert value
          let cellValue = '';
          if (val === undefined || val === null) {
            cellValue = '';
          } else if (typeof val === 'object') {
            cellValue = JSON.stringify(val).replace(/"/g, '""');
          } else if (isDateKeyOrValue(header, val)) {
            cellValue = formatDateToDDMMYYYY(val, '');
          } else {
            cellValue = sanitizeIdNumber(val);
          }
          cellValue = String(cellValue).replace(/"/g, '""');
          // Wrap in quotes if it contains semicolon or newline or comma
          if (cellValue.includes(';') || cellValue.includes('\n') || cellValue.includes(',')) {
            cellValue = `"${cellValue}"`;
          }
          return cellValue;
        });
        csvRows.push(values.join(';'));
      });

      // Add UTF-8 Byte Order Mark (BOM) so Excel respects special chars out-of-the-box
      const csvContent = '\uFEFF' + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      triggerAlert(`File spreadsheet CSV (${filename}) berhasil diunduh ke lokal komputer Anda.`, 'success');
    } catch (err: any) {
      triggerAlert('Gagal mengekspor CSV: ' + err.message, 'error');
    }
  };

  // Test Google Apps Script Web App connection
  const handleTestWebhook = async () => {
    let url = (appsScriptUrl || localStorage.getItem('cfg_apps_script_url') || '').trim();
    const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbxRwSRDJfp9V7w-B1ggihfImbg3oKLAO2_oIbRVLOS8-c5_h1UYU5pYczNT-bQwkpuI/exec';
    
    if (!url) {
      url = DEFAULT_URL;
      setAppsScriptUrl(url);
    }

    if (url.includes('docs.google.com/spreadsheets')) {
      url = DEFAULT_URL;
      setAppsScriptUrl(url);
      triggerAlert("Link spreadsheet dialihkan ke Web App Apps Script resmi pondok.", "success");
    } else if (url.includes('script.google.com/macros/s/')) {
      url = url.replace(/\/(edit|dev|view)(\?.*)?$/, '/exec$2');
      if (!url.includes('/exec')) url = url.replace(/\/$/, '') + '/exec';
      setAppsScriptUrl(url);
    }

    setIsTestingWebhook(true);
    setWebhookTestResult(null);
    try {
      localStorage.setItem('cfg_apps_script_url', url);
      if (updateConfig) updateConfig({ ...config, appsScriptUrl: url });

      // Call GET via proxy with ping action
      const res = await fetch(`/api/sheets/proxy-webhook?url=${encodeURIComponent(url)}&action=ping`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      const testJson = await res.json().catch(() => ({}));
      if (testJson?.fallbackUsed && testJson?.activeUrl) {
        setAppsScriptUrl(testJson.activeUrl);
      }
      setWebhookTestResult({
        success: true,
        message: "Alhamdulillah! Koneksi ke Apps Script Web App berhasil. Data siap tersinkronisasi dua arah secara real-time!"
      });
      triggerAlert("Alhamdulillah! Koneksi Apps Script Web App berhasil terverifikasi.", "success");
    } catch (err: any) {
      setWebhookTestResult({
        success: false,
        message: `Koneksi gagal: ${err.message}. Pastikan deployment Apps Script disetel 'Execute as: Me' dan 'Who has access: Anyone'.`
      });
      triggerAlert("Tes koneksi gagal: " + err.message, "error");
    } finally {
      setIsTestingWebhook(false);
    }
  };

  // Google Apps Script Sync trigger
  const handleSyncToSheets = async (e: React.FormEvent) => {
    e.preventDefault();
    const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbxRwSRDJfp9V7w-B1ggihfImbg3oKLAO2_oIbRVLOS8-c5_h1UYU5pYczNT-bQwkpuI/exec';
    let effectiveUrl = appsScriptUrl.trim();
    if (!effectiveUrl) {
      effectiveUrl = DEFAULT_URL;
      setAppsScriptUrl(effectiveUrl);
    }

    if (effectiveUrl.includes('docs.google.com/spreadsheets')) {
      effectiveUrl = DEFAULT_URL;
      setAppsScriptUrl(effectiveUrl);
    } else if (effectiveUrl.includes('script.google.com/macros/s/')) {
      effectiveUrl = effectiveUrl.replace(/\/(edit|dev|view)(\?.*)?$/, '/exec$2');
      if (!effectiveUrl.includes('/exec')) effectiveUrl = effectiveUrl.replace(/\/$/, '') + '/exec';
      setAppsScriptUrl(effectiveUrl);
    }

    setIsSyncing(true);
    // Save URL to lock in settings
    localStorage.setItem('cfg_apps_script_url', effectiveUrl);

    try {
      // Gather all local tables with records
      const syncPayload: Record<string, any> = {};
      LOCAL_STORAGE_KEYS.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            syncPayload[key] = JSON.parse(data);
          } catch {
            // Handle non-JSON strings (like config strings)
            syncPayload[key] = data;
          }
        }
      });

      // Send to webhook via Server Proxy to avoid CORS
      const response = await fetch('/api/sheets/proxy-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: effectiveUrl,
          payload: syncPayload
        }),
      });

      if (!response.ok) {
        let errorMsg = 'Gagal menghubungi server proxy';
        try {
          const errorData = await response.json();
          errorMsg = typeof errorData === 'string' ? errorData : (errorData.error || errorData.message || errorMsg);
        } catch (e) {
          errorMsg = `Server error: ${response.status}`;
        }
        throw new Error(errorMsg);
      }

      const resData = await response.json().catch(() => ({}));
      if (resData?.fallbackUsed && resData?.activeUrl) {
        setAppsScriptUrl(resData.activeUrl);
      }

      // ALSO: Sync to Firestore for multi-device support
      const { db } = await import('../lib/firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      
      const pushToFirestore = Object.keys(syncPayload).map(async (key) => {
        // Only sync specific master data keys to Firestore
        if (key.startsWith('db_') || key === 'db_pendaftar' || key === 'pesan_masuk') {
          try {
            await setDoc(doc(db, 'master_data', key), { 
              records: syncPayload[key],
              lastSynced: new Date().toISOString()
            });
          } catch (err) {
            console.error(`Failed to sync ${key} to Firestore:`, err);
          }
        }
      });

      await Promise.all(pushToFirestore);

      triggerAlert("Alhamdulillah! Data berhasil terkirim ke Google Spreadsheet & Cloud Database. Sekarang data sinkron di semua perangkat.", "success");
    } catch (err: any) {
      triggerAlert("Sinkronisasi gagal: " + err.message, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFetchFromSheets = async () => {
    let targetId = cloudSpreadsheetId.trim();
    
    // Auto-extract ID from URL if user pasted a full URL
    if (targetId.includes('docs.google.com/spreadsheets/d/')) {
      const match = targetId.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        targetId = match[1];
        setCloudSpreadsheetId(targetId); // Update state to show the cleaned ID
      }
    }

    if (!targetId) {
      triggerAlert("ID Spreadsheet belum diatur! Mohon masukkan ID Spreadsheet anda di kotak isian yang tersedia.", "error");
      return;
    }

    setIsSyncing(true);
    try {
      const token = getAccessToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const effectiveScriptUrl = appsScriptUrl || localStorage.getItem('cfg_apps_script_url') || '';
      const url = `/api/sheets/fetch?spreadsheetId=${encodeURIComponent(targetId)}${effectiveScriptUrl ? `&appsScriptUrl=${encodeURIComponent(effectiveScriptUrl)}` : ''}`;
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({ error: "Terjadi kesalahan pada server" }));
        throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      const data = result.data;
      
      if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        if (result.error) {
          throw new Error(result.error);
        }
        throw new Error("Tidak ada data tabel yang ditemukan di Google Sheets tersebut atau Spreadsheet belum diset Publik.");
      }

      let count = 0;
      
      // Update local storage for each key received
      Object.keys(data).forEach(key => {
        const val = data[key];
        if (val !== undefined && val !== null) {
          // Always stringify to ensure it's valid JSON for subsequent parsing
          localStorage.setItem(key, JSON.stringify(val));
          count++;
        }
      });

      // ALSO: Sync to Firestore for multi-device support
      const { db } = await import('../lib/firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      
      const pushToFirestore = Object.keys(data).map(async (key) => {
        if (key.startsWith('db_') || key === 'db_pendaftar' || key === 'pesan_masuk') {
          try {
            await setDoc(doc(db, 'master_data', key), { 
              records: data[key],
              lastSynced: new Date().toISOString()
            });
          } catch (err) {
            console.error(`Failed to sync ${key} to Firestore:`, err);
          }
        }
      });

      await Promise.all(pushToFirestore);

      triggerAlert(`Alhamdulillah! Berhasil menarik ${count} tabel data dari Google Spreadsheet & disinkronkan ke Cloud. Silakan muat ulang halaman (refresh) untuk melihat perubahan.`, "success");
      
      // Optional: force reload or trigger a callback to update GuruPanel state
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      triggerAlert("Gagal menarik data: " + err.message, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-teal-900 via-[#1e293b] to-slate-900 text-white p-6 rounded-2xl shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Database className="h-60 w-60" />
        </div>
        <div className="space-y-2 relative z-10">
          <span className="inline-block bg-teal-500/20 text-teal-300 text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-full border border-teal-500/40">
            SISTEM PENGARSIPAN &amp; INTEGRASI
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase">
            Pusat Pengaturan Ekspor, Backup &amp; Google Sheets
          </h2>
          <p className="text-xs text-slate-300 font-semibold leading-relaxed max-w-2xl">
            Kelola, amankan, dan bagikan seluruh aset data sekolah dari server cloud langsung ke perangkat lokal (harddisk) anda maupun disinkronkan otomatis dengan Spreadsheet online.
          </p>
        </div>
      </div>

      {/* EMERGENCY ALERTS */}
      {alertMsg && (
        <div className={`p-4 rounded-xl flex items-start space-x-3 border animate-fadeIn ${
          alertMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-250 text-emerald-800' 
            : 'bg-rose-50 border-rose-250 text-rose-800'
        }`}>
          {alertMsg.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
          )}
          <span className="text-xs sm:text-sm font-extrabold">{alertMsg.text}</span>
        </div>
      )}

      {/* SETTINGS MODE TABS NAVIGATION */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200 gap-1.5 flex-wrap">
        <button
          onClick={() => setActiveSubTab('lokal')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeSubTab === 'lokal' 
              ? 'bg-[#064e3b] text-white border-2 border-emerald-500 shadow-sm' 
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <HardDrive className="h-4 w-4" />
          <span>Lokal Harddisk &amp; CSV Excel</span>
        </button>
        <button
          onClick={() => setActiveSubTab('sheets')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeSubTab === 'sheets' 
              ? 'bg-[#064e3b] text-white border-2 border-emerald-500 shadow-sm' 
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Integrasi Google Sheets</span>
        </button>
        <button
          onClick={() => setActiveSubTab('impor')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeSubTab === 'impor' 
              ? 'bg-[#064e3b] text-white border-2 border-emerald-500 shadow-sm' 
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Upload className="h-4 w-4" />
          <span>Impor Data Excel / CSV</span>
        </button>

        <button
          onClick={() => setActiveSubTab('drive')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeSubTab === 'drive' 
              ? 'bg-[#064e3b] text-white border-2 border-emerald-500 shadow-sm' 
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Folder className="h-4 w-4" />
          <span>Manajemen Dokumen</span>
        </button>
      </div>

      {/* SCREEN A: LOCAL BACKUP AND TABLE EXPORTERS */}
      {activeSubTab === 'lokal' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* LEFT: FULL JSON DATABASE SNAPSHOT */}
          <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4 md:col-span-1 border-slate-200">
            <div className="flex items-center space-x-2 pb-3 border-b">
              <span className="p-1.5 bg-slate-100 rounded-lg text-slate-700">
                <Database className="h-4 w-4" />
              </span>
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Arsip snapshot penuh</h4>
                <p className="text-[9px] text-slate-400 font-semibold uppercase">Backup / Restore lokal harddisk</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Pilih Tahun Ajaran Data:</label>
              <select 
                value={selectedTahunBackup}
                onChange={(e) => setSelectedTahunBackup(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600"
              >
                <option value="Semua">SEMUA TAHUN AJARAN</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <p className="text-xs text-slate-500 leading-normal">
              Fitur ini akan mengekstrak data tabel (siswa, pendaftar, dll) untuk tahun ajaran <span className="font-bold text-teal-700">{selectedTahunBackup}</span> ke dalam berkas <span className="font-mono font-bold">.json</span>.
            </p>

            <div className="pt-2 space-y-3">
              {/* Export Full Button */}
              <button
                onClick={handleDownloadFullBackup}
                className="w-full flex items-center justify-center space-x-2.5 px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black tracking-wider uppercase transition shadow-sm cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Unduh File Cadangan (.json)</span>
              </button>

              {/* Import Full Database File */}
              <div className="relative pt-2 border-t">
                <label className="block text-[9px] font-black uppercase text-rose-600 mb-1.5 tracking-wider">
                  ⚠️ Pulihkan Data dari Cadangan
                </label>
                <div className="flex items-center space-x-2">
                  <label className="flex-1 flex items-center justify-center space-x-2 px-3 py-2.5 border border-dashed border-rose-300 hover:bg-rose-50 text-rose-800 rounded-xl text-xs font-bold uppercase transition block cursor-pointer">
                    <Upload className="h-3.5 w-3.5 text-rose-500" />
                    <span>Upload File JSON</span>
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={handleImportBackup}
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>
            </div>

            <p className="text-[9px] text-amber-600 font-bold leading-normal mt-2">
              * Perhatian: Mengimpor file arsip cadangan akan secara permanen menimpa seluruh data yang tersimpan saat ini di perangkat browser anda.
            </p>
          </div>

          {/* RIGHT: INSTANT CSV EXCELL FORMAT EXPORTERS */}
          <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-5 md:col-span-2 border-slate-200">
            <div className="flex items-center space-x-2 pb-3 border-b">
              <span className="p-1.5 bg-emerald-50 rounded-lg text-emerald-700">
                <FileSpreadsheet className="h-4 w-4" />
              </span>
              <div>
                <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider">Ekspor Tabel format CSV Excel</h4>
                <p className="text-[9px] text-emerald-500 font-semibold uppercase">Unduh Langsung Lembar Sebar Terbaca Excel</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-normal">
              Ekspor masing-masing tabel secara terpisah langsung ke format spreadsheet lokal (.csv) yang sudah dioptimalkan agar sel-sel terpecah otomatis di Microsoft Excel, WPS Spreadsheet, maupun Google Sheets.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* PPDB CSV */}
              <div className="p-4 border rounded-xl hover:border-emerald-300 transition-all space-y-2 bg-slate-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">Pendaftar PPDB Online</h5>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Calon Siswa Baru</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                    {pendaftar.length} Data
                  </span>
                </div>
                <button
                  onClick={() => exportToCSV('db_pendaftar', 'PPDB_PENDAFTAR_SMP_INDONESIA.csv')}
                  className="w-full flex items-center justify-center space-x-2 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Daftar PPDB (.csv)</span>
                </button>
              </div>

              {/* Tahfidz Setoran Records CSV */}
              <div className="p-4 border rounded-xl hover:border-emerald-300 transition-all space-y-2 bg-slate-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">Log Setoran Tahfidz</h5>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Ziyadah &amp; Murojaah</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                    {getSafeStorageLength('db_tahfidz_records_v2')} Data
                  </span>
                </div>
                <button
                  onClick={() => exportToCSV('db_tahfidz_records_v2', 'LOG_SETORAN_TAHFIDZ.csv')}
                  className="w-full flex items-center justify-center space-x-2 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Log Setoran Tahfidz (.csv)</span>
                </button>
              </div>

              {/* Attendance Guru */}
              <div className="p-4 border rounded-xl hover:border-emerald-300 transition-all space-y-2 bg-slate-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">Presensi Absensi Guru</h5>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Kehadiran Ustadz</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                    {getSafeStorageLength('db_teachers_attendance')} Data
                  </span>
                </div>
                <button
                  onClick={() => exportToCSV('db_teachers_attendance', 'PRESENSI_KEHADIRAN_GURU.csv')}
                  className="w-full flex items-center justify-center space-x-2 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Jurnal Kehadiran Guru (.csv)</span>
                </button>
              </div>

              {/* Master Siswa & Majelis */}
              <div className="p-4 border rounded-xl hover:border-emerald-300 transition-all space-y-2 bg-slate-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">Induk Siswa &amp; Majelis</h5>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Anggota Halaqah</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                    {getSafeStorageLength('db_students_tahfidz_panel')} Siswa
                  </span>
                </div>
                <button
                  onClick={() => exportToCSV('db_students_tahfidz_panel', 'BUKU_INDUK_SISWA_HALAQAH.csv')}
                  className="w-full flex items-center justify-center space-x-2 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Buku Induk Siswa (.csv)</span>
                </button>
              </div>

              {/* Master Siswa Akademik */}
              <div className="p-4 border rounded-xl hover:border-emerald-300 transition-all space-y-2 bg-slate-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">Data Siswa Akademik</h5>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Buku Induk Kelas</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                    {getSafeStorageLength('db_students')} Siswa
                  </span>
                </div>
                <button
                  onClick={() => exportToCSV('db_students', 'DATA_SISWA_AKADEMIK.csv')}
                  className="w-full flex items-center justify-center space-x-2 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Siswa Akademik (.csv)</span>
                </button>
              </div>

              {/* Master Guru & Ustadz */}
              <div className="p-4 border rounded-xl hover:border-emerald-300 transition-all space-y-2 bg-slate-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">Master Guru &amp; Ustadz</h5>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Daftar Pengajar Pondok</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                    {getSafeStorageLength('db_ustadz_master')} Guru
                  </span>
                </div>
                <button
                  onClick={() => exportToCSV('db_ustadz_master', 'MASTER_GURU_USTADZ.csv')}
                  className="w-full flex items-center justify-center space-x-2 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Daftar Guru (.csv)</span>
                </button>
              </div>

              {/* Data Beasiswa */}
              <div className="p-4 border rounded-xl hover:border-emerald-300 transition-all space-y-2 bg-slate-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">Data Beasiswa</h5>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Santri &amp; Ustadz Penerima</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                    {getSafeStorageLength('db_beasiswa')} Data
                  </span>
                </div>
                <button
                  onClick={() => exportToCSV('db_beasiswa', 'MASTER_DATA_BEASISWA.csv')}
                  className="w-full flex items-center justify-center space-x-2 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Data Beasiswa (.csv)</span>
                </button>
              </div>

              {/* Nilai Raport Siswa */}
              <div className="p-4 border rounded-xl hover:border-emerald-300 transition-all space-y-2 bg-slate-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">Nilai Rapor Akademik</h5>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Rekap Tugas, UTS, UAS</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                    {getSafeStorageLength('db_grades_v2', true)} Record
                  </span>
                </div>
                <button
                  onClick={() => exportToCSV('db_grades_v2', 'NILAI_RAPOR_AKADEMIK.csv')}
                  className="w-full flex items-center justify-center space-x-2 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Nilai Rapor (.csv)</span>
                </button>
              </div>

              {/* Student Attendance */}
              <div className="p-4 border rounded-xl hover:border-emerald-300 transition-all space-y-2 bg-slate-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">Presensi Harian Siswa</h5>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Kehadiran Kelas</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                    {getSafeStorageLength('db_student_attendance_v2', true)} Hari
                  </span>
                </div>
                <button
                  onClick={() => exportToCSV('db_student_attendance_v2', 'PRESENSI_HARIAN_SISWA.csv')}
                  className="w-full flex items-center justify-center space-x-2 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Presensi Siswa (.csv)</span>
                </button>
              </div>

              {/* Event Attendance */}
              <div className="p-4 border rounded-xl hover:border-emerald-300 transition-all space-y-2 bg-slate-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">Absensi Kegiatan Event</h5>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Agenda &amp; Kegiatan Pondok</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                    {getSafeStorageLength('db_event_attendance')} Data
                  </span>
                </div>
                <button
                  onClick={() => exportToCSV('db_event_attendance', 'ABSENSI_KEGIATAN_EVENT.csv')}
                  className="w-full flex items-center justify-center space-x-2 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Absen Event (.csv)</span>
                </button>
              </div>

              {/* Student Mutations */}
              <div className="p-4 border rounded-xl hover:border-emerald-300 transition-all space-y-2 bg-slate-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-wide">Arsip Mutasi Siswa</h5>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Siswa Keluar / Masuk</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                    {getSafeStorageLength('db_student_mutations')} Mutasi
                  </span>
                </div>
                <button
                  onClick={() => exportToCSV('db_student_mutations', 'MUTASI_SISWA.csv')}
                  className="w-full flex items-center justify-center space-x-2 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Mutasi Siswa (.csv)</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* SCREEN C: COMPACT AND CONCISE EXCEL IMPORT TAB */}
      {activeSubTab === 'impor' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main Card */}
          <div className="bg-white border rounded-2xl p-5 shadow-sm border-slate-200">
            {/* Header with Title & Switch Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b gap-4">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 bg-indigo-50 rounded-xl text-indigo-700">
                  <Upload className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Impor Data Siswa &amp; Guru dari Excel / CSV</h4>
                  <p className="text-[11px] text-slate-400 font-bold leading-none">Unggah berkas untuk memperbarui database master secara instan</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                  isImportFeatureEnabled 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                  {isImportFeatureEnabled ? '● Fitur Aktif' : '○ Fitur Nonaktif'}
                </span>
                <button
                  type="button"
                  onClick={handleToggleImportFeature}
                  className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase transition-all duration-205 cursor-pointer ${
                    isImportFeatureEnabled 
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200' 
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-205'
                  }`}
                >
                  {isImportFeatureEnabled ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
              </div>
            </div>

            {isImportFeatureEnabled ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-5">
                {/* COLUMN 1: TEMPLATE DOWNLOADS */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="bg-indigo-100 text-indigo-800 text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase">
                        LANGKAH 1
                      </span>
                    </div>
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide mt-1.5">Unduh Template</h5>
                    <p className="text-[10.5px] text-slate-450 leading-relaxed mt-1">
                      Format kolom harus sesuai template. Edit di Excel lalu simpan sebagai berkas <strong>Excel (.xlsx / .xls)</strong> atau <strong>CSV</strong>.
                    </p>
                  </div>
                  <div className="space-y-1.5 pt-2">
                    <button
                      onClick={downloadStudentTemplate}
                      className="w-full flex items-center justify-between px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      <span className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        <span>Format Data Siswa</span>
                      </span>
                      <Download className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                    <button
                      onClick={downloadUstadzTemplate}
                      className="w-full flex items-center justify-between px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      <span className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>Format Data Guru (.xlsx)</span>
                      </span>
                      <Download className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* COLUMN 2: MERGE STRATEGY */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="bg-indigo-100 text-indigo-800 text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase">
                      LANGKAH 2
                    </span>
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide mt-1.5">Aturan Sinkronisasi</h5>
                    <p className="text-[10.5px] text-slate-450 leading-relaxed mt-1">
                      Metode penulisan data ke dalam sistem penyimpanan lokal:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-2">
                    <label className={`flex items-start space-x-2 p-2 border rounded-lg cursor-pointer transition ${
                      importMethod === 'append' ? 'bg-indigo-50/80 border-indigo-200' : 'bg-white hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="importMethodTab"
                        checked={importMethod === 'append'}
                        onChange={() => setImportMethod('append')}
                        className="mt-0.5 h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <span className="block text-[11px] font-black text-slate-800 uppercase">Gabungkan (Append)</span>
                        <span className="block text-[9.5px] text-slate-450 leading-tight">Tambahkan tanpa menghapus data lama.</span>
                      </div>
                    </label>
                    <label className={`flex items-start space-x-2 p-2 border rounded-lg cursor-pointer transition ${
                      importMethod === 'overwrite' ? 'bg-rose-50/80 border-rose-200' : 'bg-white hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="importMethodTab"
                        checked={importMethod === 'overwrite'}
                        onChange={() => setImportMethod('overwrite')}
                        className="mt-0.5 h-3.5 w-3.5 text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                      <div>
                        <span className="block text-[11px] font-black text-rose-800 uppercase">⚠️ Timpa Semua (Overwrite)</span>
                        <span className="block text-[9.5px] text-rose-450 leading-tight">Hapus &amp; ganti seluruh isi database.</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* COLUMN 3: UPLOAD HANDLERS */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <div>
                    <span className="bg-indigo-100 text-indigo-800 text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase">
                      LANGKAH 3
                    </span>
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide mt-1.5">Unggah Berkas</h5>
                    <p className="text-[10.5px] text-slate-450 leading-relaxed mt-1">
                      Klik tombol di bawah untuk memilih dan memproses berkas Excel (.xlsx, .xls) atau CSV:
                    </p>
                  </div>

                  <div className="space-y-2 pt-1">
                    {/* Removed Student Import as per user request */}
                    <div>
                      <label className="block text-[8.5px] font-black text-slate-400 uppercase mb-1">📁 DATA GURU / USTADZ</label>
                      <label className="flex items-center justify-center space-x-2 px-3 py-2 border-2 border-dashed border-slate-200 hover:bg-indigo-50 hover:border-indigo-400 text-slate-700 hover:text-indigo-900 rounded-lg text-xs font-bold uppercase transition cursor-pointer">
                        <Upload className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Pilih File Guru (.xlsx / .csv)</span>
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv,.txt"
                          onChange={handleImportUstadzExcel}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 border border-dashed rounded-xl bg-rose-50/50 border-rose-200 text-center space-y-2 mt-4">
                <p className="text-xs font-extrabold text-rose-800 uppercase tracking-wider">🔒 Fitur Impor Dinonaktifkan oleh Administrator</p>
                <p className="text-[11px] text-slate-550 max-w-sm mx-auto leading-relaxed">
                  Fungsi import file dinonaktifkan sementara untuk menjaga keamanan data dari perubahan tidak disengaja. Aktifkan kembali menggunakan tombol di kanan atas.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCREEN D: DRIVE FOLDER MANAGEMENT */}
      {activeSubTab === 'drive' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white border rounded-2xl p-6 shadow-sm border-slate-200 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="flex items-center space-x-3">
                <span className="p-2 bg-emerald-100 rounded-xl text-emerald-800">
                  <FolderPlus className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Penyimpanan Berkas Terpusat</h4>
                  <p className="text-xs text-slate-400 font-semibold leading-none">Kelola folder penyimpanan dokumen Ustadz dan Siswa secara terpisah</p>
                </div>
              </div>
              <button 
                onClick={handleCreateDriveFolders}
                disabled={isCreatingFolders}
                className={`flex items-center space-x-2 px-5 py-2.5 bg-[#064e3b] hover:bg-emerald-800 disabled:bg-emerald-300 text-white rounded-xl text-xs font-black uppercase transition-all shadow-md cursor-pointer ${isCreatingFolders ? 'animate-pulse' : ''}`}
              >
                {isCreatingFolders ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Menyiapkan...</span>
                  </>
                ) : (
                  <>
                    <FolderPlus className="h-4 w-4" />
                    <span>Siapkan Folder Cloud</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Ustadz Folder Card */}
              <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50/50 hover:bg-white hover:border-emerald-200 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-700 group-hover:scale-110 transition-transform">
                      <Folder className="h-6 w-6" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-slate-800 uppercase">Berkas Ustadz</h5>
                      <p className="text-[10px] text-slate-400 font-bold">Dokumen Kepegawaian & Sertifikat</p>
                    </div>
                  </div>
                  {ustadzFolderId ? (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase">Aktif</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-500 rounded text-[9px] font-black uppercase">Belum Ada</span>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="p-3 bg-white border border-slate-100 rounded-xl">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">ID Folder:</label>
                    <p className="text-[10px] font-mono text-slate-600 truncate">{ustadzFolderId || 'Belum dikonfigurasi'}</p>
                  </div>
                  
                  {ustadzFolderId && (
                    <a 
                      href={`https://drive.google.com/drive/folders/${ustadzFolderId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center space-x-2 w-full py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-[10px] font-black uppercase transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Buka di Google Drive</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Siswa Folder Card */}
              <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50/50 hover:bg-white hover:border-emerald-200 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-700 group-hover:scale-110 transition-transform">
                      <Folder className="h-6 w-6" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-slate-800 uppercase">Berkas Siswa</h5>
                      <p className="text-[10px] text-slate-400 font-bold">Rapor, Ijazah & Akta Santri</p>
                    </div>
                  </div>
                  {siswaFolderId ? (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase">Aktif</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-500 rounded text-[9px] font-black uppercase">Belum Ada</span>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="p-3 bg-white border border-slate-100 rounded-xl">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">ID Folder:</label>
                    <p className="text-[10px] font-mono text-slate-600 truncate">{siswaFolderId || 'Belum dikonfigurasi'}</p>
                  </div>
                  
                  {siswaFolderId && (
                    <a 
                      href={`https://drive.google.com/drive/folders/${siswaFolderId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center space-x-2 w-full py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-[10px] font-black uppercase transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Buka di Google Drive</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start space-x-3">
              <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[11px] text-amber-900 font-black uppercase tracking-tight">Informasi Penting</p>
                <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                  Seluruh berkas yang diunggah melalui aplikasi ini akan tersimpan secara terorganisir di dalam folder-folder di atas. Pastikan Anda tidak menghapus folder ini langsung dari Google Drive agar sistem tetap dapat mensinkronkan data dengan benar.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN B: GOOGLE SHEETS CLOUD INTEGRATION */}
      {activeSubTab === 'sheets' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* SECTION 1: DIRECT CLOUD SYNC (RECOMMENDED) */}
          <div className="bg-white border rounded-2xl p-6 shadow-sm border-slate-200 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="flex items-center space-x-3">
                <span className="p-2 bg-indigo-100 rounded-xl text-indigo-800">
                  <Cloud className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Sinkronisasi Awan (Cloud Sync)</h4>
                  <p className="text-xs text-slate-400 font-semibold leading-none">Simpan seluruh data ke Google Spreadsheet secara langsung</p>
                </div>
              </div>
              <button 
                onClick={handleCloudSync}
                disabled={isSyncing}
                className={`flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-xs font-black uppercase transition-all shadow-md cursor-pointer ${isSyncing ? 'animate-pulse' : ''}`}
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Sinkronisasi...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Sinkronkan ke Cloud</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Fitur ini akan secara otomatis membuat berkas Spreadsheet baru di Google Drive anda (jika belum ada) dan memindahkan seluruh data aplikasi ke dalam tab-tab yang rapi.
                </p>
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start space-x-2">
                  <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-indigo-800 font-semibold leading-relaxed">
                    Disarankan menggunakan metode ini karena jauh lebih mudah dan tidak memerlukan pengaturan script manual.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">ID Spreadsheet Aktif:</label>
                <div className="flex items-center space-x-2">
                  <input 
                    type="text"
                    placeholder="Auto-generated setelah sinkronisasi pertama"
                    value={cloudSpreadsheetId}
                    onChange={(e) => setCloudSpreadsheetId(e.target.value)}
                    className="flex-1 p-2.5 bg-slate-50 border rounded-xl text-[10px] font-mono text-slate-600 focus:outline-none"
                  />
                  {cloudSpreadsheetId && (
                    <a 
                      href={`https://docs.google.com/spreadsheets/d/${cloudSpreadsheetId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl transition"
                      title="Buka Spreadsheet"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: WEBHOOK SYNC (LEGACY/APPS SCRIPT) */}
          <div className="bg-white border rounded-2xl p-6 shadow-sm border-slate-200 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="flex items-center space-x-3">
                <span className="p-2 bg-emerald-100 rounded-xl text-emerald-800">
                  <CloudLightning className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Sinkronisasi via Webhook Apps Script</h4>
                  <p className="text-xs text-slate-400 font-semibold leading-none">Metode alternatif menggunakan script kustom</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* INSTRUCTIONS AND PRE-PARED CODE block */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <span className="flex h-5 w-5 items-center justify-center bg-teal-100 text-teal-800 rounded-full text-[10px]">1</span>
                <span>Pasang Google Apps Script ke Google Sheet Anda</span>
              </h3>

              <div className="bg-slate-50 p-4 border rounded-xl space-y-3 leading-relaxed text-xs text-slate-600">
                <p>
                  Guna menghubungkan aplikasi ke Google Spreadsheet anda secara aman dan menghindari pusingnya konfigurasi Google Cloud Console yang rumit bagi admin sekolah, silakan salin script di bawah ini dan pasang pada Google Sheet anda dalam 3 menit:
                </p>

                {/* Steps Bullets */}
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-500 text-[11px] leading-relaxed">
                  <li>Buat spreadsheet kosong baru di Google Drive anda, beri judul bebas.</li>
                  <li>Di menu navigasi atas spreadsheet, pilih <strong>Ekstensi (Extensions)</strong> &gt; <strong>Apps Script</strong>.</li>
                  <li>Hapus seluruh kode kosong bawaan script editor, lalu klik tombol saksama <strong>Salin Kode Script</strong> di bawah ini dan paste sepenuhnya di sana.</li>
                  <li>Tekan tombol Save (Gambar disket), lalu klik <strong>Terapkan (Deploy)</strong> &gt; <strong>Penerapan Baru (New Deployment)</strong>.</li>
                  <li>Pilih jenis deployment: <strong>Aplikasi Web (Web App)</strong>.</li>
                  <li>Ubah pengaturan akses pada "Siapa yang memiliki akses / Who has access" menjadi <strong>Siapa Saja (Anyone)</strong>.</li>
                  <li>Klik <strong>Deploy / Terapkan</strong>, lalu setujui hak akses keamanan yang dimintai Google. Salin URL Aplikasi Web yang muncul.</li>
                </ol>
              </div>

              {/* SCRIPT CODE CONTAINER PREVIEW */}
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-slate-800 px-4 py-2 rounded-t-xl">
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">GoogleAppsScript.js</span>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center space-x-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] font-extrabold uppercase tracking-wide transition-all cursor-pointer"
                  >
                    {isCopied ? <Check className="h-3.5 w-3.5 text-teal-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{isCopied ? 'Tersalin' : 'Salin Kode Script'}</span>
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto p-4 bg-slate-900 border border-slate-750 font-mono text-[10px] text-teal-400 leading-relaxed rounded-b-xl whitespace-pre">
                  {appsScriptCode}
                </div>
              </div>
            </div>

            {/* INPUT WEBHOOK AND SYNC EXECUTION CARD */}
            <div className="lg:col-span-1 bg-slate-50/50 p-5 border rounded-2xl relative flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                  <span className="flex h-5 w-5 items-center justify-center bg-teal-100 text-teal-800 rounded-full text-[10px]">2</span>
                  <span>Hubungkan Webhook Anda</span>
                </h3>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Masukkan Web Deployment URL yang anda peroleh dari langkah penerapan Google Apps Script di sebelah kiri di bawah:
                </p>

                <form onSubmit={handleSyncToSheets} className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">
                        URL Aplikasi Web Apps Script *
                      </label>
                      <button
                        type="button"
                        onClick={() => setAppsScriptUrl(DEFAULT_URL)}
                        className="text-[9px] text-emerald-600 hover:text-emerald-700 font-bold hover:underline cursor-pointer"
                      >
                        Reset ke Standar Al-Ihsan
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      required
                      placeholder={DEFAULT_URL}
                      value={appsScriptUrl}
                      onChange={(e) => setAppsScriptUrl(e.target.value)}
                      className="w-full p-2.5 bg-white border rounded-xl text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 leading-snug"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="submit"
                      disabled={isSyncing}
                      className={`flex-1 flex items-center justify-center space-x-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-sm cursor-pointer transition ${
                        isSyncing ? 'animate-pulse' : ''
                      }`}
                    >
                      {isSyncing ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Proses...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          <span>Push ke Sheet</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleFetchFromSheets}
                      disabled={isSyncing}
                      className={`flex-1 flex items-center justify-center space-x-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-sm cursor-pointer transition ${
                        isSyncing ? 'animate-pulse' : ''
                      }`}
                    >
                      {isSyncing ? (
                        <>
                          <Download className="h-4 w-4 animate-spin" />
                          <span>Tarik Data...</span>
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          <span>Tarik dari Sheet</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleTestWebhook}
                      disabled={isTestingWebhook || isSyncing}
                      className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs border border-slate-200"
                      title="Uji apakah URL Web App Script valid dan merespons"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isTestingWebhook ? 'animate-spin text-teal-600' : ''}`} />
                      <span>{isTestingWebhook ? 'Menguji...' : 'Tes Koneksi'}</span>
                    </button>
                  </div>

                  {webhookTestResult && (
                    <div className={`p-3 rounded-xl text-xs font-medium border animate-apple-fade ${
                      webhookTestResult.success 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}>
                      <div className="flex items-start gap-2">
                        {webhookTestResult.success ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <span>{webhookTestResult.message}</span>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl flex items-start space-x-2 mt-4">
                <Info className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-teal-800 font-semibold leading-relaxed">
                  Semua tabel data (Pendaftar, Log setoran, Buku Induk Siswa, Absen Guru) akan diakumulasi dan dikirimkan secara langsung ke spreadsheet untuk dibuatkan masing-masing tab secara otomatis.
                </p>
              </div>

              {/* 6. DANGER ZONE: RESET SYSTEM */}
              <div className="bg-rose-50 border-2 border-rose-100 rounded-3xl p-6 mt-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-rose-900 uppercase tracking-tight">Zona Berbahaya</h3>
                    <p className="text-[10px] text-rose-600 font-bold uppercase tracking-widest leading-none">Hapus Seluruh Data Aplikasi</p>
                  </div>
                </div>

                <div className="p-4 bg-white/50 rounded-2xl border border-rose-200">
                  <p className="text-[10px] text-rose-700 font-semibold leading-relaxed mb-4 uppercase tracking-tight">
                    membersihkan seluruh database (Siswa, Guru, Nilai, dan Pengaturan) dan memulai dari awal. Tindakan ini tidak dapat dibatalkan.
                  </p>
                  <button 
                    onClick={handleResetSystem}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-rose-200 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Bersihkan Seluruh Data Sistem</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      )}

    </div>
  );
}
