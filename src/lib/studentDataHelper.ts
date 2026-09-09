/**
 * Helper utility for splitting and merging Student Data
 * separating Master Biodata (tanpa kelas dan TA) and Academic Data (dengan kelas dan TA).
 * 
 * Pondok Pesantren / SMP Terpadu Al-Ihsan
 */

export interface StudentMasterRecord {
  id: string;
  nis: string;
  nisn: string;
  nik: string;
  nama: string;
  gender: string;
  jenisKelamin: string;
  tempatLahir: string;
  tanggalLahir: string;
  agama: string;
  alamat: string;
  rt: string;
  rw: string;
  dusun: string;
  kelurahan: string;
  kecamatan: string;
  kabupatenKota: string;
  provinsi: string;
  noKK: string;
  ortu: string;
  noHp: string;
  namaAyah: string;
  statusAyah: string;
  nikAyah: string;
  tlAyah: string;
  hpAyah: string;
  pekerjaanAyah: string;
  namaIbu: string;
  statusIbu: string;
  nikIbu: string;
  tlIbu: string;
  hpIbu: string;
  pekerjaanIbu: string;
  namaWali: string;
  hpWali: string;
  saudara: string;
  sekolahAsal: string;
  tanggalMasuk: string;
  nomorPendaftaran: string;
  tanggalDaftar: string;
  status: string;
  foto?: string;
  [key: string]: any;
}

export interface StudentAcademicRecord {
  id: string;
  nis: string;
  nisn: string;
  nama: string;
  jenisKelamin: string;
  kelas: string;
  tahunAjaran: string;
  semester: string;
  status: string;
  jenjang: string;
  waliKelas: string;
  kelompokBelajar: string;
  halaqahTahfidz: string;
  asrama: string;
  kamar: string;
  catatanAkademik: string;
  [key: string]: any;
}

/**
 * Fields that MUST NOT be in the Base/Master Student Sheet (tanpa kelas dan TA)
 */
export const ACADEMIC_EXCLUSIVE_FIELDS = [
  'kelas',
  'tahunAjaran',
  'academicYear',
  'semester',
  'rombel',
  'academicHistory'
];

/**
 * Extract only Master Biodata for a student (excl. kelas, tahunAjaran, semester)
 */
export function extractStudentMasterRecord(student: any): StudentMasterRecord {
  if (!student || typeof student !== 'object') {
    return {} as any;
  }

  const copy = { ...student };
  // Explicitly remove academic placement fields
  ACADEMIC_EXCLUSIVE_FIELDS.forEach(field => {
    delete copy[field];
  });

  const rawGender = copy.jenisKelamin || copy.gender || 'LAKI-LAKI';
  const normalizedGender = String(rawGender).toUpperCase().includes('P') ? 'PEREMPUAN' : 'LAKI-LAKI';

  return {
    ...copy,
    id: String(copy.id || '').trim(),
    nis: String(copy.nis || '').trim(),
    nisn: String(copy.nisn || '').trim(),
    nik: String(copy.nik || '').trim(),
    nama: String(copy.nama || copy.namaLengkap || '').trim(),
    gender: normalizedGender,
    jenisKelamin: normalizedGender,
    tempatLahir: String(copy.tempatLahir || '').trim(),
    tanggalLahir: String(copy.tanggalLahir || '').trim(),
    agama: String(copy.agama || 'Islam').trim(),
    alamat: String(copy.alamat || '').trim(),
    rt: String(copy.rt || '').trim(),
    rw: String(copy.rw || '').trim(),
    dusun: String(copy.dusun || '').trim(),
    kelurahan: String(copy.kelurahan || '').trim(),
    kecamatan: String(copy.kecamatan || '').trim(),
    kabupatenKota: String(copy.kabupatenKota || '').trim(),
    provinsi: String(copy.provinsi || '').trim(),
    noKK: String(copy.noKK || '').trim(),
    ortu: String(copy.ortu || copy.namaAyah || copy.namaIbu || '-').trim(),
    noHp: String(copy.noHp || copy.hpAyah || copy.hpIbu || '-').trim(),
    namaAyah: String(copy.namaAyah || '').trim(),
    statusAyah: String(copy.statusAyah || '').trim(),
    nikAyah: String(copy.nikAyah || '').trim(),
    tlAyah: String(copy.tlAyah || '').trim(),
    hpAyah: String(copy.hpAyah || '').trim(),
    pekerjaanAyah: String(copy.pekerjaanAyah || '').trim(),
    namaIbu: String(copy.namaIbu || '').trim(),
    statusIbu: String(copy.statusIbu || '').trim(),
    nikIbu: String(copy.nikIbu || '').trim(),
    tlIbu: String(copy.tlIbu || '').trim(),
    hpIbu: String(copy.hpIbu || '').trim(),
    pekerjaanIbu: String(copy.pekerjaanIbu || '').trim(),
    namaWali: String(copy.namaWali || '').trim(),
    hpWali: String(copy.hpWali || '').trim(),
    saudara: String(copy.saudara || copy.jmlSaudara || '').trim(),
    sekolahAsal: String(copy.sekolahAsal || '').trim(),
    tanggalMasuk: String(copy.tanggalMasuk || '').trim(),
    nomorPendaftaran: String(copy.nomorPendaftaran || '').trim(),
    tanggalDaftar: String(copy.tanggalDaftar || '').trim(),
    status: String(copy.status || 'Aktif').trim(),
    foto: copy.foto || ''
  };
}

/**
 * Extract Academic Record for a student (ditambah kelas dan TA)
 */
export function extractStudentAcademicRecord(
  student: any,
  defaultTA: string = '2026/2027',
  defaultSemester: string = 'Ganjil'
): StudentAcademicRecord {
  if (!student || typeof student !== 'object') {
    return {} as any;
  }

  const rawGender = student.jenisKelamin || student.gender || 'LAKI-LAKI';
  const normalizedGender = String(rawGender).toUpperCase().includes('P') ? 'PEREMPUAN' : 'LAKI-LAKI';

  return {
    id: String(student.id || '').trim(),
    nis: String(student.nis || '').trim(),
    nisn: String(student.nisn || '').trim(),
    nama: String(student.nama || student.namaLengkap || '').trim(),
    jenisKelamin: normalizedGender,
    kelas: String(student.kelas || 'Belum Diatur').trim(),
    tahunAjaran: String(student.academicYear || student.tahunAjaran || defaultTA).trim(),
    semester: String(student.semester || defaultSemester).trim(),
    status: String(student.status || 'Aktif').trim(),
    jenjang: String(student.jenjang || 'SMP Terpadu').trim(),
    waliKelas: String(student.waliKelas || '-').trim(),
    kelompokBelajar: String(student.kelompokBelajar || '-').trim(),
    halaqahTahfidz: String(student.halaqahTahfidz || '-').trim(),
    asrama: String(student.asrama || '-').trim(),
    kamar: String(student.kamar || '-').trim(),
    catatanAkademik: String(student.catatanAkademik || '').trim()
  };
}

/**
 * Split an array of unified students into two distinct collections
 */
export function splitStudentsForSheets(
  students: any[],
  defaultTA: string = '2026/2027',
  defaultSemester: string = 'Ganjil'
): { masterRecords: StudentMasterRecord[]; academicRecords: StudentAcademicRecord[] } {
  if (!Array.isArray(students)) {
    return { masterRecords: [], academicRecords: [] };
  }

  const masterRecords = students.map(s => extractStudentMasterRecord(s));
  const academicRecords = students.map(s => extractStudentAcademicRecord(s, defaultTA, defaultSemester));

  return { masterRecords, academicRecords };
}

/**
 * Merge Master Student Biodata (tanpa kelas dan TA) with Academic Records (dengan kelas dan TA)
 */
export function mergeStudentsFromSheets(
  masterRecords: any[],
  academicRecords: any[],
  defaultTA: string = '2026/2027',
  defaultSemester: string = 'Ganjil'
): any[] {
  const masterList = Array.isArray(masterRecords) ? masterRecords : [];
  const academicList = Array.isArray(academicRecords) ? academicRecords : [];

  if (masterList.length === 0 && academicList.length === 0) {
    return [];
  }

  // Map academic records by multiple candidate keys: id, nis, nisn, nama
  const academicMap = new Map<string, any>();
  academicList.forEach(ak => {
    if (!ak || typeof ak !== 'object') return;
    const idKey = String(ak.id || '').trim().toLowerCase();
    const nisKey = String(ak.nis || '').trim().toLowerCase();
    const nisnKey = String(ak.nisn || '').trim().toLowerCase();
    const namaKey = String(ak.nama || ak.namaLengkap || '').trim().toLowerCase();

    if (idKey) academicMap.set(`id:${idKey}`, ak);
    if (nisKey) academicMap.set(`nis:${nisKey}`, ak);
    if (nisnKey) academicMap.set(`nisn:${nisnKey}`, ak);
    if (namaKey) academicMap.set(`nama:${namaKey}`, ak);
  });

  const mergedList: any[] = [];
  const matchedAcademicKeys = new Set<string>();

  // Iterate over master records and overlay academic fields
  masterList.forEach(m => {
    if (!m || typeof m !== 'object') return;

    const idKey = String(m.id || '').trim().toLowerCase();
    const nisKey = String(m.nis || '').trim().toLowerCase();
    const nisnKey = String(m.nisn || '').trim().toLowerCase();
    const namaKey = String(m.nama || m.namaLengkap || '').trim().toLowerCase();

    const ak = (idKey ? academicMap.get(`id:${idKey}`) : null)
      || (nisKey ? academicMap.get(`nis:${nisKey}`) : null)
      || (nisnKey ? academicMap.get(`nisn:${nisnKey}`) : null)
      || (namaKey ? academicMap.get(`nama:${namaKey}`) : null)
      || {};

    if (ak.id) matchedAcademicKeys.add(String(ak.id).trim().toLowerCase());

    const activeTA = ak.tahunAjaran || ak.academicYear || m.academicYear || defaultTA;
    const activeKelas = ak.kelas || m.kelas || 'Belum Diatur';

    mergedList.push({
      ...m,
      kelas: activeKelas,
      academicYear: activeTA,
      tahunAjaran: activeTA,
      semester: ak.semester || m.semester || defaultSemester,
      status: ak.status || m.status || 'Aktif',
      jenjang: ak.jenjang || m.jenjang || 'SMP Terpadu',
      waliKelas: ak.waliKelas || m.waliKelas || '',
      halaqahTahfidz: ak.halaqahTahfidz || m.halaqahTahfidz || '',
      kelompokBelajar: ak.kelompokBelajar || m.kelompokBelajar || '',
      asrama: ak.asrama || m.asrama || '',
      kamar: ak.kamar || m.kamar || '',
      catatanAkademik: ak.catatanAkademik || m.catatanAkademik || ''
    });
  });

  // Include any academic records that didn't have a matching master record
  academicList.forEach(ak => {
    const idKey = String(ak.id || '').trim().toLowerCase();
    if (idKey && !matchedAcademicKeys.has(idKey)) {
      const activeTA = ak.tahunAjaran || ak.academicYear || defaultTA;
      mergedList.push({
        ...ak,
        nama: ak.nama || 'Siswa Tanpa Biodata Induk',
        kelas: ak.kelas || 'Belum Diatur',
        academicYear: activeTA,
        tahunAjaran: activeTA,
        semester: ak.semester || defaultSemester,
        status: ak.status || 'Aktif',
        ortu: '-',
        noHp: '-'
      });
    }
  });

  return mergedList;
}
