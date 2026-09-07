import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, UserCheck, Save, FileText, Upload, CheckCircle, AlertTriangle, ArrowLeft, Globe,
  Users, GraduationCap, School, Layers, Sparkles, Filter, ChevronRight, BookOpen, ShieldCheck,
  Calendar, X
} from 'lucide-react';
import { PengaturanSistem } from '../types';
import { INITIAL_STUDENTS } from '../initialStudents';

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
};

const DEFAULT_FALLBACK_USTADZ = [
  { id: 'u-1', nama: 'KH. M. Al-Ihsan', jabatan: 'Pimpinan Pesantren', status: 'Aktif' },
  { id: 'u-2', nama: 'Ustadz Ahmad Fauzi, S.Pd.I', jabatan: 'Kepala Kepesantrenan', status: 'Aktif' },
  { id: 'u-3', nama: 'Ustadz Muhammad Ridwan, Lc.', jabatan: 'Direktur KMI/TMI', status: 'Aktif' },
  { id: 'u-4', nama: 'Ustadzah Siti Aminah, S.Ag.', jabatan: 'Koordinator Tahfidz Putri', status: 'Aktif' },
  { id: 'u-5', nama: 'Ustadz Abdullah Zaki, M.Pd.', jabatan: 'Waka Kurikulum', status: 'Aktif' },
  { id: 'u-6', nama: 'Ustadz Fathurrahman, Al-Hafidz', jabatan: 'Musyrif Tahfidz Putra', status: 'Aktif' },
  { id: 'u-7', nama: 'Ustadz Hamzah Al-Baqir, S.Th.I', jabatan: 'Pengampu Kitab Kuning', status: 'Aktif' },
  { id: 'u-8', nama: 'Ustadzah Nurul Hidayah, S.Pd.', jabatan: 'Pengampu Bahasa Arab', status: 'Aktif' },
  { id: 'u-9', nama: 'Ustadz Bilal Ramadhan, M.Ag.', jabatan: 'Pembina Bahasa Asing', status: 'Aktif' },
  { id: 'u-10', nama: 'Ustadz Yusuf Mansur, S.Hum.', jabatan: 'Pengampu Hadits & Ushul', status: 'Aktif' },
  { id: 'u-11', nama: 'Ustadzah Khadijah Al-Kubro, S.Pd.I', jabatan: 'Pembimbing Asrama Putri', status: 'Aktif' },
  { id: 'u-12', nama: 'Ustadz Salman Al-Farisi, S.Pd.', jabatan: 'Pengampu Nahwu & Shorof', status: 'Aktif' }
];

interface CekDataSantriProps {
  config: PengaturanSistem;
  initialSearchKey?: string;
  showSearchForm?: boolean;
  onBackToSearch?: () => void;
  studentsProp?: any[];
  ustadzProp?: any[];
  kelasProp?: any[];
  tahunAjaranProp?: string;
}

export default function CekDataSantri({ 
  config, 
  initialSearchKey = '', 
  showSearchForm = true,
  onBackToSearch,
  studentsProp,
  ustadzProp,
  kelasProp,
  tahunAjaranProp
}: CekDataSantriProps) {
  const [searchKey, setSearchKey] = useState(initialSearchKey);
  const [foundRecord, setFoundRecord] = useState<any | null>(null);
  const [recordType, setRecordType] = useState<'students' | 'pendaftar' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeFormTab, setActiveFormTab] = useState<'identitas' | 'orangtua' | 'berkas'>('identitas');
  const [isSaved, setIsSaved] = useState(false);

  // States for landing page metrics
  const [studentsData, setStudentsData] = useState<any[]>(() => {
    if (studentsProp && studentsProp.length > 0) return studentsProp;
    try {
      const saved = localStorage.getItem('db_students');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_STUDENTS;
  });

  const [ustadzData, setUstadzData] = useState<any[]>(() => {
    if (ustadzProp && ustadzProp.length > 0) return ustadzProp;
    try {
      const saved = localStorage.getItem('db_ustadz_master');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_FALLBACK_USTADZ;
  });

  const [kelasData, setKelasData] = useState<any[]>(() => {
    if (kelasProp && kelasProp.length > 0) return kelasProp;
    try {
      const saved = localStorage.getItem('db_kelas');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [rombelSearch, setRombelSearch] = useState('');
  const [selectedRombelFilter, setSelectedRombelFilter] = useState<string | null>(null);

  // Helper to extract the active academic year strictly from system settings
  const getSettingTahunAjaran = () => {
    try {
      const saved = localStorage.getItem('cfg_tahun_ajaran_aktif');
      if (saved) {
        const clean = saved.split(' ')[0].trim();
        if (clean) return clean;
      }
      const rawCfg = localStorage.getItem('db_config');
      if (rawCfg) {
        const parsed = JSON.parse(rawCfg);
        if (parsed.tahunAjaran) {
          const clean = parsed.tahunAjaran.split(' ')[0].trim();
          if (clean) return clean;
        }
      }
      if (config?.tahunAjaran) {
        const clean = config.tahunAjaran.split(' ')[0].trim();
        if (clean) return clean;
      }
      if (tahunAjaranProp) {
        const clean = tahunAjaranProp.split(' ')[0].trim();
        if (clean) return clean;
      }
    } catch (e) {}
    return '2025/2026';
  };

  // Active Academic Year State (Statis sesuai Pengaturan Sistem)
  const [activeTahunAjaran, setActiveTahunAjaran] = useState<string>(getSettingTahunAjaran);

  // Sync automatically when settings change in GuruPanel / Pengaturan
  useEffect(() => {
    const handleYearUpdate = () => {
      const year = getSettingTahunAjaran();
      setActiveTahunAjaran(year);
    };

    window.addEventListener('academicYearChanged', handleYearUpdate);
    window.addEventListener('storage', handleYearUpdate);
    return () => {
      window.removeEventListener('academicYearChanged', handleYearUpdate);
      window.removeEventListener('storage', handleYearUpdate);
    };
  }, [config?.tahunAjaran, tahunAjaranProp]);

  useEffect(() => {
    const year = getSettingTahunAjaran();
    if (year !== activeTahunAjaran) {
      setActiveTahunAjaran(year);
    }
  }, [config?.tahunAjaran, tahunAjaranProp]);

  // Helper to extract student's class and active status for a specific academic year
  const getStudentInYear = (s: any, targetYear: string) => {
    const cleanTarget = targetYear.split(' ')[0].trim();

    // 1. Check academicHistory first
    if (Array.isArray(s.academicHistory) && s.academicHistory.length > 0) {
      const matchedHist = s.academicHistory.find((h: any) => {
        const hYear = String(h.academicYear || '').split(' ')[0].trim();
        return hYear === cleanTarget || hYear.includes(cleanTarget) || cleanTarget.includes(hYear);
      });

      if (matchedHist) {
        const histStatus = String(matchedHist.status || s.status || s.statusSiswa || 'Aktif').trim().toLowerCase();
        const isHistAktif = histStatus === 'aktif' || histStatus === 'diterima' || histStatus === '';
        return {
          matchesYear: true,
          isActive: isHistAktif,
          kelas: matchedHist.kelas || s.kelas || 'Belum Diatur',
          academicYear: matchedHist.academicYear || cleanTarget
        };
      }
    }

    // 2. Check s.academicYear or s.tahunAjaran
    const sYear = String(s.academicYear || s.tahunAjaran || '').split(' ')[0].trim();
    const isYearMatch = sYear === cleanTarget || sYear.includes(cleanTarget) || cleanTarget.includes(sYear);

    const sStatus = String(s.status || s.statusSiswa || 'Aktif').trim().toLowerCase();
    const isAktif = sStatus === 'aktif' || sStatus === 'diterima' || sStatus === '';

    return {
      matchesYear: isYearMatch,
      isActive: isAktif,
      kelas: s.kelas || 'Belum Diatur',
      academicYear: sYear || cleanTarget
    };
  };

  // Synchronize data when props change
  useEffect(() => {
    if (studentsProp && studentsProp.length > 0) setStudentsData(studentsProp);
  }, [studentsProp]);

  useEffect(() => {
    if (ustadzProp && ustadzProp.length > 0) setUstadzData(ustadzProp);
  }, [ustadzProp]);

  useEffect(() => {
    if (kelasProp && kelasProp.length > 0) setKelasData(kelasProp);
  }, [kelasProp]);

  // Listen to background sync / localStorage changes
  useEffect(() => {
    const handleStorageUpdate = () => {
      try {
        const savedSt = localStorage.getItem('db_students');
        if (savedSt) {
          const parsed = JSON.parse(savedSt);
          if (Array.isArray(parsed) && parsed.length > 0) setStudentsData(parsed);
        }
        const savedUst = localStorage.getItem('db_ustadz_master');
        if (savedUst) {
          const parsed = JSON.parse(savedUst);
          if (Array.isArray(parsed) && parsed.length > 0) setUstadzData(parsed);
        }
        const savedKl = localStorage.getItem('db_kelas');
        if (savedKl) {
          const parsed = JSON.parse(savedKl);
          if (Array.isArray(parsed) && parsed.length > 0) setKelasData(parsed);
        }
      } catch (e) {}
    };

    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('studentsUpdated', handleStorageUpdate);
    window.addEventListener('syncCompleted', handleStorageUpdate);
    return () => {
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('studentsUpdated', handleStorageUpdate);
      window.removeEventListener('syncCompleted', handleStorageUpdate);
    };
  }, []);

  // Compute Landing Page Statistics strictly based on the active academic year
  const stats = useMemo(() => {
    const allStudents = studentsData && studentsData.length > 0 ? studentsData : INITIAL_STUDENTS;

    // Filter students belonging to active academic year AND having status Aktif
    const activeStudentsInYear: Array<any & { resolvedKelas: string }> = [];

    allStudents.forEach(s => {
      const info = getStudentInYear(s, activeTahunAjaran);
      if (info.matchesYear && info.isActive) {
        activeStudentsInYear.push({
          ...s,
          resolvedKelas: info.kelas
        });
      }
    });

    const totalSantriAktif = activeStudentsInYear.length;

    // 2. Ustadz Aktif
    const isUstadzAktif = (u: any) => {
      const st = String(u.statusUstadz || u.status || 'Aktif').trim().toLowerCase();
      return st === 'aktif' || st === '';
    };
    const activeUstadzList = ustadzData.filter(isUstadzAktif);
    const totalUstadzAktif = activeUstadzList.length > 0 ? activeUstadzList.length : (ustadzData.length > 0 ? ustadzData.length : DEFAULT_FALLBACK_USTADZ.length);

    // 3. Gender breakdown (Laki-laki vs Perempuan)
    const isLaki = (s: any) => {
      const g = String(s.gender || s.jenisKelamin || '').toLowerCase().trim();
      return g.startsWith('l') || g === 'pria' || g === 'putra' || g === 'laki-laki' || g === 'ikhwan';
    };

    const countLaki = activeStudentsInYear.filter(isLaki).length;
    const countPerempuan = Math.max(0, totalSantriAktif - countLaki);

    const pctLaki = totalSantriAktif > 0 ? Math.round((countLaki / totalSantriAktif) * 100) : 0;
    const pctPerempuan = totalSantriAktif > 0 ? (100 - pctLaki) : 0;

    // 4. Jumlah Santri per Rombel (hanya yang memiliki santri di tahun ajaran aktif, rombel kosong TIDAK ditampilkan)
    const rombelMap: Record<string, { total: number; laki: number; perempuan: number }> = {};

    activeStudentsInYear.forEach(s => {
      const rawKelas = String(s.resolvedKelas || s.kelas || 'Belum Diatur').trim();
      const kelasName = rawKelas && rawKelas !== '-' ? rawKelas : 'Belum Diatur';
      if (!rombelMap[kelasName]) {
        rombelMap[kelasName] = { total: 0, laki: 0, perempuan: 0 };
      }
      rombelMap[kelasName].total += 1;
      if (isLaki(s)) {
        rombelMap[kelasName].laki += 1;
      } else {
        rombelMap[kelasName].perempuan += 1;
      }
    });

    // STRICT: "rombel kosong tidak ditampilkan" - only entries with total > 0
    const rombelList = Object.entries(rombelMap)
      .filter(([_, data]) => data.total > 0)
      .map(([name, data]) => ({
        name,
        total: data.total,
        laki: data.laki,
        perempuan: data.perempuan,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    return {
      totalSantriAktif,
      totalUstadzAktif,
      countLaki,
      countPerempuan,
      pctLaki,
      pctPerempuan,
      rombelList,
      totalRombel: rombelList.length,
      activeStudentsList: activeStudentsInYear
    };
  }, [studentsData, ustadzData, activeTahunAjaran]);

  // Students in selected rombel drilldown
  const studentsInSelectedRombel = useMemo(() => {
    if (!selectedRombelFilter) return [];
    return (stats.activeStudentsList || []).filter(
      (s: any) => (s.resolvedKelas || s.kelas) === selectedRombelFilter
    );
  }, [selectedRombelFilter, stats.activeStudentsList]);

  // States for Indonesian administrative hierarchy (emsifa API)
  const [provinces, setProvinces] = useState<{ id: string, name: string }[]>([]);
  const [regencies, setRegencies] = useState<{ id: string, name: string }[]>([]);
  const [districts, setDistricts] = useState<{ id: string, name: string }[]>([]);
  const [villages, setVillages] = useState<{ id: string, name: string }[]>([]);

  const [loadingProvinces, setLoadingProvinces] = useState<boolean>(false);
  const [loadingRegencies, setLoadingRegencies] = useState<boolean>(false);
  const [loadingDistricts, setLoadingDistricts] = useState<boolean>(false);
  const [loadingVillages, setLoadingVillages] = useState<boolean>(false);

  // Fetch Provinces on Mount
  useEffect(() => {
    const fetchProvinces = async () => {
      setLoadingProvinces(true);
      try {
        const res = await fetch('/api/wilayah/provinces');
        if (!res.ok) throw new Error('Failed to fetch provinces');
        const data = await res.json();
        setProvinces(Array.isArray(data) && data.length > 0 ? data : [
          { id: "32", name: "JAWA BARAT" },
          { id: "31", name: "DKI JAKARTA" },
          { id: "33", name: "JAWA TENGAH" },
          { id: "35", name: "JAWA TIMUR" },
          { id: "36", name: "BANTEN" }
        ]);
      } catch (err) {
        console.warn('Error fetching provinces, using fallback list:', err);
        setProvinces([
          { id: "32", name: "JAWA BARAT" },
          { id: "31", name: "DKI JAKARTA" },
          { id: "33", name: "JAWA TENGAH" },
          { id: "35", name: "JAWA TIMUR" },
          { id: "36", name: "BANTEN" }
        ]);
      } finally {
        setLoadingProvinces(false);
      }
    };
    fetchProvinces();
  }, []);

  const handleProvinsiChange = async (provId: string) => {
    const selectedProv = provinces.find(p => p.id === provId);
    if (!selectedProv) return;

    handleInputChange('provinsi', toTitleCase(selectedProv.name));
    handleInputChange('kabupaten', '');
    handleInputChange('kecamatan', '');
    handleInputChange('kelurahan', '');

    setRegencies([]);
    setDistricts([]);
    setVillages([]);

    setLoadingRegencies(true);
    try {
      const res = await fetch(`/api/wilayah/regencies/${provId}`);
      if (!res.ok) throw new Error('Failed to fetch regencies');
      const data = await res.json();
      setRegencies(data);
    } catch (err) {
      console.error('Error fetching regencies:', err);
    } finally {
      setLoadingRegencies(false);
    }
  };

  const handleKabupatenChange = async (kabId: string) => {
    const selectedKab = regencies.find(r => r.id === kabId);
    if (!selectedKab) return;

    handleInputChange('kabupaten', toTitleCase(selectedKab.name));
    handleInputChange('kecamatan', '');
    handleInputChange('kelurahan', '');

    setDistricts([]);
    setVillages([]);

    setLoadingDistricts(true);
    try {
      const res = await fetch(`/api/wilayah/districts/${kabId}`);
      if (!res.ok) throw new Error('Failed to fetch districts');
      const data = await res.json();
      setDistricts(data);
    } catch (err) {
      console.error('Error fetching districts:', err);
    } finally {
      setLoadingDistricts(false);
    }
  };

  const handleKecamatanChange = async (kecId: string) => {
    const selectedKec = districts.find(d => d.id === kecId);
    if (!selectedKec) return;

    handleInputChange('kecamatan', toTitleCase(selectedKec.name));
    handleInputChange('kelurahan', '');

    setVillages([]);

    setLoadingVillages(true);
    try {
      const res = await fetch(`/api/wilayah/villages/${kecId}`);
      if (!res.ok) throw new Error('Failed to fetch villages');
      const data = await res.json();
      setVillages(data);
    } catch (err) {
      console.error('Error fetching villages:', err);
    } finally {
      setLoadingVillages(false);
    }
  };

  const handleKelurahanChange = (desaId: string) => {
    const selectedDesa = villages.find(v => v.id === desaId);
    if (!selectedDesa) return;
    handleInputChange('kelurahan', toTitleCase(selectedDesa.name));
  };

  // Check if disabled by administrator
  const isEditingDisabled = config?.disableEditSantri === true;

  const performSearch = (keyToSearch: string) => {
    setErrorMsg('');
    setFoundRecord(null);
    setRecordType(null);
    setIsSaved(false);

    const key = keyToSearch.trim();
    if (!key) {
      setErrorMsg('Silakan masukkan NISN atau NIS terlebih dahulu.');
      return;
    }

    // Get active academic year for filtering
    const activeTahun = activeTahunAjaran.split(' ')[0].trim();

    // 1. Search in db_students (Active School Students)
    const rawStudents = localStorage.getItem('db_students');
    let studentsList: any[] = [];
    try {
      studentsList = rawStudents ? JSON.parse(rawStudents) : [];
      if (!Array.isArray(studentsList)) studentsList = [];
    } catch {}

    const studentMatch = studentsList.find((s: any) => {
      if (!s) return false;
      const matchKey = (
        (s.nisn && String(s.nisn).trim() === key) || 
        (s.nis && String(s.nis).trim() === key) ||
        (s.nik && String(s.nik).trim() === key)
      );
      if (!matchKey) return false;
      const info = getStudentInYear(s, activeTahun);
      return info.matchesYear;
    });

    if (studentMatch) {
      const info = getStudentInYear(studentMatch, activeTahun);
      const record = { 
        ...studentMatch,
        kelas: info.kelas || studentMatch.kelas,
        academicYear: info.academicYear || activeTahun
      };
      // Ensure absolute synchronization between students & registration fields
      if (!record.namaLengkap) record.namaLengkap = record.nama;
      if (!record.nama) record.nama = record.namaLengkap;
      if (!record.jenisKelamin) record.jenisKelamin = record.gender;
      if (!record.gender) record.gender = record.jenisKelamin;
      if (!record.noHp) record.noHp = record.noWaUtama || record.noHpOrangTua;
      if (!record.noWaUtama) record.noWaUtama = record.noHp || record.noHpOrangTua;
      if (!record.noHpOrangTua) record.noHpOrangTua = record.noHp || record.noWaUtama;
      if (!record.kabupaten) record.kabupaten = record.kabupatenKota;
      if (!record.kabupatenKota) record.kabupatenKota = record.kabupaten;
      if (!record.jmlSaudara) record.jmlSaudara = record.saudara;
      if (!record.saudara) record.saudara = record.jmlSaudara;

      setFoundRecord(record);
      setRecordType('students');
      return;
    }

    // 2. Search in db_pendaftar (Candidates)
    const rawPendaftar = localStorage.getItem('db_pendaftar');
    const pendaftarList = rawPendaftar ? JSON.parse(rawPendaftar) : [];
    const pendaftarMatch = pendaftarList.find((p: any) => 
      ((p.nisn && p.nisn.trim() === key) || (p.nis && p.nis.toString().trim() === key)) &&
      (!p.academicYear || p.academicYear === activeTahun)
    );

    if (pendaftarMatch) {
      const record = { ...pendaftarMatch };
      // Ensure absolute synchronization between students & registration fields
      if (!record.namaLengkap) record.namaLengkap = record.nama;
      if (!record.nama) record.nama = record.namaLengkap;
      if (!record.jenisKelamin) record.jenisKelamin = record.gender;
      if (!record.gender) record.gender = record.jenisKelamin;
      if (!record.noHp) record.noHp = record.noWaUtama || record.noHpOrangTua;
      if (!record.noWaUtama) record.noWaUtama = record.noHp || record.noHpOrangTua;
      if (!record.noHpOrangTua) record.noHpOrangTua = record.noHp || record.noWaUtama;
      if (!record.kabupaten) record.kabupaten = record.kabupatenKota;
      if (!record.kabupatenKota) record.kabupatenKota = record.kabupaten;
      if (!record.jmlSaudara) record.jmlSaudara = record.saudara;
      if (!record.saudara) record.saudara = record.jmlSaudara;

      setFoundRecord(record);
      setRecordType('pendaftar');
      return;
    }

    // 3. Check if student exists in another academic year
    const anyYearStudent = studentsList.find((s: any) => 
      s && (
        (s.nisn && String(s.nisn).trim() === key) || 
        (s.nis && String(s.nis).trim() === key) ||
        (s.nik && String(s.nik).trim() === key)
      )
    );
    if (anyYearStudent) {
      const sYear = anyYearStudent.academicYear || (anyYearStudent.academicHistory?.[0]?.academicYear) || 'tahun lain';
      setErrorMsg(`Santri "${anyYearStudent.nama || key}" terdaftar pada Tahun Ajaran ${sYear}, sedangkan Tahun Ajaran aktif sistem saat ini adalah ${activeTahun}.`);
      return;
    }

    setErrorMsg('Data Santri tidak ditemukan. Pastikan NISN atau NIS yang dimasukkan sudah benar.');
  };

  useEffect(() => {
    if (initialSearchKey) {
      setSearchKey(initialSearchKey);
      performSearch(initialSearchKey);
    }
  }, [initialSearchKey]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchKey);
  };

  const handleInputChange = (field: string, value: any) => {
    if (!foundRecord) return;
    const updated = {
      ...foundRecord,
      [field]: value
    };
    // Sync fields between students and pendaftar
    if (field === 'nama') {
      updated.namaLengkap = value;
    } else if (field === 'namaLengkap') {
      updated.nama = value;
    }
    if (field === 'jenisKelamin') {
      updated.gender = value;
    } else if (field === 'gender') {
      updated.jenisKelamin = value;
    }
    if (field === 'noWaUtama') {
      updated.noHp = value;
      updated.noHpOrangTua = value;
    } else if (field === 'noHp') {
      updated.noWaUtama = value;
      updated.noHpOrangTua = value;
    } else if (field === 'noHpOrangTua') {
      updated.noWaUtama = value;
      updated.noHp = value;
    }
    if (field === 'kabupaten') {
      updated.kabupatenKota = value;
    } else if (field === 'kabupatenKota') {
      updated.kabupaten = value;
    }
    if (field === 'jmlSaudara') {
      updated.saudara = value;
    } else if (field === 'saudara') {
      updated.jmlSaudara = value;
    }
    setFoundRecord(updated);
  };

  const handleFileUpload = (field: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      handleInputChange(field, base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundRecord || !recordType) return;

    if (isEditingDisabled) {
      alert('Maaf, fitur edit data santri saat ini sedang dinonaktifkan oleh Administrator sekolah.');
      return;
    }

    if (recordType === 'students') {
      const rawStudents = localStorage.getItem('db_students');
      let studentsList = rawStudents ? JSON.parse(rawStudents) : [];
      studentsList = studentsList.map((s: any) => s.id === foundRecord.id ? foundRecord : s);
      localStorage.setItem('db_students', JSON.stringify(studentsList));
    } else {
      const rawPendaftar = localStorage.getItem('db_pendaftar');
      let pendaftarList = rawPendaftar ? JSON.parse(rawPendaftar) : [];
      pendaftarList = pendaftarList.map((p: any) => p.id === foundRecord.id ? foundRecord : p);
      localStorage.setItem('db_pendaftar', JSON.stringify(pendaftarList));
    }

    setIsSaved(true);
    alert('Data santri berhasil diperbarui dan disinkronkan ke pangkalan data sekolah!');
  };

  const filteredRombelList = useMemo(() => {
    if (!rombelSearch.trim()) return stats.rombelList;
    const q = rombelSearch.toLowerCase().trim();
    return stats.rombelList.filter(r => r.name.toLowerCase().includes(q));
  }, [stats.rombelList, rombelSearch]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-apple-fade">
      
      {/* Header Banner */}
      <div className="saas-card p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-emerald-50/20 border border-slate-200/80 shadow-sm rounded-[24px]">
        <div className="flex-1 space-y-3 text-center md:text-left relative z-10">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200 text-[11px] font-bold uppercase tracking-wider">
              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Portal Pangkalan Data Santri</span>
            </div>

            {/* BADGE TAHUN AJARAN AKTIF */}
            <div className="inline-flex items-center gap-2 bg-emerald-600 text-white px-3.5 py-1 rounded-full text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse"></span>
              <span>Tahun Ajaran Aktif: <strong className="font-extrabold text-emerald-100">{activeTahunAjaran}</strong></span>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Pangkalan Data & Verifikasi Santri</h2>
          <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-2xl">
            Statistik santri dan asatidz AL IHSAN WAT TAQWA pada Tahun Ajaran <strong className="text-slate-800 font-bold">{activeTahunAjaran}</strong>. Masukkan NISN atau NIS untuk melacak identitas, berkas administrasi, dan riwayat akademik.
          </p>
        </div>

        {/* Static Tahun Ajaran Display (Sesuai Pengaturan Sistem) */}
        <div className="flex items-center gap-3.5 shrink-0 relative z-10 bg-white/95 px-4 py-3 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="text-left">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Tahun Ajaran Aktif
            </div>
            <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <span>{activeTahunAjaran}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Pengaturan
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KARTU RINGKASAN DATA SANTRI & ASATIDZ (LANDING PAGE) */}
      {!foundRecord && (
        <div className="space-y-6">
          {/* Top 3 Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. KARTU SANTRI AKTIF */}
            <div className="bg-white border border-emerald-100 rounded-[22px] p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-bold uppercase tracking-wider">
                    <GraduationCap className="h-3.5 w-3.5 text-emerald-600" />
                    Santri Aktif
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    TA {activeTahunAjaran}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="text-4xl font-extrabold text-slate-900 tracking-tight">
                    {stats.totalSantriAktif.toLocaleString('id-ID')}
                    <span className="text-base font-semibold text-slate-400 ml-1.5 font-normal">Santri</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Total santri terdaftar dan aktif pada TA {activeTahunAjaran}
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  Status Terverifikasi
                </span>
                <span className="font-semibold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-200/60 text-[10px]">
                  Tahun Ajaran: {activeTahunAjaran}
                </span>
              </div>
            </div>

            {/* 2. KARTU USTADZ AKTIF */}
            <div className="bg-white border border-indigo-100 rounded-[22px] p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200/80 text-[11px] font-bold uppercase tracking-wider">
                    <School className="h-3.5 w-3.5 text-indigo-600" />
                    Ustadz Aktif
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    Tenaga Pendidik
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="text-4xl font-extrabold text-slate-900 tracking-tight">
                    {stats.totalUstadzAktif.toLocaleString('id-ID')}
                    <span className="text-base font-semibold text-slate-400 ml-1.5 font-normal">Asatidz</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Dewan guru pengampu kurikulum & tahfidz
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                  KMI / TMI & Tahfidz
                </span>
                <span className="font-semibold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-200/60 text-[10px]">
                  Pembimbing Resmi
                </span>
              </div>
            </div>

            {/* 3. KARTU SANTRI LAKI-LAKI DAN PEREMPUAN */}
            <div className="bg-white border border-slate-200/90 rounded-[22px] p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                    <Users className="h-3.5 w-3.5 text-slate-600" />
                    Rasio Gender Santri
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    TA {activeTahunAjaran}
                  </span>
                </div>
                
                {/* Visual Two-Tone Gender Progress Bar */}
                <div className="space-y-2 mb-4">
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                    <div 
                      className="h-full bg-sky-500 transition-all duration-500" 
                      style={{ width: `${stats.pctLaki}%` }}
                      title={`Laki-laki: ${stats.countLaki} (${stats.pctLaki}%)`}
                    ></div>
                    <div 
                      className="h-full bg-rose-500 transition-all duration-500" 
                      style={{ width: `${stats.pctPerempuan}%` }}
                      title={`Perempuan: ${stats.countPerempuan} (${stats.pctPerempuan}%)`}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span className="text-sky-600">Laki-laki {stats.pctLaki}%</span>
                    <span className="text-rose-600">Perempuan {stats.pctPerempuan}%</span>
                  </div>
                </div>

                {/* Sub-Blocks: Laki-laki vs Perempuan */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-sky-50/80 border border-sky-200/80 rounded-xl p-3 flex flex-col justify-between">
                    <div className="text-[10px] font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1">
                      <span>Santri Laki-laki</span>
                    </div>
                    <div className="text-xl font-bold text-sky-950 mt-1">
                      {stats.countLaki.toLocaleString('id-ID')}
                      <span className="text-[10px] font-semibold text-sky-700 ml-1">santri</span>
                    </div>
                  </div>

                  <div className="bg-rose-50/80 border border-rose-200/80 rounded-xl p-3 flex flex-col justify-between">
                    <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                      <span>Santri Perempuan</span>
                    </div>
                    <div className="text-xl font-bold text-rose-950 mt-1">
                      {stats.countPerempuan.toLocaleString('id-ID')}
                      <span className="text-[10px] font-semibold text-rose-700 ml-1">santri</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Sebaran Gender Santri</span>
                <span className="font-semibold text-slate-800">
                  TA {activeTahunAjaran}
                </span>
              </div>
            </div>
          </div>

          {/* 4. KARTU JUMLAH SANTRI PER ROMBEL */}
          <div className="bg-white border border-slate-200/90 rounded-[24px] p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-[11px] font-bold uppercase tracking-wider">
                    <Layers className="h-3.5 w-3.5 text-amber-600" />
                    Distribusi Kelas
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    • {stats.totalRombel} Rombel Aktif (TA {activeTahunAjaran})
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  Jumlah Santri per Rombel (Tahun Ajaran {activeTahunAjaran})
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Rincian jumlah santri aktif per rombongan belajar pada Tahun Ajaran {activeTahunAjaran}. Rombel kosong tidak ditampilkan.
                </p>
              </div>

              {/* Search Toolbar for Rombel */}
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type="text"
                  value={rombelSearch}
                  onChange={(e) => setRombelSearch(e.target.value)}
                  placeholder="Cari rombel/kelas..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                />
              </div>
            </div>

            {/* Grid Cards of Rombels: 8 cards per row, compact size, light green background */}
            {filteredRombelList.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <Layers className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-500">
                  Tidak ada rombel yang memiliki santri di Tahun Ajaran {activeTahunAjaran}
                  {rombelSearch ? ` yang cocok dengan pencarian "${rombelSearch}"` : ''}.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                {filteredRombelList.map((rombel, idx) => {
                  const isSelected = selectedRombelFilter === rombel.name;
                  const cleanRombelName = String(rombel.name || '').trim().toUpperCase();
                  const isEndingWithB = cleanRombelName.endsWith('B') || cleanRombelName.endsWith('(B)');

                  return (
                    <div 
                      key={rombel.name || idx}
                      onClick={() => setSelectedRombelFilter(isSelected ? null : rombel.name)}
                      title={`${rombel.name}: ${rombel.total} Santri ${isEndingWithB ? '(Kelas B)' : ''} - Klik untuk rincian`}
                      className={`group border rounded-xl p-2.5 text-center transition-all cursor-pointer relative overflow-hidden flex flex-col items-center justify-center min-h-[68px] ${
                        isEndingWithB
                          ? (isSelected 
                              ? 'border-yellow-500 bg-yellow-100 ring-2 ring-yellow-300 shadow-sm' 
                              : 'border-yellow-200/90 bg-yellow-50 hover:bg-yellow-100/80 hover:border-yellow-300 hover:shadow-xs')
                          : (isSelected 
                              ? 'border-emerald-500 bg-emerald-100 ring-2 ring-emerald-300 shadow-sm' 
                              : 'border-emerald-200/90 bg-emerald-50 hover:bg-emerald-100/80 hover:border-emerald-300 hover:shadow-xs')
                      }`}
                    >
                      <span className={`text-[11px] font-bold uppercase tracking-tight truncate w-full ${
                        isEndingWithB ? 'text-yellow-950' : 'text-slate-800'
                      }`} title={rombel.name}>
                        {rombel.name}
                      </span>
                      <div className="mt-1 flex items-baseline justify-center gap-1">
                        <span className={`text-base font-extrabold leading-none ${
                          isEndingWithB ? 'text-yellow-800' : 'text-emerald-800'
                        }`}>
                          {rombel.total}
                        </span>
                        <span className={`text-[10px] font-semibold leading-none ${
                          isEndingWithB ? 'text-yellow-600' : 'text-emerald-600'
                        }`}>
                          Santri
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Drilldown Table if a Rombel is clicked */}
            {selectedRombelFilter && (() => {
              const cleanSelected = String(selectedRombelFilter).trim().toUpperCase();
              const isSelectedB = cleanSelected.endsWith('B') || cleanSelected.endsWith('(B)');

              return (
                <div className={`border rounded-2xl p-4 sm:p-5 space-y-3 animate-apple-fade ${
                  isSelectedB 
                    ? 'bg-yellow-50/70 border-yellow-200' 
                    : 'bg-emerald-50/50 border-emerald-200'
                }`}>
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 ${
                    isSelectedB ? 'border-yellow-200/80' : 'border-emerald-200/70'
                  }`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`w-2.5 h-2.5 rounded-full ${isSelectedB ? 'bg-yellow-500' : 'bg-emerald-600'}`}></span>
                      <h4 className="text-sm font-bold text-slate-900">
                        Daftar Santri Kelas: <span className={`font-extrabold ${isSelectedB ? 'text-yellow-950' : 'text-emerald-800'}`}>{selectedRombelFilter}</span>
                      </h4>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        isSelectedB
                          ? 'text-yellow-900 bg-yellow-100/90 border-yellow-300/80'
                          : 'text-emerald-800 bg-emerald-100/90 border-emerald-200'
                      }`}>
                        {studentsInSelectedRombel.length} Santri • TA {activeTahunAjaran}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedRombelFilter(null)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer w-fit"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Tutup Rincian Kelas</span>
                    </button>
                  </div>

                  <div className={`overflow-x-auto max-h-72 overflow-y-auto rounded-xl border bg-white shadow-xs ${
                    isSelectedB ? 'border-yellow-200/80' : 'border-emerald-200/80'
                  }`}>
                    <table className="w-full text-left text-xs">
                      <thead className={`font-bold sticky top-0 border-b ${
                        isSelectedB
                          ? 'bg-yellow-50 text-yellow-950 border-yellow-200'
                          : 'bg-emerald-50 text-emerald-900 border-emerald-100'
                      }`}>
                        <tr>
                          <th className="px-3 py-2 w-12 text-center">No</th>
                          <th className="px-3 py-2">Nama Santri</th>
                          <th className="px-3 py-2">NISN</th>
                          <th className="px-3 py-2">NIS</th>
                          <th className="px-3 py-2">Jenis Kelamin</th>
                          <th className="px-3 py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {studentsInSelectedRombel.map((s, idx) => (
                          <tr key={s.id || idx} className={isSelectedB ? 'hover:bg-yellow-50/50 transition-colors' : 'hover:bg-emerald-50/40 transition-colors'}>
                            <td className="px-3 py-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="px-3 py-2 font-bold text-slate-900">{s.nama || s.namaLengkap || '-'}</td>
                            <td className="px-3 py-2 font-mono text-slate-600">{s.nisn || '-'}</td>
                            <td className="px-3 py-2 font-mono text-slate-600">{s.nis || '-'}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                (String(s.gender || s.jenisKelamin || '').toLowerCase().startsWith('l'))
                                  ? 'bg-sky-50 text-sky-700 border border-sky-200/60'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                              }`}>
                                {s.gender || s.jenisKelamin || 'LAKI-LAKI'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Aktif
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Bottom Metric Footer */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-[18px] p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Total Santri: <strong className="text-slate-900">{stats.totalSantriAktif}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                  Total Laki-laki: <strong className="text-sky-900">{stats.countLaki}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  Total Perempuan: <strong className="text-rose-900">{stats.countPerempuan}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3 text-slate-500 text-[11px] flex-wrap">
                <span>
                  Rata-rata: <strong className="text-slate-800 font-bold">{Math.round(stats.totalSantriAktif / Math.max(1, stats.totalRombel))}</strong> santri / rombel aktif
                </span>
                <span className="text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-md font-bold text-[10px] border border-emerald-200/60">
                  Tahun Ajaran: {activeTahunAjaran}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditingDisabled && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-6 rounded-[24px] flex items-start gap-4 shadow-sm">
          <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
          <div className="space-y-1">
            <span className="block font-bold uppercase text-[10px] tracking-widest text-amber-700">Akses Dibatasi</span>
            <p className="text-sm font-medium">Pengeditan data mandiri saat ini dinonaktifkan oleh administrator. Anda hanya dapat melihat data saat ini.</p>
          </div>
        </div>
      )}

      {/* SEARCH PANEL */}
      {showSearchForm && !foundRecord && (
        <div className="saas-card p-8 sm:p-10 space-y-6 bg-white border border-slate-200/90 rounded-[24px] shadow-sm">
          <div className="space-y-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider">
              <Search className="h-4 w-4" />
              <span>Pencarian Mandiri Santri</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">Cari & Periksa Data Santri</h3>
            <p className="text-sm text-gray-500 font-medium">Masukkan Nomor Induk Siswa Nasional (NISN) atau Nomor Induk Santri (NIS) untuk melacak data.</p>
          </div>
          
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input 
                type="text" 
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                placeholder="Masukkan NISN atau NIS (contoh: 104384992 atau 3325)"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-[18px] text-sm focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition-all font-bold tracking-tight uppercase"
              />
            </div>
            <button 
              type="submit"
              className="px-8 py-3.5 bg-emerald-600 text-white font-bold text-sm rounded-[18px] hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              <Search className="h-4 w-4" />
              <span>Cari Data</span>
            </button>
          </form>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-[18px] text-xs font-bold flex items-center gap-3 animate-apple-fade">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      )}

      {!showSearchForm && !foundRecord && errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs font-semibold flex items-center space-x-2.5 shadow-sm text-left animate-fadeIn">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* EDITING FORM PANEL */}
      {foundRecord && (
        <div className="bg-white border border-gray-100 rounded-[32px] shadow-2xl shadow-gray-200/50 overflow-hidden animate-apple-fade flex flex-col max-h-[calc(100vh-160px)]">
          
          {/* Form Header info */}
          <div className="bg-gray-50/50 backdrop-blur-md border-b border-gray-100 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shrink-0">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-600/20">
                {(foundRecord.nama || foundRecord.namaLengkap) ? (foundRecord.nama || foundRecord.namaLengkap).charAt(0).toUpperCase() : 'S'}
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-gray-900 leading-tight">{foundRecord.nama || foundRecord.namaLengkap || 'Santri'}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">NISN: {foundRecord.nisn || '-'}</span>
                  <div className="h-1 w-1 rounded-full bg-gray-300"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-100">
                    {recordType === 'students' ? 'Santri Aktif' : 'Calon Santri'}
                  </span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                if (onBackToSearch) {
                  onBackToSearch();
                } else {
                  setFoundRecord(null);
                  setRecordType(null);
                  setIsSaved(false);
                }
              }}
              className="px-5 py-2.5 bg-white border border-gray-100 hover:bg-gray-50 text-gray-600 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-sm flex items-center gap-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kembali Ke Pencarian</span>
            </button>
          </div>

          {/* Tab Switcher - Apple Segmented Control Style */}
          <div className="px-6 py-4 border-b border-gray-100 bg-white shrink-0">
            <div className="bg-gray-100 p-1 rounded-[16px] flex gap-1">
              <button
                onClick={() => setActiveFormTab('identitas')}
                className={`flex-1 py-2.5 px-4 text-center text-[10px] font-bold uppercase tracking-widest rounded-[12px] transition-all ${
                  activeFormTab === 'identitas'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Profil Santri
              </button>
              <button
                onClick={() => setActiveFormTab('orangtua')}
                className={`flex-1 py-2.5 px-4 text-center text-[10px] font-bold uppercase tracking-widest rounded-[12px] transition-all ${
                  activeFormTab === 'orangtua'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Orang Tua / Wali
              </button>
              <button
                onClick={() => setActiveFormTab('berkas')}
                className={`flex-1 py-2.5 px-4 text-center text-[10px] font-bold uppercase tracking-widest rounded-[12px] transition-all ${
                  activeFormTab === 'berkas'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Berkas &amp; Dokumen
              </button>
            </div>
          </div>

          {/* Form container */}
          <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">

            {/* Scrollable form fields body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              {/* TAB I: IDENTITAS SISWA */}
              {activeFormTab === 'identitas' && (
                <div className="space-y-10 animate-apple-fade">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-1">Nama Lengkap *</label>
                      <input 
                        type="text"
                        required
                        disabled={isEditingDisabled}
                        value={foundRecord.nama || foundRecord.namaLengkap || ''}
                        onChange={(e) => {
                          handleInputChange('nama', e.target.value);
                          handleInputChange('namaLengkap', e.target.value);
                        }}
                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-[16px] text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-1">Nomor Induk Kependudukan (NIK)</label>
                      <input 
                        type="text"
                        disabled={isEditingDisabled}
                        value={foundRecord.nik || ''}
                        onChange={(e) => handleInputChange('nik', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-[16px] font-mono text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-1">Nomor NISN *</label>
                      <input 
                        type="text"
                        required
                        disabled={isEditingDisabled}
                        value={foundRecord.nisn || ''}
                        onChange={(e) => handleInputChange('nisn', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-[16px] font-mono text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-1">Nomor NIS (Lokal)</label>
                      <input 
                        type="text"
                        disabled={isEditingDisabled}
                        value={foundRecord.nis || ''}
                        onChange={(e) => handleInputChange('nis', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-[16px] font-mono text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-1">Jenis Kelamin</label>
                      <select
                        disabled={isEditingDisabled}
                        value={foundRecord.gender || foundRecord.jenisKelamin || 'Laki-laki'}
                        onChange={(e) => {
                          handleInputChange('gender', e.target.value);
                          handleInputChange('jenisKelamin', e.target.value);
                        }}
                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-[16px] text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50 appearance-none"
                      >
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-1">Tempat Lahir</label>
                      <input 
                        type="text"
                        disabled={isEditingDisabled}
                        value={foundRecord.tempatLahir || ''}
                        onChange={(e) => handleInputChange('tempatLahir', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-[16px] text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-1">Tanggal Lahir</label>
                      <input 
                        type="date"
                        disabled={isEditingDisabled}
                        value={foundRecord.tanggalLahir || ''}
                        onChange={(e) => handleInputChange('tanggalLahir', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-[16px] font-mono text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-1">Nomor Kartu Keluarga (KK)</label>
                      <input 
                        type="text"
                        disabled={isEditingDisabled}
                        value={foundRecord.noKK || ''}
                        onChange={(e) => handleInputChange('noKK', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-[16px] font-mono text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-1">Sekolah Asal</label>
                      <input 
                        type="text"
                        disabled={isEditingDisabled}
                        value={foundRecord.sekolahAsal || ''}
                        onChange={(e) => handleInputChange('sekolahAsal', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-[16px] text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-1">No. WhatsApp / HP *</label>
                      <input 
                        type="text"
                        required
                        disabled={isEditingDisabled}
                        value={foundRecord.noHp || foundRecord.noWaUtama || ''}
                        onChange={(e) => {
                          handleInputChange('noHp', e.target.value);
                          handleInputChange('noWaUtama', e.target.value);
                        }}
                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-[16px] font-mono text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="pt-10 border-t border-gray-100 space-y-6">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Alamat Tempat Tinggal</h5>
                      <Globe className="h-4 w-4 text-gray-300" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[9px] text-gray-400 font-bold uppercase tracking-widest ml-1">Provinsi *</label>
                        <select
                          disabled={isEditingDisabled || loadingProvinces}
                          value={provinces.find(p => toTitleCase(p.name) === foundRecord.provinsi)?.id || ''}
                          onChange={(e) => handleProvinsiChange(e.target.value)}
                          className="w-full px-3 py-2.5 bg-gray-50 border border-transparent rounded-[12px] text-xs font-bold text-gray-900 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50 appearance-none"
                        >
                          <option value="">{loadingProvinces ? 'Memuat...' : '-- Pilih --'}</option>
                          {provinces.map(p => (
                            <option key={p.id} value={p.id}>{toTitleCase(p.name)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[9px] text-gray-400 font-bold uppercase tracking-widest ml-1">Kabupaten/Kota *</label>
                        <select
                          disabled={isEditingDisabled || !regencies.length || loadingRegencies}
                          value={regencies.find(r => toTitleCase(r.name) === foundRecord.kabupaten)?.id || ''}
                          onChange={(e) => handleKabupatenChange(e.target.value)}
                          className="w-full px-3 py-2.5 bg-gray-50 border border-transparent rounded-[12px] text-xs font-bold text-gray-900 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50 appearance-none"
                        >
                          <option value="">{loadingRegencies ? 'Memuat...' : '-- Pilih --'}</option>
                          {regencies.map(r => (
                            <option key={r.id} value={r.id}>{toTitleCase(r.name)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[9px] text-gray-400 font-bold uppercase tracking-widest ml-1">Kecamatan *</label>
                        <select
                          disabled={isEditingDisabled || !districts.length || loadingDistricts}
                          value={districts.find(d => toTitleCase(d.name) === foundRecord.kecamatan)?.id || ''}
                          onChange={(e) => handleKecamatanChange(e.target.value)}
                          className="w-full px-3 py-2.5 bg-gray-50 border border-transparent rounded-[12px] text-xs font-bold text-gray-900 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50 appearance-none"
                        >
                          <option value="">{loadingDistricts ? 'Memuat...' : '-- Pilih --'}</option>
                          {districts.map(d => (
                            <option key={d.id} value={d.id}>{toTitleCase(d.name)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[9px] text-gray-400 font-bold uppercase tracking-widest ml-1">Kelurahan / Desa *</label>
                        <select
                          disabled={isEditingDisabled || !villages.length || loadingVillages}
                          value={villages.find(v => toTitleCase(v.name) === foundRecord.kelurahan)?.id || ''}
                          onChange={(e) => handleKelurahanChange(e.target.value)}
                          className="w-full px-3 py-2.5 bg-gray-50 border border-transparent rounded-[12px] text-xs font-bold text-gray-900 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50 appearance-none"
                        >
                          <option value="">{loadingVillages ? 'Memuat...' : '-- Pilih --'}</option>
                          {villages.map(v => (
                            <option key={v.id} value={v.id}>{toTitleCase(v.name)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[9px] text-gray-400 font-bold uppercase tracking-widest ml-1">Alamat Lengkap / RT RW / Dusun</label>
                      <input 
                        type="text"
                        disabled={isEditingDisabled}
                        value={foundRecord.dusun || ''}
                        onChange={(e) => handleInputChange('dusun', e.target.value)}
                        placeholder="contoh: RT 03 RW 04, Jl. Pesantren No. 12"
                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-[16px] text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB II: DATA ORANG TUA */}
            {activeFormTab === 'orangtua' && (
              <div className="space-y-10 animate-apple-fade">
                {/* Data Ibu */}
                <div className="bg-gray-50 p-8 rounded-[24px] border border-gray-100 space-y-6">
                  <div className="flex items-center gap-2 text-blue-600">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Informasi Ibu Kandung</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-1">Nama Ibu</label>
                      <input 
                        type="text"
                        disabled={isEditingDisabled}
                        value={foundRecord.namaIbu || ''}
                        onChange={(e) => handleInputChange('namaIbu', e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-transparent rounded-[16px] text-sm font-bold text-gray-900 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50 shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-1">Status Keberadaan</label>
                      <select
                        disabled={isEditingDisabled}
                        value={foundRecord.statusIbu || 'Hidup'}
                        onChange={(e) => handleInputChange('statusIbu', e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-transparent rounded-[16px] text-sm font-bold text-gray-900 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50 appearance-none shadow-sm"
                      >
                        <option value="Hidup">Masih Hidup</option>
                        <option value="Wafat">Meninggal Dunia</option>
                        <option value="Cerai">Bercerai</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-1">Nomor HP / WA</label>
                      <input 
                        type="text"
                        disabled={isEditingDisabled}
                        value={foundRecord.hpIbu || ''}
                        onChange={(e) => handleInputChange('hpIbu', e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-transparent rounded-[16px] font-mono text-sm font-bold text-gray-900 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50 shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-1">NIK Ibu</label>
                      <input 
                        type="text"
                        disabled={isEditingDisabled}
                        value={foundRecord.nikIbu || ''}
                        onChange={(e) => handleInputChange('nikIbu', e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-transparent rounded-[16px] font-mono text-sm font-bold text-gray-900 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Data Ayah */}
                <div className="bg-gray-50 p-8 rounded-[24px] border border-gray-100 space-y-6">
                  <div className="flex items-center gap-2 text-blue-600">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Informasi Ayah Kandung</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-1">Nama Ayah</label>
                      <input 
                        type="text"
                        disabled={isEditingDisabled}
                        value={foundRecord.namaAyah || ''}
                        onChange={(e) => handleInputChange('namaAyah', e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-transparent rounded-[16px] text-sm font-bold text-gray-900 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50 shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-1">Status Keberadaan</label>
                      <select
                        disabled={isEditingDisabled}
                        value={foundRecord.statusAyah || 'Hidup'}
                        onChange={(e) => handleInputChange('statusAyah', e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-transparent rounded-[16px] text-sm font-bold text-gray-900 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50 appearance-none shadow-sm"
                      >
                        <option value="Hidup">Masih Hidup</option>
                        <option value="Wafat">Meninggal Dunia</option>
                        <option value="Cerai">Bercerai</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-1">Nomor HP / WA</label>
                      <input 
                        type="text"
                        disabled={isEditingDisabled}
                        value={foundRecord.hpAyah || ''}
                        onChange={(e) => handleInputChange('hpAyah', e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-transparent rounded-[16px] font-mono text-sm font-bold text-gray-900 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50 shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-1">NIK Ayah</label>
                      <input 
                        type="text"
                        disabled={isEditingDisabled}
                        value={foundRecord.nikAyah || ''}
                        onChange={(e) => handleInputChange('nikAyah', e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-transparent rounded-[16px] font-mono text-sm font-bold text-gray-900 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Informasi Tambahan */}
                <div className="bg-gray-50 p-8 rounded-[24px] border border-gray-100 space-y-6">
                  <div className="flex items-center gap-2 text-blue-600">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Informasi Tambahan</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-1">Capaian Hafalan Al-Qur'an</label>
                      <input 
                        type="text"
                        disabled={isEditingDisabled}
                        value={foundRecord.jumlahHafalan || ''}
                        onChange={(e) => handleInputChange('jumlahHafalan', e.target.value)}
                        placeholder="contoh: 2 Juz"
                        className="w-full px-4 py-3 bg-white border border-transparent rounded-[16px] text-sm font-bold text-gray-900 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50 shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-1">Jumlah Saudara</label>
                      <input 
                        type="number"
                        disabled={isEditingDisabled}
                        value={foundRecord.jmlSaudara || foundRecord.saudara || '1'}
                        onChange={(e) => {
                          handleInputChange('jmlSaudara', e.target.value);
                          handleInputChange('saudara', e.target.value);
                        }}
                        className="w-full px-4 py-3 bg-white border border-transparent rounded-[16px] font-mono text-sm font-bold text-gray-900 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50 shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-1">Prestasi Akademik</label>
                      <input 
                        type="text"
                        disabled={isEditingDisabled}
                        value={foundRecord.prestasiAkademik || ''}
                        onChange={(e) => handleInputChange('prestasiAkademik', e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-transparent rounded-[16px] text-sm font-bold text-gray-900 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50 shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-widest ml-1">Prestasi Non-Akademik</label>
                      <input 
                        type="text"
                        disabled={isEditingDisabled}
                        value={foundRecord.prestasiNonAkademik || ''}
                        onChange={(e) => handleInputChange('prestasiNonAkademik', e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-transparent rounded-[16px] text-sm font-bold text-gray-900 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all disabled:opacity-50 shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB III: BERKAS & DOKUMEN */}
            {activeFormTab === 'berkas' && (
              <div className="space-y-10 animate-apple-fade">
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-[20px] text-xs font-bold text-blue-800 leading-relaxed">
                  Silakan unggah foto / hasil pemindaian berkas dengan jelas. Mendukung format JPEG dan PNG.
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                  
                  {/* Pas Foto */}
                  <div className="bg-gray-50 p-6 rounded-[24px] border border-transparent hover:border-gray-200 transition-all flex flex-col items-center gap-6 group">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pas Foto Santri</span>
                    
                    <div className="relative">
                      {foundRecord.foto ? (
                        <div className="h-40 w-32 rounded-[20px] overflow-hidden shadow-xl ring-4 ring-white relative group">
                          <img 
                            src={foundRecord.foto} 
                            alt="Preview" 
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Upload className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="h-40 w-32 bg-white border-2 border-dashed border-gray-200 rounded-[20px] flex items-center justify-center text-gray-300">
                          <Upload className="h-8 w-8" />
                        </div>
                      )}
                    </div>

                    <label className="w-full bg-white hover:bg-gray-50 border border-gray-100 text-gray-900 text-[10px] font-bold uppercase tracking-widest py-3 rounded-xl text-center cursor-pointer transition-all shadow-sm active:scale-95">
                      <span>{foundRecord.foto ? 'Ganti Foto' : 'Pilih Foto'}</span>
                      <input 
                        type="file"
                        disabled={isEditingDisabled}
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload('foto', e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Family Card */}
                  <div className="bg-gray-50 p-6 rounded-[24px] border border-transparent hover:border-gray-200 transition-all flex flex-col items-center gap-6 group">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kartu Keluarga (KK)</span>
                    
                    <div className="relative">
                      {foundRecord.berkasKK || foundRecord.kkFile ? (
                        <div className="h-40 w-56 rounded-[20px] overflow-hidden shadow-xl ring-4 ring-white relative group">
                          <img 
                            src={foundRecord.berkasKK || foundRecord.kkFile} 
                            alt="Preview" 
                            className="h-full w-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Upload className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="h-40 w-56 bg-white border-2 border-dashed border-gray-200 rounded-[20px] flex items-center justify-center text-gray-300">
                          <Upload className="h-8 w-8" />
                        </div>
                      )}
                    </div>

                    <label className="w-full bg-white hover:bg-gray-50 border border-gray-100 text-gray-900 text-[10px] font-bold uppercase tracking-widest py-3 rounded-xl text-center cursor-pointer transition-all shadow-sm active:scale-95">
                      <span>{foundRecord.berkasKK || foundRecord.kkFile ? 'Ganti Berkas' : 'Unggah Berkas'}</span>
                      <input 
                        type="file"
                        disabled={isEditingDisabled}
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileUpload('berkasKK', e.target.files[0]);
                            handleFileUpload('kkFile', e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Diploma / SKL */}
                  <div className="bg-gray-50 p-6 rounded-[24px] border border-transparent hover:border-gray-200 transition-all flex flex-col items-center gap-6 group">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ijazah / SKL</span>
                    
                    <div className="relative">
                      {foundRecord.berkasIjazah || foundRecord.ijazahFile ? (
                        <div className="h-40 w-56 rounded-[20px] overflow-hidden shadow-xl ring-4 ring-white relative group">
                          <img 
                            src={foundRecord.berkasIjazah || foundRecord.ijazahFile} 
                            alt="Preview" 
                            className="h-full w-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Upload className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="h-40 w-56 bg-white border-2 border-dashed border-gray-200 rounded-[20px] flex items-center justify-center text-gray-300">
                          <Upload className="h-8 w-8" />
                        </div>
                      )}
                    </div>

                    <label className="w-full bg-white hover:bg-gray-50 border border-gray-100 text-gray-900 text-[10px] font-bold uppercase tracking-widest py-3 rounded-xl text-center cursor-pointer transition-all shadow-sm active:scale-95">
                      <span>{foundRecord.berkasIjazah || foundRecord.ijazahFile ? 'Ganti Berkas' : 'Unggah Berkas'}</span>
                      <input 
                        type="file"
                        disabled={isEditingDisabled}
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleFileUpload('berkasIjazah', e.target.files[0]);
                            handleFileUpload('ijazahFile', e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            </div>

            {/* Submit Action footer */}
            <div className="shrink-0 p-6 border-t border-gray-100 bg-gray-50/50 backdrop-blur-md flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`h-2.5 w-2.5 rounded-full ${isSaved ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`}></div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  {isSaved ? 'Semua perubahan tersimpan' : 'Ada perubahan belum disimpan'}
                </span>
              </div>
              <button 
                type="submit"
                disabled={isEditingDisabled}
                className="px-10 py-4 bg-blue-600 text-white font-bold text-sm rounded-[20px] hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
              >
                <Save className="h-4 w-4" />
                <span>Simpan Perubahan</span>
              </button>
            </div>

          </form>

        </div>
      )}

    </div>
  );
}
