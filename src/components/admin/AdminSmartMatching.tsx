import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Send, 
  UserCheck, 
  Trophy, 
  Star, 
  Filter, 
  Layers,
  Award,
  Zap,
  Info,
  Scale,
  X,
  Eye,
  Check,
  FileCheck
} from 'lucide-react';
import { Opportunity, Student, SkillLevel, MatchResult, Application, Invitation, ApplicationStatus } from '../../types.ts';
import { calculateOpportunityMatch } from '../../lib/matching.ts';

interface AdminSmartMatchingProps {
  opportunities: Opportunity[];
  students: Student[];
  applications?: Application[];
  invitations?: Invitation[];
  onDirectInvite: (student: Student, opportunityId: string) => void;
  onViewProfile?: (student: Student) => void;
  canInvite: boolean;
}

export const AdminSmartMatching: React.FC<AdminSmartMatchingProps> = ({
  opportunities,
  students,
  applications = [],
  invitations = [],
  onDirectInvite,
  onViewProfile,
  canInvite,
}) => {
  const [selectedOppId, setSelectedOppId] = useState<string>(
    opportunities[0]?.opportunity_id || ''
  );
  const [minTierFilter, setMinTierFilter] = useState<string>('ALL');
  const [candidateSearch, setCandidateSearch] = useState<string>('');
  
  // Talent Comparison State (Side-by-Side Deterministic Matrix)
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);

  const currentOpp = useMemo(() => {
    return opportunities.find(o => o.opportunity_id === selectedOppId) || opportunities[0];
  }, [opportunities, selectedOppId]);

  // Calculate deterministic match results for all students against the selected opportunity
  const matchedCandidates = useMemo(() => {
    if (!currentOpp) return [];

    return students
      .map(student => {
        const match = calculateOpportunityMatch(currentOpp, student);
        
        // Find existing application status if any
        const existingApp = applications.find(
          a => a.student_id === student.student_id && a.opportunity_id === currentOpp.opportunity_id
        );

        // Find existing invitation if any
        const existingInv = invitations.find(
          i => i.student_id === student.student_id && i.opportunity_id === currentOpp.opportunity_id
        );

        return {
          student,
          match,
          application: existingApp,
          invitation: existingInv,
        };
      })
      .filter(item => {
        if (minTierFilter === 'EXCELLENT') return item.match.tier === 'EXCELLENT';
        if (minTierFilter === 'STRONG') return ['EXCELLENT', 'STRONG'].includes(item.match.tier);
        if (minTierFilter === 'MODERATE') return ['EXCELLENT', 'STRONG', 'MODERATE'].includes(item.match.tier);
        return true;
      })
      .filter(item => {
        if (!candidateSearch.trim()) return true;
        const q = candidateSearch.toLowerCase();
        return (
          item.student.full_name.toLowerCase().includes(q) ||
          item.student.student_id_number.toLowerCase().includes(q) ||
          item.student.skills?.some(s => s.skill_name.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.match.score - a.match.score);
  }, [currentOpp, students, applications, invitations, minTierFilter, candidateSearch]);

  const stats = useMemo(() => {
    const excellent = matchedCandidates.filter(m => m.match.tier === 'EXCELLENT').length;
    const strong = matchedCandidates.filter(m => m.match.tier === 'STRONG').length;
    const moderate = matchedCandidates.filter(m => m.match.tier === 'MODERATE').length;
    return { excellent, strong, moderate, total: matchedCandidates.length };
  }, [matchedCandidates]);

  // Toggle comparison selection
  const toggleCompare = (studentId: string) => {
    setSelectedForCompare(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      }
      if (prev.length >= 4) {
        alert('Anda boleh membandingkan sehingga 4 calon pada satu masa.');
        return prev;
      }
      return [...prev, studentId];
    });
  };

  const comparedCandidatesData = useMemo(() => {
    return selectedForCompare
      .map(id => matchedCandidates.find(c => c.student.student_id === id))
      .filter(Boolean) as typeof matchedCandidates;
  }, [selectedForCompare, matchedCandidates]);

  if (!currentOpp) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        Tiada data peluang ditemui.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header & Opportunity Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>SES 4.4 Deterministic Matching Engine</span>
              </span>
              <span className="text-xs text-slate-400">Explainable AI Talent Sourcing</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              Enjin Pemadanan &amp; Perbandingan Bakat
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Padankan dan bandingkan portfolio kemahiran calon secara objektif dan deterministik tanpa 'black-box' hallucination.
            </p>
          </div>

          {/* Opportunity Dropdown */}
          <div className="min-w-[260px]">
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Pilih Peluang / Panggilan Terbuka:
            </label>
            <select
              id="select-matching-opportunity"
              value={selectedOppId}
              onChange={(e) => {
                setSelectedOppId(e.target.value);
                setSelectedForCompare([]);
              }}
              className="w-full bg-slate-950 border border-purple-500/40 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
            >
              {opportunities.map(opp => (
                <option key={opp.opportunity_id} value={opp.opportunity_id}>
                  {opp.title} ({opp.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Opportunity Criteria Summary */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Kategori Peluang:</span>
            <span className="font-bold text-indigo-400">{currentOpp.category_name || 'Bakat Am'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Peranan Dicari (Open Roles):</span>
            <span className="font-semibold text-slate-200">
              {currentOpp.open_call_roles?.join(', ') || 'Semua Peranan'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Tarikh Tutup &amp; Status:</span>
            <span className="text-emerald-400 font-mono">
              {new Date(currentOpp.closing_date).toLocaleDateString('ms-MY')} • {currentOpp.status}
            </span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                id="search-matching-candidates"
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
                placeholder="Tapis nama pelajar..."
                className="bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <select
              id="filter-matching-tier"
              value={minTierFilter}
              onChange={(e) => setMinTierFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="ALL">Semua Skor ({students.length})</option>
              <option value="EXCELLENT">Padanan Cemerlang (≥80%)</option>
              <option value="STRONG">Padanan Kukuh (≥60%)</option>
              <option value="MODERATE">Padanan Sederhana (≥40%)</option>
            </select>
          </div>

          <div className="flex items-center space-x-3 text-xs text-slate-400">
            <span>Hasil Padanan: <strong className="text-white">{matchedCandidates.length}</strong> pelajar</span>
            <span className="text-emerald-400 font-semibold font-mono">({stats.excellent} Cemerlang)</span>
          </div>
        </div>
      </div>

      {/* Floating Comparison Action Bar */}
      {selectedForCompare.length > 0 && (
        <div className="sticky top-20 z-40 bg-indigo-950/95 border border-indigo-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                {selectedForCompare.length} Calon Dipilih Untuk Perbandingan (Maks 4)
              </span>
              <span className="text-[11px] text-indigo-300">
                Bandingkan skor, kemahiran, pengalaman dan status permohonan secara serentak.
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              id="btn-clear-compare"
              onClick={() => setSelectedForCompare([])}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Batal Pilihan
            </button>
            <button
              type="button"
              id="btn-open-comparison-modal"
              onClick={() => setShowCompareModal(true)}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/40 flex items-center space-x-1.5"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Buka Matriks Perbandingan ({selectedForCompare.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Matched Candidates Ranked List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {matchedCandidates.length === 0 ? (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
            Tiada calon pelajar yang menepati kriteria padanan bagi peluang ini.
          </div>
        ) : (
          matchedCandidates.map(({ student, match, application, invitation }) => {
            const isTopMatch = match.score >= 80;
            const isGoodMatch = match.score >= 60 && match.score < 80;
            const isSelected = selectedForCompare.includes(student.student_id);

            return (
              <div
                key={student.student_id}
                className={`bg-slate-900 border rounded-2xl p-6 flex flex-col justify-between shadow-lg space-y-4 transition-all relative ${
                  isSelected
                    ? 'ring-2 ring-indigo-500 border-indigo-500/80 bg-indigo-950/20'
                    : isTopMatch 
                    ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-900' 
                    : isGoodMatch
                    ? 'border-blue-500/30'
                    : 'border-slate-800'
                }`}
              >
                <div className="space-y-3">
                  
                  {/* Top Bar: Name, Compare Checkbox & Match Score Gauge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      {/* Checkbox for side-by-side comparison */}
                      <button
                        type="button"
                        id={`btn-select-compare-${student.student_id}`}
                        onClick={() => toggleCompare(student.student_id)}
                        className={`mt-0.5 p-1 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-950 border-slate-700 text-transparent hover:border-slate-500'
                        }`}
                        title="Pilih untuk perbandingan matrik calon"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-base font-bold text-white tracking-tight">{student.full_name}</h3>
                          {isTopMatch && (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                              TOP MATCH
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-blue-400 font-mono mt-0.5">
                          {student.student_id_number} • {student.programme} (Sem {student.semester}) • {student.class}
                        </p>
                      </div>
                    </div>

                    {/* Score Pill */}
                    <div className="text-right shrink-0">
                      <div className="flex items-baseline justify-end space-x-1">
                        <span className={`text-2xl font-extrabold font-mono ${
                          match.score >= 80 ? 'text-emerald-400' :
                          match.score >= 60 ? 'text-blue-400' :
                          match.score >= 40 ? 'text-amber-400' : 'text-slate-400'
                        }`}>
                          {match.score}%
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        match.tier === 'EXCELLENT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        match.tier === 'STRONG' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        match.tier === 'MODERATE' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {match.tier} TIER
                      </span>
                    </div>
                  </div>

                  {/* Application / Invitation Status Strip */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    {application ? (
                      <span className="px-2.5 py-0.5 rounded-md font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center space-x-1">
                        <FileCheck className="w-3 h-3" />
                        <span>Status Permohonan: {application.status}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] text-slate-500 bg-slate-950 border border-slate-800">
                        Belum memohon
                      </span>
                    )}

                    {invitation && (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                        invitation.status === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                        invitation.status === 'DECLINED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        Jemputan: {invitation.status}
                      </span>
                    )}
                  </div>

                  {/* Matched Skills Pills */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Kemahiran Berkaitan:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {match.matched_skills.map((ms, idx) => (
                        <span
                          key={idx}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium flex items-center space-x-1.5 ${
                            ms.level_met
                              ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {ms.level_met && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                          <span>{ms.skill_name}</span>
                          <span className="font-bold text-[10px] text-amber-300">({ms.student_level})</span>
                          {ms.is_primary && (
                            <span className="px-1 py-0.2 bg-amber-400/20 text-amber-300 rounded text-[9px] font-bold">
                              PRIMARY
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Explainable AI Justifications & Itemized Breakdown */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center space-x-1">
                      <Info className="w-3 h-3 text-purple-400" />
                      <span>Analisis Padanan Bakat (SES 4.4 Engine):</span>
                    </span>

                    {/* Matched Items */}
                    {match.matched_items && match.matched_items.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-emerald-400 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Syarat / Peranan Dipenuhi ({match.matched_items.length}):</span>
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {match.matched_items.map((item, mIdx) => (
                            <span key={mIdx} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-md text-[10px] font-medium">
                              ✓ {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Partial Items */}
                    {match.partial_items && match.partial_items.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-amber-400 flex items-center space-x-1">
                          <AlertCircle className="w-3 h-3 text-amber-400" />
                          <span>Padanan Separa ({match.partial_items.length}):</span>
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {match.partial_items.map((item, pIdx) => (
                            <span key={pIdx} className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-md text-[10px] font-medium">
                              △ {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Missing Items */}
                    {match.missing_items && match.missing_items.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-rose-400 flex items-center space-x-1">
                          <span className="w-3 h-3 text-rose-400 font-bold inline-flex items-center justify-center">✕</span>
                          <span>Syarat Belum Dipenuhi ({match.missing_items.length}):</span>
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {match.missing_items.map((item, xIdx) => (
                            <span key={xIdx} className="px-2 py-0.5 bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-md text-[10px] font-medium">
                              ✕ {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Deterministic Justification Bullets */}
                    <div className="pt-1 border-t border-slate-900">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Justifikasi Skor:</span>
                      <ul className="space-y-1 text-slate-300 text-[11px]">
                        {match.reasons.map((reason, rIdx) => (
                          <li key={rIdx} className="flex items-start space-x-1.5">
                            <span className="text-purple-400 font-bold shrink-0">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                </div>

                {/* Direct Action Bar */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    {onViewProfile && (
                      <button
                        type="button"
                        id={`btn-view-profile-${student.student_id}`}
                        onClick={() => onViewProfile(student)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Profil</span>
                      </button>
                    )}
                    <button
                      type="button"
                      id={`btn-compare-toggle-${student.student_id}`}
                      onClick={() => toggleCompare(student.student_id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        isSelected 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {isSelected ? '✓ Dipilih' : '+ Bandingkan'}
                    </button>
                  </div>

                  <button
                    type="button"
                    id={`btn-invite-matched-${student.student_id}`}
                    disabled={!canInvite || (invitation && invitation.status === 'ACCEPTED')}
                    onClick={() => onDirectInvite(student, currentOpp.opportunity_id)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/30 transition-all flex items-center space-x-1.5"
                    title={canInvite ? 'Hantar Jemputan Rasmi' : 'Peranan Reviewer tidak boleh menghantar jemputan'}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{invitation?.status === 'ACCEPTED' ? 'Telah Diterima' : 'Jemput Terus'}</span>
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* -------------------------------------------------------------
          DETERMINISTIC CANDIDATE COMPARISON MODAL (SIDE-BY-SIDE MATRIX)
         ------------------------------------------------------------- */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl shadow-2xl p-6 space-y-6 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5">
                    <Scale className="w-3.5 h-3.5" />
                    <span>Matriks Perbandingan Calon</span>
                  </span>
                  <span className="text-xs text-slate-400">SES 4.4 Deterministic Sourcing</span>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight mt-1">
                  Perbandingan Portfolio &amp; Kebolehan Calon
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Peluang: <strong className="text-purple-300">{currentOpp.title}</strong>
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  id="btn-close-comparison-modal"
                  onClick={() => setShowCompareModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Comparison Side-by-Side Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {comparedCandidatesData.map(({ student, match, application, invitation }) => (
                <div
                  key={student.student_id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-inner"
                >
                  <div className="space-y-4">
                    
                    {/* Student Identity */}
                    <div className="border-b border-slate-850 pb-3">
                      <span className="text-[10px] font-mono text-indigo-400 block">{student.student_id_number}</span>
                      <h4 className="text-base font-bold text-white mt-0.5">{student.full_name}</h4>
                      <p className="text-xs text-slate-400">{student.programme} (Sem {student.semester})</p>
                      <p className="text-xs text-slate-500">Kelas: {student.class}</p>
                    </div>

                    {/* Match Score Gauge */}
                    <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-center space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Skor Padanan</span>
                      <span className={`text-3xl font-extrabold font-mono block ${
                        match.score >= 80 ? 'text-emerald-400' :
                        match.score >= 60 ? 'text-blue-400' : 'text-amber-400'
                      }`}>
                        {match.score}%
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                        match.tier === 'EXCELLENT' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        match.tier === 'STRONG' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {match.tier} TIER
                      </span>
                    </div>

                    {/* Application Status */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Status Permohonan:</span>
                      <span className={`text-xs px-2.5 py-1 rounded-lg block font-semibold border ${
                        application ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}>
                        {application ? application.status : 'Belum Memohon'}
                      </span>
                      {invitation && (
                        <span className="text-[10px] font-semibold text-amber-400 block mt-1">
                          Jemputan: {invitation.status}
                        </span>
                      )}
                    </div>

                    {/* Primary Talent & Skills */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Kemahiran Pelajar:</span>
                      <div className="space-y-1.5">
                        {student.skills?.map((sk, skIdx) => (
                          <div key={skIdx} className="bg-slate-900 p-2 rounded-lg border border-slate-800/80 text-xs flex items-center justify-between">
                            <div>
                              <span className="font-semibold text-white block">{sk.skill_name}</span>
                              {sk.experience_duration && (
                                <span className="text-[10px] text-slate-400">{sk.experience_duration}</span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {sk.skill_level}
                              </span>
                              {sk.is_primary && (
                                <span className="block text-[9px] font-bold text-amber-400 mt-0.5">PRIMARY</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Requirements Met vs Missing */}
                    <div className="space-y-2 pt-1 border-t border-slate-850">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Syarat Peluang Dipenuhi:</span>
                      {match.matched_items && match.matched_items.length > 0 ? (
                        <div className="space-y-1">
                          {match.matched_items.map((item, mi) => (
                            <span key={mi} className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded block">
                              ✓ {item}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500">Tiada syarat mutlak dipenuhi</span>
                      )}

                      {match.missing_items && match.missing_items.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] font-bold uppercase text-rose-400 block">Syarat Belum Dipenuhi:</span>
                          {match.missing_items.map((item, xi) => (
                            <span key={xi} className="text-[10px] text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded block">
                              ✕ {item}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Column Bottom Action */}
                  <div className="pt-3 border-t border-slate-850 space-y-2">
                    <button
                      type="button"
                      id={`btn-compare-invite-${student.student_id}`}
                      disabled={!canInvite || (invitation && invitation.status === 'ACCEPTED')}
                      onClick={() => {
                        onDirectInvite(student, currentOpp.opportunity_id);
                        setShowCompareModal(false);
                      }}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/30 flex items-center justify-center space-x-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{invitation?.status === 'ACCEPTED' ? 'Telah Diterima' : 'Jemput Calon'}</span>
                    </button>
                    {onViewProfile && (
                      <button
                        type="button"
                        onClick={() => {
                          onViewProfile(student);
                          setShowCompareModal(false);
                        }}
                        className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                      >
                        Lihat Profil Penuh
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <span className="text-xs text-slate-400">
                Membandingkan {comparedCandidatesData.length} calon berasaskan enjin pemadanan deterministik SES 4.4.
              </span>
              <button
                type="button"
                id="btn-close-comparison-modal-bottom"
                onClick={() => setShowCompareModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Tutup Matriks
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

