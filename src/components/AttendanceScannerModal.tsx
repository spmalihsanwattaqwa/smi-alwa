import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, Camera, X, CheckCircle2, AlertCircle, Keyboard, Sparkles, UserCheck, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ScanResultLog {
  id: string;
  name: string;
  subtext?: string;
  time: string;
  status: 'BERHASIL' | 'GAGAL' | 'SUDAH_HADIR';
}

interface AttendanceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  onScan: (decodedText: string) => { success: boolean; message: string; name?: string; subtext?: string };
}

export const AttendanceScannerModal: React.FC<AttendanceScannerModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  onScan
}) => {
  const [manualInput, setManualInput] = useState('');
  const [lastLog, setLastLog] = useState<{ success: boolean; message: string; name?: string } | null>(null);
  const [logs, setLogs] = useState<ScanResultLog[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sound feedback using Web Audio API
  const playSound = (type: 'success' | 'error') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.18);
      } else {
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      // Ignore audio errors
    }
  };

  const processScan = (text: string) => {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();
    const result = onScan(cleanText);

    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (result.success) {
      playSound('success');
      setLastLog({ success: true, message: result.message, name: result.name });
      setLogs(prev => [
        {
          id: String(Date.now()),
          name: result.name || cleanText,
          subtext: result.subtext || cleanText,
          time: now,
          status: 'BERHASIL'
        },
        ...prev.slice(0, 19)
      ]);
    } else {
      playSound('error');
      setLastLog({ success: false, message: result.message, name: result.name || cleanText });
      setLogs(prev => [
        {
          id: String(Date.now()),
          name: result.name || cleanText,
          subtext: result.message,
          time: now,
          status: 'GAGAL'
        },
        ...prev.slice(0, 19)
      ]);
    }
    setManualInput('');
  };

  useEffect(() => {
    if (isOpen && isCameraActive) {
      const timer = setTimeout(() => {
        try {
          if (scannerRef.current) {
            scannerRef.current.clear().catch(() => {});
          }

          const scanner = new Html5QrcodeScanner(
            "attendance-qr-reader",
            {
              fps: 15,
              qrbox: (viewfinderWidth, viewfinderHeight) => {
                const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                const size = Math.floor(minEdge * 0.7);
                return { width: size, height: size };
              },
              aspectRatio: 1.0,
              rememberLastUsedCamera: true,
              supportedScanTypes: [0]
            },
            false
          );

          scanner.render(
            (decodedText) => {
              processScan(decodedText);
            },
            () => {
              // Ignore silent frame errors
            }
          );

          scannerRef.current = scanner;
        } catch (err) {
          console.warn("Failed to initialize camera scanner:", err);
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(() => {});
          scannerRef.current = null;
        }
      };
    }
  }, [isOpen, isCameraActive]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* HEADER */}
        <div className="bg-[#064e3b] text-white p-5 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500/20 p-2.5 rounded-2xl border border-emerald-400/30">
              <QrCode className="h-6 w-6 text-emerald-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-tight text-white">{title}</h2>
              <p className="text-xs text-emerald-200 font-medium">
                {subtitle || 'Silakan arahkan QR Code pada kartu ke arah kamera atau gunakan USB Barcode Scanner'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              if (scannerRef.current) {
                scannerRef.current.clear().catch(() => {});
                scannerRef.current = null;
              }
              onClose();
            }}
            className="p-2 hover:bg-white/10 rounded-full text-emerald-200 hover:text-white transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* MAIN BODY */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 bg-slate-50/50">
          {/* LEFT: SCANNER CAMERA & INPUT */}
          <div className="lg:col-span-7 space-y-4">
            {/* ALERT FEEDBACK BANNER */}
            <AnimatePresence mode="wait">
              {lastLog && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-4 rounded-2xl border flex items-center space-x-3 shadow-md ${
                    lastLog.success 
                      ? 'bg-emerald-500 text-white border-emerald-600' 
                      : 'bg-rose-500 text-white border-rose-600'
                  }`}
                >
                  {lastLog.success ? <CheckCircle2 className="h-6 w-6 shrink-0" /> : <AlertCircle className="h-6 w-6 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-black uppercase tracking-wider block">
                      {lastLog.success ? 'Presensi Berhasil Recorded' : 'Presensi Gagal'}
                    </span>
                    <span className="text-sm font-bold truncate block">{lastLog.message}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CAMERA CONTAINER */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Camera size={14} className="text-emerald-600" /> Mode Scan Kamera Live
                </span>
                <button
                  type="button"
                  onClick={() => setIsCameraActive(!isCameraActive)}
                  className="text-[10px] font-bold uppercase text-slate-500 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-xl transition flex items-center gap-1"
                >
                  <RefreshCw size={12} />
                  <span>{isCameraActive ? 'Matikan Kamera' : 'Nyalakan Kamera'}</span>
                </button>
              </div>

              {isCameraActive ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 min-h-[260px] flex items-center justify-center">
                  <div id="attendance-qr-reader" className="w-full text-white text-center font-bold text-xs" />
                </div>
              ) : (
                <div className="h-48 rounded-2xl bg-slate-100 border border-dashed flex flex-col items-center justify-center text-slate-400 p-4 text-center space-y-2">
                  <Camera size={32} className="opacity-40" />
                  <p className="text-xs font-bold uppercase">Kamera Dimatikan</p>
                  <p className="text-[10px]">Gunakan form manual / USB Barcode Scanner di bawah</p>
                </div>
              )}
            </div>

            {/* MANUAL & USB BARCODE INPUT FORM */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                processScan(manualInput);
              }}
              className="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm space-y-2"
            >
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Keyboard size={14} className="text-emerald-600" /> Manual Input / USB Barcode Scanner
              </label>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Ketik atau scan NIP / NIS / Nama Guru..."
                  className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                />
                <button
                  type="submit"
                  className="px-5 py-3 bg-[#064e3b] hover:bg-emerald-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-md cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  <UserCheck size={14} />
                  <span>Proses</span>
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT: REAL-TIME LOG TABLE */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col h-full space-y-3">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" /> Riwayat Scan Terkini
                </h3>
                <p className="text-[10px] font-bold text-slate-400">Perekaman otomatis presensi masuk</p>
              </div>
              <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                {logs.filter(l => l.status === 'BERHASIL').length} Sukses
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-[360px] pr-1">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className={`p-3 rounded-2xl border text-xs flex justify-between items-center transition ${
                    log.status === 'BERHASIL'
                      ? 'bg-emerald-50/60 border-emerald-100 text-slate-800'
                      : 'bg-rose-50/60 border-rose-100 text-slate-800'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-extrabold uppercase text-xs truncate">{log.name}</p>
                    <p className="text-[10px] text-slate-500 truncate font-mono">{log.subtext}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full block mb-0.5 ${
                      log.status === 'BERHASIL' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {log.status === 'BERHASIL' ? 'HADIR' : 'GAGAL'}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">{log.time}</span>
                  </div>
                </div>
              ))}

              {logs.length === 0 && (
                <div className="py-16 text-center text-slate-400 italic space-y-2">
                  <QrCode size={36} className="mx-auto opacity-30" />
                  <p className="text-xs font-bold uppercase">Belum ada scan diproses</p>
                  <p className="text-[10px] text-slate-400">Silakan scan QR Code kartu guru untuk mencatat kehadiran secara langsung</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex justify-between items-center shrink-0">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Sistem Scanner Presensi Real-time Al-Ihsan Wat Taqwa
          </p>
          <button
            onClick={() => {
              if (scannerRef.current) {
                scannerRef.current.clear().catch(() => {});
                scannerRef.current = null;
              }
              onClose();
            }}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </motion.div>
    </div>
  );
};
