import React from 'react';
import { CardConfig, StudentData } from './types';
import { CardPreview } from './CardPreview';
import { Search, CheckSquare, Square, FileText, ChevronDown, Info, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TEMPLATES } from './templates';

interface MassGeneratorProps {
  students: StudentData[];
  config: CardConfig;
  setConfig: (config: CardConfig) => void;
  onExportMass: (ids: (string | number)[], type: 'pdf' | 'print' | 'zip') => void;
}

export const MassGenerator: React.FC<MassGeneratorProps> = ({ students, config, setConfig, onExportMass }) => {
  const [selectedIds, setSelectedIds] = React.useState<(string | number)[]>([]);
  const [filterKelas, setFilterKelas] = React.useState('Semua');

  const classes = Array.from(new Set(students.map(s => s.kelas))).sort();

  const filtered = students.filter(s => {
    const matchesKelas = filterKelas === 'Semua' || s.kelas === filterKelas;
    return matchesKelas;
  });

  const toggleAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(s => s.id));
    }
  };

  const toggleOne = (id: string | number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const COLORS = [
    { name: 'Biru', value: '#2563eb' },
    { name: 'Hijau', value: '#059669' },
    { name: 'Merah', value: '#dc2626' },
    { name: 'Emas', value: '#d97706' },
    { name: 'Ungu', value: '#7c3aed' },
    { name: 'Hitam', value: '#1e293b' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. TOP FILTER BAR */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Template */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-900 ml-1">Template</label>
            <div className="relative group">
              <select
                value={config.template}
                onChange={(e) => setConfig({ ...config, template: e.target.value as any })}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
              >
                {TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none group-hover:scale-110 transition-transform" />
            </div>
          </div>

          {/* Orientasi */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-900 ml-1">Orientasi</label>
            <div className="relative group">
              <select
                value={config.orientation}
                onChange={(e) => setConfig({ ...config, orientation: e.target.value as any })}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
              >
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none group-hover:scale-110 transition-transform" />
            </div>
          </div>

          {/* Warna */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-900 ml-1">Warna</label>
            <div className="relative group">
              <select
                value={COLORS.find(c => c.value === config.primaryColor)?.value || config.primaryColor}
                onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
              >
                {COLORS.map(c => (
                  <option key={c.value} value={c.value}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none group-hover:scale-110 transition-transform" />
            </div>
          </div>
        </div>

        {/* Pilih Kelompok Belajar / Kategori */}
        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-900 ml-1">
            Pilih {filtered.length > 0 && filtered[0].role === 'ustadz' ? 'Jabatan / Kategori' : 'Kelompok Belajar'}
          </label>
          <div className="relative group">
            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
            >
              <option value="Semua">Semua data...</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none group-hover:scale-110 transition-transform" />
          </div>
        </div>

        {/* Info Bar */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <p className="text-xs font-bold text-blue-800 tracking-tight">
              {selectedIds.length} kartu siap dicetak
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={toggleAll}
              className="px-4 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg text-[10px] font-black uppercase hover:bg-blue-50 transition"
            >
              {selectedIds.length === filtered.length ? 'Batal Semua' : 'Pilih Semua'}
            </button>
            <button 
              disabled={selectedIds.length === 0}
              onClick={() => onExportMass(selectedIds, 'pdf')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase shadow-md shadow-blue-100 hover:bg-blue-700 transition disabled:opacity-50 disabled:shadow-none flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="h-3 w-3" />
              <span>Unduh PDF</span>
            </button>
            <button 
              disabled={selectedIds.length === 0}
              onClick={() => onExportMass(selectedIds, 'print')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase shadow-md shadow-emerald-100 hover:bg-emerald-700 transition disabled:opacity-50 disabled:shadow-none flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="h-3 w-3" />
              <span>Cetak Direct</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. GRID PREVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence>
          {filtered.map(s => (
            <motion.div 
              key={s.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`relative group cursor-pointer transition-all ${selectedIds.includes(s.id) ? 'scale-[1.02]' : ''}`}
              onClick={() => toggleOne(s.id)}
            >
              <div className={`absolute -top-2 -right-2 z-20 h-6 w-6 rounded-full flex items-center justify-center border-2 border-white shadow-md transition ${
                selectedIds.includes(s.id) ? 'bg-blue-600 text-white' : 'bg-white text-slate-300'
              }`}>
                {selectedIds.includes(s.id) ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
              </div>

              <div className={`rounded-[${config.borderRadius + 2}px] overflow-hidden border-2 transition shadow-sm group-hover:shadow-lg ${
                selectedIds.includes(s.id) ? 'border-blue-600' : 'border-transparent'
              }`}>
                {/* We only show front for preview here to save performance */}
                <div className="pointer-events-none origin-top-left scale-[0.8] mb-[-40px]">
                   <CardPreview config={config} student={s} side="front" />
                </div>
                <div className="bg-white p-3 border-t">
                  <p className="text-[10px] font-black uppercase text-slate-800 truncate">{s.nama}</p>
                  <p className="text-[9px] font-bold text-slate-400">
                    {s.role === 'ustadz' ? s.nip : s.nis} &bull; {s.kelas}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 border border-dashed rounded-3xl">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sila pilih kelompok belajar terlebih dahulu</p>
          </div>
        )}
      </div>
    </div>
  );
};
