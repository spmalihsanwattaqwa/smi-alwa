import * as XLSX from 'xlsx';
import { Ustadz } from './types';
import { formatDateToDDMMYYYY } from './utils_date';
import { db } from './lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { realtimeSync } from './lib/realtimeSync';

/**
 * Universal file reader for Excel (.xlsx, .xls) and CSV (.csv, .txt) files.
 * Returns an array of row objects where keys are column headers.
 */
export async function parseExcelOrCsvFile(file: File): Promise<Array<Record<string, any>>> {
  return new Promise((resolve, reject) => {
    const isCsvOrTxt = file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.txt');
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer || buffer.byteLength === 0) {
          throw new Error('Berkas yang diunggah kosong.');
        }

        // Try parsing with XLSX
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, raw: false });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new Error('Lembar kerja (worksheet) tidak ditemukan dalam berkas Excel.');
        }
        const worksheet = workbook.Sheets[sheetName];

        // First attempt: sheet_to_json with defval
        const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '', raw: false });
        if (rawJson && rawJson.length > 0) {
          resolve(rawJson);
          return;
        }

        // Fallback: array of arrays if headers were on different row or sheet_to_json was empty
        const aoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
        if (aoa && aoa.length > 1) {
          // Find first row with non-empty cells as header
          let headerIdx = 0;
          for (let i = 0; i < aoa.length; i++) {
            if (aoa[i] && aoa[i].some((c: any) => c && String(c).trim() !== '')) {
              headerIdx = i;
              break;
            }
          }

          const headers = (aoa[headerIdx] || []).map((h: any) => String(h || '').trim());
          const records: Array<Record<string, any>> = [];

          for (let i = headerIdx + 1; i < aoa.length; i++) {
            const row = aoa[i];
            if (!row || row.every((c: any) => !c || String(c).trim() === '')) continue;
            const rec: Record<string, any> = {};
            headers.forEach((h: string, idx: number) => {
              if (h) rec[h] = row[idx] !== undefined ? String(row[idx]).trim() : '';
            });
            records.push(rec);
          }

          if (records.length > 0) {
            resolve(records);
            return;
          }
        }

        throw new Error('Tidak ada baris data valid yang ditemukan dalam berkas.');
      } catch (xlsxErr: any) {
        // If file is CSV/TXT or XLSX parse failed on text CSV, fallback to manual text CSV parse
        if (isCsvOrTxt) {
          const textReader = new FileReader();
          textReader.onload = (te) => {
            try {
              const text = te.target?.result as string;
              const records = parseSimpleCSV(text);
              if (records.length === 0) {
                throw new Error('Tidak ada baris data valid yang ditemukan dalam berkas CSV.');
              }
              resolve(records);
            } catch (csvErr: any) {
              reject(csvErr);
            }
          };
          textReader.onerror = () => reject(new Error('Gagal membaca berkas CSV.'));
          textReader.readAsText(file);
          return;
        }
        reject(new Error(xlsxErr?.message || 'Gagal membaca berkas Excel. Pastikan berkas berformat .xlsx atau .xls'));
      }
    };

    reader.onerror = () => reject(new Error('Gagal membaca berkas dari penyimpanan.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Fallback parser for standard comma or semicolon delimited CSV
 */
function parseSimpleCSV(text: string): Array<Record<string, any>> {
  const cleanText = text.replace(/^\uFEFF/, '').trim();
  const lines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semiCount >= commaCount ? ';' : ',';

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim().replace(/^["']+|["']+$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^["']+|["']+$/g, ''));
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows: Array<Record<string, any>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.every(v => v === '')) continue;
    const rowObj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      if (h) rowObj[h] = values[idx] !== undefined ? values[idx] : '';
    });
    rows.push(rowObj);
  }

  return rows;
}

/**
 * Robust mapper that converts any row from Excel/CSV into a valid Ustadz object.
 * Maps all variations of Indonesian/English column names, handles Excel serial dates,
 * cleans numeric identifiers (NIP, NIK, No HP) and sets fallback values safely.
 */
export function mapRowToUstadz(rec: Record<string, any>, idx: number): Ustadz {
  const getField = (...keys: string[]): string => {
    // 1. Direct match
    for (const k of keys) {
      if (rec[k] !== undefined && rec[k] !== null && String(rec[k]).trim() !== '') {
        return String(rec[k]).trim();
      }
    }
    // 2. Normalized key match (stripping spaces, underscores, dashes, dots and lowercasing)
    const normalizedMap: Record<string, any> = {};
    for (const [key, val] of Object.entries(rec)) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedMap[cleanKey] === undefined) {
        normalizedMap[cleanKey] = val;
      }
    }
    for (const k of keys) {
      const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedMap[cleanK] !== undefined && normalizedMap[cleanK] !== null && String(normalizedMap[cleanK]).trim() !== '') {
        return String(normalizedMap[cleanK]).trim();
      }
    }
    return '';
  };

  const rawNama = getField('nama', 'nama lengkap', 'nama guru', 'nama ustadz', 'nama ustadzah', 'nama pegawai', 'name', 'full name');
  const nama = rawNama || `Ustadz Baru ${idx + 1}`;

  const formatCodeNumber = (val: string): string => {
    if (!val) return '';
    let s = String(val).trim();
    if (s.startsWith("'")) s = s.substring(1).trim();
    return s;
  };

  const nip = formatCodeNumber(getField('nip', 'no nip', 'nomor nip', 'nomor induk pegawai'));
  const nik = formatCodeNumber(getField('nik', 'no nik', 'nomor nik', 'nomor induk kependudukan', 'no ktp'));
  const nuptk = formatCodeNumber(getField('nuptk', 'no nuptk', 'nomor nuptk'));
  const npwp = formatCodeNumber(getField('npwp', 'no npwp', 'nomor npwp'));
  const noHp = formatCodeNumber(getField('no hp', 'nohp', 'no wa', 'nowa', 'no telepon', 'telepon', 'phone', 'whatsapp', 'nomor telepon', 'nomor hp'));

  const rawGender = getField('jenis kelamin', 'jeniskelamin', 'jk', 'gender', 'l/p', 'jenis kelamin (l/p)').toLowerCase();
  const isFemale = rawGender.includes('p') || rawGender.includes('wanita') || rawGender.includes('perempuan') || rawGender === 'f';
  const jenisKelamin: 'Laki-laki' | 'Perempuan' = isFemale ? 'Perempuan' : 'Laki-laki';

  const tempatLahir = getField('tempat lahir', 'tempatlahir', 'kota lahir', 'tempat');
  const rawTglLahir = getField('tanggal lahir', 'tanggallahir', 'tgl lahir', 'tgl. lahir', 'tgl_lahir', 'tanggal_lahir');
  const tanggalLahir = formatDateToDDMMYYYY(rawTglLahir, '');

  const alamat = getField('alamat', 'alamat lengkap', 'domisili', 'tempat tinggal');
  const jabatan = getField('jabatan', 'jabatan/tugas', 'tugas utama', 'posisi jabatan') || 'Guru Pengajar';
  const pendidikanTerakhir = getField('pendidikan terakhir', 'pendidikanterakhir', 'pendidikan', 'ijazah terakhir', 'ijazah') || 'S1';
  
  const lembagaAsalJenisRaw = getField('jenis lembaga asal', 'lembaga asal', 'lembagaasaljenis', 'asal lembaga') || 'Internal';
  const lembagaAsalJenis = (['Internal', 'Eksternal', 'Pindahan', 'Lainnya'].includes(lembagaAsalJenisRaw) ? lembagaAsalJenisRaw : 'Internal') as any;
  const namaLembagaAsal = getField('nama lembaga asal', 'namalembagaasal', 'nama lembaga', 'lembaga asal');
  
  const tugasAkademik = getField('tugas akademik', 'tugasakademik', 'mata pelajaran', 'mapel', 'pengampu mapel', 'bidang studi') || 'Pengajar';
  const posisi = getField('posisi', 'posisi guru', 'kedudukan') || (isFemale ? 'Ustadzah Utama' : 'Ustadz Utama');

  const rawStatus = getField('status ustadz', 'statusustadz', 'status', 'status guru').toLowerCase();
  let statusUstadz: 'Aktif' | 'Cuti' | 'Non-Aktif' = 'Aktif';
  if (rawStatus.includes('cuti')) statusUstadz = 'Cuti';
  else if (rawStatus.includes('non') || rawStatus.includes('keluar') || rawStatus.includes('tidak') || rawStatus.includes('pensiun')) statusUstadz = 'Non-Aktif';

  const rawTglGabung = getField('tanggal bergabung', 'tanggalbergabung', 'tmt', 'tmt guru', 'mulai bertugas', 'tgl bergabung');
  const tanggalBergabung = formatDateToDDMMYYYY(rawTglGabung, '');

  const email = getField('email', 'surel', 'e-mail');
  const statusKepegawaian = getField('status kepegawaian', 'statuskepegawaian', 'status pegawai') || 'Tetap';
  const pangkatGolongan = getField('pangkat golongan', 'pangkatgolongan', 'pangkat', 'golongan');
  const rawTmtGuru = getField('tmt guru', 'tmtguru', 'tmt');
  const tmtGuru = formatDateToDDMMYYYY(rawTmtGuru, '');
  const masaKerja = getField('masa kerja', 'masakerja', 'lama mengajar');
  const password = getField('password', 'kata sandi') || 'ustadz';

  const generatedId = 'u_imp_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substr(2, 5);
  const id = getField('id') || generatedId;

  return {
    id,
    nama,
    nip,
    nik,
    jenisKelamin,
    tempatLahir,
    tanggalLahir,
    alamat,
    noHp,
    jabatan,
    pendidikanTerakhir,
    lembagaAsalJenis,
    namaLembagaAsal,
    tugasAkademik,
    posisi,
    statusUstadz,
    tanggalBergabung,
    password,
    email,
    nuptk,
    npwp,
    statusKepegawaian,
    pangkatGolongan,
    tmtGuru,
    masaKerja
  };
}

/**
 * Exports and downloads a professional Excel template (.xlsx) for teachers/ustadz
 */
export function downloadUstadzExcelTemplate() {
  const headers = [
    'Nama Lengkap',
    'NIP',
    'NIK',
    'Jenis Kelamin (Laki-laki/Perempuan)',
    'Tempat Lahir',
    'Tanggal Lahir (DD/MM/YYYY)',
    'Alamat',
    'No HP / WA',
    'Jabatan',
    'Pendidikan Terakhir',
    'Jenis Lembaga Asal (Internal/Eksternal/Pindahan/Lainnya)',
    'Nama Lembaga Asal',
    'Tugas Akademik (Mata Pelajaran)',
    'Posisi',
    'Status (Aktif/Cuti/Non-Aktif)',
    'Tanggal Bergabung (DD/MM/YYYY)',
    'Email',
    'NUPTK',
    'NPWP',
    'Status Kepegawaian (Tetap/Honorer/Kontrak)',
    'Pangkat Golongan',
    'TMT Guru (DD/MM/YYYY)',
    'Masa Kerja'
  ];

  const sampleRows = [
    [
      'Ahmad Fauzi, S.Pd.I',
      '198501152010011001',
      '3201011501850001',
      'Laki-laki',
      'Bogor',
      '15/01/1985',
      'Jl. Raya Ciawi No. 12, Bogor',
      '081234567890',
      'Kepala Bidang Tahfidz',
      'S1 Pendidikan Agama Islam',
      'Internal',
      'Pondok Pesantren Al-Ihsan',
      'Pengampu Tahfidz',
      'Ustadz Utama',
      'Aktif',
      '01/07/2015',
      'ahmad.fauzi@alihsan.sch.id',
      '1234567890123456',
      '123456789012345',
      'Tetap',
      'IV/a',
      '01/01/2010',
      '14 Tahun'
    ],
    [
      'Nurul Hidayah, Lc',
      '199003202016022002',
      '3273016003900002',
      'Perempuan',
      'Bandung',
      '20/03/1990',
      'Jl. Sukajadi No. 45, Bandung',
      '085612345678',
      'Koordinator Bahasa Arab',
      'S1 Sastra Arab',
      'Internal',
      'Pondok Pesantren Al-Ihsan',
      'Bahasa Arab & Nahwu',
      'Ustadzah Utama',
      'Aktif',
      '01/07/2018',
      'nurul.h@alihsan.sch.id',
      '2345678901234567',
      '234567890123456',
      'Tetap',
      'III/c',
      '01/02/2016',
      '8 Tahun'
    ]
  ];

  const wsData = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws['!cols'] = [
    { wch: 26 }, // Nama Lengkap
    { wch: 22 }, // NIP
    { wch: 22 }, // NIK
    { wch: 20 }, // Jenis Kelamin
    { wch: 16 }, // Tempat Lahir
    { wch: 18 }, // Tanggal Lahir
    { wch: 32 }, // Alamat
    { wch: 18 }, // No HP
    { wch: 24 }, // Jabatan
    { wch: 25 }, // Pendidikan Terakhir
    { wch: 25 }, // Jenis Lembaga Asal
    { wch: 26 }, // Nama Lembaga Asal
    { wch: 24 }, // Tugas Akademik
    { wch: 18 }, // Posisi
    { wch: 16 }, // Status
    { wch: 18 }, // Tanggal Bergabung
    { wch: 26 }, // Email
    { wch: 20 }, // NUPTK
    { wch: 20 }, // NPWP
    { wch: 22 }, // Status Kepegawaian
    { wch: 18 }, // Pangkat Golongan
    { wch: 16 }, // TMT Guru
    { wch: 14 }  // Masa Kerja
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'DATA_GURU');
  XLSX.writeFile(wb, 'TEMPLATE_IMPORT_DATA_GURU_USTADZ.xlsx');
}

/**
 * Exports CSV template as alternative
 */
export function downloadUstadzCsvTemplate() {
  const headers = [
    'nama', 'nip', 'nik', 'jenisKelamin', 'tempatLahir', 'tanggalLahir', 
    'alamat', 'noHp', 'jabatan', 'pendidikanTerakhir', 'lembagaAsalJenis', 
    'namaLembagaAsal', 'tugasAkademik', 'posisi', 'statusUstadz', 'tanggalBergabung',
    'email', 'nuptk', 'npwp', 'statusKepegawaian', 'pangkatGolongan', 'tmtGuru', 'masaKerja'
  ];
  const sampleData = [
    'Ahmad Fauzi, S.Pd.I;198501152010011001;3201011501850001;Laki-laki;Bogor;15/01/1985;Jl. Raya Ciawi No. 12, Bogor;081234567890;Kepala Bidang Tahfidz;S1 Pendidikan Agama Islam;Internal;Pondok Pesantren Al-Ihsan;Pengampu Tahfidz;Ustadz Utama;Aktif;01/07/2015;ahmad.fauzi@alihsan.sch.id;1234567890123456;123456789012345;Tetap;IV/a;01/01/2010;14 Tahun',
    'Nurul Hidayah, Lc;199003202016022002;3273016003900002;Perempuan;Bandung;20/03/1990;Jl. Sukajadi No. 45, Bandung;085612345678;Koordinator Bahasa Arab;S1 Sastra Arab;Internal;Pondok Pesantren Al-Ihsan;Bahasa Arab & Nahwu;Ustadzah Utama;Aktif;01/07/2018;nurul.h@alihsan.sch.id;2345678901234567;234567890123456;Tetap;III/c;01/02/2016;8 Tahun'
  ];
  const csvContent = '\uFEFF' + [headers.join(';'), ...sampleData].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'TEMPLATE_IMPORT_USTADZ.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Persist imported teachers to LocalStorage, Firestore and Realtime Google Sheets Sync
 */
export async function saveImportedUstadzList(finalList: Ustadz[]): Promise<void> {
  // 1. Save to Local Storage
  localStorage.setItem('db_ustadz_master', JSON.stringify(finalList));

  // 2. Persist to Firestore master_data
  try {
    const docRef = doc(db, 'master_data', 'db_ustadz_master');
    await setDoc(docRef, {
      records: finalList,
      lastSynced: new Date().toISOString()
    });
  } catch (fsErr) {
    console.warn('Sync to Firestore master_data notice:', fsErr);
  }

  // 3. Queue Realtime sync to Google Sheets if configured
  try {
    realtimeSync.queueChange('db_ustadz_master', finalList);
  } catch (rsErr) {
    console.warn('Realtime sync queue notice:', rsErr);
  }

  // 4. Notify app components via events
  try {
    window.dispatchEvent(new CustomEvent('ustadz-data-updated', { detail: finalList }));
    window.dispatchEvent(new Event('storage'));
  } catch {}
}
