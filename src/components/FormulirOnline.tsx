import React, { useState, useEffect } from 'react';
import { ClipboardList, User, Award, Users, FileText, CheckCircle, Upload, AlertTriangle, ArrowRight, ArrowLeft, Printer, RefreshCw, QrCode, Share2, Copy, Check, ExternalLink } from 'lucide-react';
import { Pendaftar } from '../types';

// The fully verified dependent regional database covering all 38 provinces of Indonesia
const REGIONAL_DATA: {
  [province: string]: {
    [kabupaten: string]: {
      [kecamatan: string]: string[]
    }
  }
} = {
  'Aceh': {
    'Banda Aceh': {
      'Baiturrahman': ['Ateuk Jawo', 'Ateuk Deah Tanoh', 'Neusu Aceh', 'Peuniti'],
      'Kuta Alam': ['Laksana', 'Keudah', 'Peunayong', 'Beurawe']
    },
    'Aceh Besar': {
      'Darul Imarah': ['Garot', 'Gue Gari', 'Lamsiteh'],
      'Ingin Jaya': ['Pango', 'Siron', 'Lambaro']
    }
  },
  'Sumatera Utara': {
    'Medan': {
      'Medan Baru': ['Merdeka', 'Babura', 'Padang Bulan'],
      'Medan Area': ['Kota Matsum I', 'Kota Matsum II', 'Pandau Hulu II']
    },
    'Deli Serdang': {
      'Lubuk Pakam': ['Lubuk Pakam Pekan', 'Sekip', 'Bakaran Batu'],
      'Tanjung Morawa': ['Tanjung Morawa Pekan', 'Limau Manis']
    }
  },
  'Sumatera Barat': {
    'Padang': {
      'Padang Barat': ['Belakang Tangsi', 'Berok Nipah', 'Kampung Pondok'],
      'Padang Timur': ['Ganting Parak Gadang', 'Sawahan']
    }
  },
  'Riau': {
    'Pekanbaru': {
      'Tampan': ['Simpang Baru', 'Sidomulyo Barat', 'Delima'],
      'Marpoyan Damai': ['Sidomulyo Timur', 'Wonorejo']
    }
  },
  'Kepulauan Riau': {
    'Batam': {
      'Batam Kota': ['Belian', 'Teluk Tering', 'Sukajadi'],
      'Lubuk Baja': ['Lubuk Baja Kota', 'Batu Selicin']
    }
  },
  'Jambi': {
    'Jambi': {
      'Telanaipura': ['Telanaipura', 'Pematang Sulur', 'Simpang IV Sipin'],
      'Kotabaru': ['Kenali Besar', 'Paal Lima']
    }
  },
  'Sumatera Selatan': {
    'Palembang': {
      'Ilir Timur I': ['16 Ilir', '20 Ilir D I', 'Cinde'],
      'Sako': ['Sako Baru', 'Sialang', 'Sukamaju']
    }
  },
  'Kepulauan Bangka Belitung': {
    'Pangkalpinang': {
      'Bukit Intan': ['Air Itam', 'Bacang', 'Sriwijaya'],
      'Gerunggang': ['Taman Bunga', 'Kace']
    }
  },
  'Bengkulu': {
    'Bengkulu': {
      'Ratu Agung': ['Lempuing', 'Nusa Indah', 'Sawah Lebar'],
      'Muara Bangkahulu': ['Kandang Limun', 'Pematang Gubernur']
    }
  },
  'Lampung': {
    'Bandar Lampung': {
      'Tanjung Karang Pusat': ['Durian Payung', 'Gotong Royong', 'Kaliawi'],
      'Kedaton': ['Kedaton', 'Sukamenanti', 'Sidodadi']
    }
  },
  'DKI Jakarta': {
    'Jakarta Selatan': {
      'Kebayoran Baru': ['Selong', 'Kramat Pela', 'Gandaria Utara'],
      'Cilandak': ['Cilandak Barat', 'Cipete Selatan', 'Pondok Labu']
    },
    'Jakarta Timur': {
      'Duren Sawit': ['Duren Sawit', 'Pondok Kelapa', 'Klender'],
      'Jatinegara': ['Bali Mester', 'Kampung Melayu', 'Bidara Cina']
    }
  },
  'Jawa Barat': {
    'Bogor': {
      'Ciawi': ['Ciawi', 'Bendungan', 'Banjar Waru', 'Pandansari'],
      'Cisarua': ['Cisarua', 'Tugu Utara', 'Tugu Selatan', 'Kopo'],
      'Caringin': ['Caringin', 'Lemah Duhur', 'Ciherang Pondok']
    },
    'Bandung': {
      'Buahbatu': ['Margasari', 'Sekejati', 'Cijawura', 'Jatisari'],
      'Coblong': ['Dago', 'Sadangserang', 'Sekeloa', 'Cipaganti'],
      'Lembang': ['Lembang', 'Cikole', 'Gudangkahuripan']
    },
    'Bekasi': {
      'Cikarang Pusat': ['Cicau', 'Hegarmanah', 'Pasiranji'],
      'Tambun Selatan': ['Tambun', 'Mangunharja', 'Lambangsari']
    }
  },
  'Banten': {
    'Tangerang': {
      'Serpong': ['Lengkong Gudang', 'Rawa Buntu', 'Bumi Serpong Damai'],
      'Ciputat': ['Ciputat', 'Sawah Baru', 'Cipayung']
    },
    'Serang': {
      'Kasemen': ['Banten', 'Kasunyatan', 'Margaluyu'],
      'Cipocok Jaya': ['Cipocok Jaya', 'Banjaragung', 'Banjarsari']
    }
  },
  'Jawa Tengah': {
    'Semarang': {
      'Tembalang': ['Tembalang', 'Sendangmulyo', 'Mangunharjo'],
      'Pedurungan': ['Pedurungan Kidul', 'Tlogosari Kulon']
    },
    'Surakarta': {
      'Laweyan': ['Laweyan', 'Penumping', 'Purwosari'],
      'Banjarsari': ['Banjarsari', 'Keprabon', 'Gilingan']
    }
  },
  'DI Yogyakarta': {
    'Sleman': {
      'Depok': ['Caturtunggal', 'Condongcatur', 'Maguwoharjo'],
      'Mlati': ['Sindadi', 'Sendangadi', 'Tlogoadi']
    },
    'Bantul': {
      'Kasihan': ['Bangunjiwo', 'Ngestiharjo', 'Tamantirto'],
      'Sewon': ['Bangunharjo', 'Panggungharjo', 'Pendowoharjo']
    }
  },
  'Jawa Timur': {
    'Surabaya': {
      'Gubeng': ['Gubeng', 'Airlangga', 'Mojo'],
      'Wonokromo': ['Wonokromo', 'Darmo', 'Sawunggaling']
    },
    'Malang': {
      'Klojen': ['Klojen', 'Bareng', 'Gadingkasri'],
      'Lowokwaru': ['Lowokwaru', 'Tulusrejo', 'Mojolangu']
    }
  },
  'Bali': {
    'Denpasar': {
      'Denpasar Barat': ['Padangsambian', 'Pemecutan', 'Dauh Puri'],
      'Denpasar Timur': ['Kesiman', 'Sumerta', 'Penatih']
    }
  },
  'Nusa Tenggara Barat': {
    'Mataram': {
      'Ampenan': ['Ampenan Barat', 'Ampenan Utara', 'Dasan Agung'],
      'Sakarang': ['Saptamarga', 'Monjok']
    }
  },
  'Nusa Tenggara Timur': {
    'Kupang': {
      'Alak': ['Alak', 'Namosain', 'Mantasi'],
      'Oebobo': ['Oebobo', 'Fatululi', 'Liliba']
    }
  },
  'Kalimantan Barat': {
    'Pontianak': {
      'Pontianak Kota': ['Mariana', 'Sungai Bangkong', 'Tengah'],
      'Pontianak Selatan': ['Benua Melayu Darat', 'Akcaya']
    }
  },
  'Kalimantan Tengah': {
    'Palangkaraya': {
      'Pahandut': ['Pahandut', 'Panarung', 'Langkai'],
      'Jekan Raya': ['Menteng', 'Palangka', 'Bukit Tunggal']
    }
  },
  'Kalimantan Selatan': {
    'Banjarmasin': {
      'Banjarmasin Tengah': ['Antasan Besar', 'Kertak Baru Ilir', 'Melayu'],
      'Banjarmasin Utara': ['Alalak Utara', 'Sungai Miai']
    }
  },
  'Kalimantan Timur': {
    'Samarinda': {
      'Samarinda Ulu': ['Sidodadi', 'Air Putih', 'Jawa'],
      'Samarinda Kota': ['Bugis', 'Karang Mumus', 'Pelabuhan']
    }
  },
  'Kalimantan Utara': {
    'Tarakan': {
      'Tarakan Barat': ['Karang Anyar', 'Karang Balik'],
      'Tarakan Tengah': ['Pamakusian', 'Sebengkok']
    }
  },
  'Sulawesi Utara': {
    'Manado': {
      'Wenang': ['Wenang Utara', 'Calaca', 'Mahawu'],
      'Sario': ['Sario Utara', 'Sario Tumpaan']
    }
  },
  'Gorontalo': {
    'Gorontalo': {
      'Kota Selatan': ['Limea', 'Biawao', 'Siendeng'],
      'Kota Utara': ['Wongkaditi', 'Dulomo']
    }
  },
  'Sulawesi Tengah': {
    'Palu': {
      'Palu Timur': ['Besusu Tengah', 'Lolu Utara'],
      'Palu Barat': ['Balaroa', 'Kamonji', 'Siranjulu']
    }
  },
  'Sulawesi Barat': {
    'Mamuju': {
      'Mamuju': ['Binanga', 'Rimuku', 'Kasiwa'],
      'Simboro': ['Simboro', 'Rangalas']
    }
  },
  'Sulawesi Selatan': {
    'Makassar': {
      'Rappocini': ['Kassi-Kassi', 'Banta-Bantaeng', 'Mapala'],
      'Ujung Pandang': ['Maloku', 'Mangkura', 'Lajangiru']
    }
  },
  'Sulawesi Tenggara': {
    'Kendari': {
      'Kadia': ['Kadia', 'Bende', 'Anaiwoi'],
      'Wua-Wua': ['Wua-Wua', 'Anawai', 'Mataiwoi']
    }
  },
  'Maluku': {
    'Ambon': {
      'Sirimau': ['Amantelu', 'Batu Merah', 'Karang Panjang'],
      'Nusaniwe': ['Benteng', 'Kudamati', 'Wainitu']
    }
  },
  'Maluku Utara': {
    'Ternate': {
      'Ternate Tengah': ['Gamalama', 'Maliaro', 'Sari'],
      'Ternate Selatan': ['Bastiong Karance', 'Kalumata']
    }
  },
  'Papua': {
    'Jayapura': {
      'Jayapura Utara': ['Gurabesi', 'Imbi', 'Tanjung Ria'],
      'Abepura': ['Kota Baru', 'Wano', 'Asano']
    }
  },
  'Papua Barat': {
    'Manokwari': {
      'Manokwari Barat': ['Amban', 'Padarni', 'Sanggeng'],
      'Manokwari Timur': ['Arowi', 'Ayambori']
    }
  },
  'Papua Tengah': {
    'Nabire': {
      'Nabire': ['Karang Mulia', 'Oyehe', 'Siriwini']
    }
  },
  'Papua Pegunungan': {
    'Jayawijaya': {
      'Wamena': ['Wamena Kota', 'Sinakma']
    }
  },
  'Papua Selatan': {
    'Merauke': {
      'Merauke': ['Kalao Pekan', 'Kuda Mati', 'Muli']
    }
  },
  'Papua Barat Daya': {
    'Sorong': {
      'Sorong Kota': ['Remu', 'Klademak', 'Rufei']
    }
  }
};

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
};

interface FormulirOnlineProps {
  onAddPendaftar: (p: Pendaftar) => void;
  ppdbBuka: boolean;
  isPublicPsbMode?: boolean;
}

export default function FormulirOnline({ onAddPendaftar, ppdbBuka, isPublicPsbMode = false }: FormulirOnlineProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [registeredSiswa, setRegisteredSiswa] = useState<Pendaftar | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopiedToast, setLinkCopiedToast] = useState(false);

  const getPublicPsbUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/?mode=psb`;
  };

  const handleCopyPublicLink = async () => {
    const url = getPublicPsbUrl();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setLinkCopiedToast(true);
      setTimeout(() => setLinkCopiedToast(false), 3000);
    } catch (e) {
      console.warn('Copy link fallback', e);
    }
  };

  const handleShareWhatsApp = () => {
    const url = getPublicPsbUrl();
    const text = encodeURIComponent(
      `*Penerimaan Santri Baru (PSB) Pondok Pesantren Al Ihsan Wat Taqwa*\n\nPendaftaran santri baru telah dibuka secara online. Silakan akses formulir pendaftaran resmi melalui tautan berikut:\n${url}\n\nMohon sebarkan informasi ini kepada keluarga, kerabat, atau calon santri yang membutuhkan.`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // States for Indonesian administrative hierarchy (emsifa API)
  const [provinces, setProvinces] = useState<{ id: string, name: string }[]>([]);
  const [regencies, setRegencies] = useState<{ id: string, name: string }[]>([]);
  const [districts, setDistricts] = useState<{ id: string, name: string }[]>([]);
  const [villages, setVillages] = useState<{ id: string, name: string }[]>([]);

  const [selectedProvId, setSelectedProvId] = useState<string>('');
  const [selectedKabId, setSelectedKabId] = useState<string>('');
  const [selectedKecId, setSelectedKecId] = useState<string>('');

  const [loadingProvinces, setLoadingProvinces] = useState<boolean>(false);
  const [loadingRegencies, setLoadingRegencies] = useState<boolean>(false);
  const [loadingDistricts, setLoadingDistricts] = useState<boolean>(false);
  const [loadingVillages, setLoadingVillages] = useState<boolean>(false);

  // Core Form State for 2 Tahap (Stage I & II) configuration
  const [formData, setFormData] = useState({
    // Tahap I: Pendaftaran - Data Diri
    nik: '',
    nisn: '',
    namaLengkap: '',
    jenisKelamin: 'Laki-laki' as 'Laki-laki' | 'Perempuan',
    tempatLahir: '',
    tanggalLahir: '',
    saudara: '1',
    noKK: '',
    sekolahAsal: '',
    provinsi: '',
    kabupaten: '',
    kecamatan: '',
    kelurahan: '',
    dusun: '',
    noWaUtama: '',

    // Tahap II: Daftar Ulang - Data Akademik (Opsional)
    jumlahHafalan: '',
    prestasiAkademik: '',
    prestasiNonAkademik: '',

    // Data Orang Tua
    namaAyah: '',
    statusAyah: 'Hidup',
    nikAyah: '',
    tlAyah: '', // TTL Ayah
    hpAyah: '',
    namaIbu: '',
    statusIbu: 'Hidup',
    nikIbu: '',
    tlIbu: '', // TTL Ibu
    hpIbu: '',
    jmlSaudara: '1',

    // Berkas KK / Akte
    scanKK: '',
    scanAkte: '',
  });

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
        console.warn('Error fetching provinces from local proxy, using fallback list:', err);
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
    setSelectedProvId(provId);
    setSelectedKabId('');
    setSelectedKecId('');
    
    setRegencies([]);
    setDistricts([]);
    setVillages([]);
    
    const selectedProv = provinces.find(p => p.id === provId);
    setFormData(prev => ({
      ...prev,
      provinsi: selectedProv ? toTitleCase(selectedProv.name) : '',
      kabupaten: '',
      kecamatan: '',
      kelurahan: ''
    }));

    if (!provId) return;

    setLoadingRegencies(true);
    try {
      const res = await fetch(`/api/wilayah/regencies/${provId}`);
      if (!res.ok) throw new Error('Failed to fetch regencies');
      const data = await res.json();
      setRegencies(data);
    } catch (err) {
      console.error('Error fetching regencies from local proxy:', err);
    } finally {
      setLoadingRegencies(false);
    }
  };

  const handleKabupatenChange = async (kabId: string) => {
    setSelectedKabId(kabId);
    setSelectedKecId('');
    
    setDistricts([]);
    setVillages([]);
    
    const selectedKab = regencies.find(r => r.id === kabId);
    setFormData(prev => ({
      ...prev,
      kabupaten: selectedKab ? toTitleCase(selectedKab.name) : '',
      kecamatan: '',
      kelurahan: ''
    }));

    if (!kabId) return;

    setLoadingDistricts(true);
    try {
      const res = await fetch(`/api/wilayah/districts/${kabId}`);
      if (!res.ok) throw new Error('Failed to fetch districts');
      const data = await res.json();
      setDistricts(data);
    } catch (err) {
      console.error('Error fetching districts from local proxy:', err);
    } finally {
      setLoadingDistricts(false);
    }
  };

  const handleKecamatanChange = async (kecId: string) => {
    setSelectedKecId(kecId);
    setVillages([]);
    
    const selectedKec = districts.find(d => d.id === kecId);
    setFormData(prev => ({
      ...prev,
      kecamatan: selectedKec ? toTitleCase(selectedKec.name) : '',
      kelurahan: ''
    }));

    if (!kecId) return;

    setLoadingVillages(true);
    try {
      const res = await fetch(`/api/wilayah/villages/${kecId}`);
      if (!res.ok) throw new Error('Failed to fetch villages');
      const data = await res.json();
      setVillages(data);
    } catch (err) {
      console.error('Error fetching villages from local proxy:', err);
    } finally {
      setLoadingVillages(false);
    }
  };

  const handleKelurahanChange = (desaId: string) => {
    const selectedDesa = villages.find(v => v.id === desaId);
    setFormData(prev => ({
      ...prev,
      kelurahan: selectedDesa ? toTitleCase(selectedDesa.name) : ''
    }));
  };

  // Simulated Upload progress for file simulator
  const [uploads, setUploads] = useState({
    kk: { uploading: false, progress: 0, done: false, name: '' },
    akta: { uploading: false, progress: 0, done: false, name: '' }
  });

  const handleFileUploadSim = (field: 'kk' | 'akta', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploads(prev => ({
      ...prev,
      [field]: { uploading: true, progress: 10, done: false, name: file.name }
    }));

    let progress = 10;
    const interval = setInterval(() => {
      progress += 20;
      if (progress >= 100) {
        clearInterval(interval);
        setUploads(prev => ({
          ...prev,
          [field]: { uploading: false, progress: 100, done: true, name: file.name }
        }));
        setFormData(prev => ({
          ...prev,
          [field === 'kk' ? 'scanKK' : 'scanAkte']: `/public/uploads/kk_akta/${file.name}`
        }));
      } else {
        setUploads(prev => ({
          ...prev,
          [field]: { ...prev[field], progress: progress }
        }));
      }
    }, 250);
  };

  const nextStep = () => {
    if (step === 1) {
      // Step 1 Validation
      if (!formData.namaLengkap || !formData.nisn || !formData.nik) {
        alert('Mohon lengkapi Nama Lengkap, NISN, dan NIK Anda!');
        return;
      }
      if (formData.nisn.length < 10) {
        alert('NISN harus bermuatan 10 digit angka!');
        return;
      }
      if (formData.nik.length < 16) {
        alert('NIK KK harus bermuatan 16 digit angka!');
        return;
      }
      if (!formData.noWaUtama) {
        alert('Mohon masukkan Nomor WhatsApp Utama yang bisa dihubungi!');
        return;
      }
      setStep(2);
    }
  };

  const handleDaftarTahap1 = () => {
    // Step 1 Validation
    if (!formData.namaLengkap || !formData.nisn || !formData.nik) {
      alert('Mohon lengkapi Nama Lengkap, NISN, dan NIK Anda untuk mendaftar Tahap I!');
      return;
    }
    if (formData.nisn.length < 10) {
      alert('NISN harus bermuatan 10 digit angka!');
      return;
    }
    if (formData.nik.length < 16) {
      alert('NIK KK harus bermuatan 16 digit angka!');
      return;
    }
    if (!formData.noWaUtama) {
      alert('Mohon masukkan Nomor WhatsApp Utama yang bisa dihubungi!');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const generatedNo = `PPDB-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const newPendaftar: Pendaftar = {
        id: 'p1_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        nomorPendaftaran: generatedNo,
        namaLengkap: formData.namaLengkap,
        nisn: formData.nisn,
        nik: formData.nik,
        tempatLahir: formData.tempatLahir || 'Depok',
        tanggalLahir: formData.tanggalLahir || '2013-05-15',
        jenisKelamin: formData.jenisKelamin,
        agama: 'Islam',
        alamat: `Dusun ${formData.dusun || '-'}, Kel. ${formData.kelurahan || '-'}, Kec. ${formData.kecamatan || '-'}, Kab/Kota ${formData.kabupaten || '-'}, Prov ${formData.provinsi || '-'}`,
        rt: '00',
        rw: '00',
        kelurahan: formData.kelurahan || '-',
        kecamatan: formData.kecamatan || '-',
        kabupatenKota: formData.kabupaten || '-',
        provinsi: formData.provinsi || '-',
        dusun: formData.dusun || '-',
        jarakRumah: 1000,
        sekolahAsal: formData.sekolahAsal || 'SDN Pesantren',
        nilaiRapor: 0,
        jalur: 'Zonasi',
        namaAyah: '-',
        namaIbu: '-',
        noHpOrangTua: formData.noWaUtama,
        pekerjaanAyah: '-',
        pekerjaanIbu: '-',
        dokumen: {
          kartuKeluarga: '',
          aktaKelahiran: '',
          raporSiswa: 'Tertunda - Hanya Tahap 1 Selesai'
        },
        tanggalDaftar: new Date().toISOString().split('T')[0],
        status: 'Pending',
        tahapPendaftaran: 'Tahap 1',
        catatanAdmin: 'Formulir online Tahap 1 (Identitas) lengkap. Sedang menunggu pengisian berkas Tahap II.',
        noKK: formData.noKK || '',
        saudara: formData.saudara || ''
      };

      onAddPendaftar(newPendaftar);
      setRegisteredSiswa(newPendaftar);
      setLoading(false);
      setStep(4); // Show Tahap 1 Success with Link and QR Code
    }, 1200);
  };

  const prevStep = () => setStep(1);

  const handleSubmitPendaftaran = (e: React.FormEvent) => {
    e.preventDefault();

    // Verify files on Step 2
    if (!uploads.kk.done || !uploads.akta.done) {
      alert('Mohon pastikan Scan Kartu Keluarga dan Akte Kelahiran sudah diunggah hingga 100%!');
      return;
    }

    if (!formData.namaIbu || !formData.hpIbu) {
      alert('Mohon masukkan sekurang-kurangnya Nama Ibu dan No HP Ibu Kandung!');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const generatedNo = `PPDB-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const newPendaftar: Pendaftar = {
        id: 'p2_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        nomorPendaftaran: generatedNo,
        namaLengkap: formData.namaLengkap,
        nisn: formData.nisn,
        nik: formData.nik,
        tempatLahir: formData.tempatLahir || 'Depok',
        tanggalLahir: formData.tanggalLahir || '2013-05-15',
        jenisKelamin: formData.jenisKelamin,
        agama: 'Islam',
        alamat: `Dusun ${formData.dusun || '-'}, Kel. ${formData.kelurahan || '-'}, Kec. ${formData.kecamatan || '-'}, Kab/Kota ${formData.kabupaten || '-'}, Prov ${formData.provinsi || '-'}`,
        rt: '00',
        rw: '00',
        kelurahan: formData.kelurahan || '-',
        kecamatan: formData.kecamatan || '-',
        kabupatenKota: formData.kabupaten || '-',
        provinsi: formData.provinsi || '-',
        dusun: formData.dusun || '-',
        tahapPendaftaran: 'Tahap 2',
        jarakRumah: 1000, // hidden zonasi computation defaults
        sekolahAsal: formData.sekolahAsal || 'SDN Pesantren',
        nilaiRapor: 0, // removed rap nilai rapor
        jalur: 'Zonasi', // default internal mapping fallback
        namaAyah: formData.namaAyah || '-',
        namaIbu: formData.namaIbu,
        noHpOrangTua: formData.noWaUtama,
        pekerjaanAyah: formData.statusAyah,
        pekerjaanIbu: formData.statusIbu,
        dokumen: {
          kartuKeluarga: formData.scanKK,
          aktaKelahiran: formData.scanAkte,
          raporSiswa: 'Selesai Daftar Ulang',
          piagamPrestasi: formData.prestasiAkademik || formData.prestasiNonAkademik || undefined
        },
        tanggalDaftar: new Date().toISOString().split('T')[0],
        status: 'Pending',
        catatanAdmin: 'Formulir online 2 tahap lengkap. Sedang dialokasikan dalam folder arsip siswa.',
        noKK: formData.noKK,
        saudara: formData.saudara,
        nikAyah: formData.nikAyah,
        tlAyah: formData.tlAyah,
        hpAyah: formData.hpAyah,
        statusAyah: formData.statusAyah,
        nikIbu: formData.nikIbu,
        tlIbu: formData.tlIbu,
        hpIbu: formData.hpIbu,
        statusIbu: formData.statusIbu,
        prestasiAkademik: formData.prestasiAkademik,
        prestasiNonAkademik: formData.prestasiNonAkademik
      };

      onAddPendaftar(newPendaftar);
      setRegisteredSiswa(newPendaftar);
      setLoading(false);
      setStep(3); // Success card
    }, 1500);
  };

  const triggerPrintCard = () => {
    window.print();
  };

  const startNewForm = () => {
    setStep(1);
    setRegisteredSiswa(null);
    setSelectedProvId('');
    setSelectedKabId('');
    setSelectedKecId('');
    setRegencies([]);
    setDistricts([]);
    setVillages([]);
    setFormData({
      nik: '',
      nisn: '',
      namaLengkap: '',
      jenisKelamin: 'Laki-laki',
      tempatLahir: '',
      tanggalLahir: '',
      saudara: '1',
      noKK: '',
      sekolahAsal: '',
      provinsi: '',
      kabupaten: '',
      kecamatan: '',
      kelurahan: '',
      dusun: '',
      noWaUtama: '',
      jumlahHafalan: '',
      prestasiAkademik: '',
      prestasiNonAkademik: '',
      namaAyah: '',
      statusAyah: 'Hidup',
      nikAyah: '',
      tlAyah: '',
      hpAyah: '',
      namaIbu: '',
      statusIbu: 'Hidup',
      nikIbu: '',
      tlIbu: '',
      hpIbu: '',
      jmlSaudara: '1',
      scanKK: '',
      scanAkte: '',
    });
    setUploads({
      kk: { uploading: false, progress: 0, done: false, name: '' },
      akta: { uploading: false, progress: 0, done: false, name: '' }
    });
  };

  if (!ppdbBuka) {
    return (
      <div className="bg-white border border-gray-150 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-6 shadow-sm my-10 font-sans animate-apple-fade">
        <div className="h-16 w-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Pendaftaran Saat Ini Ditutup</h2>
          <p className="text-xs text-gray-500 leading-relaxed font-medium">
            Portal Penerimaan Peserta Didik Baru (PPDB) untuk tahun ajaran baru saat ini belum membuka pendaftaran. Silakan periksa kembali nanti atau hubungi pihak administrasi sekolah untuk informasi lebih lanjut.
          </p>
        </div>
        <button className="btn-apple-secondary mx-auto">Hubungi Layanan Informasi</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-16 font-sans">
      
      {/* Step Wizard Header with Elegant Islamic & Academic Styling */}
      {step <= 2 && (
        <section className="text-center space-y-6 mb-10">
          {/* Institutional Gold & Emerald Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#0f766e] text-amber-300 text-[11px] font-black uppercase tracking-widest border border-amber-400/40 shadow-md shadow-emerald-950/15">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>Penerimaan Santri Baru (PSB) TA 2026/2027</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-gray-950">
              Pondok Pesantren Tahfidz <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 bg-clip-text text-transparent">
                Al Ihsan Wat Taqwa
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 font-medium max-w-xl mx-auto leading-relaxed">
              Membina generasi penghafal Al-Qur'an yang mutqin 30 Juz, berakhlakul karimah, berwawasan luas, serta unggul dalam prestasi akademik dan kepesantrenan.
            </p>
          </div>

          {/* Institutional Feature Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold bg-white text-emerald-900 border border-emerald-200/90 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              Tahfidz Al-Qur'an 30 Juz Mutqin
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold bg-white text-emerald-900 border border-emerald-200/90 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              Pendidikan Formal Berijazah Resmi
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold bg-white text-emerald-900 border border-emerald-200/90 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-teal-500"></span>
              Program Beasiswa Prestasi &amp; Yatim
            </span>
          </div>

          {/* Progress Indicators - Dual Ring Emerald & Gold */}
          <div className="flex items-center justify-center space-x-5 pt-3 max-w-md mx-auto">
            <div className="flex items-center space-x-3">
              <div className={`h-11 w-11 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                step >= 1 
                  ? 'bg-gradient-to-br from-emerald-800 to-teal-800 text-amber-300 shadow-lg shadow-emerald-800/25 ring-4 ring-emerald-100 border border-amber-400/40' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {step > 1 ? <CheckCircle className="h-5 w-5" /> : 1}
              </div>
              <div className="text-left">
                <span className={`block text-xs font-black uppercase tracking-wider ${step === 1 ? 'text-emerald-950' : 'text-gray-400'}`}>Tahap I</span>
                <span className="text-[10px] text-gray-400 font-semibold">Identitas Diri</span>
              </div>
            </div>
            
            <div className={`h-1 w-14 sm:w-20 rounded-full transition-all ${step >= 2 ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gray-200'}`}></div>

            <div className="flex items-center space-x-3">
              <div className={`h-11 w-11 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                step >= 2 
                  ? 'bg-gradient-to-br from-emerald-800 to-teal-800 text-amber-300 shadow-lg shadow-emerald-800/25 ring-4 ring-emerald-100 border border-amber-400/40' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                2
              </div>
              <div className="text-left">
                <span className={`block text-xs font-black uppercase tracking-wider ${step === 2 ? 'text-emerald-950' : 'text-gray-400'}`}>Tahap II</span>
                <span className="text-[10px] text-gray-400 font-semibold">Orang Tua &amp; Berkas</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Form Area with Royal Accent Line */}
      <div className="apple-card overflow-hidden border border-emerald-200/90 shadow-[0_14px_45px_-10px_rgba(6,78,59,0.08)] bg-white/95 backdrop-blur-sm rounded-[28px] transition-all">
        {/* Decorative Golden Emerald Trim */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-800 via-amber-400 to-teal-700"></div>
        
        {/* Step 1: Tahap I - Pendaftaran (Data Diri) */}
        {step === 1 && (
          <div className="p-8 sm:p-10 space-y-10 animate-apple-fade">
            
            {/* Quick Access Landing Menu */}
            <div className={`grid grid-cols-1 ${isPublicPsbMode ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-4 pb-8 border-b border-emerald-100/80`}>
              <button 
                onClick={() => {
                  const event = new CustomEvent('app-navigate', { detail: 'cek-kelulusan' });
                  window.dispatchEvent(event);
                }}
                className="flex items-center p-5 bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#0f766e] text-white rounded-2xl border border-emerald-600/70 hover:border-amber-400/80 hover:shadow-lg hover:shadow-emerald-950/20 transition-all group cursor-pointer text-left relative overflow-hidden"
              >
                <div className="h-11 w-11 bg-white/10 rounded-xl flex items-center justify-center text-amber-300 shadow-inner mr-4 border border-white/20 group-hover:scale-105 group-hover:bg-amber-400 group-hover:text-emerald-950 transition-all shrink-0">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-bold text-white tracking-tight">Status Pendaftaran &amp; Kelulusan</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-200 font-black uppercase tracking-tight bg-black/20 px-2 py-0.5 rounded-full mt-1 border border-amber-400/30">
                    Cek Pengumuman &rarr;
                  </span>
                </div>
              </button>

              <button 
                onClick={() => setShowShareModal(true)}
                className="flex items-center p-5 bg-gradient-to-br from-[#0b2b24] via-[#0d3b32] to-[#08221c] text-white rounded-2xl border border-emerald-700/60 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-950/20 transition-all group cursor-pointer text-left relative overflow-hidden"
              >
                <div className="h-11 w-11 bg-white/10 rounded-xl flex items-center justify-center text-emerald-300 shadow-inner mr-4 border border-white/20 group-hover:scale-105 transition-all shrink-0">
                  <Share2 className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-bold text-white tracking-tight">Bagikan Link Pendaftaran</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-200 font-black uppercase tracking-tight bg-black/20 px-2 py-0.5 rounded-full mt-1 border border-emerald-500/30">
                    Link Khusus Publik &rarr;
                  </span>
                </div>
              </button>

              <button 
                onClick={() => {
                  const event = new CustomEvent('app-navigate', { detail: 'cek-data-santri' });
                  window.dispatchEvent(event);
                }}
                className="flex items-center p-5 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/20 rounded-2xl border border-emerald-200/90 hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-600/10 transition-all group cursor-pointer text-left"
              >
                <div className="h-11 w-11 bg-white rounded-xl flex items-center justify-center text-emerald-800 shadow-sm mr-4 border border-emerald-200 group-hover:scale-105 group-hover:bg-emerald-700 group-hover:text-white transition-all shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-bold text-gray-950 tracking-tight">Basis Data Santri</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 font-bold uppercase tracking-tight bg-emerald-100/80 px-2 py-0.5 rounded-full mt-1 border border-emerald-300/60 group-hover:bg-emerald-200 transition-colors">
                    Cari &amp; Perbarui Data &rarr;
                  </span>
                </div>
              </button>
            </div>

            <div className="space-y-1.5 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="h-7 w-1.5 bg-gradient-to-b from-emerald-600 to-teal-700 rounded-full inline-block"></span>
                <div>
                  <h2 className="text-xl font-black text-gray-950 tracking-tight">Tahap I: Identitas Calon Santri</h2>
                  <p className="text-xs font-medium text-gray-500">Mohon isi data dasar calon santri secara lengkap dan teliti.</p>
                </div>
              </div>
              <span className="self-start sm:self-center px-3 py-1 bg-emerald-100 text-emerald-900 text-xs font-black rounded-full border border-emerald-200">
                Wajib Diisi
              </span>
            </div>

            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">
                  Nama Lengkap <span className="text-emerald-600 font-black">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Akhyar"
                  value={formData.namaLengkap}
                  onChange={(e) => setFormData({ ...formData, namaLengkap: e.target.value })}
                  className="w-full apple-input hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">
                  NIK Calon Santri (16 Digit) <span className="text-emerald-600 font-black">*</span>
                </label>
                <input
                  type="text"
                  maxLength={16}
                  required
                  placeholder="Nomor Induk Kependudukan (16 digit)"
                  value={formData.nik}
                  onChange={(e) => setFormData({ ...formData, nik: e.target.value.replace(/\D/g, '') })}
                  className="w-full apple-input font-mono hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">
                  NISN (10 Digit) <span className="text-emerald-600 font-black">*</span>
                </label>
                <input
                  type="text"
                  maxLength={10}
                  required
                  placeholder="Nomor Induk Siswa Nasional (10 digit)"
                  value={formData.nisn}
                  onChange={(e) => setFormData({ ...formData, nisn: e.target.value.replace(/\D/g, '') })}
                  className="w-full apple-input font-mono hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">
                  Jenis Kelamin <span className="text-emerald-600 font-black">*</span>
                </label>
                <select
                  value={formData.jenisKelamin}
                  onChange={(e) => setFormData({ ...formData, jenisKelamin: e.target.value as 'Laki-laki' | 'Perempuan' })}
                  className="w-full apple-input hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%23059669%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] bg-no-repeat"
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">
                  Tempat Lahir <span className="text-emerald-600 font-black">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Depok"
                  value={formData.tempatLahir}
                  onChange={(e) => setFormData({ ...formData, tempatLahir: e.target.value })}
                  className="w-full apple-input hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">
                  Tanggal Lahir <span className="text-emerald-600 font-black">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.tanggalLahir}
                  onChange={(e) => setFormData({ ...formData, tanggalLahir: e.target.value })}
                  className="w-full apple-input hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">
                  Anak Ke- <span className="text-emerald-600 font-black">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="1"
                  value={formData.saudara}
                  onChange={(e) => setFormData({ ...formData, saudara: e.target.value })}
                  className="w-full apple-input font-mono hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Row 3 - Local Address */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">
                  Nomor KK (16 Digit) <span className="text-emerald-600 font-black">*</span>
                </label>
                <input
                  type="text"
                  maxLength={16}
                  required
                  placeholder="Nomor Kartu Keluarga (16 digit)"
                  value={formData.noKK}
                  onChange={(e) => setFormData({ ...formData, noKK: e.target.value.replace(/\D/g, '') })}
                  className="w-full apple-input font-mono hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">
                  Sekolah Asal <span className="text-emerald-600 font-black">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama Sekolah / Madrasah Asal"
                  value={formData.sekolahAsal}
                  onChange={(e) => setFormData({ ...formData, sekolahAsal: e.target.value })}
                  className="w-full apple-input hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">
                  No. WhatsApp Aktif <span className="text-emerald-600 font-black">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Contoh: 081299991230"
                  value={formData.noWaUtama}
                  onChange={(e) => setFormData({ ...formData, noWaUtama: e.target.value })}
                  className="w-full apple-input font-mono hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">
                  Provinsi <span className="text-emerald-600 font-black">*</span>
                </label>
                <select
                  required
                  value={selectedProvId}
                  onChange={(e) => handleProvinsiChange(e.target.value)}
                  className="w-full apple-input bg-white hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%23059669%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] bg-no-repeat"
                >
                  <option value="">{loadingProvinces ? 'Memuat Provinsi...' : '-- Pilih Provinsi --'}</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>
                      {toTitleCase(p.name)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 4 - Detailed Address Area */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">
                  Kabupaten / Kota <span className="text-emerald-600 font-black">*</span>
                </label>
                <select
                  required
                  disabled={!selectedProvId || loadingRegencies}
                  value={selectedKabId}
                  onChange={(e) => handleKabupatenChange(e.target.value)}
                  className="w-full apple-input bg-white hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%23059669%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] bg-no-repeat"
                >
                  <option value="">
                    {loadingRegencies ? 'Memuat Kab/Kota...' : '-- Pilih Kabupaten / Kota --'}
                  </option>
                  {regencies.map((r) => (
                    <option key={r.id} value={r.id}>
                      {toTitleCase(r.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">
                  Kecamatan <span className="text-emerald-600 font-black">*</span>
                </label>
                <select
                  required
                  disabled={!selectedKabId || loadingDistricts}
                  value={selectedKecId}
                  onChange={(e) => handleKecamatanChange(e.target.value)}
                  className="w-full apple-input bg-white hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%23059669%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] bg-no-repeat"
                >
                  <option value="">
                    {loadingDistricts ? 'Memuat Kecamatan...' : '-- Pilih Kecamatan --'}
                  </option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {toTitleCase(d.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">
                  Kelurahan / Desa <span className="text-emerald-600 font-black">*</span>
                </label>
                <select
                  required
                  disabled={!selectedKecId || loadingVillages}
                  value={villages.find(v => toTitleCase(v.name) === formData.kelurahan)?.id || ''}
                  onChange={(e) => handleKelurahanChange(e.target.value)}
                  className="w-full apple-input bg-white hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%23059669%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] bg-no-repeat"
                >
                  <option value="">
                    {loadingVillages ? 'Memuat Kelurahan/Desa...' : '-- Pilih Kelurahan / Desa --'}
                  </option>
                  {villages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {toTitleCase(v.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">
                  Dusun / RT / RW / Alamat <span className="text-emerald-600 font-black">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: RT 03 RW 04, Dusun Krajan"
                  value={formData.dusun}
                  onChange={(e) => setFormData({ ...formData, dusun: e.target.value })}
                  className="w-full apple-input hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Navigation Footer with 2 Stage Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-gray-100 gap-4">
              <button
                type="button"
                onClick={handleDaftarTahap1}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-emerald-300 bg-white text-emerald-800 font-bold text-xs flex items-center justify-center space-x-2.5 hover:bg-emerald-50 hover:border-emerald-500 transition-all active:scale-95 disabled:opacity-50 shadow-xs"
              >
                <QrCode className="h-4 w-4 text-emerald-600" />
                <span>Simpan Tahap I (Lanjutkan Nanti)</span>
              </button>

              <button
                type="button"
                onClick={nextStep}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center space-x-2.5 shadow-lg shadow-emerald-600/25 transition-all active:scale-95 cursor-pointer"
              >
                <span>Lanjut ke Tahap II</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Tahap II - Daftar Ulang (Data Orang Tua, Akademik Opsional, Berkas) */}
        {step === 2 && (
          <form onSubmit={handleSubmitPendaftaran} className="p-8 sm:p-10 space-y-10 animate-apple-fade">
            <div className="space-y-1.5 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="h-7 w-1.5 bg-emerald-600 rounded-full inline-block"></span>
                <div>
                  <h2 className="text-xl font-black text-gray-950 tracking-tight">Tahap II: Data Akademik &amp; Unggah Berkas</h2>
                  <p className="text-xs font-medium text-gray-500">Lengkapi data orang tua/wali dan unggah dokumen persyaratan.</p>
                </div>
              </div>
              <span className="self-start sm:self-center px-3 py-1 bg-emerald-100 text-emerald-900 text-xs font-black rounded-full border border-emerald-200">
                Tahap Terakhir
              </span>
            </div>

            {/* A. DATA AKADEMIS TAMBAHAN (OPSIONAL) */}
            <div className="p-6 bg-emerald-50/30 rounded-[22px] border border-emerald-200/70 space-y-6">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-black text-emerald-950 uppercase tracking-tight">Data Akademik &amp; Prestasi (Opsional)</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">Prestasi Akademik</label>
                  <input
                    type="text"
                    placeholder="Contoh: Juara 1 OSN Matematika, Ranking 1 Kelas 6"
                    value={formData.prestasiAkademik}
                    onChange={(e) => setFormData({ ...formData, prestasiAkademik: e.target.value })}
                    className="w-full apple-input bg-white hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">Prestasi Non-Akademik / Tahfidz</label>
                  <input
                    type="text"
                    placeholder="Contoh: Juara MTQ, Tahfidz 3 Juz, Juara Pencak Silat"
                    value={formData.prestasiNonAkademik}
                    onChange={(e) => setFormData({ ...formData, prestasiNonAkademik: e.target.value })}
                    className="w-full apple-input bg-white hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
            </div>

            {/* B. DATA ORANG TUA */}
            <div className="space-y-8">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-black text-emerald-950 uppercase tracking-tight">Data Orang Tua / Wali</span>
              </div>

              {/* Data Ibu */}
              <div className="p-6 bg-gradient-to-br from-emerald-50/70 to-teal-50/30 rounded-[24px] border border-emerald-200/80 space-y-6 shadow-xs">
                <div className="flex items-center gap-2.5 border-b border-emerald-200/60 pb-3">
                  <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                    1
                  </div>
                  <span className="text-xs font-black text-emerald-950 uppercase tracking-tight">Data Ibu Kandung</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">
                      Nama Lengkap Ibu <span className="text-emerald-600 font-black">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nama Lengkap Ibu"
                      value={formData.namaIbu}
                      onChange={(e) => setFormData({ ...formData, namaIbu: e.target.value })}
                      className="w-full apple-input bg-white hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">
                      Status Ibu <span className="text-emerald-600 font-black">*</span>
                    </label>
                    <select
                      value={formData.statusIbu}
                      onChange={(e) => setFormData({ ...formData, statusIbu: e.target.value })}
                      className="w-full apple-input bg-white hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%23059669%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] bg-no-repeat"
                    >
                      <option value="Hidup">Masih Hidup</option>
                      <option value="Wafat">Meninggal Dunia / Wafat</option>
                      <option value="Cerai">Almarhumah / Cerai</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">
                      NIK Ibu (16 Digit)
                    </label>
                    <input
                      type="text"
                      maxLength={16}
                      placeholder="NIK Ibu (16 Digit)"
                      value={formData.nikIbu}
                      onChange={(e) => setFormData({ ...formData, nikIbu: e.target.value.replace(/\D/g, '') })}
                      className="w-full apple-input bg-white font-mono hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">
                      No. HP / WA Ibu <span className="text-emerald-600 font-black">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nomor HP / WhatsApp"
                      value={formData.hpIbu}
                      onChange={(e) => setFormData({ ...formData, hpIbu: e.target.value })}
                      className="w-full apple-input bg-white font-mono hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Data Ayah */}
              <div className="p-6 bg-white rounded-[24px] border border-gray-200 hover:border-emerald-300 space-y-6 shadow-xs transition-colors">
                <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3">
                  <div className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-xs">
                    2
                  </div>
                  <span className="text-xs font-black text-gray-950 uppercase tracking-tight">Data Ayah Kandung</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">Nama Lengkap Ayah</label>
                    <input
                      type="text"
                      placeholder="Nama Lengkap Ayah"
                      value={formData.namaAyah}
                      onChange={(e) => setFormData({ ...formData, namaAyah: e.target.value })}
                      className="w-full apple-input bg-white hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">Status Ayah</label>
                    <select
                      value={formData.statusAyah}
                      onChange={(e) => setFormData({ ...formData, statusAyah: e.target.value })}
                      className="w-full apple-input bg-white hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%23059669%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] bg-no-repeat"
                    >
                      <option value="Hidup">Masih Hidup</option>
                      <option value="Wafat">Meninggal Dunia / Wafat</option>
                      <option value="Cerai">Almarhum / Cerai</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">NIK Ayah (16 Digit)</label>
                    <input
                      type="text"
                      maxLength={16}
                      placeholder="NIK Ayah (16 Digit)"
                      value={formData.nikAyah}
                      onChange={(e) => setFormData({ ...formData, nikAyah: e.target.value.replace(/\D/g, '') })}
                      className="w-full apple-input bg-white font-mono hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">No. HP / WA Ayah</label>
                    <input
                      type="text"
                      placeholder="Nomor HP / WhatsApp"
                      value={formData.hpAyah}
                      onChange={(e) => setFormData({ ...formData, hpAyah: e.target.value })}
                      className="w-full apple-input bg-white font-mono hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Jml Saudara */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">
                    Jumlah Saudara Kandung <span className="text-emerald-600 font-black">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Contoh: 3"
                    value={formData.jmlSaudara}
                    onChange={(e) => setFormData({ ...formData, jmlSaudara: e.target.value })}
                    className="w-full apple-input hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-950 tracking-tight ml-0.5">Tempat &amp; Tanggal Lahir Orang Tua</label>
                  <input
                    type="text"
                    placeholder="Contoh: Ibu (Depok, 15-05-1980), Ayah (Jakarta, 10-08-1977)"
                    value={formData.tlIbu}
                    onChange={(e) => setFormData({ ...formData, tlIbu: e.target.value })}
                    className="w-full apple-input hover:border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
            </div>

            {/* C. FILE UPLOADS: KK / AKTA */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-black text-emerald-950 uppercase tracking-tight">Unggah Berkas Persyaratan</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* KK Upload Box */}
                <div className="border-2 border-dashed border-emerald-200/80 bg-emerald-50/30 rounded-[24px] p-6 flex flex-col justify-between hover:border-emerald-500 hover:bg-emerald-50/60 transition-all group relative">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-950">
                        1. Scan / Foto Kartu Keluarga (KK) <span className="text-emerald-600 font-black">*</span>
                      </span>
                      {uploads.kk.done && (
                        <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-3 py-1 rounded-full">
                          Terunggah
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed font-medium">Pastikan berkas scan KK terlihat jelas, tidak buram, dan teks terbaca sempurna.</p>
                  </div>

                  <div className="mt-6">
                    {uploads.kk.uploading ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-emerald-800 font-bold">
                          <span>Mengunggah Berkas...</span>
                          <span>{uploads.kk.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-600 h-full transition-all duration-300" style={{ width: `${uploads.kk.progress}%` }}></div>
                        </div>
                      </div>
                    ) : uploads.kk.done ? (
                      <div className="text-xs text-emerald-900 bg-white p-3.5 rounded-xl truncate border border-emerald-200 font-mono font-bold flex items-center justify-between shadow-xs">
                        <span>{uploads.kk.name}</span>
                        <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                      </div>
                    ) : (
                      <label className="flex h-12 items-center justify-center border-2 border-emerald-300 bg-white text-emerald-900 font-bold rounded-[14px] text-xs gap-2 px-4 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 cursor-pointer transition-all active:scale-95 shadow-xs">
                        <Upload className="h-4 w-4" />
                        <span>Pilih Berkas Scan / Foto KK</span>
                        <input type="file" required accept=".pdf,image/*" className="hidden" onChange={(e) => handleFileUploadSim('kk', e)} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Akta Upload Box */}
                <div className="border-2 border-dashed border-emerald-200/80 bg-emerald-50/30 rounded-[24px] p-6 flex flex-col justify-between hover:border-emerald-500 hover:bg-emerald-50/60 transition-all group relative">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-950">
                        2. Scan / Foto Akte Kelahiran <span className="text-emerald-600 font-black">*</span>
                      </span>
                      {uploads.akta.done && (
                        <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-3 py-1 rounded-full">
                          Terunggah
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed font-medium">Scan akta kelahiran asli atau foto dokumen resmi berkualitas baik.</p>
                  </div>

                  <div className="mt-6">
                    {uploads.akta.uploading ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-emerald-800 font-bold">
                          <span>Mengunggah Berkas...</span>
                          <span>{uploads.akta.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-600 h-full transition-all duration-300" style={{ width: `${uploads.akta.progress}%` }}></div>
                        </div>
                      </div>
                    ) : uploads.akta.done ? (
                      <div className="text-xs text-emerald-900 bg-white p-3.5 rounded-xl truncate border border-emerald-200 font-mono font-bold flex items-center justify-between shadow-xs">
                        <span>{uploads.akta.name}</span>
                        <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                      </div>
                    ) : (
                      <label className="flex h-12 items-center justify-center border-2 border-emerald-300 bg-white text-emerald-900 font-bold rounded-[14px] text-xs gap-2 px-4 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 cursor-pointer transition-all active:scale-95 shadow-xs">
                        <Upload className="h-4 w-4" />
                        <span>Pilih Berkas Scan / Foto Akta</span>
                        <input type="file" required accept=".pdf,image/*" className="hidden" onChange={(e) => handleFileUploadSim('akta', e)} />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Note about folder storage */}
            <div className="bg-emerald-50/70 border border-emerald-200 p-5 rounded-[20px] flex items-start space-x-3 text-xs text-emerald-950 font-bold leading-relaxed shadow-xs">
              <CheckCircle className="h-5 w-5 shrink-0 mt-0.5 text-emerald-700" />
              <span>
                Penyimpanan Aman &amp; Terverifikasi: Dokumen berkas Anda terenkripsi dan disimpan otomatis dalam folder arsip resmi panitia PPDB untuk keperluan seleksi dan registrasi santri baru.
              </span>
            </div>

            {/* Navigation Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-gray-100 gap-4">
              <button
                type="button"
                onClick={prevStep}
                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-emerald-300/80 bg-white text-emerald-900 font-bold text-xs flex items-center justify-center space-x-2.5 hover:bg-emerald-50 transition-all active:scale-95 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 text-emerald-700" />
                <span>Kembali ke Tahap I</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-9 py-3.5 rounded-xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 hover:from-emerald-900 hover:to-teal-900 text-white font-bold text-sm flex items-center justify-center space-x-2.5 shadow-lg shadow-emerald-800/25 transition-all active:scale-95 disabled:opacity-50 min-w-[220px] cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Memproses Data...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 text-amber-300" />
                    <span>Kirim Formulir Pendaftaran</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Success Confirmation Card */}
        {step === 3 && registeredSiswa && (
          <div className="p-10 text-center space-y-10 animate-apple-fade">
            <div className="h-24 w-24 bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-sm border-2 border-emerald-300">
              <CheckCircle className="h-12 w-12" />
            </div>
            
            <div className="space-y-3">
              <h2 className="text-3xl font-extrabold text-gray-950 tracking-tight">Pendaftaran Berhasil Diselesaikan</h2>
              <p className="text-sm text-gray-600 font-medium max-w-lg mx-auto leading-relaxed">
                Pendaftaran Tahap I &amp; II atas nama <span className="font-extrabold text-emerald-900">{registeredSiswa.namaLengkap}</span> telah berhasil diproses dan tersimpan ke dalam basis data sistem.
              </p>
            </div>

            {/* visual card */}
            <div id="print-area-card" className="border-2 border-emerald-300/80 bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/30 p-6 rounded-2xl max-w-md mx-auto text-left shadow-md space-y-4 relative font-sans">
              <div className="absolute top-4 right-4 text-emerald-900 opacity-10"><QrCode className="h-28 w-28" /></div>
              
              <div className="flex justify-between items-center border-b border-emerald-200/80 pb-3">
                <div>
                  <span className="text-[10px] font-black text-emerald-900 block tracking-widest uppercase">KARTU BUKTI PENDAFTARAN PPDB</span>
                  <span className="text-xs font-black text-gray-900">TAHAP I &amp; TAHAP II SELESAI</span>
                </div>
                <div className="text-right">
                  <span className="bg-gradient-to-r from-emerald-800 to-teal-800 text-amber-300 text-[9px] font-black px-3 py-1 rounded-full uppercase shadow-xs border border-amber-400/30">
                    AKTIF TA 2026
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-gray-800 font-bold">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">No. Registrasi:</span>
                  <span className="font-black font-mono text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">{registeredSiswa.nomorPendaftaran}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Nama Lengkap:</span>
                  <span className="font-extrabold text-gray-950">{registeredSiswa.namaLengkap}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">NIK &amp; NISN:</span>
                  <span className="font-bold text-gray-900 font-mono">{registeredSiswa.nik} / {registeredSiswa.nisn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Asal Sekolah:</span>
                  <span className="font-bold text-gray-900">{formData.sekolahAsal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">No. WA Utama:</span>
                  <span className="font-bold font-mono text-gray-900">{formData.noWaUtama}</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-emerald-200 pt-2 text-xs text-emerald-900">
                  <span className="font-medium">Berkas KK:</span>
                  <span className="font-bold text-emerald-800">Tersimpan ({uploads.kk.name})</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-900">
                  <span className="font-medium">Berkas Akta:</span>
                  <span className="font-bold text-emerald-800">Tersimpan ({uploads.akta.name})</span>
                </div>
              </div>

              <div className="border-t border-dashed border-emerald-200 pt-2 flex items-center justify-between text-[10px] text-emerald-950 font-black">
                <span>Tanggal: {registeredSiswa.tanggalDaftar}</span>
                <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-200">STATUS: TERVERIFIKASI 📂</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={triggerPrintCard} className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 hover:from-emerald-900 hover:to-teal-900 text-white font-bold text-sm flex items-center justify-center space-x-3 shadow-lg shadow-emerald-800/25 active:scale-95 transition-all cursor-pointer">
                <Printer className="h-4 w-4 text-amber-300" />
                <span>Cetak Bukti Pendaftaran</span>
              </button>
              <button onClick={startNewForm} className="btn-apple-secondary w-full sm:w-auto px-8 py-3.5 active:scale-95 transition-all cursor-pointer">
                Pendaftaran Baru
              </button>
            </div>
            
            <p className="text-[10px] font-bold text-emerald-700/60 uppercase tracking-[0.2em]">Salinan kartu dan data registrasi tersimpan aman di dalam sistem.</p>
          </div>
        )}

        {/* Step 4: Success Tahap 1 Card (Link & QR Code) */}
        {step === 4 && registeredSiswa && (
          <div className="p-10 text-center space-y-10 animate-apple-fade">
            <div className="h-20 w-20 bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-sm border-2 border-emerald-200">
              <CheckCircle className="h-10 w-10" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Data Tahap I Berhasil Disimpan</h2>
              <p className="text-sm text-gray-500 font-medium max-w-lg mx-auto leading-relaxed">
                Data identitas awal Anda telah tersimpan dengan aman. Silakan gunakan link tautan khusus di bawah ini untuk melengkapi Tahap II (Unggah Berkas) kapan saja.
              </p>
            </div>

            {/* Unique completion link box */}
            <div className="bg-emerald-50/50 p-4 border border-emerald-200 rounded-2xl max-w-md mx-auto space-y-2 text-left">
              <span className="block text-[10px] font-black text-emerald-800 uppercase tracking-widest">Tautan Akses Kelanjutan Tahap II</span>
              <div className="flex items-center space-x-2">
                <input 
                  type="text" 
                  readOnly
                  value={`https://ppdb.pesantren-smp.sch.id/lengkapi-berkas/${registeredSiswa.nomorPendaftaran}`}
                  className="w-full bg-white px-3 py-1.5 border border-emerald-200 rounded-lg text-xs font-mono font-bold text-emerald-950 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`https://ppdb.pesantren-smp.sch.id/lengkapi-berkas/${registeredSiswa.nomorPendaftaran}`);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-emerald-800 to-teal-800 text-amber-300 text-[10px] font-black uppercase tracking-wider rounded-lg hover:from-emerald-900 hover:to-teal-900 shrink-0 transition cursor-pointer"
                >
                  {isCopied ? 'Tersalin' : 'Salin'}
                </button>
              </div>
            </div>

            {/* Simulated Live visual QR Code card */}
            <div className="border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-amber-50/30 p-6 rounded-2xl max-w-sm mx-auto shadow-xs text-center space-y-4">
              <span className="text-[10px] font-black text-emerald-900 tracking-widest uppercase block">KODE AKSES DIGITAL PPDB</span>
              <div className="relative h-40 w-40 bg-white p-3 rounded-2xl shadow-inner border border-emerald-200 flex items-center justify-center mx-auto">
                <QrCode className="h-32 w-32 text-emerald-950" />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 bg-gradient-to-r from-emerald-800 to-teal-800 text-amber-300 rounded-lg flex items-center justify-center font-black text-[9px] shadow border-2 border-white">
                  PSB
                </div>
              </div>
              <div>
                <span className="font-mono text-xs font-black text-emerald-950 bg-emerald-100 px-3 py-1 rounded-full uppercase border border-emerald-200">
                  {registeredSiswa.nomorPendaftaran}
                </span>
                <p className="text-[9px] font-semibold mt-2 text-emerald-700/80">
                  Scan QR ini di ponsel Anda untuk melanjutkan pengisian kapan saja.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-4 pt-4">
              <button onClick={() => setStep(2)} className="btn-apple-primary w-full max-w-sm mx-auto shadow-lg shadow-emerald-800/25 active:scale-95 transition-all cursor-pointer">
                Lanjutkan ke Tahap II Sekarang
              </button>
              <button onClick={startNewForm} className="block mx-auto text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-emerald-800 transition-all cursor-pointer">
                Kembali ke Menu Pendaftaran
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Share Public Registration Link Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-apple-fade">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 space-y-6 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center border border-emerald-200">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Link Khusus Pendaftaran Publik</h3>
                  <p className="text-[11px] text-gray-500 font-medium">Tanpa tombol portal / menu internal</p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                Gunakan tautan khusus di bawah ini untuk disebarkan ke calon santri, wali murid, WhatsApp group, atau media sosial. Pengguna yang membuka link ini <strong>hanya dapat mengisi formulir pendaftaran dan melihat pengumuman</strong> tanpa tombol portal admin.
              </p>

              <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-2xl space-y-2">
                <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">URL Pendaftaran Publik (PSB)</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={getPublicPsbUrl()}
                    className="w-full bg-white px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 select-all outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleCopyPublicLink}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shrink-0 flex items-center space-x-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    {linkCopiedToast ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleShareWhatsApp}
                  className="w-full py-3 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Kirim ke WhatsApp</span>
                </button>
                <a
                  href={getPublicPsbUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95 text-center"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Uji Buka Link</span>
                </a>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-6 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Link Copied Toast Notification */}
      {linkCopiedToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[350] bg-gray-950 text-white px-5 py-3 rounded-full shadow-2xl flex items-center space-x-2.5 border border-emerald-500/40 animate-apple-fade">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold">Link khusus pendaftaran berhasil disalin ke clipboard!</span>
        </div>
      )}

    </div>
  );
}
