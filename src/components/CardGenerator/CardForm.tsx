import React from 'react';
import { CardConfig, StudentData } from './types';
import { TEMPLATES } from './templates';
import { ChevronDown } from 'lucide-react';

interface CardFormProps {
  config: CardConfig;
  setConfig: (config: CardConfig) => void;
  students: StudentData[];
  selectedStudentId: string | number;
  setSelectedStudentId: (id: string | number) => void;
}

export const CardForm: React.FC<CardFormProps> = ({ 
  config, 
  setConfig, 
  students, 
  selectedStudentId, 
  setSelectedStudentId
}) => {
  const COLORS = [
    { name: 'Biru', value: '#2563eb' },
    { name: 'Hijau', value: '#059669' },
    { name: 'Merah', value: '#dc2626' },
    { name: 'Emas', value: '#d97706' },
    { name: 'Ungu', value: '#7c3aed' },
    { name: 'Hitam', value: '#1e293b' },
  ];

  return (
    <div className="bg-white border-b shadow-sm p-4 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Pilih Warga Belajar / Ustadz */}
        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-900 ml-1">
            Pilih {students.length > 0 && students[0].role === 'ustadz' ? 'Ustadz' : 'Warga Belajar'}
          </label>
          <div className="relative group">
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-blue-400 rounded-lg text-xs font-bold text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.nama} - {s.role === 'ustadz' ? s.nip : s.nis}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 pointer-events-none group-hover:scale-110 transition-transform" />
          </div>
        </div>

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
              {!COLORS.some(c => c.value === config.primaryColor) && (
                <option value={config.primaryColor}>Custom</option>
              )}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none group-hover:scale-110 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};
