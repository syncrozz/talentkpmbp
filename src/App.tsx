import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { StudentPortal } from './components/StudentPortal.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';
import { SES43Sandbox } from './components/SES43Sandbox.tsx';
import { GraduationCap, ShieldCheck, Sparkles, Heart } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'student' | 'admin' | 'sandbox'>('student');
  const [targetSlug, setTargetSlug] = useState<string | null>(null);

  // Check URL pathname or hash for direct slug access (e.g. /legacy-band-2026 or #legacy-band-2026)
  useEffect(() => {
    const handleUrlCheck = () => {
      const path = window.location.pathname.replace(/^\/+/, '');
      const hash = window.location.hash.replace(/^#\/?/, '');
      const potentialSlug = path || hash;

      if (potentialSlug && !['admin', 'sandbox', 'student'].includes(potentialSlug)) {
        setTargetSlug(potentialSlug);
        setCurrentView('student');
      }
    };

    handleUrlCheck();
    window.addEventListener('popstate', handleUrlCheck);
    return () => window.removeEventListener('popstate', handleUrlCheck);
  }, []);

  const handleOpenSlugDirectly = (slug: string) => {
    setTargetSlug(slug);
    setCurrentView('student');
    window.history.pushState(null, '', `/${slug}`);
  };

  const handleClearTargetSlug = () => {
    setTargetSlug(null);
    window.history.pushState(null, '', '/');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Top Main Navigation */}
      <Navbar
        currentView={currentView}
        setCurrentView={(view) => {
          setCurrentView(view);
          if (view !== 'student') {
            setTargetSlug(null);
          }
        }}
        onOpenSlugDirectly={handleOpenSlugDirectly}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {currentView === 'student' && (
          <StudentPortal
            initialSlug={targetSlug}
            onClearInitialSlug={handleClearTargetSlug}
          />
        )}

        {currentView === 'admin' && (
          <AdminPortal />
        )}

        {currentView === 'sandbox' && (
          <SES43Sandbox />
        )}
      </main>

      {/* Modern Compact Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-slate-300">
              KPMBP STUDENT TALENT &amp; OPPORTUNITY PLATFORM
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-blue-900/30 text-blue-300 rounded border border-blue-800/40">
              SES 4.3 ARCHITECTURE
            </span>
          </div>

          <div className="text-center md:text-right text-[11px] text-slate-400">
            Kolej Profesional MARA Bandar Penawar • One Student. Many Opportunities.
          </div>
        </div>
      </footer>

    </div>
  );
}
