import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserCheck, GraduationCap, Building2, TrendingUp, 
  BarChart3, PieChart as PieChartIcon, Calendar, ArrowUpRight,
  School, BookOpen, Clock, Activity, MapPin, XCircle,
  ChevronRight, CheckCircle2, AlertCircle, AlertTriangle, HelpCircle,
  Download, Trash2, Edit, Plus,
  Sparkles, Layers, Award, RefreshCw, X, Check,
  BookMarked, ShieldCheck, Heart, Star, Target,
  TrendingDown, CheckCircle, Flame, Bookmark,
  Search, List, UserX, CalendarDays, Filter,
  Landmark, Hash, FileBadge, Copy, CheckCheck, Mail
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend
} from 'recharts';

interface DashboardUtamaProps {
  students: any[];
  ustadzList: any[];
  pendaftar: any[];
  config: any;
  tahunAjaran?: string;
  kelas?: any[];
  studentsNeedingExam?: any[];
  onNavigateToTahfidz?: () => void;
  academicCalendar?: any[];
  setAcademicCalendar?: (cal: any[]) => void;
  pondokAgenda?: any[];
  setPondokAgenda?: (agenda: any[]) => void;
  isEditable?: boolean;
  isReadOnly?: boolean;
  schoolProfile?: any;
}

// Custom Tooltip for Recharts
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/50 text-xs">
        <p className="font-black tracking-wide text-slate-300 uppercase mb-1">{label || payload[0]?.name}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-2 font-bold my-0.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill || '#10b981' }} />
            <span className="text-slate-300">{entry.name || 'Jumlah'}:</span>
            <span className="text-white font-black">{entry.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardUtama({ 
  students = [], 
  ustadzList = [], 
  pendaftar = [], 
  config = {}, 
  tahunAjaran,
  kelas = [],
  studentsNeedingExam = [],
  onNavigateToTahfidz,
  academicCalendar = [],
  setAcademicCalendar,
  pondokAgenda = [],
  setPondokAgenda,
  isEditable = false,
  isReadOnly = false,
  schoolProfile
}: DashboardUtamaProps) {
  
  // 1. ALL HOOKS: STATE INITIALIZATIONS AT THE TOP
  // School profile state (diambil dari Konfigurasi Profil & Jenjang Lembaga)
  const [profile, setProfile] = useState<any>(() => {
    if (schoolProfile && (schoolProfile.nama || schoolProfile.npsn || schoolProfile.noStatistik || (Array.isArray(schoolProfile.jenjangList) && schoolProfile.jenjangList.length > 0))) {
      return schoolProfile;
    }
    try {
      const saved = localStorage.getItem('db_school_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      nama: 'PONDOK PESANTREN MODERN AL-IHSAN',
      noStatistik: '510032010123',
      npsn: '69987654',
      jenjang: 'SMP / MTs & MA / Muadalah',
      kepsek: 'KH. M. Al-Ihsan',
      alamat: 'Jl. Raya Pondok Pesantren No. 01',
      email: 'admin@pesantren.sch.id',
      telepon: '0812-3456-7890',
      jumlahSaran: 'Lembaga Pendidikan Pesantren Terakreditasi & Mandiri',
      jenjangList: []
    };
  });

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    if (!text || text === '-') return;
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Local state for Agenda & Calendar with localStorage sync
  const [localCal, setLocalCal] = useState<any[]>(() => {
    let baseCal: any[] = [];
    if (academicCalendar && academicCalendar.length > 0) {
      baseCal = [...academicCalendar];
    } else {
      try {
        const saved = localStorage.getItem('db_academic_calendar');
        if (saved) baseCal = JSON.parse(saved);
      } catch (e) {}
    }
    if (!baseCal || baseCal.length === 0) {
      baseCal = [
        { id: '1', date: '2026-07-15', event: 'Mulai KBM Ganjil', type: 'academic' },
        { id: '2', date: '2026-08-17', event: 'Upacara HUT RI', type: 'event' },
        { id: '3', date: '2026-08-25', event: 'Ujian Bulanan I', type: 'exam' },
      ];
    }
    try {
      const savedEv = localStorage.getItem('db_event_attendance');
      if (savedEv) {
        const parsedEv = JSON.parse(savedEv);
        if (Array.isArray(parsedEv)) {
          parsedEv.forEach(ev => {
            if (ev.tanggal && ev.nama && !baseCal.some(c => c.event === ev.nama && c.date === ev.tanggal)) {
              baseCal.push({
                id: ev.id || `ev-${ev.tanggal}-${ev.nama}`,
                date: ev.tanggal,
                event: ev.nama,
                type: 'event'
              });
            }
          });
        }
      }
    } catch (e) {}
    return baseCal;
  });

  const [localAgenda, setLocalAgenda] = useState<any[]>(() => {
    let source = (pondokAgenda && pondokAgenda.length > 0) ? pondokAgenda : null;
    if (!source) {
      try {
        const saved = localStorage.getItem('db_pondok_agenda');
        if (saved) source = JSON.parse(saved);
      } catch (e) {}
    }
    if (Array.isArray(source) && source.length > 0) {
      return source.map((item: any, idx: number) => ({
        ...item,
        id: String(item.id || `agenda-${idx + 1}`),
        task: String(item.task || ''),
        time: String(item.time || '')
      }));
    }
    return [
      { id: '1', time: '04:00', task: 'Tahajjud & Subuh Berjamaah', category: 'ibadah' },
      { id: '2', time: '05:30', task: 'Halaqah Tahfidz Pagi', category: 'ibadah' },
      { id: '3', time: '07:30', task: 'KBM Formal Madrasah', category: 'akademik' },
      { id: '4', time: '13:00', task: 'Istirahat & Qailulah', category: 'istirahat' },
      { id: '5', time: '16:00', task: 'Halaqah Sore', category: 'ibadah' },
    ];
  });

  // State for Teacher Attendance Period & Filter
  const [teacherAttendPeriod, setTeacherAttendPeriod] = useState<'mingguan' | 'bulanan'>('mingguan');
  const [teacherAttendSearch, setTeacherAttendSearch] = useState('');
  const [teacherAttendStatusFilter, setTeacherAttendStatusFilter] = useState<'all' | 'Izin' | 'Sakit' | 'Alpa'>('all');

  // State for Student Tahfidz Juz View
  const [studentJuzClassFilter, setStudentJuzClassFilter] = useState('Semua');
  const [studentJuzViewMode, setStudentJuzViewMode] = useState<'chart' | 'table'>('chart');
  const [studentJuzSearch, setStudentJuzSearch] = useState('');

  // Form State for Calendar
  const [showCalendarForm, setShowCalendarForm] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<any>(null);
  const [calForm, setCalForm] = useState({ date: new Date().toISOString().split('T')[0], event: '', type: 'academic' as any });

  // Form State for Agenda
  const [showAgendaForm, setShowAgendaForm] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState<any>(null);
  const [ageForm, setAgeForm] = useState({ time: '05:00', task: '', category: 'ibadah' as any });

  // 2. ALL HOOKS: EFFECTS
  useEffect(() => {
    if (schoolProfile) {
      setProfile(schoolProfile);
    }
  }, [schoolProfile]);

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('db_school_profile');
        if (saved) setProfile(JSON.parse(saved));
      } catch (e) {}
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (academicCalendar && academicCalendar.length > 0) {
      setLocalCal(prev => {
        const merged = [...academicCalendar];
        try {
          const savedEv = localStorage.getItem('db_event_attendance');
          if (savedEv) {
            const parsedEv = JSON.parse(savedEv);
            if (Array.isArray(parsedEv)) {
              parsedEv.forEach(ev => {
                if (ev.tanggal && ev.nama && !merged.some(c => c.event === ev.nama && c.date === ev.tanggal)) {
                  merged.push({
                    id: ev.id || `ev-${ev.tanggal}-${ev.nama}`,
                    date: ev.tanggal,
                    event: ev.nama,
                    type: 'event'
                  });
                }
              });
            }
          }
        } catch (e) {}
        return merged;
      });
    }
  }, [academicCalendar]);

  useEffect(() => {
    if (pondokAgenda && pondokAgenda.length > 0) {
      setLocalAgenda(pondokAgenda.map((item: any, idx: number) => ({
        ...item,
        id: String(item.id || `agenda-${idx + 1}`),
        task: String(item.task || ''),
        time: String(item.time || '')
      })));
    }
  }, [pondokAgenda]);

  // Compute 1-Juz Exam Candidates (Students with >= 20 pages Ziyadah setoran on target juz without 1-Juz exam)
  const activeExamCandidates = React.useMemo(() => {
    let tRecs: any[] = [];
    try {
      const saved = localStorage.getItem('db_tahfidz_records');
      if (saved) tRecs = JSON.parse(saved);
    } catch (e) {}

    if (!students || students.length === 0) return studentsNeedingExam || [];

    const juzSequence = ['30', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29'];

    const filtered = students.filter(s => {
      const studentRecs = tRecs.filter(r => r.siswaId === s.id);
      let currentJuzIndex = 0;
      for (let i = 0; i < juzSequence.length; i++) {
        const hasPassedExam = studentRecs.some(r => r.noJuz === juzSequence[i] && r.jenisSetoran === 'Imtihan' && (r.jenisUjian === '1 Juz' || r.jenisUjian === '5 Juz'));
        if (hasPassedExam) {
          currentJuzIndex = i + 1;
        } else {
          break;
        }
      }
      if (currentJuzIndex >= juzSequence.length) return false;

      const targetJuz = juzSequence[currentJuzIndex];
      const pagesInTarget = studentRecs
        .filter(r => r.noJuz === targetJuz && r.jenisSetoran === 'Ziyadah')
        .reduce((acc, curr) => acc + (Number(curr.jumlahHalaman) || 0), 0);

      return pagesInTarget >= 20;
    }).map(s => {
      const studentRecs = tRecs.filter(r => r.siswaId === s.id);
      let curIdx = 0;
      for (let i = 0; i < juzSequence.length; i++) {
        const hasPassedExam = studentRecs.some(r => r.noJuz === juzSequence[i] && r.jenisSetoran === 'Imtihan' && (r.jenisUjian === '1 Juz' || r.jenisUjian === '5 Juz'));
        if (hasPassedExam) curIdx = i + 1;
        else break;
      }
      const targetJuz = juzSequence[curIdx];
      const pagesInTarget = studentRecs
        .filter(r => r.noJuz === targetJuz && r.jenisSetoran === 'Ziyadah')
        .reduce((acc, curr) => acc + (Number(curr.jumlahHalaman) || 0), 0);
      return {
        ...s,
        targetJuz,
        pagesInTarget
      };
    });

    return filtered.length > 0 ? filtered : (studentsNeedingExam || []);
  }, [students, studentsNeedingExam]);

  // 2. Data Aggregation & Active Academic Year Calculations
  const activeYear = tahunAjaran || config.tahunAjaran || '2025/2026';
  const cleanActiveYear = activeYear.split(' ')[0].trim();

  // Total Students Registered (Counts all students with all statuses)
  const totalStudents = students.length;
  
  // Filter Active Students strictly (status is 'Aktif' / 'diterima')
  const siswaAktifList = students.filter(s => {
    const status = String(s.status || s.statusSiswa || 'Aktif').trim().toLowerCase();
    const isStatusActive = status === 'aktif' || status === 'diterima';

    const sYear = String(s.academicYear || s.tahunAjaran || '').trim();
    const isYearMatch = !sYear || 
      sYear === cleanActiveYear || 
      sYear.startsWith(cleanActiveYear) || 
      sYear.includes(cleanActiveYear) ||
      (Array.isArray(s.academicHistory) && s.academicHistory.some((h: any) => h.academicYear && h.academicYear.includes(cleanActiveYear)));

    return isStatusActive && isYearMatch;
  });
  const siswaAktif = siswaAktifList.length;

  // Male & Female Active Students in Active Year
  const activeMaleCount = siswaAktifList.filter(s => {
    const g = (s.gender || s.jenisKelamin || '').toLowerCase();
    return g === 'laki-laki' || g === 'l' || g === 'pria';
  }).length;
  const activeFemaleCount = Math.max(0, siswaAktif - activeMaleCount);

  // Yatim, Piatu, & Yatim Piatu Active Students
  const isDeceased = (status?: string) => {
    if (!status) return false;
    const s = String(status).toLowerCase().trim();
    return s.includes('meninggal') || s.includes('wafat') || s.includes('mati') || s.includes('almarhum') || s.includes('alm');
  };

  const isYatimPiatu = (s: any) => {
    const ayahMeninggal = isDeceased(s.statusAyah);
    const ibuMeninggal = isDeceased(s.statusIbu);
    const rawStatus = String(s.statusYatim || s.keteranganYatim || s.statusKeluarga || s.statusSosial || '').toLowerCase();
    return (
      (ayahMeninggal && ibuMeninggal) ||
      rawStatus.includes('yatim piatu') ||
      rawStatus.includes('yatim-piatu') ||
      rawStatus === 'yp'
    );
  };

  const isYatim = (s: any) => {
    if (isYatimPiatu(s)) return false;
    const ayahMeninggal = isDeceased(s.statusAyah);
    const rawStatus = String(s.statusYatim || s.keteranganYatim || s.statusKeluarga || s.statusSosial || '').toLowerCase();
    return (
      ayahMeninggal ||
      rawStatus === 'yatim' ||
      (rawStatus.includes('yatim') && !rawStatus.includes('piatu'))
    );
  };

  const isPiatu = (s: any) => {
    if (isYatimPiatu(s)) return false;
    const ibuMeninggal = isDeceased(s.statusIbu);
    const rawStatus = String(s.statusYatim || s.keteranganYatim || s.statusKeluarga || s.statusSosial || '').toLowerCase();
    return (
      ibuMeninggal ||
      rawStatus === 'piatu'
    );
  };

  const yatimPiatuCount = siswaAktifList.filter(s => isYatimPiatu(s)).length;
  const yatimCount = siswaAktifList.filter(s => isYatim(s)).length;
  const piatuCount = siswaAktifList.filter(s => isPiatu(s)).length;

  // Active Teachers
  const ustadzAktifList = ustadzList.filter(u => (u.statusUstadz || 'Aktif') === 'Aktif');
  const ustadzAktif = ustadzAktifList.length || ustadzList.length;

  const ustadzMaleCount = ustadzAktifList.filter(u => {
    const jk = String(u.jenisKelamin || u.gender || u.jk || '').toLowerCase().trim();
    return jk.startsWith('l') || jk === 'pria' || jk === 'putra' || jk === 'laki-laki' || jk === 'laki' || jk === 'ikhwan';
  }).length;

  const ustadzFemaleCount = ustadzAktifList.filter(u => {
    const jk = String(u.jenisKelamin || u.gender || u.jk || '').toLowerCase().trim();
    return jk.startsWith('p') || jk === 'wanita' || jk === 'putri' || jk === 'perempuan' || jk === 'akhwat';
  }).length;

  const ustadzMale = (ustadzMaleCount > 0 || ustadzFemaleCount > 0)
    ? (ustadzMaleCount > 0 ? ustadzMaleCount : Math.max(0, ustadzAktif - ustadzFemaleCount))
    : Math.ceil(ustadzAktif * 0.65);
  const ustadzFemale = (ustadzMaleCount > 0 || ustadzFemaleCount > 0)
    ? (ustadzFemaleCount > 0 ? ustadzFemaleCount : Math.max(0, ustadzAktif - ustadzMaleCount))
    : Math.max(0, ustadzAktif - ustadzMale);

  // Helper for grouping
  const groupBy = (array: any[], key: string) => {
    return array.reduce((acc: any, obj) => {
      const val = obj[key] || 'Lainnya';
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});
  };

  // 1. Rombel Distribution for Active Academic Year
  const activeClassesFromMaster = kelas.filter(k => 
    !k.academicYear || 
    k.academicYear === cleanActiveYear || 
    k.academicYear === activeYear || 
    k.academicYear.includes(cleanActiveYear)
  );

  const rombelCounts = groupBy(siswaAktifList, 'kelas');

  const activeRombelSet = new Set<string>();
  activeClassesFromMaster.forEach(k => {
    if (k.nama && k.nama !== 'Belum Diatur' && k.nama !== 'Mutasi Keluar') {
      activeRombelSet.add(k.nama);
    }
  });
  Object.keys(rombelCounts).forEach(k => {
    if (k && k !== 'Belum Diatur' && k !== 'Mutasi Keluar' && k !== 'Lainnya') {
      activeRombelSet.add(k);
    }
  });

  const rombelColors = ['#059669', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#d97706', '#f59e0b', '#e11d48', '#06b6d4'];
  const rombelData = Array.from(activeRombelSet)
    .map((k, i) => ({ 
      name: k, 
      count: rombelCounts[k] || 0,
      color: rombelColors[i % rombelColors.length]
    }))
    .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { numeric: true }));

  const totalRombel = rombelData.length || activeClassesFromMaster.length || kelas.length;

  // 2. PPDB Applicants for Active Academic Year
  const pendaftarActiveYear = pendaftar.filter(p => {
    const pYear = String(p.academicYear || p.tahunAjaran || '').trim();
    return !pYear || pYear.includes(cleanActiveYear) || pYear.startsWith(cleanActiveYear);
  });
  const totalApplicants = pendaftarActiveYear.length || pendaftar.length;
  const pendaftarLulus = (pendaftarActiveYear.length > 0 ? pendaftarActiveYear : pendaftar).filter(p => p.status === 'Lulus' || p.status === 'Diterima').length;
  const pendaftarPending = (pendaftarActiveYear.length > 0 ? pendaftarActiveYear : pendaftar).filter(p => p.status === 'Pending' || p.status === 'Menunggu').length;
  const pendaftarWawancara = (pendaftarActiveYear.length > 0 ? pendaftarActiveYear : pendaftar).filter(p => p.status === 'Wawancara').length;
  const pendaftarDitolak = (pendaftarActiveYear.length > 0 ? pendaftarActiveYear : pendaftar).filter(p => p.status === 'Ditolak').length;

  // 3. Jenjang Distribution for Active Academic Year
  const jenjangCounts = groupBy(siswaAktifList.map(s => {
    if (!s.jenjang && s.kelas) {
      const match = kelas.find(k => k.nama === s.kelas);
      if (match) return { ...s, jenjang: match.jenjang };
      if (s.kelas.toUpperCase().includes('SMP') || s.kelas.includes('7') || s.kelas.includes('8') || s.kelas.includes('9')) return { ...s, jenjang: 'SMP / Wustha' };
      if (s.kelas.toUpperCase().includes('SMA') || s.kelas.includes('10') || s.kelas.includes('11') || s.kelas.includes('12')) return { ...s, jenjang: 'SMA / Ulya' };
    }
    return s;
  }), 'jenjang');

  const jenjangColors = ['#059669', '#2563eb', '#7c3aed', '#d97706', '#e11d48', '#0891b2'];
  const jenjangData = Object.keys(jenjangCounts).map((k, i) => ({ 
    name: k || 'Lainnya', 
    count: jenjangCounts[k],
    color: jenjangColors[i % jenjangColors.length]
  }));

  // 4. Student Gender Donut Data
  const studentGenderData = [
    { name: 'Santri Putra (Laki-laki)', value: activeMaleCount, color: '#0284c7' },
    { name: 'Santri Putri (Perempuan)', value: activeFemaleCount, color: '#ec4899' },
  ];

  // 5. Provincial Geographic Data for Active Academic Year
  const realProvCounts = groupBy(siswaAktifList.filter(s => s.provinsi && s.provinsi.trim() !== ''), 'provinsi');
  let geoData = Object.keys(realProvCounts).map((prov, i) => ({
    name: prov,
    value: realProvCounts[prov],
    color: ['#059669', '#2563eb', '#7c3aed', '#d97706', '#0891b2', '#e11d48'][i % 6]
  })).sort((a, b) => b.value - a.value).slice(0, 6);

  if (geoData.length === 0 && siswaAktif > 0) {
    geoData = [
      { name: 'Jawa Barat', value: Math.ceil(siswaAktif * 0.42), color: '#059669' },
      { name: 'DKI Jakarta', value: Math.ceil(siswaAktif * 0.24), color: '#2563eb' },
      { name: 'Banten', value: Math.ceil(siswaAktif * 0.16), color: '#7c3aed' },
      { name: 'Jawa Tengah', value: Math.ceil(siswaAktif * 0.10), color: '#d97706' },
      { name: 'Jawa Timur', value: Math.ceil(siswaAktif * 0.05), color: '#0891b2' },
      { name: 'Lainnya', value: Math.max(1, Math.floor(siswaAktif * 0.03)), color: '#e11d48' },
    ];
  }

  // Teacher Education Levels
  const eduCounts = groupBy(ustadzAktifList, 'pendidikanTerakhir');
  const teacherEduData = Object.keys(eduCounts).map((k, i) => ({ 
    name: k || 'S1', 
    value: eduCounts[k],
    color: ['#059669', '#2563eb', '#d97706', '#e11d48', '#7c3aed'][i % 5]
  }));

  // Teacher Academic Tasks
  const taskCounts = groupBy(ustadzAktifList, 'tugasAkademik');
  const teacherTaskData = Object.keys(taskCounts).map((k, i) => ({ 
    name: k || 'Tahfidz', 
    value: taskCounts[k],
    color: ['#047857', '#0284c7', '#6d28d9', '#b45309', '#be123c'][i % 5]
  }));

  // Teacher Residency Position (Mukim vs Non-Mukim)
  const mukimCount = ustadzAktifList.filter(u => String(u.posisi || '').toLowerCase().includes('mukim') && !String(u.posisi || '').toLowerCase().includes('non')).length;
  const nonMukimCount = ustadzAktif - mukimCount;

  // Teacher Attendance History & Statistics
  const teacherAttendanceData = useMemo(() => {
    let records: any[] = [];
    try {
      const saved = localStorage.getItem('db_teachers_attendance_history');
      if (saved) records = JSON.parse(saved);
    } catch (e) {}

    const activeTeachers = ustadzAktifList.length > 0 ? ustadzAktifList : (ustadzList && ustadzList.length > 0 ? ustadzList : [
      { id: 'u-1', nama: 'Ustadz Ahmad Fauzi, S.Pd.I', tugasAkademik: 'Tahfidz Al-Qur\'an', jabatan: 'Guru Senior' },
      { id: 'u-2', nama: 'Ustadzah Siti Aminah, Lc', tugasAkademik: 'Bahasa Arab', jabatan: 'Guru Mata Pelajaran' },
      { id: 'u-3', nama: 'Ustadz Muhammad Rizky, M.Ag', tugasAkademik: 'Ushul Fiqih & Hadits', jabatan: 'Guru' },
      { id: 'u-4', nama: 'Ustadz Hasan Basri, S.Pd', tugasAkademik: 'Nahwu Sharaf', jabatan: 'Guru' },
      { id: 'u-5', nama: 'Ustadzah Nurul Hidayah, S.Th.I', tugasAkademik: 'Tahsin & Tajwid', jabatan: 'Guru' },
      { id: 'u-6', nama: 'Ustadz Abdullah Yahya, Lc', tugasAkademik: 'Tafsir Jalalain', jabatan: 'Guru' }
    ]);

    // If records are empty or too sparse, generate demo records matching the active teachers
    if (!records || records.length === 0) {
      const today = new Date();
      const demoRecords: any[] = [];
      const daysCount = 30;
      
      for (let d = 0; d < daysCount; d++) {
        const dateObj = new Date(today);
        dateObj.setDate(today.getDate() - d);
        // Skip Sunday
        if (dateObj.getDay() === 0) continue;
        const dateStr = dateObj.toISOString().split('T')[0];
        
        activeTeachers.forEach((t, tIdx) => {
          let status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa' = 'Hadir';
          let ket = 'Hadir mengajar';
          const seed = (tIdx * 7 + d * 11) % 35;
          if (seed === 1) {
            status = 'Izin';
            ket = 'Izin keperluan dinas luar';
          } else if (seed === 2) {
            status = 'Sakit';
            ket = 'Sakit flu & istirahat';
          } else if (seed === 3 && d % 7 === 0) {
            status = 'Alpa';
            ket = 'Tanpa pemberitahuan';
          }

          demoRecords.push({
            id: `ta-seed-${t.id}-${dateStr}`,
            teacherId: t.id,
            tanggal: dateStr,
            status,
            hisoh: status === 'Hadir' ? 4 : 0,
            keterangan: ket,
            academicYear: tahunAjaran || '2026/2027'
          });
        });
      }
      records = demoRecords;
    }

    // Determine Date range
    const now = new Date();
    const startDate = new Date(now);
    if (teacherAttendPeriod === 'mingguan') {
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate.setDate(now.getDate() - 30);
    }
    const startStr = startDate.toISOString().split('T')[0];
    const nowStr = now.toISOString().split('T')[0];

    const filteredRecords = records.filter(r => {
      if (!r.tanggal) return false;
      return r.tanggal >= startStr && r.tanggal <= nowStr && r.status !== 'Belum';
    });

    const countHadir = filteredRecords.filter(r => r.status === 'Hadir').length;
    const countIzin = filteredRecords.filter(r => r.status === 'Izin').length;
    const countSakit = filteredRecords.filter(r => r.status === 'Sakit').length;
    const countAlpa = filteredRecords.filter(r => r.status === 'Alpa').length;
    const totalRecorded = countHadir + countIzin + countSakit + countAlpa;

    const rateHadir = totalRecorded > 0 ? ((countHadir / totalRecorded) * 100).toFixed(1) : '100';

    // Pie Chart Data
    const pieData = [
      { name: 'Hadir', value: countHadir, color: '#10b981', fill: '#10b981' },
      { name: 'Izin', value: countIzin, color: '#f59e0b', fill: '#f59e0b' },
      { name: 'Sakit', value: countSakit, color: '#0ea5e9', fill: '#0ea5e9' },
      { name: 'Alpa', value: countAlpa, color: '#f43f5e', fill: '#f43f5e' },
    ].filter(d => d.value > 0);

    // Absent teachers list (Izin, Sakit, Alpa)
    const absentRecords = filteredRecords
      .filter(r => r.status === 'Izin' || r.status === 'Sakit' || r.status === 'Alpa')
      .map(r => {
        const ustadz = activeTeachers.find(u => u.id === r.teacherId);
        return {
          ...r,
          teacherName: ustadz?.nama || r.nama || `Ustadz (ID: ${r.teacherId})`,
          teacherRole: ustadz?.tugasAkademik || ustadz?.jabatan || 'Guru',
          foto: ustadz?.foto
        };
      })
      .sort((a, b) => String(b?.tanggal || '').localeCompare(String(a?.tanggal || '')));

    return {
      records: filteredRecords,
      totalRecorded,
      countHadir,
      countIzin,
      countSakit,
      countAlpa,
      rateHadir,
      pieData,
      absentRecords
    };
  }, [teacherAttendPeriod, ustadzAktifList, ustadzList, tahunAjaran]);

  // Data Santri & Capaian Jumlah Juz yang Diperoleh
  const studentJuzList = useMemo(() => {
    let tRecs: any[] = [];
    try {
      const savedV2 = localStorage.getItem('db_tahfidz_records_v2');
      const savedV1 = localStorage.getItem('db_tahfidz_records');
      if (savedV2) tRecs = JSON.parse(savedV2);
      else if (savedV1) tRecs = JSON.parse(savedV1);
    } catch (e) {}

    const source = (siswaAktifList && siswaAktifList.length > 0 ? siswaAktifList : students);
    const list = source.map((s: any) => {
      let juz = 0;
      if (s.jumlahHafalan !== undefined && s.jumlahHafalan !== null && s.jumlahHafalan !== '') {
        const num = parseFloat(String(s.jumlahHafalan).replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) juz = num;
      }

      // Hitung juga dari riwayat catatan imtihan / kelulusan juz
      const sRecs = tRecs.filter((r: any) => r.siswaId === s.id || (r.namaSantri && r.namaSantri.toLowerCase() === (s.nama || '').toLowerCase()));
      const passedJuzSet = new Set<string>();
      sRecs.forEach((r: any) => {
        if (r.jenisSetoran === 'Imtihan' && (r.statusLulus === 'Lulus' || r.statusLulus === true || r.nilai === 'A' || r.nilai === 'B' || r.jenisUjian === '1 Juz' || r.jenisUjian === '5 Juz')) {
          if (r.noJuz) passedJuzSet.add(String(r.noJuz));
        }
      });
      if (passedJuzSet.size > juz) {
        juz = passedJuzSet.size;
      }

      return {
        id: s.id,
        nama: s.nama || 'Santri',
        nis: s.nis || s.nisn || '-',
        kelas: s.kelas || 'Belum Diatur',
        gender: s.gender || s.jenisKelamin || 'Laki-laki',
        jumlahJuz: juz,
        persentase: Math.min(100, Math.round((juz / 30) * 100))
      };
    });

    return list.sort((a, b) => b.jumlahJuz - a.jumlahJuz || String(a?.nama || '').localeCompare(String(b?.nama || '')));
  }, [students, siswaAktifList]);

  // Filtered Santri for Juz Display
  const filteredStudentJuz = React.useMemo(() => {
    return studentJuzList.filter(s => {
      const matchesClass = studentJuzClassFilter === 'Semua' || s.kelas === studentJuzClassFilter;
      const q = studentJuzSearch.toLowerCase().trim();
      const matchesSearch = !q || s.nama.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q) || s.kelas.toLowerCase().includes(q);
      return matchesClass && matchesSearch;
    });
  }, [studentJuzList, studentJuzClassFilter, studentJuzSearch]);

  // Summary Metrics for Juz
  const totalSantriWithHafalan = studentJuzList.filter(s => s.jumlahJuz > 0).length;
  const avgJuz = studentJuzList.length > 0 
    ? (studentJuzList.reduce((acc, curr) => acc + curr.jumlahJuz, 0) / studentJuzList.length).toFixed(1)
    : '0';
  const totalKhatam30 = studentJuzList.filter(s => s.jumlahJuz >= 30).length;

  // Chart Data for Students & Juz Acquired
  const studentJuzChartData = filteredStudentJuz.slice(0, 10).map(s => ({
    name: s.nama.length > 10 ? `${s.nama.slice(0, 9)}...` : s.nama,
    fullName: s.nama,
    kelas: s.kelas,
    nis: s.nis,
    jumlahJuz: s.jumlahJuz,
    target: 30
  }));

  // Handle Calendar Operations
  const handleSaveCalendar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calForm.date || !calForm.event.trim()) return;
    
    let updated: any[];
    if (editingCalendar) {
      updated = localCal.map(item => item.id === editingCalendar.id ? { ...item, ...calForm } : item);
    } else {
      const newItem = { ...calForm, id: `cal_${Date.now()}` };
      updated = [...localCal, newItem];
    }
    setLocalCal(updated);
    setAcademicCalendar?.(updated);
    try {
      localStorage.setItem('db_academic_calendar', JSON.stringify(updated));
    } catch (e) {}
    setShowCalendarForm(false);
    setEditingCalendar(null);
    setCalForm({ date: new Date().toISOString().split('T')[0], event: '', type: 'academic' });
  };

  const handleDeleteCalendar = (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus agenda akademik ini?')) return;
    const updated = localCal.filter(item => item.id !== id);
    setLocalCal(updated);
    setAcademicCalendar?.(updated);
    try {
      localStorage.setItem('db_academic_calendar', JSON.stringify(updated));
    } catch (e) {}
  };

  // Handle Agenda Operations
  const handleSaveAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ageForm.time || !ageForm.task.trim()) return;

    let updated: any[];
    if (editingAgenda) {
      updated = localAgenda.map(item => item.id === editingAgenda.id ? { ...item, ...ageForm } : item);
    } else {
      const newItem = { ...ageForm, id: `age_${Date.now()}` };
      updated = [...localAgenda, newItem];
    }
    setLocalAgenda(updated);
    setPondokAgenda?.(updated);
    try {
      localStorage.setItem('db_pondok_agenda', JSON.stringify(updated));
    } catch (e) {}
    setShowAgendaForm(false);
    setEditingAgenda(null);
    setAgeForm({ time: '05:00', task: '', category: 'ibadah' });
  };

  const handleDeleteAgenda = (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus jadwal agenda ini?')) return;
    const updated = localAgenda.filter(item => item.id !== id);
    setLocalAgenda(updated);
    setPondokAgenda?.(updated);
    try {
      localStorage.setItem('db_pondok_agenda', JSON.stringify(updated));
    } catch (e) {}
  };

  return (
    <div className="space-y-10 pb-20 animate-apple-fade">
      
      {/* 1. HERO BANNER HEADER / KOP LAMAN UTAMA */}
      <div className={`relative overflow-hidden rounded-2xl md:rounded-3xl px-5 py-4 md:px-6 md:py-4 transition-all duration-300 ${
        isReadOnly
          ? 'bg-gradient-to-r from-amber-50 via-yellow-50/90 to-amber-100/80 border-2 border-amber-300/80 text-amber-950 shadow-md'
          : 'bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 border border-emerald-500/20 text-white shadow-lg'
      }`}>
        {/* Background glow graphics */}
        <div className={`absolute -top-20 -right-20 h-64 w-64 rounded-full blur-2xl pointer-events-none ${
          isReadOnly ? 'bg-amber-300/20' : 'bg-emerald-500/15'
        }`} />
        <div className={`absolute -bottom-20 -left-20 h-64 w-64 rounded-full blur-2xl pointer-events-none ${
          isReadOnly ? 'bg-yellow-300/20' : 'bg-teal-500/15'
        }`} />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs ${
                isReadOnly 
                  ? 'bg-amber-200/80 border border-amber-300 text-amber-900' 
                  : 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-300'
              }`}>
                <Sparkles className={`h-3 w-3 ${isReadOnly ? 'text-amber-700' : 'text-emerald-400'}`} />
                TAHUN AJARAN {activeYear}
              </span>
              
              {isReadOnly ? (
                <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                  🔒 MODE READ-ONLY (TERKUNCI)
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3 text-teal-400" />
                  SISTEM AKADEMIK TERHUBUNG
                </span>
              )}
            </div>

            <h1 className={`text-xl md:text-2xl font-black tracking-tight leading-tight ${
              isReadOnly ? 'text-amber-950' : 'text-white'
            }`}>
              Dashboard Utama {isReadOnly ? (
                <span className="text-amber-800 font-black">SIM ALWA (Read-Only)</span>
              ) : (
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300">SIM ALWA</span>
              )}
            </h1>
            {isReadOnly && (
              <p className="text-[11px] font-bold text-amber-800/90 leading-tight">
                Tahun Ajaran ini berstatus Read-Only (Terkunci). Seluruh data disajikan sebagai arsip tampilan.
              </p>
            )}
          </div>

          {/* Quick Action Badges */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 md:self-center">
            {studentsNeedingExam.length > 0 && onNavigateToTahfidz && (
              <button
                onClick={onNavigateToTahfidz}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all active:scale-95 group cursor-pointer"
              >
                <Flame className="h-3.5 w-3.5 text-amber-200 animate-bounce" />
                <span>{studentsNeedingExam.length} Ujian Tahfidz</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
            
            <div className={`px-3.5 py-2 rounded-xl border flex items-center gap-2.5 shadow-2xs backdrop-blur-md ${
              isReadOnly
                ? 'bg-white/80 border-amber-300/80 text-amber-950'
                : 'bg-white/10 border-white/15 text-white shadow-inner'
            }`}>
              <Calendar className={`h-4 w-4 shrink-0 ${isReadOnly ? 'text-amber-700' : 'text-emerald-400'}`} />
              <div className="text-left">
                <p className={`text-[8px] font-black uppercase tracking-widest ${isReadOnly ? 'text-amber-800' : 'text-emerald-200'}`}>Hari & Tanggal</p>
                <p className={`text-[11px] font-black leading-tight ${isReadOnly ? 'text-amber-950' : 'text-white'}`}>
                  {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PERINGATAN WAJIB UJIAN TAHFIDZ 1 JUZ BANNER */}
      {activeExamCandidates.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border-2 border-amber-500/30 rounded-[2.5rem] p-6 sm:p-8 shadow-xl backdrop-blur-md animate-fadeIn space-y-5 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl text-white shadow-lg shadow-amber-500/30 shrink-0">
                <Flame className="h-7 w-7 animate-bounce" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <span>Peringatan Wajib Ujian Tahfidz 1 Juz</span>
                  <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-black shadow-xs">{activeExamCandidates.length} Santri</span>
                </h3>
                <p className="text-xs font-bold text-slate-600 mt-1">
                  Santri berikut telah menyelesaikan setoran 20 halaman (1 Juz) dan WAJIB mengikuti Ujian 1 Juz. <span className="text-amber-700 font-extrabold">(Peringatan ini otomatis hilang setelah siswa melaksanakan Ujian 1 Juz)</span>:
                </p>
              </div>
            </div>
            {onNavigateToTahfidz && (
              <button
                onClick={onNavigateToTahfidz}
                className="px-6 py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-600/20 transition-all flex items-center gap-2 shrink-0 cursor-pointer active:scale-95"
              >
                <span>🚀 Kelola &amp; Ujian Tahfidz</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {activeExamCandidates.map((s, idx) => (
              <div key={`d-exam-${s.id}-${idx}`} className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm flex items-center justify-between group hover:border-amber-400 transition-all">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 text-amber-800 flex items-center justify-center text-xs font-black uppercase shrink-0 border border-amber-200">
                    {s.nama ? s.nama.substring(0, 2) : 'ST'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-800 uppercase truncate">{s.nama}</p>
                    <p className="text-[10px] font-bold text-slate-500 truncate">
                      Rombel: <span className="text-slate-800 font-extrabold">{s.kelas || '-'}</span> &bull; Juz: <span className="text-amber-700 font-extrabold">{s.targetJuz || '30'}</span>
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg text-[9px] font-black uppercase shrink-0 border border-amber-200/80 ml-2">
                  {s.pagesInTarget || 20} Halaman
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: DATA TERDAFTAR DI KONFIGURASI JENJANG & 6 STATISTIK LEMBAGA UTAMA (MENYATU & DISAMPING) */}
      {(() => {
        const rawJenjang: any[] = Array.isArray(profile?.jenjangList) ? profile.jenjangList : [];
        const jenjangList = rawJenjang.length > 0
          ? rawJenjang
          : [
              {
                id: '1',
                nama: profile?.jenjang || 'WUSTHA',
                npsn: profile?.npsn && profile.npsn !== '-' ? profile.npsn : '23423232',
                noStatistik: profile?.noStatistik && profile.noStatistik !== '-' ? profile.noStatistik : '232322222222',
                kepala: profile?.kepsek || 'Nama Kepala'
              }
            ];

        return (
          <div className="space-y-6">
            
            {/* DATA IDENTITAS UTAMA PESANTREN & LEMBAGA (URUT KESAMPING - RINGKAS & KOMPAK) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Data Pesantren & Lembaga
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  1 Pesantren • {jenjangList.length} Lembaga / Jenjang
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-stretch">
                
                {/* 1. KARTU PESANTREN UTAMA */}
                <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-3.5 border border-indigo-500/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between text-left relative overflow-hidden group">
                  <div className="space-y-2.5">
                    {/* Header Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="h-6 w-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0 border border-indigo-400/40">
                          <Landmark className="h-3 w-3" />
                        </div>
                        <span className="text-[10px] font-black tracking-wider text-indigo-300 uppercase truncate">
                          Pesantren Utama
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[9px] font-black uppercase tracking-wider shrink-0">
                        Aktif
                      </span>
                    </div>

                    {/* Nama Pesantren */}
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-tight leading-snug line-clamp-2" title={profile?.nama || 'PONDOK PESANTREN MODERN AL-IHSAN'}>
                        {profile?.nama || 'PONDOK PESANTREN MODERN AL-IHSAN'}
                      </h3>
                    </div>
                  </div>

                  {/* Compact Info Badges: Statistik & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2.5 mt-2.5 border-t border-slate-800">
                    {/* No. Statistik Pesantren */}
                    <div className="bg-indigo-950/80 border border-indigo-500/40 rounded-xl p-2 flex items-center justify-between gap-1 shadow-inner">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-wider text-indigo-300">
                          No. Statistik:
                        </p>
                        <p className="text-xs font-mono font-black text-white tracking-wider truncate select-all">
                          {profile?.noStatistik && profile.noStatistik !== '-' ? profile.noStatistik : '-'}
                        </p>
                      </div>
                      {profile?.noStatistik && profile.noStatistik !== '-' && (
                        <button
                          type="button"
                          onClick={() => handleCopy(profile.noStatistik, 'profile_noStatistik')}
                          className="p-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white transition-all shadow-xs shrink-0 cursor-pointer"
                          title="Salin No. Statistik"
                        >
                          {copiedField === 'profile_noStatistik' ? (
                            <CheckCheck className="h-3 w-3 text-emerald-300" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Email */}
                    <div className="bg-cyan-950/80 border border-cyan-500/40 rounded-xl p-2 flex items-center justify-between gap-1 shadow-inner">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-wider text-cyan-300">
                          Email:
                        </p>
                        <p className="text-xs font-bold text-white truncate select-all" title={profile?.email || '-'}>
                          {profile?.email && profile.email !== '-' ? profile.email : '-'}
                        </p>
                      </div>
                      {profile?.email && profile.email !== '-' && (
                        <button
                          type="button"
                          onClick={() => handleCopy(profile.email, 'profile_email')}
                          className="p-1 rounded-lg bg-cyan-700 hover:bg-cyan-600 active:scale-95 text-white transition-all shadow-xs shrink-0 cursor-pointer"
                          title="Salin Email"
                        >
                          {copiedField === 'profile_email' ? (
                            <CheckCheck className="h-3 w-3 text-emerald-300" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. KARTU-KARTU LEMBAGA / JENJANG (BERJEJER KESAMPING) */}
                {jenjangList.map((jg: any, idx: number) => {
                  const npsnVal = jg.npsn && jg.npsn !== '-' ? jg.npsn : '-';
                  const nspVal = jg.noStatistik && jg.noStatistik !== '-' ? jg.noStatistik : '-';
                  const kepalaVal = jg.kepala && jg.kepala !== '-' ? jg.kepala : (profile?.kepsek || 'Kepala Jenjang');
                  const npsnFieldKey = `npsn_${jg.id || idx}`;
                  const nspFieldKey = `nsp_${jg.id || idx}`;

                  return (
                    <div 
                      key={jg.id || `jg-${idx}`}
                      className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/90 text-white rounded-2xl p-3.5 border border-indigo-400/30 hover:border-indigo-400/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between text-left group"
                    >
                      <div className="space-y-2.5">
                        {/* Header Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="h-6 w-6 rounded-lg bg-indigo-700 text-white flex items-center justify-center shadow-xs shrink-0 border border-indigo-400/40">
                              <BookOpen className="h-3 w-3" />
                            </div>
                            <span className="text-[10px] font-black tracking-wider text-indigo-300 uppercase truncate">
                              Lembaga / Jenjang
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-950 border border-indigo-500/40 text-[9px] font-extrabold text-indigo-200 truncate max-w-[130px] shrink-0" title={kepalaVal}>
                            {kepalaVal}
                          </span>
                        </div>

                        {/* Nama Jenjang */}
                        <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-tight leading-snug truncate" title={jg.nama || 'JENJANG'}>
                            {jg.nama || 'JENJANG'}
                          </h3>
                        </div>
                      </div>

                      {/* Compact Specs: NPSN & Statistik */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2.5 mt-2.5 border-t border-slate-800">
                        {/* NPSN */}
                        <div className="bg-indigo-950/80 hover:bg-indigo-900/60 border border-indigo-500/40 rounded-xl p-2 flex items-center justify-between gap-1 shadow-inner">
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-wider text-indigo-300">
                              NPSN:
                            </p>
                            <p className="text-xs font-mono font-black text-white tracking-wider truncate select-all">
                              {npsnVal}
                            </p>
                          </div>
                          {npsnVal !== '-' && (
                            <button
                              type="button"
                              onClick={() => handleCopy(npsnVal, npsnFieldKey)}
                              className="p-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white transition-all shadow-xs shrink-0 cursor-pointer"
                              title="Salin NPSN"
                            >
                              {copiedField === npsnFieldKey ? (
                                <CheckCheck className="h-3 w-3 text-emerald-300" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Statistik */}
                        <div className="bg-emerald-950/80 hover:bg-emerald-900/60 border border-emerald-500/40 rounded-xl p-2 flex items-center justify-between gap-1 shadow-inner">
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-wider text-emerald-300">
                              Statistik:
                            </p>
                            <p className="text-xs font-mono font-black text-white tracking-wider truncate select-all">
                              {nspVal}
                            </p>
                          </div>
                          {nspVal !== '-' && (
                            <button
                              type="button"
                              onClick={() => handleCopy(nspVal, nspFieldKey)}
                              className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition-all shadow-xs shrink-0 cursor-pointer"
                              title="Salin No. Statistik"
                            >
                              {copiedField === nspFieldKey ? (
                                <CheckCheck className="h-3 w-3 text-emerald-300" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>

            {/* 5 KARTU STATISTIK (TOTAL SANTRI, SANTRI AKTIF, DEWAN GURU, ROMBEL KELAS, PENDAFTAR PPDB) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 items-stretch">
              
              {/* Card 1: Total Santri (Purple) */}
              <div className="p-4 sm:p-5 rounded-2xl md:rounded-3xl bg-purple-50/70 hover:bg-purple-50 border-2 border-purple-300 shadow-sm hover:shadow-md transition-all flex flex-col justify-between text-left">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-purple-900">
                      Total Santri
                    </span>
                    <span className="h-3 w-3 rounded-full bg-purple-600 shrink-0 ring-4 ring-purple-200" />
                  </div>
                  <div className="flex items-baseline gap-1.5 my-1">
                    <span className="text-2xl sm:text-3xl font-black text-purple-950 tracking-tight">
                      {totalStudents}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-purple-800">
                      Santri
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-purple-200 text-xs font-black text-purple-900 truncate">
                  📚 {siswaAktif} Aktif • {Math.max(0, totalStudents - siswaAktif)} Alumni/Lain
                </div>
              </div>

              {/* Card 2: Santri Aktif (Green) */}
              <div className="p-4 sm:p-5 rounded-2xl md:rounded-3xl bg-emerald-50/70 hover:bg-emerald-50 border-2 border-emerald-300 shadow-sm hover:shadow-md transition-all flex flex-col justify-between text-left">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-900">
                      Santri Aktif
                    </span>
                    <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0 ring-4 ring-emerald-200" />
                  </div>
                  <div className="flex items-baseline gap-1.5 my-1">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight">
                      {siswaAktif}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-emerald-800">
                      Jiwa
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-emerald-200 space-y-1 text-xs font-black text-emerald-900">
                  <div className="flex items-center justify-between gap-1 text-xs font-black text-emerald-950 truncate">
                    <span>👦 {activeMaleCount} L</span>
                    <span className="text-emerald-300">•</span>
                    <span>👧 {activeFemaleCount} P</span>
                  </div>
                  <div className="text-[13px] font-bold text-emerald-800/80 pt-1 border-t border-emerald-200/60 flex items-center justify-between gap-1 truncate">
                    <span>🌱 {yatimCount} Yatim</span>
                    <span className="text-emerald-300">•</span>
                    <span>🌾 {piatuCount} Piatu</span>
                    <span className="text-emerald-300">•</span>
                    <span>🤍 {yatimPiatuCount} YP</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Dewan Guru (Blue/Indigo) */}
              <div className="p-4 sm:p-5 rounded-2xl md:rounded-3xl bg-blue-50/70 hover:bg-blue-50 border-2 border-blue-300 shadow-sm hover:shadow-md transition-all flex flex-col justify-between text-left">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-blue-900">
                      Dewan Guru
                    </span>
                    <span className="h-3 w-3 rounded-full bg-blue-600 shrink-0 ring-4 ring-blue-200" />
                  </div>
                  <div className="flex items-baseline gap-1.5 my-1">
                    <span className="text-2xl sm:text-3xl font-black text-blue-950 tracking-tight">
                      {ustadzAktif}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-blue-800">
                      Guru
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-blue-200 space-y-1 text-xs font-black text-blue-900">
                  <div className="flex items-center justify-between gap-1 text-xs font-black text-blue-950 truncate">
                    <span>👨 {ustadzMale} L</span>
                    <span className="text-blue-300">•</span>
                    <span>🧕 {ustadzFemale} P</span>
                  </div>
                  <div className="text-[11px] font-bold text-blue-800/80 pt-1 border-t border-blue-200/60 flex items-center justify-between gap-1 truncate">
                    <span>🏠 {mukimCount} Mukim</span>
                    <span className="text-blue-300">•</span>
                    <span>🚶 {nonMukimCount} Laju</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Rombel Kelas (Amber/Yellow) */}
              <div className="p-4 sm:p-5 rounded-2xl md:rounded-3xl bg-amber-50/70 hover:bg-amber-50 border-2 border-amber-300 shadow-sm hover:shadow-md transition-all flex flex-col justify-between text-left">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                      Rombel Kelas
                    </span>
                    <span className="h-3 w-3 rounded-full bg-amber-500 shrink-0 ring-4 ring-amber-200" />
                  </div>
                  <div className="flex items-baseline gap-1.5 my-1">
                    <span className="text-2xl sm:text-3xl font-black text-amber-950 tracking-tight">
                      {totalRombel}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-amber-800">
                      Kelas
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-amber-200 text-xs font-black text-amber-900 truncate">
                  🏫 ~{totalRombel ? Math.round(siswaAktif / totalRombel) : 0} Santri / Kelas
                </div>
              </div>

              {/* Card 5: Pendaftar PPDB (Rose/Red) */}
              <div className="p-4 sm:p-5 rounded-2xl md:rounded-3xl bg-rose-50/70 hover:bg-rose-50 border-2 border-rose-300 shadow-sm hover:shadow-md transition-all flex flex-col justify-between text-left">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-rose-900">
                      Pendaftar PPDB
                    </span>
                    <span className="h-3 w-3 rounded-full bg-rose-500 shrink-0 ring-4 ring-rose-200" />
                  </div>
                  <div className="flex items-baseline gap-1.5 my-1">
                    <span className="text-2xl sm:text-3xl font-black text-rose-950 tracking-tight">
                      {totalApplicants}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-rose-800">
                      Santri
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-rose-200 text-xs font-black text-rose-900 truncate">
                  ✅ {pendaftarLulus} Diterima • ⏳ {pendaftarPending} Pending
                </div>
              </div>

            </div>

          </div>
        );
      })()}

      {/* 2. SECTION: DEMOGRAFI & ROMBEL SISWA (CHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Card 1.1: Sebaran Jenjang & Rombel */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200/80 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/50 flex items-center justify-center shadow-sm">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Sebaran Santri per Jenjang</h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Proporsi santri aktif di setiap jenjang pendidikan</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-widest">
              {jenjangData.length} Jenjang
            </span>
          </div>

          <div className="h-[260px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={jenjangData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800, fill: '#94a3b8' }} />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar dataKey="count" radius={[12, 12, 0, 0]} barSize={40}>
                  {jenjangData.map((entry, index) => (
                    <Cell key={`cell-jenjang-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Jenjang Badge Pills */}
          <div className="flex flex-wrap gap-2.5 pt-2">
            {jenjangData.map((j, i) => (
              <div key={i} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: j.color }} />
                <span>{j.name}:</span>
                <span className="font-black text-slate-900">{j.count} Santri</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 1.2: Demografi Gender (Donut Chart) */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200/80 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/50 flex items-center justify-center shadow-sm">
                <PieChartIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Gender Santri</h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Perbandingan jumlah santri banin dan banat</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-[10px] font-black uppercase tracking-widest">
              Realtime
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2">
            <div className="h-[220px] w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={studentGenderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {studentGenderData.map((entry, index) => (
                      <Cell key={`cell-gender-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomChartTooltip />} />
                </RechartsPieChart>
              </ResponsiveContainer>

              {/* Donut Center Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-2xl font-black text-slate-900 tracking-tight">{siswaAktif}</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Aktif</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md">
                    👦
                  </div>
                  <div>
                    <p className="text-xs font-black text-sky-900 uppercase tracking-wider">Santri Putra</p>
                    <p className="text-[10px] font-bold text-sky-600">Laki-Laki</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-sky-900">{activeMaleCount}</span>
                  <p className="text-[10px] font-bold text-sky-600">
                    {siswaAktif ? Math.round((activeMaleCount / siswaAktif) * 100) : 0}%
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-pink-600 text-white flex items-center justify-center shadow-md">
                    👧
                  </div>
                  <div>
                    <p className="text-xs font-black text-pink-900 uppercase tracking-wider">Santri Putri</p>
                    <p className="text-[10px] font-bold text-pink-600">Perempuan</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-pink-900">{activeFemaleCount}</span>
                  <p className="text-[10px] font-bold text-pink-600">
                    {siswaAktif ? Math.round((activeFemaleCount / siswaAktif) * 100) : 0}%
                  </p>
                </div>
              </div>

              {/* Status Sosial Santri (Yatim / Piatu / Yatim Piatu) */}
              <div className="pt-2 flex flex-wrap gap-2 justify-between">
                <span className="flex-1 min-w-[90px] px-2.5 py-1.5 bg-emerald-50/80 border border-emerald-200 text-emerald-950 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 shadow-xs">
                  🌱 {yatimCount} Yatim
                </span>
                <span className="flex-1 min-w-[90px] px-2.5 py-1.5 bg-amber-50/80 border border-amber-200 text-amber-950 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 shadow-xs">
                  🌾 {piatuCount} Piatu
                </span>
                <span className="flex-1 min-w-[110px] px-2.5 py-1.5 bg-purple-50/80 border border-purple-200 text-purple-950 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 shadow-xs">
                  🤍 {yatimPiatuCount} Yatim Piatu
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 4. SECTION 2: ROMBEL KELAS & SEBARAN GEOGRAFIS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Card 2.1: Sebaran per Rombel Kelas */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200/80 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/50 flex items-center justify-center shadow-sm">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Kapasitas Rombel Kelas</h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Jumlah santri aktif per rombongan belajar</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black uppercase tracking-widest">
              {rombelData.length} Kelas
            </span>
          </div>

          <div className="h-[250px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rombelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800, fill: '#94a3b8' }} />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={28}>
                  {rombelData.map((entry, index) => (
                    <Cell key={`cell-rombel-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2.2: Sebaran Geografis Domisili */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200/80 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200/50 flex items-center justify-center shadow-sm">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Sebaran Domisili Santri</h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Asal provinsi tempat tinggal santri</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-[10px] font-black uppercase tracking-widest">
              Geografis
            </span>
          </div>

          <div className="h-[250px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={geoData} margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800, fill: '#475569' }} width={100} />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={18}>
                  {geoData.map((entry, index) => (
                    <Cell key={`cell-geo-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 5. SECTION 3: DEMOGRAFI & PROFIL USTADZ */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200/80 shadow-xl space-y-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-violet-50 text-violet-600 border border-violet-200/50 flex items-center justify-center shadow-sm">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Kualifikasi & Profil Ustadz</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Distribusi latar belakang pendidikan, tugas akademik, dan status posisi pengajar</p>
            </div>
          </div>
          <span className="px-4 py-1.5 bg-violet-100 text-violet-900 rounded-full text-xs font-black uppercase tracking-widest">
            {ustadzAktif} Pengajar Aktif
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* 3.1 Pendidikan Ustadz */}
          <div className="p-6 bg-slate-50/80 rounded-3xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">Tingkat Pendidikan</span>
              <BookOpen className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={teacherEduData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {teacherEduData.map((entry, index) => (
                      <Cell key={`cell-edu-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomChartTooltip />} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center pt-1">
              {teacherEduData.map((item, i) => (
                <span key={i} className="px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-[10px] font-extrabold text-slate-700 flex items-center gap-1.5 shadow-xs">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}: {item.value}
                </span>
              ))}
            </div>
          </div>

          {/* 3.2 Tugas Akademik */}
          <div className="p-6 bg-slate-50/80 rounded-3xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">Tugas Akademik</span>
              <Award className="h-4 w-4 text-blue-600" />
            </div>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={teacherTaskData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {teacherTaskData.map((entry, index) => (
                      <Cell key={`cell-task-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomChartTooltip />} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center pt-1">
              {teacherTaskData.map((item, i) => (
                <span key={i} className="px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-[10px] font-extrabold text-slate-700 flex items-center gap-1.5 shadow-xs">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}: {item.value}
                </span>
              ))}
            </div>
          </div>

          {/* 3.3 Mukim vs Non Mukim */}
          <div className="p-6 bg-slate-50/80 rounded-3xl border border-slate-100 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">Status Kediaman (Mukim)</span>
                <School className="h-4 w-4 text-purple-600" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-emerald-500 text-white rounded-2xl flex items-center justify-between shadow-lg shadow-emerald-600/10">
                <div className="flex items-center gap-3">
                  <HomeIcon className="h-5 w-5 text-emerald-200" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider">Ustadz Mukim</p>
                    <p className="text-[10px] font-bold text-emerald-100">Tinggal di Dalam Pesantren</p>
                  </div>
                </div>
                <span className="text-xl font-black">{mukimCount} Orang</span>
              </div>

              <div className="p-4 bg-slate-800 text-white rounded-2xl flex items-center justify-between shadow-lg shadow-slate-900/10">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider">Non-Mukim</p>
                    <p className="text-[10px] font-bold text-slate-400">Pengajar Laju / Luar Komplek</p>
                  </div>
                </div>
                <span className="text-xl font-black">{nonMukimCount} Orang</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 6. SECTION 4: KINERJA TAHFIDZ & PRESENSI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Kehadiran Dewan Guru (Mingguan & Bulanan, Pie Chart, dan Daftar Guru Tidak Hadir) */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200/80 shadow-xl flex flex-col justify-between space-y-5">
          <div className="space-y-5">
            {/* Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shadow-xs">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">Kehadiran Dewan Guru</h3>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Statistik presensi &amp; rekap guru tidak hadir</p>
                </div>
              </div>

              {/* Period Switcher (Mingguan vs Bulanan) */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTeacherAttendPeriod('mingguan')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                    teacherAttendPeriod === 'mingguan' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <CalendarDays className="h-3 w-3" />
                  <span>Mingguan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTeacherAttendPeriod('bulanan')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                    teacherAttendPeriod === 'bulanan' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Calendar className="h-3 w-3" />
                  <span>Bulanan</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex flex-col justify-between">
                <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider">Tingkat Hadir</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-black text-emerald-700">{teacherAttendanceData.rateHadir}%</span>
                  <span className="text-[10px] font-bold text-emerald-600">({teacherAttendanceData.countHadir}x)</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-2xl flex flex-col justify-between">
                <span className="text-[9px] font-black text-amber-800 uppercase tracking-wider">Izin</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-black text-amber-700">{teacherAttendanceData.countIzin}</span>
                  <span className="text-[10px] font-bold text-amber-600">sesi</span>
                </div>
              </div>

              <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-2xl flex flex-col justify-between">
                <span className="text-[9px] font-black text-sky-800 uppercase tracking-wider">Sakit</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-black text-sky-700">{teacherAttendanceData.countSakit}</span>
                  <span className="text-[10px] font-bold text-sky-600">sesi</span>
                </div>
              </div>

              <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-2xl flex flex-col justify-between">
                <span className="text-[9px] font-black text-rose-800 uppercase tracking-wider">Alpa</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-black text-rose-700">{teacherAttendanceData.countAlpa}</span>
                  <span className="text-[10px] font-bold text-rose-600">sesi</span>
                </div>
              </div>
            </div>

            {/* Content: Pie Chart & Daftar Guru Tidak Hadir */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-1">
              
              {/* Left Column: Pie Chart (5 cols) */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-3 bg-slate-50/80 rounded-2xl border border-slate-100 relative">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 w-full text-left">
                  Grafik Proporsi Kehadiran
                </p>
                <div className="h-[170px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={teacherAttendanceData.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={68}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {teacherAttendanceData.pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomChartTooltip />} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  
                  {/* Center percentage indicator */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Hadir</span>
                    <span className="text-base font-black text-slate-800 -mt-0.5">{teacherAttendanceData.rateHadir}%</span>
                  </div>
                </div>

                {/* Legend list below pie */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 w-full mt-2 pt-2 border-t border-slate-200/60">
                  {teacherAttendanceData.pieData.map(item => (
                    <div key={item.name} className="flex items-center justify-between text-[11px] font-bold">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600">{item.name}</span>
                      </div>
                      <span className="font-mono font-black text-slate-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Daftar Guru Tidak Hadir (7 cols) */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-rose-500" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Guru Tidak Hadir
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    teacherAttendanceData.absentRecords.length > 0 
                      ? 'bg-rose-100 text-rose-800' 
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {teacherAttendanceData.absentRecords.length} Catatan
                  </span>
                </div>

                {/* Search & Status Filter for Absent Teachers if list is long */}
                {teacherAttendanceData.absentRecords.length > 2 && (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-grow">
                      <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari guru tidak hadir..."
                        value={teacherAttendSearch}
                        onChange={(e) => setTeacherAttendSearch(e.target.value)}
                        className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-emerald-600 text-slate-700"
                      />
                    </div>
                    <select
                      value={teacherAttendStatusFilter}
                      onChange={(e) => setTeacherAttendStatusFilter(e.target.value as any)}
                      className="py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    >
                      <option value="all">Semua</option>
                      <option value="Izin">Izin</option>
                      <option value="Sakit">Sakit</option>
                      <option value="Alpa">Alpa</option>
                    </select>
                  </div>
                )}

                {/* List Container */}
                <div className="max-h-[190px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {(() => {
                    const filteredAbsent = teacherAttendanceData.absentRecords.filter(r => {
                      const matchSearch = !teacherAttendSearch || 
                        r.teacherName.toLowerCase().includes(teacherAttendSearch.toLowerCase()) ||
                        (r.keterangan || '').toLowerCase().includes(teacherAttendSearch.toLowerCase());
                      const matchStatus = teacherAttendStatusFilter === 'all' || r.status === teacherAttendStatusFilter;
                      return matchSearch && matchStatus;
                    });

                    if (teacherAttendanceData.absentRecords.length === 0) {
                      return (
                        <div className="p-4 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl text-center space-y-1.5 my-auto">
                          <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
                          <p className="text-xs font-black text-emerald-900">Semua Guru Hadir 100%</p>
                          <p className="text-[10px] font-bold text-emerald-700/80">
                            Tidak ada catatan dewan guru yang izin, sakit, atau alpa pada periode {teacherAttendPeriod === 'mingguan' ? 'mingguan' : 'bulanan'} ini.
                          </p>
                        </div>
                      );
                    }

                    if (filteredAbsent.length === 0) {
                      return (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-500 text-xs font-bold">
                          Tidak ditemukan catatan guru tidak hadir yang sesuai pencarian.
                        </div>
                      );
                    }

                    return filteredAbsent.map((item, idx) => {
                      const statusColor = 
                        item.status === 'Izin' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        item.status === 'Sakit' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                        'bg-rose-50 text-rose-700 border-rose-200';

                      const statusDot = 
                        item.status === 'Izin' ? 'bg-amber-500' :
                        item.status === 'Sakit' ? 'bg-sky-500' :
                        'bg-rose-500';

                      return (
                        <div 
                          key={`${item.id || item.teacherId}-${item.tanggal}-${idx}`}
                          className="p-2.5 bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/80 rounded-2xl transition flex items-start justify-between gap-2.5"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="h-7 w-7 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-black text-[10px] shrink-0 shadow-3xs">
                              {item.teacherName.charAt(0) || 'U'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-800 truncate leading-snug">
                                {item.teacherName}
                              </p>
                              <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 mt-0.5">
                                <span>{item.tanggal}</span>
                                {item.teacherRole && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate">{item.teacherRole}</span>
                                  </>
                                )}
                              </div>
                              {item.keterangan && item.keterangan !== 'Hadir mengajar' && (
                                <p className="text-[10px] font-medium text-slate-600 italic mt-0.5 line-clamp-1">
                                  "{item.keterangan}"
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center">
                            <span className={`px-2 py-0.5 border rounded-lg text-[9px] font-black uppercase flex items-center gap-1 shadow-3xs ${statusColor}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
                              {item.status}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Data Siswa & Capaian Jumlah Juz yang Diperoleh */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-200/80 shadow-xl flex flex-col justify-between space-y-5">
          <div>
            {/* Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shadow-xs">
                  <BookMarked className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">Data Siswa &amp; Perolehan Juz</h3>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Jumlah Juz Al-Qur'an yang diperoleh santri</p>
                </div>
              </div>
              
              {/* View Switcher & Max 30 Juz Badge */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setStudentJuzViewMode('chart')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                      studentJuzViewMode === 'chart' ? 'bg-[#064e3b] text-white border-2 border-emerald-500 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Tampilan Grafik Batang"
                  >
                    <BarChart3 className="h-3 w-3" />
                    <span>Grafik</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentJuzViewMode('table')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                      studentJuzViewMode === 'table' ? 'bg-[#064e3b] text-white border-2 border-emerald-500 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Tampilan Tabel Data Siswa"
                  >
                    <List className="h-3 w-3" />
                    <span>Tabel</span>
                  </button>
                </div>
                
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                  Target 30 Juz
                </span>
              </div>
            </div>

            {/* Sub-Filters: Search & Class Filter */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 pb-2">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari santri / NIS..."
                    value={studentJuzSearch}
                    onChange={(e) => setStudentJuzSearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50/80 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <select
                  value={studentJuzClassFilter}
                  onChange={(e) => setStudentJuzClassFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50/80 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:bg-white cursor-pointer"
                >
                  <option value="Semua">Semua Kelas</option>
                  {Array.from(activeRombelSet).map((k, kIdx) => (
                    <option key={`active-rombel-${k || kIdx}-${kIdx}`} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              
              <span className="text-[10.5px] font-bold text-slate-400">
                Total: <span className="text-emerald-700 font-extrabold">{filteredStudentJuz.length}</span> Santri
              </span>
            </div>

            {/* Main Area: Chart vs Table */}
            {studentJuzViewMode === 'chart' ? (
              <div className="h-[210px] w-full pt-1">
                {studentJuzChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={studentJuzChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                      <YAxis domain={[0, 30]} ticks={[0, 5, 10, 15, 20, 25, 30]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                      <Tooltip 
                        content={({ active, payload }: any) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-2xl border border-slate-700/50 text-xs space-y-1.5">
                                <p className="font-black text-emerald-400 text-xs">{data.fullName}</p>
                                <div className="text-[10.5px] text-slate-300 font-semibold flex items-center gap-2">
                                  <span>Kelas: <b className="text-white">{data.kelas}</b></span>
                                  <span>•</span>
                                  <span>NIS: <b className="text-white font-mono">{data.nis}</b></span>
                                </div>
                                <div className="pt-1 flex items-center justify-between gap-3 border-t border-slate-700 text-xs">
                                  <span className="text-slate-300 font-bold">Juz Diperoleh:</span>
                                  <span className="font-black text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-700/50">{data.jumlahJuz} / 30 Juz</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="jumlahJuz" fill="#059669" name="Jumlah Juz Diperoleh" radius={[6, 6, 0, 0]} barSize={26} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 font-bold text-xs italic">
                    Tidak ada data santri yang sesuai kriteria pencarian.
                  </div>
                )}
              </div>
            ) : (
              /* Table Mode */
              <div className="max-h-[210px] overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/40 custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-[#064e3b] text-white text-[9px] uppercase font-black tracking-wider select-none z-10">
                    <tr>
                      <th className="py-2 px-2 text-center w-7 text-emerald-200">No</th>
                      <th className="py-2 px-3">Nama Santri</th>
                      <th className="py-2 px-2">Kelas</th>
                      <th className="py-2 px-2.5 text-center">Progress 30 Juz</th>
                      <th className="py-2 px-3 text-right">Perolehan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                    {filteredStudentJuz.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-1.5 px-2 text-center font-mono font-bold text-[10px] text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-3">
                          <div className="font-black text-slate-800 text-[11px]">{s.nama}</div>
                          <div className="text-[9.5px] font-mono text-slate-400">NIS: {s.nis}</div>
                        </td>
                        <td className="py-1.5 px-2 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[9.5px] font-bold">
                            {s.kelas}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 min-w-[100px]">
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-[8.5px] font-bold text-slate-500">
                              <span>{s.jumlahJuz} Juz</span>
                              <span>{s.persentase}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  s.jumlahJuz >= 30 ? 'bg-amber-500' : s.jumlahJuz >= 10 ? 'bg-emerald-600' : s.jumlahJuz >= 5 ? 'bg-teal-600' : 'bg-emerald-400'
                                }`} 
                                style={{ width: `${Math.min(100, (s.jumlahJuz / 30) * 100)}%` }} 
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-1.5 px-3 text-right whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider ${
                            s.jumlahJuz >= 30 
                              ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                              : s.jumlahJuz >= 5
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : s.jumlahJuz > 0
                                  ? 'bg-teal-50 text-teal-700 border border-teal-100'
                                  : 'bg-slate-100 text-slate-500'
                          }`}>
                            {s.jumlahJuz} Juz
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredStudentJuz.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-bold text-xs italic">
                          Tidak ada data santri ditemukan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Mini Statistics Footer */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
            <div className="p-2 bg-emerald-50/70 rounded-xl border border-emerald-100/60 text-center">
              <p className="text-[8.5px] font-black uppercase tracking-wider text-emerald-700">Santri Berhafalan</p>
              <p className="text-xs font-black text-emerald-900 mt-0.5">{totalSantriWithHafalan} Siswa</p>
            </div>
            <div className="p-2 bg-teal-50/70 rounded-xl border border-teal-100/60 text-center">
              <p className="text-[8.5px] font-black uppercase tracking-wider text-teal-700">Rata-Rata Capaian</p>
              <p className="text-xs font-black text-teal-900 mt-0.5">{avgJuz} Juz</p>
            </div>
            <div className="p-2 bg-amber-50/70 rounded-xl border border-amber-100/60 text-center">
              <p className="text-[8.5px] font-black uppercase tracking-wider text-amber-700">Khatam 30 Juz</p>
              <p className="text-xs font-black text-amber-900 mt-0.5">{totalKhatam30} Santri</p>
            </div>
          </div>
        </div>

      </div>

      {/* 7. SECTION 5: AGENDA PONDOK & KALENDER AKADEMIK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Agenda Harian Pondok */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200/80 shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/50 flex items-center justify-center shadow-sm">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="text-base font-black text-slate-800 tracking-tight">Agenda Rutin Pondok</h3>
              </div>
              {isEditable && (
                <button 
                  onClick={() => {
                    setEditingAgenda(null);
                    setAgeForm({ time: '05:00', task: '', category: 'ibadah' });
                    setShowAgendaForm(true);
                  }}
                  className="h-9 w-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition shadow-md active:scale-90"
                >
                  <Plus className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Agenda List */}
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {localAgenda.length === 0 && (
                <div className="text-center py-10 text-slate-400 font-bold text-xs italic">
                  Belum ada agenda pondok yang ditambahkan.
                </div>
              )}
              {localAgenda
                .slice()
                .sort((a, b) => String(a?.time || '').localeCompare(String(b?.time || '')))
                .map((item, i) => (
                  <div key={item.id || i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between hover:bg-indigo-50/50 hover:border-indigo-100 transition-all group">
                    <div className="flex items-center gap-4">
                      <span className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-mono font-black shrink-0">
                        {item.time}
                      </span>
                      <div>
                        <p className="text-xs font-black text-slate-800 leading-snug">{item.task}</p>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${
                          item.category === 'ibadah' ? 'text-emerald-600' :
                          item.category === 'akademik' ? 'text-blue-600' :
                          item.category === 'kegiatan' ? 'text-amber-600' :
                          item.category === 'istirahat' ? 'text-purple-600' : 'text-slate-500'
                        }`}>
                          • {item.category || 'Umum'}
                        </span>
                      </div>
                    </div>

                    {isEditable && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingAgenda(item);
                            setAgeForm({ time: item.time, task: item.task, category: item.category || 'ibadah' });
                            setShowAgendaForm(true);
                          }}
                          className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteAgenda(item.id)}
                          className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Kalender Akademik & Agenda Prioritas */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-200/80 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/50 flex items-center justify-center shadow-sm">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Kalender & Timeline Akademik</h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Jadwal kegiatan penting, ujian, dan hari libur</p>
              </div>
            </div>

            {isEditable && (
              <button 
                onClick={() => {
                  setEditingCalendar(null);
                  setCalForm({ date: new Date().toISOString().split('T')[0], event: '', type: 'academic' });
                  setShowCalendarForm(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Agenda</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Priority Events List */}
            <div className="space-y-4">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Agenda Akademik Mendatang</span>
              
              {localCal.length === 0 && (
                <div className="text-center py-10 text-slate-400 font-bold text-xs italic">
                  Belum ada agenda akademik yang tercatat.
                </div>
              )}

              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                {localCal
                  .slice()
                  .sort((a, b) => String(a?.date || '').localeCompare(String(b?.date || '')))
                  .map((item, i) => {
                    const d = new Date(item.date);
                    const day = isNaN(d.getDate()) ? '?' : d.getDate();
                    const month = isNaN(d.getTime()) ? 'M' : d.toLocaleDateString('id-ID', { month: 'short' });
                    return (
                      <div key={item.id || i} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center shadow-xs shrink-0">
                            <span className="text-[9px] font-black uppercase text-slate-400 leading-none mb-1">{month}</span>
                            <span className="text-lg font-black text-slate-900 leading-none">{day}</span>
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 leading-snug">{item.event}</p>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-block mt-1 ${
                              item.type === 'exam' ? 'bg-rose-100 text-rose-700' :
                              item.type === 'holiday' ? 'bg-emerald-100 text-emerald-700' :
                              item.type === 'event' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {item.type === 'exam' ? 'Ujian' : item.type === 'holiday' ? 'Libur' : item.type === 'event' ? 'Event' : 'Akademik'}
                            </span>
                          </div>
                        </div>

                        {isEditable && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setEditingCalendar(item);
                                setCalForm({ date: item.date, event: item.event, type: item.type || 'academic' });
                                setShowCalendarForm(true);
                              }}
                              className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteCalendar(item.id)}
                              className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Mini Calendar Monthly Grid */}
            <div className="bg-slate-50/80 rounded-3xl p-6 border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700">Visualisasi Bulan Ini</span>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400 mb-2">
                  <span>SEN</span><span>SEL</span><span>RAB</span><span>KAM</span><span>JUM</span><span>SAB</span><span>MIG</span>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {(() => {
                    const today = new Date();
                    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    const days = [];
                    
                    let startDay = startOfMonth.getDay() - 1;
                    if (startDay === -1) startDay = 6;
                    for (let i = 0; i < startDay; i++) days.push(null);
                    for (let i = 1; i <= endOfMonth.getDate(); i++) days.push(i);
                    
                    return days.map((day, i) => {
                      if (day === null) return <div key={`empty-grid-${i}`} className="h-8" />;
                      
                      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isToday = day === today.getDate();
                      const hasEvent = localCal.some(item => item.date === dateStr);
                      
                      return (
                        <div 
                          key={`day-grid-${i}`} 
                          className={`h-8 flex flex-col items-center justify-center rounded-xl text-xs font-black relative transition-all ${
                            isToday ? 'bg-slate-900 text-white shadow-md' : 
                            hasEvent ? 'bg-emerald-500 text-white shadow-xs' : 
                            'bg-white text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {day}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center justify-around text-[10px] font-black text-slate-500">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-900" /> Hari Ini</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Ada Agenda</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* 8. SECTION 6: RINGKASAN PPDB */}
      <div className="rounded-[2.5rem] bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-8 md:p-10 text-white shadow-2xl relative overflow-hidden border border-emerald-500/30">
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center lg:text-left">
            <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-widest inline-block">
              PENERIMAAN SANTRI BARU (PPDB)
            </span>
            <h3 className="text-2xl font-black tracking-tight text-white">Status Seleksi & Pendaftaran Santri Baru</h3>
            <p className="text-xs font-medium text-slate-400 max-w-lg leading-relaxed">
              Ringkasan berkas masuk, verifikasi administrasi, hasil tes wawancara, dan penetapan status kelulusan pendaftar.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto">
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center backdrop-blur-md">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-1">Verifikasi</span>
              <span className="text-2xl font-black text-white">{pendaftarPending}</span>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center backdrop-blur-md">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Wawancara</span>
              <span className="text-2xl font-black text-white">{pendaftarWawancara}</span>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center backdrop-blur-md">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Diterima</span>
              <span className="text-2xl font-black text-white">{pendaftarLulus}</span>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center backdrop-blur-md">
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest block mb-1">Ditolak</span>
              <span className="text-2xl font-black text-white">{pendaftarDitolak}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: FORM CALENDAR AKADEMIK */}
      {showCalendarForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-6 animate-scaleUp">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide">
                {editingCalendar ? 'Edit Agenda Akademik' : 'Tambah Agenda Akademik'}
              </h3>
              <button onClick={() => setShowCalendarForm(false)} className="p-2 text-slate-400 hover:text-rose-500 rounded-xl">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCalendar} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">Tanggal *</label>
                <input 
                  type="date" 
                  required 
                  value={calForm.date} 
                  onChange={(e) => setCalForm({ ...calForm, date: e.target.value })} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">Nama Agenda / Event *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Contoh: Ujian Tengah Semester (UTS)" 
                  value={calForm.event} 
                  onChange={(e) => setCalForm({ ...calForm, event: e.target.value })} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">Kategori Event *</label>
                <select 
                  value={calForm.type} 
                  onChange={(e) => setCalForm({ ...calForm, type: e.target.value as any })} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="academic">Akademik</option>
                  <option value="exam">Ujian</option>
                  <option value="holiday">Hari Libur</option>
                  <option value="event">Event / Kegiatan</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowCalendarForm(false)} 
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/20"
                >
                  Simpan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FORM AGENDA PONDOK */}
      {showAgendaForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-6 animate-scaleUp">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide">
                {editingAgenda ? 'Edit Jadwal Agenda Pondok' : 'Tambah Jadwal Agenda Pondok'}
              </h3>
              <button onClick={() => setShowAgendaForm(false)} className="p-2 text-slate-400 hover:text-rose-500 rounded-xl">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAgenda} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">Waktu (Jam) *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Contoh: 04:00 atau 05:30" 
                  value={ageForm.time} 
                  onChange={(e) => setAgeForm({ ...ageForm, time: e.target.value })} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">Deskripsi Kegiatan *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Contoh: Shalat Subuh Berjamaah & Dzikir Pagi" 
                  value={ageForm.task} 
                  onChange={(e) => setAgeForm({ ...ageForm, task: e.target.value })} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">Kategori *</label>
                <select 
                  value={ageForm.category} 
                  onChange={(e) => setAgeForm({ ...ageForm, category: e.target.value as any })} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="ibadah">Ibadah</option>
                  <option value="akademik">Akademik</option>
                  <option value="kegiatan">Kegiatan / Ekstrakurikuler</option>
                  <option value="istirahat">Istirahat / Makan</option>
                  <option value="umum">Umum</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowAgendaForm(false)} 
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/20"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Helper Home icon if missing
function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}
