import React, { useState } from 'react';
import { School, Menu, X, Lock, CheckCircle, User, FileText, Settings, Palette } from 'lucide-react';
import { getActiveRbacConfig } from '../utils_rbac';
import { UITheme, THEME_CONFIGS } from './ThemeSwitcher';
import { RealtimeSyncBadge } from './RealtimeSyncBadge';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdminLoggedIn: boolean;
  logoutAdmin: () => void;
  isGuruLoggedIn?: boolean;
  logoutGuru?: () => void;
  tahunAjaranAktif?: string;
  userRole?: string | null;
  currentTheme?: UITheme;
  onOpenThemeModal?: () => void;
  isPublicPsbMode?: boolean;
}

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  isAdminLoggedIn, 
  logoutAdmin,
  isGuruLoggedIn = false,
  logoutGuru = () => {},
  tahunAjaranAktif = '2025/2026',
  userRole = null,
  currentTheme = 'emerald',
  onOpenThemeModal = () => {},
  isPublicPsbMode = false
}: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = isPublicPsbMode
    ? [
        { id: 'daftar', label: 'Formulir Pendaftaran', icon: FileText },
        { id: 'cek-kelulusan', label: 'Cek Kelulusan', icon: CheckCircle },
        { id: 'cek-data-santri', label: 'Data Santri', icon: User },
      ]
    : [
        { id: 'daftar', label: 'Pendaftaran', icon: FileText },
        { id: 'cek-kelulusan', label: 'Status', icon: CheckCircle },
        { id: 'cek-data-santri', label: 'Data Santri', icon: User },
        { id: 'portal_access', label: 'Portal', icon: Lock },
      ];

  // Load RBAC Config
  const rbacConfig = getActiveRbacConfig();
  const currentRole = isPublicPsbMode ? null : (userRole || localStorage.getItem('session_user_role'));

  // Filter menu items for current logged in role
  const roleRules = rbacConfig[currentRole || 'guest']; // Fallback to guest if needed
  
  const filteredMenuItems = menuItems.filter(item => {
    if (isPublicPsbMode) return true;
    if (!currentRole) return true; // Show other menus to guests
    if (roleRules && roleRules.landingPage) {
      // True/False checklist mapping
      return roleRules.landingPage[item.id] !== false;
    }
    return true;
  });

  const handleNavClick = (tabId: string) => {
    if (isPublicPsbMode && tabId !== 'daftar' && tabId !== 'cek-kelulusan' && tabId !== 'cek-data-santri') {
      return;
    }
    // Map portal_access back to admin tab
    const targetTab = tabId === 'portal_access' ? 'admin' : tabId;
    setActiveTab(targetTab);
    setIsOpen(false);
  };

  // Get active role UI representation
  const getRoleUI = () => {
    if (!currentRole) return null;
    switch (currentRole) {
      case 'superadmin':
        return { label: 'Superadmin', icon: '👑', color: 'border-rose-200 bg-rose-50 text-rose-600' };
      case 'admin':
        return { label: 'Admin', icon: '🛡️', color: 'border-blue-200 bg-blue-50 text-blue-600' };
      case 'guru':
        return { label: 'Guru', icon: '🧑‍🏫', color: 'border-amber-200 bg-amber-50 text-amber-600' };
      case 'pembimbing':
        return { label: 'Pembimbing', icon: '🕌', color: 'border-emerald-200 bg-emerald-50 text-emerald-600' };
      case 'walisantri':
        return { label: 'Walisantri', icon: '👨‍👩‍👦', color: 'border-indigo-200 bg-indigo-50 text-indigo-600' };
      default:
        return { label: 'Portal', icon: '🔑', color: 'border-gray-200 bg-gray-50 text-gray-600' };
    }
  };

  const roleUI = getRoleUI();

  return (
    <header className="sticky top-0 z-50 w-full glass-navbar text-gray-900 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Brand Identity */}
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => handleNavClick('daftar')}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-800 via-teal-800 to-emerald-950 text-amber-300 shadow-sm border border-emerald-700/60 transition-transform duration-300 group-hover:scale-105">
              <School className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-sans text-sm font-black tracking-tight text-gray-950 group-hover:text-emerald-800 transition-colors">
                  AL IHSAN WAT TAQWA
                </span>
                {isPublicPsbMode && (
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                    PSB Online
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold text-emerald-700/90 block tracking-tight">
                {isPublicPsbMode ? 'Pendaftaran Santri Baru' : 'Portal Akademik & PSB'}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex md:items-center md:space-x-1">
            {filteredMenuItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <IconComp className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Role Badge / Right Actions */}
          <div className="hidden lg:flex items-center space-x-2.5">
            {!isPublicPsbMode && <RealtimeSyncBadge />}
            {!isPublicPsbMode && (
              <button
                onClick={onOpenThemeModal}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all border border-slate-200 cursor-pointer active:scale-95 shadow-sm"
                title="Pilih Desain UI Aplikasi"
              >
                <Palette className="h-3.5 w-3.5 text-amber-500" />
                <span>Desain UI: <strong className="text-emerald-700">{THEME_CONFIGS[currentTheme]?.badge || 'Aktif'}</strong></span>
              </button>
            )}

            {isPublicPsbMode && (
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Penerimaan Santri Baru TA {tahunAjaranAktif}</span>
              </div>
            )}

            {!isPublicPsbMode && roleUI && (
              <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${roleUI.color} animate-apple-fade`}>
                <span>{roleUI.icon}</span>
                <span>{roleUI.label.toUpperCase()}</span>
              </span>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex items-center md:hidden">
            <button
              id="hamburger-toggle"
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none cursor-pointer"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl pb-4 pt-2 px-4 shadow-xl space-y-1 animate-apple-fade">
          {filteredMenuItems.map((item) => {
            const IconComp = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`mobile-nav-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`flex w-full items-center space-x-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <IconComp className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
          
          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenThemeModal();
              }}
              className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 rounded-xl"
            >
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-amber-600" />
                <span>Pilih Desain UI</span>
              </div>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-amber-200/80 text-amber-900">
                {THEME_CONFIGS[currentTheme]?.badge || 'Aktif'}
              </span>
            </button>
          </div>

          {currentRole && (
            <div className="space-y-2 px-2 py-3 border-t border-gray-100 mt-2">
              <button
                id="mobile-admin-logout"
                onClick={() => {
                  logoutAdmin();
                  setIsOpen(false);
                  setActiveTab('daftar');
                }}
                className="w-full text-center py-3 text-xs font-bold bg-gray-50 text-rose-600 border border-gray-100 rounded-xl hover:bg-rose-50 transition-colors"
              >
                Keluar Sesi
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
