import React, { useState } from 'react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Layers, 
  Sparkles, 
  Cpu,
  Lock,
  Database,
  Search,
  Award,
  Zap,
  Activity
} from 'lucide-react';
import { 
  maskStudentIdInput, 
  normalizeStudentIdNumber, 
  maskPhoneInput, 
  normalizePhone, 
  normalizeFullName, 
  normalizeEmail, 
  generateSlug, 
  validateSlug 
} from '../lib/normalization.ts';
import { calculateOpportunityMatch } from '../lib/matching.ts';
import { SkillLevel, OpportunityStatus, Opportunity, Student } from '../types.ts';

export const SES44Sandbox: React.FC = () => {
  // Test inputs
  const [testRawId, setTestRawId] = useState<string>('pda2502011');
  const [testRawPhone, setTestRawPhone] = useState<string>('60145313756');
  const [testRawName, setTestRawName] = useState<string>('  nur  aina  batrisyia  bin   zulhilmi  ');
  const [testRawEmail, setTestRawEmail] = useState<string>('  Pelajar.Kpmbp@Student.EDU.MY ');
  const [testRawSlugTitle, setTestRawSlugTitle] = useState<string>('Legacy Band 2026 - Audisi Terbuka!');

  // Smart Matching Interactive Simulator
  const [simSelectedSkill, setSimSelectedSkill] = useState<string>('Guitar');
  const [simStudentLevel, setSimStudentLevel] = useState<SkillLevel>(SkillLevel.ADVANCED);
  const [simIsPrimary, setSimIsPrimary] = useState<boolean>(true);
  const [simExperience, setSimExperience] = useState<string>('3 tahun (Lead Guitar Band Sekolah)');

  // Executed normalizations
  const idResult = normalizeStudentIdNumber(testRawId);
  const phoneResult = normalizePhone(testRawPhone);
  const nameResult = normalizeFullName(testRawName);
  const emailResult = normalizeEmail(testRawEmail);
  const generatedSlugResult = generateSlug(testRawSlugTitle);
  const slugValidationResult = validateSlug(generatedSlugResult);

  // Mock student & mock opp for matching demo
  const sampleOpp: Opportunity = {
    opportunity_id: 'opp-sim',
    title: 'LEGACY BAND 2026',
    slug: 'legacy-band-2026',
    category_id: 'cat-music',
    category_name: 'Music',
    description: 'Pencarian formasi kugiran kolej',
    open_call_roles: ['Guitar', 'Bass', 'Vocal', 'Drum'],
    requirements: [
      { skill_name: 'Guitar / Bass', minimum_level: SkillLevel.INTERMEDIATE, is_required: true }
    ],
    opening_date: '2026-08-01',
    closing_date: '2026-09-01',
    status: OpportunityStatus.OPEN,
    created_by: 'adm-001',
    created_at: '2026-08-01',
    updated_at: '2026-08-01',
  };

  const sampleStudent: Student = {
    student_id: 'stu-sim',
    student_id_number: 'PDA-2502-011',
    full_name: 'NUR AINA BATRISYIA',
    programme: 'DIA',
    semester: 3,
    class: 'DIA3A',
    gender: 'PEREMPUAN',
    phone: '014-5313756',
    email: 'nuraina@student.kpmbp.edu.my',
    status: 'ACTIVE',
    created_at: '2026-02-10',
    updated_at: '2026-02-10',
    skills: [
      {
        student_skill_id: 'ss-sim',
        student_id: 'stu-sim',
        skill_id: 'sk-1',
        skill_name: simSelectedSkill,
        category_name: 'Music',
        skill_level: simStudentLevel,
        is_primary: simIsPrimary,
        experience_duration: simExperience,
        created_at: '2026-02-10',
        updated_at: '2026-02-10',
      }
    ]
  };

  const matchResult = calculateOpportunityMatch(sampleOpp, sampleStudent);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-3">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SES 4.4 Hardened Core Engine</span>
            </span>
            <span className="text-xs text-slate-400">Standard Kejuruteraan Rasmi &amp; Integriti Data</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Enjin Normalisasi, Smart Matching &amp; Persistensi Data
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
            Prinsip teras SES 4.4: <strong>"Deleted Means Deleted"</strong>, <strong>"Empty Means Empty"</strong>, <strong>"One Student One Master Profile"</strong>, serta pemadanan deterministik yang boleh dijelaskan (Explainable AI Matching).
          </p>
        </div>

        {/* Interactive Normalization Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Test 1: Student ID Number */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                1. Normalisasi ID Pelajar KPMBP
              </h3>
              <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-blue-400">
                Pattern: XXX-XXXX-XXX
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">Input Mentah Pengguna (Cuba taip tanpa sengkang):</label>
              <input
                type="text"
                value={testRawId}
                onChange={(e) => setTestRawId(maskStudentIdInput(e.target.value))}
                placeholder="pda2502011"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Nilai Normalisasi:</span>
                <span className="text-emerald-400 font-bold">{idResult.normalized || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status Validasi:</span>
                <span className={idResult.isValid ? 'text-emerald-400' : 'text-rose-400'}>
                  {idResult.isValid ? 'SAH (Valid)' : `TIDAK SAH (${idResult.error})`}
                </span>
              </div>
            </div>
          </div>

          {/* Test 2: Phone Number Normalization */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                2. Normalisasi Nombor WhatsApp / Telefon
              </h3>
              <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-emerald-400">
                Pattern: 01X-XXXXXXX
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">Input Mentah Pengguna (Cuba +60145313756 atau 6014):</label>
              <input
                type="text"
                value={testRawPhone}
                onChange={(e) => setTestRawPhone(e.target.value)}
                placeholder="+60145313756"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Nilai Normalisasi:</span>
                <span className="text-emerald-400 font-bold">{phoneResult.normalized || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status Validasi:</span>
                <span className={phoneResult.isValid ? 'text-emerald-400' : 'text-rose-400'}>
                  {phoneResult.isValid ? 'SAH (Valid)' : `TIDAK SAH (${phoneResult.error})`}
                </span>
              </div>
            </div>
          </div>

          {/* Test 3: Full Name Clean & Upper */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                3. Normalisasi Nama Penuh
              </h3>
              <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-amber-400">
                UPPERCASE &amp; Single-Space
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">Input Mentah Pengguna (Jarak berlebihan &amp; huruf kecil):</label>
              <input
                type="text"
                value={testRawName}
                onChange={(e) => setTestRawName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Hasil Normalisasi:</span>
                <span className="text-emerald-400 font-bold">{nameResult}</span>
              </div>
            </div>
          </div>

          {/* Test 4: Slug Generation & URL Safety */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                4. Enjin Penjanaan Slug URL
              </h3>
              <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-purple-400">
                kebab-case URL-Safe
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">Tajuk Peluang Mentah:</label>
              <input
                type="text"
                value={testRawSlugTitle}
                onChange={(e) => setTestRawSlugTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Generated Slug:</span>
                <span className="text-purple-300 font-bold">/{generatedSlugResult}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kesesuaian URL:</span>
                <span className={slugValidationResult.isValid ? 'text-emerald-400' : 'text-rose-400'}>
                  {slugValidationResult.isValid ? 'SAH & STABIL' : `RALAT: ${slugValidationResult.error}`}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Smart Matching Engine Demo Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Simulator Enjin Smart Matching (SES 4.4)
                </h3>
                <p className="text-xs text-slate-400">
                  Uji logik pemadanan profil bakat dengan keperluan peluang Legacy Band 2026 secara deterministik.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs font-semibold rounded-full border border-purple-500/30">
              Deterministic Engine
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Simulator Inputs */}
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Kemahiran Pelajar Diuji:</label>
                <select
                  value={simSelectedSkill}
                  onChange={(e) => setSimSelectedSkill(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Guitar">Guitar (Mencukupi Keperluan)</option>
                  <option value="Bass">Bass (Mencukupi Keperluan)</option>
                  <option value="Drum">Drum (Instrumen Terbuka)</option>
                  <option value="Public Speaking">Public Speaking (Bakat Bukan Muzik)</option>
                  <option value="Photography">Photography (Media &amp; Kreatif)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Tahap Penguasaan:</label>
                  <select
                    value={simStudentLevel}
                    onChange={(e) => setSimStudentLevel(e.target.value as SkillLevel)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={SkillLevel.BEGINNER}>BEGINNER</option>
                    <option value={SkillLevel.INTERMEDIATE}>INTERMEDIATE</option>
                    <option value={SkillLevel.ADVANCED}>ADVANCED</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Bakat Utama (Primary):</label>
                  <select
                    value={simIsPrimary ? 'true' : 'false'}
                    onChange={(e) => setSimIsPrimary(e.target.value === 'true')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="true">Ya (Primary Talent)</option>
                    <option value="false">Tidak (Sekunder)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Catatan Pengalaman:</label>
                <input
                  type="text"
                  value={simExperience}
                  onChange={(e) => setSimExperience(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Matching Result Display */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Hasil Skor Pemadanan:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    matchResult.score >= 80 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    matchResult.score >= 60 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    matchResult.score >= 40 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {matchResult.tier} TIER
                  </span>
                </div>

                <div className="flex items-baseline space-x-2 mb-4">
                  <span className="text-4xl font-extrabold text-white">{matchResult.score}%</span>
                  <span className="text-xs text-slate-400">Kesesuaian dengan Legacy Band 2026</span>
                </div>

                <div className="space-y-2 text-xs">
                  <span className="text-slate-400 font-semibold block">Justifikasi Skor (Explainability):</span>
                  <ul className="space-y-1.5">
                    {matchResult.reasons.map((r, i) => (
                      <li key={i} className="flex items-start space-x-2 text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 border-t border-slate-800/80 pt-3">
                Algoritma SES 4.4 beroperasi secara telus tanpa randomisasi, memastikan setiap cadangan boleh disemak oleh panel pentadbir KPMBP.
              </div>
            </div>
          </div>
        </div>

        {/* SES 4.4 Pillars Overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>4 Tiang Utama Seni Bina SES 4.4</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-emerald-400 block font-mono">1. PERSISTENSI KEKAL</span>
              <p className="text-slate-400 leading-relaxed">
                Storan berasaskan fail dan pangkalan data cloud kekal. Data dipadam tidak akan bangkit semula selepas server dimulakan semula.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-blue-400 block font-mono">2. KAWALAN PERANAN</span>
              <p className="text-slate-400 leading-relaxed">
                Sempadan keselamatan berasaskan token (Super Admin, Admin, Reviewer) menguatkuasakan autoriti peringkat server.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-purple-400 block font-mono">3. ONE STUDENT ONE PROFILE</span>
              <p className="text-slate-400 leading-relaxed">
                Semua permohonan berpusat pada satu profil induk tunggal dengan keupayaan kemaskini portfolio tanpa duplikasi rekod.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-amber-400 block font-mono">4. NOTIFIKASI &amp; AUDIT</span>
              <p className="text-slate-400 leading-relaxed">
                Setiap tindakan saringan, status permohonan, dan jemputan merekod jejak audit masa nyata berserta notifikasi dua hala.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
