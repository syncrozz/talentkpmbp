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
  Trophy,
  Database,
  Cloud,
  RefreshCw,
  Server,
  ShieldAlert,
  LogIn,
  LogOut,
  Key,
  UserCheck,
  Shield,
  Award,
  HelpCircle
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
  Invitation,
  AdminRole,
  AdminUser
} from '../types.ts';
import { generateSlug, validateSlug } from '../lib/normalization.ts';
import { getFirebaseStatus, syncDataToFirestore, FirebaseStatusInfo } from '../lib/firebaseSync.ts';
import { AdminLogin } from './admin/AdminLogin.tsx';
import { AdminSmartMatching } from './admin/AdminSmartMatching.tsx';
import { AdminAuditTrail } from './admin/AdminAuditTrail.tsx';
import { AdminDataSafety } from './admin/AdminDataSafety.tsx';
import { AdminTalentIntelligence } from './admin/AdminTalentIntelligence.tsx';
import { AdminPilotFeedback } from './admin/AdminPilotFeedback.tsx';
import { AdminTalentProfileModal } from './admin/AdminTalentProfileModal.tsx';
import { SES44Sandbox } from './SES44Sandbox.tsx';
import { calculateOpportunityMatch } from '../lib/matching.ts';

export const AdminPortal: React.FC = () => {
  // Authentication & RBAC State
  const [authToken, setAuthToken] = useState<string | null>(() => sessionStorage.getItem('kpmbp_admin_token'));
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    const saved = sessionStorage.getItem('kpmbp_admin_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });

  const [subView, setSubView] = useState<'dashboard' | 'opportunities' | 'applications' | 'matching' | 'talentSearch' | 'students' | 'talentIntelligence' | 'dataSafety' | 'audit' | 'firebase' | 'pilotFeedback' | 'sandbox'>('dashboard');

  // State collections
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  // Firebase Cloud State
  const [firebaseStatus, setFirebaseStatus] = useState<FirebaseStatusInfo | null>(null);
  const [firebaseSyncing, setFirebaseSyncing] = useState<boolean>(false);
  const [firebaseSyncResult, setFirebaseSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

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

  // Confirmation Delete Modals
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'OPPORTUNITY' | 'APPLICATION' | 'STUDENT';
    id: string;
    name: string;
  } | null>(null);

  // RBAC Helper flags
  const isSuperAdmin = adminUser?.role === AdminRole.SUPER_ADMIN;
  const isAdminOrSuper = adminUser?.role === AdminRole.SUPER_ADMIN || adminUser?.role === AdminRole.ADMIN;
  const isReviewer = adminUser?.role === AdminRole.REVIEWER;

  // Helper: Authenticated Fetch
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...(options.headers || {}),
      'Content-Type': 'application/json',
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
    };
    return fetch(url, { ...options, headers });
  };

  // Verify current auth session with backend on mount
  useEffect(() => {
    if (authToken) {
      authenticatedFetch('/api/admin/me')
        .then(res => {
          if (!res.ok) {
            handleLogout();
          } else {
            return res.json();
          }
        })
        .then(userData => {
          if (userData) {
            setAdminUser(userData);
            sessionStorage.setItem('kpmbp_admin_user', JSON.stringify(userData));
          }
        })
        .catch(() => {
          handleLogout();
        });
    }
  }, [authToken]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [oppRes, appRes, catRes, skRes, anaRes, stuRes, invRes] = await Promise.all([
        authenticatedFetch('/api/opportunities?admin=true'),
        authenticatedFetch('/api/applications'),
        authenticatedFetch('/api/categories'),
        authenticatedFetch('/api/skills'),
        authenticatedFetch('/api/analytics'),
        authenticatedFetch('/api/students/search'),
        authenticatedFetch('/api/invitations'),
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

      setOpportunities(Array.isArray(oppData) ? oppData : []);
      setApplications(Array.isArray(appData) ? appData : []);
      setCategories(Array.isArray(catData) ? catData : []);
      setSkills(Array.isArray(skData) ? skData : []);
      setAnalytics(anaData || null);
      setStudents(Array.isArray(stuData) ? stuData : []);
      setSearchResults(Array.isArray(stuData) ? stuData : []);
      setInvitations(Array.isArray(invData) ? invData : []);

      // Load Firebase Status
      fetchFirebaseStatus();
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFirebaseStatus = async () => {
    try {
      const status = await getFirebaseStatus();
      setFirebaseStatus(status);
    } catch (e) {
      console.warn('Firebase status check:', e);
    }
  };

  const handleTriggerFirebaseSync = async () => {
    try {
      setFirebaseSyncing(true);
      setFirebaseSyncResult(null);

      const result = await syncDataToFirestore({
        categories,
        skills,
        students,
        opportunities,
        applications,
      });

      if (result.success) {
        setFirebaseSyncResult({
          success: true,
          message: `Berjaya menyelaras ${result.syncedCount} rekod ke Firestore Cloud (Project: ${firebaseStatus?.projectId || 'KPMBP'})!`,
        });
        await fetchFirebaseStatus();
      } else {
        setFirebaseSyncResult({
          success: false,
          message: `Ralat penyelarasan: ${result.error}`,
        });
      }
    } catch (err: any) {
      setFirebaseSyncResult({
        success: false,
        message: err?.message || 'Ralat sambungan ke Firestore.',
      });
    } finally {
      setFirebaseSyncing(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      loadData();
    }
  }, [authToken]);

  useEffect(() => {
    const handleRemoteLogout = () => {
      setAuthToken(null);
      setAdminUser(null);
    };
    window.addEventListener('kpmbp_admin_logout', handleRemoteLogout);
    return () => window.removeEventListener('kpmbp_admin_logout', handleRemoteLogout);
  }, []);

  const handleLoginSuccess = (token: string, user: AdminUser) => {
    setAuthToken(token);
    setAdminUser(user);
    setSubView('dashboard');
    window.dispatchEvent(new Event('kpmbp_admin_login'));
  };

  const handleLogout = async () => {
    try {
      if (authToken) {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
      }
    } catch (e) {
      // ignore
    } finally {
      setAuthToken(null);
      setAdminUser(null);
      sessionStorage.removeItem('kpmbp_admin_token');
      sessionStorage.removeItem('kpmbp_admin_user');
      window.dispatchEvent(new Event('kpmbp_admin_logout'));
    }
  };

  // Sync slug on title change when creating new
  const handleTitleChange = (val: string) => {
    setOppTitle(val);
    if (!editingOpp) {
      setOppSlug(generateSlug(val));
    }
  };

  const handleOpenCreateOppModal = () => {
    if (!isAdminOrSuper) {
      setActionError('Peranan anda tidak mempunyai kebenaran untuk membina peluang.');
      setTimeout(() => setActionError(null), 3000);
      return;
    }
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
    if (!isAdminOrSuper) {
      setActionError('Peranan anda tidak mempunyai kebenaran untuk mengemaskini peluang.');
      setTimeout(() => setActionError(null), 3000);
      return;
    }
    setEditingOpp(opp);
    setOppTitle(opp.title);
    setOppSlug(opp.slug);
    setOppCategory(opp.category_id);
    setOppDescription(opp.description);
    setOppRoles(opp.open_call_roles?.join(', ') || '');
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

      const res = await authenticatedFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setOppModalError(data.error || 'Gagal menyimpan peluang.');
        return;
      }

      setShowOppModal(false);
      loadData();
      setActionSuccess(editingOpp ? 'Peluang berjaya dikemaskini.' : 'Peluang baharu berjaya diterbitkan.');
      setTimeout(() => setActionSuccess(null), 3000);
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

      const res = await authenticatedFetch(`/api/students/search?${queryParams.toString()}`);
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  // Handle Application Status Update
  const handleUpdateStatus = async () => {
    if (!activeApp) return;
    try {
      const res = await authenticatedFetch(`/api/applications/${activeApp.application_id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          new_status: statusUpdateVal,
          remarks: statusRemarks.trim(),
          reviewer_name: adminUser?.name || 'Admin Pentadbiran KPMBP',
        }),
      });

      if (res.ok) {
        setStatusRemarks('');
        loadData();
        const updatedRes = await authenticatedFetch('/api/applications');
        const updatedList: Application[] = await updatedRes.json();
        const found = updatedList.find(a => a.application_id === activeApp.application_id);
        if (found) setActiveApp(found);
        setActionSuccess('Status permohonan berjaya dikemaskini.');
        setTimeout(() => setActionSuccess(null), 3000);
      } else {
        const errData = await res.json();
        setActionError(errData.error || 'Gagal mengemaskini status permohonan.');
        setTimeout(() => setActionError(null), 3000);
      }
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  // Handle Add Admin Note
  const handleAddNote = async () => {
    if (!activeApp || !newAdminNote.trim()) return;
    try {
      const res = await authenticatedFetch(`/api/applications/${activeApp.application_id}/notes`, {
        method: 'POST',
        body: JSON.stringify({
          note: newAdminNote.trim(),
          admin_name: adminUser?.name || 'Panel Penilai KPMBP',
        }),
      });

      if (res.ok) {
        setNewAdminNote('');
        loadData();
        const updatedRes = await authenticatedFetch('/api/applications');
        const updatedList: Application[] = await updatedRes.json();
        const found = updatedList.find(a => a.application_id === activeApp.application_id);
        if (found) setActiveApp(found);
        setActionSuccess('Nota penilaian berjaya ditambah.');
        setTimeout(() => setActionSuccess(null), 3000);
      } else {
        const errData = await res.json();
        setActionError(errData.error || 'Gagal menambah nota.');
        setTimeout(() => setActionError(null), 3000);
      }
    } catch (err) {
      console.error('Add note error:', err);
    }
  };

  // Send Direct Invitation
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteStudent || !inviteOppId) return;

    if (!isAdminOrSuper) {
      setActionError('Peranan anda tidak mempunyai kebenaran untuk menghantar jemputan.');
      setTimeout(() => setActionError(null), 3000);
      return;
    }

    try {
      const res = await authenticatedFetch('/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          student_id: inviteStudent.student_id,
          opportunity_id: inviteOppId,
          notes: inviteNotes.trim(),
          admin_name: adminUser?.name || 'Unit Pembangunan Bakat KPMBP',
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
      } else {
        setActionError(data.error || 'Gagal menghantar jemputan.');
        setTimeout(() => setActionError(null), 3000);
      }
    } catch (err) {
      console.error('Invite error:', err);
    }
  };

  // Open Student Profile Details
  const handleViewStudentProfile = async (stu: Student) => {
    setSelectedStudentProfile(stu);
    try {
      const res = await authenticatedFetch(`/api/students/${stu.student_id}/history`);
      const data = await res.json();
      setStudentHistoryRecords(Array.isArray(data) ? data : []);
    } catch (e) {
      setStudentHistoryRecords([]);
    }
  };

  // Execute Confirmed Delete (Super Admin only)
  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) return;
    try {
      let endpoint = '';
      if (deleteConfirmation.type === 'OPPORTUNITY') endpoint = `/api/opportunities/${deleteConfirmation.id}`;
      if (deleteConfirmation.type === 'APPLICATION') endpoint = `/api/applications/${deleteConfirmation.id}`;
      if (deleteConfirmation.type === 'STUDENT') endpoint = `/api/students/${deleteConfirmation.id}`;

      const res = await authenticatedFetch(endpoint, { method: 'DELETE' });
      if (res.ok) {
        if (deleteConfirmation.type === 'APPLICATION' && activeApp?.application_id === deleteConfirmation.id) {
          setActiveApp(null);
        }
        setActionSuccess(`Rekod ${deleteConfirmation.name} telah dipadam secara kekal.`);
        setTimeout(() => setActionSuccess(null), 3000);
        setDeleteConfirmation(null);
        loadData();
      } else {
        const err = await res.json();
        setActionError(err.error || 'Gagal memadam rekod.');
        setTimeout(() => setActionError(null), 3000);
        setDeleteConfirmation(null);
      }
    } catch (err) {
      setActionError('Ralat sambungan pelayan semasa operasi pemadaman.');
      setTimeout(() => setActionError(null), 3000);
      setDeleteConfirmation(null);
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchOpp = selectedOppFilter === 'all' || app.opportunity_id === selectedOppFilter;
    const matchStatus = selectedStatusFilter === 'all' || app.status === selectedStatusFilter;
    return matchOpp && matchStatus;
  });

  // If user is not authenticated, render AdminLogin component
  if (!authToken || !adminUser) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 pb-16">
      
      {/* Admin Top Banner */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Section Header: Title & Unit Badge separated into 2 distinct rows */}
          <div className="w-full flex flex-col gap-2">
            {/* Row 1: Main Console Title */}
            <div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
                KPMBP Student Talent &amp; Screening Console
              </h1>
            </div>

            {/* Row 2: Badge & Department Subtitle */}
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold uppercase tracking-wide">
                Pusat Kawalan Pentadbir
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400 font-medium">
                Unit Hal Ehwal Pelajar &amp; Bakat
              </span>
            </div>
          </div>

          {/* Alert Banners */}
          {actionError && (
            <div className="mt-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-2.5 rounded-xl flex items-center space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
          {actionSuccess && (
            <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-2.5 rounded-xl flex items-center space-x-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Navigation Subtabs */}
          <div className="mt-6 flex flex-wrap items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800 gap-1">
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
              id="admin-subtab-matching"
              onClick={() => setSubView('matching')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                subView === 'matching' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' : 'text-purple-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Padanan Pintar</span>
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

            {/* Talent Intelligence & Gap Analysis Tab */}
            <button
              type="button"
              id="admin-subtab-talent-intelligence"
              onClick={() => setSubView('talentIntelligence')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                subView === 'talentIntelligence' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-indigo-300 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Kecerdasan Bakat</span>
            </button>

            {/* Data Safety Centre Tab (SES 4.4 Engine - Super Admin & Admin only) */}
            {isAdminOrSuper && (
              <button
                type="button"
                id="admin-subtab-data-safety"
                onClick={() => setSubView('dataSafety')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  subView === 'dataSafety' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'text-emerald-300 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Keselamatan Data</span>
              </button>
            )}

            {/* Audit Trail tab (Super Admin & Admin only) */}
            {isAdminOrSuper && (
              <button
                type="button"
                id="admin-subtab-audit"
                onClick={() => setSubView('audit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  subView === 'audit' ? 'bg-blue-600 text-white' : 'text-blue-300 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Jejak Audit</span>
              </button>
            )}

            {/* Pilot Feedback Centre Tab */}
            <button
              type="button"
              id="admin-subtab-pilot-feedback"
              onClick={() => setSubView('pilotFeedback')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                subView === 'pilotFeedback' ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30' : 'text-amber-300 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Maklum Balas Pilot</span>
            </button>

            <button
              type="button"
              id="admin-subtab-firebase"
              onClick={() => setSubView('firebase')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                subView === 'firebase' ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30' : 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Cloud Firestore</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
            </button>

            {/* SES 4.4 Sandbox Subtab */}
            <button
              type="button"
              id="admin-subtab-sandbox"
              onClick={() => setSubView('sandbox')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                subView === 'sandbox' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-white'
              }`}
              title="SES 4.4 Normalization, Matching & Storage Sandbox"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              <span>SES 4.4 Sandbox</span>
            </button>
          </div>

          {/* Bottom Row: Authenticated Admin Status & Logout Bar */}
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 px-4 py-2.5 rounded-xl border border-slate-800 w-full">
            <div className="flex items-center space-x-3">
              <span className={`w-2.5 h-2.5 rounded-full ${
                isSuperAdmin ? 'bg-purple-400' : isReviewer ? 'bg-emerald-400' : 'bg-blue-400'
              }`}></span>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-xs font-bold text-white">{adminUser.name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                  isSuperAdmin ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                  isReviewer ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {adminUser.role}
                </span>
                <span className="text-xs text-slate-400">({adminUser.department})</span>
              </div>
            </div>

            <button
              type="button"
              id="btn-admin-logout"
              onClick={handleLogout}
              className="flex items-center space-x-1.5 px-3 py-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition-colors text-xs font-medium border border-transparent hover:border-slate-700 self-end sm:self-auto"
              title="Log Keluar Pentadbir"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Keluar</span>
            </button>
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
                
                {/* Pilot Opportunity Highlight */}
                <div className="bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Program Perintis Utama SES 4.4</span>
                    </span>
                    <span className="text-xs text-emerald-400 font-mono">STATUS: OPEN</span>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-white">Legacy Band 2026 (Kugiran Rasmi Kolej)</h2>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Panggilan terbuka rasmi bagi uji bakat pemuzik berbakat KPMBP untuk formasi kumpulan muzik kolej. Terbuka kepada semua semester DIA, DBS, DIT, DCIS, dan DCS.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const legacyOpp = opportunities.find(o => o.slug === 'legacy-band-2026');
                        if (legacyOpp) {
                          setSelectedOppFilter(legacyOpp.opportunity_id);
                          setSubView('applications');
                        }
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all flex items-center space-x-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Semak Calon Pemohon ({applications.filter(a => a.opportunity?.slug === 'legacy-band-2026').length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSubView('matching')}
                      className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Jana Padanan Pintar</span>
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
              
              {isAdminOrSuper ? (
                <button
                  type="button"
                  id="btn-create-opportunity-trigger"
                  onClick={handleOpenCreateOppModal}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-md shadow-indigo-600/30 transition-all self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Bina Peluang Baharu</span>
                </button>
              ) : (
                <div className="text-xs text-slate-500 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl">
                  Peranan Reviewer: Mod Lihat Sahaja
                </div>
              )}
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
                    {isAdminOrSuper && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditOppModal(opp)}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Kemaskini</span>
                      </button>
                    )}
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
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmation({
                          type: 'OPPORTUNITY',
                          id: opp.opportunity_id,
                          name: opp.title,
                        })}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs transition-colors"
                        title="Hapus Peluang (Super Admin Sahaja)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
                          <td className="py-3.5 px-4 text-right flex items-center justify-end space-x-2">
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
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmation({
                                  type: 'APPLICATION',
                                  id: app.application_id,
                                  name: `${app.student?.full_name} - ${app.opportunity?.title}`,
                                })}
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs transition-colors"
                                title="Hapus Permohonan (Super Admin Sahaja)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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
            SUBVIEW 4: SMART MATCHING ENGINE ("PADANAN PINTAR")
           ------------------------------------------------------------- */}
        {subView === 'matching' && (
          <AdminSmartMatching
            opportunities={opportunities}
            students={students}
            applications={applications}
            invitations={invitations}
            canInvite={isAdminOrSuper}
            onViewProfile={(student) => handleViewStudentProfile(student)}
            onDirectInvite={(student, oppId) => {
              setInviteStudent(student);
              setInviteOppId(oppId);
              setInviteNotes('');
            }}
          />
        )}

        {/* -------------------------------------------------------------
            SUBVIEW 5: TALENT SEARCH & DIRECT INVITATION ("SEARCH -> MATCH -> INVITE")
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
                    <option value={SkillLevel.BEGINNER}>Beginner</option>
                    <option value={SkillLevel.INTERMEDIATE}>Intermediate</option>
                    <option value={SkillLevel.ADVANCED}>Advanced</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    id="btn-execute-talent-search"
                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-amber-600/30 transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Laksana Carian</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Search Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.length === 0 ? (
                <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
                  Tiada profil pelajar ditemui dengan kriteria carian tersebut.
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
                          <span className="text-xs text-blue-400 font-mono">{stu.student_id_number}</span>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {stu.programme} (Sem {stu.semester})
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Portfolio Bakat:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {stu.skills?.map((sk, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md font-medium"
                            >
                              {sk.skill_name} <span className="text-[10px] text-amber-400 font-bold">({sk.skill_level})</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-xs text-slate-400 space-y-0.5 pt-2 border-t border-slate-800/80">
                        <div>WhatsApp: <strong className="text-slate-200 font-mono">{stu.phone}</strong></div>
                        <div>E-mel: <strong className="text-slate-200 lowercase">{stu.email}</strong></div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewStudentProfile(stu)}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Profil Master</span>
                      </button>

                      {isAdminOrSuper && (
                        <button
                          type="button"
                          id={`btn-invite-student-${stu.student_id}`}
                          onClick={() => {
                            setInviteStudent(stu);
                            setInviteOppId(opportunities[0]?.opportunity_id || '');
                            setInviteNotes('');
                          }}
                          className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-amber-600/30 transition-all flex items-center justify-center space-x-1"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Jemput</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* -------------------------------------------------------------
            SUBVIEW 6: STUDENT DIRECTORY ("ONE STUDENT, ONE MASTER PROFILE")
           ------------------------------------------------------------- */}
        {subView === 'students' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Direktori Master Profil Pelajar KPMBP</h2>
                <p className="text-xs text-slate-400">Prinsip SES 4.4: Satu Pelajar, Satu Master Profil. Rekod ini dikongsi merentasi semua permohonan.</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Nama Pelajar</th>
                      <th className="py-3.5 px-4">ID Pelajar</th>
                      <th className="py-3.5 px-4">Program &amp; Kelas</th>
                      <th className="py-3.5 px-4">Portfolio Bakat</th>
                      <th className="py-3.5 px-4">Hubungan</th>
                      <th className="py-3.5 px-4 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {students.map((stu) => (
                      <tr key={stu.student_id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white">
                          {stu.full_name}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-blue-400">
                          {stu.student_id_number}
                        </td>
                        <td className="py-3.5 px-4">
                          {stu.programme} (Sem {stu.semester}) • {stu.class}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {stu.skills?.map((sk, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded text-[10px] border border-slate-700">
                                {sk.skill_name} ({sk.skill_level})
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                          {stu.phone}
                        </td>
                        <td className="py-3.5 px-4 text-right flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => handleViewStudentProfile(stu)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                          >
                            Lihat Profil
                          </button>
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmation({
                                type: 'STUDENT',
                                id: stu.student_id,
                                name: `${stu.full_name} (${stu.student_id_number})`,
                              })}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs transition-colors"
                              title="Hapus Pelajar (Super Admin Sahaja)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* -------------------------------------------------------------
            SUBVIEW 7: AUDIT TRAIL (Super Admin & Admin Only)
           ------------------------------------------------------------- */}
        {subView === 'audit' && isAdminOrSuper && (
          <AdminAuditTrail authToken={authToken} />
        )}

        {/* -------------------------------------------------------------
            SUBVIEW 8: CLOUD FIRESTORE INTEGRATION
           ------------------------------------------------------------- */}
        {subView === 'firebase' && (
          <div className="space-y-6 max-w-4xl">
            
            {/* Header Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
                    <span>Google Cloud Firestore Data Layer</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono">
                      ONLINE &amp; PROVISIONED
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Penyelarasan persistent cloud storage berasaskan standard SES 4.4 untuk data production.
                  </p>
                </div>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Firebase Project ID</span>
                  <p className="text-xs font-mono font-bold text-amber-400 truncate">
                    {firebaseStatus?.projectId || 'ai-studio-talentkpmbp-8e265986'}
                  </p>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Cloud Region</span>
                  <p className="text-xs font-mono font-bold text-white">
                    {firebaseStatus?.region || 'asia-southeast1'}
                  </p>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Status Penyambungan</span>
                  <p className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Aktif &amp; Boleh Capai</span>
                  </p>
                </div>
              </div>

              {/* Sync Trigger Action */}
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Manual Data Synchronization</h4>
                  <p className="text-[11px] text-slate-400">Muat naik &amp; selaraskan rekod pelajar, peluang, permohonan ke Firestore.</p>
                </div>

                <button
                  type="button"
                  id="btn-trigger-firestore-sync"
                  onClick={handleTriggerFirebaseSync}
                  disabled={firebaseSyncing}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center space-x-2"
                >
                  <RefreshCw className={`w-4 h-4 ${firebaseSyncing ? 'animate-spin' : ''}`} />
                  <span>{firebaseSyncing ? 'Menyelaras ke Cloud...' : 'Selaraskan ke Cloud Firestore'}</span>
                </button>
              </div>

              {firebaseSyncResult && (
                <div className={`p-4 rounded-xl text-xs flex items-start space-x-2 ${
                  firebaseSyncResult.success ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}>
                  {firebaseSyncResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span>{firebaseSyncResult.message}</span>
                </div>
              )}
            </div>

          </div>
        )}

        {/* -------------------------------------------------------------
            SUBVIEW 9: TALENT INTELLIGENCE & GAP ANALYSIS
           ------------------------------------------------------------- */}
        {subView === 'talentIntelligence' && (
          <AdminTalentIntelligence
            authToken={authToken}
            adminUser={adminUser}
            opportunities={opportunities}
            onSelectStudent={(stuId) => {
              const stu = students.find(s => s.student_id === stuId || s.student_id_number === stuId);
              if (stu) handleViewStudentProfile(stu);
            }}
          />
        )}

        {/* -------------------------------------------------------------
            SUBVIEW 10: DATA SAFETY CENTRE (SES 4.4 ENGINE)
           ------------------------------------------------------------- */}
        {subView === 'dataSafety' && isAdminOrSuper && (
          <AdminDataSafety
            authToken={authToken}
            adminUser={adminUser}
            onDataChanged={() => loadData()}
          />
        )}

        {/* -------------------------------------------------------------
            SUBVIEW 11: PILOT FEEDBACK CENTRE (SES 4.4 OBSERVABILITY)
           ------------------------------------------------------------- */}
        {subView === 'pilotFeedback' && (
          <AdminPilotFeedback
            authToken={authToken}
            adminUser={adminUser}
          />
        )}

        {/* -------------------------------------------------------------
            SUBVIEW 12: SES 4.4 SANDBOX (NORMALIZATION, MATCHING & SIMULATOR)
           ------------------------------------------------------------- */}
        {subView === 'sandbox' && (
          <SES44Sandbox />
        )}

      </div>

      {/* -------------------------------------------------------------
          MODAL 1: SCREENING & AUDIT DRAWER (APPLICATION DETAILS)
         ------------------------------------------------------------- */}
      {activeApp && (() => {
        const matchResult = (activeApp.opportunity && activeApp.student)
          ? calculateOpportunityMatch(activeApp.opportunity, activeApp.student)
          : null;

        return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{activeApp.application_id}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    STATUS: {activeApp.status}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight mt-1">
                  Saringan Permohonan: {activeApp.student?.full_name}
                </h2>
                <p className="text-xs text-slate-400">
                  Peluang: <span className="text-slate-200 font-semibold">{activeApp.opportunity?.title}</span> ({activeApp.opportunity?.category_name})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveApp(null)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* 1. STUDENT & TALENT PILLAR */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1.1 Student Identity */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center space-x-2 border-b border-slate-850 pb-2">
                    <UserCheck className="w-4 h-4 text-blue-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">1. Maklumat Pelajar</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Nama Penuh:</span>
                      <span className="font-bold text-white text-xs">{activeApp.student?.full_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">ID Pelajar (Matrix):</span>
                      <span className="font-mono text-blue-400 font-bold">{activeApp.student?.student_id_number}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Program &amp; Semester:</span>
                      <span className="text-slate-300">{activeApp.student?.programme} (Sem {activeApp.student?.semester})</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Kelas / Jantina:</span>
                      <span className="text-slate-300">{activeApp.student?.class} • {activeApp.student?.gender}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">No. WhatsApp / Tel:</span>
                      <span className="font-mono text-slate-200">{activeApp.student?.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Emel Pelajar:</span>
                      <span className="font-mono text-slate-300 truncate block">{activeApp.student?.email}</span>
                    </div>
                  </div>
                </div>

                {/* 1.2 Talent Portfolio */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center space-x-2 border-b border-slate-850 pb-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">2. Portfolio Kemahiran Bakat</h3>
                  </div>
                  <div className="space-y-1.5">
                    {activeApp.student?.skills && activeApp.student.skills.length > 0 ? (
                      activeApp.student.skills.map((sk, skIdx) => (
                        <div key={skIdx} className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
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
                            sk.skill_level === SkillLevel.ADVANCED ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            sk.skill_level === SkillLevel.INTERMEDIATE ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {sk.skill_level}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 text-xs">Tiada rekod kemahiran berdaftar.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. MATCHING & FIT EXPLAINABILITY (SES 4.4 DETERMINISTIC ENGINE) */}
              {matchResult && (
                <div className="bg-slate-950 p-4 rounded-xl border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-purple-200">
                        3. Enjin Padanan Pintar &amp; Analisis Kelayakan (SES 4.4 Engine)
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-base font-extrabold font-mono text-purple-300">{matchResult.score}%</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        matchResult.tier === 'EXCELLENT' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        matchResult.tier === 'STRONG' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                        matchResult.tier === 'MODERATE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {matchResult.tier} TIER
                      </span>
                    </div>
                  </div>

                  {/* Matched, Partial, Missing Badges */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center space-x-1 uppercase">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Syarat Dipenuhi ({matchResult.matched_items?.length || 0}):</span>
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {matchResult.matched_items && matchResult.matched_items.length > 0 ? (
                          matchResult.matched_items.map((item, mIdx) => (
                            <span key={mIdx} className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded text-[10px]">
                              ✓ {item}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-500">Tiada padanan terus</span>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-amber-400 flex items-center space-x-1 uppercase">
                        <AlertCircle className="w-3 h-3 text-amber-400" />
                        <span>Padanan Separa ({matchResult.partial_items?.length || 0}):</span>
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {matchResult.partial_items && matchResult.partial_items.length > 0 ? (
                          matchResult.partial_items.map((item, pIdx) => (
                            <span key={pIdx} className="px-1.5 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded text-[10px]">
                              △ {item}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-500">Tiada padanan separa</span>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-rose-400 flex items-center space-x-1 uppercase">
                        <span className="w-3 h-3 text-rose-400 font-bold inline-flex items-center justify-center">✕</span>
                        <span>Syarat Belum Dipenuhi ({matchResult.missing_items?.length || 0}):</span>
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {matchResult.missing_items && matchResult.missing_items.length > 0 ? (
                          matchResult.missing_items.map((item, xIdx) => (
                            <span key={xIdx} className="px-1.5 py-0.5 bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded text-[10px]">
                              ✕ {item}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-medium">Semua syarat dipenuhi</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Justification Reasons */}
                  <div className="pt-1 text-[11px] text-slate-300">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Justifikasi Skor:</span>
                    <ul className="space-y-1">
                      {matchResult.reasons.map((r, rIdx) => (
                        <li key={rIdx} className="flex items-start space-x-1.5">
                          <span className="text-purple-400 font-bold">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* 3. OPPORTUNITY REQUIREMENTS & SUBMITTED RESPONSES */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 border-b border-slate-850 pb-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    4. Jawapan Borang Permohonan Pelajar
                  </h3>
                </div>
                
                {activeApp.responses && activeApp.responses.length > 0 ? (
                  <div className="space-y-3">
                    {activeApp.responses.map((resp, rIdx) => {
                      const qObj = activeApp.opportunity?.questions?.find(q => q.question_id === resp.question_id);
                      return (
                        <div key={rIdx} className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1">
                          <label className="text-[11px] font-semibold text-slate-400 block">
                            {qObj?.question_text || `Soalan #${rIdx + 1}`}
                          </label>
                          
                          {/* Check if video URL */}
                          {resp.response_value && (resp.response_value.startsWith('http://') || resp.response_value.startsWith('https://')) ? (
                            <a
                              href={resp.response_value}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 hover:underline flex items-center space-x-1 font-mono break-all mt-1"
                            >
                              <Video className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                              <span>{resp.response_value}</span>
                              <ExternalLink className="w-3 h-3 ml-1 shrink-0" />
                            </a>
                          ) : (
                            <p className="text-white font-medium text-xs leading-relaxed">
                              {resp.response_value || 'Tiada jawapan'}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs">Tiada soalan khusus / jawapan tambahan bagi peluang ini.</p>
                )}
              </div>

              {/* 4. STATUS UPDATE CONTROL & WORKFLOW PROGRESSION */}
              <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30 space-y-3">
                <div className="flex items-center space-x-2 border-b border-slate-850 pb-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    5. Tindakan Saringan &amp; Aliran Status (Action Workflow)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Status Saringan Baharu</label>
                    <select
                      id="select-update-app-status"
                      value={statusUpdateVal}
                      onChange={(e) => setStatusUpdateVal(e.target.value as ApplicationStatus)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                    >
                      {Object.values(ApplicationStatus).map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Catatan Status (Audit Trail &amp; Pemakluman Pelajar)</label>
                    <input
                      type="text"
                      id="input-update-app-remarks"
                      value={statusRemarks}
                      onChange={(e) => setStatusRemarks(e.target.value)}
                      placeholder="Contoh: Lulus saringan video, dijemput sesi audisi bilik 2..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    id="btn-confirm-status-update"
                    onClick={handleUpdateStatus}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition-all flex items-center space-x-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan &amp; Sahkan Status Saringan</span>
                  </button>
                </div>
              </div>

              {/* 5. PRIVATE ADMIN / PANEL NOTES */}
              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center space-x-2 border-b border-slate-850 pb-2">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    6. Catatan Panel Penilai (Sulit / Dalaman Pentadbir Sahaja)
                  </h3>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    id="input-new-admin-note"
                    value={newAdminNote}
                    onChange={(e) => setNewAdminNote(e.target.value)}
                    placeholder="Tambah catatan panel penilai (cth: Perlu uji lagu tempo tinggi)..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    id="btn-add-admin-note"
                    onClick={handleAddNote}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
                  >
                    Tambah Nota
                  </button>
                </div>

                <div className="space-y-2 pt-1">
                  {activeApp.notes_list && activeApp.notes_list.length > 0 ? (
                    activeApp.notes_list.map((note) => (
                      <div key={note.note_id} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex justify-between items-start">
                        <div>
                          <p className="text-slate-200 text-xs">{note.note}</p>
                          <span className="text-[10px] text-slate-500 block mt-1 font-mono">
                            {note.admin_name} • {new Date(note.created_at).toLocaleString('ms-MY')}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-xs">Tiada nota penilaian direkodkan.</p>
                  )}
                </div>
              </div>

              {/* 6. STATUS AUDIT TRAIL LOG */}
              <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center space-x-2 border-b border-slate-850 pb-2">
                  <History className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Jejak Sejarah Audit Status
                  </h3>
                </div>

                <div className="space-y-2 pt-1">
                  {activeApp.status_history?.map((hist) => (
                    <div key={hist.history_id} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-semibold text-indigo-400">{hist.new_status}</span>
                        {hist.remarks && <p className="text-slate-300 text-[11px] mt-0.5">{hist.remarks}</p>}
                      </div>
                      <div className="text-right font-mono text-[10px] text-slate-500">
                        <span>{hist.changed_by}</span>
                        <span className="block">{new Date(hist.changed_at).toLocaleDateString('ms-MY')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="bg-slate-900 border-t border-slate-800 p-4 flex justify-between items-center">
              <div>
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmation({
                        type: 'APPLICATION',
                        id: activeApp.application_id,
                        name: `${activeApp.student?.full_name} - ${activeApp.opportunity?.title}`,
                      });
                    }}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center space-x-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Permohonan (Super Admin)</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveApp(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
        );
      })()}

      {/* -------------------------------------------------------------
          MODAL 2: CREATE / EDIT OPPORTUNITY
         ------------------------------------------------------------- */}
      {showOppModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">
                {editingOpp ? 'Kemaskini Panggilan Terbuka' : 'Bina Panggilan Terbuka Baharu'}
              </h3>
              <button
                type="button"
                onClick={() => setShowOppModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {oppModalError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{oppModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveOpportunity} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Tajuk Peluang</label>
                <input
                  type="text"
                  id="input-opp-title"
                  value={oppTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Contoh: Legacy Band 2026 Uji Bakat"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Slug URL</label>
                  <input
                    type="text"
                    id="input-opp-slug"
                    value={oppSlug}
                    onChange={(e) => setOppSlug(e.target.value)}
                    placeholder="legacy-band-2026"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-indigo-300 font-mono focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Kategori</label>
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
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Penerangan &amp; Syarat</label>
                <textarea
                  id="input-opp-desc"
                  value={oppDescription}
                  onChange={(e) => setOppDescription(e.target.value)}
                  rows={3}
                  placeholder="Terangkan syarat kelayakan, objektif, dan jadual uji bakat..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Peranan Dicari (Pisahkan koma)</label>
                  <input
                    type="text"
                    id="input-opp-roles"
                    value={oppRoles}
                    onChange={(e) => setOppRoles(e.target.value)}
                    placeholder="Guitar, Bass, Vocal, Drum, Emcee"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Tarikh &amp; Masa Tutup</label>
                  <input
                    type="datetime-local"
                    id="input-opp-closing-date"
                    value={oppClosingDate}
                    onChange={(e) => setOppClosingDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Dynamic Questions Builder (SES 4.4 Standard) */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-300">Soalan Khusus Borang Permohonan</label>
                    <p className="text-[10px] text-slate-400">Borang akan menjana soalan dinamik ini mengikut format SES 4.4.</p>
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

                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {oppQuestions.map((q, idx) => (
                    <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={q.question_text}
                          onChange={(e) => {
                            const copy = [...oppQuestions];
                            copy[idx].question_text = e.target.value;
                            setOppQuestions(copy);
                          }}
                          placeholder={`Soalan #${idx + 1}...`}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          required
                        />
                        <select
                          value={q.question_type}
                          onChange={(e) => {
                            const copy = [...oppQuestions];
                            copy[idx].question_type = e.target.value as QuestionType;
                            setOppQuestions(copy);
                          }}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                        >
                          <option value={QuestionType.TEXT}>Teks Pendek</option>
                          <option value={QuestionType.TEXTAREA}>Teks Panjang</option>
                          <option value={QuestionType.SINGLE_SELECT}>Pilihan Tunggal</option>
                          <option value={QuestionType.VIDEO_LINK}>Pautan Video / Audisi</option>
                          <option value={QuestionType.URL}>Pautan URL</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setOppQuestions(oppQuestions.filter((_, i) => i !== idx));
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {q.question_type === QuestionType.SINGLE_SELECT && (
                        <input
                          type="text"
                          value={q.options_str}
                          onChange={(e) => {
                            const copy = [...oppQuestions];
                            copy[idx].options_str = e.target.value;
                            setOppQuestions(copy);
                          }}
                          placeholder="Pilihan jawapan dipisah koma (cth: Guitar, Bass, Drum, Vocal)"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-[11px] text-slate-300"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowOppModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="btn-save-opportunity-submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30"
                >
                  {editingOpp ? 'Simpan Perubahan' : 'Terbitkan Peluang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 3: DIRECT INVITATION MODAL ("INVITE CANDIDATE")
         ------------------------------------------------------------- */}
      {inviteStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Send className="w-4 h-4 text-amber-400" />
                <span>Hantar Jemputan Terus Ke Peluang</span>
              </h3>
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
                <CheckCircle2 className="w-4 h-4" />
                <span>{inviteSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-4 text-xs">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Calon Pelajar</span>
                  <p className="font-bold text-white text-sm">{inviteStudent.full_name}</p>
                  <p className="text-slate-400 font-mono">{inviteStudent.student_id_number} • {inviteStudent.programme} (Sem {inviteStudent.semester})</p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Pilih Peluang</label>
                  <select
                    id="select-invite-opportunity"
                    value={inviteOppId}
                    onChange={(e) => setInviteOppId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                    required
                  >
                    {opportunities.map(opp => (
                      <option key={opp.opportunity_id} value={opp.opportunity_id}>
                        {opp.title} ({opp.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-300 block mb-1">Mesej / Catatan Jemputan</label>
                  <textarea
                    id="input-invite-notes"
                    rows={3}
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
          MODAL 4: STUDENT MASTER PROFILE & PARTICIPATION HISTORY (SES 4.4)
         ------------------------------------------------------------- */}
      {selectedStudentProfile && (
        <AdminTalentProfileModal
          studentId={selectedStudentProfile.student_id}
          authToken={authToken}
          opportunities={opportunities}
          onClose={() => setSelectedStudentProfile(null)}
          onSendInvite={(stu, oppId) => {
            setInviteStudent(stu);
            setInviteOppId(oppId);
            setSelectedStudentProfile(null);
          }}
        />
      )}

      {/* -------------------------------------------------------------
          MODAL 5: DELETE CONFIRMATION DIALOG (SUPER ADMIN ONLY)
         ------------------------------------------------------------- */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/20 rounded-xl border border-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Sahkan Pemadaman Kekal</h3>
                <span className="text-[10px] text-rose-300 font-mono uppercase">SES 4.4 Atomic Deletion</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Adakah anda pasti ingin memadamkan <strong className="text-white">{deleteConfirmation.name}</strong>? Tindakan ini adalah kekal dan tidak boleh dikembalikan.
            </p>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-delete-action"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/30"
              >
                Padam Rekod Ini
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
