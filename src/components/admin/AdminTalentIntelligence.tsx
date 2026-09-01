import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  Users,
  Target,
  BarChart3,
  Layers,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  ExternalLink,
  Zap,
  ArrowRight
} from 'lucide-react';
import {
  TalentGapAnalysis,
  OpportunityFunnelAnalytics,
  Opportunity,
  AdminUser
} from '../../types.ts';

interface AdminTalentIntelligenceProps {
  authToken: string | null;
  adminUser: AdminUser | null;
  opportunities: Opportunity[];
  onSelectStudent?: (studentId: string) => void;
}

export const AdminTalentIntelligence: React.FC<AdminTalentIntelligenceProps> = ({
  authToken,
  adminUser,
  opportunities,
  onSelectStudent,
}) => {
  const [activeTab, setActiveTab] = useState<'gap' | 'funnel' | 'report'>('gap');

  // Talent Gap State
  const [talentGapData, setTalentGapData] = useState<TalentGapAnalysis | null>(null);
  const [gapLoading, setGapLoading] = useState<boolean>(false);
  const [gapFilter, setGapFilter] = useState<'ALL' | 'MISSING' | 'LOW' | 'SUFFICIENT'>('ALL');
  const [gapCategoryFilter, setGapCategoryFilter] = useState<string>('ALL');

  // Opportunity Funnel State
  const [funnelData, setFunnelData] = useState<OpportunityFunnelAnalytics[]>([]);
  const [selectedOppId, setSelectedOppId] = useState<string>('ALL');
  const [funnelLoading, setFunnelLoading] = useState<boolean>(false);

  // Operational Report State
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState<boolean>(false);

  const authHeader = authToken ? { Authorization: `Bearer ${authToken}` } : {};

  useEffect(() => {
    if (activeTab === 'gap') {
      fetchTalentGap();
    } else if (activeTab === 'funnel') {
      fetchFunnel();
    } else if (activeTab === 'report') {
      fetchOperationalReport();
    }
  }, [activeTab]);

  const fetchTalentGap = async () => {
    setGapLoading(true);
    try {
      const res = await fetch('/api/admin/analytics/talent-gap', {
        headers: { ...authHeader },
      });
      if (!res.ok) throw new Error('Gagal memuat analisis jurang bakat.');
      const data = await res.json();
      setTalentGapData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setGapLoading(false);
    }
  };

  const fetchFunnel = async () => {
    setFunnelLoading(true);
    try {
      const url = selectedOppId !== 'ALL'
        ? `/api/admin/analytics/opportunity-funnel?opportunity_id=${selectedOppId}`
        : '/api/admin/analytics/opportunity-funnel';
      const res = await fetch(url, {
        headers: { ...authHeader },
      });
      if (!res.ok) throw new Error('Gagal memuat corong peluang.');
      const data = await res.json();
      setFunnelData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setFunnelLoading(false);
    }
  };

  const fetchOperationalReport = async () => {
    setReportLoading(true);
    try {
      const res = await fetch('/api/admin/analytics/operational-report', {
        headers: { ...authHeader },
      });
      if (!res.ok) throw new Error('Gagal memuat laporan operasi.');
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="space-y-6" id="admin-talent-intelligence-container">
      {/* Navigation Sub-Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Pusat Kecerdasan Bakat & Laporan Pentadbiran</h2>
          <p className="text-xs text-slate-600 mt-1">
            Analisis deterministik jurang bakat (Talent Gap), corong penukaran peluang, dan laporan operasi rasmi.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto">
          <button
            id="tab-talent-gap"
            onClick={() => setActiveTab('gap')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'gap' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            Analisis Jurang Bakat
          </button>
          <button
            id="tab-opportunity-funnel"
            onClick={() => setActiveTab('funnel')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'funnel' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Corong Peluang
          </button>
          <button
            id="tab-operational-report"
            onClick={() => setActiveTab('report')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'report' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Laporan Operasi
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. TALENT GAP ANALYSIS (DETERMINISTIC) */}
      {/* ========================================================================= */}
      {activeTab === 'gap' && (
        <div className="space-y-6" id="section-talent-gap">
          {gapLoading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
              Menilai jurang kemahiran dan bekalan bakat pelajar...
            </div>
          ) : talentGapData ? (
            <>
              {/* Gap Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => setGapFilter('ALL')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    gapFilter === 'ALL' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <div className="text-xs font-semibold opacity-80 uppercase">Jumlah Kemahiran Dinilai</div>
                  <div className="text-2xl font-bold mt-1">{talentGapData.total_skills_evaluated}</div>
                </button>

                <button
                  onClick={() => setGapFilter('SUFFICIENT')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    gapFilter === 'SUFFICIENT' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <div className="text-xs font-semibold opacity-80 uppercase">Bakat Mencukupi</div>
                  <div className="text-2xl font-bold mt-1">{talentGapData.sufficient_count}</div>
                </button>

                <button
                  onClick={() => setGapFilter('LOW')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    gapFilter === 'LOW' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <div className="text-xs font-semibold opacity-80 uppercase">Bakat Terhad (Perlu Usaha)</div>
                  <div className="text-2xl font-bold mt-1">{talentGapData.low_count}</div>
                </button>

                <button
                  onClick={() => setGapFilter('MISSING')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    gapFilter === 'MISSING' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <div className="text-xs font-semibold opacity-80 uppercase">Jurang Kritikal (0 Calon)</div>
                  <div className="text-2xl font-bold mt-1">{talentGapData.missing_count}</div>
                </button>
              </div>

              {/* Skill Gaps List */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-bold text-slate-900 text-sm">
                      Daftar Jurang Kemahiran Pelajar ({talentGapData.skill_gaps.filter(s => gapFilter === 'ALL' || s.coverage_status === gapFilter).length})
                    </h3>
                  </div>
                  <button
                    onClick={fetchTalentGap}
                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-50 transition-colors self-end sm:self-auto"
                    title="Muat Semula Analisis"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {talentGapData.skill_gaps
                    .filter(s => gapFilter === 'ALL' || s.coverage_status === gapFilter)
                    .map((item, idx) => (
                      <div key={idx} className="p-5 hover:bg-slate-50 transition-colors space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                              item.coverage_status === 'SUFFICIENT' ? 'bg-emerald-100 text-emerald-800' :
                              item.coverage_status === 'LOW' ? 'bg-amber-100 text-amber-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {item.coverage_status === 'SUFFICIENT' ? 'MENCUKUPI' :
                               item.coverage_status === 'LOW' ? 'TERHAD' : 'TIADA CALON'}
                            </span>
                            <span className="font-bold text-slate-900 text-base">{item.skill_name}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                              {item.category_name}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-700">
                            <span>Jumlah: <strong>{item.available_students_count}</strong> calon</span>
                            <span>•</span>
                            <span className="text-emerald-700 font-semibold">Adv: {item.advanced_count}</span>
                            <span>•</span>
                            <span className="text-blue-700 font-semibold">Int: {item.intermediate_count}</span>
                            <span>•</span>
                            <span className="text-slate-500 font-semibold">Beg: {item.beginner_count}</span>
                          </div>
                        </div>

                        {item.required_by_opportunities.length > 0 && (
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700">
                            <span className="font-semibold text-slate-900">Diperlukan untuk program: </span>
                            {item.required_by_opportunities.join(', ')}
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-xs text-slate-600 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">
                          <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          <span><strong>Syor Pentadbir:</strong> {item.recommendation}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. OPPORTUNITY FUNNEL ANALYTICS */}
      {/* ========================================================================= */}
      {activeTab === 'funnel' && (
        <div className="space-y-6" id="section-opportunity-funnel">
          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-sm text-slate-800">Pilih Panggilan Terbuka:</span>
            </div>
            <select
              value={selectedOppId}
              onChange={(e) => {
                setSelectedOppId(e.target.value);
                setTimeout(() => fetchFunnel(), 50);
              }}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
            >
              <option value="ALL">Semua Panggilan Terbuka</option>
              {opportunities.map(o => (
                <option key={o.opportunity_id} value={o.opportunity_id}>{o.title}</option>
              ))}
            </select>
          </div>

          {funnelLoading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
              Menjana analisis corong penukaran permohonan...
            </div>
          ) : funnelData.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
              Tiada data peluang ditemui.
            </div>
          ) : (
            <div className="space-y-6">
              {funnelData.map(f => (
                <div key={f.opportunity_id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800">
                          {f.category_name}
                        </span>
                        <h3 className="font-bold text-slate-900 text-base">{f.title}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="text-slate-500">Kadar Penukaran (Selection Rate):</span>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold">
                        {f.conversion_rate_percent}%
                      </span>
                    </div>
                  </div>

                  {/* Funnel Progress Steps */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">1. Permohonan</div>
                      <div className="text-xl font-extrabold text-slate-900 mt-1">{f.total_applications}</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl">
                      <div className="text-[11px] font-bold text-blue-700 uppercase">2. Penapisan</div>
                      <div className="text-xl font-extrabold text-blue-900 mt-1">{f.screening_count}</div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                      <div className="text-[11px] font-bold text-amber-700 uppercase">3. Senarai Pendek</div>
                      <div className="text-xl font-extrabold text-amber-900 mt-1">{f.shortlisted_count}</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl">
                      <div className="text-[11px] font-bold text-purple-700 uppercase">4. Terpilih</div>
                      <div className="text-xl font-extrabold text-purple-900 mt-1">{f.selected_count}</div>
                    </div>
                    <div className="bg-teal-50 border border-teal-200 p-3 rounded-xl">
                      <div className="text-[11px] font-bold text-teal-700 uppercase">5. Disahkan</div>
                      <div className="text-xl font-extrabold text-teal-900 mt-1">{f.confirmed_count}</div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                      <div className="text-[11px] font-bold text-emerald-700 uppercase">6. Penglibatan</div>
                      <div className="text-xl font-extrabold text-emerald-900 mt-1">{f.participation_count}</div>
                    </div>
                  </div>

                  {/* Top Matched Talents in Talent Pool */}
                  {f.top_matched_talents.length > 0 && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          Calon Paling Sepadan dalam Pangkalan Data (Sedia Dijemput):
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {f.top_matched_talents.map((t, idx) => (
                          <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                            <div>
                              <div className="font-bold text-xs text-slate-900">{t.student_name}</div>
                              <div className="text-[10px] text-slate-500">{t.student_id_number}</div>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {t.score}% Padan
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unmet Requirements */}
                  {f.unmet_requirements.length > 0 && (
                    <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-xs text-rose-800 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-rose-900">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Jurang Keperluan Terbuka:
                      </div>
                      {f.unmet_requirements.map((req, idx) => (
                        <div key={idx} className="text-rose-700">• {req}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. COMPREHENSIVE OPERATIONAL REPORT */}
      {/* ========================================================================= */}
      {activeTab === 'report' && (
        <div className="space-y-6" id="section-operational-report">
          {reportLoading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
              Menjana ringkasan laporan operasi pentadbiran...
            </div>
          ) : reportData ? (
            <div className="space-y-6">
              {/* Primary High-Level Decision KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Jumlah Pelajar</div>
                  <div className="text-3xl font-extrabold text-slate-900 mt-1">{reportData.totalStudents}</div>
                  <div className="text-xs text-slate-500 mt-1">Pelajar Berdaftar Aktif</div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-semibold text-indigo-600 uppercase">Pendaftaran Bakat</div>
                  <div className="text-3xl font-extrabold text-indigo-900 mt-1">{reportData.talentRegistrationRate}%</div>
                  <div className="text-xs text-slate-500 mt-1">{reportData.studentsWithSkills} pelajar telah mengisi bakat</div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-semibold text-emerald-600 uppercase">Peluang Aktif</div>
                  <div className="text-3xl font-extrabold text-emerald-900 mt-1">{reportData.activeOpportunities}</div>
                  <div className="text-xs text-slate-500 mt-1">Daripada {reportData.totalOpportunities} keseluruhan</div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-xs font-semibold text-purple-600 uppercase">Kadar Terima Jemputan</div>
                  <div className="text-3xl font-extrabold text-purple-900 mt-1">{reportData.invitationAcceptanceRate}%</div>
                  <div className="text-xs text-slate-500 mt-1">{reportData.acceptedInvitations} diterima daripada {reportData.totalInvitations}</div>
                </div>
              </div>

              {/* Status Breakdown & Category Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Application Status Distribution */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <h4 className="font-bold text-slate-900 text-sm">Status Permohonan Keseluruhan ({reportData.totalApplications})</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-700">Dihantar (Submitted):</span>
                      <span className="font-bold text-slate-900">{reportData.appStatusBreakdown.SUBMITTED}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                      <span className="font-medium text-blue-800">Dalam Penapisan & Audisi:</span>
                      <span className="font-bold text-blue-900">{reportData.appStatusBreakdown.SCREENING}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
                      <span className="font-medium text-amber-800">Disenarai Pendek (Shortlisted):</span>
                      <span className="font-bold text-amber-900">{reportData.appStatusBreakdown.SHORTLISTED}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                      <span className="font-medium text-emerald-800">Terpilih & Disahkan (Selected/Confirmed):</span>
                      <span className="font-bold text-emerald-900">{reportData.appStatusBreakdown.SELECTED + reportData.appStatusBreakdown.CONFIRMED}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-rose-50 rounded-lg">
                      <span className="font-medium text-rose-800">Ditolak / Tidak Berjaya:</span>
                      <span className="font-bold text-rose-900">{reportData.appStatusBreakdown.REJECTED}</span>
                    </div>
                  </div>
                </div>

                {/* Category Talent Distribution */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <h4 className="font-bold text-slate-900 text-sm">Taburan Bakat Mengikut Kategori</h4>
                  <div className="space-y-2 text-xs">
                    {reportData.categoryDistribution.map((cat: any) => (
                      <div key={cat.category_id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                        <div>
                          <span className="font-bold text-slate-900">{cat.category_name}</span>
                          <span className="text-slate-500 ml-2">({cat.opportunities_count} program)</span>
                        </div>
                        <span className="px-2 py-0.5 rounded font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {cat.students_count} Pelajar
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Demand Opportunities */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <h4 className="font-bold text-slate-900 text-sm">Panggilan Terbuka Paling Popular (Permohonan Tertinggi)</h4>
                <div className="divide-y divide-slate-100">
                  {reportData.topOpportunities.map((opp: any, idx: number) => (
                    <div key={opp.opportunity_id} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-slate-100 font-bold text-slate-700 flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-900">{opp.title}</span>
                      </div>
                      <span className="font-bold px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {opp.applications_count} Permohonan
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
