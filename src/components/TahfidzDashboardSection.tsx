import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, CheckCircle2, Award, BookOpen, Search, Filter, 
  BarChart2, Users, ArrowRight, Sparkles, Download, Flame, Check,
  X, Calendar, Clock, RefreshCw, ChevronLeft, ChevronRight, UserX,
  Target, Bookmark, SlidersHorizontal, BookMarked
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Cell 
} from 'recharts';
import * as XLSX from 'xlsx';
import { SchoolStudent, MajelisTahfidz, TahfidzRecord } from '../types';

interface TahfidzDashboardSectionProps {
  students: SchoolStudent[];
  setStudents?: React.Dispatch<React.SetStateAction<SchoolStudent[]>>;
  tahfidzRecords: TahfidzRecord[];
  setTahfidzRecords: React.Dispatch<React.SetStateAction<TahfidzRecord[]>>;
  majelisList: MajelisTahfidz[];
  tahunAjaranAktif: string;
  semesterAktif: string;
  guruActiveName: string;
  ustadzList?: any[];
  isEditable?: boolean;
  onNavigateToInput: (studentId?: string, juz?: string, jenisSetoran?: string, jenisUjian?: string, majelisId?: string) => void;
}

export const TahfidzDashboardSection: React.FC<TahfidzDashboardSectionProps> = ({
  students,
  setStudents,
  tahfidzRecords,
  setTahfidzRecords,
  majelisList,
  tahunAjaranAktif,
  semesterAktif,
  guruActiveName,
  ustadzList = [],
  isEditable = true,
  onNavigateToInput,
}) => {
  // Filter States
  const [juzTierFilter, setJuzTierFilter] = useState<'all' | '1-5' | '6-10' | '11-15' | '16-20' | '21-25' | '26-30'>('all');
  const [classFilter, setClassFilter] = useState('Semua');
  const [majelisFilter, setMajelisFilter] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Quick Exam Modal State
  const [quickExamModal, setQuickExamModal] = useState<{
    isOpen: boolean;
    student: any | null;
    targetJuz: string;
    jenisUjian: '1 Juz' | '5 Juz' | 'Semester';
    nilai: 'Mumtaz' | 'Jayyid Jiddan' | 'Jayyid' | 'Maqbul';
    ustadzPenyimakId: string;
    catatan: string;
    tanggal: string;
  }>({
    isOpen: false,
    student: null,
    targetJuz: '30',
    jenisUjian: '1 Juz',
    nilai: 'Mumtaz',
    ustadzPenyimakId: '',
    catatan: 'Lulus Imtihan Tahfidz Al-Qur\'an',
    tanggal: new Date().toISOString().split('T')[0],
  });

  // Helper to determine target juz & exam need for a student
  const getStudentExamStatus = (studentId: string, records: TahfidzRecord[]) => {
    const studentRecs = records.filter(r => r.siswaId === studentId);
    const juzSequence = ['30', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29'];
    
    let currentJuzIndex = 0;
    for (let i = 0; i < juzSequence.length; i++) {
      const hasPassedExam = studentRecs.some(r => 
        String(r.noJuz) === juzSequence[i] && 
        r.jenisSetoran === 'Imtihan' && 
        (r.jenisUjian === '1 Juz' || r.jenisUjian === '5 Juz' || r.jenisUjian === 'Semester')
      );
      if (hasPassedExam) {
        currentJuzIndex = i + 1;
      } else {
        break;
      }
    }
    
    if (currentJuzIndex >= juzSequence.length) {
      return { isNeedingExam: false, targetJuz: '30', pagesInTarget: 0, currentJuzIndex };
    }
    
    const targetJuz = juzSequence[currentJuzIndex];
    const pagesInTarget = studentRecs
      .filter(r => String(r.noJuz) === targetJuz && r.jenisSetoran === 'Ziyadah')
      .reduce((acc, curr) => acc + (Number(curr.jumlahHalaman) || 0), 0);
      
    const hasExamForTarget = studentRecs.some(r => 
      String(r.noJuz) === targetJuz && r.jenisSetoran === 'Imtihan'
    );

    const isNeedingExam = pagesInTarget >= 20 && !hasExamForTarget;
    return { isNeedingExam, targetJuz, pagesInTarget, currentJuzIndex };
  };

  // State for dismissed exam celebration banner
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(() => {
    try {
      const dismissed = localStorage.getItem('tahfidz_exam_banner_dismissed');
      const todayStr = new Date().toISOString().split('T')[0];
      return dismissed === todayStr;
    } catch {
      return false;
    }
  });

  // 1. Calculate students needing exam
  const studentsNeedingExam = useMemo(() => {
    return students.filter(s => {
      const status = getStudentExamStatus(s.id, tahfidzRecords);
      return status.isNeedingExam;
    });
  }, [students, tahfidzRecords]);

  // Check if any santri completed an exam today / within 1 day
  const isExamCompletedWithinOneDay = useMemo(() => {
    if (studentsNeedingExam.length > 0 || isBannerDismissed) return false;

    const examRecords = tahfidzRecords.filter(r => r.jenisSetoran === 'Imtihan');
    if (examRecords.length === 0) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return examRecords.some(r => {
      if (!r.tanggal) return false;
      const d = new Date(r.tanggal);
      if (isNaN(d.getTime())) return false;
      d.setHours(0, 0, 0, 0);
      const diffTime = Math.abs(today.getTime() - d.getTime());
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays <= 1;
    });
  }, [studentsNeedingExam, isBannerDismissed, tahfidzRecords]);

  // 2. Full student hafalan calculation list
  const studentHafalanList = useMemo(() => {
    return students.map(s => {
      let juz = 0;
      if (s.jumlahHafalan !== undefined && s.jumlahHafalan !== null && s.jumlahHafalan !== '') {
        const parsed = parseFloat(String(s.jumlahHafalan).replace(/[^0-9.]/g, ''));
        if (!isNaN(parsed)) juz = parsed;
      }
      const sRecs = tahfidzRecords.filter(r => r.siswaId === s.id);
      const passedJuzSet = new Set<string>();
      sRecs.forEach(r => {
        if (r.jenisSetoran === 'Imtihan') {
          passedJuzSet.add(String(r.noJuz));
        }
      });
      if (passedJuzSet.size > juz) {
        juz = passedJuzSet.size;
      }
      
      const sortedRecs = [...sRecs].sort((a, b) => 
        String(b.tanggalSelesai || b.tanggalMulai || '').localeCompare(String(a.tanggalSelesai || a.tanggalMulai || ''))
      );
      const lastRec = sortedRecs[0];
      const examStatus = getStudentExamStatus(s.id, tahfidzRecords);
      const majelis = majelisList.find(m => m.id === s.majelisId || (m.siswaIds && m.siswaIds.includes(s.id)));

      return {
        id: s.id,
        nama: s.nama || 'Santri',
        nisn: s.nisn || s.nis || '-',
        kelas: s.kelas || 'Belum Diatur',
        gender: s.gender || s.jenisKelamin || 'Laki-laki',
        foto: (s as any).foto,
        majelisId: s.majelisId || majelis?.id || '',
        majelisNama: majelis?.nama || 'Majelis Umum',
        jumlahJuz: juz,
        persentase: Math.min(100, Math.round((juz / 30) * 100)),
        lastRecord: lastRec,
        needsExam: examStatus.isNeedingExam,
        targetExamJuz: examStatus.targetJuz,
        pagesInTarget: examStatus.pagesInTarget,
      };
    }).sort((a, b) => b.jumlahJuz - a.jumlahJuz || String(a.nama || '').localeCompare(String(b.nama || '')));
  }, [students, tahfidzRecords, majelisList]);

  // Unique Classes list for filter
  const classOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => { if (s.kelas) set.add(s.kelas); });
    return Array.from(set).sort();
  }, [students]);

  // 3. Multiples of 5 Tiers Definition for Graphics
  const chartTiersConfig = [
    { key: '1-5', range: '1 - 5 Juz', min: 1, max: 5, fill: '#10b981', color: '#10b981', label: '1 - 5 Juz (Tingkat Dasar)' },
    { key: '6-10', range: '6 - 10 Juz', min: 6, max: 10, fill: '#0d9488', color: '#0d9488', label: '6 - 10 Juz (Tingkat Menengah)' },
    { key: '11-15', range: '11 - 15 Juz', min: 11, max: 15, fill: '#0284c7', color: '#0284c7', label: '11 - 15 Juz (Tingkat Lanjutan)' },
    { key: '16-20', range: '16 - 20 Juz', min: 16, max: 20, fill: '#6366f1', color: '#6366f1', label: '16 - 20 Juz (Tingkat Mahir)' },
    { key: '21-25', range: '21 - 25 Juz', min: 21, max: 25, fill: '#d97706', color: '#d97706', label: '21 - 25 Juz (Tingkat Mumtaz)' },
    { key: '26-30', range: '26 - 30 Juz', min: 26, max: 30, fill: '#e11d48', color: '#e11d48', label: '26 - 30 Juz (Khatam Qur\'an)' },
  ];

  // Graphic data filtered by Class & Majelis
  const juzMultiplesData = useMemo(() => {
    const filtered = studentHafalanList.filter(s => {
      const matchClass = classFilter === 'Semua' || s.kelas === classFilter;
      const matchMajelis = majelisFilter === 'Semua' || s.majelisNama === majelisFilter;
      return matchClass && matchMajelis;
    });

    const totalFiltered = filtered.length;

    return chartTiersConfig.map(tier => {
      const studentsInTier = filtered.filter(s => s.jumlahJuz >= tier.min && s.jumlahJuz <= tier.max);
      return {
        ...tier,
        count: studentsInTier.length,
        percentage: totalFiltered > 0 ? Math.round((studentsInTier.length / totalFiltered) * 100) : 0,
        studentNames: studentsInTier.slice(0, 4).map(s => s.nama).join(', ') + (studentsInTier.length > 4 ? ` +${studentsInTier.length - 4} lainnya` : '')
      };
    });
  }, [studentHafalanList, classFilter, majelisFilter]);

  // Filtered Student List for the Table
  const filteredStudentsForTable = useMemo(() => {
    return studentHafalanList.filter(s => {
      // Tier filter
      let matchTier = true;
      if (juzTierFilter === '1-5') matchTier = s.jumlahJuz >= 1 && s.jumlahJuz <= 5;
      else if (juzTierFilter === '6-10') matchTier = s.jumlahJuz >= 6 && s.jumlahJuz <= 10;
      else if (juzTierFilter === '11-15') matchTier = s.jumlahJuz >= 11 && s.jumlahJuz <= 15;
      else if (juzTierFilter === '16-20') matchTier = s.jumlahJuz >= 16 && s.jumlahJuz <= 20;
      else if (juzTierFilter === '21-25') matchTier = s.jumlahJuz >= 21 && s.jumlahJuz <= 25;
      else if (juzTierFilter === '26-30') matchTier = s.jumlahJuz >= 26 && s.jumlahJuz <= 30;

      // Class filter
      const matchClass = classFilter === 'Semua' || s.kelas === classFilter;

      // Majelis filter
      const matchMajelis = majelisFilter === 'Semua' || s.majelisNama === majelisFilter;

      // Search query
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        s.nama.toLowerCase().includes(q) || 
        s.nisn.toLowerCase().includes(q) || 
        s.kelas.toLowerCase().includes(q) ||
        s.majelisNama.toLowerCase().includes(q);

      return matchTier && matchClass && matchMajelis && matchSearch;
    });
  }, [studentHafalanList, juzTierFilter, classFilter, majelisFilter, searchQuery]);

  // Table Pagination
  const totalTablePages = Math.max(1, Math.ceil(filteredStudentsForTable.length / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudentsForTable.slice(start, start + pageSize);
  }, [filteredStudentsForTable, currentPage, pageSize]);

  // KPI Metrics
  const totalSantri = students.length;
  const totalSetoranCount = tahfidzRecords.length;
  const totalHalamanAll = tahfidzRecords.reduce((acc, curr) => acc + (Number(curr.jumlahHalaman) || 0), 0);
  const avgJuz = studentHafalanList.length > 0 
    ? (studentHafalanList.reduce((acc, curr) => acc + curr.jumlahJuz, 0) / studentHafalanList.length).toFixed(1)
    : '0';
  const totalKhatam30 = studentHafalanList.filter(s => s.jumlahJuz >= 30).length;

  // Handler to open quick exam modal
  const handleOpenQuickExam = (student: any, targetJuz: string) => {
    setQuickExamModal({
      isOpen: true,
      student,
      targetJuz,
      jenisUjian: '1 Juz',
      nilai: 'Mumtaz',
      ustadzPenyimakId: (ustadzList && ustadzList[0]?.id) || guruActiveName || 'Ustadz',
      catatan: `Lulus Imtihan Tahfidz 1 Juz (${targetJuz})`,
      tanggal: new Date().toISOString().split('T')[0],
    });
  };

  // Handler to save quick exam
  const handleSaveQuickExam = () => {
    if (!isEditable) return;
    if (!quickExamModal.student) return;
    const s = quickExamModal.student;
    const targetJuz = quickExamModal.targetJuz;

    const newRecord: TahfidzRecord = {
      id: `tr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      majelisId: s.majelisId || majelisList[0]?.id || 'm-1',
      siswaId: s.id,
      tanggalMulai: quickExamModal.tanggal,
      tanggalSelesai: quickExamModal.tanggal,
      jenisSetoran: 'Imtihan',
      noJuz: String(targetJuz),
      jenisUjian: quickExamModal.jenisUjian,
      jumlahHalaman: 20,
      nilaiTajwid: quickExamModal.nilai,
      nilaiFashohah: quickExamModal.nilai,
      nilaiKelancaran: quickExamModal.nilai,
      ustadzPenyimakId: quickExamModal.ustadzPenyimakId || guruActiveName || 'Ustadz',
      catatan: quickExamModal.catatan || `Lulus Imtihan Juz ${targetJuz}`,
      academicYear: tahunAjaranAktif,
      semester: semesterAktif
    };

    const updatedRecords = [...tahfidzRecords, newRecord];
    setTahfidzRecords(updatedRecords);
    try {
      localStorage.setItem('db_tahfidz_records_v2', JSON.stringify(updatedRecords));
    } catch (e) {}

    // Update student's jumlahHafalan count
    const currentJuzNum = parseFloat(String(s.jumlahHafalan || '0').replace(/[^0-9.]/g, '')) || 0;
    const newJuzNum = Math.max(currentJuzNum, s.jumlahJuz + 1);
    if (setStudents) {
      setStudents(prev => prev.map(st => st.id === s.id ? { ...st, jumlahHafalan: String(newJuzNum) } : st));
    }

    setQuickExamModal({
      isOpen: false,
      student: null,
      targetJuz: '30',
      jenisUjian: '1 Juz',
      nilai: 'Mumtaz',
      ustadzPenyimakId: '',
      catatan: '',
      tanggal: new Date().toISOString().split('T')[0],
    });

    alert(`Alhamdulillah! Ujian Imtihan Juz ${targetJuz} untuk santri "${s.nama}" berhasil dicatat. Santri telah menyelesaikan ujian dan dikeluarkan dari daftar antrian.`);
  };

  // Export Table to Excel
  const handleExportExcel = () => {
    const exportData = filteredStudentsForTable.map((s, idx) => ({
      'No': idx + 1,
      'Nama Santri': s.nama,
      'NISN / NIS': s.nisn,
      'Kelas / Rombel': s.kelas,
      'Majelis Halaqah': s.majelisNama,
      'Jumlah Hafalan (Juz)': `${s.jumlahJuz} Juz`,
      'Persentase Target 30 Juz': `${s.persentase}%`,
      'Status Ujian': s.needsExam ? `Wajib Ujian Juz ${s.targetExamJuz}` : 'Tuntas Imtihan',
      'Setoran Terakhir': s.lastRecord ? `${s.lastRecord.jenisSetoran} Juz ${s.lastRecord.noJuz} (${s.lastRecord.tanggalSelesai || s.lastRecord.tanggalMulai})` : 'Belum Ada'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Capaian Hafalan');
    XLSX.writeFile(wb, `Laporan_Capaian_Tahfidz_${tahunAjaranAktif.replace('/', '_')}.xlsx`);
  };

  // Custom Chart Tooltip
  const CustomTahfidzChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/50 text-xs space-y-1 max-w-xs">
          <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-1.5">
            <span className="font-black text-emerald-400 uppercase">{data.range}</span>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold rounded-md text-[10px]">
              {data.percentage}% Total
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-slate-300 font-bold">Jumlah Santri:</span>
            <span className="text-lg font-black text-white">{data.count} Orang</span>
          </div>
          {data.count > 0 && (
            <p className="text-[10px] text-slate-400 font-medium italic pt-1 line-clamp-2">
              Contoh santri: {data.studentNames}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-3.5 sm:space-y-4 text-left animate-fadeIn">
      
      {/* 1. WARNING SANTRI YANG BELUM UJIAN / INFO BEBAS UJIAN */}
      {studentsNeedingExam.length > 0 ? (
        <div className="p-4 sm:p-5 bg-rose-50/95 border border-rose-200 rounded-2xl shadow-xs animate-fadeIn space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-rose-200/80">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm sm:text-base font-black text-rose-950 uppercase tracking-tight">
                    Peringatan: Santri Wajib Melaksanakan Ujian (Imtihan)
                  </h4>
                  <span className="px-2 py-0.5 bg-rose-600 text-white rounded-full text-[9px] font-black tracking-widest uppercase">
                    {studentsNeedingExam.length} Santri
                  </span>
                </div>
                <p className="text-xs text-rose-700 font-bold mt-0.5">
                  Santri telah menuntaskan target 20 halaman Ziyadah di juz terkait dan harus diuji sebelum melanjutkan. Peringatan akan otomatis hilang setelah ujian dicatat.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {studentsNeedingExam.map((s, idx) => {
              const examInfo = getStudentExamStatus(s.id, tahfidzRecords);
              const targetJuz = examInfo.targetJuz;
              const sMajelis = majelisList.find(m => m.id === s.majelisId || (m.siswaIds && m.siswaIds.includes(s.id)));

              return (
                <div 
                  key={`${s.id}-${idx}`} 
                  className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-xs hover:shadow-sm transition flex flex-col justify-between space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center text-xs font-black uppercase shrink-0 border border-rose-200">
                        {s.nama.substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 uppercase leading-snug truncate">
                          {s.nama}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                          {s.kelas || 'Santri'} • {sMajelis?.nama || 'Majelis Umum'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200/80 rounded-md text-[8.5px] font-black">
                            Wajib Imtihan Juz {targetJuz}
                          </span>
                          <span className="text-[8.5px] font-bold text-slate-500">
                            (20/20 Hal)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    {isEditable && (
                      <button
                        type="button"
                        onClick={() => handleOpenQuickExam(s, targetJuz)}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9.5px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Catat Ujian</span>
                      </button>
                    )}
                    {isEditable && (
                      <button 
                        type="button"
                        onClick={() => {
                          onNavigateToInput(s.id, targetJuz, 'Imtihan', '1 Juz', s.majelisId);
                        }}
                        className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Form Lengkap</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : isExamCompletedWithinOneDay ? (
        <div className="p-3 sm:p-4 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-emerald-950 uppercase tracking-tight">
                Alhamdulillah! Seluruh Santri Telah Mengikuti Ujian Tahfidz
              </h4>
              <p className="text-[11px] text-emerald-700 font-bold mt-0.5">
                Tidak ada antrian santri yang tertunda untuk Imtihan juz. Seluruh setoran ziyadah berjalan lancar.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="px-2.5 py-1 bg-white text-emerald-800 border border-emerald-200 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-3xs">
              Status: Bebas Tunggakan Ujian
            </span>
            <button
              onClick={() => {
                const todayStr = new Date().toISOString().split('T')[0];
                try {
                  localStorage.setItem('tahfidz_exam_banner_dismissed', todayStr);
                } catch {}
                setIsBannerDismissed(true);
              }}
              className="p-1 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer"
              title="Tutup pemberitahuan hari ini"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {/* 2. KPI SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest">Total Santri</p>
            <Users className="h-4 w-4 text-emerald-500" />
          </div>
          <h4 className="text-2xl sm:text-3xl font-black text-slate-800">{totalSantri}</h4>
          <p className="text-[9px] text-slate-400 font-bold mt-1">Santri Aktif Terdata</p>
        </div>

        <div className="p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-teal-600 mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest">Total Setoran</p>
            <BookOpen className="h-4 w-4 text-teal-500" />
          </div>
          <h4 className="text-2xl sm:text-3xl font-black text-slate-800">{totalSetoranCount}</h4>
          <p className="text-[9px] text-slate-400 font-bold mt-1">Sesi Rekaman KBM</p>
        </div>

        <div className="p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-sky-600 mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest">Total Halaman</p>
            <BookMarked className="h-4 w-4 text-sky-500" />
          </div>
          <h4 className="text-2xl sm:text-3xl font-black text-slate-800">{totalHalamanAll}</h4>
          <p className="text-[9px] text-slate-400 font-bold mt-1">Lembar Terhafal T.A.</p>
        </div>

        <div className="p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest">Rata-rata Juz</p>
            <Sparkles className="h-4 w-4 text-indigo-500" />
          </div>
          <h4 className="text-2xl sm:text-3xl font-black text-slate-800">{avgJuz} <span className="text-xs font-bold text-slate-400">Juz</span></h4>
          <p className="text-[9px] text-slate-400 font-bold mt-1">Capaian per Santri</p>
        </div>

        <div className="p-4 sm:p-5 bg-emerald-900 text-white rounded-3xl shadow-lg flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-emerald-300 mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest">Khatam 30 Juz</p>
            <Award className="h-4 w-4 text-amber-400" />
          </div>
          <h4 className="text-2xl sm:text-3xl font-black text-white">{totalKhatam30} <span className="text-xs font-bold text-emerald-300">Santri</span></h4>
          <p className="text-[9px] text-emerald-300 font-bold mt-1">Hafidz / Hafidzah 30 Juz</p>
        </div>
      </div>

      {/* 3. DATA GRAFIS PERBANDINGAN JUMLAH SISWA DENGAN PEROLEHAN JUZ (KELIPATAN 5) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-3.5 sm:space-y-4">
        
        {/* Header & Filter Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center space-x-3.5">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center shadow-xs">
              <BarChart2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight">
                Distribusi Perolehan Hafalan Santri (Kelipatan 5 Juz)
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                Perbandingan jumlah siswa berdasarkan capaian kelompok 5 juz Al-Qur'an
              </p>
            </div>
          </div>

          {/* Filter Dropdowns for Graph */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[10px] font-black text-slate-500 uppercase">Kelas:</span>
              <select
                value={classFilter}
                onChange={(e) => { setClassFilter(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer"
              >
                <option value="Semua">Semua Kelas</option>
                {classOptions.map((c, cIdx) => <option key={`cls-opt-${c || cIdx}-${cIdx}`} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[10px] font-black text-slate-500 uppercase">Majelis:</span>
              <select
                value={majelisFilter}
                onChange={(e) => { setMajelisFilter(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer"
              >
                <option value="Semua">Semua Majelis</option>
                {majelisList.map((m, mIdx) => <option key={`maj-opt-${m.id || mIdx}-${mIdx}`} value={m.nama}>{m.nama}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* BarChart Graphic */}
        <div className="h-[220px] w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={juzMultiplesData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="range" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fontWeight: 800, fill: '#475569' }} 
              />
              <YAxis 
                allowDecimals={false} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fontWeight: 800, fill: '#94a3b8' }} 
              />
              <RechartsTooltip content={<CustomTahfidzChartTooltip />} />
              <Bar 
                dataKey="count" 
                radius={[12, 12, 0, 0]} 
                name="Jumlah Santri"
              >
                {juzMultiplesData.map((entry, index) => (
                  <Cell key={`bar-cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Multiples of 5 Badges / Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100">
          {juzMultiplesData.map((tier) => {
            const isSelected = juzTierFilter === tier.key;
            return (
              <button
                key={tier.key}
                type="button"
                onClick={() => {
                  setJuzTierFilter(isSelected ? 'all' : (tier.key as any));
                  setCurrentPage(1);
                }}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected 
                    ? 'ring-2 ring-emerald-600 bg-slate-900 text-white border-transparent shadow-md' 
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/80 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider opacity-80">
                    {tier.range}
                  </span>
                  <span 
                    className="h-2.5 w-2.5 rounded-full" 
                    style={{ backgroundColor: tier.fill }} 
                  />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black">{tier.count}</span>
                  <span className={`text-[10px] font-bold ${isSelected ? 'text-emerald-300' : 'text-slate-500'}`}>
                    {tier.percentage}%
                  </span>
                </div>
                <p className={`text-[9px] font-bold truncate mt-1 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                  {tier.key === '26-30' ? 'Khatam 30 Juz' : `Kelipatan ${tier.min}-${tier.max}`}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. TABEL NAMA SISWA DAN JUMLAH JUZ YANG DIHAFAL */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-3.5 sm:space-y-4">
        
        {/* Table Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight">
                Tabel Santri &amp; Perolehan Jumlah Juz
              </h3>
            </div>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              Menampilkan {filteredStudentsForTable.length} dari {students.length} santri terdaftar
            </p>
          </div>

          {/* Search, Tier Filter & Excel Export */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama santri / NISN..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-48 sm:w-56"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Juz Filter Selector */}
            <select
              value={juzTierFilter}
              onChange={(e) => { setJuzTierFilter(e.target.value as any); setCurrentPage(1); }}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">Semua Kelipatan Juz</option>
              <option value="1-5">1 - 5 Juz</option>
              <option value="6-10">6 - 10 Juz</option>
              <option value="11-15">11 - 15 Juz</option>
              <option value="16-20">16 - 20 Juz</option>
              <option value="21-25">21 - 25 Juz</option>
              <option value="26-30">26 - 30 Juz</option>
            </select>

            {/* Export Excel Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow-3xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(juzTierFilter !== 'all' || classFilter !== 'Semua' || majelisFilter !== 'Semua' || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[10px] font-black text-slate-400 uppercase">Filter Aktif:</span>
            {juzTierFilter !== 'all' && (
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-black flex items-center gap-1">
                Tier: {juzTierFilter} Juz
                <button type="button" onClick={() => setJuzTierFilter('all')}><X className="h-3 w-3" /></button>
              </span>
            )}
            {classFilter !== 'Semua' && (
              <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-[10px] font-black flex items-center gap-1">
                Kelas: {classFilter}
                <button type="button" onClick={() => setClassFilter('Semua')}><X className="h-3 w-3" /></button>
              </span>
            )}
            {majelisFilter !== 'Semua' && (
              <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg text-[10px] font-black flex items-center gap-1">
                Majelis: {majelisFilter}
                <button type="button" onClick={() => setMajelisFilter('Semua')}><X className="h-3 w-3" /></button>
              </span>
            )}
            {searchQuery && (
              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-[10px] font-black flex items-center gap-1">
                Cari: "{searchQuery}"
                <button type="button" onClick={() => setSearchQuery('')}><X className="h-3 w-3" /></button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setJuzTierFilter('all');
                setClassFilter('Semua');
                setMajelisFilter('Semua');
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="text-[10px] font-bold text-rose-600 hover:underline ml-1"
            >
              Reset Semua
            </button>
          </div>
        )}

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-3xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 text-slate-600 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Nama Santri</th>
                <th className="py-3.5 px-4">Kelas &amp; Majelis</th>
                <th className="py-3.5 px-4 text-center">Jumlah Juz</th>
                <th className="py-3.5 px-4">Progress Target 30 Juz</th>
                <th className="py-3.5 px-4">Status Ujian</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-bold">
                    Tidak ditemukan data santri yang sesuai filter atau pencarian.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((s, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  
                  // Color badge based on multiples of 5
                  let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (s.jumlahJuz >= 26) badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
                  else if (s.jumlahJuz >= 21) badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
                  else if (s.jumlahJuz >= 16) badgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-200';
                  else if (s.jumlahJuz >= 11) badgeColor = 'bg-sky-100 text-sky-800 border-sky-200';
                  else if (s.jumlahJuz >= 6) badgeColor = 'bg-teal-100 text-teal-800 border-teal-200';
                  else if (s.jumlahJuz >= 1) badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {globalIdx}
                      </td>
                      
                      {/* Santri Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-[10px] shrink-0 border border-slate-200">
                            {s.nama.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 leading-snug">{s.nama}</p>
                            <p className="text-[10px] font-bold text-slate-400">
                              NISN: {s.nisn} • {s.gender}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Kelas & Majelis */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-700">{s.kelas}</p>
                        <p className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                          {s.majelisNama}
                        </p>
                      </td>

                      {/* Jumlah Juz */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-xl text-xs font-black border shadow-3xs ${badgeColor}`}>
                          {s.jumlahJuz} JUZ
                        </span>
                      </td>

                      {/* Progress Bar 30 Juz */}
                      <td className="py-3.5 px-4">
                        <div className="w-full max-w-xs space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-slate-600">{s.jumlahJuz} / 30 Juz</span>
                            <span className="font-black text-emerald-700">{s.persentase}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                              style={{ width: `${s.persentase}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status Ujian */}
                      <td className="py-3.5 px-4">
                        {s.needsExam ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded-md text-[10px] font-black uppercase flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                              Wajib Imtihan Juz {s.targetExamJuz}
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold flex items-center gap-1 w-max">
                            <Check className="h-3 w-3 text-emerald-600" />
                            Tuntas Imtihan
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isEditable && s.needsExam && (
                            <button
                              type="button"
                              onClick={() => handleOpenQuickExam(s, s.targetExamJuz)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase transition shadow-3xs"
                              title="Ujian Sekarang"
                            >
                              Uji
                            </button>
                          )}
                          {isEditable && (
                            <button
                              type="button"
                              onClick={() => {
                                onNavigateToInput(s.id, undefined, 'Ziyadah', undefined, s.majelisId);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-lg text-[10px] font-black uppercase transition shadow-3xs"
                              title="Input Setoran"
                            >
                              Setor
                            </button>
                          )}
                          {!isEditable && (
                            <span className="text-[10px] text-slate-400 font-bold italic">Read-Only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs font-bold text-slate-500">
          <div>
            Menampilkan halaman <span className="font-black text-slate-800">{currentPage}</span> dari{' '}
            <span className="font-black text-slate-800">{totalTablePages}</span> ({filteredStudentsForTable.length} santri)
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-slate-700 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            {Array.from({ length: Math.min(5, totalTablePages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalTablePages > 5 && currentPage > 3) {
                pageNum = Math.min(totalTablePages - 4 + i, currentPage - 2 + i);
              }
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`h-8 w-8 rounded-xl text-xs font-black transition ${
                    currentPage === pageNum
                      ? 'bg-emerald-900 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              disabled={currentPage >= totalTablePages}
              onClick={() => setCurrentPage(p => Math.min(totalTablePages, p + 1))}
              className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-slate-700 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. QUICK EXAM RECORD MODAL */}
      {quickExamModal.isOpen && quickExamModal.student && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 animate-scaleUp">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                    Catat Kelulusan Imtihan
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold">
                    Konfirmasi hasil ujian hafalan santri
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickExamModal({ ...quickExamModal, isOpen: false, student: null })}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Santri Terpilih</p>
                <p className="text-sm font-black text-slate-800">{quickExamModal.student.nama}</p>
                <p className="text-[11px] font-bold text-slate-500">
                  Kelas {quickExamModal.student.kelas} • NISN: {quickExamModal.student.nisn}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Target Juz
                  </label>
                  <input
                    type="text"
                    value={`Juz ${quickExamModal.targetJuz}`}
                    disabled
                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-black text-slate-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Jenis Ujian
                  </label>
                  <select
                    value={quickExamModal.jenisUjian}
                    onChange={(e) => setQuickExamModal({ ...quickExamModal, jenisUjian: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="1 Juz">Imtihan 1 Juz</option>
                    <option value="5 Juz">Imtihan 5 Juz</option>
                    <option value="Semester">Imtihan Semester</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Predikat Nilai
                  </label>
                  <select
                    value={quickExamModal.nilai}
                    onChange={(e) => setQuickExamModal({ ...quickExamModal, nilai: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Mumtaz">Mumtaz (Istimewa)</option>
                    <option value="Jayyid Jiddan">Jayyid Jiddan (Sangat Baik)</option>
                    <option value="Jayyid">Jayyid (Baik)</option>
                    <option value="Maqbul">Maqbul (Cukup)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Tanggal Ujian
                  </label>
                  <input
                    type="date"
                    value={quickExamModal.tanggal}
                    onChange={(e) => setQuickExamModal({ ...quickExamModal, tanggal: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Ustadz Penguji / Penyimak
                </label>
                <select
                  value={quickExamModal.ustadzPenyimakId}
                  onChange={(e) => setQuickExamModal({ ...quickExamModal, ustadzPenyimakId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20"
                >
                  {ustadzList && ustadzList.length > 0 ? (
                    ustadzList.filter(u => {
                      if (!u) return false;
                      const isAktif = String(u.statusUstadz || 'Aktif').trim().toLowerCase() === 'aktif';
                      const t = String(u.tugasAkademik || '').trim().toLowerCase();
                      const isTahfidzDuty = t === 'tahfidz' || t === 'muadalah tahfidz' || t === 'tahfidz muadalah';
                      return (isAktif && isTahfidzDuty) || u.id === quickExamModal.ustadzPenyimakId;
                    }).map((u, uIdx) => (
                      <option key={`quick-exam-u-${u.id || uIdx}-${uIdx}`} value={u.id}>{u.nama} ({u.tugasAkademik || 'Tahfidz'})</option>
                    ))
                  ) : (
                    <option value={guruActiveName}>{guruActiveName || 'Ustadz Penguji'}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Catatan / Keterangan Ujian
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Lulus Imtihan 1 Juz dengan lancar dan fashih"
                  value={quickExamModal.catatan}
                  onChange={(e) => setQuickExamModal({ ...quickExamModal, catatan: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQuickExamModal({ ...quickExamModal, isOpen: false, student: null })}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveQuickExam}
                className="px-5 py-2.5 bg-emerald-900 hover:bg-emerald-950 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-emerald-950/20 flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>Simpan &amp; Luluskan</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
