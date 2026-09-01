import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageSquare, 
  Filter, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  Sparkles, 
  Star, 
  HelpCircle, 
  Clock, 
  User, 
  Download, 
  RefreshCw, 
  Send,
  Check,
  ChevronDown
} from 'lucide-react';
import { PilotFeedback, FeedbackRole, FeedbackType, AdminUser } from '../../types.ts';

interface AdminPilotFeedbackProps {
  authToken: string;
  adminUser: AdminUser;
}

export const AdminPilotFeedback: React.FC<AdminPilotFeedbackProps> = ({ authToken, adminUser }) => {
  const [feedbacks, setFeedbacks] = useState<PilotFeedback[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<PilotFeedback | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchFeedbacks = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter !== 'ALL') params.append('role', roleFilter);
      if (typeFilter !== 'ALL') params.append('feedback_type', typeFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/admin/feedbacks?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbacks(data.feedbacks || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Error loading feedbacks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [roleFilter, typeFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFeedbacks();
  };

  const handleUpdateStatus = async (feedbackId: string, newStatus: 'NEW' | 'REVIEWED' | 'RESOLVED', adminResp?: string) => {
    setIsUpdating(true);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/admin/feedbacks/${feedbackId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          status: newStatus,
          admin_response: adminResp !== undefined ? adminResp : selectedFeedback?.admin_response,
        }),
      });
      const updated = await res.json();
      if (res.ok) {
        setFeedbacks(prev => prev.map(f => f.feedback_id === feedbackId ? updated : f));
        if (selectedFeedback && selectedFeedback.feedback_id === feedbackId) {
          setSelectedFeedback(updated);
        }
        setActionSuccess(`Status maklum balas dikemas kini kepada [${newStatus}].`);
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Failed to update feedback:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExportCSV = () => {
    window.location.href = `/api/admin/data-safety/export-csv?type=feedbacks`;
  };

  const getTypeBadge = (type: FeedbackType) => {
    switch (type) {
      case 'BUG':
        return <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20"><ShieldAlert className="w-3 h-3" /><span>Pepijat</span></span>;
      case 'USABILITY':
        return <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><Sparkles className="w-3 h-3" /><span>Kebolehgunaan</span></span>;
      case 'WORKFLOW_ISSUE':
        return <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20"><HelpCircle className="w-3 h-3" /><span>Aliran Kerja</span></span>;
      case 'DATA_ISSUE':
        return <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20"><AlertCircle className="w-3 h-3" /><span>Isu Data</span></span>;
      case 'CONTENT_ISSUE':
        return <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"><MessageSquare className="w-3 h-3" /><span>Kandungan</span></span>;
      case 'ENHANCEMENT':
        return <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><Star className="w-3 h-3" /><span>Penambahbaikan</span></span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">{type}</span>;
    }
  };

  const getRoleBadge = (role: FeedbackRole) => {
    switch (role) {
      case 'STUDENT':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-950 text-blue-300 border border-blue-800">PELAJAR</span>;
      case 'ADMIN':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">PENTADBIR</span>;
      case 'REVIEWER':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-800">PENILAI</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300">{role}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1"><CheckCircle2 className="w-3 h-3" /><span>SELESAI</span></span>;
      case 'REVIEWED':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center space-x-1"><Clock className="w-3 h-3" /><span>DISEMAK</span></span>;
      case 'NEW':
      default:
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center space-x-1"><AlertCircle className="w-3 h-3" /><span>BARU</span></span>;
    }
  };

  return (
    <div className="space-y-6 text-slate-100 animate-fadeIn">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Pusat Maklum Balas Pilot</h2>
              <p className="text-xs text-slate-400">Pemerhatian Operasi & Kawalan Kualiti KPMBP Talent (SES 4.4)</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={fetchFeedbacks}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Muat Semula</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold border border-emerald-500/40 transition flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Eksport CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-center">
            <div className="text-xs text-slate-400 font-medium mb-1">Jumlah Maklum Balas</div>
            <div className="text-2xl font-black text-white">{summary.total}</div>
          </div>
          <div className="bg-slate-900 border border-rose-950/50 rounded-xl p-3.5 text-center">
            <div className="text-xs text-rose-400 font-medium mb-1">Pepijat (Bugs)</div>
            <div className="text-2xl font-black text-rose-400">{summary.bugCount}</div>
          </div>
          <div className="bg-slate-900 border border-amber-950/50 rounded-xl p-3.5 text-center">
            <div className="text-xs text-amber-400 font-medium mb-1">Kebolehgunaan</div>
            <div className="text-2xl font-black text-amber-400">{summary.usabilityCount}</div>
          </div>
          <div className="bg-slate-900 border border-blue-950/50 rounded-xl p-3.5 text-center">
            <div className="text-xs text-blue-400 font-medium mb-1">Dari Pelajar</div>
            <div className="text-2xl font-black text-blue-400">{summary.studentCount}</div>
          </div>
          <div className="bg-slate-900 border border-emerald-950/50 rounded-xl p-3.5 text-center">
            <div className="text-xs text-emerald-400 font-medium mb-1">Dari Pentadbir/Penilai</div>
            <div className="text-2xl font-black text-emerald-400">{summary.adminCount + summary.reviewerCount}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-center">
            <div className="text-xs text-slate-400 font-medium mb-1">Kadar Selesai</div>
            <div className="text-2xl font-black text-emerald-400">{summary.resolutionRatePercent}%</div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari tajuk, huraian, atau nama..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Semua Peranan</option>
            <option value="STUDENT">Pelajar</option>
            <option value="ADMIN">Pentadbir</option>
            <option value="REVIEWER">Penilai</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="BUG">Pepijat (Bug)</option>
            <option value="USABILITY">Kebolehgunaan</option>
            <option value="WORKFLOW_ISSUE">Aliran Kerja</option>
            <option value="DATA_ISSUE">Isu Data</option>
            <option value="CONTENT_ISSUE">Kandungan</option>
            <option value="ENHANCEMENT">Penambahbaikan</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="NEW">Baru</option>
            <option value="REVIEWED">Disemak</option>
            <option value="RESOLVED">Selesai</option>
          </select>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Feedback List & Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List Column */}
        <div className="lg:col-span-2 space-y-3">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
              <span>Memuat maklum balas pilot...</span>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
              <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-300">Tiada Maklum Balas Ditemui</div>
              <p className="text-xs text-slate-500 mt-1">Belum ada maklum balas yang sepadan dengan tapisan semasa.</p>
            </div>
          ) : (
            feedbacks.map(f => {
              const isSelected = selectedFeedback?.feedback_id === f.feedback_id;
              return (
                <div
                  key={f.feedback_id}
                  onClick={() => {
                    setSelectedFeedback(f);
                    setResponseText(f.admin_response || '');
                  }}
                  className={`p-4 rounded-2xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-850 border-amber-500/50 shadow-lg shadow-amber-500/5'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {getTypeBadge(f.feedback_type)}
                      {getRoleBadge(f.role)}
                      {f.page_context && (
                        <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          {f.page_context}
                        </span>
                      )}
                    </div>
                    {getStatusBadge(f.status)}
                  </div>

                  <h3 className="font-bold text-sm text-white mb-1">{f.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">{f.description}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-300 font-medium">{f.user_name}</span>
                      <span className="text-slate-500">({f.user_identifier})</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {f.rating && (
                        <span className="text-amber-400 font-bold flex items-center">
                          <Star className="w-3 h-3 fill-amber-400 mr-0.5" />
                          {f.rating}/5
                        </span>
                      )}
                      <span>{new Date(f.created_at).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Feedback Details Sidebar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl h-fit sticky top-6">
          {selectedFeedback ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Perincian Maklum Balas</div>
                {getStatusBadge(selectedFeedback.status)}
              </div>

              <div>
                <div className="flex items-center space-x-2 mb-1.5">
                  {getTypeBadge(selectedFeedback.feedback_type)}
                  {getRoleBadge(selectedFeedback.role)}
                </div>
                <h4 className="text-base font-bold text-white mb-2">{selectedFeedback.title}</h4>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedFeedback.description}
                </div>
              </div>

              {/* User Metadata */}
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Penghantar:</span>
                  <span className="font-semibold text-white">{selectedFeedback.user_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pengenal:</span>
                  <span className="text-slate-300">{selectedFeedback.user_identifier}</span>
                </div>
                {selectedFeedback.page_context && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Konteks Skrin:</span>
                    <span className="text-slate-300">{selectedFeedback.page_context}</span>
                  </div>
                )}
                {selectedFeedback.rating && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Penilaian:</span>
                    <span className="text-amber-400 font-bold">{selectedFeedback.rating} / 5 Bintang</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Masa Diterima:</span>
                  <span className="text-slate-300">{new Date(selectedFeedback.created_at).toLocaleString('ms-MY')}</span>
                </div>
              </div>

              {/* Admin Action & Response Note */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Nota Tindakan Pentadbir
                </label>
                <textarea
                  value={responseText}
                  onChange={e => setResponseText(e.target.value)}
                  placeholder="Catatkan resolusi atau tindakan yang telah diambil..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                />

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleUpdateStatus(selectedFeedback.feedback_id, 'RESOLVED', responseText)}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Tandakan Selesai (RESOLVED)</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus(selectedFeedback.feedback_id, 'REVIEWED', responseText)}
                      className="py-1.5 px-3 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-semibold transition text-center disabled:opacity-50"
                    >
                      Tandakan Disemak
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus(selectedFeedback.feedback_id, 'NEW', responseText)}
                      className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition text-center disabled:opacity-50"
                    >
                      Set Semula (NEW)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">
              <MessageSquare className="w-6 h-6 mx-auto mb-2 text-slate-600" />
              <div className="text-xs font-semibold text-slate-400">Pilih Maklum Balas</div>
              <p className="text-[11px] text-slate-500 mt-1">Klik mana-mana item di sebelah kiri untuk melihat perincian dan mengambil tindakan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
