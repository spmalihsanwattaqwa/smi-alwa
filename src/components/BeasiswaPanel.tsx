import React, { useState, useMemo, useEffect } from 'react';
import { 
  Award, Plus, Search, Filter, Trash2, Edit3, CheckCircle, XCircle, 
  FileSpreadsheet, Download, RefreshCw, Users, UserCheck, Calendar, 
  DollarSign, Building, ChevronLeft, ChevronRight, Check, AlertCircle,
  Eye, FileText, ChevronDown, Sparkles, HandCoins, ArrowUpDown, Clock
} from 'lucide-react';
import { Beasiswa, PeriodeBeasiswaType, PengaturanSistem, SchoolStudent, Ustadz } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

interface BeasiswaPanelProps {
  students: SchoolStudent[];
  ustadzList: Ustadz[];
  isEditable?: boolean;
  tahunAjaranAktif?: string;
  config?: PengaturanSistem;
  updateConfig?: (cfg: PengaturanSistem) => void;
}

const BULAN_OPTIONS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DEFAULT_DONATUR_LIST = [
  'Yayasan Al-Ihsan Wat Taqwa',
  'BAZNAS (Badan Amil Zakat Nasional)',
  'LAZIS Pondok Pesantren',
  'Kementerian Agama RI (PIP/KIP)',
  'Donatur Hamba Allah (Wakaf/Infaq)',
  'Komite Orang Tua Santri',
  'CSR PT. Semen Indonesia / BUMN',
  'Alumni Pondok Peduli Santri',
  'Dompet Dhuafa Foundation'
];

export default function BeasiswaPanel({
  students,
  ustadzList,
  isEditable = true,
  tahunAjaranAktif = '2026/2027',
  config
}: BeasiswaPanelProps) {
  // 1. Data Beasiswa State with LocalStorage and Firestore Sync
  const [beasiswaList, setBeasiswaList] = useState<Beasiswa[]>(() => {
    try {
      const saved = localStorage.getItem('db_beasiswa');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading beasiswa:', e);
    }
    return [];
  });

  // 2. Custom Lembaga / Donatur list (saved in localStorage)
  const [customDonaturList, setCustomDonaturList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('db_custom_donatur_list');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading donatur list:', e);
    }
    return DEFAULT_DONATUR_LIST;
  });

  // Real-time Firestore sync
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'master_data', 'db_beasiswa'), (snapshot) => {
      if (snapshot.exists()) {
        const remoteData = snapshot.data().records;
        if (remoteData && Array.isArray(remoteData)) {
          setBeasiswaList(remoteData);
          localStorage.setItem('db_beasiswa', JSON.stringify(remoteData));
        }
      }
    }, (err) => {
      console.warn("Firestore listener db_beasiswa notice:", err);
    });

    return () => unsub();
  }, []);

  // Save to LocalStorage and Firestore helper
  const saveBeasiswaData = async (newList: Beasiswa[]) => {
    setBeasiswaList(newList);
    localStorage.setItem('db_beasiswa', JSON.stringify(newList));
    try {
      await setDoc(doc(db, 'master_data', 'db_beasiswa'), {
        records: newList,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn("Error saving beasiswa to Firestore:", err);
    }
  };

  // 3. Filter and Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTipePenerima, setFilterTipePenerima] = useState<'semua' | 'siswa' | 'ustadz'>('semua');
  const [filterStatus, setFilterStatus] = useState<'semua' | 'Aktif' | 'Tidak Aktif'>('semua');
  const [filterDonatur, setFilterDonatur] = useState<string>('semua');
  const [filterPeriodeType, setFilterPeriodeType] = useState<string>('semua');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // 4. Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Beasiswa | null>(null);
  const [detailItem, setDetailItem] = useState<Beasiswa | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // 5. Form Input State
  const [formLembaga, setFormLembaga] = useState('');
  const [isAddingNewDonatur, setIsAddingNewDonatur] = useState(false);
  const [newDonaturInput, setNewDonaturInput] = useState('');
  
  const [formTipePenerima, setFormTipePenerima] = useState<'siswa' | 'ustadz'>('siswa');
  const [formPenerimaId, setFormPenerimaId] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [isRecipientDropdownOpen, setIsRecipientDropdownOpen] = useState(false);

  // Periode Inputs
  const [formTipePeriode, setFormTipePeriode] = useState<PeriodeBeasiswaType>('bulanan');
  const [formBulan, setFormBulan] = useState(BULAN_OPTIONS[new Date().getMonth()]);
  const [formTahun, setFormTahun] = useState(tahunAjaranAktif || '2026/2027');
  
  // Periode Khusus
  const [formBulanMulai, setFormBulanMulai] = useState('Juli');
  const [formTahunMulai, setFormTahunMulai] = useState('2026');
  const [formBulanSelesai, setFormBulanSelesai] = useState('Juni');
  const [formTahunSelesai, setFormTahunSelesai] = useState('2027');

  const [formNominal, setFormNominal] = useState<string>('500000');
  const [formStatus, setFormStatus] = useState<'Aktif' | 'Tidak Aktif'>('Aktif');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formError, setFormError] = useState('');

  // Combined donatur list
  const allDonaturs = useMemo(() => {
    const fromRecords = beasiswaList.map(b => b.lembagaDonatur).filter(Boolean);
    const combined = Array.from(new Set([...customDonaturList, ...fromRecords]));
    return combined.sort();
  }, [customDonaturList, beasiswaList]);

  // Open modal for create
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormLembaga(allDonaturs[0] || 'Yayasan Al-Ihsan Wat Taqwa');
    setIsAddingNewDonatur(false);
    setNewDonaturInput('');
    setFormTipePenerima('siswa');
    setFormPenerimaId(students.length > 0 ? students[0].id : '');
    setRecipientSearch('');
    setFormTipePeriode('bulanan');
    setFormBulan(BULAN_OPTIONS[new Date().getMonth()]);
    setFormTahun(tahunAjaranAktif || '2026/2027');
    setFormBulanMulai('Juli');
    setFormTahunMulai('2026');
    setFormBulanSelesai('Juni');
    setFormTahunSelesai('2027');
    setFormNominal('500000');
    setFormStatus('Aktif');
    setFormKeterangan('');
    setFormError('');
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEditModal = (item: Beasiswa) => {
    setEditingItem(item);
    setFormLembaga(item.lembagaDonatur);
    setIsAddingNewDonatur(false);
    setNewDonaturInput('');
    setFormTipePenerima(item.tipePenerima);
    setFormPenerimaId(item.penerimaId);
    setRecipientSearch(item.namaPenerima);
    setFormTipePeriode(item.tipePeriode);
    setFormBulan(item.bulan || BULAN_OPTIONS[0]);
    setFormTahun(item.tahun || tahunAjaranAktif);
    setFormBulanMulai(item.bulanMulai || 'Juli');
    setFormTahunMulai(item.tahunMulai || '2026');
    setFormBulanSelesai(item.bulanSelesai || 'Juni');
    setFormTahunSelesai(item.tahunSelesai || '2027');
    setFormNominal(String(item.nominal || 0));
    setFormStatus(item.status);
    setFormKeterangan(item.keterangan || '');
    setFormError('');
    setIsModalOpen(true);
  };

  // Add custom donatur handler
  const handleAddNewDonatur = () => {
    if (!newDonaturInput.trim()) return;
    const trimmed = newDonaturInput.trim();
    if (!customDonaturList.includes(trimmed)) {
      const updated = [...customDonaturList, trimmed];
      setCustomDonaturList(updated);
      localStorage.setItem('db_custom_donatur_list', JSON.stringify(updated));
    }
    setFormLembaga(trimmed);
    setIsAddingNewDonatur(false);
    setNewDonaturInput('');
  };

  // Recipient List filtered by search and type
  const availableRecipients = useMemo(() => {
    if (formTipePenerima === 'siswa') {
      return students.map(s => ({
        id: s.id,
        nama: s.nama,
        identitas: `NISN: ${s.nisn || '-'}${s.nis ? ` | NIS: ${s.nis}` : ''}`,
        kategori: `Kelas: ${s.kelas || '-'}`,
        raw: s
      }));
    } else {
      return ustadzList.map(u => ({
        id: u.id,
        nama: u.nama,
        identitas: `NIP: ${u.nip || '-'}${u.nik ? ` | NIK: ${u.nik}` : ''}`,
        kategori: `Jabatan: ${u.jabatan || u.posisi || 'Pengajar'}`,
        raw: u
      }));
    }
  }, [formTipePenerima, students, ustadzList]);

  // Filtered recipient list for dropdown search
  const filteredRecipients = useMemo(() => {
    if (!recipientSearch.trim()) return availableRecipients.slice(0, 50);
    const query = recipientSearch.toLowerCase();
    return availableRecipients.filter(r => 
      r.nama.toLowerCase().includes(query) ||
      r.identitas.toLowerCase().includes(query) ||
      r.kategori.toLowerCase().includes(query)
    ).slice(0, 50);
  }, [availableRecipients, recipientSearch]);

  // Current selected recipient details
  const currentSelectedRecipient = useMemo(() => {
    return availableRecipients.find(r => r.id === formPenerimaId);
  }, [availableRecipients, formPenerimaId]);

  // Form Submit Handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validation 1: Lembaga / Donatur
    let effectiveLembaga = formLembaga.trim();
    if (isAddingNewDonatur) {
      if (!newDonaturInput.trim()) {
        setFormError('Silakan masukkan nama Lembaga / Donatur baru atau pilih dari daftar.');
        return;
      }
      effectiveLembaga = newDonaturInput.trim();
      if (!customDonaturList.includes(effectiveLembaga)) {
        const updated = [...customDonaturList, effectiveLembaga];
        setCustomDonaturList(updated);
        localStorage.setItem('db_custom_donatur_list', JSON.stringify(updated));
      }
    }

    if (!effectiveLembaga) {
      setFormError('Lembaga / Donatur wajib diisi.');
      return;
    }

    // Validation 2: Penerima
    if (!formPenerimaId) {
      setFormError('Penerima beasiswa (Siswa atau Ustadz) wajib dipilih dari data master.');
      return;
    }

    const selectedRecip = availableRecipients.find(r => r.id === formPenerimaId);
    if (!selectedRecip) {
      setFormError('Data penerima yang dipilih tidak valid.');
      return;
    }

    // Validation 3: Periode Specifics
    let periodeSummary = '';
    if (formTipePeriode === 'bulanan') {
      if (!formBulan) {
        setFormError('Bulan wajib dipilih untuk periode bulanan.');
        return;
      }
      periodeSummary = `Bulanan (${formBulan} ${formTahun || ''})`.trim();
    } else if (formTipePeriode === 'tahunan') {
      if (!formTahun || !formTahun.trim()) {
        setFormError('Untuk periode tahunan, Anda HARUS menulis tahun (contoh: 2025/2026 atau 2026).');
        return;
      }
      periodeSummary = `Tahunan (${formTahun.trim()})`;
    } else if (formTipePeriode === 'khusus') {
      if (!formBulanMulai || !formTahunMulai || !formBulanSelesai || !formTahunSelesai) {
        setFormError('Periode khusus wajib mengisi bulan dan tahun mulai serta selesai.');
        return;
      }
      periodeSummary = `Khusus (${formBulanMulai} ${formTahunMulai} s/d ${formBulanSelesai} ${formTahunSelesai})`;
    }

    // Validation 4: Nominal
    const cleanNominal = Number(String(formNominal).replace(/[^0-9]/g, ''));
    if (isNaN(cleanNominal) || cleanNominal < 0) {
      setFormError('Nominal beasiswa harus berupa angka rupiah yang valid.');
      return;
    }

    const newRecord: Beasiswa = {
      id: editingItem ? editingItem.id : `BSW-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      lembagaDonatur: effectiveLembaga,
      tipePenerima: formTipePenerima,
      penerimaId: selectedRecip.id,
      namaPenerima: selectedRecip.nama,
      identitasPenerima: selectedRecip.identitas,
      kategoriPenerima: selectedRecip.kategori,
      tipePeriode: formTipePeriode,
      bulan: formTipePeriode === 'bulanan' ? formBulan : undefined,
      tahun: formTipePeriode === 'tahunan' || formTipePeriode === 'bulanan' ? formTahun.trim() : undefined,
      bulanMulai: formTipePeriode === 'khusus' ? formBulanMulai : undefined,
      tahunMulai: formTipePeriode === 'khusus' ? formTahunMulai.trim() : undefined,
      bulanSelesai: formTipePeriode === 'khusus' ? formBulanSelesai : undefined,
      tahunSelesai: formTipePeriode === 'khusus' ? formTahunSelesai.trim() : undefined,
      periodeKeterangan: periodeSummary,
      nominal: cleanNominal,
      status: formStatus,
      keterangan: formKeterangan.trim(),
      tanggalInput: editingItem?.tanggalInput || new Date().toISOString().split('T')[0],
      academicYear: tahunAjaranAktif
    };

    let updatedList: Beasiswa[];
    if (editingItem) {
      updatedList = beasiswaList.map(b => b.id === editingItem.id ? newRecord : b);
    } else {
      updatedList = [newRecord, ...beasiswaList];
    }

    await saveBeasiswaData(updatedList);
    setIsModalOpen(false);
    setEditingItem(null);
  };

  // Delete Handler
  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data beasiswa untuk "${name}"?`)) {
      const updated = beasiswaList.filter(b => b.id !== id);
      await saveBeasiswaData(updated);
    }
  };

  // Quick toggle active status
  const handleToggleStatus = async (item: Beasiswa) => {
    const newStatus: 'Aktif' | 'Tidak Aktif' = item.status === 'Aktif' ? 'Tidak Aktif' : 'Aktif';
    const updated = beasiswaList.map(b => b.id === item.id ? { ...b, status: newStatus } : b);
    await saveBeasiswaData(updated);
  };

  // Filtered List
  const filteredList = useMemo(() => {
    return beasiswaList.filter(item => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (item.namaPenerima || '').toLowerCase().includes(q);
        const matchDonatur = (item.lembagaDonatur || '').toLowerCase().includes(q);
        const matchIdentitas = (item.identitasPenerima || '').toLowerCase().includes(q);
        const matchKeterangan = (item.keterangan || '').toLowerCase().includes(q);
        const matchPeriode = (item.periodeKeterangan || '').toLowerCase().includes(q);
        if (!matchName && !matchDonatur && !matchIdentitas && !matchKeterangan && !matchPeriode) {
          return false;
        }
      }

      // Filter Tipe Penerima
      if (filterTipePenerima !== 'semua' && item.tipePenerima !== filterTipePenerima) {
        return false;
      }

      // Filter Status
      if (filterStatus !== 'semua' && item.status !== filterStatus) {
        return false;
      }

      // Filter Donatur
      if (filterDonatur !== 'semua' && item.lembagaDonatur !== filterDonatur) {
        return false;
      }

      // Filter Periode Type
      if (filterPeriodeType !== 'semua' && item.tipePeriode !== filterPeriodeType) {
        return false;
      }

      return true;
    });
  }, [beasiswaList, searchQuery, filterTipePenerima, filterStatus, filterDonatur, filterPeriodeType]);

  // Statistics Summary
  const stats = useMemo(() => {
    const total = beasiswaList.length;
    const aktif = beasiswaList.filter(b => b.status === 'Aktif').length;
    const santriCount = beasiswaList.filter(b => b.tipePenerima === 'siswa' && b.status === 'Aktif').length;
    const ustadzCount = beasiswaList.filter(b => b.tipePenerima === 'ustadz' && b.status === 'Aktif').length;
    const totalNominalAktif = beasiswaList
      .filter(b => b.status === 'Aktif')
      .reduce((sum, b) => sum + (Number(b.nominal) || 0), 0);
    const donaturSet = new Set(beasiswaList.map(b => b.lembagaDonatur).filter(Boolean));

    return {
      total,
      aktif,
      santriCount,
      ustadzCount,
      totalNominalAktif,
      totalDonatur: donaturSet.size
    };
  }, [beasiswaList]);

  // Pagination
  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterTipePenerima, filterStatus, filterDonatur, filterPeriodeType]);

  // Currency Formatter helper
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Google Sheets Direct Synchronizer
  const handleSyncToSpreadsheet = async () => {
    setIsSyncing(true);
    setSyncFeedback({ type: 'info', message: 'Sedang menyinkronkan data beasiswa ke Google Spreadsheet...' });

    try {
      const cloudSpreadsheetId = config?.spreadsheetId || localStorage.getItem('cfg_cloud_spreadsheet_id') || '';
      const appsScriptUrl = config?.appsScriptUrl || localStorage.getItem('cfg_apps_script_url') || '';

      const payload = {
        data: {
          db_beasiswa: beasiswaList
        },
        spreadsheetId: cloudSpreadsheetId,
        appsScriptUrl: appsScriptUrl
      };

      const response = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resJson = await response.json();
      if (!response.ok) {
        throw new Error(resJson.error || 'Gagal menyinkronkan ke Spreadsheet');
      }

      setSyncFeedback({
        type: 'success',
        message: 'Alhamdulillah! Data Beasiswa berhasil disinkronkan ke sheet MASTER_BEASISWA di Google Spreadsheet.'
      });
    } catch (err: any) {
      console.error('Spreadsheet sync error:', err);
      setSyncFeedback({
        type: 'error',
        message: `Sinkronisasi Spreadsheet: ${err.message || 'Pastikan ID Spreadsheet telah diatur di menu Export & Backup'}`
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 6000);
    }
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredList.map((item, idx) => ({
        'No': idx + 1,
        'ID Beasiswa': item.id,
        'Lembaga / Donatur': item.lembagaDonatur,
        'Tipe Penerima': item.tipePenerima === 'siswa' ? 'Siswa / Santri' : 'Ustadz / Guru',
        'Nama Penerima': item.namaPenerima,
        'Identitas (NISN/NIP)': item.identitasPenerima,
        'Kategori / Kelas': item.kategoriPenerima,
        'Tipe Periode': item.tipePeriode.toUpperCase(),
        'Periode Lengkap': item.periodeKeterangan,
        'Nominal (Rp)': item.nominal,
        'Status': item.status,
        'Keterangan': item.keterangan || '-',
        'Tanggal Input': item.tanggalInput || '-'
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'DATA_BEASISWA');

      const filename = `DATA_BEASISWA_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);
    } catch (err: any) {
      alert('Gagal mengekspor data ke Excel: ' + err.message);
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('DAFTAR PENERIMA BEASISWA & TUNJANGAN DONATUR', 14, 15);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tahun Ajaran: ${tahunAjaranAktif} | Total Data: ${filteredList.length} | Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

      const tableRows = filteredList.map((b, idx) => [
        idx + 1,
        b.lembagaDonatur,
        b.tipePenerima === 'siswa' ? 'Santri' : 'Ustadz',
        b.namaPenerima,
        b.identitasPenerima.replace('NISN: ', '').replace('NIP: ', ''),
        b.periodeKeterangan,
        formatRupiah(b.nominal),
        b.status
      ]);

      autoTable(doc, {
        head: [['No', 'Lembaga/Donatur', 'Tipe', 'Nama Penerima', 'NISN/NIP', 'Periode', 'Nominal', 'Status']],
        body: tableRows,
        startY: 26,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 50 },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 45, fontStyle: 'bold' },
          4: { cellWidth: 35 },
          5: { cellWidth: 50 },
          6: { cellWidth: 35, halign: 'right' },
          7: { cellWidth: 20, halign: 'center' }
        }
      });

      doc.save(`DATA_BEASISWA_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err: any) {
      alert('Gagal mengekspor PDF: ' + err.message);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20 space-y-4">
      {/* 1. TOP HEADER & METRICS (STATIS) */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-2.5">
          {/* Main Top Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Title & Icon */}
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/30 shrink-0">
                <Award className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
                    DATA BEASISWA
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                    Terintegrasi
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium truncate">
                  Pengelolaan donatur, alokasi beasiswa santri & tunjangan ustadz
                </p>
              </div>
            </div>

            {/* Action Buttons - Compact Single-Row Layout */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Sync to Spreadsheet */}
              <button
                type="button"
                onClick={handleSyncToSpreadsheet}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition shadow-xs cursor-pointer disabled:opacity-50"
                title="Sinkronkan data beasiswa langsung ke Google Spreadsheet"
              >
                <FileSpreadsheet className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isSyncing ? 'Menyinkronkan...' : 'Sinkron Spreadsheet'}</span>
                <span className="sm:hidden">{isSyncing ? 'Sync...' : 'Sync'}</span>
              </button>

              {/* Export Group (Excel & PDF) */}
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 shadow-xs">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-white hover:text-emerald-700 transition cursor-pointer"
                  title="Unduh format Excel (.xlsx)"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Excel</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-white hover:text-rose-700 transition cursor-pointer"
                  title="Unduh format PDF"
                >
                  <FileText className="h-3.5 w-3.5 text-rose-600" />
                  <span>PDF</span>
                </button>
              </div>

              {/* Add Beasiswa Button */}
              {isEditable && (
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm shadow-emerald-600/30 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah Beasiswa</span>
                </button>
              )}
            </div>
          </div>

          {/* Feedback banner for sync */}
          {syncFeedback && (
            <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
              syncFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
              syncFeedback.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
              'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              {syncFeedback.type === 'success' ? <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" /> :
               syncFeedback.type === 'error' ? <XCircle className="h-4 w-4 shrink-0 text-rose-600" /> :
               <RefreshCw className="h-4 w-4 shrink-0 text-blue-600 animate-spin" />}
              <span>{syncFeedback.message}</span>
            </div>
          )}

          {/* 2. COMPACT STATS SUMMARY STRIP */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
            {/* Total Alokasi */}
            <div className="bg-slate-50 hover:bg-slate-100/80 transition border border-slate-200/80 p-2.5 rounded-xl flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
                <DollarSign className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 truncate">Total Alokasi</p>
                <p className="text-xs sm:text-sm font-black text-emerald-700 truncate leading-tight">
                  {formatRupiah(stats.totalNominalAktif)}
                </p>
              </div>
            </div>

            {/* Santri Penerima */}
            <div className="bg-slate-50 hover:bg-slate-100/80 transition border border-slate-200/80 p-2.5 rounded-xl flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 truncate">Santri Penerima</p>
                <p className="text-xs sm:text-sm font-black text-slate-800 truncate leading-tight">
                  {stats.santriCount} <span className="text-[10px] font-medium text-slate-500">Santri</span>
                </p>
              </div>
            </div>

            {/* Ustadz Penerima */}
            <div className="bg-slate-50 hover:bg-slate-100/80 transition border border-slate-200/80 p-2.5 rounded-xl flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-100/80 text-teal-700 flex items-center justify-center shrink-0">
                <UserCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 truncate">Ustadz Penerima</p>
                <p className="text-xs sm:text-sm font-black text-slate-800 truncate leading-tight">
                  {stats.ustadzCount} <span className="text-[10px] font-medium text-slate-500">Ustadz</span>
                </p>
              </div>
            </div>

            {/* Lembaga / Donatur */}
            <div className="bg-slate-50 hover:bg-slate-100/80 transition border border-slate-200/80 p-2.5 rounded-xl flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-100/80 text-purple-700 flex items-center justify-center shrink-0">
                <Building className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 truncate">Donatur / Mitra</p>
                <p className="text-xs sm:text-sm font-black text-slate-800 truncate leading-tight">
                  {stats.totalDonatur} <span className="text-[10px] font-medium text-slate-500">Mitra</span>
                </p>
              </div>
            </div>

            {/* Total Data */}
            <div className="bg-slate-50 hover:bg-slate-100/80 transition border border-slate-200/80 p-2.5 rounded-xl flex items-center gap-2.5 col-span-2 sm:col-span-1">
              <div className="w-8 h-8 rounded-lg bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0">
                <Award className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 truncate">Total Data</p>
                <p className="text-xs sm:text-sm font-black text-slate-800 truncate leading-tight">
                  {stats.total} <span className="text-[10px] font-medium text-slate-500">({stats.aktif} Aktif)</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN CONTENT CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
        {/* FILTER & SEARCH BAR */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative lg:col-span-2">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari penerima, NISN/NIP, donatur..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Tipe Penerima */}
            <div>
              <select
                value={filterTipePenerima}
                onChange={(e) => setFilterTipePenerima(e.target.value as any)}
                className="w-full py-2 px-3 rounded-xl text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
              >
                <option value="semua">Semua Penerima (Santri & Ustadz)</option>
                <option value="siswa">Khusus Santri / Siswa</option>
                <option value="ustadz">Khusus Guru / Ustadz</option>
              </select>
            </div>

            {/* Filter Status */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full py-2 px-3 rounded-xl text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
              >
                <option value="semua">Semua Status (Aktif & Nonaktif)</option>
                <option value="Aktif">Hanya Aktif</option>
                <option value="Tidak Aktif">Hanya Tidak Aktif</option>
              </select>
            </div>

            {/* Filter Donatur */}
            <div>
              <select
                value={filterDonatur}
                onChange={(e) => setFilterDonatur(e.target.value)}
                className="w-full py-2 px-3 rounded-xl text-xs border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
              >
                <option value="semua">Semua Lembaga / Donatur</option>
                {allDonaturs.map((d, i) => (
                  <option key={i} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {(searchQuery || filterTipePenerima !== 'semua' || filterStatus !== 'semua' || filterDonatur !== 'semua' || filterPeriodeType !== 'semua') && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
              <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Filter Aktif:</span>
              {searchQuery && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                  Cari: "{searchQuery}"
                </span>
              )}
              {filterTipePenerima !== 'semua' && (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold">
                  Penerima: {filterTipePenerima === 'siswa' ? 'Santri' : 'Ustadz'}
                </span>
              )}
              {filterStatus !== 'semua' && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                  Status: {filterStatus}
                </span>
              )}
              {filterDonatur !== 'semua' && (
                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-semibold">
                  Donatur: {filterDonatur}
                </span>
              )}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterTipePenerima('semua');
                  setFilterStatus('semua');
                  setFilterDonatur('semua');
                  setFilterPeriodeType('semua');
                }}
                className="text-rose-600 hover:text-rose-700 font-bold text-[11px] underline ml-1 cursor-pointer"
              >
                Reset Semua
              </button>
            </div>
          )}
        </div>

        {/* 4. TABLE DATA SECTION */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Daftar Penerima Beasiswa & Donasi
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Menampilkan {filteredList.length} data beasiswa terdaftar
              </p>
            </div>
            <div className="text-xs font-bold text-slate-500">
              Halaman {currentPage} dari {totalPages}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                  <th className="px-3.5 py-3 w-12 text-center">No</th>
                  <th className="px-3.5 py-3">Lembaga / Donatur</th>
                  <th className="px-3.5 py-3">Penerima</th>
                  <th className="px-3.5 py-3">Kategori / Identitas</th>
                  <th className="px-3.5 py-3">Periode</th>
                  <th className="px-3.5 py-3 text-right">Nominal</th>
                  <th className="px-3.5 py-3 text-center">Status</th>
                  <th className="px-3.5 py-3 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 space-y-2">
                      <Award className="h-10 w-10 mx-auto text-slate-300 stroke-[1.5]" />
                      <p className="font-bold text-sm text-slate-600">Belum ada data beasiswa yang sesuai</p>
                      <p className="text-xs text-slate-400">
                        Klik tombol <span className="font-semibold text-emerald-600">"Tambah Beasiswa"</span> di atas untuk menambahkan data baru.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((item, index) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                    const isSiswa = item.tipePenerima === 'siswa';

                    return (
                      <tr 
                        key={item.id} 
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* No */}
                        <td className="px-3.5 py-3 text-center font-bold text-slate-400">
                          {rowNumber}
                        </td>

                        {/* Lembaga / Donatur */}
                        <td className="px-3.5 py-3">
                          <div className="font-bold text-slate-800 text-xs sm:text-[13px] flex items-center gap-1.5">
                            <Building className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                            <span>{item.lembagaDonatur}</span>
                          </div>
                          {item.keterangan && (
                            <p className="text-[11px] text-slate-400 line-clamp-1 italic mt-0.5">
                              {item.keterangan}
                            </p>
                          )}
                        </td>

                        {/* Nama Penerima */}
                        <td className="px-3.5 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase shrink-0 ${
                              isSiswa ? 'bg-blue-100 text-blue-800' : 'bg-teal-100 text-teal-800'
                            }`}>
                              {isSiswa ? 'Santri' : 'Ustadz'}
                            </span>
                            <span className="font-bold text-slate-800 text-xs sm:text-[13px]">
                              {item.namaPenerima}
                            </span>
                          </div>
                        </td>

                        {/* Kategori / Identitas */}
                        <td className="px-3.5 py-3 space-y-0.5">
                          <div className="font-semibold text-slate-600 text-[11px] sm:text-xs">
                            {item.kategoriPenerima || (isSiswa ? 'Santri' : 'Pengajar')}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {item.identitasPenerima}
                          </div>
                        </td>

                        {/* Periode */}
                        <td className="px-3.5 py-3">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold">
                            <Calendar className="h-3 w-3 text-amber-600 shrink-0" />
                            <span>{item.periodeKeterangan || item.tipePeriode}</span>
                          </div>
                        </td>

                        {/* Nominal */}
                        <td className="px-3.5 py-3 text-right">
                          <span className="font-black text-emerald-700 text-xs sm:text-sm">
                            {formatRupiah(item.nominal)}
                          </span>
                        </td>

                        {/* Status Aktif / Tidak Aktif */}
                        <td className="px-3.5 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => isEditable && handleToggleStatus(item)}
                            disabled={!isEditable}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold transition cursor-pointer ${
                              item.status === 'Aktif'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                            }`}
                            title="Klik untuk mengubah status aktif / nonaktif"
                          >
                            {item.status === 'Aktif' ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                                <span>Aktif</span>
                              </>
                            ) : (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                <span>Tidak Aktif</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Action buttons */}
                        <td className="px-3.5 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* View Detail Slip */}
                            <button
                              type="button"
                              onClick={() => setDetailItem(item)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Lihat Rincian Tanda Terima"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {/* Edit */}
                            {isEditable && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="Edit Data Beasiswa"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                            )}

                            {/* Delete */}
                            {isEditable && (
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id, item.namaPenerima)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Hapus Data Beasiswa"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 5. PAGINATION FOOTER */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredList.length)} dari {filteredList.length} data
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
                >
                  Sebelumnya
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg font-bold transition text-xs ${
                      currentPage === page
                        ? 'bg-emerald-600 text-white'
                        : 'border border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. MODAL FORM: ADD / EDIT BEASISWA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/10 text-white">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {editingItem ? 'Edit Data Beasiswa' : 'Tambah Penerima Beasiswa Baru'}
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Form input beasiswa dengan sinkronisasi master data dan spreadsheet
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* SECTION 1: LEMBAGA / DONATUR (ADD DROPDOWN FORMAT) */}
              <div className="space-y-2 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Building className="h-4 w-4 text-purple-600" />
                    <span>Lembaga / Donatur</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNewDonatur(!isAddingNewDonatur);
                      setNewDonaturInput('');
                    }}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{isAddingNewDonatur ? 'Pilih dari Dropdown' : '+ Tambah Donatur Baru'}</span>
                  </button>
                </div>

                {!isAddingNewDonatur ? (
                  <div className="space-y-1">
                    <select
                      value={formLembaga}
                      onChange={(e) => {
                        if (e.target.value === '__add_new__') {
                          setIsAddingNewDonatur(true);
                          setNewDonaturInput('');
                        } else {
                          setFormLembaga(e.target.value);
                        }
                      }}
                      className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      {allDonaturs.map((d, i) => (
                        <option key={i} value={d}>{d}</option>
                      ))}
                      <option value="__add_new__" className="font-bold text-emerald-700">
                        + Tambah Lembaga / Donatur Lainnya...
                      </option>
                    </select>
                    <p className="text-[10px] text-slate-400">
                      Pilih donatur dari daftar atau klik "+ Tambah Donatur Baru" untuk membuat nama donatur baru.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 animate-fadeIn">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newDonaturInput}
                        onChange={(e) => setNewDonaturInput(e.target.value)}
                        placeholder="Ketik nama Lembaga / Donatur baru..."
                        className="flex-1 py-2.5 px-3 rounded-xl border border-emerald-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddNewDonatur}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition text-xs"
                      >
                        Simpan Donatur
                      </button>
                    </div>
                    <p className="text-[10px] text-emerald-600 font-semibold">
                      Nama donatur baru akan otomatis tersimpan dalam daftar dropdown untuk penggunaan selanjutnya.
                    </p>
                  </div>
                )}
              </div>

              {/* SECTION 2: PENERIMA (SISWA DAN USTADZ) */}
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span>Tipe & Data Penerima</span>
                  <span className="text-rose-500">*</span>
                </label>

                {/* Switch Siswa vs Ustadz */}
                <div className="grid grid-cols-2 gap-2 bg-slate-200/70 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setFormTipePenerima('siswa');
                      setFormPenerimaId(students.length > 0 ? students[0].id : '');
                      setRecipientSearch('');
                    }}
                    className={`py-2 px-3 rounded-lg font-extrabold text-xs transition flex items-center justify-center gap-2 ${
                      formTipePenerima === 'siswa'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Siswa / Santri ({students.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormTipePenerima('ustadz');
                      setFormPenerimaId(ustadzList.length > 0 ? ustadzList[0].id : '');
                      setRecipientSearch('');
                    }}
                    className={`py-2 px-3 rounded-lg font-extrabold text-xs transition flex items-center justify-center gap-2 ${
                      formTipePenerima === 'ustadz'
                        ? 'bg-white text-teal-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Guru / Ustadz ({ustadzList.length})</span>
                  </button>
                </div>

                {/* Recipient Search & Selector */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={recipientSearch}
                      onChange={(e) => {
                        setRecipientSearch(e.target.value);
                        setIsRecipientDropdownOpen(true);
                      }}
                      onFocus={() => setIsRecipientDropdownOpen(true)}
                      placeholder={`Ketik nama ${formTipePenerima === 'siswa' ? 'santri / NISN' : 'ustadz / NIP'} untuk mencari...`}
                      className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Dropdown list */}
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-inner">
                    {filteredRecipients.length === 0 ? (
                      <div className="p-3 text-center text-slate-400">
                        Tidak ada data penerima yang cocok dengan pencarian
                      </div>
                    ) : (
                      filteredRecipients.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setFormPenerimaId(r.id);
                            setRecipientSearch(r.nama);
                            setIsRecipientDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 hover:bg-slate-50 transition flex items-center justify-between ${
                            formPenerimaId === r.id ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-slate-700'
                          }`}
                        >
                          <div>
                            <p className="font-bold text-xs">{r.nama}</p>
                            <p className="text-[10px] text-slate-400">{r.identitas} | {r.kategori}</p>
                          </div>
                          {formPenerimaId === r.id && (
                            <Check className="h-4 w-4 text-emerald-600" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Selected Recipient Card Preview */}
                {currentSelectedRecipient && (
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs ${
                        formTipePenerima === 'siswa' ? 'bg-blue-600' : 'bg-teal-600'
                      }`}>
                        {currentSelectedRecipient.nama.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-800">{currentSelectedRecipient.nama}</p>
                        <p className="text-[10px] text-slate-500">{currentSelectedRecipient.identitas} • {currentSelectedRecipient.kategori}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Terpilih
                    </span>
                  </div>
                )}
              </div>

              {/* SECTION 3: PERIODE (3 PILIHAN: BULANAN, TAHUNAN, PERIODE KHUSUS) */}
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-amber-600" />
                  <span>Pilihan Periode Beasiswa</span>
                  <span className="text-rose-500">*</span>
                </label>

                {/* Periode Radio Selector */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'bulanan', label: '1. Bulanan', desc: 'Per Bulan' },
                    { id: 'tahunan', label: '2. Tahunan', desc: 'Tulis Tahun' },
                    { id: 'khusus', label: '3. Periode Khusus', desc: 'Mulai s/d Selesai' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormTipePeriode(p.id as PeriodeBeasiswaType)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        formTipePeriode === p.id
                          ? 'bg-amber-500/10 border-amber-400 text-amber-900 font-bold ring-2 ring-amber-400/40'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <p className="font-extrabold text-xs">{p.label}</p>
                      <p className="text-[10px] text-slate-400 font-normal">{p.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Sub-inputs based on Periode Type */}
                {formTipePeriode === 'bulanan' && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 grid grid-cols-2 gap-3 animate-fadeIn">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bulan:</label>
                      <select
                        value={formBulan}
                        onChange={(e) => setFormBulan(e.target.value)}
                        className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-800"
                      >
                        {BULAN_OPTIONS.map((b, i) => (
                          <option key={i} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tahun Ajaran / Kalender:</label>
                      <input
                        type="text"
                        value={formTahun}
                        onChange={(e) => setFormTahun(e.target.value)}
                        placeholder="Contoh: 2026/2027 atau 2026"
                        className="w-full py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-800"
                      />
                    </div>
                  </div>
                )}

                {formTipePeriode === 'tahunan' && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 animate-fadeIn">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">
                      Tahun Beasiswa (Wajib Ditulis): <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formTahun}
                      onChange={(e) => setFormTahun(e.target.value)}
                      placeholder="Contoh: 2025/2026 atau 2026"
                      className="w-full py-2.5 px-3 rounded-lg border border-amber-300 bg-white font-bold text-slate-800 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-amber-700 font-semibold">
                      * Harap menuliskan tahun atau tahun ajaran yang berlaku (misal: 2025/2026 atau 2026).
                    </p>
                  </div>
                )}

                {formTipePeriode === 'khusus' && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-3 animate-fadeIn">
                    <p className="text-[11px] font-bold text-slate-700">
                      Tentukan Rentang Bulan &amp; Tahun Mulai s/d Selesai:
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Mulai */}
                      <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-200 space-y-2">
                        <span className="text-[10px] font-black uppercase text-emerald-800">1. Periode Mulai</span>
                        <div className="space-y-1.5">
                          <select
                            value={formBulanMulai}
                            onChange={(e) => setFormBulanMulai(e.target.value)}
                            className="w-full py-1.5 px-2 rounded-md border border-slate-200 bg-white font-semibold text-xs text-slate-800"
                          >
                            {BULAN_OPTIONS.map((b, i) => (
                              <option key={i} value={b}>{b}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={formTahunMulai}
                            onChange={(e) => setFormTahunMulai(e.target.value)}
                            placeholder="Tahun Mulai (e.g. 2025)"
                            className="w-full py-1.5 px-2 rounded-md border border-slate-200 bg-white font-semibold text-xs text-slate-800"
                          />
                        </div>
                      </div>

                      {/* Selesai */}
                      <div className="p-2.5 rounded-lg bg-rose-50/50 border border-rose-200 space-y-2">
                        <span className="text-[10px] font-black uppercase text-rose-800">2. Periode Selesai</span>
                        <div className="space-y-1.5">
                          <select
                            value={formBulanSelesai}
                            onChange={(e) => setFormBulanSelesai(e.target.value)}
                            className="w-full py-1.5 px-2 rounded-md border border-slate-200 bg-white font-semibold text-xs text-slate-800"
                          >
                            {BULAN_OPTIONS.map((b, i) => (
                              <option key={i} value={b}>{b}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={formTahunSelesai}
                            onChange={(e) => setFormTahunSelesai(e.target.value)}
                            placeholder="Tahun Selesai (e.g. 2026)"
                            className="w-full py-1.5 px-2 rounded-md border border-slate-200 bg-white font-semibold text-xs text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 4: NOMINAL (RUPIAH) & STATUS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nominal */}
                <div className="space-y-1.5 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span>Nominal (Rupiah)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">
                      Rp
                    </span>
                    <input
                      type="text"
                      value={formNominal}
                      onChange={(e) => {
                        const numeric = e.target.value.replace(/[^0-9]/g, '');
                        setFormNominal(numeric);
                      }}
                      placeholder="Contoh: 500000"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white font-black text-emerald-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  {/* Quick Preset Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[250000, 500000, 750000, 1000000, 1500000, 2000000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setFormNominal(String(amt))}
                        className="px-2 py-0.5 rounded-md bg-slate-200/80 hover:bg-emerald-100 hover:text-emerald-800 text-[10px] font-bold text-slate-600 transition"
                      >
                        {formatRupiah(amt)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Aktif / Tidak Aktif */}
                <div className="space-y-1.5 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-amber-600" />
                    <span>Status Beasiswa</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setFormStatus('Aktif')}
                      className={`py-2.5 px-3 rounded-xl border font-black text-xs transition flex items-center justify-center gap-1.5 ${
                        formStatus === 'Aktif'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Aktif</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormStatus('Tidak Aktif')}
                      className={`py-2.5 px-3 rounded-xl border font-black text-xs transition flex items-center justify-center gap-1.5 ${
                        formStatus === 'Tidak Aktif'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Tidak Aktif</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Status menentukan apakah beasiswa masuk dalam perhitungan dana aktif.
                  </p>
                </div>
              </div>

              {/* SECTION 5: KETERANGAN / CATATAN */}
              <div className="space-y-1 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                <label className="text-xs font-bold text-slate-800">
                  Keterangan / Catatan Tambahan (Opsional)
                </label>
                <textarea
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Contoh: Beasiswa Tahfidz 30 Juz, Bantuan SPP Bulanan, atau Tunjangan Khusus Guru Pengabdian..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-md shadow-emerald-600/30 flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  <span>{editingItem ? 'Simpan Perubahan' : 'Tambahkan Beasiswa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. DETAIL MODAL: BUKTI / TANDA TERIMA BEASISWA */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Award className="h-5 w-5 text-emerald-300" />
                <h3 className="font-bold text-sm uppercase tracking-wide">
                  Kartu Alokasi Beasiswa
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="text-center space-y-1 pb-3 border-b border-slate-100">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  detailItem.tipePenerima === 'siswa' ? 'bg-blue-100 text-blue-800' : 'bg-teal-100 text-teal-800'
                }`}>
                  {detailItem.tipePenerima === 'siswa' ? 'Santri Penerima' : 'Ustadz Penerima'}
                </span>
                <h4 className="text-base font-black text-slate-800 pt-1">
                  {detailItem.namaPenerima}
                </h4>
                <p className="text-slate-400 font-mono text-[11px]">
                  {detailItem.identitasPenerima} • {detailItem.kategoriPenerima}
                </p>
              </div>

              <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Lembaga / Donatur:</span>
                  <span className="font-bold text-slate-800">{detailItem.lembagaDonatur}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Periode:</span>
                  <span className="font-bold text-amber-800">{detailItem.periodeKeterangan || detailItem.tipePeriode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Nominal:</span>
                  <span className="font-black text-emerald-700 text-sm">{formatRupiah(detailItem.nominal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Status:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    detailItem.status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {detailItem.status}
                  </span>
                </div>
                {detailItem.keterangan && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-slate-400 font-medium block mb-0.5">Catatan:</span>
                    <span className="text-slate-700 italic">{detailItem.keterangan}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDetailItem(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition text-xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
