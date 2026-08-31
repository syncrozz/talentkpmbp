import React, { useState } from 'react';
import { 
  GraduationCap, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  Layers, 
  FileText, 
  CheckCircle2,
  SlidersHorizontal,
  ExternalLink
} from 'lucide-react';

interface NavbarProps {
  currentView: 'student' | 'admin' | 'sandbox';
  setCurrentView: (view: 'student' | 'admin' | 'sandbox') => void;
  onOpenSlugDirectly?: (slug: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  onOpenSlugDirectly,
}) => {
  const [quickSlug, setQuickSlug] = useState('');
  const [showSlugInput, setShowSlugInput] = useState(false);

  const handleSlugSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSlug.trim() && onOpenSlugDirectly) {
      onOpenSlugDirectly(quickSlug.trim());
      setQuickSlug('');
      setShowSlugInput(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & College Identity */}
          <div 
            id="brand-logo"
            onClick={() => setCurrentView('student')}
            className="flex items-center space-x-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white group-hover:text-blue-400 transition-colors">
                  KPMBP TALENT
                </span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full">
                  SES 4.3
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
                onClick={() => setCurrentView('admin')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  currentView === 'admin'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-300" />
                <span>Pentadbiran &amp; Saringan</span>
              </button>

              <button
                type="button"
                id="tab-nav-sandbox"
                onClick={() => setCurrentView('sandbox')}
                className={`hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  currentView === 'sandbox'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
                title="SES 4.3 Data Normalization & Validation Tester"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>SES 4.3 Sandbox</span>
              </button>
            </nav>

          </div>

        </div>
      </div>
    </header>
  );
};
