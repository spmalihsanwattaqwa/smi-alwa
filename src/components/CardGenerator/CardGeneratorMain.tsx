import React, { useState, useRef } from 'react';
import { CardConfig, StudentData } from './types';
import { CardForm } from './CardForm';
import { CardPreview } from './CardPreview';
import { MassGenerator } from './MassGenerator';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, Users, Download, Printer, ChevronRight, X, Sparkles } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface CardGeneratorMainProps {
  students: StudentData[];
  ustadz: StudentData[];
  onClose?: () => void;
}

export const CardGeneratorMain: React.FC<CardGeneratorMainProps> = ({ students, ustadz, onClose }) => {
  const [roleMode, setRoleMode] = useState<'santri' | 'ustadz'>('santri');
  const [activeTab, setActiveTab] = useState<'single' | 'mass'>('single');
  
  const currentData = roleMode === 'santri' ? students : ustadz;
  const [selectedStudentId, setSelectedStudentId] = useState<string | number>(currentData[0]?.id || '');
  const [isExporting, setIsExporting] = useState(false);

  // Sync selected ID when switching role
  React.useEffect(() => {
    setSelectedStudentId(currentData[0]?.id || '');
  }, [roleMode]);
  
  const [config, setConfig] = useState<CardConfig>({
    template: 'modern',
    orientation: 'horizontal',
    primaryColor: '#2563eb',
    secondaryColor: '#1e293b',
    showWatermark: true,
    showSignature: true,
    signatureRole: 'Kepala Sekolah',
    qrSize: 80,
    fontSize: 12,
    borderRadius: 16
  });

  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  const selectedStudent = currentData.find(s => s.id === selectedStudentId) || currentData[0];

  const handleExport = async (type: 'png' | 'pdf' | 'print') => {
    if (!selectedStudent) return;
    setIsExporting(true);
    try {
      if (!frontRef.current || !backRef.current) {
        throw new Error('Elemen kartu belum siap. Silakan tunggu sebentar.');
      }

      // Add a small delay to ensure rendering is complete
      await new Promise(resolve => setTimeout(resolve, 500));

      const options = {
        scale: 2.5,
        useCORS: true,
        logging: true,
        allowTaint: true, // Allow tainted images to prevent crashes, though they might be blank
        backgroundColor: '#ffffff', // Explicit background color
        imageTimeout: 15000, // Wait longer for images
        onclone: (clonedDoc: Document) => {
          const style = clonedDoc.createElement('style');
          style.innerHTML = `* { color-scheme: light !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }`;
          clonedDoc.head.appendChild(style);
        }
      };

      if (type === 'png') {
        const frontCanvas = await html2canvas(frontRef.current, options);
        const backCanvas = await html2canvas(backRef.current, options);
        
        const link = document.createElement('a');
        link.download = `Card_Front_${selectedStudent.nama}.png`;
        link.href = frontCanvas.toDataURL('image/png');
        link.click();
        
        link.download = `Card_Back_${selectedStudent.nama}.png`;
        link.href = backCanvas.toDataURL('image/png');
        link.click();
      } else if (type === 'pdf') {
        const frontCanvas = await html2canvas(frontRef.current, options);
        const backCanvas = await html2canvas(backRef.current, options);
        
        const pdf = new jsPDF({
          orientation: config.orientation,
          unit: 'mm',
          format: [85.6, 53.98]
        });

        const imgFront = frontCanvas.toDataURL('image/png');
        const imgBack = backCanvas.toDataURL('image/png');

        pdf.addImage(imgFront, 'PNG', 0, 0, 85.6, 53.98);
        pdf.addPage([85.6, 53.98], config.orientation);
        pdf.addImage(imgBack, 'PNG', 0, 0, 85.6, 53.98);
        
        pdf.save(`ID_Card_${selectedStudent.nama}.pdf`);
      } else if (type === 'print') {
        const frontCanvas = await html2canvas(frontRef.current, options);
        const backCanvas = await html2canvas(backRef.current, options);
        
        const frontImg = frontCanvas.toDataURL('image/png');
        const backImg = backCanvas.toDataURL('image/png');

        const printWin = window.open('', '_blank');
        if (printWin) {
          const isHoriz = config.orientation === 'horizontal';
          printWin.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Cetak Kartu - ${selectedStudent.nama}</title>
                <style>
                  @page {
                    size: ${isHoriz ? '85.6mm 53.98mm' : '53.98mm 85.6mm'};
                    margin: 0;
                  }
                  body {
                    margin: 0;
                    padding: 0;
                    background: #fff;
                    font-family: sans-serif;
                  }
                  .card-page {
                    width: ${isHoriz ? '85.6mm' : '53.98mm'};
                    height: ${isHoriz ? '53.98mm' : '85.6mm'};
                    page-break-after: always;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    box-sizing: border-box;
                  }
                  .card-page img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                  }
                  @media print {
                    body { margin: 0; }
                    .card-page { page-break-after: always; }
                  }
                </style>
              </head>
              <body>
                <div class="card-page"><img src="${frontImg}" /></div>
                <div class="card-page"><img src="${backImg}" /></div>
                <script>
                  window.onload = function() {
                    setTimeout(function() {
                      window.print();
                      window.close();
                    }, 500);
                  };
                </script>
              </body>
            </html>
          `);
          printWin.document.close();
        } else {
          alert('Popup terblokir. Silakan izinkan popup untuk mencetak langsung.');
        }
      }
    } catch (error: any) {
      console.error('Export failed:', error);
      alert('Gagal mengekspor kartu: ' + (error.message || 'Kesalahan internal rendering.'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMass = async (ids: (string | number)[], type: 'pdf' | 'print' | 'zip') => {
    if (ids.length === 0) return;
    setIsExporting(true);
    
    try {
      const pdf = new jsPDF({
        orientation: config.orientation,
        unit: 'mm',
        format: [85.6, 53.98]
      });

      // Create a hidden container for rendering
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      document.body.appendChild(container);

      const printImages: string[] = [];

      for (let i = 0; i < ids.length; i++) {
        const student = currentData.find(s => s.id === ids[i]);
        if (!student) continue;

        // Render front
        const frontDiv = document.createElement('div');
        container.appendChild(frontDiv);
        const frontRoot = (await import('react-dom/client')).createRoot(frontDiv);
        frontRoot.render(<CardPreview config={config} student={student} side="front" />);
        
        // Wait for render and images
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const options = {
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          imageTimeout: 15000,
          onclone: (clonedDoc: Document) => {
            const style = clonedDoc.createElement('style');
            style.innerHTML = `* { color-scheme: light !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }`;
            clonedDoc.head.appendChild(style);
          }
        };
        const canvasFront = await html2canvas(frontDiv, options);
        const imgFront = canvasFront.toDataURL('image/png');
        if (i > 0) pdf.addPage([85.6, 53.98], config.orientation);
        pdf.addImage(imgFront, 'PNG', 0, 0, 85.6, 53.98);
        printImages.push(imgFront);

        // Render back
        const backDiv = document.createElement('div');
        container.appendChild(backDiv);
        const backRoot = (await import('react-dom/client')).createRoot(backDiv);
        backRoot.render(<CardPreview config={config} student={student} side="back" />);
        
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const canvasBack = await html2canvas(backDiv, {
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          imageTimeout: 15000,
          onclone: (clonedDoc: Document) => {
            const style = clonedDoc.createElement('style');
            style.innerHTML = `* { color-scheme: light !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }`;
            clonedDoc.head.appendChild(style);
          }
        });
        const imgBack = canvasBack.toDataURL('image/png');
        pdf.addPage([85.6, 53.98], config.orientation);
        pdf.addImage(imgBack, 'PNG', 0, 0, 85.6, 53.98);
        printImages.push(imgBack);
        
        // Clean up sub-roots
        container.innerHTML = '';
      }

      document.body.removeChild(container);
      setIsExporting(false);

      if (type === 'print') {
        const printWin = window.open('', '_blank');
        if (printWin) {
          const isHoriz = config.orientation === 'horizontal';
          printWin.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Cetak Kartu Massal (${ids.length} Kartu)</title>
                <style>
                  @page {
                    size: ${isHoriz ? '85.6mm 53.98mm' : '53.98mm 85.6mm'};
                    margin: 0;
                  }
                  body { margin: 0; padding: 0; background: #fff; }
                  .card-page {
                    width: ${isHoriz ? '85.6mm' : '53.98mm'};
                    height: ${isHoriz ? '53.98mm' : '85.6mm'};
                    page-break-after: always;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    box-sizing: border-box;
                  }
                  .card-page img { width: 100%; height: 100%; object-fit: contain; }
                  @media print {
                    body { margin: 0; }
                    .card-page { page-break-after: always; }
                  }
                </style>
              </head>
              <body>
                ${printImages.map(img => `<div class="card-page"><img src="${img}" /></div>`).join('')}
                <script>
                  window.onload = function() {
                    setTimeout(function() {
                      window.print();
                      window.close();
                    }, 600);
                  };
                </script>
              </body>
            </html>
          `);
          printWin.document.close();
        } else {
          alert('Popup terblokir. Silakan izinkan popup untuk mencetak massal.');
        }
      } else {
        pdf.save(`Mass_ID_Cards_${new Date().getTime()}.pdf`);
      }
    } catch (error: any) {
      console.error('Mass export failed:', error);
      alert('Ekspor massal gagal: ' + (error.message || 'Kesalahan rendering massal. Coba kurangi jumlah data.'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen p-4 md:p-8 animate-fadeIn">
      {/* HEADER SECTION */}
      <div id="card_generator_header" className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-xl shadow-blue-200">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
               <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Pusat Kartu Identitas</h1>
               <Sparkles className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Sistem Kartu Identitas Digital & Cetak Profesional</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {/* Role Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-xs self-end">
            <button 
              onClick={() => setRoleMode('santri')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                roleMode === 'santri' ? 'bg-[#064e3b] text-white border-2 border-emerald-500 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Santri
            </button>
            <button 
              onClick={() => setRoleMode('ustadz')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                roleMode === 'ustadz' ? 'bg-[#064e3b] text-white border-2 border-emerald-500 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Ustadz
            </button>
          </div>

          {/* Action Tabs */}
          <div id="card_generator_tabs" className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shadow-xs">
            <button 
              id="tab_single_card"
              onClick={() => setActiveTab('single')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'single' ? 'bg-[#064e3b] text-white border-2 border-emerald-500 shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <CreditCard size={14} />
              <span>Kartu Tunggal</span>
            </button>
            <button 
              id="tab_mass_card"
              onClick={() => setActiveTab('mass')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'mass' ? 'bg-[#064e3b] text-white border-2 border-emerald-500 shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Users size={14} />
              <span>Cetak Massal</span>
            </button>
          </div>
        </div>
      </div>

      <div id="card_generator_content" className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'single' ? (
            <motion.div 
              key={`${roleMode}-single`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* TOP: FORM SETTINGS */}
              <CardForm 
                config={config}
                setConfig={setConfig}
                students={currentData}
                selectedStudentId={selectedStudentId}
                setSelectedStudentId={setSelectedStudentId}
              />

              {/* CENTER: PREVIEW SECTION */}
              <div className="flex flex-col gap-6 max-w-4xl mx-auto">
                <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl border border-slate-100 flex flex-col items-center justify-center min-h-[600px] relative overflow-hidden group">
                  <div className="w-full flex justify-between items-center mb-10 border-b pb-4">
                    <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">
                      Preview Kartu {roleMode === 'santri' ? 'Santri' : 'Ustadz'}
                    </h2>
                    <div className="flex gap-2">
                       <button onClick={() => handleExport('png')} className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200 transition">PNG</button>
                       <button onClick={() => handleExport('pdf')} className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 transition">PDF</button>
                       <button onClick={() => handleExport('print')} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-md shadow-emerald-200 cursor-pointer">
                         <Printer size={13} />
                         <span>Cetak Kartu</span>
                       </button>
                    </div>
                  </div>

                  {/* CARDS CONTAINER */}
                  {selectedStudent && (
                    <div className="flex flex-col gap-12 items-center justify-center z-10 w-full">
                      <div className="space-y-4 w-full flex flex-col items-center">
                        <div className="w-full max-w-[400px]">
                          <p className="text-left text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Sisi Depan</p>
                          <div ref={frontRef} className="rounded-2xl overflow-hidden border" style={{ borderColor: '#f1f5f9' }}>
                             <CardPreview config={config} student={selectedStudent} side="front" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4 w-full flex flex-col items-center">
                        <div className="w-full max-w-[400px]">
                          <p className="text-left text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Sisi Belakang</p>
                          <div ref={backRef} className="rounded-2xl overflow-hidden border" style={{ borderColor: '#f1f5f9' }}>
                             <CardPreview config={config} student={selectedStudent} side="back" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {!selectedStudent && (
                    <div className="text-center p-20 border border-dashed rounded-3xl">
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Belum ada data {roleMode}</p>
                    </div>
                  )}

                  {/* DECORATIVE LIGHTS */}
                  <div className="absolute -top-20 -left-20 w-80 h-80 bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />
                  <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none" />
                </div>
                
                {/* TIPS / INFO */}
                <div className="bg-slate-900 text-white rounded-2xl p-6 flex gap-4 items-start shadow-xl">
                   <div className="bg-blue-600 text-white p-2 rounded-xl">
                      <Sparkles size={18} />
                   </div>
                   <div className="space-y-1">
                      <p className="text-xs font-black uppercase tracking-widest">Informasi Sistem:</p>
                      <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                        Kartu ini dilengkapi dengan QR Code dinamis untuk verifikasi identitas santri secara real-time. Tekan tombol cetak untuk menghasilkan berkas PDF siap cetak dengan ukuran standar kartu ID (85.6mm x 53.98mm).
                      </p>
                   </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="mass"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <MassGenerator 
                students={students}
                config={config}
                setConfig={setConfig}
                onExportMass={handleExportMass}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isExporting && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 animate-bounce">
            <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Menyiapkan Berkas...</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Mengonversi desain ke resolusi tinggi</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
