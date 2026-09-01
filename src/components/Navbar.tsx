import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  Layers, 
  FileText, 
  CheckCircle2,
  SlidersHorizontal,
  ExternalLink,
  MessageSquarePlus,
  LogOut
} from 'lucide-react';
import { PilotFeedbackModal } from './PilotFeedbackModal.tsx';

interface NavbarProps {
  currentView: 'student' | 'admin';
  setCurrentView: (view: 'student' | 'admin') => void;
  onGoHome?: () => void;
  onOpenSlugDirectly?: (slug: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  onGoHome,
  onOpenSlugDirectly,
}) => {
  const [quickSlug, setQuickSlug] = useState('');
  const [showSlugInput, setShowSlugInput] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return !!sessionStorage.getItem('kpmbp_admin_token');
  });

  useEffect(() => {
    const updateAdminAuthState = () => {
      const token = sessionStorage.getItem('kpmbp_admin_token');
      setIsAdminLoggedIn(!!token);
    };

    window.addEventListener('kpmbp_admin_login', updateAdminAuthState);
    window.addEventListener('kpmbp_admin_logout', updateAdminAuthState);
    window.addEventListener('storage', updateAdminAuthState);

    // Periodic sync check
    const timer = setInterval(updateAdminAuthState, 800);

    return () => {
      window.removeEventListener('kpmbp_admin_login', updateAdminAuthState);
      window.removeEventListener('kpmbp_admin_logout', updateAdminAuthState);
      window.removeEventListener('storage', updateAdminAuthState);
      clearInterval(timer);
    };
  }, []);

  const handleBrandHomeClick = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e && 'key' in e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (e.key === ' ') e.preventDefault();
    }

    // 1. Close local modals / inputs / popovers
    setShowSlugInput(false);
    setQuickSlug('');
    setIsFeedbackOpen(false);

    // 2. Dispatch global event to close dialogs/overlays across all portal views
    window.dispatchEvent(new Event('kpmbp_go_home'));

    // 3. Client-side navigation to Home
    if (onGoHome) {
      onGoHome();
    } else {
      setCurrentView('student');
    }
  };

  const handleSlugSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSlug.trim() && onOpenSlugDirectly) {
      onOpenSlugDirectly(quickSlug.trim());
      setQuickSlug('');
      setShowSlugInput(false);
    }
  };

  const handleAdminClick = async () => {
    if (isAdminLoggedIn) {
      // Mod admin aktif (Hijau) -> klik untuk log keluar
      try {
        const token = sessionStorage.getItem('kpmbp_admin_token');
        if (token) {
          await fetch('/api/admin/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        }
      } catch (e) {
        // ignore network error on logout
      } finally {
        sessionStorage.removeItem('kpmbp_admin_token');
        sessionStorage.removeItem('kpmbp_admin_user');
        setIsAdminLoggedIn(false);
        window.dispatchEvent(new Event('kpmbp_admin_logout'));
        setCurrentView('student');
      }
    } else {
      // Belum log masuk -> buka paparan log masuk admin (butang kekal oren)
      setCurrentView('admin');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & College Identity - Primary Branding Home Trigger */}
          <div 
            id="brand-logo"
            role="button"
            tabIndex={0}
            aria-label="KPMBP TALENT - Kembali ke Laman Utama"
            onClick={handleBrandHomeClick}
            onKeyDown={handleBrandHomeClick}
            className="flex items-center space-x-3 cursor-pointer group select-none rounded-xl p-1 -m-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 transition-all"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white group-hover:text-blue-400 transition-colors">
                  KPMBP TALENT
                </span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full">
                  SES 4.4
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                Kolej Profesional MARA Bandar Penawar
              </p>
            </div>
          </div>

          {/* Quick Slug Tester & Nav Switcher */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            
            {/* Quick Slug Direct Access Button */}
            <div className="relative">
              {showSlugInput ? (
                <form onSubmit={handleSlugSubmit} className="flex items-center space-x-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
                  <span className="text-xs text-slate-400 pl-2">/</span>
                  <input
                    type="text"
                    id="quick-slug-input"
                    value={quickSlug}
                    onChange={(e) => setQuickSlug(e.target.value)}
                    placeholder="legacy-band-2026"
                    className="bg-transparent text-xs text-white px-2 py-1 focus:outline-none w-36 sm:w-44"
                    autoFocus
                  />
                  <button
                    type="submit"
                    id="btn-go-slug"
                    className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
                  >
                    Buka
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSlugInput(false)}
                    className="px-1.5 py-1 text-xs text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  id="btn-quick-slug-toggle"
                  onClick={() => setShowSlugInput(true)}
                  className="hidden md:flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 px-3 py-1.5 rounded-lg transition-colors"
                  title="Akses Pintu Masuk Awam Menggunakan Slug"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>Buka Slug</span>
                </button>
              )}
            </div>

            {/* View Mode Tabs */}
            <nav className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700" aria-label="Portal Navigation">
              <button
                type="button"
                id="tab-nav-student"
                onClick={() => setCurrentView('student')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  currentView === 'student'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Portal Pelajar</span>
              </button>

              <button
                type="button"
                id="tab-nav-admin"
                onClick={handleAdminClick}
                title={isAdminLoggedIn ? 'Mod Admin Aktif — Klik untuk Log Keluar' : 'Akses Portal Pentadbir & Saringan'}
                className={`flex items-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  isAdminLoggedIn
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 border border-emerald-500'
                    : 'bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 hover:text-orange-300 border border-orange-500/40 hover:border-orange-500/70'
                }`}
              >
                {isAdminLoggedIn ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-200" />
                    <span>Admin</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" title="Sesi Aktif" />
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />
                    <span>Admin</span>
                  </>
                )}
              </button>
            </nav>

            {/* Global Pilot Feedback Trigger Button */}
            <button
              type="button"
              id="navbar-btn-pilot-feedback"
              onClick={() => setIsFeedbackOpen(true)}
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-all shadow-sm"
              title="Hantar Maklum Balas Pengalaman Pilot"
            >
              <MessageSquarePlus className="w-4 h-4 text-amber-400" />
              <span className="hidden xl:inline">Maklum Balas Pilot</span>
            </button>

          </div>

        </div>
      </div>

      <PilotFeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        defaultRole={currentView === 'admin' ? 'ADMIN' : 'STUDENT'}
        userIdentifier={currentView === 'admin' ? 'ADMIN_SESSION' : 'STUDENT_SESSION'}
        userName={currentView === 'admin' ? 'Pentadbir/Penilai KPMBP' : 'Pengguna KPMBP'}
        pageContext={`Navbar Bar (${currentView.toUpperCase()})`}
      />
    </header>
  );
};
