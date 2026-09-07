export interface PermissionRule {
  visible: boolean;
  access: 'read' | 'write';
}

export interface RolePermissions {
  landingPage: {
    [menuId: string]: boolean;
  };
  appPages: {
    [pageId: string]: PermissionRule;
  };
}

export interface RBACConfig {
  [role: string]: RolePermissions;
}

export const ROLES_LIST = [
  { id: 'superadmin', label: 'Superadmin', icon: '👑', desc: 'Akses penuh tanpa batasan untuk konfigurasi sistem dan RBAC.' }
];

export const LANDING_MENUS = [
  { id: 'daftar', label: 'Pendaftaran Online' },
  { id: 'cek-kelulusan', label: 'Status Pendaftar' },
  { id: 'cek-data-santri', label: 'Cek & Edit Data Santri' },
  { id: 'portal_access', label: 'Akses Portal Dashboard (Login)' }
];

export const APP_PAGES = [
  { id: 'dashboard_utama', label: 'Dashboard Utama', group: 'Dashboard & Informasi' },
  { id: 'master_siswa', label: 'Master Data Siswa', group: 'Data Master' },
  { id: 'master_kelas', label: 'Master Kelas', group: 'Data Master' },
  { id: 'master_pelajaran', label: 'Master Mata Pelajaran', group: 'Data Master' },
  { id: 'master_ustadz', label: 'Master Data Ustadz', group: 'Data Master' },
  { id: 'master_beasiswa', label: 'Master Data Beasiswa', group: 'Data Master' },
  { id: 'akademik_jadwal', label: 'Jadwal Pelajaran', group: 'Akademik' },
  { id: 'akademik_kehadiran_siswa', label: 'Presensi Kehadiran Siswa', group: 'Akademik' },
  { id: 'akademik_barcode', label: 'Cetak Barcode Absensi', group: 'Akademik' },
  { id: 'akademik_kehadiran_guru', label: 'Presensi Kehadiran Guru', group: 'Akademik' },
  { id: 'akademik_nilai', label: 'Penilaian Akademik', group: 'Akademik' },
  { id: 'akademik_tahfidz', label: 'TahfidzPro', group: 'Akademik' },
  { id: 'akademik_card_generator', label: 'Cetak Kartu Siswa/Guru', group: 'Akademik' },
  { id: 'laporan_akademik', label: 'Cetak Raport & Dokumen', group: 'Laporan' },
  { id: '_ppdb_eval', label: 'Data Pendaftar & Kelulusan', group: 'PPDB' },
  { id: 'berkas_pendaftaran', label: 'Arsip Berkas Pendaftar', group: 'PPDB' },
  { id: 'sistem_mutasi_alokasi', label: 'Mutasi & Alokasi Kelas', group: 'Sistem' },
  { id: '_ekspor_backup_sheets', label: 'Backup & Ekspor Data', group: 'Sistem' },
  { id: 'sistem_pengaturan', label: 'Pengaturan Sistem & RBAC', group: 'Sistem' }
];

export const DEFAULT_RBAC_CONFIG: RBACConfig = {
  superadmin: {
    landingPage: {
      'daftar': true,
      'cek-kelulusan': true,
      'cek-data-santri': true,
      'portal_access': true
    },
    appPages: {
      dashboard_utama: { visible: true, access: 'write' },
      master_siswa: { visible: true, access: 'write' },
      master_kelas: { visible: true, access: 'write' },
      master_pelajaran: { visible: true, access: 'write' },
      master_ustadz: { visible: true, access: 'write' },
      master_beasiswa: { visible: true, access: 'write' },
      akademik_jadwal: { visible: true, access: 'write' },
      akademik_kehadiran_siswa: { visible: true, access: 'write' },
      akademik_barcode: { visible: true, access: 'write' },
      akademik_kehadiran_guru: { visible: true, access: 'write' },
      akademik_nilai: { visible: true, access: 'write' },
      akademik_card_generator: { visible: true, access: 'write' },
      laporan_akademik: { visible: true, access: 'write' },
      _ppdb_eval: { visible: true, access: 'write' },
      berkas_pendaftaran: { visible: true, access: 'write' },
      sistem_mutasi_alokasi: { visible: true, access: 'write' },
      _ekspor_backup_sheets: { visible: true, access: 'write' },
      sistem_pengaturan: { visible: true, access: 'write' }
    }
  },
  admin: {
    landingPage: {
      'daftar': true,
      'cek-kelulusan': true,
      'cek-data-santri': true,
      'portal_access': true
    },
    appPages: {
      dashboard_utama: { visible: true, access: 'write' },
      master_siswa: { visible: true, access: 'write' },
      master_kelas: { visible: true, access: 'write' },
      master_pelajaran: { visible: true, access: 'write' },
      master_ustadz: { visible: true, access: 'write' },
      master_beasiswa: { visible: true, access: 'write' },
      akademik_jadwal: { visible: true, access: 'write' },
      akademik_kehadiran_siswa: { visible: true, access: 'write' },
      akademik_barcode: { visible: true, access: 'write' },
      akademik_kehadiran_guru: { visible: true, access: 'write' },
      akademik_nilai: { visible: true, access: 'write' },
      akademik_card_generator: { visible: true, access: 'write' },
      laporan_akademik: { visible: true, access: 'write' },
      _ppdb_eval: { visible: true, access: 'write' },
      berkas_pendaftaran: { visible: true, access: 'write' },
      sistem_mutasi_alokasi: { visible: true, access: 'write' },
      _ekspor_backup_sheets: { visible: true, access: 'write' },
      sistem_pengaturan: { visible: false, access: 'read' }
    }
  }
};

export function getActiveRbacConfig(): RBACConfig {
  const cached = localStorage.getItem('db_rbac_config');
  const currentRole = localStorage.getItem('session_user_role');
  
  let baseConfig = DEFAULT_RBAC_CONFIG;
  if (cached) {
    try {
      baseConfig = JSON.parse(cached);
    } catch (err) {
      console.error('Error parsing rbac config: ', err);
    }
  }

  // Inject dynamic portal role if active
  if (currentRole && currentRole.startsWith('portal_custom_')) {
    const dynamicConfigRaw = localStorage.getItem(`rbac_config_${currentRole}`);
    if (dynamicConfigRaw) {
      try {
        const dynamicConfig = JSON.parse(dynamicConfigRaw);
        return {
          ...baseConfig,
          [currentRole]: dynamicConfig
        };
      } catch (e) {
        console.error('Error parsing dynamic rbac config:', e);
      }
    }
  }

  return baseConfig;
}

export function saveRbacConfig(config: RBACConfig) {
  localStorage.setItem('db_rbac_config', JSON.stringify(config));
}

export function isStudentActiveInClass(s: any): boolean {
  if (!s) return false;
  const status = String(s.status || 'Aktif').trim().toLowerCase();
  const kelas = String(s.kelas || '').trim().toLowerCase();
  
  if (['mutasi', 'mutasi keluar', 'tidak aktif', 'keluar', 'pindah', 'lulus', 'alumni'].includes(status)) {
    return false;
  }
  if (['mutasi', 'mutasi keluar', 'keluar', 'tidak aktif', 'lulus', 'alumni'].includes(kelas)) {
    return false;
  }
  return true;
}

/**
 * Mengambil daftar siswa yang terdaftar pada suatu kelas/rombel untuk Tahun Ajaran tertentu.
 * Tetap memperhitungkan siswa meskipun sudah mengalami kenaikan kelas (tercatat di riwayat akademik)
 * maupun kelulusan (status Lulus / Alumni pada tahun ajaran tersebut).
 */
export function getStudentsInClassForAcademicYear(
  classNama: string,
  targetYear: string,
  allStudents: any[]
): any[] {
  if (!classNama || !targetYear || !Array.isArray(allStudents)) return [];
  const cleanTargetYear = String(targetYear || '').split(' ')[0].trim().toLowerCase();
  const cleanClass = String(classNama || '').trim().toLowerCase();

  return allStudents.filter(s => {
    if (!s || typeof s !== 'object') return false;
    
    // Siswa yang berstatus mutasi keluar/keluar/pindah permanen tidak dihitung
    const sStatus = String(s.status || '').trim().toLowerCase();
    if (['mutasi', 'mutasi keluar', 'pindah', 'keluar'].includes(sStatus)) {
      return false;
    }

    // 1. Cek riwayat akademik (academicHistory)
    // Siswa yang pernah berada di kelas ini pada targetYear (misal sudah Naik Kelas atau Lulus)
    if (Array.isArray(s.academicHistory) && s.academicHistory.length > 0) {
      const histMatch = s.academicHistory.find(h => {
        if (!h || typeof h !== 'object') return false;
        const hYear = String(h.academicYear || '').split(' ')[0].trim().toLowerCase();
        const hKelas = String(h.kelas || '').trim().toLowerCase();
        const hStatus = String(h.status || '').trim().toLowerCase();
        if (['mutasi', 'mutasi keluar', 'pindah', 'keluar'].includes(hStatus)) return false;
        return hYear === cleanTargetYear && hKelas === cleanClass;
      });
      if (histMatch) return true;
    }

    // 2. Cek data kelas saat ini (current class & academicYear)
    const currentClass = String(s.kelas || '').trim().toLowerCase();
    const currentYear = String(s.academicYear || '').split(' ')[0].trim().toLowerCase();

    // Jika siswa saat ini terdaftar di kelas ini
    if (currentClass === cleanClass) {
      // Jika tahun ajaran siswa sama dengan targetYear
      if (currentYear === cleanTargetYear) {
        return true;
      }

      // Jika data awal belum memiliki academicYear (default ke 2025/2026 atau belum ada riwayat lain)
      if (!currentYear) {
        if (cleanTargetYear === '2025/2026' || !Array.isArray(s.academicHistory) || s.academicHistory.length === 0) {
          return true;
        }
      }

      // Siswa berstatus 'Lulus' / 'Alumni' pada tahun kelulusan mereka di kelas ini
      if (['lulus', 'alumni'].includes(sStatus)) {
        if (currentYear === cleanTargetYear || (!currentYear && cleanTargetYear === '2025/2026')) {
          return true;
        }
      }
    }

    return false;
  });
}

export function parseSafeAcademicHistory(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

export function sanitizeMutatedStudents(studentList: any[], mutationsList: any[] = []): any[] {
  if (!Array.isArray(studentList)) return [];

  let activeMutations = mutationsList;
  if (!activeMutations || activeMutations.length === 0) {
    try {
      const savedMut = localStorage.getItem('db_student_mutations');
      if (savedMut) activeMutations = JSON.parse(savedMut);
    } catch (e) {}
  }

  const mutatedKeys = new Set<string>();
  if (Array.isArray(activeMutations)) {
    activeMutations.forEach((m: any) => {
      if (m && m.tipe === 'KELUAR') {
        if (m.nama) mutatedKeys.add(String(m.nama).trim().toLowerCase());
        if (m.nisn) mutatedKeys.add(String(m.nisn).trim().toLowerCase());
        if (m.studentId) mutatedKeys.add(String(m.studentId).trim().toLowerCase());
      }
    });
  }

  // Pass 1: Mark mutated students as 'Tidak Aktif' / 'Mutasi Keluar' and normalize all fields
  const pass1 = studentList
    .filter((s: any) => s && typeof s === 'object')
    .map((s: any) => {
      const stStatus = String(s.status || '').trim().toLowerCase();
      const sNama = String(s.nama || s.namaLengkap || '').trim();
      const sNisn = String(s.nisn || '').trim();
      const sId = String(s.id || '').trim();

      const isMutatedStatus = ['mutasi', 'mutasi keluar', 'pindah', 'keluar', 'tidak aktif'].includes(stStatus);
      const isMutatedInRecords = (sNama && mutatedKeys.has(sNama.toLowerCase())) ||
                                 (sNisn && mutatedKeys.has(sNisn.toLowerCase())) ||
                                 (sId && mutatedKeys.has(sId.toLowerCase()));

      let hist = parseSafeAcademicHistory(s.academicHistory);

      if (isMutatedStatus || isMutatedInRecords) {
        const isOriginalClassActive = s.kelas && !['mutasi', 'mutasi keluar', 'keluar', 'tidak aktif', 'lulus', 'alumni'].includes(String(s.kelas).trim().toLowerCase());
        
        let updatedHistory = [...hist];
        if (isOriginalClassActive) {
          const hasHist = updatedHistory.some(h => h.kelas === s.kelas && (h.status === 'Mutasi' || h.status === 'Tidak Aktif'));
          if (!hasHist) {
            updatedHistory.push({
              academicYear: s.academicYear || '2025/2026',
              kelas: s.kelas,
              status: 'Tidak Aktif',
              notes: 'Mutasi Keluar dari kelas asal'
            });
          }
        }

        return {
          ...s,
          id: sId || `s_${Math.random().toString(36).substr(2, 9)}`,
          nama: sNama,
          nisn: sNisn,
          nis: String(s.nis || '').trim(),
          gender: String(s.gender || s.jenisKelamin || 'LAKI-LAKI').trim().toUpperCase(),
          jenisKelamin: String(s.gender || s.jenisKelamin || 'LAKI-LAKI').trim().toUpperCase(),
          kelas: 'Mutasi Keluar',
          status: 'Tidak Aktif',
          academicHistory: updatedHistory
        };
      }

      return {
        ...s,
        id: sId || `s_${Math.random().toString(36).substr(2, 9)}`,
        nama: sNama,
        nisn: sNisn,
        nis: String(s.nis || '').trim(),
        gender: String(s.gender || s.jenisKelamin || 'LAKI-LAKI').trim().toUpperCase(),
        jenisKelamin: String(s.gender || s.jenisKelamin || 'LAKI-LAKI').trim().toUpperCase(),
        kelas: String(s.kelas || 'Belum Diatur').trim(),
        status: String(s.status || 'Aktif').trim(),
        academicHistory: hist
      };
    });

  // Pass 2: Deduplicate duplicate student objects by NISN or Normalized Full Name
  const mergedMap = new Map<string, any>();
  
  const getStudentDedupeKey = (st: any) => {
    const cleanNisn = String(st.nisn || '').trim();
    if (cleanNisn && cleanNisn.length >= 4 && !cleanNisn.startsWith('009')) {
      return `nisn:${cleanNisn}`;
    }
    const cleanName = String(st.nama || st.namaLengkap || '').trim().toUpperCase().replace(/\s+/g, ' ');
    if (cleanName) {
      return `nama:${cleanName}`;
    }
    return `id:${st.id}`;
  };

  pass1.forEach((st: any) => {
    const key = getStudentDedupeKey(st);
    if (!mergedMap.has(key)) {
      mergedMap.set(key, { ...st });
    } else {
      const existing = mergedMap.get(key);
      const isExistingActive = (existing.status || 'Aktif').toLowerCase() === 'aktif' && existing.kelas !== 'Mutasi Keluar' && existing.kelas !== 'Belum Diatur';
      const isNewActive = (st.status || 'Aktif').toLowerCase() === 'aktif' && st.kelas !== 'Mutasi Keluar' && st.kelas !== 'Belum Diatur';

      // Combine academic histories
      const combinedHist = [
        ...(Array.isArray(existing.academicHistory) ? existing.academicHistory : []),
        ...(Array.isArray(st.academicHistory) ? st.academicHistory : [])
      ];

      // Primary object selection logic (prefer active object with assigned class)
      let primary = existing;
      let secondary = st;
      if (!isExistingActive && isNewActive) {
        primary = st;
        secondary = existing;
      }

      const mergedObj = {
        ...secondary,
        ...primary,
        academicHistory: combinedHist
      };
      mergedMap.set(key, mergedObj);
    }
  });

  // Pass 3: Enforce single active rombel per student per academic year in academicHistory & kelas field
  const result: any[] = [];
  mergedMap.forEach((s: any) => {
    let hist = Array.isArray(s.academicHistory) ? [...s.academicHistory] : [];
    
    // If no history exists, seed with current kelas and academicYear
    if (hist.length === 0 && s.kelas && s.kelas !== 'Belum Diatur' && s.kelas !== 'Mutasi Keluar') {
      hist.push({
        academicYear: s.academicYear || '2025/2026',
        kelas: s.kelas,
        status: s.status || 'Aktif'
      });
    }

    // Group history by academicYear and ensure ONLY 1 active entry per academicYear
    const histByYear = new Map<string, any[]>();
    hist.forEach((h: any) => {
      const yr = h.academicYear || s.academicYear || '2025/2026';
      if (!histByYear.has(yr)) histByYear.set(yr, []);
      histByYear.get(yr)!.push(h);
    });

    const cleanedHist: any[] = [];
    histByYear.forEach((yearItems, yr) => {
      // Find active items
      const activeItems = yearItems.filter(item => 
        !['tidak aktif', 'mutasi', 'mutasi keluar', 'lulus', 'alumni'].includes(String(item.status || 'aktif').toLowerCase())
      );

      if (activeItems.length > 1) {
        // Keep only the LAST active class assignment for this year
        const lastActive = activeItems[activeItems.length - 1];
        yearItems.forEach(item => {
          if (item === lastActive) {
            cleanedHist.push(item);
          } else if (!['tidak aktif', 'mutasi', 'mutasi keluar', 'lulus', 'alumni'].includes(String(item.status || 'aktif').toLowerCase())) {
            // Supersede older active class for the same year
            cleanedHist.push({ ...item, status: 'Tidak Aktif', notes: 'Rombel dipindahkan / digantikan' });
          } else {
            cleanedHist.push(item);
          }
        });
      } else {
        yearItems.forEach(item => cleanedHist.push(item));
      }
    });

    // Make sure s.kelas aligns with active class if status is 'Aktif'
    let currentClass = s.kelas;
    if (s.status === 'Aktif' || !s.status) {
      const activeHistForYear = cleanedHist.find(h => 
        (h.academicYear === (s.academicYear || '2025/2026') || h.academicYear === '2025/2026') &&
        !['tidak aktif', 'mutasi', 'mutasi keluar', 'lulus', 'alumni'].includes(String(h.status || 'aktif').toLowerCase())
      );
      if (activeHistForYear && activeHistForYear.kelas) {
        currentClass = activeHistForYear.kelas;
      }
    }

    result.push({
      ...s,
      kelas: currentClass,
      academicHistory: cleanedHist
    });
  });

  return result;
}

export function sanitizeUstadzList(rawList: any): any[] {
  let list: any[] = [];
  if (Array.isArray(rawList)) {
    list = rawList;
  } else if (rawList && typeof rawList === 'object') {
    if (Array.isArray(rawList.records)) list = rawList.records;
    else if (Array.isArray(rawList.data)) list = rawList.data;
    else list = Object.values(rawList);
  }

  return list
    .filter(u => u && typeof u === 'object')
    .map((u: any, idx: number) => {
      const toSafeStr = (val: any, fallback = ''): string => {
        if (val === undefined || val === null) return fallback;
        if (typeof val === 'object') {
          if (Array.isArray(val)) return val.map(v => toSafeStr(v)).filter(Boolean).join(', ') || fallback;
          return Object.values(val).map(v => toSafeStr(v)).filter(Boolean).join(', ') || fallback;
        }
        const s = String(val).trim();
        return s;
      };

      const nama = toSafeStr(u.nama || u.namaLengkap || u['Nama Lengkap'] || u['Nama'] || u['NAMA'] || u.name, `Ustadz ${idx + 1}`);
      const nip = toSafeStr(u.nip || u['NIP'] || u['Nip'] || '');
      const nik = toSafeStr(u.nik || u['NIK'] || u['Nik'] || '');
      const rawGender = toSafeStr(u.jenisKelamin || u.gender || u['Jenis Kelamin'] || u['JENIS KELAMIN'] || u['Gender'] || 'LAKI-LAKI').toUpperCase();
      const jenisKelamin = rawGender.includes('P') || rawGender.includes('PEREMPUAN') ? 'PEREMPUAN' : 'LAKI-LAKI';
      const noHp = toSafeStr(u.noHp || u.telepon || u.phone || u['No HP'] || u['No. HP'] || u['NO HP'] || u['No Telepon'] || u['Telepon'] || '-');
      const email = toSafeStr(u.email || u['Email'] || u['EMAIL'] || '-');
      const jabatan = toSafeStr(u.jabatan || u['Jabatan'] || u['JABATAN'] || '-');
      const tugasAkademik = toSafeStr(u.tugasAkademik || u['Tugas Akademik'] || u['TUGAS AKADEMIK'] || '-');
      const posisi = toSafeStr(u.posisi || u['Posisi'] || u['POSISI'] || '-');
      const rawStatus = toSafeStr(u.statusUstadz || u.status || u['Status'] || u['Status Ustadz'] || u['STATUS'] || 'Aktif');
      const statusUstadz = rawStatus || 'Aktif';
      const statusKepegawaian = toSafeStr(u.statusKepegawaian || u['Status Kepegawaian'] || u['STATUS KEPEGAWAIAN'] || '-');
      const pendidikanTerakhir = toSafeStr(u.pendidikanTerakhir || u['Pendidikan Terakhir'] || u['PENDIDIKAN TERAKHIR'] || '-');
      const lembagaAsalJenis = toSafeStr(u.lembagaAsalJenis || u['Lembaga Asal'] || u['LEMBAGA ASAL'] || '-');
      const namaLembagaAsal = toSafeStr(u.namaLembagaAsal || u['Nama Lembaga Asal'] || '-');
      const nuptk = toSafeStr(u.nuptk || u['NUPTK'] || '-');
      const npwp = toSafeStr(u.npwp || u['NPWP'] || '-');
      const tmtGuru = toSafeStr(u.tmtGuru || u['TMT Guru'] || u['TMT GURU'] || '-');
      const masaKerja = toSafeStr(u.masaKerja || u['Masa Kerja'] || u['MASA KERJA'] || '-');
      const tempatLahir = toSafeStr(u.tempatLahir || u['Tempat Lahir'] || u['TEMPAT LAHIR'] || '-');
      const tanggalLahir = toSafeStr(u.tanggalLahir || u['Tanggal Lahir'] || u['TANGGAL LAHIR'] || '-');
      const alamat = toSafeStr(u.alamat || u['Alamat'] || u['ALAMAT'] || '-');
      const tanggalBergabung = toSafeStr(u.tanggalBergabung || u['Tanggal Bergabung'] || '-');
      const foto = typeof u.foto === 'string' ? u.foto : (typeof u['Foto'] === 'string' ? u['Foto'] : '');

      return {
        ...u,
        id: toSafeStr(u.id, `ust-${idx + 1}`),
        nama,
        nip,
        nik,
        jenisKelamin,
        tempatLahir,
        tanggalLahir,
        alamat,
        noHp,
        email,
        jabatan,
        tugasAkademik,
        posisi,
        statusUstadz,
        statusKepegawaian,
        pendidikanTerakhir,
        lembagaAsalJenis,
        namaLembagaAsal,
        nuptk,
        npwp,
        tmtGuru,
        masaKerja,
        tanggalBergabung,
        foto
      };
    });
}

