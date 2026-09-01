import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { StudentPortal } from './components/StudentPortal.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';

export default function App() {
  const [currentView, setCurrentView] = useState<'student' | 'admin'>('student');
  const [targetSlug, setTargetSlug] = useState<string | null>(null);

  // Check URL pathname or hash for direct slug access (e.g. /legacy-band-2026 or #legacy-band-2026)
  useEffect(() => {
    const handleUrlCheck = () => {
      const path = window.location.pathname.replace(/^\/+/, '');
      const hash = window.location.hash.replace(/^#\/?/, '');
      const potentialSlug = path || hash;

      if (potentialSlug && !['admin', 'student'].includes(potentialSlug)) {
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

  const handleGoHome = () => {
    setCurrentView('student');
    handleClearTargetSlug();
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
        onGoHome={handleGoHome}
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
      </main>

      {/* SES 4.4 Standard Footer with WhatsApp Shortcut */}
      <footer className="bg-slate-950 border-t border-slate-900/80 py-6 px-4 text-center">
        <div className="inline-flex items-center justify-center space-x-2 text-xs text-slate-500 font-medium tracking-wide">
          <span>Developed by Syncrozz</span>
          <a
            id="link-footer-whatsapp-syncrozz"
            href="https://wa.me/6145313756"
            target="_blank"
            rel="noopener noreferrer"
            title="Hubungi Syncrozz via WhatsApp"
            className="inline-flex items-center justify-center transition-transform duration-200 hover:scale-110 opacity-85 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded align-middle"
          >
            <img
              src="https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/logo/MAIN/Logo%20Whatapp%20v2.png"
              alt="WhatsApp Syncrozz"
              className="w-[19px] h-[19px] object-contain"
              referrerPolicy="no-referrer"
            />
          </a>
        </div>
      </footer>

    </div>
  );
}
