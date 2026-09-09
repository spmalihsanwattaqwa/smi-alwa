import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Navbar from './components/Navbar';
import FormulirOnline from './components/FormulirOnline';
import CekKelulusan from './components/CekKelulusan';
import AdminPanel from './components/AdminPanel';
import GuruPanel from './components/GuruPanel';
import CekDataSantri from './components/CekDataSantri';
import { Pendaftar, PengaturanSistem, StatusPendaftaran } from './types';
import { INITIAL_PENDAFTAR, DEFAULT_SISTEM_CONFIG } from './data';
import { INITIAL_STUDENTS } from './initialStudents';
import { sanitizeMutatedStudents, parseSafeAcademicHistory, sanitizeUstadzList } from './utils_rbac';
import { School, ShieldAlert, CheckCircle, CheckCircle2, ArrowRight, BookOpen, Lock, RefreshCw, Loader2 } from 'lucide-react';
import { VerificationPage } from './components/CardGenerator/VerificationPage';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { initAuth } from './lib/firebase';
import ThemeSwitcher, { UITheme } from './components/ThemeSwitcher';

const STANDARD_AL_IHSAN_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxRwSRDJfp9V7w-B1ggihfImbg3oKLAO2_oIbRVLOS8-c5_h1UYU5pYczNT-bQwkpuI/exec';

export default function App() {
  const [currentTheme, setCurrentTheme] = useState<UITheme>(() => {
    return (localStorage.getItem('app_ui_theme') as UITheme) || 'emerald';
  });
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Detect Public PSB Mode (e.g. ?mode=psb, ?mode=daftar, ?psb=1, ?public=1, /psb, /pendaftaran, /daftar)
  const isPublicPsbMode = (() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const modeParam = (params.get('mode') || params.get('view') || params.get('page') || '').toLowerCase();
    const isPsbParam = params.get('psb') === '1' || params.get('psb') === 'true' || params.get('public') === '1' || params.get('public') === 'true';
    const pathname = (window.location.pathname || '').toLowerCase();
    return (
      modeParam === 'psb' ||
      modeParam === 'daftar' ||
      modeParam === 'pendaftaran' ||
      modeParam === 'ppdb' ||
      isPsbParam ||
      pathname === '/psb' ||
      pathname === '/pendaftaran' ||
      pathname === '/daftar' ||
      pathname === '/ppdb'
    );
  })();

  useEffect(() => {
    document.body.className = `theme-${currentTheme}`;
  }, [currentTheme]);

  const handleThemeChange = (newTheme: UITheme) => {
    setCurrentTheme(newTheme);
    localStorage.setItem('app_ui_theme', newTheme);
  };

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (window.location.pathname === '/verifikasi') return 'verifikasi';
    return 'daftar'; // Otomatis selalu ke landing page saat pertama kali membuka aplikasi
  });
  
  const [showPortalPassInput, setShowPortalPassInput] = useState(false);
  const [portalPassword, setPortalPassword] = useState('');
  const [portalError, setPortalError] = useState(false);
  const [isVerifyingPass, setIsVerifyingPass] = useState(false);
  const [verificationSuccessInfo, setVerificationSuccessInfo] = useState<{
    success: boolean;
    layerName: string;
    label: string;
  } | null>(null);

  useEffect(() => {
    const handleGlobalNav = (e: any) => {
      if (e.detail) {
        handleNavigate(e.detail);
      }
    };
    window.addEventListener('app-navigate', handleGlobalNav);
    return () => window.removeEventListener('app-navigate', handleGlobalNav);
  }, []);

  const handleNavigate = (tab: string) => {
    if (isPublicPsbMode) {
      if (tab === 'daftar' || tab === 'cek-kelulusan' || tab === 'cek-data-santri') {
        setActiveTab(tab);
      }
      return;
    }

    if (tab === 'admin' || tab === 'sistem_pengaturan') {
      if (!userRole) {
        setShowPortalPassInput(true);
        return;
      }
    }
    
    if (tab === 'sistem_pengaturan') {
      setActiveTab('admin');
      setInitialAdminMenu('sistem_pengaturan');
      setInitialSettingsTab('rbac');
    } else {
      setActiveTab(tab);
      localStorage.setItem('last_active_tab', tab);
    }
  };

  const handlePortalAccess = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const inputPass = portalPassword.trim();
    if (!inputPass) {
      setPortalError(true);
      return;
    }

    setIsVerifyingPass(true);

    let verifiedLayer = 'Layer 1: Cache Lokal Sistem';

    const isMasterAdmin = inputPass.toLowerCase() === 'adminalwa' || inputPass === 'admin';

    // 1. Check current local config
    let accessConfigs = (config.portalAccessConfigs && config.portalAccessConfigs.length > 0)
      ? config.portalAccessConfigs
      : (DEFAULT_SISTEM_CONFIG.portalAccessConfigs || []);

    let match = accessConfigs.find(c => (c.password || '').trim() === inputPass);

    // Fallback master password 'adminalwa' atau 'admin'
    if (!match && isMasterAdmin) {
      match = {
        id: 'portal-superadmin',
        label: inputPass.toLowerCase() === 'adminalwa' ? 'Super Administrator (Alwa)' : 'Super Administrator',
        password: inputPass,
        menuPermissions: {
          dashboard_utama: 'write',
          master_siswa: 'write',
          master_kelas: 'write',
          master_pelajaran: 'write',
          master_ustadz: 'write',
          master_beasiswa: 'write',
          akademik_jadwal: 'write',
          akademik_kehadiran_siswa: 'write',
          akademik_barcode: 'write',
          akademik_kehadiran_guru: 'write',
          akademik_nilai: 'write',
          akademik_tahfidz: 'write',
          akademik_card_generator: 'write',
          laporan_akademik: 'write',
          _ppdb_eval: 'write',
          berkas_pendaftaran: 'write',
          _ppdb_berita: 'write',
          sistem_mutasi_alokasi: 'write',
          _ekspor_backup_sheets: 'write',
          sistem_pengaturan: 'write'
        }
      };
      verifiedLayer = inputPass.toLowerCase() === 'adminalwa' 
        ? 'Layer 0: Kredensial Master Administrator Alwa (adminalwa)' 
        : 'Layer 0: Master Otentikasi Administrator';
    }

    // 2. If not matched, query live Firestore system_config (in case changed on another device recently)
    if (!match) {
      try {
        const snap = await getDoc(doc(db, 'configs', 'system_config'));
        if (snap.exists()) {
          const remoteData = snap.data() as PengaturanSistem;
          if (Array.isArray(remoteData.portalAccessConfigs) && remoteData.portalAccessConfigs.length > 0) {
            accessConfigs = remoteData.portalAccessConfigs;
            match = accessConfigs.find(c => (c.password || '').trim() === inputPass);
            if (match) {
              verifiedLayer = 'Layer 2: Cloud Firestore Database';
            }
            setConfig(prev => ({ ...prev, ...remoteData }));
            localStorage.setItem('db_config', JSON.stringify({ ...config, ...remoteData }));
          }
        }
      } catch (err) {
        console.warn("Direct check to Firestore system_config notice:", err);
      }
    }

    // 3. If still not matched, query server-side API verification fallback (which also checks Google Spreadsheet live)
    if (!match) {
      try {
        const res = await fetch('/api/verify-portal-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: inputPass })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.match) {
            match = data.match;
            verifiedLayer = 'Layer 3: Google Spreadsheet (AKSES_PORTAL) & Server Live';
            if (data.config) {
              setConfig(prev => ({ ...prev, ...data.config }));
              localStorage.setItem('db_config', JSON.stringify({ ...config, ...data.config }));
              if (data.config.portalAccessConfigs) {
                localStorage.setItem('db_portal_access', JSON.stringify(data.config.portalAccessConfigs));
              }
            }
          }
        }
      } catch (err) {
        console.warn("Server portal verification notice:", err);
      }
    }

    // 4. If still not matched, trigger direct sync from spreadsheet as fallback
    if (!match && config.spreadsheetId) {
      try {
        await syncFromSheets(config.spreadsheetId);
        const currentSaved = localStorage.getItem('db_portal_access');
        if (currentSaved) {
          const parsed = JSON.parse(currentSaved);
          if (Array.isArray(parsed)) {
            match = parsed.find((c: any) => (c.password || '').trim() === inputPass);
            if (match) {
              verifiedLayer = 'Layer 4: Sinkronisasi Google Spreadsheet GViz';
            }
          }
        }
      } catch (e) {}
    }

    setIsVerifyingPass(false);

    if (match) {
      setPortalError(false);

      const isAlwa = inputPass.toLowerCase() === 'adminalwa' || match.id === 'portal-superadmin' || (match.password || '').toLowerCase() === 'adminalwa';
      if (isAlwa) {
        localStorage.setItem('session_is_adminalwa', 'true');
        localStorage.setItem('session_can_change_academic_year', 'true');
      } else {
        localStorage.removeItem('session_is_adminalwa');
        localStorage.removeItem('session_can_change_academic_year');
      }
      localStorage.setItem('session_entered_password', inputPass);

      setVerificationSuccessInfo({
        success: true,
        layerName: isAlwa ? 'Layer Master: Kredensial Administrator Alwa' : verifiedLayer,
        label: isAlwa ? 'Super Administrator (Alwa)' : (match.label || 'Akses Portal')
      });

      // Simpan rincian verifikasi ke localStorage
      localStorage.setItem('session_verified_layer', isAlwa ? 'Kredensial Master (adminalwa)' : verifiedLayer);
      localStorage.setItem('session_verified_time', new Date().toLocaleTimeString('id-ID'));

      // Menggunakan identifier role: jika superadmin / adminalwa langsung role 'superadmin'
      const portalRole = (match.id === 'portal-superadmin' || isAlwa) ? 'superadmin' : `portal_custom_${match.id}`;
      setUserRole(portalRole as any);
      setGuruActiveName(match.label || 'Administrator');
      
      localStorage.setItem('session_user_role', portalRole);
      localStorage.setItem('session_guru_name', match.label || 'Administrator');
      localStorage.setItem(`rbac_config_${portalRole}`, JSON.stringify({
        landingPage: {
          'daftar': true,
          'cek-kelulusan': true,
          'cek-data-santri': true,
          'portal_access': true
        },
        appPages: Object.keys(match.menuPermissions || {}).reduce((acc: any, key: string) => {
          const perm = match.menuPermissions[key];
          if (perm && perm !== 'none') {
            acc[key] = { visible: true, access: perm === 'write' ? 'write' : 'read' };
          } else {
            acc[key] = { visible: false, access: 'read' };
          }
          return acc;
        }, {})
      }));

      // Berikan jeda sejenak agar animasi tanda verifikasi multilayer terlihat jelas
      setTimeout(() => {
        setShowPortalPassInput(false);
        setPortalPassword('');
        setVerificationSuccessInfo(null);
        setActiveTab('admin');
        localStorage.setItem('last_active_tab', 'admin');
      }, 1000);
      return;
    }

    // Jika sandi salah atau tidak terdaftar di menu Akses Portal
    setPortalError(true);
  };

  const [initialAdminMenu, setInitialAdminMenu] = useState<string | null>(null);
  const [initialSettingsTab, setInitialSettingsTab] = useState<string | null>(null);

  const [students, setStudents] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('db_students');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          if (parsed.length === 0) return [];
          const mapped = parsed.map((s: any, idx: number) => ({
            ...s,
            id: String(s.id || `std-${idx + 1}`),
            nama: String(s.nama || s.namaLengkap || '').trim(),
            nisn: String(s.nisn || '').trim(),
            nis: String(s.nis || '').trim(),
            gender: String(s.gender || s.jenisKelamin || 'LAKI-LAKI').trim().toUpperCase(),
            jenisKelamin: String(s.gender || s.jenisKelamin || 'LAKI-LAKI').trim().toUpperCase(),
            kelas: String(s.kelas || 'Belum Diatur').trim(),
            status: String(s.status || 'Aktif').trim(),
            academicHistory: parseSafeAcademicHistory(s.academicHistory)
          }));
          return sanitizeMutatedStudents(mapped);
        }
      }
    } catch (e) {
      console.error('Error parsing students from localStorage:', e);
    }
    // Default to INITIAL_STUDENTS directly from Google Sheets MASTER_SISWA
    try {
      localStorage.setItem('db_students', JSON.stringify(INITIAL_STUDENTS));
    } catch {}
    return sanitizeMutatedStudents(INITIAL_STUDENTS);
  });

  const [pendaftar, setPendaftar] = useState<Pendaftar[]>(() => {
    try {
      const cached = localStorage.getItem('db_pendaftar');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.map((p: any, idx: number) => ({
            ...p,
            id: String(p.id || `pdf-${idx + 1}`),
            nomorPendaftaran: String(p.nomorPendaftaran || ''),
            namaLengkap: String(p.namaLengkap || p.nama || ''),
            nisn: String(p.nisn || ''),
            nik: String(p.nik || ''),
            sekolahAsal: String(p.sekolahAsal || ''),
            status: p.status || 'Pending',
            dokumen: typeof p.dokumen === 'object' && p.dokumen !== null ? p.dokumen : {
              kartuKeluarga: String(p.kartuKeluarga || ''),
              aktaKelahiran: String(p.aktaKelahiran || ''),
              raporSiswa: String(p.raporSiswa || ''),
              piagamPrestasi: String(p.piagamPrestasi || '')
            }
          }));
        }
      }
    } catch (err) {
      console.error('Error parsing cached pendaftar: ', err);
    }
    return INITIAL_PENDAFTAR;
  });

  const [config, setConfig] = useState<PengaturanSistem>(() => {
    try {
      const cached = localStorage.getItem('db_config');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_SISTEM_CONFIG,
            ...parsed,
            spreadsheetId: parsed.spreadsheetId || '1pANnXmFHN1KOIFavrjMJ5NgfobMuGdMiBcsSb0EjE9Q',
            kuota: {
              ...DEFAULT_SISTEM_CONFIG.kuota,
              ...(typeof parsed.kuota === 'object' && parsed.kuota !== null ? parsed.kuota : {})
            },
            portalAccessConfigs: Array.isArray(parsed.portalAccessConfigs) && parsed.portalAccessConfigs.length > 0
              ? parsed.portalAccessConfigs
              : (DEFAULT_SISTEM_CONFIG.portalAccessConfigs || [])
          };
        }
      }
    } catch (err) {
      console.error('Error parsing cached configs: ', err);
    }
    return DEFAULT_SISTEM_CONFIG;
  });

  const [academicCalendar, setAcademicCalendar] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('db_academic_calendar');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: '1', date: '2026-07-15', event: 'Mulai KBM Ganjil', type: 'academic' },
      { id: '2', date: '2026-08-17', event: 'Upacara HUT RI', type: 'event' },
      { id: '3', date: '2026-08-25', event: 'Ujian Bulanan I', type: 'exam' },
    ];
  });

  const [pondokAgenda, setPondokAgenda] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('db_pondok_agenda');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any, idx: number) => ({
            ...item,
            id: String(item.id || `agenda-${idx + 1}`),
            task: String(item.task || ''),
            time: String(item.time || '')
          }));
        }
      }
    } catch (e) {}
    return [
      { id: '1', time: '04:00', task: 'Tahajjud & Subuh Berjamaah', category: 'ibadah' },
      { id: '2', time: '05:30', task: 'Halaqah Tahfidz Pagi', category: 'ibadah' },
      { id: '3', time: '07:30', task: 'KBM Formal Madrasah', category: 'akademik' },
      { id: '4', time: '13:00', task: 'Istirahat & Qailulah', category: 'istirahat' },
      { id: '5', time: '16:00', task: 'Halaqah Sore', category: 'ibadah' },
    ];
  });

  useEffect(() => {
    localStorage.setItem('db_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('db_academic_calendar', JSON.stringify(academicCalendar));
  }, [academicCalendar]);

  useEffect(() => {
    localStorage.setItem('db_pondok_agenda', JSON.stringify(pondokAgenda));
  }, [pondokAgenda]);

  const [tahfidzTeachers] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('db_teachers_attendance');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing tahfidzTeachers:', e);
    }
    return [];
  });

  // Active Academic Year for tab title & navbar
  const [activeTahunTab, setActiveTahunTab] = useState<string>(() => {
    try {
      const cachedConfig = localStorage.getItem('db_config');
      if (cachedConfig) {
        const parsed = JSON.parse(cachedConfig);
        if (parsed.tahunAjaran) return parsed.tahunAjaran;
      }
      const combined = localStorage.getItem('cfg_tahun_ajaran_aktif') || '2026/2027 Ganjil';
      return combined.split(' ')[0] || '2026/2027';
    } catch (e) {
      return '2026/2027';
    }
  });

  useEffect(() => {
    if (config.tahunAjaran && config.tahunAjaran !== activeTahunTab) {
      setActiveTahunTab(config.tahunAjaran);
    }
  }, [config.tahunAjaran]);

  // New role-based access control state
  const [userRole, setUserRole] = useState<'superadmin' | 'admin' | 'guru' | 'pembimbing' | 'walisantri' | 'psb' | null>(() => {
    return (localStorage.getItem('session_user_role') as any) || null;
  });

  // Active teacher name
  const [guruActiveName, setGuruActiveName] = useState<string>(() => {
    return localStorage.getItem('session_guru_name') || 'Guru Evaluator';
  });

  const [googleUser, setGoogleUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setGoogleUser(user);
    });
    return () => unsub();
  }, []);

  // Sync config with Server API + Firestore real-time listener
  useEffect(() => {
    // 1. Instantly pull server-stored configuration on app load
    fetch('/api/config')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.config) {
          const sCfg = data.config;
          if (Array.isArray(sCfg.portalAccessConfigs) && sCfg.portalAccessConfigs.length > 0) {
            setConfig(prev => {
              const merged = { ...prev, ...sCfg };
              localStorage.setItem('db_config', JSON.stringify(merged));
              return merged;
            });
          }
        }
      })
      .catch(err => console.warn("Failed to fetch initial server config:", err));

    // 2. Real-time Firestore system_config listener
    const unsub = onSnapshot(doc(db, 'configs', 'system_config'), (snapshot) => {
      if (snapshot.exists()) {
        const remoteData = snapshot.data() as PengaturanSistem;
        setConfig(prev => {
          const merged = {
            ...prev,
            ...remoteData,
            portalAccessConfigs: Array.isArray(remoteData.portalAccessConfigs) && remoteData.portalAccessConfigs.length > 0
              ? remoteData.portalAccessConfigs
              : (prev.portalAccessConfigs || DEFAULT_SISTEM_CONFIG.portalAccessConfigs)
          };
          localStorage.setItem('db_config', JSON.stringify(merged));
          return merged;
        });
      }
    }, (error) => {
      console.warn("Real-time listener for system_config error:", error);
    });

    // 3. Real-time Firestore master_data/db_config listener as backup
    const unsubMasterConfig = onSnapshot(doc(db, 'master_data', 'db_config'), (snapshot) => {
      if (snapshot.exists()) {
        const remoteRecords = snapshot.data().records as PengaturanSistem;
        if (remoteRecords && typeof remoteRecords === 'object') {
          setConfig(prev => {
            const merged = {
              ...prev,
              ...remoteRecords,
              portalAccessConfigs: Array.isArray(remoteRecords.portalAccessConfigs) && remoteRecords.portalAccessConfigs.length > 0
                ? remoteRecords.portalAccessConfigs
                : (prev.portalAccessConfigs || DEFAULT_SISTEM_CONFIG.portalAccessConfigs)
            };
            localStorage.setItem('db_config', JSON.stringify(merged));
            return merged;
          });
        }
      }
    }, (err) => console.warn("Firestore listener db_config offline/notice:", err));

    // MASTER DATA SYNC for students and pendaftar in App level
    const unsubStudents = onSnapshot(doc(db, 'master_data', 'db_students'), (snapshot) => {
      try {
        if (snapshot.exists()) {
          const remoteData = snapshot.data().records;
          if (Array.isArray(remoteData)) setStudents(remoteData);
        }
      } catch (e) {
        console.error("Error in students snapshot listener:", e);
      }
    }, (err) => console.warn("Firestore listener db_students offline/unavailable:", err));

    const unsubPendaftar = onSnapshot(doc(db, 'master_data', 'db_pendaftar'), (snapshot) => {
      try {
        if (snapshot.exists()) {
          const remoteData = snapshot.data().records;
          if (Array.isArray(remoteData)) setPendaftar(remoteData);
        }
      } catch (e) {
        console.error("Error in pendaftar snapshot listener:", e);
      }
    }, (err) => console.warn("Firestore listener db_pendaftar offline/unavailable:", err));

    const unsubCalendar = onSnapshot(doc(db, 'master_data', 'db_academic_calendar'), (snapshot) => {
      try {
        if (snapshot.exists()) {
          const remoteData = snapshot.data().records;
          if (Array.isArray(remoteData)) setAcademicCalendar(remoteData);
        }
      } catch (e) {}
    }, (err) => console.warn("Firestore listener db_academic_calendar offline/unavailable:", err));

    const unsubAgenda = onSnapshot(doc(db, 'master_data', 'db_pondok_agenda'), (snapshot) => {
      try {
        if (snapshot.exists()) {
          const remoteData = snapshot.data().records;
          if (Array.isArray(remoteData)) {
            const sanitized = remoteData.map((item: any, idx: number) => ({
              ...item,
              id: String(item.id || `agenda-${idx + 1}`),
              task: String(item.task || ''),
              time: String(item.time || '')
            }));
            setPondokAgenda(sanitized);
          }
        }
      } catch (e) {}
    }, (err) => console.warn("Firestore listener db_pondok_agenda offline/unavailable:", err));

    // ADDITIONAL MASTER DATA LISTENERS FOR IMMEDIATE SYNC
    const unsubUstadz = onSnapshot(doc(db, 'master_data', 'db_ustadz_master'), (snapshot) => {
      if (snapshot.exists()) {
        const remoteData = snapshot.data().records;
        if (remoteData) {
          const sanitized = sanitizeUstadzList(remoteData);
          localStorage.setItem('db_ustadz_master', JSON.stringify(sanitized));
        }
      }
    }, (err) => console.log("Firestore listener db_ustadz_master notice:", err));

    const unsubKelas = onSnapshot(doc(db, 'master_data', 'db_kelas'), (snapshot) => {
      if (snapshot.exists()) {
        const remoteData = snapshot.data().records;
        if (remoteData) localStorage.setItem('db_kelas', JSON.stringify(remoteData));
      }
    }, (err) => console.log("Firestore listener db_kelas notice:", err));

    return () => {
      unsub();
      unsubStudents();
      unsubPendaftar();
      unsubCalendar();
      unsubAgenda();
      unsubUstadz();
      unsubKelas();
    };
  }, []);

  // AUTOMATIC SYNC FROM SHEETS ON STARTUP
  const [isSyncingFromSheets, setIsSyncingFromSheets] = useState(false);

  const applyRemoteSyncData = (data: Record<string, any>) => {
    if (!data || typeof data !== 'object') return;

    Object.keys(data).forEach(key => {
      const val = data[key];
      if (val !== undefined && val !== null) {
        if (key === 'db_portal_access' && Array.isArray(val)) {
          const sanitizedPortal = val.map((p: any, idx: number) => ({
            id: String(p.id || `portal-${idx + 1}`),
            label: String(p.label || p.nama || 'Akses Portal'),
            password: String(p.password !== undefined && p.password !== null ? p.password : (p.sandi || '')).trim(),
            menuPermissions: typeof p.menuPermissions === 'object' && p.menuPermissions !== null ? p.menuPermissions : {}
          }));
          localStorage.setItem('db_portal_access', JSON.stringify(sanitizedPortal));
          setConfig(prev => {
            const updated = { ...prev, portalAccessConfigs: sanitizedPortal };
            localStorage.setItem('db_config', JSON.stringify(updated));
            return updated;
          });
        } else if (key === 'db_config' && (typeof val === 'object' && val !== null)) {
          const configObj = Array.isArray(val) ? val[0] : val;
          if (configObj && typeof configObj === 'object') {
            const mergedPortal = Array.isArray(configObj.portalAccessConfigs) 
              ? configObj.portalAccessConfigs 
              : (Array.isArray(data['db_portal_access']) ? data['db_portal_access'] : DEFAULT_SISTEM_CONFIG.portalAccessConfigs || []);
            const mergedConfig: PengaturanSistem = {
              ...DEFAULT_SISTEM_CONFIG,
              ...configObj,
              ppdbBuka: configObj.ppdbBuka === true || configObj.ppdbBuka === 'true' || configObj.ppdbBuka === '1',
              importFeatureEnabled: configObj.importFeatureEnabled !== false && configObj.importFeatureEnabled !== 'false',
              kuota: {
                ...DEFAULT_SISTEM_CONFIG.kuota,
                ...(typeof configObj.kuota === 'object' && configObj.kuota !== null ? configObj.kuota : {})
              },
              portalAccessConfigs: mergedPortal
            };
            localStorage.setItem('db_config', JSON.stringify(mergedConfig));
            localStorage.setItem('db_portal_access', JSON.stringify(mergedPortal));
            setConfig(mergedConfig);
          }
        } else if (key === 'db_students' && Array.isArray(val)) {
          const sanitizedStudents = val.map((s: any, idx: number) => ({
            ...s,
            id: String(s.id || `std-${idx + 1}`),
            nama: String(s.nama || s.namaLengkap || '').trim(),
            nisn: String(s.nisn || '').trim(),
            nis: String(s.nis || '').trim(),
            gender: String(s.gender || s.jenisKelamin || 'LAKI-LAKI').trim().toUpperCase(),
            jenisKelamin: String(s.gender || s.jenisKelamin || 'LAKI-LAKI').trim().toUpperCase(),
            kelas: String(s.kelas || 'Belum Diatur').trim(),
            status: String(s.status || 'Aktif').trim(),
            academicHistory: parseSafeAcademicHistory(s.academicHistory)
          }));
          const cleanResult = sanitizeMutatedStudents(sanitizedStudents);
          localStorage.setItem('db_students', JSON.stringify(cleanResult));
          setStudents(cleanResult);
        } else if (key === 'db_pendaftar' && Array.isArray(val)) {
          const sanitizedPendaftar = val.map((p: any, idx: number) => ({
            ...p,
            id: String(p.id || `pdf-${idx + 1}`),
            nomorPendaftaran: String(p.nomorPendaftaran || ''),
            namaLengkap: String(p.namaLengkap || p.nama || ''),
            nisn: String(p.nisn || ''),
            nik: String(p.nik || ''),
            sekolahAsal: String(p.sekolahAsal || ''),
            status: p.status || 'Pending',
            dokumen: typeof p.dokumen === 'object' && p.dokumen !== null ? p.dokumen : {
              kartuKeluarga: String(p['dokumen.kartuKeluarga'] || p.kartuKeluarga || ''),
              aktaKelahiran: String(p['dokumen.aktaKelahiran'] || p.aktaKelahiran || ''),
              raporSiswa: String(p['dokumen.raporSiswa'] || p.raporSiswa || ''),
              piagamPrestasi: String(p['dokumen.piagamPrestasi'] || p.piagamPrestasi || '')
            }
          }));
          localStorage.setItem('db_pendaftar', JSON.stringify(sanitizedPendaftar));
          setPendaftar(sanitizedPendaftar);
        } else if (key === 'db_academic_calendar' && Array.isArray(val)) {
          const sanitizedCal = val.map((item: any, idx: number) => ({
            ...item,
            id: String(item.id || `cal-${idx + 1}`),
            event: String(item.event || ''),
            date: String(item.date || '')
          }));
          localStorage.setItem('db_academic_calendar', JSON.stringify(sanitizedCal));
          setAcademicCalendar(sanitizedCal);
        } else if (key === 'db_pondok_agenda' && Array.isArray(val)) {
          const sanitizedAgenda = val.map((item: any, idx: number) => ({
            ...item,
            id: String(item.id || `agenda-${idx + 1}`),
            task: String(item.task || ''),
            time: String(item.time || '')
          }));
          localStorage.setItem('db_pondok_agenda', JSON.stringify(sanitizedAgenda));
          setPondokAgenda(sanitizedAgenda);
        } else if (key === 'db_ustadz_master') {
          const sanitizedUstadz = sanitizeUstadzList(val);
          localStorage.setItem('db_ustadz_master', JSON.stringify(sanitizedUstadz));
        } else {
          localStorage.setItem(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
        }
      }
    });

    // Propagation: Sync to Firestore
    const collectionsToSync = [
      { key: 'db_students', coll: 'master_data', docName: 'db_students' },
      { key: 'db_pendaftar', coll: 'master_data', docName: 'db_pendaftar' },
      { key: 'db_academic_calendar', coll: 'master_data', docName: 'db_academic_calendar' },
      { key: 'db_pondok_agenda', coll: 'master_data', docName: 'db_pondok_agenda' },
      { key: 'db_ustadz_master', coll: 'master_data', docName: 'db_ustadz_master' },
      { key: 'db_kelas', coll: 'master_data', docName: 'db_kelas' },
      { key: 'db_portal_access', coll: 'master_data', docName: 'db_portal_access' }
    ];

    for (const item of collectionsToSync) {
      const val = data[item.key];
      if (val) {
        try {
          setDoc(doc(db, item.coll, item.docName), { records: val }, { merge: true }).catch(() => {});
        } catch (e) {}
      }
    }

    if (data['db_config']) {
      const cfgObj = Array.isArray(data['db_config']) ? data['db_config'][0] : data['db_config'];
      if (cfgObj) {
        try {
          setDoc(doc(db, 'configs', 'system_config'), cfgObj, { merge: true }).catch(() => {});
        } catch (e) {}
      }
    }
  };

  const syncFromSheets = async (customSpreadsheetId?: string) => {
    if (isSyncingFromSheets) return false;
    
    setIsSyncingFromSheets(true);
    try {
      let appsScriptUrl = config.appsScriptUrl || localStorage.getItem('cfg_apps_script_url') || STANDARD_AL_IHSAN_APPS_SCRIPT_URL;
      if (!appsScriptUrl || appsScriptUrl.includes('...') || appsScriptUrl.includes('AKfycb...') || appsScriptUrl.includes('docs.google.com/spreadsheets')) {
        appsScriptUrl = STANDARD_AL_IHSAN_APPS_SCRIPT_URL;
      }

      const sheetId = customSpreadsheetId || config.spreadsheetId || '1pANnXmFHN1KOIFavrjMJ5NgfobMuGdMiBcsSb0EjE9Q';
      const cleanId = String(sheetId).includes('/spreadsheets/d/')
        ? (sheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] || sheetId)
        : sheetId.split('?')[0].split('#')[0].trim();

      const url = `/api/sheets/fetch?appsScriptUrl=${encodeURIComponent(appsScriptUrl)}${cleanId ? `&spreadsheetId=${encodeURIComponent(cleanId)}` : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && typeof result.data === 'object' && Object.keys(result.data).length > 0) {
          applyRemoteSyncData(result.data);
          console.log('Sinkronisasi data Al-Ihsan via Apps Script berhasil.');
          return true;
        }
      }
      return false;
    } catch (err) {
      console.log('Sync from Apps Script notice:', err);
      return false;
    } finally {
      setIsSyncingFromSheets(false);
    }
  };

  // 1. Setiap membuka aplikasi, langsung sinkronisasi dengan URL Apps Script standar Al-Ihsan
  useEffect(() => {
    syncFromSheets();
  }, []);

  // 2. Dengarkan sinyal sinkronisasi remote dari RealtimeSyncManager
  useEffect(() => {
    const handleRemoteSync = (e: any) => {
      if (e.detail && typeof e.detail === 'object') {
        applyRemoteSyncData(e.detail);
      }
    };
    window.addEventListener('app_data_synced_from_remote', handleRemoteSync);
    return () => {
      window.removeEventListener('app_data_synced_from_remote', handleRemoteSync);
    };
  }, []);

  // Sync Pendaftar to Firestore whenever it changes
  useEffect(() => {
    const syncPendaftar = async () => {
      if (!googleUser || pendaftar.length === 0) return;
      try {
        await setDoc(doc(db, 'master_data', 'db_pendaftar'), { records: pendaftar }, { merge: true });
      } catch (e) {}
    };
    const timer = setTimeout(syncPendaftar, 2000); // Debounce
    return () => clearTimeout(timer);
  }, [pendaftar, googleUser]);

  // Sync Students to Firestore whenever it changes
  useEffect(() => {
    const syncStudents = async () => {
      if (!googleUser || students.length === 0) return;
      try {
        await setDoc(doc(db, 'master_data', 'db_students'), { records: students }, { merge: true });
      } catch (e) {}
    };
    const timer = setTimeout(syncStudents, 2000); // Debounce
    return () => clearTimeout(timer);
  }, [students, googleUser]);

  // Update Firestore master data for calendar and agenda
  useEffect(() => {
    const syncCalendar = async () => {
      if (!googleUser) return;
      try {
        await setDoc(doc(db, 'master_data', 'db_academic_calendar'), { records: academicCalendar }, { merge: true });
      } catch (e) {}
    };
    syncCalendar();
  }, [academicCalendar, googleUser]);

  useEffect(() => {
    const syncAgenda = async () => {
      if (!googleUser) return;
      try {
        await setDoc(doc(db, 'master_data', 'db_pondok_agenda'), { records: pondokAgenda }, { merge: true });
      } catch (e) {}
    };
    syncAgenda();
  }, [pondokAgenda, googleUser]);

  // Update global config across all devices (Firestore + Server API + LocalStorage + Spreadsheet)
  const updateGlobalConfig = async (newCfg: PengaturanSistem) => {
    // 1. Sync to Firestore system_config
    try {
      await setDoc(doc(db, 'configs', 'system_config'), newCfg, { merge: true });
    } catch (error) {
      console.warn("Firestore sync for configs/system_config notice:", error);
    }

    // 2. Sync to Firestore master_data db_config & db_portal_access
    try {
      await setDoc(doc(db, 'master_data', 'db_config'), { records: newCfg }, { merge: true });
      if (newCfg.portalAccessConfigs) {
        await setDoc(doc(db, 'master_data', 'db_portal_access'), { records: newCfg.portalAccessConfigs }, { merge: true });
        localStorage.setItem('db_portal_access', JSON.stringify(newCfg.portalAccessConfigs));
      }
    } catch (error) {
      console.warn("Firestore sync for master_data/db_config notice:", error);
    }

    // 3. Sync to Server-Side API endpoint for instant cross-device delivery
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCfg)
      });
    } catch (error) {
      console.warn("Server API sync for config notice:", error);
    }
  };

  // Persists to localStorage whenever pendaftar list changes
  useEffect(() => {
    try {
      if (localStorage.getItem('block_db_pendaftar_write') === 'true') {
        localStorage.removeItem('block_db_pendaftar_write');
        return;
      }
      localStorage.setItem('db_pendaftar', JSON.stringify(pendaftar));
    } catch (e) {
      console.error('Error saving pendaftar to localStorage:', e);
    }
  }, [pendaftar]);

  // Persists configs changes
  useEffect(() => {
    try {
      localStorage.setItem('db_config', JSON.stringify(config));
    } catch (e) {
      console.error('Error saving config to localStorage:', e);
    }
  }, [config]);

  // Handle addition of newly registered students
  const handleAddPendaftar = (siswa: Pendaftar) => {
    const enriched = { ...siswa, academicYear: siswa.academicYear || activeTahunTab };
    setPendaftar((prev) => [enriched, ...prev]);
  };

  // Move applicant to student list
  const moveToStudents = (applicant: Pendaftar) => {
    const newStudent = {
      id: applicant.id,
      nis: applicant.nis || `S-${Date.now()}`,
      nisn: applicant.nisn,
      nama: applicant.namaLengkap,
      kelas: applicant.pilihanKelas || 'Belum Diatur',
      ortu: applicant.namaAyah || applicant.namaIbu,
      noHp: applicant.noHp || applicant.noHpOrangTua,
      foto: applicant.foto,
      nik: applicant.nik,
      alamat: applicant.alamat || `${applicant.kelurahan}, ${applicant.kecamatan}, ${applicant.kabupatenKota}`,
      gender: applicant.jenisKelamin,
      tempatLahir: applicant.tempatLahir,
      tanggalLahir: applicant.tanggalLahir,
      academicYear: applicant.academicYear || activeTahunTab
    };
    setStudents(prev => [...prev, newStudent]);
  };

  // Modify applicant status & notes (Admin role)
  const updatePendaftarStatus = (id: string, newStatus: StatusPendaftaran, notes?: string) => {
    if (newStatus === 'Ditolak') {
      setPendaftar((prev) => prev.filter(item => item.id !== id));
      return;
    }

    if (newStatus === 'Diterima') {
      const applicant = pendaftar.find(p => p.id === id);
      if (applicant) {
        moveToStudents(applicant);
        setPendaftar((prev) => prev.filter(item => item.id !== id));
        return;
      }
    }

    setPendaftar((prev) =>
      prev.map((item) =>
        item.id === id
          ? { 
              ...item, 
              status: newStatus, 
              catatanAdmin: notes !== undefined ? notes : item.catatanAdmin,
              academicYear: newStatus === 'Diterima' ? (item.academicYear || activeTahunTab) : item.academicYear
            }
          : item
      )
    );
  };

  // Modify applicant evaluation scores & recommendations (Guru role)
  const updatePendaftarGuruEval = (
    id: string,
    nilaiWawancara: number,
    nilaiAkademik: number,
    rekomendasi: 'Sangat Layak' | 'Layak' | 'Perlu Ditinjau' | 'Belum Dinilai' | 'Diterima' | 'Ditolak',
    catatan: string,
    guruNameStr: string
  ) => {
    if (rekomendasi === 'Ditolak') {
      setPendaftar((prev) => prev.filter(item => item.id !== id));
      return;
    }

    if (rekomendasi === 'Diterima') {
      const applicant = pendaftar.find(p => p.id === id);
      if (applicant) {
        moveToStudents(applicant);
        setPendaftar((prev) => prev.filter(item => item.id !== id));
        return;
      }
    }

    setPendaftar((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              nilaiTesWawancara: nilaiWawancara,
              nilaiTesAkademik: nilaiAkademik,
              statusRekomendasiGuru: rekomendasi,
              catatanRekomendasiGuru: catatan,
              dinilaiOlehGuru: guruNameStr
            }
          : item
      )
    );
  };

  // Delete applicant/candidate from the registration list
  const handleDeletePendaftar = (id: string) => {
    setPendaftar((prev) => prev.filter((item) => item.id !== id));
  };

  useEffect(() => {
    document.title = `SIM ALWA`;
  }, [activeTahunTab]);

  // Update administrative configurations (Admin role)
  const updateConfig = (newCfg: PengaturanSistem) => {
    setConfig(newCfg);
    updateGlobalConfig(newCfg);
  };

  const handleLoginAdmin = () => {
    setUserRole('admin');
    localStorage.setItem('session_user_role', 'admin');
  };

  const handleLogoutAll = () => {
    setUserRole(null);
    localStorage.removeItem('session_user_role');
    localStorage.removeItem('session_guru_name');
    localStorage.removeItem('session_is_adminalwa');
    localStorage.removeItem('session_can_change_academic_year');
    localStorage.removeItem('session_entered_password');
    localStorage.removeItem('session_verified_layer');
    localStorage.removeItem('session_verified_time');
  };

  const handleLoginGuru = (name: string) => {
    setUserRole('guru');
    setGuruActiveName(name);
    localStorage.setItem('session_user_role', 'guru');
    localStorage.setItem('session_guru_name', name);
  };

  const handleLoginPsb = () => {
    setUserRole('psb');
    localStorage.setItem('session_user_role', 'psb');
  };

  // Scroll to top on active tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  if (activeTab === 'verifikasi') {
    return <VerificationPage />;
  }

  if (userRole && activeTab === 'admin') {
    return (
      <GuruPanel
        pendaftar={pendaftar}
        setPendaftar={setPendaftar}
        updatePendaftarStatus={updatePendaftarStatus}
        updatePendaftarGuruEval={updatePendaftarGuruEval}
        students={students}
        setStudents={setStudents}
        tahunAjaranProp={activeTahunTab}
        academicCalendar={academicCalendar}
        setAcademicCalendar={setAcademicCalendar}
        pondokAgenda={pondokAgenda}
        setPondokAgenda={setPondokAgenda}
        guruActiveName={
          userRole === 'superadmin' ? 'Super Administrator' :
          userRole === 'admin' ? 'Administrator' :
          userRole === 'pembimbing' ? 'Pembimbing Tahfidz' :
          userRole === 'walisantri' ? 'Wali Santri' :
          guruActiveName
        }
        logoutGuru={handleLogoutAll}
        onGoToHome={() => handleNavigate('daftar')}
        config={config}
        updateConfig={updateConfig}
        onDeletePendaftar={handleDeletePendaftar}
        userRole={userRole}
        initialMenu={initialAdminMenu}
        initialSettingsSubTab={initialSettingsTab}
        clearInitialSettings={() => {
          setInitialAdminMenu(null);
          setInitialSettingsTab(null);
        }}
        syncFromSheets={syncFromSheets}
        isSyncingFromSheets={isSyncingFromSheets}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans antialiased relative selection:bg-emerald-600 selection:text-white">
      
      {/* Ambient luxury lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[560px] pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-180px] left-1/2 -translate-x-1/2 w-[1000px] h-[520px] bg-gradient-to-b from-emerald-200/40 via-teal-100/25 to-transparent blur-3xl rounded-full" />
        <div className="absolute top-[-40px] left-[15%] w-[400px] h-[300px] bg-amber-100/35 blur-3xl rounded-full" />
      </div>
      
      {/* 1. Global Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleNavigate}
        isAdminLoggedIn={userRole === 'admin' || userRole === 'psb' || userRole === 'superadmin'}
        logoutAdmin={handleLogoutAll}
        isGuruLoggedIn={userRole === 'guru'}
        logoutGuru={handleLogoutAll}
        tahunAjaranAktif={activeTahunTab}
        userRole={userRole}
        currentTheme={currentTheme}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
        isPublicPsbMode={isPublicPsbMode}
      />

      {isSyncingFromSheets && (
        <div className="fixed bottom-6 right-6 z-[200] glass-panel px-4 py-2.5 rounded-full shadow-2xl flex items-center space-x-3 border border-emerald-200/80 animate-apple-fade">
          <RefreshCw className="h-4 w-4 text-emerald-600 animate-spin" />
          <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-tight">Menyinkronkan Basis Data...</span>
        </div>
      )}

      {/* 2. Main Viewport Render Grid Wrapper */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-apple-fade">
        {activeTab === 'daftar' && (
          <FormulirOnline
            onAddPendaftar={handleAddPendaftar}
            ppdbBuka={config.ppdbBuka}
            isPublicPsbMode={isPublicPsbMode}
          />
        )}

        {activeTab === 'cek-kelulusan' && (
          <CekKelulusan
            pendaftar={pendaftar.filter(p => !p.academicYear || p.academicYear === activeTahunTab)}
          />
        )}

        {activeTab === 'cek-data-santri' && (
          <CekDataSantri
            config={config}
            studentsProp={students}
            tahunAjaranProp={activeTahunTab}
          />
        )}

        {activeTab === 'admin' && !userRole && !isPublicPsbMode && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
            <div className="h-20 w-20 bg-emerald-50 rounded-3xl flex items-center justify-center shadow-inner border border-emerald-200">
              <Lock className="h-10 w-10 text-emerald-700" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Portal Terkunci</h2>
              <p className="text-gray-500 max-w-xs mx-auto text-sm font-medium">Silakan masuk menggunakan kredensial administratif Anda untuk mengakses halaman ini.</p>
            </div>
            <button
              onClick={() => setShowPortalPassInput(true)}
              className="px-8 py-3 bg-gradient-to-r from-emerald-800 to-teal-800 text-white rounded-2xl font-bold text-sm shadow-xl shadow-emerald-900/20 hover:from-emerald-900 hover:to-teal-900 transition-all active:scale-95 cursor-pointer"
            >
              Buka Portal
            </button>
          </div>
        )}
      </main>

      {/* 3. Global Footer block with Prestigious Emerald Styling */}
      <footer className="w-full bg-[#0b1c17] border-t border-emerald-800/40 py-16 text-emerald-100/70 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10">
          
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-emerald-950 shadow-md">
              <School className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider">PONDOK PESANTREN TAHFIDZ</h3>
              <h4 className="text-base font-extrabold text-white tracking-tight">AL IHSAN WAT TAQWA</h4>
            </div>
            <p className="text-xs leading-relaxed max-w-sm text-emerald-200/80">
              {isPublicPsbMode
                ? 'Layanan resmi Penerimaan Santri Baru (PSB) Pondok Pesantren Tahfidz Al Ihsan Wat Taqwa. Membentuk generasi berakhlak mulia dan mutqin 30 Juz.'
                : 'Platform manajemen akademik dan kepesantrenan terpadu yang modern, aman, dan transparan.'}
            </p>
          </div>

          <div className="space-y-4">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-widest block">Navigasi Utama</span>
            <ul className="space-y-3 text-xs">
              <li>
                <button onClick={() => handleNavigate('daftar')} className="hover:text-amber-300 transition-colors text-emerald-100/90 cursor-pointer">
                  Formulir Pendaftaran
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigate('cek-kelulusan')} className="hover:text-amber-300 transition-colors text-emerald-100/90 cursor-pointer">
                  Cek Status Kelulusan
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigate('cek-data-santri')} className="hover:text-amber-300 transition-colors text-emerald-100/90 cursor-pointer">
                  Basis Data Santri
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-widest block">Layanan Informasi</span>
            <div className="text-xs space-y-2.5 text-emerald-100/80">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400/80 font-medium">WhatsApp:</span>
                <span className="text-white font-semibold">{config.kontakTelepon}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400/80 font-medium">Email:</span>
                <span className="text-white font-semibold lowercase">{config.kontakEmail}</span>
              </div>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-emerald-900/80 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-emerald-300/60">
          <div>Hak Cipta &copy; 2026 Al Ihsan Wat Taqwa. Seluruh hak cipta dilindungi.</div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-emerald-300/80 uppercase tracking-widest text-[9.5px] font-bold">Portal Akademik Resmi Terintegrasi</span>
          </div>
        </div>
      </footer>

      {/* 4. Portal Password Modal */}
      <AnimatePresence>
        {showPortalPassInput && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowPortalPassInput(false);
                setPortalError(false);
                setPortalPassword('');
              }}
              className="absolute inset-0 bg-gray-900/20 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200/50 p-8 space-y-8 relative z-10"
            >
              {verificationSuccessInfo ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4 space-y-4"
                >
                  <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-75"></div>
                    <div className="relative h-16 w-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      <CheckCircle2 className="h-9 w-9" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-black tracking-wider uppercase">
                      🛡️ Verifikasi Multilayer Berhasil
                    </span>
                    <h2 className="text-gray-900 font-black text-xl tracking-tight">
                      Akses Diterima!
                    </h2>
                    <p className="text-slate-600 text-xs font-bold">
                      {verificationSuccessInfo.label}
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-1.5 text-[11px]">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Sumber Otentikasi:</div>
                    <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                      <span>{verificationSuccessInfo.layerName}</span>
                    </div>
                    <div className="text-[9.5px] text-slate-400 font-semibold pt-1 border-t border-slate-200">
                      Mengarahkan ke dashboard manajemen...
                    </div>
                  </div>
                </motion.div>
              ) : (
                <>
                  <div className="text-center space-y-3">
                    <div className="h-16 w-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto border border-gray-100">
                      <Lock className="h-8 w-8 text-gray-900" />
                    </div>
                    <h2 className="text-gray-900 font-bold text-xl tracking-tight">Akses Portal</h2>
                    <p className="text-gray-500 text-[11px] font-medium leading-relaxed max-w-[240px] mx-auto">
                      Masukkan kata sandi administratif Anda untuk mengakses portal manajemen.
                    </p>
                  </div>
                  
                  <form onSubmit={handlePortalAccess} className="space-y-6">
                    <div className="space-y-4">
                      <input 
                        type="password"
                        placeholder="Kata Sandi"
                        autoFocus
                        value={portalPassword}
                        onChange={(e) => {
                          setPortalPassword(e.target.value);
                          if (portalError) setPortalError(false);
                        }}
                        className={`w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:outline-none font-bold text-center text-lg tracking-[0.2em] transition-all ${portalError ? 'border-rose-200 bg-rose-50/50 focus:ring-rose-100 text-rose-600' : 'focus:ring-blue-50 focus:border-blue-500'}`}
                      />
                      {portalError && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center justify-center gap-2"
                        >
                          <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                          <p className="text-[10px] text-rose-500 font-bold">Kata sandi salah. Silakan coba lagi.</p>
                        </motion.div>
                      )}
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button 
                        type="button"
                        onClick={() => {
                          setShowPortalPassInput(false);
                          setPortalError(false);
                          setPortalPassword('');
                        }}
                        className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold text-[13px] rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
                      >
                        Batal
                      </button>
                      <button 
                        type="submit"
                        disabled={isVerifyingPass}
                        className="flex-1 py-4 bg-gray-900 text-white font-bold text-[13px] rounded-2xl hover:bg-gray-800 shadow-xl shadow-gray-200 transition-all active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-75"
                      >
                        {isVerifyingPass ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                            <span>Memverifikasi...</span>
                          </>
                        ) : (
                          <span>Masuk</span>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Fixed Padlock Toggle (Top Left) */}
      {!userRole && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowPortalPassInput(true)}
          className="fixed top-6 left-6 z-[60] bg-white text-gray-900 p-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 group border border-gray-100 flex items-center justify-center"
          title="Masuk ke Portal"
        >
          <Lock className="h-5 w-5" />
        </motion.button>
      )}

      {/* 6. Global Theme Switcher Floating Action Bar & Modal */}
      <ThemeSwitcher
        currentTheme={currentTheme}
        onThemeChange={handleThemeChange}
        isOpenModal={isThemeModalOpen}
        onCloseModal={() => setIsThemeModalOpen(false)}
      />

    </div>
  );
}
