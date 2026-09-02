import React, { useState, useEffect } from 'react';
import { 
  Search, 
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
  ExternalLink,
  Info,
  Mail, 
  Check, 
  X as XIcon, 
  Bell, 
  User,
  History,
  TrendingUp,
  SlidersHorizontal,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  MessageSquarePlus,
} from 'lucide-react';
import { 
  Opportunity, 
  Category, 
  Application, 
  ApplicationStatus, 
  Student, 
  Invitation, 
  NotificationItem,
  ParticipationRecord,
  MatchResult,
  SkillLevel
} from '../types.ts';
import { ApplicationModal } from './ApplicationModal.tsx';
import { PilotFeedbackModal } from './PilotFeedbackModal.tsx';
import { maskStudentIdInput, normalizeStudentIdNumber } from '../lib/normalization.ts';
import { calculateOpportunityMatch } from '../lib/matching.ts';

interface StudentPortalProps {
  initialSlug?: string | null;
  onClearInitialSlug?: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  initialSlug,
  onClearInitialSlug,
}) => {
  const [activeTab, setActiveTab] = useState<'opportunities' | 'matches' | 'tracker' | 'history'>('opportunities');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Active Opportunity Detail Page (when slug clicked or passed)
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);

  // Application Modal state
  const [applyingOpp, setApplyingOpp] = useState<Opportunity | null>(null);

  // Pilot Feedback Modal state
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);

  // Tracker & Identity State
  const [trackerStudentId, setTrackerStudentId] = useState<string>(() => {
    return localStorage.getItem('kpmbp_student_id') || '';
  });
  const [trackerStudent, setTrackerStudent] = useState<Student | null>(null);
  const [trackerApplications, setTrackerApplications] = useState<Application[]>([]);
  const [trackerInvitations, setTrackerInvitations] = useState<Invitation[]>([]);
  const [trackerNotifications, setTrackerNotifications] = useState<NotificationItem[]>([]);
  const [trackerParticipation, setTrackerParticipation] = useState<ParticipationRecord[]>([]);
  const [trackerLoading, setTrackerLoading] = useState<boolean>(false);
  const [trackerSearched, setTrackerSearched] = useState<boolean>(false);
  const [trackerError, setTrackerError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Application Detail Modal for Student
  const [viewingApp, setViewingApp] = useState<Application | null>(null);

  // Withdraw Confirmation Modal
  const [withdrawingAppId, setWithdrawingAppId] = useState<string | null>(null);
  const [withdrawReason, setWithdrawReason] = useState<string>('');
  const [withdrawLoading, setWithdrawLoading] = useState<boolean>(false);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/opportunities');
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      setOpportunities(Array.isArray(data) ? data : []);

      const catRes = await fetch('/api/categories');
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(Array.isArray(catData) ? catData : []);
      }

      // If initial slug passed, open directly
      if (initialSlug && Array.isArray(data)) {
        const found = data.find((o: Opportunity) => o.slug === initialSlug);
        if (found) {
          setSelectedOpp(found);
        }
      }
    } catch (err) {
      console.warn('Notice: opportunities data will sync on server ready:', err);
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

  // Auto-load student data if ID is already in localStorage
  useEffect(() => {
    if (trackerStudentId) {
      const { isValid } = normalizeStudentIdNumber(trackerStudentId);
      if (isValid) {
        performTrack(trackerStudentId);
      }
    }
  }, []);

  // Reset to default Home view upon primary branding Home trigger
  useEffect(() => {
    const handleHomeTrigger = () => {
      setSelectedOpp(null);
      setApplyingOpp(null);
      setIsFeedbackModalOpen(false);
      setViewingApp(null);
      setWithdrawingAppId(null);
      setActiveTab('opportunities');
      setSelectedCategory('all');
      setSearchQuery('');
      if (onClearInitialSlug) {
        onClearInitialSlug();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('kpmbp_go_home', handleHomeTrigger);
    return () => window.removeEventListener('kpmbp_go_home', handleHomeTrigger);
  }, [onClearInitialSlug]);

  const performTrack = async (rawId: string) => {
    setTrackerError(null);
    setActionSuccessMsg(null);
    const { normalized, isValid } = normalizeStudentIdNumber(rawId);
    if (!isValid) {
      setTrackerError('Sila masukkan format ID Pelajar yang sah (cth: PDA-2502-011)');
      return;
    }

    try {
      setTrackerLoading(true);
      localStorage.setItem('kpmbp_student_id', normalized);

      // Fetch Applications
      const appRes = await fetch(`/api/applications?student_id_number=${normalized}`);
      const appData = await appRes.json();
      setTrackerApplications(Array.isArray(appData) ? appData : []);

      // Lookup Student Profile
      const stuRes = await fetch(`/api/students/lookup/${normalized}`);
      if (stuRes.ok) {
        const stuData = await stuRes.json();
        setTrackerStudent(stuData);

        // Fetch Invitations
        const invRes = await fetch(`/api/invitations?student_id_number=${normalized}`);
        if (invRes.ok) {
          const invData = await invRes.json();
          setTrackerInvitations(Array.isArray(invData) ? invData : []);
        }

        // Fetch Notifications
        const notifRes = await fetch(`/api/notifications?recipient_type=STUDENT&recipient_id=${stuData.student_id}`);
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          setTrackerNotifications(Array.isArray(notifData) ? notifData : []);
        }

        // Fetch Participation History
        const partRes = await fetch(`/api/participation?student_id_number=${normalized}`);
        if (partRes.ok) {
          const partData = await partRes.json();
          setTrackerParticipation(Array.isArray(partData) ? partData : []);
        }
      } else {
        setTrackerStudent(null);
        setTrackerInvitations([]);
        setTrackerNotifications([]);
        setTrackerParticipation([]);
      }

      setTrackerSearched(true);
    } catch (err) {
      setTrackerError('Gagal memuatkan rekod pelajar. Sila pastikan pelayan aktif.');
    } finally {
      setTrackerLoading(false);
    }
  };

  const handleTrackApplications = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    performTrack(trackerStudentId);
  };

  const handleRespondInvitation = async (invitationId: string, responseStatus: 'ACCEPTED' | 'DECLINED') => {
    try {
      const res = await fetch(`/api/invitations/${invitationId}/respond`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: responseStatus }),
      });
      if (res.ok) {
        setActionSuccessMsg(responseStatus === 'ACCEPTED' ? 'Jemputan berjaya diterima!' : 'Jemputan ditolak.');
        performTrack(trackerStudentId);
      }
    } catch (err) {
      console.error('Error responding to invitation:', err);
    }
  };

  const handleWithdrawApplication = async () => {
    if (!withdrawingAppId) return;
    try {
      setWithdrawLoading(true);
      const res = await fetch(`/api/applications/${withdrawingAppId}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: withdrawReason || 'Tarik balik permohonan atas permohonan pelajar.' }),
      });
      if (res.ok) {
        setActionSuccessMsg('Permohonan berjaya ditarik balik.');
        setWithdrawingAppId(null);
        setWithdrawReason('');
        performTrack(trackerStudentId);
      } else {
        const d = await res.json();
        alert(d.error || 'Gagal menarik balik permohonan.');
      }
    } catch (err) {
      console.error('Error withdrawing application:', err);
      alert('Ralat semasa menarik balik permohonan.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const filteredOpportunities = opportunities.filter(opp => {
    const matchCat = selectedCategory === 'all' || opp.category_id === selectedCategory;
    const matchQuery = opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.open_call_roles?.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchQuery;
  });

  // Calculate Matches for this student if profile exists
  const matchedOpportunities = React.useMemo(() => {
    if (!trackerStudent || opportunities.length === 0) return [];
    return opportunities
      .map(opp => {
        const match = calculateOpportunityMatch(opp, trackerStudent);
        return {
          opportunity: opp,
          match,
        };
      })
      .sort((a, b) => b.match.score - a.match.score);
  }, [trackerStudent, opportunities]);

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
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">SUBMITTED (DIHANTAR)</span>;
      case ApplicationStatus.SCREENING:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">DALAM SARINGAN</span>;
      case ApplicationStatus.VIDEO_REQUESTED:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">VIDEO PENILAIAN DIPERLUKAN</span>;
      case ApplicationStatus.INTERVIEW:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">SESI TEMUDUGA / AUDISI</span>;
      case ApplicationStatus.SHORTLISTED:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">DISENARAI PENDEK</span>;
      case ApplicationStatus.TRIAL:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">SESI UJIAN / TRIAL</span>;
      case ApplicationStatus.SELECTED:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">TERPILIH (TAHNIAH!)</span>;
      case ApplicationStatus.CONFIRMED:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">DISAHKAN HADIR</span>;
      case ApplicationStatus.REJECTED:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">TIDAK BERJAYA</span>;
      case ApplicationStatus.WITHDRAWN:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-400 border border-slate-700">DITARIK BALIK</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
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
      <div className="bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-[11px] font-semibold uppercase tracking-wider mb-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Pusat Peluang &amp; Panggilan Terbuka Pelajar KPMBP</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                One Student. Many Opportunities.
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
                Platform berpusat untuk menyertai band muzik kolej, pasukan pengucapan awam, program CSR, aktiviti kebudayaan dan mewakili Kolej Profesional MARA Bandar Penawar.
              </p>
            </div>

            {/* Quick Tab Selector */}
            <div className="flex flex-wrap items-center bg-slate-900/95 p-1.5 rounded-xl border border-slate-800 shrink-0 gap-1 self-start lg:self-center shadow-lg">
              <button
                type="button"
                id="btn-tab-opportunities"
                onClick={() => {
                  setActiveTab('opportunities');
                  setSelectedOpp(null);
                }}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'opportunities' && !selectedOpp
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>1. Peluang Terbuka</span>
              </button>

              <button
                type="button"
                id="btn-tab-matches"
                onClick={() => {
                  setActiveTab('matches');
                  setSelectedOpp(null);
                }}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'matches'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>2. Padanan Bakat</span>
              </button>

              <button
                type="button"
                id="btn-tab-tracker"
                onClick={() => {
                  setActiveTab('tracker');
                  setSelectedOpp(null);
                }}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'tracker'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>3. Permohonan &amp; Jemputan</span>
                {trackerInvitations.filter(i => i.status === 'PENDING').length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                )}
              </button>

              <button
                type="button"
                id="btn-tab-history"
                onClick={() => {
                  setActiveTab('history');
                  setSelectedOpp(null);
                }}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'history'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>4. Profil &amp; Sejarah</span>
              </button>

              <button
                type="button"
                id="btn-pilot-feedback"
                onClick={() => setIsFeedbackModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition shadow-sm ml-0.5"
                title="Beri Maklum Balas Pengalaman Pilot"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span>Maklum Balas</span>
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
                    role="button"
                    tabIndex={0}
                    aria-label={`Buka maklumat penuh ${opp.title}`}
                    onClick={() => setSelectedOpp(opp)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        if (e.key === ' ') e.preventDefault();
                        setSelectedOpp(opp);
                      }
                    }}
                    className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-6 flex flex-col justify-between shadow-lg hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
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
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                            {opp.title}
                          </h3>
                          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                        </div>
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

                    {/* Footer & Quick Apply */}
                    <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 text-xs text-slate-400">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Tutup: {new Date(opp.closing_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="w-3.5 h-3.5 text-blue-400" />
                          <span>{opp.total_applications || 0}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        id={`btn-quick-apply-${opp.slug}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setApplyingOpp(opp);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center space-x-1 shadow-md shadow-blue-600/20 hover:shadow-blue-500/30"
                      >
                        <span>Mohon</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        ) : activeTab === 'matches' ? (

          /* -------------------------------------------------------------
              VIEW 3: PADANAN BAKAT SAYA (DETERMINISTIC SES 4.4 ENGINE)
             ------------------------------------------------------------- */
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Identity Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Padanan Bakat Pintar (SES 4.4 Engine)</h2>
                  <p className="text-xs text-slate-400">
                    Sistem memadankan profil kemahiran berdaftar anda dengan keperluan peluang secara berstruktur.
                  </p>
                </div>
              </div>

              {!trackerStudent && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={trackerStudentId}
                    onChange={(e) => setTrackerStudentId(maskStudentIdInput(e.target.value))}
                    placeholder="PDA-2502-011"
                    maxLength={12}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => performTrack(trackerStudentId)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold"
                  >
                    Muat Profil
                  </button>
                </div>
              )}
            </div>

            {trackerStudent ? (
              <div className="space-y-4">
                <div className="bg-purple-950/30 border border-purple-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="text-xs">
                    <span className="text-slate-400">Profil Pelajar Aktif: </span>
                    <strong className="text-white">{trackerStudent.full_name}</strong>
                    <span className="text-slate-400 font-mono ml-1">({trackerStudent.student_id_number})</span>
                    <span className="text-slate-400 ml-2">• Kemahiran: </span>
                    <span className="text-purple-300 font-semibold">{trackerStudent.skills?.map(s => s.skill_name).join(', ') || 'Tiada'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => performTrack(trackerStudentId)}
                    className="text-xs text-purple-400 hover:text-purple-300 underline"
                  >
                    Segar Semula
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matchedOpportunities.map(({ opportunity: opp, match }) => (
                    <div
                      key={opp.opportunity_id}
                      className="bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-2xl p-5 space-y-4 shadow-lg transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            {opp.category_name}
                          </span>
                          <h3 className="text-base font-bold text-white mt-1">{opp.title}</h3>
                          <p className="text-[11px] text-slate-400 font-mono">/{opp.slug}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-lg font-extrabold font-mono text-purple-300">{match.score}%</span>
                          <span className={`block text-[9px] font-bold px-2 py-0.5 rounded mt-0.5 uppercase ${
                            match.tier === 'EXCELLENT' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            match.tier === 'STRONG' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                            match.tier === 'MODERATE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {match.tier}
                          </span>
                        </div>
                      </div>

                      {/* Explainability Breakdown */}
                      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                        {match.matched_items && match.matched_items.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold uppercase text-emerald-400 flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Syarat Dipenuhi ({match.matched_items.length}):</span>
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {match.matched_items.map((item, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded text-[10px]">
                                  ✓ {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {match.partial_items && match.partial_items.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold uppercase text-amber-400 flex items-center space-x-1">
                              <AlertCircle className="w-3 h-3 text-amber-400" />
                              <span>Padanan Separa ({match.partial_items.length}):</span>
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {match.partial_items.map((item, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded text-[10px]">
                                  △ {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {match.missing_items && match.missing_items.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold uppercase text-rose-400 flex items-center space-x-1">
                              <span className="w-3 h-3 text-rose-400 font-bold inline-flex items-center justify-center">✕</span>
                              <span>Belum Dipenuhi:</span>
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {match.missing_items.map((item, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded text-[10px]">
                                  ✕ {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pt-1 border-t border-slate-900">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Justifikasi:</span>
                          <ul className="space-y-0.5 text-slate-300 text-[11px]">
                            {match.reasons.map((r, rIdx) => (
                              <li key={rIdx} className="flex items-start space-x-1.5">
                                <span className="text-purple-400 font-bold">•</span>
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => setSelectedOpp(opp)}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          Lihat Maklumat
                        </button>
                        <button
                          type="button"
                          onClick={() => setApplyingOpp(opp)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/30 flex items-center space-x-1.5"
                        >
                          <span>Mohon Sekarang</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <Sparkles className="w-10 h-10 text-purple-400 mx-auto" />
                <h3 className="text-base font-semibold text-white">Sila Masukkan ID Pelajar Anda</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Untuk melihat padanan pintar mengikut bakat dan kebolehan anda, masukkan ID Pelajar (cth: PDA-2502-011) di bahagian atas.
                </p>
              </div>
            )}
          </div>

        ) : activeTab === 'tracker' ? (

          /* -------------------------------------------------------------
              VIEW 4: SEMAK STATUS PERMOHONAN & JEMPUTAN (STUDENT TRACKER)
             ------------------------------------------------------------- */
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                  <FileCheck className="w-5 h-5 text-blue-400" />
                  <span>Semak Status Permohonan &amp; Jemputan Pentadbir</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Masukkan ID Pelajar anda untuk melihat status semua permohonan yang pernah dihantar serta jemputan rasmi daripada pensyarah/penasihat bakat.
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
                  {trackerLoading ? 'Menyemak...' : 'Semak Rekod'}
                </button>
              </form>

              {actionSuccessMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex items-center space-x-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{actionSuccessMsg}</span>
                </div>
              )}

              {trackerError && (
                <p className="text-xs text-rose-400 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{trackerError}</span>
                </p>
              )}
            </div>

            {/* Tracker Results */}
            {trackerSearched && (
              <div className="space-y-6">
                
                {/* 1. Direct Invitations from Admin */}
                {trackerInvitations.length > 0 && (
                  <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-amber-400" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                          Jemputan Rasmi Dari Pentadbir ({trackerInvitations.length})
                        </h3>
                      </div>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                        Panggilan Terus
                      </span>
                    </div>

                    <div className="space-y-3">
                      {trackerInvitations.map((inv) => (
                        <div key={inv.invitation_id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-bold text-white">{inv.opportunity?.title || 'Peluang KPMBP'}</h4>
                              <p className="text-xs text-slate-300 mt-0.5">{inv.message || 'Anda dijemput untuk menyertai peluang ini berdasarkan bakat anda.'}</p>
                              <span className="text-[10px] text-slate-500 block mt-1 font-mono">
                                Dijemput oleh: {inv.invited_by_name || inv.invited_by} • {formatDateTime(inv.created_at)}
                              </span>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
                              inv.status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              inv.status === 'DECLINED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                              'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                            }`}>
                              {inv.status}
                            </span>
                          </div>

                          {inv.status === 'PENDING' && (
                            <div className="flex items-center space-x-2 pt-2 border-t border-slate-900">
                              <button
                                type="button"
                                onClick={() => handleRespondInvitation(inv.invitation_id, 'ACCEPTED')}
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors shadow-md shadow-emerald-600/20"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Terima Jemputan</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRespondInvitation(inv.invitation_id, 'DECLINED')}
                                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
                              >
                                <XIcon className="w-3.5 h-3.5" />
                                <span>Tolak</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Official Status Lifecycle Guide */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center space-x-2 text-slate-300 font-bold">
                    <Info className="w-4 h-4 text-blue-400" />
                    <span>Panduan Aliran Status Saringan (SES 4.4 Standard):</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded">1. Submitted</span>
                    <span>→</span>
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded">2. Screening</span>
                    <span>→</span>
                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-300 rounded">3. Audisi / Temuduga</span>
                    <span>→</span>
                    <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-300 rounded">4. Disenarai Pendek</span>
                    <span>→</span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-bold">5. Terpilih &amp; Disahkan</span>
                  </div>
                </div>

                {/* 3. Applications List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                      <FileCheck className="w-4 h-4 text-blue-400" />
                      <span>Senarai Permohonan Saya ({trackerApplications.length})</span>
                    </h3>
                  </div>

                  {trackerApplications.length === 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                      Tiada rekod permohonan aktif dijumpai untuk ID Pelajar ini.
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
                            <span className="text-[11px] text-slate-400">{app.opportunity?.category_name}</span>
                          </div>
                          <div>
                            {getStatusBadge(app.status)}
                          </div>
                        </div>

                        {/* Details & Submission Date */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-slate-500 block">Tarikh Dihantar:</span>
                            <span className="text-white font-medium">{formatDateTime(app.submitted_at)}</span>
                          </div>
                          {app.reviewed_by && (
                            <div>
                              <span className="text-slate-500 block">Pegawai Penilai Terakhir:</span>
                              <span className="text-slate-300">{app.reviewed_by}</span>
                            </div>
                          )}
                        </div>

                        {/* Status History Stepper */}
                        {app.status_history && app.status_history.length > 0 && (
                          <div className="bg-slate-950 rounded-xl p-4 border border-slate-850 space-y-2">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                              Jejak Kemajuan Status:
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

                        {/* Actions for Student: View Details & Withdraw */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-850 text-xs">
                          <button
                            type="button"
                            onClick={() => setViewingApp(app)}
                            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
                          >
                            Lihat Jawapan Borang
                          </button>

                          {/* Allow withdraw if not confirmed or already withdrawn */}
                          {app.status !== ApplicationStatus.CONFIRMED && app.status !== ApplicationStatus.WITHDRAWN && (
                            <button
                              type="button"
                              onClick={() => setWithdrawingAppId(app.application_id)}
                              className="px-3 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg font-medium transition-colors"
                            >
                              Tarik Balik Permohonan
                            </button>
                          )}
                        </div>

                      </div>
                    ))
                  )}
                </div>

              </div>
            )}
          </div>

        ) : (

          /* -------------------------------------------------------------
              VIEW 5: PROFIL INDUK & SEJARAH PENGLIBATAN (TALENT HISTORY)
             ------------------------------------------------------------- */
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Lookup bar if student not loaded */}
            {!trackerStudent && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                    <User className="w-5 h-5 text-blue-400" />
                    <span>Rekod Penglibatan &amp; Profil Bakat Pelajar</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Masukkan ID Pelajar untuk melihat sejarah penglibatan rasmi dalam program kolej dan kemahiran yang didaftarkan.
                  </p>
                </div>

                <form onSubmit={handleTrackApplications} className="flex gap-3">
                  <input
                    type="text"
                    value={trackerStudentId}
                    onChange={(e) => setTrackerStudentId(maskStudentIdInput(e.target.value))}
                    placeholder="PDA-2502-011"
                    maxLength={12}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white font-mono uppercase text-sm focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shrink-0"
                  >
                    Muat Profil
                  </button>
                </form>
              </div>
            )}

            {trackerStudent && (
              <div className="space-y-6">
                
                {/* Master Record Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <User className="w-5 h-5 text-blue-400" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        Profil Induk Pelajar (Master Record)
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded border border-blue-500/20 font-bold">
                      {trackerStudent.student_id_number}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block">Nama Penuh:</span>
                      <span className="text-white font-bold text-sm">{trackerStudent.full_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Program &amp; Semester:</span>
                      <span className="text-slate-200 font-medium">{trackerStudent.programme} (Sem {trackerStudent.semester})</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Kelas &amp; Jantina:</span>
                      <span className="text-slate-200">{trackerStudent.class} • {trackerStudent.gender}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">WhatsApp / Tel:</span>
                      <span className="text-slate-200 font-mono">{trackerStudent.phone}</span>
                    </div>
                  </div>

                  {/* Registered Skills Matrix */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                      Kemahiran &amp; Bakat Berdaftar ({trackerStudent.skills?.length || 0}):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {trackerStudent.skills?.map((sk, sIdx) => (
                        <div key={sIdx} className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex items-center justify-between text-xs">
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-white">{sk.skill_name}</span>
                              {sk.is_primary && (
                                <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[9px] font-bold">
                                  UTAMA
                                </span>
                              )}
                            </div>
                            {sk.experience_duration && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">{sk.experience_duration}</span>
                            )}
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            sk.skill_level === SkillLevel.ADVANCED ? 'bg-emerald-500/20 text-emerald-300' :
                            sk.skill_level === SkillLevel.INTERMEDIATE ? 'bg-blue-500/20 text-blue-300' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {sk.skill_level}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Verified Participation History */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <Trophy className="w-5 h-5 text-amber-400" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        Rekod Penglibatan Rasmi &amp; Sejarah Bakat ({trackerParticipation.length})
                      </h3>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                      Disahkan Kolej
                    </span>
                  </div>

                  {trackerParticipation.length === 0 ? (
                    <div className="bg-slate-950 p-6 rounded-xl border border-slate-850 text-center text-xs text-slate-400">
                      Tiada rekod penglibatan program terdahulu direkodkan lagi. Selesai menyertai aktiviti terpilih, rekod penglibatan rasmi anda akan tertera di sini.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {trackerParticipation.map((part) => (
                        <div key={part.participation_id} className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="text-[10px] text-amber-400 font-bold uppercase">{part.category}</span>
                            <h4 className="text-sm font-bold text-white mt-0.5">{part.opportunity_title}</h4>
                            <p className="text-slate-300 mt-1">Peranan: <strong className="text-white">{part.role_achieved}</strong></p>
                          </div>
                          <div className="text-right font-mono text-[10px] text-slate-500 shrink-0">
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold">
                              {part.status} ({part.year})
                            </span>
                            <span className="block mt-1">Disahkan: {new Date(part.verified_at).toLocaleDateString('ms-MY')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notifications & Announcements Feed */}
                {trackerNotifications.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                      <Bell className="w-5 h-5 text-blue-400" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        Pemberitahuan &amp; Notifikasi Rasmi ({trackerNotifications.length})
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {trackerNotifications.map((notif) => (
                        <div key={notif.notification_id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200">{notif.title}</span>
                            <span className="text-[10px] text-slate-500">{formatDateTime(notif.created_at)}</span>
                          </div>
                          <p className="text-slate-400 leading-relaxed">{notif.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>

        )}

      </div>

      {/* -------------------------------------------------------------
          MODAL A: APPLICATION DETAILS VIEW (STUDENT PERSPECTIVE)
         ------------------------------------------------------------- */}
      {viewingApp && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-850 p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-blue-400 block">{viewingApp.application_id}</span>
                <h3 className="text-base font-bold text-white">{viewingApp.opportunity?.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingApp(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex justify-between items-center">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Status Semasa</span>
                  <div className="mt-1">{getStatusBadge(viewingApp.status)}</div>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px] uppercase">Tarikh Dihantar</span>
                  <span className="text-white font-mono mt-1 block">{formatDateTime(viewingApp.submitted_at)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Jawapan Borang Permohonan</h4>
                {viewingApp.responses && viewingApp.responses.length > 0 ? (
                  viewingApp.responses.map((r, i) => (
                    <div key={i} className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1">
                      <span className="text-slate-400 block font-semibold text-[11px]">Soalan #{i + 1}</span>
                      {r.response_value?.startsWith('http') ? (
                        <a
                          href={r.response_value}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:underline flex items-center space-x-1 font-mono break-all"
                        >
                          <span>{r.response_value}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <p className="text-white font-medium">{r.response_value || '-'}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500">Tiada jawapan tambahan direkodkan.</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingApp(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL B: WITHDRAW APPLICATION CONFIRMATION
         ------------------------------------------------------------- */}
      {withdrawingAppId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Tarik Balik Permohonan?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Adakah anda pasti ingin menarik balik permohonan ini? Tindakan ini akan membatalkan sesi saringan dan memaklumkan pentadbir.
            </p>

            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Sebab Penarikan (Pilihan)</label>
              <input
                type="text"
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                placeholder="Cth: Bertembung dengan jadual peperiksaan..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setWithdrawingAppId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={withdrawLoading}
                onClick={handleWithdrawApplication}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/30"
              >
                {withdrawLoading ? 'Memproses...' : 'Sahkan Tarik Balik'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL C: REUSABLE FORM ENGINE APPLICATION MODAL
         ------------------------------------------------------------- */}
      {applyingOpp && (
        <ApplicationModal
          opportunity={applyingOpp}
          onClose={() => setApplyingOpp(null)}
          onSuccess={(appId) => {
            fetchOpportunities();
            if (trackerStudentId) {
              performTrack(trackerStudentId);
            }
          }}
        />
      )}

      {/* -------------------------------------------------------------
          MODAL D: PILOT FEEDBACK MODAL (SES 4.4 Standard)
         ------------------------------------------------------------- */}
      <PilotFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        defaultRole="STUDENT"
        userIdentifier={trackerStudent?.student_id_number || trackerStudentId || 'STUDENT_GUEST'}
        userName={trackerStudent?.full_name || 'Pelajar KPMBP'}
        pageContext={`Portal Pelajar (${activeTab})`}
      />

    </div>
  );
};
