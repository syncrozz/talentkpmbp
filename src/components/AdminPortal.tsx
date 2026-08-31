import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Layers, 
  FileText, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Filter, 
  Sparkles, 
  MessageSquare, 
  ChevronRight, 
  Send, 
  ExternalLink, 
  SlidersHorizontal, 
  ShieldCheck, 
  History, 
  Edit3, 
  Trash2, 
  Video, 
  UserPlus, 
  Check, 
  X,
  Trophy
} from 'lucide-react';
import { 
  Opportunity, 
  Application, 
  Student, 
  Category, 
  Skill, 
  ApplicationStatus, 
  OpportunityStatus, 
  SkillLevel, 
  QuestionType,
  Invitation
} from '../types.ts';
import { generateSlug, validateSlug } from '../lib/normalization.ts';

export const AdminPortal: React.FC = () => {
  const [subView, setSubView] = useState<'dashboard' | 'opportunities' | 'applications' | 'talentSearch' | 'students'>('dashboard');

  // State collections
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const [loading, setLoading] = useState<boolean>(true);

  // Filters for Applications
  const [selectedOppFilter, setSelectedOppFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Selected Application for Screening Drawer / Modal
  const [activeApp, setActiveApp] = useState<Application | null>(null);
  const [statusUpdateVal, setStatusUpdateVal] = useState<ApplicationStatus>(ApplicationStatus.SCREENING);
  const [statusRemarks, setStatusRemarks] = useState<string>('');
  const [newAdminNote, setNewAdminNote] = useState<string>('');

  // Talent Search State
  const [searchSkill, setSearchSkill] = useState<string>('');
  const [searchLevel, setSearchLevel] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);

  // Create / Edit Opportunity Modal State
  const [showOppModal, setShowOppModal] = useState<boolean>(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [oppTitle, setOppTitle] = useState<string>('');
  const [oppSlug, setOppSlug] = useState<string>('');
  const [oppCategory, setOppCategory] = useState<string>('');
  const [oppDescription, setOppDescription] = useState<string>('');
  const [oppRoles, setOppRoles] = useState<string>('');
  const [oppClosingDate, setOppClosingDate] = useState<string>('2026-09-01T22:00');
  const [oppStatus, setOppStatus] = useState<OpportunityStatus>(OpportunityStatus.OPEN);
  const [oppMaxApplicants, setOppMaxApplicants] = useState<string>('');
  const [oppQuestions, setOppQuestions] = useState<Array<{
    question_text: string;
    question_type: QuestionType;
    is_required: boolean;
    options_str: string;
    placeholder?: string;
  }>>([]);
  const [oppModalError, setOppModalError] = useState<string | null>(null);

  // Direct Invite Modal State
  const [inviteStudent, setInviteStudent] = useState<Student | null>(null);
  const [inviteOppId, setInviteOppId] = useState<string>('');
  const [inviteNotes, setInviteNotes] = useState<string>('');
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  // Selected Student for Profile View
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<Student | null>(null);
  const [studentHistoryRecords, setStudentHistoryRecords] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [oppRes, appRes, catRes, skRes, anaRes, stuRes, invRes] = await Promise.all([
        fetch('/api/opportunities?admin=true'),
        fetch('/api/applications'),
        fetch('/api/categories'),
        fetch('/api/skills'),
        fetch('/api/analytics'),
        fetch('/api/students/search'),
        fetch('/api/invitations'),
      ]);

      const [oppData, appData, catData, skData, anaData, stuData, invData] = await Promise.all([
        oppRes.json(),
        appRes.json(),
        catRes.json(),
        skRes.json(),
        anaRes.json(),
        stuRes.json(),
        invRes.json(),
      ]);

      setOpportunities(oppData);
      setApplications(appData);
      setCategories(catData);
      setSkills(skData);
      setAnalytics(anaData);
      setStudents(stuData);
      setSearchResults(stuData);
      setInvitations(invData);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync slug on title change when creating new
  const handleTitleChange = (val: string) => {
    setOppTitle(val);
    if (!editingOpp) {
      setOppSlug(generateSlug(val));
    }
  };

  const handleOpenCreateOppModal = () => {
    setEditingOpp(null);
    setOppTitle('');
    setOppSlug('');
    setOppCategory(categories[0]?.category_id || 'cat-music');
    setOppDescription('');
    setOppRoles('');
    setOppClosingDate('2026-09-01T22:00');
    setOppStatus(OpportunityStatus.OPEN);
    setOppMaxApplicants('');
    setOppQuestions([
      { question_text: 'Instrumen / Peranan Utama Dipohon', question_type: QuestionType.SINGLE_SELECT, is_required: true, options_str: 'Guitar, Bass, Vocal, Keyboard, Drum', placeholder: '' },
      { question_text: 'Pautan Video Demo / Audisi', question_type: QuestionType.VIDEO_LINK, is_required: true, options_str: '', placeholder: 'https://youtu.be/...' },
    ]);
    setOppModalError(null);
    setShowOppModal(true);
  };

  const handleOpenEditOppModal = (opp: Opportunity) => {
    setEditingOpp(opp);
    setOppTitle(opp.title);
    setOppSlug(opp.slug);
    setOppCategory(opp.category_id);
    setOppDescription(opp.description);
    setOppRoles(opp.open_call_roles?.join(', ') || '');
    // format datetime-local
    const dt = new Date(opp.closing_date);
    const localIso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setOppClosingDate(localIso);
    setOppStatus(opp.status);
    setOppMaxApplicants(opp.max_applicants ? String(opp.max_applicants) : '');

    const questionsFormatted = (opp.questions || []).map(q => ({
      question_text: q.question_text,
      question_type: q.question_type,
      is_required: q.is_required,
      options_str: q.options?.join(', ') || '',
      placeholder: q.placeholder,
    }));
    setOppQuestions(questionsFormatted);
    setOppModalError(null);
    setShowOppModal(true);
  };

  const handleSaveOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setOppModalError(null);

    const slugCheck = validateSlug(oppSlug);
    if (!slugCheck.isValid) {
      setOppModalError(slugCheck.error || 'Slug tidak sah');
      return;
    }

    const rolesArr = oppRoles.split(',').map(r => r.trim()).filter(Boolean);

    const questionsPayload = oppQuestions.map(q => ({
      question_text: q.question_text.trim(),
      question_type: q.question_type,
      is_required: q.is_required,
      options: q.options_str.split(',').map(o => o.trim()).filter(Boolean),
      placeholder: q.placeholder?.trim(),
    }));

    const payload = {
      title: oppTitle.trim(),
      slug: oppSlug.trim(),
      category_id: oppCategory,
      description: oppDescription.trim(),
      open_call_roles: rolesArr,
      closing_date: new Date(oppClosingDate).toISOString(),
      status: oppStatus,
      max_applicants: oppMaxApplicants ? parseInt(oppMaxApplicants, 10) : undefined,
      questions: questionsPayload,
    };

    try {
      const url = editingOpp ? `/api/opportunities/${editingOpp.opportunity_id}` : '/api/opportunities';
      const method = editingOpp ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setOppModalError(data.error || 'Gagal menyimpan peluang.');
        return;
      }

      setShowOppModal(false);
      loadData();
    } catch (err) {
      setOppModalError('Ralat sambungan pelayan.');
    }
  };

  // Perform Talent Search
  const handlePerformTalentSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      let queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append('query', searchQuery);
      if (searchSkill) queryParams.append('skill', searchSkill);
      if (searchLevel) queryParams.append('level', searchLevel);

      const res = await fetch(`/api/students/search?${queryParams.toString()}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  // Handle Application Status Update
  const handleUpdateStatus = async () => {
    if (!activeApp) return;
    try {
      const res = await fetch(`/api/applications/${activeApp.application_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_status: statusUpdateVal,
          remarks: statusRemarks.trim(),
          reviewer_name: 'Admin Hal Ehwal Pelajar KPMBP',
        }),
      });

      if (res.ok) {
        setStatusRemarks('');
        loadData();
        // Refresh active app
        const updatedRes = await fetch('/api/applications');
        const updatedList: Application[] = await updatedRes.json();
        const found = updatedList.find(a => a.application_id === activeApp.application_id);
        if (found) setActiveApp(found);
      }
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  // Handle Add Admin Note
  const handleAddNote = async () => {
    if (!activeApp || !newAdminNote.trim()) return;
    try {
      const res = await fetch(`/api/applications/${activeApp.application_id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: newAdminNote.trim(),
          admin_name: 'Admin Penilai KPMBP',
        }),
      });

      if (res.ok) {
        setNewAdminNote('');
        loadData();
        // Refresh active app
        const updatedRes = await fetch('/api/applications');
        const updatedList: Application[] = await updatedRes.json();
        const found = updatedList.find(a => a.application_id === activeApp.application_id);
        if (found) setActiveApp(found);
      }
    } catch (err) {
      console.error('Add note error:', err);
    }
  };

  // Send Direct Invitation
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteStudent || !inviteOppId) return;

    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: inviteStudent.student_id,
          opportunity_id: inviteOppId,
          notes: inviteNotes.trim(),
          admin_name: 'Unit Pembangunan Bakat KPMBP',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setInviteSuccessMsg(`Jemputan berjaya dihantar kepada ${inviteStudent.full_name}!`);
        setTimeout(() => {
          setInviteStudent(null);
          setInviteSuccessMsg(null);
          setInviteNotes('');
        }, 1800);
        loadData();
      }
    } catch (err) {
      console.error('Invite error:', err);
    }
  };

  // Open Student Profile Details
  const handleViewStudentProfile = async (stu: Student) => {
    setSelectedStudentProfile(stu);
    try {
      const res = await fetch(`/api/students/${stu.student_id}/history`);
      const data = await res.json();
      setStudentHistoryRecords(data);
    } catch (e) {
      setStudentHistoryRecords([]);
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchOpp = selectedOppFilter === 'all' || app.opportunity_id === selectedOppFilter;
    const matchStatus = selectedStatusFilter === 'all' || app.status === selectedStatusFilter;
    return matchOpp && matchStatus;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 pb-16">
      
      {/* Admin Top Banner */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold uppercase">
                  Pusat Kawalan Pentadbir
                </span>
                <span className="text-xs text-slate-400">Unit Hal Ehwal Pelajar &amp; Bakat</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                KPMBP Student Talent &amp; Screening Console
              </h1>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800 gap-1">
              <button
                type="button"
                id="admin-subtab-dashboard"
                onClick={() => setSubView('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  subView === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Ringkasan
              </button>
              <button
                type="button"
                id="admin-subtab-opportunities"
                onClick={() => setSubView('opportunities')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  subView === 'opportunities' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Peluang ({opportunities.length})
              </button>
              <button
                type="button"
                id="admin-subtab-applications"
                onClick={() => setSubView('applications')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  subView === 'applications' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Permohonan &amp; Saringan ({applications.length})
              </button>
              <button
                type="button"
                id="admin-subtab-talent-search"
                onClick={() => setSubView('talentSearch')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  subView === 'talentSearch' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Carian Bakat
              </button>
              <button
                type="button"
                id="admin-subtab-students"
                onClick={() => setSubView('students')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  subView === 'students' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Direktori Pelajar ({students.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

        {/* -------------------------------------------------------------
            SUBVIEW 1: DASHBOARD OVERVIEW
           ------------------------------------------------------------- */}
        {subView === 'dashboard' && analytics && (
          <div className="space-y-8">
            
            {/* Metric KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
                <span className="text-xs text-slate-400 font-medium">Jumlah Pelajar Berdaftar</span>
                <p className="text-3xl font-extrabold text-white tracking-tight">{analytics.totalStudents}</p>
                <span className="text-[11px] text-blue-400 block font-mono">1 Profil = Pelbagai Peluang</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
                <span className="text-xs text-slate-400 font-medium">Bakat / Kemahiran Terkumpul</span>
                <p className="text-3xl font-extrabold text-amber-400 tracking-tight">{analytics.totalSkillsRegistered}</p>
                <span className="text-[11px] text-slate-400 block">Kemahiran Muzik, Pidato &amp; Media</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
                <span className="text-xs text-slate-400 font-medium">Peluang Terbuka Aktif</span>
                <p className="text-3xl font-extrabold text-emerald-400 tracking-tight">{analytics.activeOpportunities}</p>
                <span className="text-[11px] text-emerald-300 block">Panggilan Uji Bakat &amp; Program</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
                <span className="text-xs text-slate-400 font-medium">Senarai Pendek / Terpilih</span>
                <p className="text-3xl font-extrabold text-indigo-400 tracking-tight">{analytics.shortlistedCount}</p>
                <span className="text-[11px] text-slate-400 block">Calon Berkualiti Tinggi</span>
              </div>
            </div>

            {/* Quick Actions & Talent Distribution Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left 2 Cols: Pilot Showcase & Quick Actions */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Pilot Use Case Card */}
                <div className="bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-800/40 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-semibold">
                      PILOT USE CASE #001
                    </span>
                    <span className="text-xs text-slate-400 font-mono">/legacy-band-2026</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      Legacy Band 2026 Open Audition
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Pilot pertama platform bagi mengumpulkan pemain Gitar, Bass, Vokal, Keyboard dan Drum. Sistem membolehkan penapisan video, pertukaran status, dan jemputan bakat secara langsung.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      id="btn-quick-filter-legacy"
                      onClick={() => {
                        setSelectedOppFilter('opp-001');
                        setSubView('applications');
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Lihat Pemohon Legacy Band</span>
                    </button>
                    <button
                      type="button"
                      id="btn-quick-search-bass"
                      onClick={() => {
                        setSearchSkill('Bass');
                        setSubView('talentSearch');
                        handlePerformTalentSearch();
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5"
                    >
                      <Search className="w-4 h-4 text-amber-400" />
                      <span>Cari Pemain Bass</span>
                    </button>
                  </div>
                </div>

                {/* Recent Applications Feed */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Permohonan Terkini
                    </h3>
                    <button
                      type="button"
                      onClick={() => setSubView('applications')}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                    >
                      Lihat Semua →
                    </button>
                  </div>

                  <div className="divide-y divide-slate-800">
                    {applications.slice(0, 4).map((app) => (
                      <div key={app.application_id} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-white">{app.student?.full_name}</p>
                          <p className="text-xs text-slate-400 font-mono">{app.student?.student_id_number} • {app.opportunity?.title}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                            {app.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveApp(app);
                              setStatusUpdateVal(app.status);
                            }}
                            className="text-xs text-blue-400 hover:underline"
                          >
                            Saring
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Col: Talent Bank Breakdown */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Taburan Bakat KPMBP</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Kemahiran yang didaftarkan oleh pelajar merentasi semua jabatan.
                </p>

                <div className="space-y-3 pt-2">
                  {analytics.skillsBreakdown?.slice(0, 8).map((sb: any, idx: number) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">{sb.skill_name}</span>
                        <span className="text-slate-400 font-mono">{sb.count} orang</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${Math.min((sb.count / Math.max(analytics.totalStudents, 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* -------------------------------------------------------------
            SUBVIEW 2: OPPORTUNITIES MANAGER
           ------------------------------------------------------------- */}
        {subView === 'opportunities' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Pengurusan Peluang &amp; Panggilan Terbuka</h2>
                <p className="text-xs text-slate-400">Bina panggilan terbuka baharu, urus soalan khusus, dan tetapkan tarikh tutup.</p>
              </div>
              <button
                type="button"
                id="btn-create-opportunity-trigger"
                onClick={handleOpenCreateOppModal}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-md shadow-indigo-600/30 transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Bina Peluang Baharu</span>
              </button>
            </div>

            {/* Opportunities List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {opportunities.map((opp) => (
                <div
                  key={opp.opportunity_id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-lg space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md">
                        {opp.category_name}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        opp.status === OpportunityStatus.OPEN ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {opp.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white">{opp.title}</h3>
                      <span className="text-xs text-slate-400 font-mono">/{opp.slug}</span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {opp.description}
                    </p>

                    <div className="space-y-1 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                      <div>Tarikh Tutup: <strong className="text-slate-200">{new Date(opp.closing_date).toLocaleDateString('ms-MY')}</strong></div>
                      <div>Jumlah Permohonan: <strong className="text-blue-400">{opp.total_applications || 0}</strong></div>
                      <div>Soalan Khusus: <strong className="text-slate-200">{opp.questions?.length || 0}</strong></div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditOppModal(opp)}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Kemaskini</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOppFilter(opp.opportunity_id);
                        setSubView('applications');
                      }}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Lihat Pemohon</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            SUBVIEW 3: APPLICATIONS & SCREENING WORKFLOW
           ------------------------------------------------------------- */}
        {subView === 'applications' && (
          <div className="space-y-6">
            
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="flex flex-wrap items-center gap-3">
                
                {/* Opportunity Filter */}
                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Peluang</label>
                  <select
                    id="filter-opp-select"
                    value={selectedOppFilter}
                    onChange={(e) => setSelectedOppFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="all">Semua Peluang ({applications.length})</option>
                    {opportunities.map(o => (
                      <option key={o.opportunity_id} value={o.opportunity_id}>{o.title}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Status Saringan</label>
                  <select
                    id="filter-status-select"
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="all">Semua Status</option>
                    {Object.values(ApplicationStatus).map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

              </div>

              <div className="text-xs text-slate-400 font-medium">
                Memaparkan <strong className="text-white">{filteredApplications.length}</strong> pemohon
              </div>
            </div>

            {/* Applications Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Maklumat Pelajar</th>
                      <th className="py-3.5 px-4">Peluang Dipohon</th>
                      <th className="py-3.5 px-4">Bakat &amp; Tahap</th>
                      <th className="py-3.5 px-4">Status Terkini</th>
                      <th className="py-3.5 px-4">Tarikh Hantar</th>
                      <th className="py-3.5 px-4 text-right">Tindakan Saringan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredApplications.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          Tiada permohonan sepadan dengan tapisan ini.
                        </td>
                      </tr>
                    ) : (
                      filteredApplications.map((app) => (
                        <tr key={app.application_id} className="hover:bg-slate-850/50 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white">{app.student?.full_name}</div>
                            <div className="font-mono text-[11px] text-blue-400">{app.student?.student_id_number} • {app.student?.class}</div>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-200">
                            {app.opportunity?.title}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1">
                              {app.student?.skills?.map((sk, i) => (
                                <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded text-[10px] border border-slate-700">
                                  {sk.skill_name} ({sk.skill_level})
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-indigo-300 border border-indigo-500/20">
                              {app.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 font-mono">
                            {new Date(app.submitted_at).toLocaleDateString('ms-MY')}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              id={`btn-screen-app-${app.application_id}`}
                              onClick={() => {
                                setActiveApp(app);
                                setStatusUpdateVal(app.status);
                              }}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-xs transition-colors shadow-sm"
                            >
                              Saring / Audit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* -------------------------------------------------------------
            SUBVIEW 4: TALENT SEARCH & DIRECT INVITATION ("SEARCH -> MATCH -> INVITE")
           ------------------------------------------------------------- */}
        {subView === 'talentSearch' && (
          <div className="space-y-6">
            
            {/* Search Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                  <Search className="w-5 h-5 text-amber-400" />
                  <span>Enjin Carian &amp; Padanan Bakat Pelajar KPMBP</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Cari pelajar mengikut instrumen muzik, pengucapan awam, kemahiran media atau kebolehan khusus, kemudian jemput mereka terus ke peluang yang dibuka.
                </p>
              </div>

              <form onSubmit={handlePerformTalentSearch} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Carian Nama / Kemahiran</label>
                  <input
                    type="text"
                    id="input-talent-search-query"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Contoh: Bass, Guitar, Emcee, Fotografi, Faris..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Tahap Minimum</label>
                  <select
                    id="select-talent-search-level"
                    value={searchLevel}
                    onChange={(e) => setSearchLevel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="">Semua Tahap</option>
                    <option value={SkillLevel.ADVANCED}>Advanced (Lanjutan)</option>
                    <option value={SkillLevel.INTERMEDIATE}>Intermediate (Pertengahan)</option>
                    <option value={SkillLevel.BEGINNER}>Beginner (Asas)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    id="btn-execute-talent-search"
                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-amber-600/30 transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Search className="w-4 h-4" />
                    <span>Cari Bakat</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Talent Search Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.length === 0 ? (
                <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
                  Tiada profil bakat dijumpai bagi kriteria carian ini.
                </div>
              ) : (
                searchResults.map((stu) => (
                  <div
                    key={stu.student_id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-lg space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-base font-bold text-white">{stu.full_name}</h3>
                          <p className="text-xs text-blue-400 font-mono mt-0.5">{stu.student_id_number} • {stu.class}</p>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                          {stu.gender}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400">
                        <span>{stu.programme} (Sem {stu.semester})</span>
                      </div>

                      {/* Skills */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-800">
                        <span className="text-[10px] font-semibold uppercase text-slate-400 block">Portfolio Bakat:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {stu.skills?.map((sk, i) => (
                            <span
                              key={i}
                              className={`text-[11px] px-2 py-0.5 rounded-md border font-medium ${
                                sk.is_primary
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {sk.skill_name} <strong className="text-xs">({sk.skill_level})</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewStudentProfile(stu)}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
                      >
                        Profil Master
                      </button>
                      <button
                        type="button"
                        id={`btn-invite-student-${stu.student_id}`}
                        onClick={() => setInviteStudent(stu)}
                        className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Jemput</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* -------------------------------------------------------------
            SUBVIEW 5: STUDENTS DIRECTORY & PARTICIPATION
           ------------------------------------------------------------- */}
        {subView === 'students' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <span>Direktori Master Pelajar KPMBP</span>
              </h2>
              <p className="text-xs text-slate-400">
                Pangkalan profil pelajar bersepadu dengan sejarah penglibatan aktiviti, kemahiran pelbagai, dan maklumat perhubungan rasmi.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {students.map((stu) => (
                <div
                  key={stu.student_id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-lg space-y-4"
                >
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-base font-bold text-white">{stu.full_name}</h3>
                      <p className="text-xs text-blue-400 font-mono mt-0.5">{stu.student_id_number} • {stu.class}</p>
                    </div>

                    <div className="text-xs text-slate-400 space-y-1">
                      <div>Program: <span className="text-slate-300">{stu.programme}</span></div>
                      <div>Telefon: <span className="font-mono text-slate-300">{stu.phone}</span></div>
                      <div>E-mel: <span className="text-slate-300 lowercase">{stu.email}</span></div>
                    </div>

                    {/* Skills */}
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      <span className="text-[10px] font-semibold uppercase text-slate-400 block">Bakat Didaftarkan:</span>
                      <div className="flex flex-wrap gap-1">
                        {stu.skills?.map((sk, idx) => (
                          <span key={idx} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                            {sk.skill_name} ({sk.skill_level})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleViewStudentProfile(stu)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors"
                    >
                      Lihat Sejarah &amp; Profil Penuh
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* -------------------------------------------------------------
          MODAL 1: APPLICATION SCREENING & WORKFLOW DRAWER
         ------------------------------------------------------------- */}
      {activeApp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-indigo-400 block">Audit &amp; Saringan: {activeApp.application_id}</span>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  {activeApp.student?.full_name} — {activeApp.opportunity?.title}
                </h2>
              </div>
              <button
                type="button"
                id="btn-close-screening-modal"
                onClick={() => setActiveApp(null)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 text-xs">
              
              {/* Student Master Profile & Skills Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  1. Profil Master Pelajar
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 block">ID Pelajar:</span>
                    <span className="font-mono text-white font-semibold">{activeApp.student?.student_id_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Program &amp; Sem:</span>
                    <span className="text-white">{activeApp.student?.programme} (Sem {activeApp.student?.semester})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Kelas:</span>
                    <span className="font-mono text-white">{activeApp.student?.class}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">WhatsApp:</span>
                    <span className="font-mono text-white">{activeApp.student?.phone}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-900">
                  <span className="text-slate-500 block mb-1">Portfolio Bakat Pelajar:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeApp.student?.skills?.map((sk, i) => (
                      <span key={i} className="text-[11px] bg-slate-800 text-slate-200 px-2.5 py-0.5 rounded border border-slate-700">
                        {sk.skill_name} <strong className="text-amber-400">({sk.skill_level})</strong> {sk.experience_duration && `• ${sk.experience_duration}`}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Application Responses (Opportunity-specific questions) */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  2. Respons Soalan Khusus Bagi Peluang Ini
                </h3>

                {activeApp.responses && activeApp.responses.length > 0 ? (
                  <div className="space-y-3">
                    {activeApp.responses.map((resp, idx) => {
                      const isUrl = typeof resp.response_value === 'string' && (resp.response_value.startsWith('http://') || resp.response_value.startsWith('https://'));
                      return (
                        <div key={idx} className="border-b border-slate-900 pb-2.5">
                          <span className="text-slate-400 font-medium block">{resp.question_text}</span>
                          {isUrl ? (
                            <a
                              href={resp.response_value as string}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 hover:underline flex items-center space-x-1 mt-1 font-mono break-all"
                            >
                              <Video className="w-3.5 h-3.5 shrink-0" />
                              <span>{resp.response_value as string}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-white font-medium mt-1 block">
                              {resp.response_value === true ? 'Ya (Disahkan)' : resp.response_value === false ? 'Tidak' : String(resp.response_value)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-500">Tiada soalan tambahan.</p>
                )}
              </div>

              {/* Status Workflow Transition Controller */}
              <div className="bg-slate-950 border border-indigo-900/50 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>3. Kemas Kini Status Saringan &amp; Aliran Kerja</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Status Baharu</label>
                    <select
                      id="select-app-status-transition"
                      value={statusUpdateVal}
                      onChange={(e) => setStatusUpdateVal(e.target.value as ApplicationStatus)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-semibold focus:outline-none"
                    >
                      {Object.values(ApplicationStatus).map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">Catatan / Sebab Pertukaran</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="input-status-remarks"
                        value={statusRemarks}
                        onChange={(e) => setStatusRemarks(e.target.value)}
                        placeholder="Contoh: Lulus saringan video, dipanggil ke audisi fizikal..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                      />
                      <button
                        type="button"
                        id="btn-confirm-status-update"
                        onClick={handleUpdateStatus}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shrink-0"
                      >
                        Kemas Kini Status
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Assessment Notes Thread */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  <span>4. Nota Penilaian Sulit Panel Admin</span>
                </h3>

                <div className="space-y-2">
                  {activeApp.notes_list && activeApp.notes_list.length > 0 ? (
                    activeApp.notes_list.map((n, idx) => (
                      <div key={idx} className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <span className="font-semibold text-slate-400">{n.admin_name}</span>
                          <span>{new Date(n.created_at).toLocaleString('ms-MY')}</span>
                        </div>
                        <p className="text-slate-200 text-xs">{n.note}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-xs">Belum ada nota penilaian.</p>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    id="input-admin-note"
                    value={newAdminNote}
                    onChange={(e) => setNewAdminNote(e.target.value)}
                    placeholder="Tambah catatan panel penilai..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    id="btn-save-admin-note"
                    onClick={handleAddNote}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs"
                  >
                    Tambah Nota
                  </button>
                </div>
              </div>

              {/* Audit Trail Status History */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <History className="w-4 h-4 text-slate-400" />
                  <span>5. Jejak Audit Status (Status History)</span>
                </h3>

                <div className="space-y-2 pt-1">
                  {activeApp.status_history?.map((h, i) => (
                    <div key={i} className="flex items-start space-x-2 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                      <div>
                        <span className="font-bold text-white">{h.new_status}</span>
                        {h.remarks && <span className="text-slate-300"> — {h.remarks}</span>}
                        <span className="text-[10px] text-slate-500 block">Oleh {h.changed_by} pada {new Date(h.changed_at).toLocaleString('ms-MY')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="bg-slate-950 border-t border-slate-800 px-6 py-3 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveApp(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 2: CREATE / EDIT OPPORTUNITY
         ------------------------------------------------------------- */}
      {showOppModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white tracking-tight">
                {editingOpp ? 'Kemaskini Peluang' : 'Bina Peluang / Panggilan Terbuka Baharu'}
              </h2>
              <button
                type="button"
                onClick={() => setShowOppModal(false)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOpportunity} className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-200 text-xs">
              
              {oppModalError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{oppModalError}</span>
                </div>
              )}

              {/* Title & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Tajuk Peluang <span className="text-rose-400">*</span></label>
                  <input
                    type="text"
                    id="input-opp-title"
                    value={oppTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Contoh: LEGACY BAND 2026"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Slug Unik (URL Entry Point) <span className="text-rose-400">*</span></label>
                  <input
                    type="text"
                    id="input-opp-slug"
                    value={oppSlug}
                    onChange={(e) => setOppSlug(generateSlug(e.target.value))}
                    placeholder="legacy-band-2026"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">URL awam: /{oppSlug || 'slug'}</span>
                </div>
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Kategori</label>
                  <select
                    id="select-opp-category"
                    value={oppCategory}
                    onChange={(e) => setOppCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    {categories.map(c => (
                      <option key={c.category_id} value={c.category_id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Status</label>
                  <select
                    id="select-opp-status"
                    value={oppStatus}
                    onChange={(e) => setOppStatus(e.target.value as OpportunityStatus)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    {Object.values(OpportunityStatus).map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Tarikh &amp; Masa Tutup</label>
                  <input
                    type="datetime-local"
                    id="input-opp-closing-date"
                    value={oppClosingDate}
                    onChange={(e) => setOppClosingDate(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Open Call Roles & Max Applicants */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Peranan Panggilan Terbuka (Dipisahkan dengan koma)</label>
                  <input
                    type="text"
                    id="input-opp-roles"
                    value={oppRoles}
                    onChange={(e) => setOppRoles(e.target.value)}
                    placeholder="Guitar, Bass, Vocal, Keyboard, Drum"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Kapasiti Maksimum Pemohon</label>
                  <input
                    type="number"
                    id="input-opp-max-applicants"
                    value={oppMaxApplicants}
                    onChange={(e) => setOppMaxApplicants(e.target.value)}
                    placeholder="Cth: 50 (Kosongkan jika tanpa had)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Penerangan &amp; Skop Peluang</label>
                <textarea
                  rows={3}
                  id="textarea-opp-description"
                  value={oppDescription}
                  onChange={(e) => setOppDescription(e.target.value)}
                  placeholder="Terangkan tujuan panggilan terbuka dan maklumat latihan..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              {/* Dynamic Questions Builder */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-300">Soalan Khusus Borang Permohonan</label>
                    <p className="text-[10px] text-slate-400">Borang akan menjana soalan dinamik ini mengikut format SES 4.3.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOppQuestions([
                        ...oppQuestions,
                        { question_text: '', question_type: QuestionType.TEXT, is_required: true, options_str: '', placeholder: '' }
                      ]);
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 bg-indigo-950/40 border border-indigo-800/40 px-2.5 py-1 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Soalan</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {oppQuestions.map((q, qIdx) => (
                    <div key={qIdx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <div className="sm:col-span-7">
                          <input
                            type="text"
                            value={q.question_text}
                            onChange={(e) => {
                              const updated = [...oppQuestions];
                              updated[qIdx].question_text = e.target.value;
                              setOppQuestions(updated);
                            }}
                            placeholder={`Teks Soalan #${qIdx + 1}`}
                            required
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <select
                            value={q.question_type}
                            onChange={(e) => {
                              const updated = [...oppQuestions];
                              updated[qIdx].question_type = e.target.value as QuestionType;
                              setOppQuestions(updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs"
                          >
                            <option value={QuestionType.TEXT}>Teks Pendek</option>
                            <option value={QuestionType.TEXTAREA}>Teks Panjang</option>
                            <option value={QuestionType.SINGLE_SELECT}>Pilihan Tunggal (Radio)</option>
                            <option value={QuestionType.MULTI_SELECT}>Pilihan Pelbagai (Checkbox)</option>
                            <option value={QuestionType.VIDEO_LINK}>Pautan Video Uji Bakat</option>
                            <option value={QuestionType.BOOLEAN}>Pengesahan (Setuju)</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2 flex items-center justify-between">
                          <label className="flex items-center space-x-1 text-[10px] text-slate-300">
                            <input
                              type="checkbox"
                              checked={q.is_required}
                              onChange={(e) => {
                                const updated = [...oppQuestions];
                                updated[qIdx].is_required = e.target.checked;
                                setOppQuestions(updated);
                              }}
                            />
                            <span>Wajib</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setOppQuestions(oppQuestions.filter((_, i) => i !== qIdx))}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {(q.question_type === QuestionType.SINGLE_SELECT || q.question_type === QuestionType.MULTI_SELECT) && (
                        <input
                          type="text"
                          value={q.options_str}
                          onChange={(e) => {
                            const updated = [...oppQuestions];
                            updated[qIdx].options_str = e.target.value;
                            setOppQuestions(updated);
                          }}
                          placeholder="Pilihan jawapan (dipisahkan dengan koma, cth: Lead Guitar, Bass, Vocal)"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-white text-xs"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950 border-t border-slate-800 -mx-6 -mb-6 p-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowOppModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="btn-save-opp-submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30"
                >
                  Simpan Peluang
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 3: DIRECT TALENT INVITATION ("INVITE TO OPPORTUNITY")
         ------------------------------------------------------------- */}
      {inviteStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-semibold uppercase text-amber-400 block">Jemputan Terus Pentadbir</span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Jemput {inviteStudent.full_name}
                </h3>
                <p className="text-xs text-slate-400 font-mono">{inviteStudent.student_id_number} • {inviteStudent.programme}</p>
              </div>
              <button
                type="button"
                onClick={() => setInviteStudent(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteSuccessMsg ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl text-xs flex items-center space-x-2">
                <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{inviteSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-4 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Pilih Peluang Yang Ingin Dijemput</label>
                  <select
                    id="select-invite-opportunity"
                    value={inviteOppId}
                    onChange={(e) => setInviteOppId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="">-- Pilih Peluang --</option>
                    {opportunities.filter(o => o.status === OpportunityStatus.OPEN).map(o => (
                      <option key={o.opportunity_id} value={o.opportunity_id}>{o.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Nota Jemputan Khusus</label>
                  <textarea
                    rows={3}
                    id="textarea-invite-notes"
                    value={inviteNotes}
                    onChange={(e) => setInviteNotes(e.target.value)}
                    placeholder="Contoh: Berdasarkan kemahiran Bass lanjutan anda, kami menjemput anda menyertai audisi formasi Legacy Band 2026..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setInviteStudent(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    id="btn-confirm-send-invite"
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-amber-600/30 flex items-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Hantar Jemputan</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 4: STUDENT MASTER PROFILE & PARTICIPATION HISTORY
         ------------------------------------------------------------- */}
      {selectedStudentProfile && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-5">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-indigo-400 block">{selectedStudentProfile.student_id_number}</span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {selectedStudentProfile.full_name}
                </h3>
                <p className="text-xs text-slate-400">{selectedStudentProfile.programme} (Sem {selectedStudentProfile.semester}) • {selectedStudentProfile.class}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentProfile(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Contact Info */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block">WhatsApp:</span>
                  <span className="font-mono text-white">{selectedStudentProfile.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">E-mel:</span>
                  <span className="text-white lowercase">{selectedStudentProfile.email}</span>
                </div>
              </div>

              {/* Multi-Talent Portfolio */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Portfolio Kemahiran Pelajar:</span>
                <div className="space-y-1.5">
                  {selectedStudentProfile.skills?.map((sk, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <div>
                        <span className="font-semibold text-white">{sk.skill_name}</span>
                        {sk.experience_duration && <span className="text-slate-400 text-[11px]"> • {sk.experience_duration}</span>}
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                        {sk.skill_level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verified College Participation History */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Rekod Penglibatan Kolej Yang Disahkan:</span>
                </span>
                
                {studentHistoryRecords.length > 0 ? (
                  <div className="space-y-1.5">
                    {studentHistoryRecords.map((hist, hIdx) => (
                      <div key={hIdx} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-white">{hist.opportunity_title}</span>
                          <span className="text-slate-400 block text-[11px]">{hist.role_achieved} ({hist.year})</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                          {hist.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500">Tiada rekod penglibatan lampau direkodkan.</p>
                )}
              </div>

            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedStudentProfile(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
