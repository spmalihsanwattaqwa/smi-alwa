import React, { useState, useMemo } from "react";
import { 
  Users, 
  BookOpen, 
  ShieldCheck, 
  Download, 
  Search, 
  Filter, 
  GraduationCap, 
  Clock, 
  Calendar 
} from "lucide-react";
import * as XLSX from "xlsx";
import { JadwalPiketItem } from "./JadwalPiketModal";

interface JadwalRekapBebanSectionProps {
  jadwal: any[];
  piketGuruList: JadwalPiketItem[];
  allGuruOptions: string[];
  matrixTimeSlots: Array<{ id: string; jamKe: string; waktu: string }>;
}

export const JadwalRekapBebanSection: React.FC<JadwalRekapBebanSectionProps> = ({
  jadwal,
  piketGuruList,
  allGuruOptions,
  matrixTimeSlots
}) => {
  const [searchTeacher, setSearchTeacher] = useState("");
  const [filterSort, setFilterSort] = useState<"nama" | "total" | "mengajar" | "piket">("total");

  // Compute workload for each teacher
  const teacherWorkloads = useMemo(() => {
    return allGuruOptions.map(teacher => {
      const cleanTeacher = teacher.trim().toLowerCase();

      // KBM teaching slots
      const teachingSlots = jadwal.filter(
        (j: any) => (j.pengampu || "").trim().toLowerCase() === cleanTeacher
      );

      // Piket duty slots
      const piketSlots = piketGuruList.filter(
        p => (p.guru || "").trim().toLowerCase() === cleanTeacher
      );

      // Distinct classes taught
      const classesTaught = Array.from(
        new Set(teachingSlots.map((j: any) => j.kelas).filter(Boolean))
      );

      // Distinct subjects taught
      const subjectsTaught = Array.from(
        new Set(teachingSlots.map((j: any) => j.mapel).filter(Boolean))
      );

      const totalSlots = teachingSlots.length + piketSlots.length;

      return {
        nama: teacher,
        jamMengajar: teachingSlots.length,
        jamPiket: piketSlots.length,
        totalBeban: totalSlots,
        classesTaught,
        subjectsTaught,
        piketSlots
      };
    }).filter(item => {
      if (searchTeacher.trim() === "") return true;
      return item.nama.toLowerCase().includes(searchTeacher.toLowerCase());
    }).sort((a, b) => {
      if (filterSort === "total") return b.totalBeban - a.totalBeban;
      if (filterSort === "mengajar") return b.jamMengajar - a.jamMengajar;
      if (filterSort === "piket") return b.jamPiket - a.jamPiket;
      return String(a?.nama || '').localeCompare(String(b?.nama || ''));
    });
  }, [allGuruOptions, jadwal, piketGuruList, searchTeacher, filterSort]);

  // Export Workload to Excel
  const handleExportExcel = () => {
    try {
      const wsData = [
        ["No", "Nama Guru / Ustadz", "Jam Mengajar (KBM)", "Jam Piket", "Total Jam Tugas", "Kelas yang Diajar", "Mata Pelajaran", "Jadwal Piket"],
        ...teacherWorkloads.map((t, idx) => [
          idx + 1,
          t.nama,
          t.jamMengajar,
          t.jamPiket,
          t.totalBeban,
          t.classesTaught.join(", ") || "-",
          t.subjectsTaught.join(", ") || "-",
          t.piketSlots.map(p => `${p.hari} (${p.jamKe})`).join(", ") || "-"
        ])
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "Rekap_Beban_Guru");
      XLSX.writeFile(wb, "Rekap_Beban_Mengajar_dan_Piket_Guru.xlsx");
      alert("✅ Rekap Beban Mengajar & Piket Guru berhasil diunduh dalam format Excel!");
    } catch (e) {
      alert("Gagal mengunduh file Excel!");
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header & Export */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-emerald-700" />
            <span>Rekap Beban Kerja Guru (KBM Mengajar & Jadwal Piket)</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Akumulasi jam mengajar di kelas dan penugasan piket madrasah per asatidz.
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="p-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-700/20 shrink-0"
        >
          <Download className="h-4 w-4" />
          <span>Unduh Rekap Beban (.xlsx)</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
        <div className="relative w-full sm:w-72">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari nama guru / ustadz..."
            value={searchTeacher}
            onChange={(e) => setSearchTeacher(e.target.value)}
            className="w-full bg-white border border-slate-200 text-xs font-bold py-2 pl-8 pr-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-bold text-slate-500">Urutkan:</span>
          <select
            value={filterSort}
            onChange={(e) => setFilterSort(e.target.value as any)}
            className="bg-white border border-slate-200 text-xs font-black py-2 px-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
          >
            <option value="total">🔥 Total Jam Tertinggi</option>
            <option value="mengajar">📚 Jam Mengajar Terbanyak</option>
            <option value="piket">🛡️ Jam Piket Terbanyak</option>
            <option value="nama">🔤 Abjad Nama (A - Z)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-black uppercase tracking-wider">
                <th className="p-3.5 w-12 text-center">No</th>
                <th className="p-3.5">Nama Guru / Ustadz</th>
                <th className="p-3.5 text-center">Jam Mengajar (KBM)</th>
                <th className="p-3.5 text-center">Jam Piket Mandiri</th>
                <th className="p-3.5 text-center">Total Beban</th>
                <th className="p-3.5">Detail Kelas & Mapel</th>
                <th className="p-3.5">Jadwal Piket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teacherWorkloads.map((t, idx) => (
                <tr key={t.nama} className="hover:bg-slate-50/60 transition">
                  <td className="p-3.5 text-center font-bold text-slate-400">{idx + 1}</td>
                  <td className="p-3.5 font-black text-slate-800">{t.nama}</td>
                  <td className="p-3.5 text-center">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-black border border-emerald-200">
                      {t.jamMengajar} Jam
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-black border border-amber-200">
                      {t.jamPiket} Jam
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="inline-block px-3 py-1 rounded-xl bg-slate-900 text-white font-black">
                      {t.totalBeban} Jam / Minggu
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-600 max-w-xs">
                    {t.classesTaught.length > 0 ? (
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-700 truncate">{t.subjectsTaught.join(", ")}</p>
                        <p className="text-[10px] text-slate-400 truncate">{t.classesTaught.join(", ")}</p>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">-</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    {t.piketSlots.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {t.piketSlots.map((p, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-900 text-[10px] font-bold border border-amber-200"
                            title={`${p.tugas} - ${p.lokasi || ""}`}
                          >
                            🛡️ {p.hari} ({p.jamKe})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Belum ada piket</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
