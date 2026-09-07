import { Pendaftar, PengaturanSistem, GaleriSekolah, PortalAccessConfig } from './types';

export const INITIAL_PENDAFTAR: Pendaftar[] = [];

export const DEFAULT_PORTAL_ACCESS_CONFIGS: PortalAccessConfig[] = [
  {
    id: 'portal-superadmin',
    label: 'Super Administrator',
    password: 'adminalwa',
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
  },
  {
    id: 'portal-guru',
    label: 'Dewan Guru & Akademik',
    password: 'guru',
    menuPermissions: {
      dashboard_utama: 'read',
      master_siswa: 'read',
      master_kelas: 'read',
      master_pelajaran: 'read',
      master_ustadz: 'read',
      master_beasiswa: 'none',
      akademik_jadwal: 'write',
      akademik_kehadiran_siswa: 'write',
      akademik_barcode: 'write',
      akademik_kehadiran_guru: 'write',
      akademik_nilai: 'write',
      akademik_tahfidz: 'write',
      akademik_card_generator: 'read',
      laporan_akademik: 'write',
      _ppdb_eval: 'none',
      berkas_pendaftaran: 'none',
      _ppdb_berita: 'none',
      sistem_mutasi_alokasi: 'none',
      _ekspor_backup_sheets: 'none',
      sistem_pengaturan: 'none'
    }
  },
  {
    id: 'portal-psb',
    label: 'Panitia PSB / PPDB',
    password: 'psb',
    menuPermissions: {
      dashboard_utama: 'read',
      master_siswa: 'none',
      master_kelas: 'none',
      master_pelajaran: 'none',
      master_ustadz: 'none',
      master_beasiswa: 'none',
      akademik_jadwal: 'none',
      akademik_kehadiran_siswa: 'none',
      akademik_barcode: 'none',
      akademik_kehadiran_guru: 'none',
      akademik_nilai: 'none',
      akademik_tahfidz: 'none',
      akademik_card_generator: 'none',
      laporan_akademik: 'none',
      _ppdb_eval: 'write',
      berkas_pendaftaran: 'write',
      _ppdb_berita: 'write',
      sistem_mutasi_alokasi: 'none',
      _ekspor_backup_sheets: 'none',
      sistem_pengaturan: 'none'
    }
  }
];

export const DEFAULT_SISTEM_CONFIG: PengaturanSistem = {
  ppdbBuka: true,
  tahunAjaran: '2026/2027',
  kontakTelepon: '(021) 8888-7777',
  kontakEmail: 'info@pondok-tahfidz.sch.id',
  alamatSekolah: 'Jl. Al-Ihsan No. 1, Kebumen, Jawa Tengah',
  kuota: {
    Zonasi: 60, // 60%
    Prestasi: 20, // 20%
    Afirmasi: 15, // 15%
    Perpindahan: 5 // 5%
  },
  portalAccessConfigs: DEFAULT_PORTAL_ACCESS_CONFIGS,
  spreadsheetId: '1pANnXmFHN1KOIFavrjMJ5NgfobMuGdMiBcsSb0EjE9Q',
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbxRwSRDJfp9V7w-B1ggihfImbg3oKLAO2_oIbRVLOS8-c5_h1UYU5pYczNT-bQwkpuI/exec',
  siswaFolderId: '',
  ustadzFolderId: '',
  importFeatureEnabled: true
};

export const GALERI_DATA: GaleriSekolah[] = [
  {
    id: 'galeri-1',
    caption: 'Gedung Sekolah dan Lapangan Utama Pondok Tahfidz',
    gambar: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=800',
    kategori: 'Fasilitas'
  },
  {
    id: 'galeri-2',
    caption: 'Ruang Laboratorium Multi Komputer Terpadu modern',
    gambar: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&q=80&w=800',
    kategori: 'Fasilitas'
  },
  {
    id: 'galeri-3',
    caption: 'Latihan Rutin Marching Band Gita Citra Nusantara',
    gambar: 'https://images.unsplash.com/photo-1460518451285-cd3ab4d565dd?auto=format&fit=crop&q=80&w=800',
    kategori: 'Kegiatan'
  },
  {
    id: 'galeri-4',
    caption: 'Juara Umum Olimpiade Sains Nasional (OSN) Bidang Fisika',
    gambar: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=800',
    kategori: 'Prestasi'
  }
];

export const FAQ_DATA = [
  {
    tanya: 'Bagaimana cara mendaftar PPDB Pondok Tahfidz?',
    jawab: 'Anda cukup mengklik menu "Pendaftaran Online" di bilah navigasi atas, lalu mengisi formulir pendaftaran 4 tahap yang disediakan (identitas diri, jalur pendaftaran, sekolah asal, informasi orang tua), serta mengunggah file pendukung seperti Kartu Keluarga, Akta Kelahiran, dan scan Rapor.'
  },
  {
    tanya: 'Berapa biaya pendaftaran di Pondok Tahfidz?',
    jawab: 'Seluruh tahap pendaftaran PPDB di Pondok Tahfidz (melalui platform online base44.app) adalah GRATIS alias TIDAK dipungut biaya apa pun dari proses pendaftaran, verifikasi dokumen, seleksi hingga pengumuman akhir.'
  },
  {
    tanya: 'Apa saja syarat umum pendaftaran siswa baru?',
    jawab: 'Syarat umumnya adalah: (1) Lulus SD/MI/Paket A sederajat dibuktikan dengan ijazah / dokumen rapor lulus sekolah, (2) Berusia maksimal 15 tahun pada tanggal 1 Juli tahun berjalan, (3) Memiliki Akta Kelahiran resmi, (4) Memiliki Kartu Keluarga asli (terbit minimal 1 tahun sebelum pendaftaran).'
  },
  {
    tanya: 'Apakah saya bisa mendaftar jika bertempat tinggal di luar kota?',
    jawab: 'Bisa. Calon peserta didik dari luar kota dapat memilih Jalur Prestasi (dengan bukti nilai rapor tinggi atau piagam kejuaraan) atau Jalur Perpindahan Tugas Orang Tua/Wali (dengan melampirkan Surat Keputusan mutasi kedinasan/pekerjaan orang tua).'
  }
];
