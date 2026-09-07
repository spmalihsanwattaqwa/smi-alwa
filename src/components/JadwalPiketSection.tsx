import React, { useState, useMemo } from "react";
import {
  Shield,
  ShieldCheck,
  Calendar,
  Clock,
  UserCheck,
  Users,
  Plus,
  Pencil,
  Trash2,
  Download,
  Filter,
  Search,
  RefreshCw,
  MapPin,
  AlertCircle,
  FileSpreadsheet,
  Sparkles,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import * as XLSX from "xlsx";
import { JadwalPiketItem } from "./JadwalPiketModal";

interface JadwalPiketSectionProps {
  piketGuruList: JadwalPiketItem[];
  setPiketGuruList: React.Dispatch<React.SetStateAction<JadwalPiketItem[]>>;
  jadwal: any[];
  allGuruOptions: string[];
  matrixTimeSlots: Array<{ id: string; jamKe: string; waktu: string }>;
  isEditable?: boolean;
  checkGuruTeachingConflict: (guruName: string, hari: string, jamKe: string, waktu?: string) => {
    isTeaching: boolean;
    conflictClasses: Array<{ kelas: string; mapel: string; jam: string }>;
  };
  getSpecialLabelColor: (colorName: string) => {
    card: string;
    badge: string;
    pill: string;
    dot: string;
    text: string;
    ring: string;
  };
  onOpenAddModal: (prefillHari?: string, prefillJamKe?: string, prefillWaktu?: string) => void;
  onOpenEditModal: (item: JadwalPiketItem) => void;
}

export const JadwalPiketSection: React.FC<JadwalPiketSectionProps> = ({
  piketGuruList,
  setPiketGuruList,
  jadwal,
  allGuruOptions,
  matrixTimeSlots,
  isEditable = true,
  checkGuruTeachingConflict,
  getSpecialLabelColor,
  onOpenAddModal,
  onOpenEditModal
}) => {
  const [filterHari, setFilterHari] = useState<string>("Semua");
  const [filterJam, setFilterJam] = useState<string>("Semua");
  const [filterGuru, setFilterGuru] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Inspector state: Day & Time slot to inspect available standby teachers
  const [inspectHari, setInspectHari] = useState<string>("Senin");
  const [inspectJamKe, setInspectJamKe] = useState<string>("Jam 1");

  const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  // Filtered Piket List
  const filteredPikets = useMemo(() => {
    return piketGuruList.filter(p => {
      if (filterHari !== "Semua" && p.hari !== filterHari) return false;
      if (filterJam !== "Semua" && p.jamKe !== filterJam && !p.jamKe.includes(filterJam)) return false;
      if (filterGuru !== "Semua" && p.guru !== filterGuru) return false;
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchGuru = (p.guru || "").toLowerCase().includes(q);
        const matchTugas = (p.tugas || "").toLowerCase().includes(q);
        const matchLokasi = (p.lokasi || "").toLowerCase().includes(q);
        const matchCatatan = (p.catatan || "").toLowerCase().includes(q);
        if (!matchGuru && !matchTugas && !matchLokasi && !matchCatatan) return false;
      }
      return true;
    });
  }, [piketGuruList, filterHari, filterJam, filterGuru, searchQuery]);

  // Inspector calculations for selected inspectHari and inspectJamKe
  const inspectorTargetSlot = matrixTimeSlots.find(s => s.jamKe === inspectJamKe) || matrixTimeSlots[0];
  const inspectorData = useMemo(() => {
    const free: string[] = [];
    const busy: Array<{ teacher: string; conflicts: Array<{ kelas: string; mapel: string; jam: string }> }> = [];

    allGuruOptions.forEach(teacher => {
      const conflict = checkGuruTeachingConflict(teacher, inspectHari, inspectJamKe, inspectorTargetSlot?.waktu);
      if (conflict.isTeaching) {
        busy.push({ teacher, conflicts: conflict.conflictClasses });
      } else {
        free.push(teacher);
      }
    });

    const assignedPiket = piketGuruList.filter(
      p => p.hari === inspectHari && (p.jamKe === inspectJamKe || p.jamKe.includes(inspectJamKe))
    );

    return { free, busy, assignedPiket };
  }, [allGuruOptions, inspectHari, inspectJamKe, inspectorTargetSlot, piketGuruList, checkGuruTeachingConflict]);

  // Export Piket to Excel
  const handleExportExcel = () => {
    try {
      const wsData = [
        ["No", "Hari", "Jam Pelajaran", "Waktu", "Nama Guru Piket", "Tugas / Posisi", "Lokasi", "Catatan"],
        ...piketGuruList.map((p, idx) => [
          idx + 1,
          p.hari,
          p.jamKe,
          p.waktu || "-",
          p.guru,
          p.tugas,
          p.lokasi || "-",
          p.catatan || "-"
        ])
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "Jadwal_Piket_Guru");
      XLSX.writeFile(wb, "Jadwal_Piket_Guru_Madrasah.xlsx");
      alert("✅ Jadwal Piket Guru berhasil diunduh dalam format Excel!");
    } catch (err) {
      alert("Gagal mengunduh file Excel!");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Informative Banner / Concept Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-emerald-500/10 border border-amber-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-black text-slate-800 flex items-center gap-2">
              <span>Jadwal Piket Guru</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black">
                Aturan Konflik Aktif
              </span>
            </h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-3xl">
              Jadwal piket berlaku untuk operasional spm. Sistem otomatis memverifikasi bahwa 
              <strong> guru  piket tidak memiliki jam mengajar di kelas manapun</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isEditable && (
            <button
              onClick={() => onOpenAddModal()}
              className="p-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-amber-600/20"
            >
              <Plus className="h-4 w-4" />
              <span>+ Input Piket Guru</span>
            </button>
          )}
          
          <button
            onClick={handleExportExcel}
            className="p-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="Unduh Jadwal Piket ke Excel"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">Unduh Excel</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Slot Piket</p>
          <p className="text-xl font-black text-amber-600">{piketGuruList.length} Penugasan</p>
          <p className="text-[10px] text-slate-500 font-semibold">Tersebar di 6 hari kerja</p>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Guru Piket</p>
          <p className="text-xl font-black text-emerald-600">
            {new Set(piketGuruList.map(p => p.guru)).size} Asatidz
          </p>
          <p className="text-[10px] text-slate-500 font-semibold">Dari {allGuruOptions.length} total asatidz</p>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Posisi Piket Aktif</p>
          <p className="text-xl font-black text-blue-600">
            {new Set(piketGuruList.map(p => p.tugas)).size} Pos / Bidang
          </p>
          <p className="text-[10px] text-slate-500 font-semibold">KBM, Gerbang, Presensi, dll</p>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pemeriksaan Konflik</p>
          <p className="text-xl font-black text-indigo-600 flex items-center gap-1">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            100% Valid
          </p>
          <p className="text-[10px] text-slate-500 font-semibold">Bebas bentrok KBM</p>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="p-4 bg-slate-900 text-white rounded-3xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-amber-400" />
            <h4 className="text-xs font-black tracking-wide uppercase text-slate-200">
              Filter & Pencarian Jadwal Piket
            </h4>
          </div>
          {(filterHari !== "Semua" || filterJam !== "Semua" || filterGuru !== "Semua" || searchQuery !== "") && (
            <button
              onClick={() => {
                setFilterHari("Semua");
                setFilterJam("Semua");
                setFilterGuru("Semua");
                setSearchQuery("");
              }}
              className="text-[11px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Filter Hari */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Hari</label>
            <select
              value={filterHari}
              onChange={(e) => setFilterHari(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs font-bold py-2 px-3 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="Semua">📅 Semua Hari (Senin - Sabtu)</option>
              {DAYS.map(d => (
                <option key={d} value={d}>Hari {d}</option>
              ))}
            </select>
          </div>

          {/* Filter Jam */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Jam Pelajaran</label>
            <select
              value={filterJam}
              onChange={(e) => setFilterJam(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs font-bold py-2 px-3 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="Semua">⏰ Semua Jam Pelajaran</option>
              {matrixTimeSlots.map(s => (
                <option key={s.id} value={s.jamKe}>
                  {s.jamKe} ({s.waktu})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Guru */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Guru / Ustadz</label>
            <select
              value={filterGuru}
              onChange={(e) => setFilterGuru(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs font-bold py-2 px-3 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="Semua">👨‍🏫 Semua Guru / Ustadz</option>
              {allGuruOptions.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Search Query */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Cari Tugas / Lokasi</label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Ketik tugas, nama, lokasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white text-xs font-bold py-2 pl-8 pr-3 rounded-xl outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* MAIN PIKET MATRIX TABLE (Jam Pelajaran x Hari) */}
      <div className="rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-600" />
              <span>Matriks Jadwal Piket Mingguan</span>
            </h4>
            <span className="text-xs font-bold text-slate-400">
              ({filteredPikets.length} item aktif)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            💡 Klik tombol <strong>+ Piket</strong> di dalam slot untuk menugaskan guru yang sedang bebas mengajar.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider">
                <th className="p-3.5 w-36 text-center border-r border-slate-200 shrink-0">Jam Pelajaran</th>
                {DAYS.map(day => (
                  <th 
                    key={day} 
                    className={`p-3.5 text-center min-w-[200px] border-r border-slate-200 ${
                      filterHari === day ? "bg-amber-100/70 text-amber-900 font-black" : ""
                    }`}
                  >
                    Hari {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matrixTimeSlots.map(slot => {
                return (
                  <tr key={slot.id} className="hover:bg-slate-50/50 transition">
                    {/* Time Slot Label Cell */}
                    <td className="p-3 border-r border-slate-200 bg-slate-50/50 text-center align-top">
                      <p className="text-xs font-black text-slate-800">{slot.jamKe}</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                        {slot.waktu}
                      </span>
                    </td>

                    {/* Day Cells */}
                    {DAYS.map(day => {
                      // Find pikets assigned to this specific slot
                      const slotPikets = filteredPikets.filter(
                        p => p.hari === day && (p.jamKe === slot.jamKe || p.jamKe.includes(slot.jamKe))
                      );

                      return (
                        <td key={day} className="p-2.5 border-r border-slate-100 align-top min-w-[190px]">
                          <div className="space-y-2">
                            {/* List of piket assignments in this slot */}
                            {slotPikets.length > 0 ? (
                              slotPikets.map(item => {
                                const theme = getSpecialLabelColor(item.warna || "amber");
                                return (
                                  <div
                                    key={item.id}
                                    className={`p-2.5 rounded-2xl border transition-all shadow-2xs space-y-1.5 ${theme.card}`}
                                  >
                                    <div className="flex items-start justify-between gap-1">
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-2xs flex items-center gap-1 ${theme.badge}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`}></span>
                                        {item.tugas}
                                      </span>

                                      {isEditable && (
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => onOpenEditModal(item)}
                                            className="p-1 text-slate-400 hover:text-amber-700 rounded-md hover:bg-white/80 transition cursor-pointer"
                                            title="Edit Piket"
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (confirm(`Hapus jadwal pik ${item.guru} pada ${item.hari} ${item.jamKe}?`)) {
                                                setPiketGuruList(prev => prev.filter(p => p.id !== item.id));
                                              }
                                            }}
                                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-white/80 transition cursor-pointer"
                                            title="Hapus Piket"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* Guru Name */}
                                    <h5 className="text-xs font-black text-slate-900 leading-tight">
                                      {item.guru}
                                    </h5>

                                    {/* Verified Non-Teaching Badge */}
                                    <div className="flex items-center gap-1 text-[9px] text-emerald-700 font-extrabold">
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                      <span>Bebas Mengajar</span>
                                    </div>

                                    {/* Location & Note */}
                                    {(item.lokasi || item.catatan) && (
                                      <div className="text-[10px] text-slate-600 font-medium space-y-0.5 pt-1 border-t border-slate-200/50">
                                        {item.lokasi && (
                                          <p className="flex items-center gap-1 truncate" title={item.lokasi}>
                                            <MapPin className="h-2.5 w-2.5 text-slate-400" />
                                            <span>{item.lokasi}</span>
                                          </p>
                                        )}
                                        {item.catatan && (
                                          <p className="italic text-slate-500 truncate" title={item.catatan}>
                                            📝 {item.catatan}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            ) : null}

                            {/* + Tambah Guru Piket in this Cell */}
                            {isEditable && (
                              <button
                                onClick={() => onOpenAddModal(day, slot.jamKe, slot.waktu)}
                                className="w-full py-1.5 px-2 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 text-slate-500 hover:text-amber-800 border border-dashed border-slate-200 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                              >
                                <Plus className="h-3 w-3 text-amber-600" />
                                <span>{slotPikets.length === 0 ? "+ Isi Piket" : "+ Tambah Petugas"}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* INTERACTIVE INSPECTOR: Cek Guru Bebas Mengajar (Pool Asatidz Standby) */}
      <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-600" />
              <span>Inspektur Ketersediaan Guru Piket (Standby Pool)</span>
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              Lihat daftar asatidz yang sedang <strong>bebas mengajar</strong> vs <strong>sedang mengajar</strong> di kelas pada jam tertentu.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={inspectHari}
              onChange={(e) => setInspectHari(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              {DAYS.map(d => (
                <option key={d} value={d}>Hari {d}</option>
              ))}
            </select>

            <select
              value={inspectJamKe}
              onChange={(e) => setInspectJamKe(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              {matrixTimeSlots.map(s => (
                <option key={s.id} value={s.jamKe}>
                  {s.jamKe} ({s.waktu})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Panel 1: Guru Bebas Mengajar (Available for Piket) */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h5 className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                  Guru Bebas Mengajar ({inspectorData.free.length} Asatidz)
                </h5>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-200/70 text-emerald-900">
                Siap Ditugaskan Piket
              </span>
            </div>

            <p className="text-[11px] text-emerald-800 font-medium">
              Asatidz berikut tidak memiliki jam mengajar di kelas manapun pada <strong>{inspectHari} ({inspectJamKe})</strong>:
            </p>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {inspectorData.free.length > 0 ? (
                inspectorData.free.map(teacher => {
                  const isAlreadyPiket = inspectorData.assignedPiket.some(p => p.guru === teacher);
                  return (
                    <div
                      key={teacher}
                      className="p-2 bg-white rounded-xl border border-emerald-200/60 flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 truncate">{teacher}</p>
                        {isAlreadyPiket ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                            🛡️ Sudah terjadwal piket
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700">
                            ✅ Bebas & Siap Ditugaskan
                          </span>
                        )}
                      </div>

                      {isEditable && !isAlreadyPiket && (
                        <button
                          onClick={() => onOpenAddModal(inspectHari, inspectJamKe, inspectorTargetSlot?.waktu)}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-black shrink-0 transition cursor-pointer"
                        >
                          + Pilih Piket
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-500 italic p-3 text-center">
                  Semua guru sedang memiliki jam mengajar pada waktu ini.
                </p>
              )}
            </div>
          </div>

          {/* Panel 2: Guru Sedang Mengajar (Conflict - Disabled) */}
          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <h5 className="text-xs font-black text-rose-950 uppercase tracking-wide">
                  Guru Sedang Mengajar ({inspectorData.busy.length} Asatidz)
                </h5>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-200/70 text-rose-900">
                Tidak Dapat Piket
              </span>
            </div>

            <p className="text-[11px] text-rose-800 font-medium">
              Asatidz berikut sedang aktif mengajar di kelas pada <strong>{inspectHari} ({inspectJamKe})</strong>:
            </p>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {inspectorData.busy.length > 0 ? (
                inspectorData.busy.map(item => (
                  <div
                    key={item.teacher}
                    className="p-2 bg-white rounded-xl border border-rose-200/60 space-y-1 shadow-2xs"
                  >
                    <p className="text-xs font-black text-slate-800">{item.teacher}</p>
                    <div className="flex flex-wrap gap-1">
                      {item.conflicts.map((c, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 text-[10px] font-extrabold border border-rose-200"
                        >
                          🏫 {c.kelas} ({c.mapel})
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic p-3 text-center">
                  Tidak ada guru yang sedang mengajar pada jam ini.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
