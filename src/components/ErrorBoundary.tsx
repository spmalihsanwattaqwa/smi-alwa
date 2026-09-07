import React from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  declare props: Props;
  state: State = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  handleResetCache = () => {
    try {
      localStorage.removeItem('db_config');
      localStorage.removeItem('db_students');
      localStorage.removeItem('db_pendaftar');
      localStorage.removeItem('db_academic_calendar');
      localStorage.removeItem('db_pondok_agenda');
      localStorage.removeItem('db_ustadz_master');
      localStorage.removeItem('cfg_ustadz_table_columns');
      localStorage.removeItem('cfg_student_table_columns');
      localStorage.removeItem('db_kelas');
      localStorage.removeItem('db_pelajaran_v2');
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="h-8 w-8" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-black tracking-tight text-white">Terjadi Kendala Tampilan</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Aplikasi mengalami kesalahan saat memuat data. Ini biasanya terjadi jika format data dari sinkronisasi spreadsheet tidak sesuai.
              </p>
              {this.state.error && (
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-left font-mono text-[10px] text-amber-300 overflow-x-auto max-h-32">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Muat Ulang</span>
              </button>
              
              <button
                onClick={this.handleResetCache}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-rose-900/30"
              >
                <Trash2 className="h-4 w-4" />
                <span>Reset Cache &amp; Pulihkan</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
