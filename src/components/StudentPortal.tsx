import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Calendar, 
  Clock, 
  Music, 
  Mic, 
  Palette, 
  HeartHandshake, 
  Trophy, 
  Award, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  FileCheck, 
  AlertCircle, 
  Users, 
  ChevronRight, 
  Compass, 
  CheckCircle,
  ExternalLink,
  ShieldAlert,
  Info
} from 'lucide-react';
import { Opportunity, Category, Application, ApplicationStatus } from '../types.ts';
import { ApplicationModal } from './ApplicationModal.tsx';
import { maskStudentIdInput, normalizeStudentIdNumber } from '../lib/normalization.ts';

interface StudentPortalProps {
  initialSlug?: string | null;
  onClearInitialSlug?: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  initialSlug,
  onClearInitialSlug,
}) => {
  const [activeTab, setActiveTab] = useState<'opportunities' | 'tracker'>('opportunities');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Active Opportunity Detail Page (when slug clicked or passed)
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);

  // Application Modal state
  const [applyingOpp, setApplyingOpp] = useState<Opportunity | null>(null);

  // Tracker State
  const [trackerStudentId, setTrackerStudentId] = useState<string>('');
  const [trackerApplications, setTrackerApplications] = useState<Application[]>([]);
  const [trackerLoading, setTrackerLoading] = useState<boolean>(false);
  const [trackerSearched, setTrackerSearched] = useState<boolean>(false);
  const [trackerError, setTrackerError] = useState<string | null>(null);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/opportunities');
      const data = await res.json();
      setOpportunities(data);

      const catRes = await fetch('/api/categories');
      const catData = await catRes.json();
      setCategories(catData);

      // If initial slug passed, open directly
      if (initialSlug) {
        const found = data.find((o: Opportunity) => o.slug === initialSlug);
        if (found) {
          setSelectedOpp(found);
        }
      }
    } catch (err) {
      console.error('Error fetching opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  useEffect(() => {
    if (initialSlug && opportunities.length > 0) {
      const found = opportunities.find(o => o.slug === initialSlug);
      if (found) {
        setSelectedOpp(found);
      }
    }
  }, [initialSlug, opportunities]);

  const handleOpenBySlug = async (slug: string) => {
    try {
      const res = await fetch(`/api/opportunities/slug/${slug}`);
      if (res.ok) {
        const oppData = await res.json();
        setSelectedOpp(oppData);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Error loading slug:', err);
    }
  };

  const handleTrackApplications = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackerError(null);
    const { normalized, isValid } = normalizeStudentIdNumber(trackerStudentId);
    if (!isValid) {
      setTrackerError('Sila masukkan format ID Pelajar yang sah (cth: PDA-2502-011)');
      return;
    }

    try {
      setTrackerLoading(true);
      const res = await fetch(`/api/applications?student_id_number=${normalized}`);
      const data = await res.json();
      setTrackerApplications(data);
      setTrackerSearched(true);
    } catch (err) {
      setTrackerError('Gagal memuatkan rekod permohonan.');
    } finally {
      setTrackerLoading(false);
    }
  };

  const filteredOpportunities = opportunities.filter(opp => {
    const matchCat = selectedCategory === 'all' || opp.category_id === selectedCategory;
    const matchQuery = opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.open_call_roles?.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchQuery;
  });

  const getCategoryIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Music': return <Music className="w-4 h-4" />;
      case 'Mic': return <Mic className="w-4 h-4" />;
      case 'Palette': return <Palette className="w-4 h-4" />;
      case 'HeartHandshake': return <HeartHandshake className="w-4 h-4" />;
      case 'Trophy': return <Trophy className="w-4 h-4" />;
      case 'Award': return <Award className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.SUBMITTED:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">SUBMITTED</span>;
      case ApplicationStatus.SCREENING:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">SCREENING (DALAM SARINGAN)</span>;
      case ApplicationStatus.INTERVIEW:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">SESI AUDISI / TEMUDUGA</span>;
      case ApplicationStatus.SHORTLISTED:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">DISENARAI PENDEK</span>;
      case ApplicationStatus.SELECTED:
      case ApplicationStatus.CONFIRMED:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">TERPILIH (TAHNIAH!)</span>;
      case ApplicationStatus.REJECTED:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">TIDAK BERJAYA</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-700 text-slate-300">{status}</span>;
    }
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ms-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 pb-16">
      
      {/* Sub-Header Navigation Banner */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pusat Peluang &amp; Panggilan Terbuka Pelajar KPMBP</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                One Student. Many Opportunities.
              </h1>
              <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-2xl leading-relaxed">
                Platform berpusat untuk menyertai band muzik kolej, pasukan pengucapan awam, program CSR, aktiviti kebudayaan dan mewakili Kolej Profesional MARA Bandar Penawar.
              </p>
            </div>

            {/* Quick Tab Selector */}
            <div className="flex items-center bg-slate-900 p-1.5 rounded-xl border border-slate-800 shrink-0">
              <button
                type="button"
                id="btn-tab-opportunities"
                onClick={() => {
                  setActiveTab('opportunities');
                  setSelectedOpp(null);
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'opportunities' && !selectedOpp
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Peluang Aktif</span>
              </button>
              <button
                type="button"
                id="btn-tab-tracker"
                onClick={() => {
                  setActiveTab('tracker');
                  setSelectedOpp(null);
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'tracker'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileCheck className="w-4 h-4" />
                <span>Semak Permohonan Saya</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

        {/* -------------------------------------------------------------
            VIEW 1: SINGLE PUBLIC OPPORTUNITY PAGE (SLUG ENTRY POINT)
           ------------------------------------------------------------- */}
        {selectedOpp ? (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Breadcrumb back */}
            <button
              type="button"
              id="btn-back-to-list"
              onClick={() => {
                setSelectedOpp(null);
                if (onClearInitialSlug) onClearInitialSlug();
              }}
              className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-blue-400 transition-colors"
            >
              <span>← Kembali ke Semua Peluang</span>
            </button>

            {/* Public Opportunity Hero Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative space-y-6">
                {/* Badges & Meta */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-xs font-semibold uppercase">
                    {selectedOpp.category_name || 'Kategori'}
                  </span>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-semibold">
                    STATUS: {selectedOpp.status}
                  </span>
                  {selectedOpp.banner_tag && (
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-xs font-semibold">
                      {selectedOpp.banner_tag}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-mono bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60 ml-auto">
                    /{selectedOpp.slug}
                  </span>
                </div>

                {/* Title & Open Call Roles */}
                <div>
                  <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                    {selectedOpp.title}
                  </h1>
                  {selectedOpp.open_call_roles && selectedOpp.open_call_roles.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      <span className="text-xs text-slate-400 font-medium mr-1">Panggilan Terbuka:</span>
                      {selectedOpp.open_call_roles.map((role, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-slate-800 text-blue-300 border border-slate-700 rounded-lg text-xs font-semibold">
                          {role}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 text-sm sm:text-base text-slate-300 leading-relaxed">
                  {selectedOpp.description}
                </div>

                {/* Requirements & Criteria */}
                {selectedOpp.requirements && selectedOpp.requirements.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Syarat &amp; Kriteria Kelayakan</span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedOpp.requirements.map((req, idx) => (
                        <div key={idx} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white">
                              {req.skill_name || `Syarat #${idx + 1}`}
                            </span>
                            {req.minimum_level && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded font-bold">
                                Min: {req.minimum_level}
                              </span>
                            )}
                          </div>
                          {req.notes && (
                            <p className="text-xs text-slate-400 leading-normal">{req.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date & Deadline Info Box */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3 text-xs text-slate-400">
                    <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <span className="block text-slate-500 font-semibold uppercase text-[10px]">Tarikh Tutup Permohonan:</span>
                      <span className="text-white font-medium text-sm">{formatDateTime(selectedOpp.closing_date)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-slate-400">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span>Jumlah Pemohon Semasa: <strong className="text-white">{selectedOpp.total_applications || 0}</strong> orang</span>
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    id="btn-apply-opportunity-main"
                    onClick={() => setApplyingOpp(selectedOpp)}
                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm sm:text-base shadow-xl shadow-blue-600/30 flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5"
                  >
                    <span>SAYA BERMINAT / MOHON SEKARANG</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <p className="text-xs text-slate-500 mt-2 text-center sm:text-left">
                    * Profil pelajar anda akan dimuatkan secara automatik melalui ID Pelajar KPMBP.
                  </p>
                </div>

              </div>
            </div>
          </div>
        ) : activeTab === 'opportunities' ? (

          /* -------------------------------------------------------------
              VIEW 2: PUBLIC OPPORTUNITIES DIRECTORY
             ------------------------------------------------------------- */
          <div className="space-y-6">
            
            {/* Category Filter Pills & Search */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
              
              {/* Category Pills */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                <button
                  type="button"
                  id="filter-cat-all"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  Semua Peluang ({opportunities.length})
                </button>
                {categories.map((cat) => (
                  <button
                    type="button"
                    key={cat.category_id}
                    id={`filter-cat-${cat.category_id}`}
                    onClick={() => setSelectedCategory(cat.category_id)}
                    className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCategory === cat.category_id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {getCategoryIcon(cat.icon)}
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  id="input-search-opportunities"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari peluang (cth: Band, Emcee)..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

            </div>

            {/* Opportunities Grid */}
            {loading ? (
              <div className="py-20 text-center text-slate-500 text-sm">
                Memuatkan peluang aktif...
              </div>
            ) : filteredOpportunities.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <Compass className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-base font-semibold text-white">Tiada Peluang Dijumpai</h3>
                <p className="text-xs text-slate-400">
                  Tiada panggilan terbuka bagi carian atau kategori yang dipilih pada masa ini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOpportunities.map((opp) => (
                  <div
                    key={opp.opportunity_id}
                    id={`card-opp-${opp.slug}`}
                    className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 flex flex-col justify-between shadow-lg hover:shadow-blue-500/5 transition-all group"
                  >
                    <div className="space-y-4">
                      {/* Category & Status */}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-md">
                          {opp.category_name}
                        </span>
                        <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>OPEN</span>
                        </span>
                      </div>

                      {/* Title & Slug */}
                      <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                          {opp.title}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">/{opp.slug}</p>
                      </div>

                      {/* Roles */}
                      {opp.open_call_roles && opp.open_call_roles.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {opp.open_call_roles.map((r, i) => (
                            <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                              {r}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Snippet */}
                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                        {opp.description}
                      </p>
                    </div>

                    {/* Footer & CTA */}
                    <div className="pt-5 mt-4 border-t border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Tutup: {new Date(opp.closing_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="w-3.5 h-3.5 text-blue-400" />
                          <span>{opp.total_applications || 0} pemohon</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          id={`btn-view-opp-${opp.slug}`}
                          onClick={() => setSelectedOpp(opp)}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors text-center"
                        >
                          Maklumat Penuh
                        </button>
                        <button
                          type="button"
                          id={`btn-quick-apply-${opp.slug}`}
                          onClick={() => setApplyingOpp(opp)}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1 shadow-md shadow-blue-600/20"
                        >
                          <span>Mohon</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        ) : (

          /* -------------------------------------------------------------
              VIEW 3: SEMAK STATUS PERMOHONAN SAYA (STUDENT TRACKER)
             ------------------------------------------------------------- */
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                  <FileCheck className="w-5 h-5 text-blue-400" />
                  <span>Semak Rekod Permohonan &amp; Status Pelajar</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Masukkan ID Pelajar anda untuk melihat status semua permohonan yang pernah anda hantar merentasi pelbagai peluang.
                </p>
              </div>

              <form onSubmit={handleTrackApplications} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    id="input-tracker-id"
                    value={trackerStudentId}
                    onChange={(e) => setTrackerStudentId(maskStudentIdInput(e.target.value))}
                    placeholder="PDA-2502-011"
                    maxLength={12}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono uppercase tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  id="btn-submit-track"
                  disabled={trackerLoading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/30 transition-all shrink-0"
                >
                  {trackerLoading ? 'Menyemak...' : 'Semak Status'}
                </button>
              </form>

              {trackerError && (
                <p className="text-xs text-rose-400 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{trackerError}</span>
                </p>
              )}
            </div>

            {/* Tracker Results */}
            {trackerSearched && (
              <div className="space-y-4">
                {trackerApplications.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                    Tiada rekod permohonan dijumpai untuk ID Pelajar ini.
                  </div>
                ) : (
                  trackerApplications.map((app) => (
                    <div
                      key={app.application_id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div>
                          <span className="text-[10px] font-mono text-slate-500 block">ID Permohonan: {app.application_id}</span>
                          <h3 className="text-base font-bold text-white mt-0.5">
                            {app.opportunity?.title || 'Peluang'}
                          </h3>
                        </div>
                        <div>
                          {getStatusBadge(app.status)}
                        </div>
                      </div>

                      {/* Details & Audit trail */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-slate-500 block">Tarikh Dihantar:</span>
                          <span className="text-white font-medium">{formatDateTime(app.submitted_at)}</span>
                        </div>
                        {app.reviewed_by && (
                          <div>
                            <span className="text-slate-500 block">Pegawai Penilai:</span>
                            <span className="text-slate-300">{app.reviewed_by}</span>
                          </div>
                        )}
                      </div>

                      {/* Status History Stepper */}
                      {app.status_history && app.status_history.length > 0 && (
                        <div className="bg-slate-950 rounded-xl p-4 border border-slate-850 space-y-2">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                            Sejarah Aliran Status:
                          </span>
                          <div className="space-y-2">
                            {app.status_history.map((hist, hIdx) => (
                              <div key={hIdx} className="flex items-start space-x-2 text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                <div>
                                  <span className="font-semibold text-slate-300">{hist.new_status}</span>
                                  {hist.remarks && <span className="text-slate-400"> — {hist.remarks}</span>}
                                  <span className="text-[10px] text-slate-500 block">{formatDateTime(hist.changed_at)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  ))
                )}
              </div>
            )}
          </div>

        )}

      </div>

      {/* Reusable Form Engine Modal */}
      {applyingOpp && (
        <ApplicationModal
          opportunity={applyingOpp}
          onClose={() => setApplyingOpp(null)}
          onSuccess={(appId) => {
            fetchOpportunities();
          }}
        />
      )}

    </div>
  );
};
