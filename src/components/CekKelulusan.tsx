import React, { useState } from 'react';
import { Search, CheckCircle, XCircle, Clock, AlertTriangle, Printer, Award, FileText, ChevronRight, School } from 'lucide-react';
import { Pendaftar } from '../types';

interface CekKelulusanProps {
  pendaftar: Pendaftar[];
}

export default function CekKelulusan({ pendaftar }: CekKelulusanProps) {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<Pendaftar | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const trimmedQuery = query.trim().toUpperCase();
    // Search by Nomor Pendaftaran or NISN
    const match = pendaftar.find(
      (p) => p.nomorPendaftaran === trimmedQuery || p.nisn === query.trim()
    );

    setResult(match || null);
    setSearched(true);
  };

  const handlePrintAcceptance = () => {
    window.print();
  };

  return (
    <div className="max-w-3xl mx-auto pb-16 space-y-12 animate-apple-fade">
      
      {/* Search Header */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Status Hasil Seleksi PPDB
        </h1>
        <p className="text-sm text-gray-500 font-medium max-w-xl mx-auto leading-relaxed">
          Masukkan Nomor Pendaftaran (contoh: PPDB-2026-0001) atau 10-digit NISN untuk memeriksa hasil seleksi pendaftaran Anda.
        </p>
      </section>

      {/* Search Bar Form */}
      <section className="saas-card p-8">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              required
              placeholder="Contoh: PPDB-2026-0001 atau 0112345678"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 saas-input font-bold tracking-tight uppercase"
            />
          </div>
          <button
            id="btn-submit-search"
            type="submit"
            className="saas-button"
          >
            <span>Cek Status</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </form>
      </section>

      {/* Search Results Display Section */}
      {searched && (
        <section className="animate-apple-fade">
          {result ? (
            <div className="saas-card overflow-hidden">
              
              {/* Result Status Bar */}
              <div className={`p-8 flex items-center gap-6 text-white ${
                result.status === 'Diterima' 
                  ? 'bg-emerald-600' 
                  : result.status === 'Ditolak' 
                  ? 'bg-rose-600'
                  : 'bg-amber-500'
              }`}>
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                  {result.status === 'Diterima' ? (
                    <CheckCircle className="h-8 w-8" />
                  ) : result.status === 'Ditolak' ? (
                    <XCircle className="h-8 w-8" />
                  ) : (
                    <Clock className="h-8 w-8" />
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-bold leading-tight">
                    {result.status === 'Diterima' 
                      ? 'Dinyatakan Lulus / Diterima' 
                      : result.status === 'Ditolak' 
                      ? 'Belum Diterima'
                      : 'Proses Verifikasi Berjalan'}
                  </h3>
                  <p className="text-xs opacity-80 font-medium mt-1">
                    {result.status === 'Diterima'
                      ? 'Selamat! Anda telah memenuhi seluruh persyaratan dan dinyatakan diterima sebagai santri baru.'
                      : result.status === 'Ditolak'
                      ? 'Mohon maaf, pendaftaran Anda belum memenuhi kriteria kuota penerimaan saat ini.'
                      : 'Panitia sedang melakukan verifikasi berkas pendaftaran Anda. Silakan cek kembali secara berkala.'}
                  </p>
                </div>
              </div>

              {/* Quick Candidate Profile Card */}
              <div className="p-10 space-y-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nama Lengkap</span>
                      <span className="text-sm font-bold text-gray-900">{result.namaLengkap}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nomor NISN</span>
                      <span className="text-sm font-bold text-gray-900 font-mono">{result.nisn}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nomor Pendaftaran</span>
                      <span className="text-sm font-bold text-blue-600 font-mono">{result.nomorPendaftaran}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Jalur Seleksi</span>
                      <span className="text-sm font-bold text-gray-900">{result.jalur}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sekolah Asal</span>
                      <span className="text-sm font-bold text-gray-900">{result.sekolahAsal}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nilai Rapor</span>
                      <span className="text-sm font-bold text-gray-900 font-mono">{result.nilaiRapor}</span>
                    </div>
                  </div>
                </div>

                {/* Case Details */}
                {result.status === 'Diterima' && (
                  <div className="space-y-8">
                    
                    {/* Visual Official Surat Keputusan Card */}
                    <div id="print-sk-area" className="border border-gray-150 p-10 rounded-[40px] bg-white text-gray-900 space-y-8 max-w-xl mx-auto shadow-sm relative">
                      <div className="absolute top-0 right-0 p-10 opacity-[0.03]">
                        <Award className="h-40 w-40" />
                      </div>

                      <div className="text-center pb-6 border-b border-gray-100 relative">
                        <div className="flex justify-center items-center gap-3 mb-2">
                          <School className="h-8 w-8 text-blue-600" />
                          <span className="text-xl font-bold tracking-tight">PANITIA PPDB</span>
                        </div>
                        <span className="text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase">SURAT KETERANGAN RESMI</span>
                      </div>

                      <div className="text-center space-y-1 relative">
                        <span className="text-sm font-bold text-gray-900 block uppercase tracking-widest">Surat Keterangan Diterima</span>
                        <span className="text-[10px] font-mono text-gray-400 block font-bold">No: SK-PPDB/2026/00{result.id}</span>
                      </div>

                      <div className="text-sm text-gray-600 leading-relaxed text-center space-y-6 relative px-4">
                        <p className="font-medium">
                          Panitia Penerimaan Santri Baru, setelah memeriksa dan memverifikasi seluruh berkas dokumen serta rekam akademik, menyatakan bahwa:
                        </p>
                        
                        <div className="py-6 bg-gray-50/50 rounded-[24px] space-y-2 border border-gray-100">
                          <p className="text-lg font-bold text-gray-900">{result.namaLengkap}</p>
                          <p className="text-xs font-bold text-gray-400 font-mono tracking-widest">NISN: {result.nisn}</p>
                        </div>

                        <div className="py-3 bg-emerald-50 rounded-full border border-emerald-100">
                          <span className="text-emerald-700 font-bold uppercase tracking-[0.2em] text-[11px]">Dinyatakan DITERIMA untuk Tahun Ajaran 2026/2027</span>
                        </div>

                        <p className="text-[11px] font-medium text-gray-400 leading-normal italic">
                          Keputusan ini bersifat mengikat dengan ketentuan pendaftar menyelesaikan proses daftar ulang fisik sebelum {result.tanggalDaftar}.
                        </p>
                      </div>

                      <div className="pt-8 flex justify-between items-end text-[10px] text-gray-400 font-bold uppercase tracking-widest relative">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                          <span>Verifikasi Digital: Sah</span>
                        </div>
                        <div className="text-right text-gray-900 space-y-6">
                          <div className="space-y-1">
                            <span className="block opacity-40">Diterbitkan oleh</span>
                            <span className="block text-sm">Panitia PPDB</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Print Button Link */}
                    <div className="flex justify-center">
                      <button
                        id="btn-print-sk"
                        onClick={handlePrintAcceptance}
                        className="btn-apple-primary px-10 space-x-3 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                      >
                        <Printer className="h-4 w-4" />
                        <span>Cetak Surat Keterangan</span>
                      </button>
                    </div>

                    <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-[24px] text-xs text-blue-800 leading-relaxed font-bold flex items-start gap-3">
                      <Clock className="h-5 w-5 shrink-0 text-blue-600" />
                      <span>Harap cetak surat keterangan ini dan bawa seluruh dokumen asli saat melakukan daftar ulang fisik di Sekretariat PPDB.</span>
                    </div>

                  </div>
                )}

                {result.status === 'Ditolak' && (
                  <div className="space-y-6">
                    <div className="bg-rose-50 border border-rose-100 p-8 rounded-[32px] space-y-4">
                      <div className="flex items-center gap-3 text-rose-800">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="text-sm font-bold uppercase tracking-widest">Catatan Status</span>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-rose-100">
                        <p className="text-sm font-bold text-gray-700 italic leading-relaxed">
                          "{result.catatanAdmin || 'Pendaftar belum memenuhi batas minimum kriteria seleksi kuota pendaftaran.'}"
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-400 leading-relaxed font-bold max-w-lg mx-auto text-center uppercase tracking-widest">
                      Terima kasih atas partisipasi Anda. Apabila terdapat kekeliruan verifikasi, silakan hubungi Sekretariat PPDB.
                    </p>
                  </div>
                )}

                {result.status === 'Pending' && (
                  <div className="space-y-8 text-center py-6">
                    <div className="flex flex-col items-center space-y-4">
                       <div className="h-20 w-20 bg-amber-50 rounded-full flex items-center justify-center border border-amber-200">
                         <Clock className="h-10 w-10 text-amber-500 animate-pulse" />
                       </div>
                       <span className="text-sm font-bold text-amber-700 uppercase tracking-widest">Verifikasi Berjalan</span>
                    </div>
                    <div className="bg-amber-50/50 border border-amber-100 p-8 rounded-[32px] max-w-lg mx-auto text-left">
                      <span className="text-[10px] font-bold text-amber-950 uppercase tracking-widest block mb-4">Catatan Panitia</span>
                      <p className="text-sm font-bold text-gray-700 italic bg-white p-6 rounded-2xl border border-amber-100">
                        "{result.catatanAdmin || 'Berkas dokumen sedang diverifikasi oleh tim sekretariat PPDB.'}"
                      </p>
                    </div>
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">
                      Silakan cek kembali secara berkala untuk pembaruan status.
                    </p>
                  </div>
                )}

                {result.status === 'Terverifikasi' && (
                  <div className="space-y-8 text-center py-6">
                    <div className="flex flex-col items-center space-y-4">
                       <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-200">
                         <CheckCircle className="h-10 w-10 text-emerald-600" />
                       </div>
                       <span className="text-sm font-bold text-emerald-800 uppercase tracking-widest">Berkas Terverifikasi</span>
                    </div>
                    <div className="bg-emerald-50/50 border border-emerald-100 p-8 rounded-[32px] max-w-lg mx-auto text-left">
                      <span className="text-[10px] font-bold text-emerald-950 uppercase tracking-widest block mb-4">Keterangan Verifikasi</span>
                      <p className="text-sm font-bold text-gray-700 leading-relaxed bg-white p-6 rounded-2xl border border-emerald-100">
                        Seluruh dokumen administratif (KK, Akta Kelahiran, dan Nilai Rapor) telah lolos verifikasi faktual panitia.
                      </p>
                    </div>
                  </div>
                )}

              </div>

            </div>
          ) : (
            <div className="bg-white border border-gray-100 p-12 rounded-[32px] text-center max-w-md mx-auto shadow-xl shadow-gray-200/50 space-y-6">
              <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto border border-gray-100">
                <Search className="h-10 w-10 text-gray-300" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">Data Tidak Ditemukan</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed px-4">
                  Pastikan Nomor Pendaftaran atau NISN yang Anda masukkan sudah benar dan pendaftaran telah terkirim.
                </p>
              </div>
            </div>
          )}
        </section>
      )}

    </div>
  );
}
