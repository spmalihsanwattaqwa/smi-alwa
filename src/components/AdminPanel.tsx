import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Eye, UserCheck, XCircle, 
  CheckCircle, Download, Settings, Save, 
  RefreshCw, ChevronRight, ChevronLeft, 
  ShieldCheck, Phone, MapPin, Mail, Share2, Copy, Check, ExternalLink,
  Sliders, Lock, Unlock, AlertTriangle, X, Calendar, Users, FileText
} from 'lucide-react';
import { Pendaftar, PengaturanSistem, StatusPendaftaran, KuotaJalur } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPanelProps {
  pendaftar: Pendaftar[];
  updatePendaftarStatus: (id: string, status: StatusPendaftaran, notes?: string) => void;
  config: PengaturanSistem;
  updateConfig: (cfg: PengaturanSistem) => void;
  syncFromSheets?: (id: string) => Promise<boolean>;
  isSyncingFromSheets?: boolean;
  isEditable?: boolean;
}

export default function AdminPanel({
  pendaftar,
  updatePendaftarStatus,
  config,
  updateConfig,
  syncFromSheets,
  isSyncingFromSheets,
  isEditable = true
}: AdminPanelProps) {
  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [jalurFilter, setJalurFilter] = useState<string>('Semua');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Detail Modal & Action State
  const [selectedStudent, setSelectedStudent] = useState<Pendaftar | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [copiedPsbLink, setCopiedPsbLink] = useState(false);

  // Modal Pengaturan PSB & Konfigurasi PPDB
  const [showPsbModal, setShowPsbModal] = useState<boolean>(false);
  const [psbConfigForm, setPsbConfigForm] = useState<PengaturanSistem>(() => ({
    ...config,
    ppdbBuka: config?.ppdbBuka ?? true,
    kuota: {
      Zonasi: config?.kuota?.Zonasi ?? 40,
      Prestasi: config?.kuota?.Prestasi ?? 30,
      Afirmasi: config?.kuota?.Afirmasi ?? 20,
      Perpindahan: config?.kuota?.Perpindahan ?? 10,
      ...(config?.kuota || {})
    }
  }));
  const [isSavingPsb, setIsSavingPsb] = useState<boolean>(false);
  const [savePsbToast, setSavePsbToast] = useState<boolean>(false);

  // Sync psbConfigForm when config changes externally
  useEffect(() => {
    if (config) {
      setPsbConfigForm({
        ...config,
        ppdbBuka: config.ppdbBuka ?? true,
        kuota: {
          Zonasi: config.kuota?.Zonasi ?? 40,
          Prestasi: config.kuota?.Prestasi ?? 30,
          Afirmasi: config.kuota?.Afirmasi ?? 20,
          Perpindahan: config.kuota?.Perpindahan ?? 10,
          ...(config.kuota || {})
        }
      });
    }
  }, [config]);

  const handleOpenPsbModal = () => {
    setPsbConfigForm({
      ...config,
      ppdbBuka: config?.ppdbBuka ?? true,
      kuota: {
        Zonasi: config?.kuota?.Zonasi ?? 40,
        Prestasi: config?.kuota?.Prestasi ?? 30,
        Afirmasi: config?.kuota?.Afirmasi ?? 20,
        Perpindahan: config?.kuota?.Perpindahan ?? 10,
        ...(config?.kuota || {})
      }
    });
    setShowPsbModal(true);
  };

  const handleSavePsbConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isEditable) return;
    setIsSavingPsb(true);
    try {
      const updatedConfig: PengaturanSistem = {
        ...config,
        ...psbConfigForm,
        ppdbBuka: Boolean(psbConfigForm.ppdbBuka),
        kuota: {
          Zonasi: Number(psbConfigForm.kuota?.Zonasi) || 0,
          Prestasi: Number(psbConfigForm.kuota?.Prestasi) || 0,
          Afirmasi: Number(psbConfigForm.kuota?.Afirmasi) || 0,
          Perpindahan: Number(psbConfigForm.kuota?.Perpindahan) || 0,
        }
      };
      updateConfig(updatedConfig);
      setSavePsbToast(true);
      setTimeout(() => {
        setSavePsbToast(false);
        setShowPsbModal(false);
      }, 1200);
    } catch (err) {
      console.error("Gagal menyimpan konfigurasi PPDB:", err);
    } finally {
      setIsSavingPsb(false);
    }
  };

  const copyPublicLink = () => {
    const url = `${window.location.origin}/?mode=psb`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    } else {
      const el = document.createElement('input');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedPsbLink(true);
    setTimeout(() => setCopiedPsbLink(false), 3000);
  };

  // Status Colors Mapping
  const getStatusBadge = (status: StatusPendaftaran) => {
    switch (status) {
      case 'Diterima':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Ditolak':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'Terverifikasi':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      default:
        return 'bg-amber-50 text-amber-800 border-amber-200';
    }
  };

  // Filtered List
  const filteredPendaftar = pendaftar.filter((item) => {
    const matchesSearch = 
      item.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nisn.includes(searchTerm) ||
      item.nomorPendaftaran.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sekolahAsal.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'Semua' || item.status === statusFilter;
    const matchesJalur = jalurFilter === 'Semua' || item.jalur === jalurFilter;

    return matchesSearch && matchesStatus && matchesJalur;
  });

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, jalurFilter]);

  const ITEMS_PER_PAGE = 25;
  const totalPages = Math.ceil(filteredPendaftar.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPendaftar = filteredPendaftar.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const selectStudentForReview = (student: Pendaftar) => {
    setSelectedStudent(student);
    setAdminNotes(student.catatanAdmin || '');
  };

  const handleUpdateStatusAndNotes = (newStatus: StatusPendaftaran) => {
    if (!isEditable) return;
    if (!selectedStudent) return;
    updatePendaftarStatus(selectedStudent.id, newStatus, adminNotes);
    
    // update local modal object
    setSelectedStudent(prev => prev ? { ...prev, status: newStatus, catatanAdmin: adminNotes } : null);
  };

  const handleExportCSV = () => {
    if (pendaftar.length === 0) return;
    
    let csvContent = 'No_Reg,Nama_Siswa,NISN,NIK,Gender,Jalur,Jarak_Meter,Nilai_Rapor,Sekolah_Asal,No_HP,Status,Catatan\n';
    
    pendaftar.forEach((p) => {
      csvContent += `"${p.nomorPendaftaran}","${p.namaLengkap}","${p.nisn}","${p.nik}","${p.jenisKelamin}","${p.jalur}",${p.jarakRumah},${p.nilaiRapor},"${p.sekolahAsal}","${p.noHpOrangTua}","${p.status}","${p.catatanAdmin || ''}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PPDB_EXPORT_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-16 animate-apple-fade max-w-full overflow-hidden">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Manajemen Pendaftar</h1>
          <p className="text-[11px] font-medium text-gray-400 mt-1 uppercase tracking-wider">
            PPDB Portal &bull; TA {config.tahunAjaran} &bull; {pendaftar.length} Siswa Terdaftar
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Pengaturan PSB */}
          <button
            onClick={handleOpenPsbModal}
            className="px-4 py-2 bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-900 hover:to-teal-900 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer border border-emerald-600/30"
            title="Buka Pengaturan PPDB & Konfigurasi Buka/Tutup Pendaftaran Santri Baru"
          >
            <Settings className="h-3.5 w-3.5 text-emerald-300" />
            <span>Pengaturan PSB</span>
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
              (config?.ppdbBuka ?? true) 
                ? 'bg-emerald-400 text-emerald-950' 
                : 'bg-rose-500 text-white'
            }`}>
              {(config?.ppdbBuka ?? true) ? 'Buka' : 'Tutup'}
            </span>
          </button>

          <button
            onClick={copyPublicLink}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer"
            title="Salin link pendaftaran santri baru untuk disebarkan ke publik (tanpa tombol portal)"
          >
            {copiedPsbLink ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Link Disalin!</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5" />
                <span>Salin Link PSB Publik</span>
              </>
            )}
          </button>
          {config.spreadsheetId && syncFromSheets && (
            <button
              onClick={() => syncFromSheets(config.spreadsheetId)}
              disabled={isSyncingFromSheets}
              className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-amber-100 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncingFromSheets ? 'animate-spin' : ''}`} />
              {isSyncingFromSheets ? 'Syncing...' : 'Sync Spreadsheet'}
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-gray-50 text-gray-700 border border-gray-100 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center gap-2"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Grid Content */}
      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        {/* Filters Toolbar */}
        <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex flex-col lg:flex-row justify-between gap-4">
          <div className="relative flex-1 max-md:w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari nama, NISN, atau no pendaftaran..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-50 outline-none transition-all"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200">
              <Filter className="h-3.5 w-3.5 text-gray-400" />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-[11px] font-bold uppercase tracking-tight text-gray-600 outline-none bg-transparent cursor-pointer"
              >
                <option value="Semua">Semua Status</option>
                <option value="Pending">Pending</option>
                <option value="Terverifikasi">Terverifikasi</option>
                <option value="Diterima">Diterima</option>
                <option value="Ditolak">Ditolak</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200">
              <ShieldCheck className="h-3.5 w-3.5 text-gray-400" />
              <select 
                value={jalurFilter}
                onChange={(e) => setJalurFilter(e.target.value as any)}
                className="text-[11px] font-bold uppercase tracking-tight text-gray-600 outline-none bg-transparent cursor-pointer"
              >
                <option value="Semua">Semua Jalur</option>
                <option value="Zonasi">Zonasi</option>
                <option value="Prestasi">Prestasi</option>
                <option value="Afirmasi">Afirmasi</option>
                <option value="Mutasi">Mutasi</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">No. Reg</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nama Lengkap</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">NISN</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">JK</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Jalur</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedPendaftar.map((siswa) => (
                <tr key={siswa.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="p-4">
                    <span className="text-[11px] font-mono font-bold text-gray-400 group-hover:text-blue-500 transition-colors">
                      {siswa.nomorPendaftaran}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900 leading-tight">{siswa.namaLengkap}</span>
                      <span className="text-[10px] font-medium text-gray-400">{siswa.sekolahAsal}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-medium text-gray-600">{siswa.nisn}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${siswa.jenisKelamin === 'Laki-laki' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                      {siswa.jenisKelamin === 'Laki-laki' ? 'L' : 'P'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-semibold text-gray-700">{siswa.jalur}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border ${getStatusBadge(siswa.status)}`}>
                        {siswa.status}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => selectStudentForReview(siswa)}
                      className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-blue-600 border border-transparent hover:border-blue-100 transition-all shadow-sm active:scale-95"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedPendaftar.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <RefreshCw className="h-10 w-10 text-gray-400" />
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Data tidak ditemukan</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-gray-50/30 border-t border-gray-50 flex items-center justify-between">
          <p className="text-[11px] font-medium text-gray-400">
            Menampilkan {startIndex + 1} sampai {Math.min(startIndex + ITEMS_PER_PAGE, filteredPendaftar.length)} dari {filteredPendaftar.length} pendaftar
          </p>
          
          <div className="flex items-center gap-1">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-200 transition-all disabled:opacity-20"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="px-4 text-[11px] font-bold text-gray-900">
              Hal {currentPage} / {totalPages}
            </div>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-200 transition-all disabled:opacity-20"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStudent(null)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10 border border-gray-100"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-gray-50 flex justify-between items-start">
                <div className="flex items-center gap-5">
                  <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                    <UserCheck className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">{selectedStudent.namaLengkap}</h2>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded-md uppercase tracking-widest">{selectedStudent.nomorPendaftaran}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight border ${getStatusBadge(selectedStudent.status)}`}>{selectedStudent.status}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedStudent(null)}
                  className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-all active:scale-90"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8 overflow-y-auto space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Informasi Siswa</p>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">NISN</span>
                        <span className="font-bold text-gray-900">{selectedStudent.nisn}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">NIK</span>
                        <span className="font-bold text-gray-900">{selectedStudent.nik}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Sekolah Asal</span>
                        <span className="font-bold text-gray-900">{selectedStudent.sekolahAsal}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Jalur</span>
                        <span className="font-bold text-gray-900">{selectedStudent.jalur}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Kontak & Alamat</p>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">No. HP Orang Tua</span>
                        <span className="font-bold text-gray-900">{selectedStudent.noHpOrangTua}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Alamat</span>
                        <span className="font-bold text-gray-900 text-right max-w-[150px] leading-tight">{selectedStudent.alamat}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Evaluasi Admin</p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase mb-2 block">Catatan Admin</label>
                      <textarea 
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        disabled={!isEditable}
                        readOnly={!isEditable}
                        placeholder={isEditable ? "Tuliskan catatan evaluasi untuk pendaftar ini..." : "Catatan evaluasi (Read-Only)"}
                        className={`w-full px-4 py-3 border rounded-2xl text-sm focus:ring-4 focus:ring-blue-50 outline-none transition-all min-h-[100px] resize-none ${!isEditable ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-gray-50 border-gray-100'}`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 border-t border-gray-50 bg-gray-50/30 flex flex-wrap gap-3">
                {isEditable ? (
                  <>
                    <button 
                      onClick={() => handleUpdateStatusAndNotes('Terverifikasi')}
                      className="flex-1 py-3.5 bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                    >
                      Verifikasi
                    </button>
                    <button 
                      onClick={() => handleUpdateStatusAndNotes('Diterima')}
                      className="flex-1 py-3.5 bg-blue-600 text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                    >
                      Terima
                    </button>
                    <button 
                      onClick={() => handleUpdateStatusAndNotes('Ditolak')}
                      className="flex-1 py-3.5 bg-rose-600 text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 active:scale-95"
                    >
                      Tolak
                    </button>
                  </>
                ) : (
                  <div className="flex-1 py-3 px-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-2xl flex items-center justify-center gap-2">
                    <span>🔒</span>
                    <span>Mode Read-Only: Perubahan status pendaftar dinonaktifkan</span>
                  </div>
                )}
                <button 
                  onClick={() => setSelectedStudent(null)}
                  className="w-full md:w-auto px-8 py-3.5 bg-white text-gray-400 font-bold text-xs uppercase tracking-widest rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all active:scale-95"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL PENGATURAN PSB / KONFIGURASI PPDB & PENDAFTARAN */}
        {showPsbModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 sm:p-7 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white">
                <div className="flex items-center gap-3.5">
                  <div className="h-11 w-11 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-700/20">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Pengaturan PSB & Pendaftaran</h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Kontrol status buka/tutup pendaftaran santri baru dan parameter PPDB
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPsbModal(false)}
                  className="p-2 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-700 transition-all active:scale-90 cursor-pointer"
                  title="Tutup Modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Form Content */}
              <form onSubmit={handleSavePsbConfig} className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-6">
                
                {/* 1. STATUS PENDAFTARAN SANTRI BARU (BUKA / TUTUP) */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                    Status Pendaftaran Santri Baru (PSB Online)
                  </label>

                  {/* Status Banner */}
                  <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    psbConfigForm.ppdbBuka 
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
                      : 'bg-rose-50/70 border-rose-200 text-rose-950'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        psbConfigForm.ppdbBuka ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}>
                        {psbConfigForm.ppdbBuka ? <CheckCircle className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold">
                            {psbConfigForm.ppdbBuka ? 'Pendaftaran Dibuka' : 'Pendaftaran Ditutup'}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            psbConfigForm.ppdbBuka ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                          }`}>
                            {psbConfigForm.ppdbBuka ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {psbConfigForm.ppdbBuka 
                            ? 'Formulir pendaftaran santri baru aktif. Calon santri & wali santri dapat mengisi formulir secara online.' 
                            : 'Pendaftaran ditutup. Formulir pendaftaran dinonaktifkan dan halaman publik menampilkan informasi bahwa pendaftaran ditutup.'}
                        </p>
                      </div>
                    </div>

                    {/* Quick Toggle Buttons */}
                    <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-xs shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setPsbConfigForm(prev => ({ ...prev, ppdbBuka: true }))}
                        disabled={!isEditable}
                        className={`px-3.5 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
                          psbConfigForm.ppdbBuka
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Buka
                      </button>
                      <button
                        type="button"
                        onClick={() => setPsbConfigForm(prev => ({ ...prev, ppdbBuka: false }))}
                        disabled={!isEditable}
                        className={`px-3.5 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
                          !psbConfigForm.ppdbBuka
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. TAHUN AJARAN & DAYA TAMPUNG */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                      Tahun Ajaran PPDB
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input 
                        type="text"
                        value={psbConfigForm.tahunAjaran || ''}
                        onChange={(e) => setPsbConfigForm(prev => ({ ...prev, tahunAjaran: e.target.value }))}
                        disabled={!isEditable}
                        placeholder="Contoh: 2026/2027"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                      Daya Tampung Santri Baru (Total)
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input 
                        type="number"
                        min="0"
                        value={psbConfigForm.dayaTampung ?? ''}
                        onChange={(e) => setPsbConfigForm(prev => ({ ...prev, dayaTampung: Number(e.target.value) || 0 }))}
                        disabled={!isEditable}
                        placeholder="Contoh: 120"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. KUOTA PER JALUR PENDAFTARAN */}
                <div className="space-y-2.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                    Distribusi Kuota per Jalur Pendaftaran
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">Jalur Zonasi</span>
                      <input 
                        type="number"
                        min="0"
                        value={psbConfigForm.kuota?.Zonasi ?? 0}
                        onChange={(e) => setPsbConfigForm(prev => ({
                          ...prev,
                          kuota: { ...(prev.kuota || { Zonasi: 0, Prestasi: 0, Afirmasi: 0, Perpindahan: 0 }), Zonasi: Number(e.target.value) || 0 }
                        }))}
                        disabled={!isEditable}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">Jalur Prestasi</span>
                      <input 
                        type="number"
                        min="0"
                        value={psbConfigForm.kuota?.Prestasi ?? 0}
                        onChange={(e) => setPsbConfigForm(prev => ({
                          ...prev,
                          kuota: { ...(prev.kuota || { Zonasi: 0, Prestasi: 0, Afirmasi: 0, Perpindahan: 0 }), Prestasi: Number(e.target.value) || 0 }
                        }))}
                        disabled={!isEditable}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">Jalur Afirmasi</span>
                      <input 
                        type="number"
                        min="0"
                        value={psbConfigForm.kuota?.Afirmasi ?? 0}
                        onChange={(e) => setPsbConfigForm(prev => ({
                          ...prev,
                          kuota: { ...(prev.kuota || { Zonasi: 0, Prestasi: 0, Afirmasi: 0, Perpindahan: 0 }), Afirmasi: Number(e.target.value) || 0 }
                        }))}
                        disabled={!isEditable}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">Jalur Mutasi</span>
                      <input 
                        type="number"
                        min="0"
                        value={psbConfigForm.kuota?.Perpindahan ?? 0}
                        onChange={(e) => setPsbConfigForm(prev => ({
                          ...prev,
                          kuota: { ...(prev.kuota || { Zonasi: 0, Prestasi: 0, Afirmasi: 0, Perpindahan: 0 }), Perpindahan: Number(e.target.value) || 0 }
                        }))}
                        disabled={!isEditable}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. KUNCI AKSES & FORMULIR */}
                <div className="space-y-2.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                    Kontrol & Batas Pendaftaran
                  </label>
                  <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100 cursor-pointer hover:bg-slate-50 transition">
                      <div className="pr-4">
                        <span className="text-xs font-bold text-slate-800 block">Kunci Formulir Pendaftaran Baru</span>
                        <span className="text-[10px] text-slate-500">Mencegah penambahan data pendaftar baru secara online</span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={Boolean(psbConfigForm.disableDaftarBaru)}
                        onChange={(e) => setPsbConfigForm(prev => ({ ...prev, disableDaftarBaru: e.target.checked }))}
                        disabled={!isEditable}
                        className="h-4 w-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100 cursor-pointer hover:bg-slate-50 transition">
                      <div className="pr-4">
                        <span className="text-xs font-bold text-slate-800 block">Kunci Edit Data oleh Wali Santri</span>
                        <span className="text-[10px] text-slate-500">Wali santri hanya dapat melihat profil biodata tanpa opsi mengubah data</span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={Boolean(psbConfigForm.disableEditSantri)}
                        onChange={(e) => setPsbConfigForm(prev => ({ ...prev, disableEditSantri: e.target.checked }))}
                        disabled={!isEditable}
                        className="h-4 w-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                      />
                    </label>
                  </div>
                </div>

                {/* 5. KONTAK PANITIA PPDB */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                    Informasi Kontak Panitia PPDB
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">No. WhatsApp / Telepon</span>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input 
                          type="text"
                          value={psbConfigForm.kontakTelepon || ''}
                          onChange={(e) => setPsbConfigForm(prev => ({ ...prev, kontakTelepon: e.target.value }))}
                          disabled={!isEditable}
                          placeholder="0812xxxx"
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">Email Resmi PSB</span>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input 
                          type="email"
                          value={psbConfigForm.kontakEmail || ''}
                          onChange={(e) => setPsbConfigForm(prev => ({ ...prev, kontakEmail: e.target.value }))}
                          disabled={!isEditable}
                          placeholder="psb@pesantren.sch.id"
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">Alamat Pesantren / Lokasi Pendaftaran</span>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                      <textarea 
                        rows={2}
                        value={psbConfigForm.alamatSekolah || ''}
                        onChange={(e) => setPsbConfigForm(prev => ({ ...prev, alamatSekolah: e.target.value }))}
                        disabled={!isEditable}
                        placeholder="Alamat lengkap..."
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="w-full sm:w-auto">
                    {savePsbToast && (
                      <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-200 animate-fadeIn">
                        <Check className="h-4 w-4" />
                        <span>Pengaturan PSB berhasil disimpan!</span>
                      </div>
                    )}
                    {!isEditable && (
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 block">
                        🔒 Mode Read-Only: Perubahan dinonaktifkan
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => setShowPsbModal(false)}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={!isEditable || isSavingPsb}
                      className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-emerald-700/20 active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                      {isSavingPsb ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" />
                          <span>Simpan Pengaturan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
