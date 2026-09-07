import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { motion } from 'motion/react';
import { CardConfig, StudentData } from './types';
import { TEMPLATES } from './templates';
import { User, School, ShieldCheck } from 'lucide-react';

interface CardPreviewProps {
  config: CardConfig;
  student: StudentData;
  side: 'front' | 'back';
}

export const CardPreview: React.FC<CardPreviewProps> = ({ config, student, side }) => {
  const template = TEMPLATES.find(t => t.id === config.template) || TEMPLATES[0];
  const isHorizontal = config.orientation === 'horizontal';

  // Dimensions for CR80 (approximate ratio)
  const width = isHorizontal ? 'w-[340px]' : 'w-[214px]';
  const height = isHorizontal ? 'h-[214px]' : 'h-[340px]';

  const qrData = JSON.stringify({
    id: student.id,
    id_number: student.role === 'ustadz' ? student.nip : student.nis,
    nama: student.nama,
    role: student.role,
    status: student.status
  });

  const fullAddress = student.desa 
    ? `${student.desa}, ${student.kecamatan}, ${student.kabupaten}`
    : student.alamat;

  if (side === 'front') {
    return (
      <motion.div 
        className={`${width} ${height} rounded-[${config.borderRadius}px] overflow-hidden border relative flex flex-col`}
        style={{ 
          borderRadius: `${config.borderRadius}px`,
          backgroundColor: template.bgFrontHex || '#ffffff',
          borderColor: '#e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header */}
        <div 
          className="p-3 flex items-center space-x-2"
          style={{ backgroundColor: template.headerHex || config.primaryColor, color: '#ffffff' }}
        >
          {student.logoSekolah ? (
            <img src={student.logoSekolah} alt="Logo" className="h-8 w-8 object-contain" referrerPolicy="no-referrer" crossOrigin="anonymous" />
          ) : (
            <School className="h-8 w-8" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-[10px] font-black uppercase tracking-tighter truncate leading-none">PONDOK PESANTREN</h3>
            <h2 className="text-[12px] font-black uppercase tracking-tight truncate leading-tight">AL-IHSAN WAT TAQWA</h2>
          </div>
        </div>

        {/* Body */}
        <div className={`flex-1 p-3 flex ${isHorizontal ? 'flex-row' : 'flex-col items-center'} gap-3`}>
          {/* Photo */}
          <div 
            className={`relative ${isHorizontal ? 'w-24 h-32' : 'w-24 h-24 mb-2'} rounded-lg overflow-hidden border-2 shadow-sm shrink-0`}
            style={{ backgroundColor: '#f1f5f9', borderColor: '#ffffff' }}
          >
            {student.foto ? (
              <img src={student.foto} alt="Foto" className="w-full h-full object-cover" referrerPolicy="no-referrer" crossOrigin="anonymous" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ color: '#cbd5e1' }}>
                <User size={isHorizontal ? 40 : 32} />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h4 className="font-black uppercase text-[8px] tracking-widest mb-0.5" style={{ color: '#94a3b8' }}>
              {student.role === 'ustadz' ? 'KARTU IDENTITAS USTADZ' : 'KARTU WARGA BELAJAR'}
            </h4>
            <h1 className={`font-black uppercase ${isHorizontal ? 'text-sm' : 'text-xs text-center'} truncate mb-1`} style={{ color: '#1e293b' }}>
              {student.nama}
            </h1>
            
            <div className="space-y-0.5">
              {student.role === 'ustadz' ? (
                <>
                  <DetailRow label="NIP" value={student.nip || '-'} isHorizontal={isHorizontal} />
                  <DetailRow label="JK" value={student.jenisKelamin} isHorizontal={isHorizontal} />
                </>
              ) : (
                <>
                  <DetailRow label="NIS" value={student.nis || '-'} isHorizontal={isHorizontal} />
                  <DetailRow label="NISN" value={student.nisn || '-'} isHorizontal={isHorizontal} />
                </>
              )}
              <div className={`flex ${isHorizontal ? 'flex-row' : 'flex-col items-center'} text-[9px] leading-tight`}>
                <span className="font-black uppercase tracking-tighter w-8 shrink-0" style={{ color: '#94a3b8' }}>ALMT:</span>
                <span className={`font-bold ${isHorizontal ? 'truncate' : 'text-center line-clamp-2'}`} style={{ color: '#334155' }}>{fullAddress}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-2 border-t flex justify-between items-center" style={{ backgroundColor: 'rgba(248, 250, 252, 0.5)', borderColor: '#f1f5f9' }}>
          <span className="text-[7px] font-bold uppercase tracking-tighter" style={{ color: '#94a3b8' }}>
            {student.role === 'ustadz' ? 'Berlaku selama masa pengabdian' : 'Berlaku selama menjadi warga belajar'}
          </span>
          <ShieldCheck className="h-3 w-3 opacity-50" style={{ color: '#10b981' }} />
        </div>

        {/* Watermark */}
        {config.showWatermark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
             <School size={150} />
          </div>
        )}
      </motion.div>
    );
  }

  // Back Side
  return (
    <motion.div 
      className={`${width} ${height} rounded-[${config.borderRadius}px] overflow-hidden relative flex flex-col items-center justify-center p-6 text-center`}
      style={{ 
        borderRadius: `${config.borderRadius}px`,
        backgroundColor: template.bgBackHex || '#0f172a',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}
    >
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center opacity-30" style={{ color: '#ffffff' }}>
        <School className="h-6 w-6" style={{ color: '#ffffff' }} />
        <span className="text-[8px] font-black tracking-widest uppercase" style={{ color: '#ffffff' }}>Official Identity Card</span>
      </div>

      <div className="bg-white p-3 rounded-2xl mb-4" style={{ boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
        <QRCodeCanvas 
          value={qrData} 
          size={config.qrSize} 
          level="H" 
          includeMargin={false}
          imageSettings={student.logoSekolah ? {
            src: student.logoSekolah,
            height: config.qrSize * 0.2,
            width: config.qrSize * 0.2,
            excavate: true,
          } : undefined}
        />
      </div>

      <div className="space-y-1">
        <h2 className="font-black text-sm uppercase tracking-tight" style={{ color: '#ffffff' }}>{student.nama}</h2>
        <p className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>ID: {student.role === 'ustadz' ? student.nip : student.nis}</p>
      </div>

      {config.showSignature && (
        <div className="absolute bottom-6 right-6 text-right">
          <div className="h-8 w-24 border-b mb-1 flex items-end justify-center" style={{ borderColor: 'rgba(255, 255, 255, 0.3)' }}>
            <span className="text-[10px] font-serif italic tracking-tighter" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Digital Signature</span>
          </div>
          <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{config.signatureRole}</p>
        </div>
      )}

      {/* Decorative Elements */}
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}></div>
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}></div>
    </motion.div>
  );
};

const DetailRow: React.FC<{ label: string; value: string; isHorizontal: boolean }> = ({ label, value, isHorizontal }) => (
  <div className={`flex ${isHorizontal ? 'flex-row' : 'flex-col items-center'} text-[10px]`}>
    <span className="font-black uppercase tracking-tighter w-8" style={{ color: '#94a3b8' }}>{label}:</span>
    <span className="font-bold truncate" style={{ color: '#334155' }}>{value}</span>
  </div>
);
