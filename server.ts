import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  Student,
  Category,
  Skill,
  StudentSkill,
  Opportunity,
  OpportunityQuestion,
  Application,
  ApplicationResponse,
  ApplicationStatusHistory,
  AdminNote,
  Invitation,
  ParticipationRecord,
  SkillLevel,
  OpportunityStatus,
  ApplicationStatus,
  QuestionType,
  AdminRole,
  AdminUser,
} from './src/types.ts';
import {
  normalizeFullName,
  normalizeStudentIdNumber,
  normalizePhone,
  normalizeEmail,
  generateSlug,
  validateSlug,
} from './src/lib/normalization.ts';

// -------------------------------------------------------------
// RELATIONAL DATA STORE (IN-MEMORY WITH HIGH INTEGRITY)
// -------------------------------------------------------------

const categories: Category[] = [
  { category_id: 'cat-music', name: 'Music', slug: 'music', description: 'Bakat vokal, instrumen dan persembahan muzik kolej', icon: 'Music', created_at: '2026-01-01T00:00:00Z' },
  { category_id: 'cat-speaking', name: 'Public Speaking', slug: 'public-speaking', description: 'Pidato, debat, forum, pengacaraan majlis (Emcee) dan pembentangan', icon: 'Mic', created_at: '2026-01-01T00:00:00Z' },
  { category_id: 'cat-creative', name: 'Creative & Media', slug: 'creative-media', description: 'Teater, tarian, fotografi, videografi, rekaan grafik dan penciptaan kandungan', icon: 'Palette', created_at: '2026-01-01T00:00:00Z' },
  { category_id: 'cat-csr', name: 'CSR / Community', slug: 'csr-community', description: 'Sukarelawan, khidmat komuniti, outreach dan program sosial', icon: 'HeartHandshake', created_at: '2026-01-01T00:00:00Z' },
  { category_id: 'cat-comp', name: 'Competition', slug: 'competition', description: 'Pertandingan akademik, inovasi, sukan dan kemahiran', icon: 'Trophy', created_at: '2026-01-01T00:00:00Z' },
  { category_id: 'cat-rep', name: 'College Representation', slug: 'college-representation', description: 'Wakil rasmi delegasi, duta pelajar, protokol dan duta kolej', icon: 'Award', created_at: '2026-01-01T00:00:00Z' },
];

const skills: Skill[] = [
  // Music
  { skill_id: 'sk-guitar', skill_name: 'Guitar', category_id: 'cat-music', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { skill_id: 'sk-bass', skill_name: 'Bass', category_id: 'cat-music', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { skill_id: 'sk-vocal', skill_name: 'Vocal', category_id: 'cat-music', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { skill_id: 'sk-keyboard', skill_name: 'Keyboard', category_id: 'cat-music', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { skill_id: 'sk-drum', skill_name: 'Drum', category_id: 'cat-music', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { skill_id: 'sk-band', skill_name: 'Band Ensemble', category_id: 'cat-music', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  // Public Speaking
  { skill_id: 'sk-ps', skill_name: 'Public Speaking', category_id: 'cat-speaking', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { skill_id: 'sk-debate', skill_name: 'Debate', category_id: 'cat-speaking', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { skill_id: 'sk-pidato', skill_name: 'Pidato', category_id: 'cat-speaking', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { skill_id: 'sk-emcee', skill_name: 'Emcee', category_id: 'cat-speaking', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  // Creative
  { skill_id: 'sk-theatre', skill_name: 'Theatre & Acting', category_id: 'cat-creative', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { skill_id: 'sk-dance', skill_name: 'Dance / Zapin', category_id: 'cat-creative', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { skill_id: 'sk-photo', skill_name: 'Photography', category_id: 'cat-creative', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { skill_id: 'sk-video', skill_name: 'Videography', category_id: 'cat-creative', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { skill_id: 'sk-graphic', skill_name: 'Graphic Design', category_id: 'cat-creative', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  // CSR
  { skill_id: 'sk-vol', skill_name: 'Volunteer', category_id: 'cat-csr', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { skill_id: 'sk-comm', skill_name: 'Community Service', category_id: 'cat-csr', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { skill_id: 'sk-lead', skill_name: 'Leadership & Event Mgmt', category_id: 'cat-csr', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
];

let students: Student[] = [
  {
    student_id: 'stu-001',
    student_id_number: 'PDA-2502-011',
    full_name: 'NUR AINA BATRISYIA BINTI ZULHILMI',
    preferred_name: 'Aina',
    programme: 'Diploma in Accounting (DIA)',
    semester: 3,
    class: 'DIA3A',
    gender: 'PEREMPUAN',
    phone: '014-5313756',
    email: 'nuraina.batrisyia@student.kpmbp.edu.my',
    status: 'ACTIVE',
    created_at: '2026-02-10T08:30:00Z',
    updated_at: '2026-02-10T08:30:00Z',
  },
  {
    student_id: 'stu-002',
    student_id_number: 'PDL-2503-040',
    full_name: 'MUHAMMAD FARIS BIN AZMAN',
    preferred_name: 'Faris',
    programme: 'Diploma in Business Studies (DBS)',
    semester: 2,
    class: 'DBS2B',
    gender: 'LELAKI',
    phone: '017-8892143',
    email: 'm.faris@student.kpmbp.edu.my',
    status: 'ACTIVE',
    created_at: '2026-02-12T10:15:00Z',
    updated_at: '2026-02-12T10:15:00Z',
  },
  {
    student_id: 'stu-003',
    student_id_number: 'PLC-2602-015',
    full_name: 'SITI SARAH BINTI KHAIRUL',
    preferred_name: 'Sarah',
    programme: 'Diploma in Information Technology (DIT)',
    semester: 1,
    class: 'DIT1A',
    gender: 'PEREMPUAN',
    phone: '019-3321908',
    email: 'siti.sarah@student.kpmbp.edu.my',
    status: 'ACTIVE',
    created_at: '2026-02-15T14:20:00Z',
    updated_at: '2026-02-15T14:20:00Z',
  },
  {
    student_id: 'stu-004',
    student_id_number: 'PDA-2401-088',
    full_name: 'DANISH HAIKAL BIN KAMARUDDIN',
    preferred_name: 'Danish',
    programme: 'Diploma in Accounting (DIA)',
    semester: 4,
    class: 'DIA4B',
    gender: 'LELAKI',
    phone: '012-7649801',
    email: 'danish.haikal@student.kpmbp.edu.my',
    status: 'ACTIVE',
    created_at: '2026-01-20T09:00:00Z',
    updated_at: '2026-01-20T09:00:00Z',
  },
];

let studentSkills: StudentSkill[] = [
  // Aina: Guitar (Adv, Primary), Bass (Int), Public Speaking (Int)
  { student_skill_id: 'ss-001', student_id: 'stu-001', skill_id: 'sk-guitar', skill_level: SkillLevel.ADVANCED, experience_duration: '3 tahun (Gitar Utama Band Sekolah)', is_primary: true, created_at: '2026-02-10T08:30:00Z', updated_at: '2026-02-10T08:30:00Z' },
  { student_skill_id: 'ss-002', student_id: 'stu-001', skill_id: 'sk-bass', skill_level: SkillLevel.INTERMEDIATE, experience_duration: '1.5 tahun', is_primary: false, created_at: '2026-02-10T08:30:00Z', updated_at: '2026-02-10T08:30:00Z' },
  { student_skill_id: 'ss-003', student_id: 'stu-001', skill_id: 'sk-ps', skill_level: SkillLevel.INTERMEDIATE, experience_duration: 'Pembentang kelas cemerlang', is_primary: false, created_at: '2026-02-10T08:30:00Z', updated_at: '2026-02-10T08:30:00Z' },
  // Faris: Drum (Adv, Primary), Bass (Adv), Event Mgmt (Int)
  { student_skill_id: 'ss-004', student_id: 'stu-002', skill_id: 'sk-drum', skill_level: SkillLevel.ADVANCED, experience_duration: '4 tahun', is_primary: true, created_at: '2026-02-12T10:15:00Z', updated_at: '2026-02-12T10:15:00Z' },
  { student_skill_id: 'ss-005', student_id: 'stu-002', skill_id: 'sk-bass', skill_level: SkillLevel.ADVANCED, experience_duration: '2 tahun', is_primary: false, created_at: '2026-02-12T10:15:00Z', updated_at: '2026-02-12T10:15:00Z' },
  // Sarah: Emcee (Adv, Primary), Public Speaking (Adv), Pidato (Int)
  { student_skill_id: 'ss-006', student_id: 'stu-003', skill_id: 'sk-emcee', skill_level: SkillLevel.ADVANCED, experience_duration: 'Pengerusi Majlis Rasmi Sekolah & Kolej', is_primary: true, created_at: '2026-02-15T14:20:00Z', updated_at: '2026-02-15T14:20:00Z' },
  { student_skill_id: 'ss-007', student_id: 'stu-003', skill_id: 'sk-ps', skill_level: SkillLevel.ADVANCED, experience_duration: 'Naib Johan Pidato Negeri Johor 2024', is_primary: false, created_at: '2026-02-15T14:20:00Z', updated_at: '2026-02-15T14:20:00Z' },
  // Danish: Photography (Adv, Primary), Videography (Adv)
  { student_skill_id: 'ss-008', student_id: 'stu-004', skill_id: 'sk-photo', skill_level: SkillLevel.ADVANCED, experience_duration: 'Freelance & Kelab Media KPMBP', is_primary: true, created_at: '2026-01-20T09:00:00Z', updated_at: '2026-01-20T09:00:00Z' },
  { student_skill_id: 'ss-009', student_id: 'stu-004', skill_id: 'sk-video', skill_level: SkillLevel.ADVANCED, experience_duration: 'Editor Premiere Pro / DaVinci', is_primary: false, created_at: '2026-01-20T09:00:00Z', updated_at: '2026-01-20T09:00:00Z' },
];

let opportunities: Opportunity[] = [
  {
    opportunity_id: 'opp-001',
    title: 'LEGACY BAND 2026',
    slug: 'legacy-band-2026',
    category_id: 'cat-music',
    description: 'Pencarian bakat pemuzik berbakat KPMBP bagi barisan Legacy Band sesi 2026/2027. Pelajar terpilih akan mewakili kolej dalam acara rasmi, festival muzik antara institusi, konsert SOAR, dan persembahan kebangsaan.',
    open_call_roles: ['Guitar', 'Bass', 'Vocal', 'Keyboard', 'Drum'],
    requirements: [
      { requirement_id: 'req-1', skill_name: 'Guitar / Bass / Vocal / Keyboard / Drum', minimum_level: SkillLevel.INTERMEDIATE, is_required: true, notes: 'Mempunyai kemahiran asas hingga lanjutan dalam instrumen pilihan.' },
      { requirement_id: 'req-2', is_required: true, notes: 'Komitmen latihan mingguan & disiplin masa yang tinggi.' },
      { requirement_id: 'req-3', is_required: false, notes: 'Kelebihan jika boleh menguasai instrumen sekunder (cth: Guitar + Bass).' },
    ],
    opening_date: '2026-08-01T08:00:00Z',
    closing_date: '2026-09-01T22:00:00Z',
    status: OpportunityStatus.OPEN,
    max_applicants: 50,
    banner_tag: 'PILOT CALL 2026',
    created_by: 'adm-001',
    created_at: '2026-08-01T08:00:00Z',
    updated_at: '2026-08-01T08:00:00Z',
  },
  {
    opportunity_id: 'opp-002',
    title: 'KPMBP PUBLIC SPEAKING TEAM 2026',
    slug: 'public-speaking-2026',
    category_id: 'cat-speaking',
    description: 'Panggilan terbuka barisan pendebat, pemidato, dan pengacara majlis rasmi KPMBP untuk mewakili kolej dalam kejohanan debat kebangsaan serta acara rasmi konvokesyen dan majlis korporat kolej.',
    open_call_roles: ['Public Speaking', 'Debate', 'Pidato', 'Emcee'],
    requirements: [
      { requirement_id: 'req-4', skill_name: 'Public Speaking / Emcee', minimum_level: SkillLevel.INTERMEDIATE, is_required: true, notes: 'Kelancaran pengucapan dalam Bahasa Melayu atau Bahasa Inggeris.' },
      { requirement_id: 'req-5', is_required: true, notes: 'Keyakinan pentas tinggi dan personaliti kemas.' },
    ],
    opening_date: '2026-08-10T09:00:00Z',
    closing_date: '2026-09-15T23:59:00Z',
    status: OpportunityStatus.OPEN,
    created_by: 'adm-001',
    created_at: '2026-08-10T09:00:00Z',
    updated_at: '2026-08-10T09:00:00Z',
  },
  {
    opportunity_id: 'opp-003',
    title: 'CSR KOMUNITI PRIHATIN BANDAR PENAWAR 2026',
    slug: 'csr-komuniti-2026',
    category_id: 'cat-csr',
    description: 'Panggilan sukarelawan mahasiswa KPMBP bagi program jangkauan komuniti, khidmat bakti masyarakat luar bandar, santunan anak yatim, dan inisiatif pemuliharaan pantai.',
    open_call_roles: ['Volunteer', 'Community Service', 'Logistics', 'Facilitator'],
    requirements: [
      { requirement_id: 'req-6', is_required: true, notes: 'Semangat kesukarelawanan tinggi dan fizikal sihat.' },
      { requirement_id: 'req-7', is_required: true, notes: 'Boleh hadir sesi taklimat dan hari pelaksanaan program.' },
    ],
    opening_date: '2026-08-15T08:00:00Z',
    closing_date: '2026-09-20T23:59:00Z',
    status: OpportunityStatus.OPEN,
    created_by: 'adm-001',
    created_at: '2026-08-15T08:00:00Z',
    updated_at: '2026-08-15T08:00:00Z',
  },
];

let opportunityQuestions: OpportunityQuestion[] = [
  // Legacy Band Questions
  {
    question_id: 'q-lb-1',
    opportunity_id: 'opp-001',
    question_text: 'Instrumen Utama yang Dipohon',
    question_type: QuestionType.SINGLE_SELECT,
    is_required: true,
    sort_order: 1,
    options: ['Lead Guitar', 'Rhythm Guitar', 'Bass Guitar', 'Lead Vocal', 'Keyboard / Synth', 'Drum / Percussion'],
    created_at: '2026-08-01T08:00:00Z',
    updated_at: '2026-08-01T08:00:00Z',
  },
  {
    question_id: 'q-lb-2',
    opportunity_id: 'opp-001',
    question_text: 'Tahap Kemahiran & Pengalaman Bermuzik',
    question_type: QuestionType.SINGLE_SELECT,
    is_required: true,
    sort_order: 2,
    options: ['Beginner (Kurang 1 tahun)', 'Intermediate (1 - 3 tahun / Pernah main band pentas)', 'Advanced (3+ tahun / Berpengalaman band pertandingan/rakaman)'],
    created_at: '2026-08-01T08:00:00Z',
    updated_at: '2026-08-01T08:00:00Z',
  },
  {
    question_id: 'q-lb-3',
    opportunity_id: 'opp-001',
    question_text: 'Instrumen Tambahan / Kebolehan Sekunder',
    question_type: QuestionType.TEXTAREA,
    placeholder: 'Contoh: Saya pemain Gitar utama tetapi mahir bermain Bass dan boleh menyanyi vokal latar...',
    help_text: 'Nyatakan instrumen tambahan yang anda boleh main jika formasi band memerlukan.',
    is_required: false,
    sort_order: 3,
    created_at: '2026-08-01T08:00:00Z',
    updated_at: '2026-08-01T08:00:00Z',
  },
  {
    question_id: 'q-lb-4',
    opportunity_id: 'opp-001',
    question_text: 'Pautan Video Uji Bakat / Demo Rakaman',
    question_type: QuestionType.VIDEO_LINK,
    placeholder: 'https://youtu.be/... atau pautan Google Drive terbuka',
    help_text: 'Sertakan pautan video (1-3 minit) anda memainkan lagu atau solo instrumen pilihan.',
    is_required: true,
    sort_order: 4,
    created_at: '2026-08-01T08:00:00Z',
    updated_at: '2026-08-01T08:00:00Z',
  },
  {
    question_id: 'q-lb-5',
    opportunity_id: 'opp-001',
    question_text: 'Saya bersedia memberikan komitmen latihan mingguan dan mematuhi etika persembahan kolej.',
    question_type: QuestionType.BOOLEAN,
    is_required: true,
    sort_order: 5,
    created_at: '2026-08-01T08:00:00Z',
    updated_at: '2026-08-01T08:00:00Z',
  },

  // Public Speaking Questions
  {
    question_id: 'q-ps-1',
    opportunity_id: 'opp-002',
    question_text: 'Kategori Pengucapan Pilihan',
    question_type: QuestionType.SINGLE_SELECT,
    is_required: true,
    sort_order: 1,
    options: ['Public Speaking (Bahasa Inggeris)', 'Pidato (Bahasa Melayu)', 'Debat Antara IPT', 'Pengacara Majlis (Emcee Rasmi)'],
    created_at: '2026-08-10T09:00:00Z',
    updated_at: '2026-08-10T09:00:00Z',
  },
  {
    question_id: 'q-ps-2',
    opportunity_id: 'opp-002',
    question_text: 'Pengalaman & Pencapaian Terdahulu',
    question_type: QuestionType.TEXTAREA,
    placeholder: 'Senaraikan pengalaman, jawatan atau anugerah pengucapan awam di peringkat sekolah/kolej...',
    is_required: true,
    sort_order: 2,
    created_at: '2026-08-10T09:00:00Z',
    updated_at: '2026-08-10T09:00:00Z',
  },
  {
    question_id: 'q-ps-3',
    opportunity_id: 'opp-002',
    question_text: 'Pautan Video Contoh Pengucapan (1 - 2 Minit)',
    question_type: QuestionType.VIDEO_LINK,
    placeholder: 'https://drive.google.com/... atau YouTube',
    is_required: true,
    sort_order: 3,
    created_at: '2026-08-10T09:00:00Z',
    updated_at: '2026-08-10T09:00:00Z',
  },

  // CSR Questions
  {
    question_id: 'q-csr-1',
    opportunity_id: 'opp-003',
    question_text: 'Pengalaman Sukarelawan & Khidmat Komuniti',
    question_type: QuestionType.TEXTAREA,
    placeholder: 'Ceritakan pengalaman penglibatan aktiviti kebajikan atau kelab sebelum ini...',
    is_required: true,
    sort_order: 1,
    created_at: '2026-08-15T08:00:00Z',
    updated_at: '2026-08-15T08:00:00Z',
  },
  {
    question_id: 'q-csr-2',
    opportunity_id: 'opp-003',
    question_text: 'Peranan / Skop Sumbangan Utama',
    question_type: QuestionType.MULTI_SELECT,
    is_required: true,
    sort_order: 2,
    options: ['Fasilitator Aktiviti', 'Logistik & Teknikal', 'Fotografi & Media', 'Katering & Makanan', 'Pendaftaran & Keselamatan'],
    created_at: '2026-08-15T08:00:00Z',
    updated_at: '2026-08-15T08:00:00Z',
  },
];

let applications: Application[] = [
  {
    application_id: 'app-001',
    student_id: 'stu-001',
    opportunity_id: 'opp-001',
    status: ApplicationStatus.SCREENING,
    submitted_at: '2026-08-20T11:30:00Z',
    updated_at: '2026-08-21T09:15:00Z',
    reviewed_by: 'adm-001',
    reviewed_at: '2026-08-21T09:15:00Z',
    admin_notes: 'Pemain gitar berkebolehan tinggi, timing kemas. Kemahiran Bass juga mantap.',
  },
  {
    application_id: 'app-002',
    student_id: 'stu-002',
    opportunity_id: 'opp-001',
    status: ApplicationStatus.SHORTLISTED,
    submitted_at: '2026-08-22T14:00:00Z',
    updated_at: '2026-08-24T16:00:00Z',
    reviewed_by: 'adm-001',
    reviewed_at: '2026-08-24T16:00:00Z',
    admin_notes: 'Pemain drum agresif dan berdisiplin. Sedia untuk sesi trial.',
  },
  {
    application_id: 'app-003',
    student_id: 'stu-003',
    opportunity_id: 'opp-002',
    status: ApplicationStatus.SELECTED,
    submitted_at: '2026-08-18T10:00:00Z',
    updated_at: '2026-08-25T11:00:00Z',
    reviewed_by: 'adm-001',
    reviewed_at: '2026-08-25T11:00:00Z',
    admin_notes: 'Dicalonkan sebagai Pengacara Utama Majlis Anugerah Kecemerlangan KPMBP.',
  },
];

let applicationResponses: ApplicationResponse[] = [
  { response_id: 'resp-001', application_id: 'app-001', question_id: 'q-lb-1', response_value: 'Lead Guitar', created_at: '2026-08-20T11:30:00Z', updated_at: '2026-08-20T11:30:00Z' },
  { response_id: 'resp-002', application_id: 'app-001', question_id: 'q-lb-2', response_value: 'Advanced (3+ tahun / Berpengalaman band pertandingan/rakaman)', created_at: '2026-08-20T11:30:00Z', updated_at: '2026-08-20T11:30:00Z' },
  { response_id: 'resp-003', application_id: 'app-001', question_id: 'q-lb-3', response_value: 'Boleh cover Bass jika diperlukan, serta boleh menyanyi back-up vocal harmoni.', created_at: '2026-08-20T11:30:00Z', updated_at: '2026-08-20T11:30:00Z' },
  { response_id: 'resp-004', application_id: 'app-001', question_id: 'q-lb-4', response_value: 'https://youtube.com/watch?v=demo-aina-lead-guitar', created_at: '2026-08-20T11:30:00Z', updated_at: '2026-08-20T11:30:00Z' },
  { response_id: 'resp-005', application_id: 'app-001', question_id: 'q-lb-5', response_value: true, created_at: '2026-08-20T11:30:00Z', updated_at: '2026-08-20T11:30:00Z' },

  { response_id: 'resp-006', application_id: 'app-002', question_id: 'q-lb-1', response_value: 'Drum / Percussion', created_at: '2026-08-22T14:00:00Z', updated_at: '2026-08-22T14:00:00Z' },
  { response_id: 'resp-007', application_id: 'app-002', question_id: 'q-lb-2', response_value: 'Advanced (3+ tahun / Berpengalaman band pertandingan/rakaman)', created_at: '2026-08-22T14:00:00Z', updated_at: '2026-08-22T14:00:00Z' },
  { response_id: 'resp-008', application_id: 'app-002', question_id: 'q-lb-4', response_value: 'https://youtube.com/watch?v=demo-faris-drum-groove', created_at: '2026-08-22T14:00:00Z', updated_at: '2026-08-22T14:00:00Z' },
  { response_id: 'resp-009', application_id: 'app-002', question_id: 'q-lb-5', response_value: true, created_at: '2026-08-22T14:00:00Z', updated_at: '2026-08-22T14:00:00Z' },

  { response_id: 'resp-010', application_id: 'app-003', question_id: 'q-ps-1', response_value: 'Pengacara Majlis (Emcee Rasmi)', created_at: '2026-08-18T10:00:00Z', updated_at: '2026-08-18T10:00:00Z' },
  { response_id: 'resp-011', application_id: 'app-003', question_id: 'q-ps-2', response_value: 'Emcee Majlis Perasmian Minggu Destinasi Siswa KPMBP, Naib Johan Pidato Negeri Johor 2024.', created_at: '2026-08-18T10:00:00Z', updated_at: '2026-08-18T10:00:00Z' },
  { response_id: 'resp-012', application_id: 'app-003', question_id: 'q-ps-3', response_value: 'https://drive.google.com/file/d/siti-sarah-emcee-sample', created_at: '2026-08-18T10:00:00Z', updated_at: '2026-08-18T10:00:00Z' },
];

let applicationStatusHistory: ApplicationStatusHistory[] = [
  { history_id: 'h-001', application_id: 'app-001', old_status: null, new_status: ApplicationStatus.SUBMITTED, changed_by: 'SISTEM', changed_at: '2026-08-20T11:30:00Z', remarks: 'Permohonan dihantar oleh pelajar.' },
  { history_id: 'h-002', application_id: 'app-001', old_status: ApplicationStatus.SUBMITTED, new_status: ApplicationStatus.SCREENING, changed_by: 'Admin KPMBP (En. Zulkifli)', changed_at: '2026-08-21T09:15:00Z', remarks: 'Penapisan video uji bakat & semakan instrumen.' },

  { history_id: 'h-003', application_id: 'app-002', old_status: null, new_status: ApplicationStatus.SUBMITTED, changed_by: 'SISTEM', changed_at: '2026-08-22T14:00:00Z', remarks: 'Permohonan dihantar.' },
  { history_id: 'h-004', application_id: 'app-002', old_status: ApplicationStatus.SUBMITTED, new_status: ApplicationStatus.SCREENING, changed_by: 'Admin KPMBP', changed_at: '2026-08-23T10:00:00Z', remarks: 'Video drum disemak.' },
  { history_id: 'h-005', application_id: 'app-002', old_status: ApplicationStatus.SCREENING, new_status: ApplicationStatus.INTERVIEW, changed_by: 'Admin KPMBP', changed_at: '2026-08-24T10:00:00Z', remarks: 'Dipanggil sesi temuduga & audisi fizikal di Studio Muzik.' },
  { history_id: 'h-006', application_id: 'app-002', old_status: ApplicationStatus.INTERVIEW, new_status: ApplicationStatus.SHORTLISTED, changed_by: 'Admin KPMBP', changed_at: '2026-08-24T16:00:00Z', remarks: 'Disenarai pendek untuk posisi Drummer Utama.' },

  { history_id: 'h-007', application_id: 'app-003', old_status: null, new_status: ApplicationStatus.SUBMITTED, changed_by: 'SISTEM', changed_at: '2026-08-18T10:00:00Z' },
  { history_id: 'h-008', application_id: 'app-003', old_status: ApplicationStatus.SUBMITTED, new_status: ApplicationStatus.SHORTLISTED, changed_by: 'Admin KPMBP', changed_at: '2026-08-20T14:00:00Z' },
  { history_id: 'h-009', application_id: 'app-003', old_status: ApplicationStatus.SHORTLISTED, new_status: ApplicationStatus.SELECTED, changed_by: 'Admin KPMBP', changed_at: '2026-08-25T11:00:00Z', remarks: 'Pengesahan lantikan Emcee Rasmi KPMBP.' },
];

let adminNotes: AdminNote[] = [
  { note_id: 'an-001', application_id: 'app-001', admin_id: 'adm-001', admin_name: 'En. Zulkifli (Ketua Penasihat Kebudayaan)', note: 'Bakat gitar yang sangat versatil. Cadangan: Uji gandingan dengan Faris dalam sesi studio.', created_at: '2026-08-21T09:15:00Z' },
  { note_id: 'an-002', application_id: 'app-002', admin_id: 'adm-001', admin_name: 'En. Zulkifli', note: 'Mempunyai tempo dan dinamik yang solid. Kehadiran latihan sebelum ini sangat cemerlang.', created_at: '2026-08-24T16:00:00Z' },
];

let invitations: Invitation[] = [
  {
    invitation_id: 'inv-001',
    student_id: 'stu-001',
    opportunity_id: 'opp-002',
    invited_by: 'adm-001',
    invited_by_name: 'Pentadbir Unit Bakat KPMBP',
    status: 'PENDING',
    notes: 'Berdasarkan kemahiran Public Speaking anda, Admin menjemput anda menyertai Public Speaking Team.',
    created_at: '2026-08-26T10:00:00Z',
  }
];

let participationHistory: ParticipationRecord[] = [
  { participation_id: 'part-001', student_id: 'stu-001', opportunity_id: 'opp-past-01', opportunity_title: 'KONSERT SOAR 2025', category: 'Music', role_achieved: 'Rhythm Guitarist', year: 2025, status: 'COMPLETED', verified_at: '2025-11-15T00:00:00Z' },
  { participation_id: 'part-002', student_id: 'stu-003', opportunity_id: 'opp-past-02', opportunity_title: 'MAJLIS KONVOKESYEN KPMBP KE-18', category: 'College Representation', role_achieved: 'Pengerusi Majlis Sidang 1', year: 2025, status: 'COMPLETED', verified_at: '2025-10-20T00:00:00Z' },
];

const adminUsers: AdminUser[] = [
  {
    admin_id: 'adm-001',
    name: 'Pentadbiran Hal Ehwal Pelajar & Pembangunan Bakat KPMBP',
    email: 'admin.bakat@kpmbp.edu.my',
    role: AdminRole.SUPER_ADMIN,
    department: 'Unit Kebudayaan, Sukan & Kepimpinan Pelajar',
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
];

// Helper to assemble full student details with their skills
function getStudentWithSkills(student: Student) {
  const sSkills = studentSkills
    .filter(ss => ss.student_id === student.student_id)
    .map(ss => {
      const sk = skills.find(s => s.skill_id === ss.skill_id);
      const cat = categories.find(c => c.category_id === sk?.category_id);
      return {
        ...ss,
        skill_name: sk?.skill_name || 'Bakat Tidak Dikenali',
        category_name: cat?.name || 'Umum',
      };
    });
  return {
    ...student,
    skills: sSkills,
  };
}

// -------------------------------------------------------------
// SERVER INITIALIZATION & API ROUTES
// -------------------------------------------------------------

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // -----------------------------------------------------------
  // 1. CATEGORIES & SKILLS API
  // -----------------------------------------------------------
  app.get('/api/categories', (req: Request, res: Response) => {
    res.json(categories);
  });

  app.get('/api/skills', (req: Request, res: Response) => {
    const enriched = skills.map(sk => {
      const cat = categories.find(c => c.category_id === sk.category_id);
      return {
        ...sk,
        category_name: cat?.name || 'General',
      };
    });
    res.json(enriched);
  });

  // Admin add new skill dynamically
  app.post('/api/skills', (req: Request, res: Response) => {
    const { skill_name, category_id } = req.body;
    if (!skill_name || !category_id) {
      return res.status(400).json({ error: 'Nama kemahiran dan kategori diperlukan.' });
    }
    const newSkill: Skill = {
      skill_id: `sk-${Date.now()}`,
      skill_name: skill_name.trim(),
      category_id,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    skills.push(newSkill);
    res.status(201).json(newSkill);
  });

  // -----------------------------------------------------------
  // 2. OPPORTUNITIES API (PUBLIC & ADMIN)
  // -----------------------------------------------------------
  
  // Public list: only OPEN/published opportunities
  app.get('/api/opportunities', (req: Request, res: Response) => {
    const isAdmin = req.query.admin === 'true';
    const list = opportunities.filter(o => isAdmin || o.status === OpportunityStatus.OPEN);
    
    const enriched = list.map(opp => {
      const cat = categories.find(c => c.category_id === opp.category_id);
      const oppQuestions = opportunityQuestions.filter(q => q.opportunity_id === opp.opportunity_id);
      const appCount = applications.filter(a => a.opportunity_id === opp.opportunity_id).length;
      return {
        ...opp,
        category_name: cat?.name || 'Umum',
        questions: oppQuestions,
        total_applications: appCount,
      };
    });
    res.json(enriched);
  });

  // Lookup by SLUG (Public Entry Point)
  app.get('/api/opportunities/slug/:slug', (req: Request, res: Response) => {
    const { slug } = req.params;
    const cleanSlug = slug.toLowerCase().trim();
    const opp = opportunities.find(o => o.slug === cleanSlug);
    
    if (!opp) {
      return res.status(404).json({ error: `Peluang dengan slug "${slug}" tidak ditemui.` });
    }
    
    const cat = categories.find(c => c.category_id === opp.category_id);
    const oppQuestions = opportunityQuestions
      .filter(q => q.opportunity_id === opp.opportunity_id)
      .sort((a, b) => a.sort_order - b.sort_order);
    const appCount = applications.filter(a => a.opportunity_id === opp.opportunity_id).length;

    res.json({
      ...opp,
      category_name: cat?.name || 'Umum',
      questions: oppQuestions,
      total_applications: appCount,
    });
  });

  // Create Opportunity (Admin)
  app.post('/api/opportunities', (req: Request, res: Response) => {
    const {
      title,
      slug: customSlug,
      category_id,
      description,
      open_call_roles,
      requirements,
      opening_date,
      closing_date,
      status,
      max_applicants,
      questions,
    } = req.body;

    if (!title || !category_id || !closing_date) {
      return res.status(400).json({ error: 'Tajuk, kategori dan tarikh tutup diperlukan.' });
    }

    // Determine and validate slug
    let finalSlug = customSlug ? generateSlug(customSlug) : generateSlug(title);
    const slugValidation = validateSlug(finalSlug);
    if (!slugValidation.isValid) {
      return res.status(400).json({ error: slugValidation.error });
    }

    // Uniqueness Check
    const exists = opportunities.some(o => o.slug === finalSlug);
    if (exists) {
      return res.status(400).json({ error: `Slug "${finalSlug}" telah digunakan. Sila pilih slug lain.` });
    }

    const oppId = `opp-${Date.now()}`;
    const newOpportunity: Opportunity = {
      opportunity_id: oppId,
      title: title.trim(),
      slug: finalSlug,
      category_id,
      description: description?.trim() || '',
      open_call_roles: Array.isArray(open_call_roles) ? open_call_roles : [],
      requirements: Array.isArray(requirements) ? requirements : [],
      opening_date: opening_date || new Date().toISOString(),
      closing_date,
      status: status || OpportunityStatus.OPEN,
      max_applicants: max_applicants ? parseInt(max_applicants, 10) : undefined,
      created_by: 'adm-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    opportunities.push(newOpportunity);

    // Save custom questions if provided
    if (Array.isArray(questions)) {
      questions.forEach((q, idx) => {
        const qId = `q-${Date.now()}-${idx}`;
        opportunityQuestions.push({
          question_id: qId,
          opportunity_id: oppId,
          question_text: q.question_text,
          question_type: q.question_type || QuestionType.TEXT,
          placeholder: q.placeholder,
          help_text: q.help_text,
          is_required: Boolean(q.is_required),
          sort_order: idx + 1,
          options: q.options || [],
          validation_rule: q.validation_rule,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      });
    }

    res.status(201).json(newOpportunity);
  });

  // Update Opportunity (Admin) - Stable slug preserved unless explicitly changed
  app.put('/api/opportunities/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const opp = opportunities.find(o => o.opportunity_id === id);
    if (!opp) {
      return res.status(404).json({ error: 'Peluang tidak ditemui.' });
    }

    const {
      title,
      slug: newSlug,
      category_id,
      description,
      open_call_roles,
      requirements,
      opening_date,
      closing_date,
      status,
      max_applicants,
      questions,
    } = req.body;

    if (newSlug && newSlug !== opp.slug) {
      const formatted = generateSlug(newSlug);
      const exists = opportunities.some(o => o.slug === formatted && o.opportunity_id !== id);
      if (exists) {
        return res.status(400).json({ error: `Slug "${formatted}" telah digunakan.` });
      }
      opp.slug = formatted;
    }

    if (title) opp.title = title.trim();
    if (category_id) opp.category_id = category_id;
    if (description !== undefined) opp.description = description.trim();
    if (open_call_roles) opp.open_call_roles = open_call_roles;
    if (requirements) opp.requirements = requirements;
    if (opening_date) opp.opening_date = opening_date;
    if (closing_date) opp.closing_date = closing_date;
    if (status) opp.status = status;
    if (max_applicants !== undefined) opp.max_applicants = max_applicants ? parseInt(max_applicants, 10) : undefined;
    opp.updated_at = new Date().toISOString();

    // Update questions if provided
    if (Array.isArray(questions)) {
      // Remove old and re-populate
      opportunityQuestions = opportunityQuestions.filter(q => q.opportunity_id !== id);
      questions.forEach((q, idx) => {
        opportunityQuestions.push({
          question_id: q.question_id || `q-${Date.now()}-${idx}`,
          opportunity_id: id,
          question_text: q.question_text,
          question_type: q.question_type || QuestionType.TEXT,
          placeholder: q.placeholder,
          help_text: q.help_text,
          is_required: Boolean(q.is_required),
          sort_order: idx + 1,
          options: q.options || [],
          validation_rule: q.validation_rule,
          created_at: q.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      });
    }

    res.json(opp);
  });

  // -----------------------------------------------------------
  // 3. STUDENTS & TALENT PROFILE API
  // -----------------------------------------------------------
  
  // Student Lookup by ID Number (e.g. PDA-2502-011 or raw pda2502011)
  app.get('/api/students/lookup/:idNumber', (req: Request, res: Response) => {
    const { idNumber } = req.params;
    const { normalized, isValid } = normalizeStudentIdNumber(idNumber);
    if (!isValid) {
      return res.status(400).json({ error: 'Format ID Pelajar tidak sah.' });
    }

    const student = students.find(s => s.student_id_number === normalized);
    if (!student) {
      return res.status(404).json({ message: 'Profil pelajar belum wujud. Pelajar baru.' });
    }

    const fullStudent = getStudentWithSkills(student);
    res.json(fullStudent);
  });

  // Admin Talent Search & Filter
  app.get('/api/students/search', (req: Request, res: Response) => {
    const { skill, level, query, programme, semester } = req.query;

    let results = students.map(s => getStudentWithSkills(s));

    if (query) {
      const q = String(query).toLowerCase().trim();
      results = results.filter(s =>
        s.full_name.toLowerCase().includes(q) ||
        s.student_id_number.toLowerCase().includes(q) ||
        (s.preferred_name && s.preferred_name.toLowerCase().includes(q)) ||
        s.class.toLowerCase().includes(q)
      );
    }

    if (programme) {
      results = results.filter(s => s.programme.toLowerCase().includes(String(programme).toLowerCase()));
    }

    if (semester) {
      results = results.filter(s => s.semester === parseInt(String(semester), 10));
    }

    if (skill) {
      const skQuery = String(skill).toLowerCase().trim();
      results = results.filter(s =>
        s.skills?.some(sk =>
          sk.skill_name.toLowerCase().includes(skQuery) ||
          sk.category_name?.toLowerCase().includes(skQuery)
        )
      );
    }

    if (level) {
      const targetLevel = String(level).toUpperCase();
      results = results.filter(s =>
        s.skills?.some(sk => sk.skill_level === targetLevel)
      );
    }

    res.json(results);
  });

  // Create or Update Student Profile (Reusable Engine)
  app.post('/api/students', (req: Request, res: Response) => {
    const {
      student_id_number,
      full_name,
      preferred_name,
      programme,
      semester,
      class: className,
      gender,
      phone,
      email,
      skills_data,
    } = req.body;

    // Normalizations
    const idCheck = normalizeStudentIdNumber(student_id_number);
    if (!idCheck.isValid) {
      return res.status(400).json({ error: idCheck.error });
    }

    const normName = normalizeFullName(full_name);
    if (!normName || normName.length < 3) {
      return res.status(400).json({ error: 'Nama penuh pelajar sah diperlukan.' });
    }

    const phoneCheck = normalizePhone(phone);
    if (!phoneCheck.isValid) {
      return res.status(400).json({ error: phoneCheck.error });
    }

    const emailCheck = normalizeEmail(email);
    if (!emailCheck.isValid) {
      return res.status(400).json({ error: emailCheck.error });
    }

    let student = students.find(s => s.student_id_number === idCheck.normalized);

    if (student) {
      // Update existing student profile
      student.full_name = normName;
      if (preferred_name) student.preferred_name = preferred_name.trim();
      if (programme) student.programme = programme;
      if (semester) student.semester = parseInt(semester, 10);
      if (className) student.class = className.toUpperCase().trim();
      if (gender) student.gender = gender;
      student.phone = phoneCheck.normalized;
      student.email = emailCheck.normalized;
      student.updated_at = new Date().toISOString();
    } else {
      // Create new student master record
      student = {
        student_id: `stu-${Date.now()}`,
        student_id_number: idCheck.normalized,
        full_name: normName,
        preferred_name: preferred_name ? preferred_name.trim() : undefined,
        programme: programme || 'Diploma KPMBP',
        semester: semester ? parseInt(semester, 10) : 1,
        class: className ? className.toUpperCase().trim() : 'DIA1A',
        gender: gender || 'LELAKI',
        phone: phoneCheck.normalized,
        email: emailCheck.normalized,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      students.push(student);
    }

    // Update student skills if passed
    if (Array.isArray(skills_data)) {
      // Remove old skills
      studentSkills = studentSkills.filter(ss => ss.student_id !== student!.student_id);
      
      skills_data.forEach((sd: any) => {
        let matchedSkill = skills.find(s => s.skill_id === sd.skill_id || s.skill_name.toLowerCase() === (sd.skill_name || '').toLowerCase());
        
        // Auto-create skill if not found
        if (!matchedSkill && sd.skill_name) {
          matchedSkill = {
            skill_id: `sk-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            skill_name: sd.skill_name.trim(),
            category_id: sd.category_id || 'cat-music',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          skills.push(matchedSkill);
        }

        if (matchedSkill) {
          studentSkills.push({
            student_skill_id: `ss-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            student_id: student!.student_id,
            skill_id: matchedSkill.skill_id,
            skill_level: (sd.skill_level as SkillLevel) || SkillLevel.INTERMEDIATE,
            experience_duration: sd.experience_duration,
            is_primary: Boolean(sd.is_primary),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      });
    }

    res.status(200).json(getStudentWithSkills(student));
  });

  // -----------------------------------------------------------
  // 4. APPLICATION & WORKFLOW API (STRICT INTEGRITY)
  // -----------------------------------------------------------
  
  // Submit Application (SES 4.3 Reusable Engine)
  app.post('/api/applications/submit', (req: Request, res: Response) => {
    const {
      opportunity_id,
      student_data, // { student_id_number, full_name, preferred_name, programme, semester, class, gender, phone, email, skills_data }
      responses, // { [question_id]: value }
    } = req.body;

    if (!opportunity_id) {
      return res.status(400).json({ error: 'Opportunity ID diperlukan.' });
    }

    // 1. Verify Opportunity Status and Deadline
    const opp = opportunities.find(o => o.opportunity_id === opportunity_id);
    if (!opp) {
      return res.status(404).json({ error: 'Peluang tidak ditemui.' });
    }

    if (opp.status !== OpportunityStatus.OPEN) {
      return res.status(400).json({ error: `Peluang ini berstatus ${opp.status} dan tidak menerima permohonan baharu.` });
    }

    const now = new Date();
    const closingDate = new Date(opp.closing_date);
    if (now > closingDate) {
      return res.status(400).json({ error: 'Permohonan telah ditutup (tarikh tutup telah tamat).' });
    }

    // Check max applicants if applicable
    if (opp.max_applicants) {
      const currentCount = applications.filter(a => a.opportunity_id === opportunity_id).length;
      if (currentCount >= opp.max_applicants) {
        return res.status(400).json({ error: 'Kapasiti maksimum permohonan untuk peluang ini telah dicapai.' });
      }
    }

    // 2. Normalize and Save / Update Student Master Profile
    const idCheck = normalizeStudentIdNumber(student_data.student_id_number);
    if (!idCheck.isValid) {
      return res.status(400).json({ error: idCheck.error });
    }
    const normName = normalizeFullName(student_data.full_name);
    const phoneCheck = normalizePhone(student_data.phone);
    if (!phoneCheck.isValid) {
      return res.status(400).json({ error: phoneCheck.error });
    }
    const emailCheck = normalizeEmail(student_data.email);
    if (!emailCheck.isValid) {
      return res.status(400).json({ error: emailCheck.error });
    }

    let student = students.find(s => s.student_id_number === idCheck.normalized);
    if (student) {
      student.full_name = normName;
      if (student_data.preferred_name) student.preferred_name = student_data.preferred_name.trim();
      if (student_data.programme) student.programme = student_data.programme;
      if (student_data.semester) student.semester = parseInt(student_data.semester, 10);
      if (student_data.class) student.class = student_data.class.toUpperCase().trim();
      if (student_data.gender) student.gender = student_data.gender;
      student.phone = phoneCheck.normalized;
      student.email = emailCheck.normalized;
      student.updated_at = new Date().toISOString();
    } else {
      student = {
        student_id: `stu-${Date.now()}`,
        student_id_number: idCheck.normalized,
        full_name: normName,
        preferred_name: student_data.preferred_name?.trim(),
        programme: student_data.programme || 'Diploma KPMBP',
        semester: student_data.semester ? parseInt(student_data.semester, 10) : 1,
        class: student_data.class ? student_data.class.toUpperCase().trim() : 'DIA1A',
        gender: student_data.gender || 'LELAKI',
        phone: phoneCheck.normalized,
        email: emailCheck.normalized,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      students.push(student);
    }

    // Save Student Skills if passed
    if (Array.isArray(student_data.skills_data)) {
      student_data.skills_data.forEach((sd: any) => {
        let matchedSkill = skills.find(s => s.skill_id === sd.skill_id || s.skill_name.toLowerCase() === (sd.skill_name || '').toLowerCase());
        if (!matchedSkill && sd.skill_name) {
          matchedSkill = {
            skill_id: `sk-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            skill_name: sd.skill_name.trim(),
            category_id: sd.category_id || opp.category_id,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          skills.push(matchedSkill);
        }
        if (matchedSkill) {
          const existingSS = studentSkills.find(ss => ss.student_id === student!.student_id && ss.skill_id === matchedSkill!.skill_id);
          if (existingSS) {
            existingSS.skill_level = sd.skill_level || existingSS.skill_level;
            existingSS.experience_duration = sd.experience_duration || existingSS.experience_duration;
            existingSS.updated_at = new Date().toISOString();
          } else {
            studentSkills.push({
              student_skill_id: `ss-${Date.now()}-${Math.floor(Math.random()*1000)}`,
              student_id: student!.student_id,
              skill_id: matchedSkill.skill_id,
              skill_level: sd.skill_level || SkillLevel.INTERMEDIATE,
              experience_duration: sd.experience_duration,
              is_primary: Boolean(sd.is_primary),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
      });
    }

    // 3. Prevent Duplicate Applications for the Same Student + Opportunity
    const duplicateApp = applications.find(a => a.student_id === student!.student_id && a.opportunity_id === opportunity_id);
    if (duplicateApp) {
      return res.status(400).json({
        error: 'Anda telah menghantar permohonan untuk peluang ini.',
        existing_application_id: duplicateApp.application_id,
      });
    }

    // 4. Create Application Master Record
    const appId = `app-${Date.now()}`;
    const newApplication: Application = {
      application_id: appId,
      student_id: student.student_id,
      opportunity_id,
      status: ApplicationStatus.SUBMITTED,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    applications.push(newApplication);

    // 5. Save Opportunity-Specific Responses (Separate Entity)
    if (responses && typeof responses === 'object') {
      Object.entries(responses).forEach(([qId, val]) => {
        applicationResponses.push({
          response_id: `resp-${Date.now()}-${Math.floor(Math.random()*1000)}`,
          application_id: appId,
          question_id: qId,
          response_value: val as any,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      });
    }

    // 6. Record Status History Audit Trail
    applicationStatusHistory.push({
      history_id: `h-${Date.now()}`,
      application_id: appId,
      old_status: null,
      new_status: ApplicationStatus.SUBMITTED,
      changed_by: 'SISTEM',
      changed_at: new Date().toISOString(),
      remarks: 'Permohonan lengkap diterima melalui portal awam.',
    });

    res.status(201).json({
      message: 'Permohonan anda telah berjaya dihantar!',
      application_id: appId,
      opportunity_title: opp.title,
      student_name: student.full_name,
    });
  });

  // Get Applications (Admin or by Student ID)
  app.get('/api/applications', (req: Request, res: Response) => {
    const { opportunity_id, student_id_number, status } = req.query;

    let list = [...applications];

    if (opportunity_id) {
      list = list.filter(a => a.opportunity_id === String(opportunity_id));
    }

    if (status) {
      list = list.filter(a => a.status === String(status));
    }

    if (student_id_number) {
      const { normalized } = normalizeStudentIdNumber(String(student_id_number));
      const stu = students.find(s => s.student_id_number === normalized);
      if (stu) {
        list = list.filter(a => a.student_id === stu.student_id);
      } else {
        return res.json([]);
      }
    }

    // Enrich each application
    const enriched = list.map(appItem => {
      const student = students.find(s => s.student_id === appItem.student_id);
      const opp = opportunities.find(o => o.opportunity_id === appItem.opportunity_id);
      const appResps = applicationResponses
        .filter(r => r.application_id === appItem.application_id)
        .map(r => {
          const q = opportunityQuestions.find(qItem => qItem.question_id === r.question_id);
          return {
            ...r,
            question_text: q?.question_text || 'Soalan',
          };
        });
      const history = applicationStatusHistory
        .filter(h => h.application_id === appItem.application_id)
        .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
      const notes = adminNotes.filter(n => n.application_id === appItem.application_id);

      return {
        ...appItem,
        student: student ? getStudentWithSkills(student) : undefined,
        opportunity: opp,
        responses: appResps,
        status_history: history,
        notes_list: notes,
      };
    });

    res.json(enriched);
  });

  // Admin Change Application Status (Workflow Progression)
  app.patch('/api/applications/:id/status', (req: Request, res: Response) => {
    const { id } = req.params;
    const { new_status, remarks, reviewer_name } = req.body;

    const appItem = applications.find(a => a.application_id === id);
    if (!appItem) {
      return res.status(404).json({ error: 'Permohonan tidak ditemui.' });
    }

    if (!Object.values(ApplicationStatus).includes(new_status)) {
      return res.status(400).json({ error: 'Nilai status permohonan tidak sah.' });
    }

    const oldStatus = appItem.status;
    appItem.status = new_status;
    appItem.reviewed_by = reviewer_name || 'Admin KPMBP';
    appItem.reviewed_at = new Date().toISOString();
    appItem.updated_at = new Date().toISOString();

    // Log history
    applicationStatusHistory.push({
      history_id: `h-${Date.now()}`,
      application_id: id,
      old_status: oldStatus,
      new_status: new_status as ApplicationStatus,
      changed_by: reviewer_name || 'Admin KPMBP',
      changed_at: new Date().toISOString(),
      remarks: remarks || `Status dikemaskini dari ${oldStatus} kepada ${new_status}.`,
    });

    // Auto-create participation record if reached CONFIRMED or SELECTED
    if (new_status === ApplicationStatus.CONFIRMED || new_status === ApplicationStatus.SELECTED) {
      const opp = opportunities.find(o => o.opportunity_id === appItem.opportunity_id);
      const existsPart = participationHistory.some(p => p.student_id === appItem.student_id && p.opportunity_id === appItem.opportunity_id);
      if (!existsPart && opp) {
        participationHistory.push({
          participation_id: `part-${Date.now()}`,
          student_id: appItem.student_id,
          opportunity_id: opp.opportunity_id,
          opportunity_title: opp.title,
          category: categories.find(c => c.category_id === opp.category_id)?.name || 'Kolej',
          role_achieved: 'Peserta Terpilih / Barisan Rasmi',
          year: new Date().getFullYear(),
          status: 'ONGOING',
          verified_at: new Date().toISOString(),
        });
      }
    }

    res.json({
      message: `Status berjaya dikemaskini kepada ${new_status}.`,
      application: appItem,
    });
  });

  // Admin Add Note to Application
  app.post('/api/applications/:id/notes', (req: Request, res: Response) => {
    const { id } = req.params;
    const { note, admin_name } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ error: 'Kandungan nota diperlukan.' });
    }

    const appItem = applications.find(a => a.application_id === id);
    if (!appItem) {
      return res.status(404).json({ error: 'Permohonan tidak ditemui.' });
    }

    const newNote: AdminNote = {
      note_id: `an-${Date.now()}`,
      application_id: id,
      admin_id: 'adm-001',
      admin_name: admin_name || 'Pentadbir KPMBP',
      note: note.trim(),
      created_at: new Date().toISOString(),
    };

    adminNotes.push(newNote);
    res.status(201).json(newNote);
  });

  // -----------------------------------------------------------
  // 5. TALENT INVITATIONS API
  // -----------------------------------------------------------
  app.get('/api/invitations', (req: Request, res: Response) => {
    const enriched = invitations.map(inv => {
      const student = students.find(s => s.student_id === inv.student_id);
      const opp = opportunities.find(o => o.opportunity_id === inv.opportunity_id);
      return {
        ...inv,
        student: student ? getStudentWithSkills(student) : undefined,
        opportunity: opp,
      };
    });
    res.json(enriched);
  });

  app.post('/api/invitations', (req: Request, res: Response) => {
    const { student_id, opportunity_id, notes, admin_name } = req.body;

    if (!student_id || !opportunity_id) {
      return res.status(400).json({ error: 'Student ID dan Opportunity ID diperlukan.' });
    }

    // Check if duplicate invitation
    const exists = invitations.some(i => i.student_id === student_id && i.opportunity_id === opportunity_id && i.status === 'PENDING');
    if (exists) {
      return res.status(400).json({ error: 'Pelajar ini sudah mempunyai jemputan aktif untuk peluang ini.' });
    }

    const newInv: Invitation = {
      invitation_id: `inv-${Date.now()}`,
      student_id,
      opportunity_id,
      invited_by: 'adm-001',
      invited_by_name: admin_name || 'Pentadbir Unit Bakat KPMBP',
      status: 'PENDING',
      notes: notes || 'Dijemput berdasarkan profil kemahiran yang sepadan.',
      created_at: new Date().toISOString(),
    };

    invitations.push(newInv);
    res.status(201).json(newInv);
  });

  // -----------------------------------------------------------
  // 6. PARTICIPATION HISTORY & ANALYTICS API
  // -----------------------------------------------------------
  app.get('/api/students/:id/history', (req: Request, res: Response) => {
    const { id } = req.params;
    const history = participationHistory.filter(p => p.student_id === id);
    res.json(history);
  });

  app.get('/api/analytics', (req: Request, res: Response) => {
    const totalStudents = students.length;
    const totalSkillsRegistered = studentSkills.length;
    const totalOpportunities = opportunities.length;
    const activeOpportunities = opportunities.filter(o => o.status === OpportunityStatus.OPEN).length;
    const totalApplications = applications.length;
    const shortlistedCount = applications.filter(a => [ApplicationStatus.SHORTLISTED, ApplicationStatus.SELECTED, ApplicationStatus.CONFIRMED].includes(a.status)).length;
    const screeningCount = applications.filter(a => [ApplicationStatus.SUBMITTED, ApplicationStatus.SCREENING, ApplicationStatus.VIDEO_REQUESTED, ApplicationStatus.INTERVIEW].includes(a.status)).length;

    // Skills distribution breakdown
    const skillsBreakdown = skills.map(sk => {
      const count = studentSkills.filter(ss => ss.skill_id === sk.skill_id).length;
      return {
        skill_name: sk.skill_name,
        count,
      };
    }).filter(s => s.count > 0).sort((a, b) => b.count - a.count);

    res.json({
      totalStudents,
      totalSkillsRegistered,
      totalOpportunities,
      activeOpportunities,
      totalApplications,
      shortlistedCount,
      screeningCount,
      skillsBreakdown,
    });
  });

  // -----------------------------------------------------------
  // VITE MIDDLEWARE SETUP
  // -----------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KPMBP Talent Platform Server running on port ${PORT}`);
  });
}

startServer();
