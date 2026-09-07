export type CardOrientation = 'horizontal' | 'vertical';
export type CardTemplateType = 
  | 'modern' 
  | 'minimalist' 
  | 'elegant' 
  | 'corporate' 
  | 'islamic' 
  | 'premium' 
  | 'glassmorphism'
  | 'flat'
  | 'luxury'
  | 'gradient'
  | 'dark';

export interface CardConfig {
  template: CardTemplateType;
  orientation: CardOrientation;
  primaryColor: string;
  secondaryColor: string;
  showWatermark: boolean;
  showSignature: boolean;
  signatureRole: 'Kepala Sekolah' | 'Operator' | 'Guru';
  qrSize: number;
  fontSize: number;
  borderRadius: number;
}

export interface StudentData {
  id: string | number;
  nama: string;
  nis?: string;
  nisn?: string;
  nip?: string;
  jenisKelamin: string;
  tempatLahir: string;
  tanggalLahir: string;
  alamat: string;
  desa?: string;
  kecamatan?: string;
  kabupaten?: string;
  kelas: string;
  kelompokBelajar: string;
  tahunAjaran: string;
  program: string;
  nomorHp: string;
  status: string;
  tanggalMasuk: string;
  foto?: string;
  logoSekolah?: string;
  role: 'santri' | 'ustadz';
}
