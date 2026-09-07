import React, { useState } from "react";
import { 
  Shield, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Save, 
  Clock, 
  Calendar, 
  MapPin, 
  FileText, 
  Sparkles,
  UserCheck
} from "lucide-react";

export interface JadwalPiketItem {
  id: string;
  hari: string; // "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"
  jamKe: string; // "Jam 1", "Jam 2", ...
  waktu: string; // "09:00 - 09:25"
  guru: string; // Nama Guru / Ustadz
  tugas: string; // e.g. "Piket KBM & Ketertiban", "Piket Gerbang & Kedisiplinan", dll.
  lokasi?: string; // "Pos Utama", "Lobi Madrasah", "Selasar Kelas"
  catatan?: string;
  warna?: string; // "amber" | "emerald" | "rose" | "blue" | "purple" | "teal" | "indigo" | "cyan" | "slate"
}

interface JadwalPiketModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<JadwalPiketItem> | null;
  matrixTimeSlots: Array<{ id: string; jamKe: string; waktu: string }>;
  allGuruOptions: string[];
  checkGuruTeachingConflict: (guruName: string, hari: string, jamKe: string, waktu?: string) => {
    isTeaching: boolean;
    conflictClasses: Array<{ kelas: string; mapel: string; jam: string }>;
  };
  onSave: (piketItem: Omit<JadwalPiketItem, "id"> & { id?: string }) => void;
}

const PRESET_TUGAS = [
  { nama: "Piket KBM & Ketertiban", icon: "🛡️", desc: "Monitoring kelas, ketertiban & kesiapan santri" },
  { nama: "Piket Gerbang & Kedisiplinan", icon: "🚪", desc: "Penyambutan santri & pengawasan pintu masuk" },
  { nama: "Piket Presensi & Jurnal Asatidz", icon: "📋", desc: "Rekap kehadiran asatidz & jurnal mengajar" },
  { nama: "Piket Ruang Guru & Tamu", icon: "🏢", desc: "Penerimaan tamu & koordinasi asatidz" },
  { nama: "Piket Pengawasan & Keliling", icon: "🚶", desc: "Patroli ketertiban area madrasah & asrama" },
  { nama: "Piket Kebersihan Lingkungan", icon: "🧹", desc: "Pemeriksaan kebersihan kelas & selasar" },
  { nama: "Piket Ibadah & Sholat", icon: "🕌", desc: "Pengondisian sholat dhuha / berjamaah" },
];

const PRESET_WARNA = [
  { name: "amber", label: "Amber / Emas", bg: "bg-amber-500" },
  { name: "emerald", label: "Emerald / Hijau", bg: "bg-emerald-600" },
  { name: "rose", label: "Rose / Merah", bg: "bg-rose-500" },
  { name: "blue", label: "Blue / Biru", bg: "bg-blue-600" },
  { name: "purple", label: "Purple / Ungu", bg: "bg-purple-600" },
  { name: "teal", label: "Teal / Toska", bg: "bg-teal-600" },
  { name: "indigo", label: "Indigo / Nila", bg: "bg-indigo-600" },
  { name: "cyan", label: "Cyan / Biru Muda", bg: "bg-cyan-600" },
  { name: "slate", label: "Slate / Abu-abu", bg: "bg-slate-600" }
];

export const JadwalPiketModal: React.FC<JadwalPiketModalProps> = ({
  isOpen,
  onClose,
  initialData,
  matrixTimeSlots,
  allGuruOptions,
  checkGuruTeachingConflict,
  onSave
}) => {
  const [hari, setHari] = useState<string>(initialData?.hari || "Senin");
  const [jamKe, setJamKe] = useState<string>(initialData?.jamKe || matrixTimeSlots[0]?.jamKe || "Jam 1");
  const [waktu, setWaktu] = useState<string>(initialData?.waktu || matrixTimeSlots[0]?.waktu || "09:00 - 09:25");
  const [guru, setGuru] = useState<string>(initialData?.guru || "");
  const [tugas, setTugas] = useState<string>(initialData?.tugas || "Piket KBM & Ketertiban");
  const [isCustomTugas, setIsCustomTugas] = useState<boolean>(false);
  const [customTugasText, setCustomTugasText] = useState<string>("");
  const [lokasi, setLokasi] = useState<string>(initialData?.lokasi || "Ruang Piket / Lobi");
  const [catatan, setCatatan] = useState<string>(initialData?.catatan || "");
  const [warna, setWarna] = useState<string>(initialData?.warna || "amber");

  // Keep state in sync if initialData changes
  React.useEffect(() => {
    if (initialData) {
      setHari(initialData.hari || "Senin");
      const matchedSlot = matrixTimeSlots.find(s => s.jamKe === initialData.jamKe) || matrixTimeSlots[0];
      setJamKe(initialData.jamKe || matchedSlot?.jamKe || "Jam 1");
      setWaktu(initialData.waktu || matchedSlot?.waktu || "09:00 - 09:25");
      setGuru(initialData.guru || "");
      const isPreset = PRESET_TUGAS.some(t => t.nama === initialData.tugas);
      if (initialData.tugas && !isPreset) {
        setIsCustomTugas(true);
        setCustomTugasText(initialData.tugas);
        setTugas(initialData.tugas);
      } else {
        setIsCustomTugas(false);
        setTugas(initialData.tugas || "Piket KBM & Ketertiban");
      }
      setLokasi(initialData.lokasi || "Ruang Piket / Lobi");
      setCatatan(initialData.catatan || "");
      setWarna(initialData.warna || "amber");
    }
  }, [initialData, matrixTimeSlots]);

  if (!isOpen) return null;

  // Real-time conflict validation for currently selected teacher at this specific day & time
  const currentConflict = checkGuruTeachingConflict(guru, hari, jamKe, waktu);
  const isConflict = currentConflict.isTeaching;

  // Classify all teachers into Free (Bebas Mengajar) vs Teaching (Sedang Mengajar)
  const classifiedTeachers = allGuruOptions.map(t => {
    const conflict = checkGuruTeachingConflict(t, hari, jamKe, waktu);
    return {
      name: t,
      isTeaching: conflict.isTeaching,
      conflictClasses: conflict.conflictClasses
    };
  });

  const freeTeachers = classifiedTeachers.filter(t => !t.isTeaching);
  const busyTeachers = classifiedTeachers.filter(t => t.isTeaching);

  const handleSave = () => {
    const finalTugas = isCustomTugas ? customTugasText.trim() : tugas.trim();
    const finalGuru = guru.trim();

    if (!finalGuru) {
      alert("Silakan pilih guru / ustadz yang akan ditugaskan piket.");
      return;
    }

    if (!finalTugas) {
      alert("Silakan pilih atau isi jenis tugas / posisi piket.");
      return;
    }

    // STRICT VALIDATION: Rule enforcement!
    const conflictCheck = checkGuruTeachingConflict(finalGuru, hari, jamKe, waktu);
    if (conflictCheck.isTeaching) {
      alert(
        `⛔ GAGAL MENYIMPAN PIKET!\n\n` +
        `Ustadz "${finalGuru}" tidak dapat ditugaskan piket pada hari ${hari}, ${jamKe} (${waktu}) karena SEDANG MENGAJAR di:\n\n` +
        conflictCheck.conflictClasses.map(c => `• ${c.kelas} — Mata Pelajaran: ${c.mapel}`).join("\n") +
        `\n\nSesuai aturan jadwal, jadwal piket HANYA bisa diinput jika guru tersebut TIDAK sedang mengajar pada jam tersebut.`
      );
      return;
    }

    onSave({
      id: initialData?.id,
      hari,
      jamKe,
      waktu,
      guru: finalGuru,
      tugas: finalTugas,
      lokasi: lokasi.trim() || "Area Madrasah",
      catatan: catatan.trim(),
      warna
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full p-6 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                {initialData?.id ? "Edit Jadwal Piket Guru" : "Input Jadwal Piket Guru"}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Jadwal piket mandiri (tidak terikat kelas). Hanya bisa diinput jika guru tidak mengajar di jam tersebut.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4">
          {/* Row 1: Hari & Jam Slot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
            {/* Hari */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-amber-600" />
                <span>Hari Piket</span>
              </label>
              <select
                value={hari}
                onChange={(e) => setHari(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer shadow-2xs"
              >
                {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map(h => (
                  <option key={h} value={h}>Hari {h}</option>
                ))}
              </select>
            </div>

            {/* Jam Pelajaran */}
            <div className="space-y-1">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                <span>Jam Pelajaran</span>
              </label>
              <select
                value={jamKe}
                onChange={(e) => {
                  const val = e.target.value;
                  setJamKe(val);
                  const matched = matrixTimeSlots.find(s => s.jamKe === val);
                  if (matched) setWaktu(matched.waktu);
                }}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer shadow-2xs"
              >
                {matrixTimeSlots.map(slot => (
                  <option key={slot.id} value={slot.jamKe}>
                    {slot.jamKe} ({slot.waktu})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Guru Selection with Live Availability Grouping */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-slate-700 flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-emerald-600" />
                <span>Pilih Guru / Ustadz Piket</span>
              </label>
              <span className="text-[10px] font-bold text-slate-500">
                Tersedia {freeTeachers.length} ustadz bebas mengajar
              </span>
            </div>

            <select
              value={guru}
              onChange={(e) => setGuru(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-extrabold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
            >
              <option value="">-- Pilih Guru / Ustadz Piket --</option>
              
              {/* Group 1: Available / Free teachers */}
              <optgroup label={`🟢 Guru Bebas Mengajar (Siap Piket — ${freeTeachers.length} Orang)`}>
                {freeTeachers.map(t => (
                  <option key={t.name} value={t.name} className="text-emerald-800 font-bold">
                    ✅ {t.name} (Bebas Mengajar)
                  </option>
                ))}
              </optgroup>

              {/* Group 2: Teachers who are currently teaching (Disabled!) */}
              {busyTeachers.length > 0 && (
                <optgroup label={`⛔ Guru Sedang Mengajar (${busyTeachers.length} Orang — Tidak Dapat Dipilih)`}>
                  {busyTeachers.map(t => {
                    const conflictDesc = t.conflictClasses.map(c => `${c.kelas} [${c.mapel}]`).join(", ");
                    return (
                      <option 
                        key={t.name} 
                        value={t.name} 
                        disabled
                        className="text-rose-600 bg-rose-50/50 font-medium"
                      >
                        ⛔ {t.name} — Sedang Mengajar di {conflictDesc}
                      </option>
                    );
                  })}
                </optgroup>
              )}
            </select>
          </div>

          {/* DYNAMIC STATUS CARD: Live Validation Feedback */}
          {guru && (
            <div>
              {isConflict ? (
                <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 flex items-start gap-2.5 animate-fadeIn">
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <p className="font-black text-rose-800">
                      ⛔ KONFLIK JADWAL: Guru Sedang Mengajar di Jam Ini!
                    </p>
                    <p className="text-[11px] text-rose-700 leading-relaxed font-medium">
                      <strong>{guru}</strong> memiliki jadwal KBM aktif pada <strong>Hari {hari} ({jamKe})</strong> di:
                    </p>
                    <ul className="list-disc list-inside text-[11px] font-bold text-rose-900 pl-1">
                      {currentConflict.conflictClasses.map((c, i) => (
                        <li key={i}>{c.kelas} — Mata Pelajaran: {c.mapel}</li>
                      ))}
                    </ul>
                    <p className="text-[10px] text-rose-600 italic font-semibold pt-1 border-t border-rose-200">
                      * Sesuai aturan madrasah, jadwal piket hanya dapat diisi jika guru TIDAK sedang mengajar di jam tersebut.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-start gap-2.5 animate-fadeIn">
                  <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-xs">
                    <p className="font-black text-emerald-800">
                      ✅ Guru Bebas Mengajar & Siap Bertugas Piket
                    </p>
                    <p className="text-[11px] text-emerald-700 leading-relaxed">
                      <strong>{guru}</strong> tidak memiliki jadwal mengajar di kelas manapun pada <strong>Hari {hari}, {jamKe} ({waktu})</strong>. Memenuhi syarat penugasan piket.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Row 3: Tugas / Posisi Piket */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-slate-700">Tugas / Posisi Piket</label>
              <button
                type="button"
                onClick={() => setIsCustomTugas(!isCustomTugas)}
                className="text-[10px] font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
              >
                {isCustomTugas ? "← Gunakan Pilihan Preset" : "+ Tulis Tugas Kustom"}
              </button>
            </div>

            {!isCustomTugas ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-2xl">
                {PRESET_TUGAS.map((pt) => {
                  const isSelected = tugas === pt.nama;
                  return (
                    <button
                      key={pt.nama}
                      type="button"
                      onClick={() => setTugas(pt.nama)}
                      className={`p-2 rounded-xl text-left transition flex items-start gap-2 cursor-pointer border ${
                        isSelected
                          ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:border-amber-400 hover:bg-amber-50/50"
                      }`}
                    >
                      <span className="text-base shrink-0">{pt.icon}</span>
                      <div className="min-w-0">
                        <p className={`text-xs font-extrabold truncate ${isSelected ? "text-white" : "text-slate-800"}`}>
                          {pt.nama}
                        </p>
                        <p className={`text-[10px] truncate ${isSelected ? "text-amber-100" : "text-slate-400"}`}>
                          {pt.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1 bg-amber-50/60 p-3 rounded-2xl border border-amber-200">
                <label className="block text-[11px] font-bold text-amber-900">Tulis Posisi / Tugas Piket Kustom:</label>
                <input
                  type="text"
                  placeholder="Misal: Piket Pembagian Snack, Piket Musyrif Lab, dll..."
                  value={customTugasText}
                  onChange={(e) => setCustomTugasText(e.target.value)}
                  className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>
            )}
          </div>

          {/* Row 4: Lokasi / Pos Piket & Warna Badge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Lokasi Pos */}
            <div className="space-y-1">
              <label className="block text-xs font-black text-slate-700 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-amber-600" />
                <span>Lokasi / Pos Piket</span>
              </label>
              <input
                type="text"
                placeholder="Misal: Pos Utama, Lobi Madrasah, Selasar Kelas..."
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            {/* Warna Badge */}
            <div className="space-y-1">
              <label className="block text-xs font-black text-slate-700 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>Warna Tema Badge</span>
              </label>
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                {PRESET_WARNA.map(pw => (
                  <button
                    key={pw.name}
                    type="button"
                    onClick={() => setWarna(pw.name)}
                    title={pw.label}
                    className={`w-6 h-6 rounded-full ${pw.bg} transition-all cursor-pointer ${
                      warna === pw.name ? "ring-3 ring-slate-800 ring-offset-1 scale-110 shadow-xs" : "opacity-70 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Row 5: Catatan / Instruksi Piket */}
          <div className="space-y-1">
            <label className="block text-xs font-black text-slate-700 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-amber-600" />
              <span>Catatan / Instruksi Khusus (Opsional)</span>
            </label>
            <input
              type="text"
              placeholder="Misal: Standby form izin keluar, membawa bel, koordinasi wali kelas..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Batal
          </button>
          
          <button
            type="button"
            disabled={isConflict || !guru.trim()}
            onClick={handleSave}
            className={`px-5 py-2.5 text-white text-xs font-black rounded-xl shadow-md transition flex items-center gap-1.5 ${
              isConflict || !guru.trim()
                ? "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                : "bg-amber-600 hover:bg-amber-700 cursor-pointer shadow-amber-600/20"
            }`}
          >
            <Save className="h-4 w-4" />
            <span>{initialData?.id ? "Simpan Perubahan Piket" : "Tambahkan ke Jadwal Piket"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
