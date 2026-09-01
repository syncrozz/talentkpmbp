import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  AlertCircle, 
  UserCheck, 
  FileText, 
  ShieldAlert, 
  Video, 
  Link as LinkIcon, 
  Plus, 
  Trash2,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  Opportunity, 
  Student, 
  QuestionType, 
  SkillLevel,
  OpportunityQuestion
} from '../types.ts';
import { 
  maskStudentIdInput, 
  normalizeStudentIdNumber, 
  maskPhoneInput, 
  normalizePhone, 
  normalizeFullName, 
  normalizeEmail 
} from '../lib/normalization.ts';

interface ApplicationModalProps {
  opportunity: Opportunity;
  onClose: () => void;
  onSuccess: (applicationId: string) => void;
}

export const ApplicationModal: React.FC<ApplicationModalProps> = ({
  opportunity,
  onClose,
  onSuccess,
}) => {
  // Steps: 1: Student Profile, 2: Opportunity Questions, 3: Review & Submit, 4: Success
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profileFound, setProfileFound] = useState<boolean>(false);
  const [successAppId, setSuccessAppId] = useState<string | null>(null);

  // Student Profile State
  const [studentIdInput, setStudentIdInput] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [preferredName, setPreferredName] = useState<string>('');
  const [programme, setProgramme] = useState<string>('Diploma in Accounting (DIA)');
  const [semester, setSemester] = useState<number>(1);
  const [className, setClassName] = useState<string>('DIA1A');
  const [gender, setGender] = useState<'LELAKI' | 'PEREMPUAN'>('LELAKI');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  
  // Student Skills State
  const [studentSkillsList, setStudentSkillsList] = useState<Array<{
    skill_name: string;
    skill_level: SkillLevel;
    experience_duration: string;
    is_primary: boolean;
  }>>([
    { skill_name: '', skill_level: SkillLevel.INTERMEDIATE, experience_duration: '', is_primary: true }
  ]);

  // Opportunity Dynamic Responses State
  const [responses, setResponses] = useState<Record<string, any>>({});

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Real-time lookup when student ID is formatted properly
  const handleStudentIdChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const masked = maskStudentIdInput(raw);
    setStudentIdInput(masked);
    setErrorMessage(null);

    const { isValid, normalized } = normalizeStudentIdNumber(masked);
    if (isValid && normalized.length === 12) {
      try {
        const res = await fetch(`/api/students/lookup/${normalized}`);
        if (res.ok) {
          const studentData: Student = await res.json();
          setProfileFound(true);
          setFullName(studentData.full_name);
          setPreferredName(studentData.preferred_name || '');
          setProgramme(studentData.programme || 'Diploma in Accounting (DIA)');
          setSemester(studentData.semester || 1);
          setClassName(studentData.class || 'DIA1A');
          setGender(studentData.gender || 'LELAKI');
          setPhone(studentData.phone || '');
          setEmail(studentData.email || '');

          if (studentData.skills && studentData.skills.length > 0) {
            setStudentSkillsList(studentData.skills.map(s => ({
              skill_name: s.skill_name,
              skill_level: s.skill_level,
              experience_duration: s.experience_duration || '',
              is_primary: s.is_primary,
            })));
          }
        } else {
          setProfileFound(false);
        }
      } catch (err) {
        console.error('Lookup error:', err);
      }
    } else {
      setProfileFound(false);
    }
  };

  const handleAddSkill = () => {
    setStudentSkillsList([
      ...studentSkillsList,
      { skill_name: '', skill_level: SkillLevel.INTERMEDIATE, experience_duration: '', is_primary: false }
    ]);
  };

  const handleRemoveSkill = (idx: number) => {
    setStudentSkillsList(studentSkillsList.filter((_, i) => i !== idx));
  };

  const handleUpdateSkill = (idx: number, field: string, value: any) => {
    const updated = [...studentSkillsList];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'is_primary' && value === true) {
      // uncheck others
      updated.forEach((s, i) => {
        if (i !== idx) s.is_primary = false;
      });
    }
    setStudentSkillsList(updated);
  };

  // Dynamic response change handler
  const handleResponseChange = (questionId: string, val: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: val,
    }));
    if (errors[questionId]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  // Validate Step 1
  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};
    const idCheck = normalizeStudentIdNumber(studentIdInput);
    if (!idCheck.isValid) {
      newErrors.student_id_number = idCheck.error || 'ID Pelajar tidak sah';
    }

    const normName = normalizeFullName(fullName);
    if (!normName || normName.length < 3) {
      newErrors.full_name = 'Nama penuh sah diperlukan.';
    }

    const phoneCheck = normalizePhone(phone);
    if (!phoneCheck.isValid) {
      newErrors.phone = phoneCheck.error || 'Nombor telefon tidak sah';
    }

    const emailCheck = normalizeEmail(email);
    if (!emailCheck.isValid) {
      newErrors.email = emailCheck.error || 'Alamat e-mel tidak sah';
    }

    if (!className.trim()) {
      newErrors.class = 'Kelas diperlukan (cth: DIA3A)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate Step 2
  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};
    const questions = opportunity.questions || [];

    for (const q of questions) {
      if (q.is_required) {
        const val = responses[q.question_id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          newErrors[q.question_id] = 'Soalan ini wajib diisi.';
        } else if (q.question_type === QuestionType.BOOLEAN && val !== true) {
          newErrors[q.question_id] = 'Pengesahan komitmen diperlukan untuk meneruskan.';
        } else if (q.question_type === QuestionType.URL || q.question_type === QuestionType.VIDEO_LINK) {
          if (typeof val === 'string' && !val.startsWith('http://') && !val.startsWith('https://')) {
            newErrors[q.question_id] = 'Sila masukkan pautan URL yang sah (bermula dengan http:// atau https://).';
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    setErrorMessage(null);
    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
      }
    } else if (step === 2) {
      if (validateStep2()) {
        setStep(3);
      }
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMessage(null);

    const filteredSkills = studentSkillsList
      .filter(s => s.skill_name.trim().length > 0)
      .map(s => ({
        skill_name: s.skill_name.trim(),
        skill_level: s.skill_level,
        experience_duration: s.experience_duration?.trim(),
        is_primary: s.is_primary,
      }));

    const payload = {
      opportunity_id: opportunity.opportunity_id,
      student_data: {
        student_id_number: normalizeStudentIdNumber(studentIdInput).normalized,
        full_name: normalizeFullName(fullName),
        preferred_name: preferredName.trim(),
        programme,
        semester,
        class: className.toUpperCase().trim(),
        gender,
        phone: normalizePhone(phone).normalized,
        email: normalizeEmail(email).normalized,
        skills_data: filteredSkills,
      },
      responses,
    };

    try {
      const res = await fetch('/api/applications/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Gagal menghantar permohonan.');
        setLoading(false);
        return;
      }

      // Success
      setSuccessAppId(data.application_id);
      setStep(4);
      onSuccess(data.application_id);

      // Trigger Confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // fallback safe
      }
    } catch (err: any) {
      setErrorMessage('Ralat sambungan pelayan. Sila cuba sebentar lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        id="application-modal-card"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-semibold uppercase px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-md">
                Borang Permohonan SES 4.4
              </span>
              <span className="text-xs text-slate-400">/{opportunity.slug}</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
              {opportunity.title}
            </h2>
          </div>
          <button
            type="button"
            id="btn-close-app-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Bar */}
        {step < 4 && (
          <div className="bg-slate-950/60 border-b border-slate-800/80 px-6 py-3">
            <div className="flex items-center justify-between text-xs font-medium text-slate-400">
              <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-blue-400 font-semibold' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  1
                </div>
                <span>Profil Pelajar</span>
              </div>
              <div className="w-8 sm:w-16 h-0.5 bg-slate-800">
                <div className={`h-full bg-blue-500 transition-all ${step >= 2 ? 'w-full' : 'w-0'}`} />
              </div>
              <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-blue-400 font-semibold' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  2
                </div>
                <span>Soalan Peluang</span>
              </div>
              <div className="w-8 sm:w-16 h-0.5 bg-slate-800">
                <div className={`h-full bg-blue-500 transition-all ${step >= 3 ? 'w-full' : 'w-0'}`} />
              </div>
              <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-blue-400 font-semibold' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  3
                </div>
                <span>Semakan &amp; Hantar</span>
              </div>
            </div>
          </div>
        )}

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl flex items-start space-x-3 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Perhatian</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* STEP 1: STUDENT IDENTIFICATION & BASE PROFILE */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-4 flex items-start space-x-3">
                <UserCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-200 leading-relaxed">
                  <span className="font-semibold text-blue-300">Prinsip SES 4.4 — Satu Pelajar, Satu Profil:</span> Masukkan ID Pelajar anda. Jika anda pernah memohon mana-mana peluang sebelum ini, maklumat asas anda akan dimuatkan secara automatik dan boleh diguna semula tanpa mengisi semula dari sifar.
                </div>
              </div>

              {/* Student ID Lookup */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  ID Pelajar KPMBP <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="input-student-id"
                    value={studentIdInput}
                    onChange={handleStudentIdChange}
                    placeholder="PDA-2502-011"
                    maxLength={12}
                    className={`w-full bg-slate-950 border ${errors.student_id_number ? 'border-rose-500' : profileFound ? 'border-emerald-500' : 'border-slate-700'} rounded-xl px-4 py-2.5 text-white font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {profileFound && (
                    <span className="absolute right-3 top-2.5 flex items-center space-x-1 text-emerald-400 text-xs font-medium bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Profil Ditemui</span>
                    </span>
                  )}
                </div>
                {errors.student_id_number ? (
                  <p className="text-xs text-rose-400 mt-1">{errors.student_id_number}</p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">Format automatik: XXX-XXXX-XXX (Taip terus huruf dan nombor, sistem akan meletakkan sengkang secara langsung).</p>
                )}
              </div>

              {/* Full Name & Preferred Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Nama Penuh (Mengikut Kad Pengenalan) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-full-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value.toUpperCase())}
                    placeholder="NUR AINA BATRISYIA BINTI ZULHILMI"
                    className={`w-full bg-slate-950 border ${errors.full_name ? 'border-rose-500' : 'border-slate-700'} rounded-xl px-4 py-2.5 text-white uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                  />
                  {errors.full_name && <p className="text-xs text-rose-400 mt-1">{errors.full_name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Nama Panggilan
                  </label>
                  <input
                    type="text"
                    id="input-preferred-name"
                    value={preferredName}
                    onChange={(e) => setPreferredName(e.target.value)}
                    placeholder="Aina"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Programme, Semester, Class, Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Program Pengajian <span className="text-rose-400">*</span>
                  </label>
                  <select
                    id="select-programme"
                    value={programme}
                    onChange={(e) => setProgramme(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="Diploma in Accounting (DIA)">Diploma in Accounting (DIA)</option>
                    <option value="Diploma in Business Studies (DBS)">Diploma in Business Studies (DBS)</option>
                    <option value="Diploma in Information Technology (DIT)">Diploma in Information Technology (DIT)</option>
                    <option value="Diploma in Computer Science (DCIS)">Diploma in Computer Science (DCIS)</option>
                    <option value="Program Lain-lain">Program Lain-lain</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Semester <span className="text-rose-400">*</span>
                  </label>
                  <select
                    id="select-semester"
                    value={semester}
                    onChange={(e) => setSemester(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {[1, 2, 3, 4, 5, 6].map(s => (
                      <option key={s} value={s}>Sem {s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Kelas <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-class"
                    value={className}
                    onChange={(e) => setClassName(e.target.value.toUpperCase())}
                    placeholder="DIA3A"
                    className={`w-full bg-slate-950 border ${errors.class ? 'border-rose-500' : 'border-slate-700'} rounded-xl px-3 py-2.5 text-white uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono`}
                  />
                </div>
              </div>

              {/* Gender, Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Jantina <span className="text-rose-400">*</span>
                  </label>
                  <select
                    id="select-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="LELAKI">Lelaki</option>
                    <option value="PEREMPUAN">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    No. WhatsApp / Telefon <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-phone"
                    value={phone}
                    onChange={(e) => setPhone(maskPhoneInput(e.target.value))}
                    placeholder="014-5313756"
                    className={`w-full bg-slate-950 border ${errors.phone ? 'border-rose-500' : 'border-slate-700'} rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                  />
                  {errors.phone && <p className="text-xs text-rose-400 mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Alamat E-mel <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    id="input-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    placeholder="pelajar@student.kpmbp.edu.my"
                    className={`w-full bg-slate-950 border ${errors.email ? 'border-rose-500' : 'border-slate-700'} rounded-xl px-4 py-2.5 text-white lowercase focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                  />
                  {errors.email && <p className="text-xs text-rose-400 mt-1">{errors.email}</p>}
                </div>
              </div>

              {/* Master Skills / Talent Portfolio */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Profil Kemahiran &amp; Bakat Pelajar</span>
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Bakat yang anda masukkan di sini akan disimpan dalam Student Talent Profile anda untuk carian Admin masa hadapan.
                    </p>
                  </div>
                  <button
                    type="button"
                    id="btn-add-skill-row"
                    onClick={handleAddSkill}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1 bg-blue-950/40 hover:bg-blue-900/40 border border-blue-800/40 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Bakat</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {studentSkillsList.map((sk, idx) => (
                    <div key={idx} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      <div className="sm:col-span-5">
                        <input
                          type="text"
                          value={sk.skill_name}
                          onChange={(e) => handleUpdateSkill(idx, 'skill_name', e.target.value)}
                          placeholder="Nama Bakat (cth: Guitar, Bass, Emcee, Fotografi)"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <select
                          value={sk.skill_level}
                          onChange={(e) => handleUpdateSkill(idx, 'skill_level', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                        >
                          <option value={SkillLevel.BEGINNER}>Beginner</option>
                          <option value={SkillLevel.INTERMEDIATE}>Intermediate</option>
                          <option value={SkillLevel.ADVANCED}>Advanced</option>
                        </select>
                      </div>
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          value={sk.experience_duration}
                          onChange={(e) => handleUpdateSkill(idx, 'experience_duration', e.target.value)}
                          placeholder="Tempoh (cth: 2 tahun)"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        {studentSkillsList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(idx)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* STEP 2: OPPORTUNITY-SPECIFIC QUESTIONS */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>Soalan Khusus Bagi Peluang: {opportunity.title}</span>
                </div>
                <p className="text-xs text-slate-400">
                  Sila jawab soalan berikut dengan tepat untuk membantu panel penilai membuat saringan awal.
                </p>
              </div>

              {opportunity.questions && opportunity.questions.length > 0 ? (
                <div className="space-y-5">
                  {opportunity.questions
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((q: OpportunityQuestion) => {
                      const qErr = errors[q.question_id];
                      return (
                        <div key={q.question_id} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-2">
                          <label className="block text-sm font-medium text-slate-200">
                            {q.question_text}{' '}
                            {q.is_required && <span className="text-rose-400">*</span>}
                          </label>

                          {q.help_text && (
                            <p className="text-xs text-slate-400">{q.help_text}</p>
                          )}

                          {/* Render question based on type */}
                          {q.question_type === QuestionType.TEXT && (
                            <input
                              type="text"
                              value={responses[q.question_id] || ''}
                              onChange={(e) => handleResponseChange(q.question_id, e.target.value)}
                              placeholder={q.placeholder || 'Tuliskan jawapan anda di sini...'}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          )}

                          {q.question_type === QuestionType.TEXTAREA && (
                            <textarea
                              rows={3}
                              value={responses[q.question_id] || ''}
                              onChange={(e) => handleResponseChange(q.question_id, e.target.value)}
                              placeholder={q.placeholder || 'Terangkan secara ringkas dan padat...'}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          )}

                          {q.question_type === QuestionType.SINGLE_SELECT && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                              {q.options?.map((opt, i) => {
                                const isSelected = responses[q.question_id] === opt;
                                return (
                                  <button
                                    type="button"
                                    key={i}
                                    onClick={() => handleResponseChange(q.question_id, opt)}
                                    className={`text-left text-xs px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between ${
                                      isSelected
                                        ? 'bg-blue-600/20 border-blue-500 text-blue-200 font-medium'
                                        : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                                    }`}
                                  >
                                    <span>{opt}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {q.question_type === QuestionType.MULTI_SELECT && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                              {q.options?.map((opt, i) => {
                                const currentArr: string[] = responses[q.question_id] || [];
                                const isSelected = currentArr.includes(opt);
                                return (
                                  <button
                                    type="button"
                                    key={i}
                                    onClick={() => {
                                      const updated = isSelected
                                        ? currentArr.filter(item => item !== opt)
                                        : [...currentArr, opt];
                                      handleResponseChange(q.question_id, updated);
                                    }}
                                    className={`text-left text-xs px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between ${
                                      isSelected
                                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 font-medium'
                                        : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                                    }`}
                                  >
                                    <span>{opt}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {(q.question_type === QuestionType.URL || q.question_type === QuestionType.VIDEO_LINK) && (
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                {q.question_type === QuestionType.VIDEO_LINK ? (
                                  <Video className="w-4 h-4 text-blue-400" />
                                ) : (
                                  <LinkIcon className="w-4 h-4 text-blue-400" />
                                )}
                              </div>
                              <input
                                type="url"
                                value={responses[q.question_id] || ''}
                                onChange={(e) => handleResponseChange(q.question_id, e.target.value)}
                                placeholder={q.placeholder || 'https://youtu.be/... atau Google Drive link'}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          )}

                          {q.question_type === QuestionType.BOOLEAN && (
                            <label className="flex items-start space-x-3 cursor-pointer p-2 rounded-lg hover:bg-slate-900/50 transition-colors">
                              <input
                                type="checkbox"
                                checked={Boolean(responses[q.question_id])}
                                onChange={(e) => handleResponseChange(q.question_id, e.target.checked)}
                                className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-500 mt-0.5"
                              />
                              <span className="text-xs text-slate-300 leading-relaxed">
                                Ya, saya mengesahkan dan bersetuju dengan syarat di atas.
                              </span>
                            </label>
                          )}

                          {qErr && <p className="text-xs text-rose-400 mt-1">{qErr}</p>}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="bg-slate-950 p-6 rounded-xl text-center text-slate-400 text-sm">
                  Tiada soalan tambahan diperlukan untuk peluang ini. Anda boleh teruskan ke semakan.
                </div>
              )}
            </div>
          )}

          {/* STEP 3: REVIEW & SES 4.4 DATA INTEGRITY SUMMARY */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-4 flex items-start space-x-3">
                <ShieldAlert className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-200 leading-relaxed">
                  <span className="font-semibold text-emerald-300">Pengesahan Integriti Data (SES 4.4):</span> Semua data telah dinormalisasi mengikut standard KPMBP (Format Huruf Besar, ID Berstruktur, dan Nombor Telefon Sah) sebelum disimpan ke dalam pangkalan data.
                </div>
              </div>

              {/* Student Summary Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 pb-2">
                  1. Maklumat Profil Pelajar (Student Master)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2.5 gap-x-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">ID Pelajar:</span>
                    <span className="font-mono text-white font-semibold">{normalizeStudentIdNumber(studentIdInput).normalized}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Nama Penuh:</span>
                    <span className="text-white font-medium">{normalizeFullName(fullName)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Nama Panggilan:</span>
                    <span className="text-white">{preferredName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Program &amp; Sem:</span>
                    <span className="text-white">{programme} (Sem {semester})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Kelas:</span>
                    <span className="font-mono text-white">{className.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">WhatsApp:</span>
                    <span className="font-mono text-white">{normalizePhone(phone).normalized}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block">E-mel Rasmi:</span>
                    <span className="text-white lowercase">{normalizeEmail(email).normalized}</span>
                  </div>
                </div>

                {/* Skills tags */}
                <div className="pt-2 border-t border-slate-900">
                  <span className="text-slate-500 text-xs block mb-1.5">Bakat Didaftarkan:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {studentSkillsList.filter(s => s.skill_name.trim()).map((s, i) => (
                      <span key={i} className="text-[11px] bg-slate-800 border border-slate-700 text-slate-200 px-2 py-0.5 rounded-md">
                        {s.skill_name} <span className="text-amber-400 font-semibold">({s.skill_level})</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Opportunity Responses Summary */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 pb-2">
                  2. Respons Bagi Peluang: {opportunity.title}
                </h3>
                {opportunity.questions && opportunity.questions.length > 0 ? (
                  <div className="space-y-3 text-xs">
                    {opportunity.questions.map((q) => {
                      const val = responses[q.question_id];
                      let displayVal = 'Tidak diisi';
                      if (val === true) displayVal = 'Disahkan (Setuju)';
                      else if (val === false) displayVal = 'Tidak';
                      else if (Array.isArray(val)) displayVal = val.join(', ');
                      else if (val) displayVal = String(val);

                      return (
                        <div key={q.question_id} className="border-b border-slate-900 pb-2">
                          <span className="text-slate-400 block font-medium">{q.question_text}</span>
                          <span className="text-white font-medium mt-0.5 block break-all">
                            {displayVal}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Tiada soalan tambahan.</p>
                )}
              </div>

            </div>
          )}

          {/* STEP 4: SUCCESS CONFIRMATION */}
          {step === 4 && (
            <div className="py-8 text-center space-y-5">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/30">
                <Check className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
                  Permohonan Berjaya Diterima
                </span>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Terima Kasih, {preferredName || fullName.split(' ')[0]}!
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Permohonan anda untuk <span className="text-white font-medium">{opportunity.title}</span> telah dimasukkan ke dalam sistem saringan panel penilai KPMBP.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 max-w-sm mx-auto text-left space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">No. Rujukan Permohonan:</span>
                  <span className="font-mono text-blue-400 font-bold">{successAppId}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Status Permohonan:</span>
                  <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-medium text-[10px]">
                    SUBMITTED (MENUNGGU SARINGAN)
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  id="btn-finish-application"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all"
                >
                  Tutup &amp; Kembali ke Peluang
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation Buttons */}
        {step < 4 && (
          <div className="bg-slate-950/80 border-t border-slate-800 px-6 py-4 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                id="btn-prev-step"
                onClick={() => setStep(step - 1)}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                id="btn-next-step"
                onClick={handleNextStep}
                className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all"
              >
                <span>Seterusnya</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                id="btn-submit-application"
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span>Menghantar...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Hantar Permohonan</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
