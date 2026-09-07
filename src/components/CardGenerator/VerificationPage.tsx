import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, ShieldX, User, Calendar, MapPin, School, GraduationCap } from 'lucide-react';
import { StudentData } from './types';

export const VerificationPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const nis = params.get('nis');

    // Simulate database check
    const savedStudents = JSON.parse(localStorage.getItem('db_students') || '[]');
    const found = savedStudents.find((s: any) => s.nis === nis || s.id === id);

    if (found) {
      setData(found);
      setIsValid(true);
    } else {
      setIsValid(false);
    }
  }, []);

  if (isValid === null) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100"
      >
        {/* Status Header */}
        <div className={`${isValid ? 'bg-emerald-600' : 'bg-rose-600'} p-10 text-center relative overflow-hidden`}>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <School size={100} />
          </div>
          
          <div className="bg-white/20 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
            {isValid ? <ShieldCheck size={40} className="text-white" /> : <ShieldX size={40} className="text-white" />}
          </div>
          
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">
            {isValid ? 'Identitas Valid' : 'Identitas Tidak Valid'}
          </h1>
          <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mt-1">
            Sistem Verifikasi Digital Santri
          </p>
        </div>

        {isValid && data && (
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-4 border-b pb-6">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 border-2 border-white shadow-sm overflow-hidden shrink-0">
                {data.foto ? (
                  <img src={data.foto} alt="Foto" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <User size={30} />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-black text-slate-800 uppercase truncate">{data.nama}</h2>
                <p className="text-xs font-mono text-slate-400 font-bold">NIS: {data.nis}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <InfoItem icon={<GraduationCap size={14} />} label="Kelas" value={data.kelas} />
              <InfoItem icon={<MapPin size={14} />} label="Status" value={data.status || 'Aktif'} color="text-emerald-600" />
              <InfoItem icon={<Calendar size={14} />} label="Tahun Ajaran" value={data.academicYear || '-'} />
              <InfoItem icon={<ShieldCheck size={14} />} label="Terverifikasi" value={new Date().toLocaleDateString('id-ID')} />
            </div>

            <div className="pt-4 border-t">
              <div className="bg-slate-50 rounded-2xl p-4 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu Generate</p>
                <p className="text-xs font-bold text-slate-600 mt-1">{new Date().toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {!isValid && (
          <div className="p-10 text-center space-y-4">
            <p className="text-sm text-slate-500 font-bold leading-relaxed">
              Data santri tidak ditemukan dalam sistem. Mohon hubungi administrator sekolah untuk verifikasi lebih lanjut.
            </p>
            <button 
              onClick={() => window.location.href = '/'}
              className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest"
            >
              Kembali ke Beranda
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const InfoItem: React.FC<{ icon: any; label: string; value: string; color?: string }> = ({ icon, label, value, color }) => (
  <div className="space-y-1">
    <div className="flex items-center gap-1.5 text-slate-400">
      {icon}
      <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
    </div>
    <p className={`text-xs font-bold ${color || 'text-slate-700'}`}>{value}</p>
  </div>
);
