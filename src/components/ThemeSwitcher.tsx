import React, { useState, useEffect } from 'react';
import { Palette, Sparkles, Check, Moon, Sun, ShieldCheck, LayoutGrid, Eye } from 'lucide-react';

export type UITheme = 'emerald' | 'apple' | 'midnight';

interface ThemeSwitcherProps {
  currentTheme: UITheme;
  onThemeChange: (theme: UITheme) => void;
  isOpenModal?: boolean;
  onCloseModal?: () => void;
}

export const THEME_CONFIGS: Record<UITheme, {
  id: UITheme;
  name: string;
  badge: string;
  subtitle: string;
  description: string;
  accentBg: string;
  accentText: string;
  borderColor: string;
  previewBg: string;
  previewCardBg: string;
  previewCardText: string;
  tags: string[];
}> = {
  emerald: {
    id: 'emerald',
    name: '1. Emerald Luxury',
    badge: 'Islami Modern',
    subtitle: 'Keanggunan Prestisius & Warm Pearl Canvas',
    description: 'Nuansa hijau emerald islami dipadu aksen emas murni, sudut rounded-2xl, serta glassmorphism bernuansa mewah & berwibawa.',
    accentBg: 'bg-emerald-600',
    accentText: 'text-emerald-700',
    borderColor: 'border-emerald-300',
    previewBg: 'bg-[#f4f8f6]',
    previewCardBg: 'bg-white border-emerald-100/80 shadow-md shadow-emerald-900/5',
    previewCardText: 'text-emerald-950',
    tags: ['Islami Premium', 'Aksen Emas', 'Soft Pearl Canvas']
  },
  apple: {
    id: 'apple',
    name: '2. Executive Minimal',
    badge: 'Apple Crisp Clean',
    subtitle: 'Presisi Ultra-Kompak & Monokromatis',
    description: 'Tata letak bento ultra-kompak dengan whitespace presisi, hairline border 1px, serta kontras monokromatis bersih ala iOS/macOS.',
    accentBg: 'bg-blue-600',
    accentText: 'text-blue-600',
    borderColor: 'border-blue-300',
    previewBg: 'bg-[#f8fafc]',
    previewCardBg: 'bg-white border-slate-200/80 shadow-sm',
    previewCardText: 'text-slate-900',
    tags: ['Ultra Kompak', 'Apple Bento', 'Crisp White']
  },
  midnight: {
    id: 'midnight',
    name: '3. Midnight Obsidian',
    badge: 'Dark Cyber Glass',
    subtitle: 'Dark Mode Futuristik & Kontras Tinggi',
    description: 'Kanvas midnight obsidian gelap bebas kilat mata, panel frosted glass transparan, border neon cyan & pencahayaan kontras tinggi.',
    accentBg: 'bg-cyan-500',
    accentText: 'text-cyan-400',
    borderColor: 'border-cyan-500/50',
    previewBg: 'bg-[#090d16]',
    previewCardBg: 'bg-[#111827]/90 border-cyan-500/30 shadow-2xl shadow-cyan-950/50',
    previewCardText: 'text-slate-100',
    tags: ['Dark Obsidian', 'Glow Neon', 'Eye-Safe Night']
  }
};

export default function ThemeSwitcher({
  currentTheme,
  onThemeChange,
  isOpenModal = false,
  onCloseModal = () => {}
}: ThemeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(isOpenModal);

  useEffect(() => {
    setIsOpen(isOpenModal);
  }, [isOpenModal]);

  const handleSelect = (theme: UITheme) => {
    onThemeChange(theme);
    localStorage.setItem('app_ui_theme', theme);
  };

  return (
    <>
      {/* Floating Theme Selector Button */}
      <button
        id="theme-switcher-floating-btn"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[60] bg-gray-900/90 text-white p-3.5 rounded-full shadow-2xl hover:bg-black transition-all duration-300 group border border-white/20 flex items-center gap-2 backdrop-blur-md active:scale-95 cursor-pointer"
        title="Ganti Desain UI Aplikasi (3 Alternatif)"
      >
        <Palette className="h-5 w-5 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
        <span className="text-xs font-bold tracking-tight pr-1 hidden sm:inline">Desain UI</span>
        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
      </button>

      {/* Theme Selection Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-apple-fade">
          <div 
            className="bg-white rounded-[22px] max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-gray-900 to-slate-800 text-white flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-[14px] bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold tracking-tight">Pilih Desain UI Aplikasi</h2>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      3 Alternatif SIAP PAKAI
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Pilih tampilan visual yang paling sesuai dengan selera & kebutuhan lembaga Anda.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onCloseModal();
                }}
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content: 3 Themes Grid */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {(Object.keys(THEME_CONFIGS) as UITheme[]).map((themeKey) => {
                  const cfg = THEME_CONFIGS[themeKey];
                  const isSelected = currentTheme === themeKey;

                  return (
                    <div
                      key={themeKey}
                      onClick={() => handleSelect(themeKey)}
                      className={`relative rounded-[24px] p-5 border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between group ${
                        isSelected
                          ? 'border-blue-600 bg-white shadow-xl ring-4 ring-blue-500/10 scale-[1.02]'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                      }`}
                    >
                      {/* Selection Checkmark */}
                      {isSelected && (
                        <div className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg ring-4 ring-white">
                          <Check className="h-5 w-5 stroke-[3]" />
                        </div>
                      )}

                      <div className="space-y-3">
                        {/* Title & Badge */}
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            {cfg.badge}
                          </span>
                          {themeKey === 'midnight' ? (
                            <Moon className="h-4 w-4 text-cyan-500" />
                          ) : (
                            <Sun className="h-4 w-4 text-amber-500" />
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                          {cfg.name}
                        </h3>

                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {cfg.description}
                        </p>

                        {/* Mini Live UI Card Preview */}
                        <div className={`mt-3 p-3.5 rounded-[18px] ${cfg.previewBg} border border-slate-200/60 transition-all group-hover:scale-[1.01]`}>
                          <div className={`p-3 rounded-[14px] ${cfg.previewCardBg} border transition-all space-y-2`}>
                            <div className="flex items-center justify-between">
                              <div className="h-2 w-16 bg-slate-300/80 rounded-full"></div>
                              <div className={`h-2.5 w-2.5 rounded-full ${cfg.accentBg}`}></div>
                            </div>
                            <div className="h-3 w-28 bg-slate-400/90 rounded-md"></div>
                            <div className="flex gap-1.5 pt-1">
                              <div className={`h-4 w-12 rounded-md ${cfg.accentBg} opacity-90`}></div>
                              <div className="h-4 w-10 rounded-md bg-slate-200/80"></div>
                            </div>
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 pt-2">
                          {cfg.tags.map((tag, idx) => (
                            <span key={idx} className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Select Button */}
                      <button
                        type="button"
                        className={`w-full mt-4 py-2.5 rounded-[14px] text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                            : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ Tema Aktif' : 'Pilih Desain Ini'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Informational Banner */}
              <div className="p-4 rounded-[18px] bg-amber-50 border border-amber-200/70 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900">
                  <strong className="font-bold">Desain Tersimpan Otomatis:</strong> Pilihan desain UI Anda disimpan secara langsung di peramban dan berlaku secara global di seluruh halaman (Dashboard, Landing Page, Portal Guru, dan Admin).
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 bg-white border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onCloseModal();
                }}
                className="px-6 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-[14px] hover:bg-blue-700 transition-all cursor-pointer shadow-sm"
              >
                Gunakan Desain
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
