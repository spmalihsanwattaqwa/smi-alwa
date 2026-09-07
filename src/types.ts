export type JalurPendaftaran = 'Zonasi' | 'Prestasi' | 'Afirmasi' | 'Perpindahan';

export type StatusPendaftaran = 'Pending' | 'Terverifikasi' | 'Diterima' | 'Ditolak';

export interface Pendaftar {
  id: string;
  nomorPendaftaran: string; // e.g. PPDB-2026-0001
  namaLengkap: string;
  nisn: string;
  nik: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  agama: string;
  alamat: string;
  rt: string;
  rw: string;
  kelurahan: string;
  kecamatan: string;
  kabupatenKota: string;
  provinsi?: string;
  dusun?: string;
  tahapPendaftaran?: 'Tahap 1' | 'Tahap 2';
  jarakRumah: number; // in meters (distance for Zonasi calculation)
  sekolahAsal: string;
  nilaiRapor: number; // average grade (used for Prestasi path selection)
  jalur: JalurPendaftaran;
  namaAyah: string;
  namaIbu: string;
  noHpOrangTua: string;
  pekerjaanAyah: string;
  pekerjaanIbu: string;
  dokumen: {
    kartuKeluarga: string; // file name or status
    aktaKelahiran: string;
    raporSiswa: string;
    piagamPrestasi?: string; // optional
  };
  tanggalDaftar: string;
  status: StatusPendaftaran;
  catatanAdmin?: string; // Feedback from admin (e.g., "Sila unggah ulang Kartu Keluarga")
  nilaiTesWawancara?: number;
  nilaiTesAkademik?: number;
  statusRekomendasiGuru?:  'Diterima' | 'Ditolak';
  catatanRekomendasiGuru?: string;
  dinilaiOlehGuru?: string;
  academicYear?: string;
  foto?: string;
  nis?: string;
  pilihanKelas?: string;
  noHp?: string;
  noWaUtama?: string;
  kabupaten?: string;
  gender?: string;
  
  // Custom PPDB fields
  jumlahHafalan?: string;
  noKK?: string;
  saudara?: string;
  nikAyah?: string;
  tlAyah?: string;
  hpAyah?: string;
  statusAyah?: string;
  nikIbu?: string;
  tlIbu?: string;
  hpIbu?: string;
  statusIbu?: string;
  prestasiAkademik?: string;
  prestasiNonAkademik?: string;
}

export interface KuotaJalur {
  Zonasi: number;
  Prestasi: number;
  Afirmasi: number;
  Perpindahan: number;
}

export interface PortalAccessConfig {
  id: string;
  password: string;
  label: string;
  menuPermissions: {
    [pageId: string]: 'read' | 'write' | 'none';
  };
}

export interface PengaturanSistem {
  ppdbBuka: boolean;
  tahunAjaran: string;
  kontakTelepon: string;
  kontakEmail: string;
  alamatSekolah: string;
  kuota: KuotaJalur;
  portalTitle?: string;
  portalSubtitle?: string;
  dayaTampung?: number;
  disableEditSantri?: boolean;
  disableDaftarBaru?: boolean;
  adminUsername?: string;
  adminPassword?: string;
  guruUsername?: string;
  guruPassword?: string;
  psbUsername?: string;
  psbPassword?: string;
  logoSekolah?: string;
  portalAccessConfigs?: PortalAccessConfig[];
  spreadsheetId?: string;
  appsScriptUrl?: string;
  siswaFolderId?: string;
  ustadzFolderId?: string;
  importFeatureEnabled?: boolean;
  academicYearConfigs?: AcademicYearConfig[];
}

export interface AcademicYearConfig {
  id: string;
  tahun: string; // e.g. "2026/2027"
  isAktif: boolean;
  isReadOnly: boolean; // Read-Only / Terkunci mode
  keterangan?: string;
}

export interface AcademicHistoryItem {
  academicYear: string;
  kelas: string;
  status?: 'Aktif' | 'Lulus' | 'Mutasi' | 'Tidak Aktif' | string;
  tanggalMasuk?: string;
  tanggal?: string;
  notes?: string;
  catatan?: string;
}

export interface SchoolStudent {
  id: string;
  nisn: string;
  nama: string;
  kelas: string;
  ortu: string;
  noHp: string;
  nis?: string;
  foto?: string;
  nik?: string;
  alamat?: string;
  gender?: string;
  jenisKelamin?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  kelompokBelajar?: string;
  academicYear?: string;
  status?: 'Aktif' | 'Lulus' | 'Mutasi' | 'Tidak Aktif' | string;
  academicHistory?: AcademicHistoryItem[];
  nomorPendaftaran?: string;
  tanggalDaftar?: string;
  tanggalMasuk?: string;
  agama?: string;
  rt?: string;
  rw?: string;
  kelurahan?: string;
  kecamatan?: string;
  kabupatenKota?: string;
  provinsi?: string;
  dusun?: string;
  tahapPendaftaran?: string;
  jarakRumah?: number;
  sekolahAsal?: string;
  nilaiRapor?: number;
  jalur?: string;
  namaAyah?: string;
  namaIbu?: string;
  namaWali?: string;
  wali?: string;
  hpWali?: string;
  pekerjaanAyah?: string;
  pekerjaanIbu?: string;
  noHpOrangTua?: string;
  jumlahHafalan?: string;
  noKK?: string;
  saudara?: string;
  nikAyah?: string;
  tlAyah?: string;
  hpAyah?: string;
  statusAyah?: string;
  nikIbu?: string;
  tlIbu?: string;
  hpIbu?: string;
  statusIbu?: string;
  prestasiAkademik?: string;
  prestasiNonAkademik?: string;
  jenjang?: string;
  waliKelas?: string;
  dokumen?: {
    kartuKeluarga?: string;
    aktaKelahiran?: string;
    raporSiswa?: string;
    piagamPrestasi?: string;
  };
}

export interface GaleriSekolah {
  id: string;
  caption: string;
  gambar: string;
  kategori: 'Fasilitas' | 'Kegiatan' | 'Prestasi';
}

export interface MajelisTahfidz {
  id: string;
  nama: string;
  ustadzId: string;
  siswaIds: string[];
}

export type PenilaianTahfidz = 'Mumtaz' | 'Jayyid Jiddan' | 'Jayyid';

export interface TahfidzRecord {
  id: string;
  majelisId: string;
  siswaId: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  jenisSetoran: 'Ziyadah' | 'Murojaah' | 'Imtihan' | "Yanbu'a/Bi Nadzor" | "Izin Syar'i";
  noJuz: string;
  jenisUjian?: '1 Juz' | '5 Juz' | 'Semester';
  jumlahHalaman: number;
  nilaiTajwid: PenilaianTahfidz;
  nilaiFashohah: PenilaianTahfidz;
  nilaiKelancaran: PenilaianTahfidz;
  ustadzPenyimakId: string;
  catatan: string;
  academicYear: string;
  semester: string;
}

export interface AcademicCalendar {
  id: string;
  date: string;
  event: string;
  type: 'academic' | 'event' | 'exam' | 'holiday';
  description?: string;
}

export interface PondokAgenda {
  id: string;
  time: string;
  task: string;
  category?: 'ibadah' | 'akademik' | 'istirahat' | 'umum';
}

export type PeriodeBeasiswaType = 'bulanan' | 'tahunan' | 'khusus';

export interface Beasiswa {
  id: string;
  lembagaDonatur: string;
  tipePenerima: 'siswa' | 'ustadz';
  penerimaId: string;
  namaPenerima: string;
  identitasPenerima: string; // NISN/NIS untuk Siswa, NIP/NIK untuk Ustadz
  kategoriPenerima?: string; // Kelas siswa / Jabatan ustadz
  tipePeriode: PeriodeBeasiswaType; // 'bulanan' | 'tahunan' | 'khusus'
  bulan?: string; // e.g. 'Agustus' atau 'Setiap Bulan'
  tahun?: string; // e.g. '2025/2026' atau '2026'
  bulanMulai?: string; // e.g. 'Juli'
  tahunMulai?: string; // e.g. '2025'
  bulanSelesai?: string; // e.g. 'Juni'
  tahunSelesai?: string; // e.g. '2026'
  periodeKeterangan?: string; // Ringkasan label periode
  nominal: number; // Dalam Rupiah
  status: 'Aktif' | 'Tidak Aktif';
  keterangan?: string;
  tanggalInput?: string;
  academicYear?: string;
}

export interface Ustadz {
  id: string;
  nama: string;
  nip: string;
  nik: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  tempatLahir: string;
  tanggalLahir: string;
  alamat: string;
  noHp: string;
  jabatan: string;
  pendidikanTerakhir: string;
  lembagaAsalJenis: 'Internal' | 'Eksternal' | 'Pindahan' | 'Lainnya';
  namaLembagaAsal: string;
  tugasAkademik: string;
  posisi: string;
  statusUstadz: 'Aktif' | 'Cuti' | 'Non-Aktif';
  tanggalBergabung: string;
  foto?: string;
  password?: string;
  // Extra fields for spreadsheet sync
  email?: string;
  nuptk?: string;
  npwp?: string;
  statusKepegawaian?: string;
  pangkatGolongan?: string;
  tmtGuru?: string;
  masaKerja?: string;
}

