import React, { useState, useSyncExternalStore } from 'react';
import { realtimeSync } from '../lib/realtimeSync';
import { RefreshCw, CheckCircle2, AlertCircle, Cloud, ArrowUpRight, Copy, Check } from 'lucide-react';

interface RealtimeSyncBadgeProps {
  onOpenSettings?: () => void;
  className?: string;
}

export const RealtimeSyncBadge: React.FC<RealtimeSyncBadgeProps> = ({ onOpenSettings, className = '' }) => {
  const status = useSyncExternalStore(
    realtimeSync.subscribe,
    realtimeSync.getSnapshot,
    realtimeSync.getSnapshot
  );
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const url = realtimeSync.getEffectiveUrl();
  const spreadsheetId = realtimeSync.getSpreadsheetId();

  const handleManualSync = async () => {
    if (isManualSyncing) return;
    setIsManualSyncing(true);
    setMessage(null);
    try {
      await realtimeSync.syncAllNow();
      setMessage('Seluruh data berhasil disinkronkan ke Spreadsheet!');
      setTimeout(() => setMessage(null), 4000);
    } catch (e: any) {
      setMessage(e.message || 'Gagal sinkronisasi');
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleCopyUrl = () => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Status color styles
  const getBadgeStyle = () => {
    switch (status.state) {
      case 'syncing':
        return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
      case 'synced':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
      case 'idle':
        return 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100';
      case 'error':
        return 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100';
      case 'unconfigured':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200';
    }
  };

  const getStatusLabel = () => {
    switch (status.state) {
      case 'syncing':
        return 'Menyinkronkan...';
      case 'synced':
        return 'Tersinkron Real-Time';
      case 'idle':
        return 'Sheets Real-Time Aktif';
      case 'error':
        return 'Kendala Sinkronisasi';
      case 'unconfigured':
      default:
        return 'Sheets Belum Terhubung';
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer shadow-xs ${getBadgeStyle()}`}
        title="Status Koneksi Spreadsheet Real-Time"
      >
        {status.state === 'syncing' ? (
          <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
        ) : status.state === 'synced' || status.state === 'idle' ? (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        ) : status.state === 'error' ? (
          <AlertCircle className="w-3 h-3 text-rose-600" />
        ) : (
          <Cloud className="w-3 h-3 text-slate-400" />
        )}
        <span className="truncate max-w-[130px] sm:max-w-none">{getStatusLabel()}</span>
      </button>

      {/* Popover Details */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 p-4 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-xl ${status.state === 'idle' || status.state === 'synced' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">Koneksi Spreadsheet Real-Time</h4>
                  <p className="text-[10px] text-slate-500">Otomatis sinkron setiap ada perubahan data</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              {/* Status Row */}
              <div className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Status Mesin:</span>
                <span className="font-bold flex items-center gap-1">
                  {status.state === 'syncing' && <span className="text-amber-600 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Mengirim data...</span>}
                  {status.state === 'synced' && <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Data Tersinkronkan</span>}
                  {status.state === 'idle' && <span className="text-teal-600 flex items-center gap-1"><Check className="w-3 h-3" /> Siap & Mendengarkan</span>}
                  {status.state === 'error' && <span className="text-rose-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Terkendala</span>}
                  {status.state === 'unconfigured' && <span className="text-slate-500">Belum Disetel</span>}
                </span>
              </div>

              {/* Last Sync */}
              <div className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Sinkron Terakhir:</span>
                <span className="font-bold text-slate-700">
                  {status.lastSyncedAt ? status.lastSyncedAt.toLocaleTimeString('id-ID') : 'Belum pernah'}
                </span>
              </div>

              {/* Pending changes if any */}
              {status.pendingKeys.length > 0 && (
                <div className="text-[11px] p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
                  <span className="font-bold">Perubahan dalam antrean:</span> {status.pendingKeys.join(', ')}
                </div>
              )}

              {/* Error message if any */}
              {status.errorMessage && (
                <div className="text-[11px] p-2 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 leading-relaxed">
                  <span className="font-bold">Kendala:</span> {status.errorMessage}
                </div>
              )}

              {/* Notification message */}
              {message && (
                <div className="text-[11px] p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-center">
                  {message}
                </div>
              )}

              {/* URL & Spreadsheet Info */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>URL Web App Script:</span>
                  {url && (
                    <button 
                      onClick={handleCopyUrl} 
                      className="text-teal-600 hover:text-teal-700 font-bold inline-flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Disalin' : 'Salin URL'}
                    </button>
                  )}
                </div>
                {url ? (
                  <p className="text-[10px] font-mono text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200 truncate">
                    {url}
                  </p>
                ) : (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                    Masukkan URL Web App Google Apps Script di menu <strong>Export & Backup &gt; Tab Google Sheets</strong> agar real-time sync aktif otomatis.
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={(!url && !spreadsheetId) || isManualSyncing}
                  className="flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
                  {isManualSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
                </button>

                {spreadsheetId && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Buka Spreadsheet</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full text-center text-[11px] font-bold text-teal-600 hover:underline pt-1 cursor-pointer"
                >
                  ⚙️ Buka Pengaturan URL Web App &amp; Spreadsheet
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
