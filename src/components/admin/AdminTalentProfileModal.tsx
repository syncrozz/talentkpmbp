import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Award,
  Sparkles,
  Phone,
  Mail,
  GraduationCap,
  Calendar,
  Layers,
  Send,
  CheckCircle2,
  Clock,
  Briefcase,
  TrendingUp,
  FileText,
  AlertCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import {
  Student,
  Opportunity,
  ApplicationStatus,
  SkillLevel
} from '../../types.ts';

interface AdminTalentProfileModalProps {
  studentId: string;
  authToken: string | null;
  onClose: () => void;
  onSendInvite?: (student: Student, opportunityId: string) => void;
  opportunities?: Opportunity[];
}

export const AdminTalentProfileModal: React.FC<AdminTalentProfileModalProps> = ({
  studentId,
  authToken,
  onClose,
  onSendInvite,
  opportunities = []
}) => {
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'skills' | 'applications' | 'participation' | 'matches'>('skills');

  // Direct Invite inside modal
  const [selectedOppForInvite, setSelectedOppForInvite] = useState<string>('');
  const [inviteNotes, setInviteNotes] = useState<string>('');
  const [inviting, setInviting] = useState<boolean>(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const authHeader = authToken ? { Authorization: `Bearer ${authToken}` } : {};

  useEffect(() => {
    fetchProfile();
  }, [studentId]);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/students/${studentId}/full-profile`, {
        headers: { ...authHeader },
      });
      if (!res.ok) throw new Error('Gagal memuat profil penuh pelajar.');
      const data = await res.json();
      setProfileData(data);
    } catch (err: any) {
      setError(err.message || 'Ralat memuat profil.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOppForInvite) return;
    setInviting(true);
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify({
          student_id: profileData.student.student_id,
          opportunity_id: selectedOppForInvite,
          notes: inviteNotes || 'Jemputan terus dari profil pentadbir.',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghantar jemputan.');
      setInviteSuccess('Jemputan rasmi berjaya dihantar kepada pelajar!');
      setInviteNotes('');
      fetchProfile();
    } catch (err: any) {
      alert(err.message || 'Ralat menghantar jemputan.');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150">
        
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-xl font-extrabold text-white flex-shrink-0">
              {profileData?.student?.full_name?.charAt(0) || 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                  {profileData?.student?.student_id_number || studentId}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {profileData?.student?.status || 'ACTIVE'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">{profileData?.student?.full_name || 'Memuat Profil...'}</h2>
              <div className="flex items-center gap-3 text-xs text-slate-300 mt-1 flex-wrap">
                <span>{profileData?.student?.programme}</span>
                <span>•</span>
                <span>Semester {profileData?.student?.semester} ({profileData?.student?.class})</span>
                <span>•</span>
                <span>{profileData?.student?.gender}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Memuatkan maklumat profil bakat pelajar...
          </div>
        ) : error || !profileData ? (
          <div className="p-8 text-center text-rose-600 text-sm">{error || 'Data profil tidak wujud.'}</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Quick Contact Bar & Talent Reuse Alerts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>Telefon: <strong>{profileData.student.phone}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>E-mel: <strong>{profileData.student.email}</strong></span>
                </div>
              </div>

              {/* Talent Reuse Badges */}
              <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 text-xs text-indigo-900 flex flex-col justify-center">
                <div className="font-bold flex items-center gap-1.5 text-indigo-950">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Sejarah Penggunaan Bakat Terbukti:
                </div>
                {profileData.talentReuseBadges?.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {profileData.talentReuseBadges.map((badge: any, idx: number) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-white text-indigo-800 border border-indigo-200 text-[11px] font-semibold">
                        {badge.activity_name} ({badge.role}) - {badge.year}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500 mt-0.5 text-[11px]">Belum mempunyai rekod penglibatan lepas yang disahkan.</span>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-slate-200 flex gap-4 text-xs font-bold">
              <button
                onClick={() => setActiveTab('skills')}
                className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'skills'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                Kemahiran & Bakat ({profileData.student.skills?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('applications')}
                className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'applications'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Sejarah Permohonan ({profileData.applications?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('participation')}
                className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'participation'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Rekod Penglibatan ({profileData.participations?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('matches')}
                className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'matches'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Padanan Peluang Semasa ({profileData.opportunityMatches?.length || 0})
              </button>
            </div>

            {/* TAB 1: SKILLS */}
            {activeTab === 'skills' && (
              <div className="space-y-3">
                {profileData.student.skills?.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">Pelajar belum mendaftarkan sebarang kemahiran.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {profileData.student.skills.map((s: any) => (
                      <div key={s.student_skill_id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-900">{s.skill_name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.skill_level === SkillLevel.ADVANCED ? 'bg-emerald-100 text-emerald-800' :
                            s.skill_level === SkillLevel.INTERMEDIATE ? 'bg-blue-100 text-blue-800' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {s.skill_level}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 flex items-center justify-between">
                          <span>Pengalaman: <strong>{s.experience_duration || '1 tahun'}</strong></span>
                          {s.is_primary && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-[10px]">
                              UTAMA
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: APPLICATIONS */}
            {activeTab === 'applications' && (
              <div className="space-y-3">
                {profileData.applications?.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">Tiada rekod permohonan aktif atau lepas.</div>
                ) : (
                  <div className="space-y-3">
                    {profileData.applications.map((app: any) => (
                      <div key={app.application_id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">{app.opportunity?.title || 'Panggilan Terbuka'}</span>
                          <span className="px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800">
                            {app.status}
                          </span>
                        </div>
                        <div className="text-slate-500">
                          Dihantar pada: {new Date(app.submitted_at).toLocaleDateString('ms-MY')}
                        </div>
                        {app.admin_notes && (
                          <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900">
                            <strong>Catatan Penilai:</strong> {app.admin_notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PARTICIPATION */}
            {activeTab === 'participation' && (
              <div className="space-y-3">
                {profileData.participations?.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">Tiada rekod penyertaan acara lepas.</div>
                ) : (
                  <div className="space-y-2">
                    {profileData.participations.map((p: any) => (
                      <div key={p.participation_id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900">{p.opportunity_title}</div>
                          <div className="text-slate-500 mt-0.5">Peranan: {p.role_achieved} • Tahun {p.year}</div>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">
                          {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: CURRENT OPPORTUNITY MATCHES */}
            {activeTab === 'matches' && (
              <div className="space-y-3">
                {profileData.opportunityMatches?.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">Tiada peluang aktif dibuka buat masa ini.</div>
                ) : (
                  <div className="space-y-3">
                    {profileData.opportunityMatches.map((m: any) => (
                      <div key={m.opportunity_id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">{m.category_name}</span>
                            <h4 className="font-bold text-sm text-slate-900 mt-1">{m.opportunity_title}</h4>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-extrabold text-emerald-600">{m.match.score}%</span>
                            <div className="text-[10px] text-slate-500 font-medium">{m.match.tier}</div>
                          </div>
                        </div>

                        {m.match.reasons?.length > 0 && (
                          <div className="text-xs text-slate-600 space-y-0.5">
                            {m.match.reasons.map((r: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                <span>{r}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Direct Invite Drawer / Box inside Modal */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-indigo-400" />
                  Jemput Pelajar Ini ke Panggilan Terbuka Secara Terus
                </span>
                {inviteSuccess && <span className="text-xs text-emerald-400 font-semibold">{inviteSuccess}</span>}
              </div>

              <form onSubmit={handleSendInviteSubmit} className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedOppForInvite}
                  onChange={(e) => setSelectedOppForInvite(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 flex-1"
                  required
                >
                  <option value="">-- Pilih Panggilan Terbuka --</option>
                  {opportunities.map(o => (
                    <option key={o.opportunity_id} value={o.opportunity_id}>{o.title}</option>
                  ))}
                </select>

                <input
                  type="text"
                  value={inviteNotes}
                  onChange={(e) => setInviteNotes(e.target.value)}
                  placeholder="Catatan khas jemputan (pilihan)..."
                  className="px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 flex-1"
                />

                <button
                  type="submit"
                  disabled={inviting || !selectedOppForInvite}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 flex-shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  {inviting ? 'Menghantar...' : 'Hantar Jemputan'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors"
          >
            Tutup Profil
          </button>
        </div>
      </div>
    </div>
  );
};
