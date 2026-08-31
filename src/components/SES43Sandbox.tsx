import React, { useState } from 'react';
import { 
  SlidersHorizontal, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Layers, 
  Sparkles, 
  RefreshCw,
  Code2
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

export const SES43Sandbox: React.FC = () => {
  // Test inputs
  const [testRawId, setTestRawId] = useState<string>('pda2502011');
  const [testRawPhone, setTestRawPhone] = useState<string>('60145313756');
  const [testRawName, setTestRawName] = useState<string>('  nur  aina  batrisyia  bin   zulhilmi  ');
  const [testRawEmail, setTestRawEmail] = useState<string>('  Pelajar.Kpmbp@Student.EDU.MY ');
  const [testRawSlugTitle, setTestRawSlugTitle] = useState<string>('Legacy Band 2026 - Audisi Terbuka!');

  // Executed normalizations
  const idResult = normalizeStudentIdNumber(testRawId);
  const phoneResult = normalizePhone(testRawPhone);
  const nameResult = normalizeFullName(testRawName);
  const emailResult = normalizeEmail(testRawEmail);
  const generatedSlugResult = generateSlug(testRawSlugTitle);
  const slugValidationResult = validateSlug(generatedSlugResult);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-3">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-semibold uppercase">
              SES 4.3 Data Integrity Sandbox
            </span>
            <span className="text-xs text-slate-400">Enjin Normalisasi &amp; Pemformatan Automatik</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Prinsip Utama: "User Masukkan Data, Sistem Uruskan Format"
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
            Sistem bertanggungjawab membersihkan (trim), memformat (mask), menukar huruf besar/kecil (casing), dan mengesahkan struktur data sebelum dimasukkan ke dalam pangkalan data.
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
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                4. Enjin Penjanaan Slug
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
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
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

        {/* Relational Entity Architecture Overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Struktur Entiti Relasional (Anti-Duplikasi Data)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-blue-400 block font-mono">1. STUDENTS</span>
              <p className="text-slate-400 leading-relaxed">
                Rekod induk tunggal (Master Record) bagi setiap pelajar berdasarkan ID Pelajar rasmi.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-amber-400 block font-mono">2. STUDENT_SKILLS</span>
              <p className="text-slate-400 leading-relaxed">
                Portfolio bakat berbilang kemahiran (Gitar, Bass, Emcee) dikaitkan terus dengan Pelajar.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-emerald-400 block font-mono">3. OPPORTUNITIES</span>
              <p className="text-slate-400 leading-relaxed">
                Panggilan terbuka yang bebas dan berstruktur dengan slug unik serta soalan dinamik.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-indigo-400 block font-mono">4. APPLICATIONS</span>
              <p className="text-slate-400 leading-relaxed">
                Menghubungkan `student_id` dengan `opportunity_id` berserta jejak audit status.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
