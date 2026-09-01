import express, { Request, Response, NextFunction } from 'express';
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
  AuditLog,
  NotificationItem,
  PilotFeedback,
  FeedbackType,
  FeedbackRole,
} from './src/types.ts';
import {
  normalizeFullName,
  normalizeStudentIdNumber,
  normalizePhone,
  normalizeEmail,
  generateSlug,
  validateSlug,
} from './src/lib/normalization.ts';
import { calculateOpportunityMatch } from './src/lib/matching.ts';
import { initStorage, getStore, mutateStore } from './src/server/storage.ts';
import {
  createBackup,
  listBackups,
  previewRestore,
  executeRestore,
  exportEntityToCSV,
  auditDuplicates,
  previewCSVImport,
  commitCSVImport,
} from './src/server/dataSafety.ts';
import {
  generateTalentGapAnalysis,
  generateOpportunityAnalytics,
  generateAdminOperationalReport,
} from './src/server/analyticsEngine.ts';

// In-memory active session tokens mapped to Admin User ID
const activeSessions = new Map<string, { admin_id: string; role: AdminRole; email: string; name: string; expiresAt: number }>();

// Predefined secure credentials for KPMBP Administrative Roles
const ADMIN_CREDENTIALS: Record<string, { role: AdminRole; passkey: string; name: string; dept: string }> = {
  'admin.bakat@kpmbp.edu.my': {
    role: AdminRole.SUPER_ADMIN,
    passkey: 'kpmbp2026!',
    name: 'Pentadbiran Utama Hal Ehwal Pelajar KPMBP',
    dept: 'Unit Kebudayaan, Sukan & Kepimpinan Pelajar',
  },
  'pegawai.hep@kpmbp.edu.my': {
    role: AdminRole.ADMIN,
    passkey: 'admin2026!',
    name: 'Pegawai Pembangunan Bakat & Kokurikulum',
    dept: 'Hal Ehwal Pelajar (HEP)',
  },
  'panel.kebudayaan@kpmbp.edu.my': {
    role: AdminRole.REVIEWER,
    passkey: 'reviewer2026!',
    name: 'Panel Penilai & Pengadil Bakat',
    dept: 'Panel Uji Bakat & Audisi',
  },
};

// Helper: Enriched Student with detailed skills
function enrichStudentWithSkills(student: Student, store = getStore()) {
  const sSkills = store.studentSkills.filter(ss => ss.student_id === student.student_id);
  const skillsWithDetails = sSkills.map(ss => {
    const sk = store.skills.find(s => s.skill_id === ss.skill_id);
    const cat = sk ? store.categories.find(c => c.category_id === sk.category_id) : undefined;
    return {
      ...ss,
      skill_name: sk ? sk.skill_name : 'Unknown Skill',
      category_name: cat ? cat.name : undefined,
    };
  });

  return {
    ...student,
    skills: skillsWithDetails,
  };
}

// Helper: Enriched Opportunity with Questions, Category, and applicant count
function enrichOpportunity(opp: Opportunity, store = getStore()) {
  const cat = store.categories.find(c => c.category_id === opp.category_id);
  const oppQuestions = store.opportunityQuestions
    .filter(q => q.opportunity_id === opp.opportunity_id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const totalApps = store.applications.filter(a => a.opportunity_id === opp.opportunity_id).length;

  return {
    ...opp,
    category_name: cat ? cat.name : undefined,
    questions: oppQuestions,
    total_applications: totalApps,
  };
}

// Helper: Check if request is from an authorized admin session
function checkIsAdmin(req: Request): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.split(' ')[1];
  const session = activeSessions.get(token);
  if (!session) return false;
  if (session.expiresAt < Date.now()) {
    activeSessions.delete(token);
    return false;
  }
  return true;
}

// Helper: Enriched Application (Respecting privacy and access control)
function enrichApplication(appItem: Application, store = getStore(), isAdmin = false) {
  const student = store.students.find(s => s.student_id === appItem.student_id);
  const opp = store.opportunities.find(o => o.opportunity_id === appItem.opportunity_id);
  const responses = store.applicationResponses.filter(r => r.application_id === appItem.application_id);
  const notesList = isAdmin ? store.adminNotes.filter(n => n.application_id === appItem.application_id) : [];
  const statusHistory = store.applicationStatusHistory
    .filter(h => h.application_id === appItem.application_id)
    .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());

  return {
    ...appItem,
    student: student ? enrichStudentWithSkills(student, store) : undefined,
    opportunity: opp ? enrichOpportunity(opp, store) : undefined,
    responses,
    admin_notes: isAdmin ? appItem.admin_notes : undefined,
    notes_list: isAdmin ? notesList : undefined,
    status_history: statusHistory,
  };
}

// Helper: Create an in-app notification
async function createNotification(params: {
  recipient_type: 'STUDENT' | 'ADMIN';
  recipient_id: string;
  title: string;
  message: string;
  type: NotificationItem['type'];
  related_entity_id?: string;
}) {
  await mutateStore(store => {
    const newNotif: NotificationItem = {
      notification_id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      recipient_type: params.recipient_type,
      recipient_id: params.recipient_id,
      title: params.title,
      message: params.message,
      type: params.type,
      related_entity_id: params.related_entity_id,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    store.notifications.unshift(newNotif);
  });
}

// Helper: Log an audit event
async function logAudit(params: {
  action: string;
  entity_type: AuditLog['entity_type'];
  entity_id: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  details: string;
}) {
  await mutateStore(store => {
    const log: AuditLog = {
      log_id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      actor_id: params.actor_id,
      actor_name: params.actor_name,
      actor_role: params.actor_role,
      timestamp: new Date().toISOString(),
      details: params.details,
    };
    store.auditLogs.unshift(log);
  });
}

// Authentication & Authorization Middleware
interface AuthRequest extends Request {
  adminUser?: {
    admin_id: string;
    role: AdminRole;
    email: string;
    name: string;
  };
}

function requireAdminAuth(allowedRoles?: AdminRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Akses tidak dibenarkan. Sila log masuk ke Portal Pentadbir KPMBP.' });
    }

    const token = authHeader.split(' ')[1];
    const session = activeSessions.get(token);

    if (!session || session.expiresAt < Date.now()) {
      if (session) activeSessions.delete(token);
      return res.status(401).json({ error: 'Sesi anda telah tamat. Sila log masuk semula.' });
    }

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
      return res.status(403).json({ error: 'Peranan akaun anda tidak mempunyai kebenaran untuk tindakan ini.' });
    }

    req.adminUser = {
      admin_id: session.admin_id,
      role: session.role,
      email: session.email,
      name: session.name,
    };
    next();
  };
}

async function startServer() {
  // Initialize persistent data engine (SES 4.4 Standard)
  await initStorage();

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // -----------------------------------------------------------
  // 1. HEALTH & SYSTEM DIAGNOSTICS
  // -----------------------------------------------------------
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      engine: 'SES 4.4 Data Hardened Engine',
      timestamp: new Date().toISOString(),
      activeSessions: activeSessions.size,
    });
  });

  // -----------------------------------------------------------
  // 2. AUTHENTICATION & SESSION MANAGEMENT
  // -----------------------------------------------------------
  const handleAdminLogin = async (req: Request, res: Response) => {
    const { email, password, passkey } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanKey = (passkey || password || '').trim();

    if (!cleanEmail || !cleanKey) {
      return res.status(400).json({ error: 'Sila masukkan e-mel pentadbir dan kata laluan / passkey.' });
    }

    const cred = ADMIN_CREDENTIALS[cleanEmail];
    if (!cred || cred.passkey !== cleanKey) {
      return res.status(401).json({ error: 'E-mel pentadbir atau kata laluan tidak sah.' });
    }

    const store = getStore();
    let adminUser = store.adminUsers.find(u => u.email.toLowerCase() === cleanEmail);
    if (!adminUser) {
      adminUser = {
        admin_id: `adm-${Date.now()}`,
        name: cred.name,
        email: cleanEmail,
        role: cred.role,
        department: cred.dept,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await mutateStore(s => s.adminUsers.push(adminUser!));
    }

    // Generate secure session token valid for 24 hours
    const token = `kpmbp_${adminUser.admin_id}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    activeSessions.set(token, {
      admin_id: adminUser.admin_id,
      role: adminUser.role,
      email: adminUser.email,
      name: adminUser.name,
      expiresAt,
    });

    await logAudit({
      action: 'ADMIN_LOGIN',
      entity_type: 'AUTH',
      entity_id: adminUser.admin_id,
      actor_id: adminUser.admin_id,
      actor_name: adminUser.name,
      actor_role: adminUser.role,
      details: `Log masuk berjaya dari akaun ${adminUser.email} (${adminUser.role}).`,
    });

    res.json({
      message: 'Log masuk berjaya.',
      token,
      user: adminUser,
    });
  };

  const handleGetMe = (req: AuthRequest, res: Response) => {
    const store = getStore();
    const user = store.adminUsers.find(u => u.admin_id === req.adminUser?.admin_id);
    if (!user) {
      return res.status(404).json({ error: 'Pengguna tidak ditemui.' });
    }
    res.json(user);
  };

  const handleAdminLogout = (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      activeSessions.delete(token);
    }
    res.json({ message: 'Log keluar berjaya.' });
  };

  app.post('/api/admin/login', handleAdminLogin);
  app.post('/api/auth/login', handleAdminLogin);
  app.get('/api/admin/me', requireAdminAuth(), handleGetMe);
  app.get('/api/auth/me', requireAdminAuth(), handleGetMe);
  app.post('/api/admin/logout', handleAdminLogout);
  app.post('/api/auth/logout', handleAdminLogout);

  // -----------------------------------------------------------
  // 3. CATEGORIES & SKILLS API
  // -----------------------------------------------------------
  app.get('/api/categories', (req: Request, res: Response) => {
    const store = getStore();
    res.json(store.categories);
  });

  app.get('/api/skills', (req: Request, res: Response) => {
    const store = getStore();
    const enriched = store.skills.map(sk => {
      const cat = store.categories.find(c => c.category_id === sk.category_id);
      return {
        ...sk,
        category_name: cat ? cat.name : undefined,
      };
    });
    res.json(enriched);
  });

  // -----------------------------------------------------------
  // 4. STUDENT MASTER PROFILE API ("One Student, One Master Profile")
  // -----------------------------------------------------------
  app.get('/api/students/lookup/:idNumber', (req: Request, res: Response) => {
    const { idNumber } = req.params;
    const { normalized, isValid } = normalizeStudentIdNumber(idNumber);

    if (!isValid) {
      return res.status(400).json({ error: 'Format ID Pelajar tidak sah. Gunakan format XXX-XXXX-XXX.' });
    }

    const store = getStore();
    const student = store.students.find(
      s => s.student_id_number.toUpperCase() === normalized.toUpperCase()
    );

    if (!student) {
      return res.status(404).json({ message: 'Profil pelajar belum wujud dalam sistem.' });
    }

    res.json(enrichStudentWithSkills(student, store));
  });

  app.get('/api/students/search', (req: Request, res: Response) => {
    const store = getStore();
    const { skill, level, query } = req.query;

    let matched = store.students.map(s => enrichStudentWithSkills(s, store));

    if (query && typeof query === 'string') {
      const qLower = query.toLowerCase().trim();
      matched = matched.filter(
        s =>
          s.full_name.toLowerCase().includes(qLower) ||
          s.student_id_number.toLowerCase().includes(qLower) ||
          s.programme.toLowerCase().includes(qLower) ||
          s.email.toLowerCase().includes(qLower)
      );
    }

    if (skill && typeof skill === 'string' && skill.trim()) {
      const skClean = skill.toLowerCase().trim();
      matched = matched.filter(s =>
        s.skills?.some(
          sk =>
            sk.skill_name.toLowerCase().includes(skClean) ||
            (sk.category_name && sk.category_name.toLowerCase().includes(skClean))
        )
      );
    }

    if (level && typeof level === 'string' && level !== 'all') {
      matched = matched.filter(s =>
        s.skills?.some(sk => sk.skill_level === level)
      );
    }

    res.json(matched);
  });

  app.get('/api/students/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const store = getStore();
    const student = store.students.find(s => s.student_id === id);
    if (!student) {
      return res.status(404).json({ error: 'Pelajar tidak ditemui.' });
    }
    res.json(enrichStudentWithSkills(student, store));
  });

  // Upsert Student Master Profile (Public / Student Form)
  app.post('/api/students', async (req: Request, res: Response) => {
    const {
      student_id_number,
      full_name,
      preferred_name,
      programme,
      semester,
      className,
      gender,
      phone,
      email,
      skills_data,
    } = req.body;

    // Normalizations & validations
    const idValidation = normalizeStudentIdNumber(student_id_number);
    if (!idValidation.isValid) {
      return res.status(400).json({ error: idValidation.error || 'Format ID Pelajar tidak sah.' });
    }

    const normalizedName = normalizeFullName(full_name);
    if (!normalizedName || normalizedName.length < 3) {
      return res.status(400).json({ error: 'Sila masukkan nama penuh yang sah mengikut kad pengenalan.' });
    }

    const phoneValidation = normalizePhone(phone);
    if (!phoneValidation.isValid) {
      return res.status(400).json({ error: phoneValidation.error || 'Format nombor telefon tidak sah.' });
    }

    const emailValidation = normalizeEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ error: emailValidation.error || 'Format e-mel tidak sah.' });
    }

    const studentResult = await mutateStore(store => {
      let student = store.students.find(
        s => s.student_id_number.toUpperCase() === idValidation.normalized.toUpperCase()
      );

      const now = new Date().toISOString();

      if (student) {
        // Update existing master profile
        student.full_name = normalizedName;
        student.preferred_name = preferred_name ? preferred_name.trim() : student.preferred_name;
        student.programme = programme || student.programme;
        student.semester = semester ? Number(semester) : student.semester;
        student.class = className || student.class;
        student.gender = gender || student.gender;
        student.phone = phoneValidation.normalized;
        student.email = emailValidation.normalized;
        student.updated_at = now;
      } else {
        // Create new master profile
        student = {
          student_id: `stu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          student_id_number: idValidation.normalized,
          full_name: normalizedName,
          preferred_name: preferred_name ? preferred_name.trim() : undefined,
          programme: programme || 'Diploma in Accounting (DIA)',
          semester: semester ? Number(semester) : 1,
          class: className || 'DIA1A',
          gender: gender || 'LELAKI',
          phone: phoneValidation.normalized,
          email: emailValidation.normalized,
          status: 'ACTIVE',
          created_at: now,
          updated_at: now,
        };
        store.students.push(student);
      }

      // Handle skills synchronization if provided
      if (skills_data && Array.isArray(skills_data)) {
        // Remove existing skills for this student
        store.studentSkills = store.studentSkills.filter(ss => ss.student_id !== student!.student_id);

        // Add refreshed skills
        skills_data.forEach((sd: any, idx: number) => {
          if (sd.skill_name && sd.skill_name.trim()) {
            const cleanSkillName = sd.skill_name.trim();
            // Check if skill exists in master catalog or add dynamically
            let existingSkill = store.skills.find(
              s => s.skill_name.toLowerCase() === cleanSkillName.toLowerCase()
            );

            if (!existingSkill) {
              existingSkill = {
                skill_id: `sk-${Date.now()}-${idx}`,
                skill_name: cleanSkillName,
                category_id: sd.category_id || 'cat-creative',
                status: 'ACTIVE',
                created_at: now,
                updated_at: now,
              };
              store.skills.push(existingSkill);
            }

            store.studentSkills.push({
              student_skill_id: `ss-${Date.now()}-${idx}`,
              student_id: student!.student_id,
              skill_id: existingSkill.skill_id,
              skill_level: sd.skill_level || SkillLevel.INTERMEDIATE,
              experience_duration: sd.experience_duration ? sd.experience_duration.trim() : '',
              is_primary: idx === 0 ? true : Boolean(sd.is_primary),
              created_at: now,
              updated_at: now,
            });
          }
        });
      }

      return student;
    });

    const store = getStore();
    res.status(200).json(enrichStudentWithSkills(studentResult, store));
  });

  // Super Admin delete student profile permanently
  app.delete('/api/students/:id', requireAdminAuth([AdminRole.SUPER_ADMIN]), async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const store = getStore();
    const student = store.students.find(s => s.student_id === id);
    if (!student) {
      return res.status(404).json({ error: 'Pelajar tidak ditemui.' });
    }

    await mutateStore(s => {
      s.students = s.students.filter(item => item.student_id !== id);
      s.studentSkills = s.studentSkills.filter(item => item.student_id !== id);
      s.invitations = s.invitations.filter(item => item.student_id !== id);
      s.participationHistory = s.participationHistory.filter(item => item.student_id !== id);
    });

    await logAudit({
      action: 'DELETE_STUDENT',
      entity_type: 'STUDENT',
      entity_id: id,
      actor_id: req.adminUser!.admin_id,
      actor_name: req.adminUser!.name,
      actor_role: req.adminUser!.role,
      details: `Profil pelajar ${student.full_name} (${student.student_id_number}) telah dipadam secara kekal.`,
    });

    res.json({ message: `Profil pelajar ${student.full_name} berjaya dipadam secara kekal.` });
  });

  // -----------------------------------------------------------
  // 5. OPPORTUNITIES API
  // -----------------------------------------------------------
  app.get('/api/opportunities', (req: Request, res: Response) => {
    const store = getStore();
    const isAdmin = req.query.admin === 'true';

    let list = store.opportunities;
    if (!isAdmin) {
      list = list.filter(o => o.status === OpportunityStatus.OPEN);
    }

    const enriched = list.map(o => enrichOpportunity(o, store));
    res.json(enriched);
  });

  app.get('/api/opportunities/slug/:slug', (req: Request, res: Response) => {
    const { slug } = req.params;
    const store = getStore();
    const opp = store.opportunities.find(o => o.slug === slug.toLowerCase().trim());
    if (!opp) {
      return res.status(404).json({ error: 'Peluang tidak ditemui mengikut pautan slug.' });
    }
    res.json(enrichOpportunity(opp, store));
  });

  app.get('/api/opportunities/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const store = getStore();
    const opp = store.opportunities.find(o => o.opportunity_id === id);
    if (!opp) {
      return res.status(404).json({ error: 'Peluang tidak ditemui.' });
    }
    res.json(enrichOpportunity(opp, store));
  });

  // Admin Create Opportunity
  app.post('/api/opportunities', requireAdminAuth([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]), async (req: AuthRequest, res: Response) => {
    const {
      title,
      slug,
      category_id,
      description,
      open_call_roles,
      requirements,
      opening_date,
      closing_date,
      status,
      max_applicants,
      banner_tag,
      questions,
    } = req.body;

    if (!title || !description || !category_id) {
      return res.status(400).json({ error: 'Tajuk, Kategori, dan Penerangan diperlukan.' });
    }

    const generatedSlug = slug ? slug.trim() : generateSlug(title);
    const slugValidation = validateSlug(generatedSlug);
    if (!slugValidation.isValid) {
      return res.status(400).json({ error: slugValidation.error || 'Format slug tidak sah.' });
    }

    const store = getStore();
    const slugExists = store.opportunities.some(o => o.slug === generatedSlug);
    if (slugExists) {
      return res.status(400).json({ error: 'Slug URL ini telah digunakan oleh peluang lain.' });
    }

    const oppId = `opp-${Date.now()}`;
    const now = new Date().toISOString();

    const newOpp: Opportunity = {
      opportunity_id: oppId,
      title: title.trim(),
      slug: generatedSlug,
      category_id,
      description: description.trim(),
      open_call_roles: Array.isArray(open_call_roles) ? open_call_roles : [],
      requirements: Array.isArray(requirements) ? requirements : [],
      opening_date: opening_date || now,
      closing_date: closing_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: status || OpportunityStatus.OPEN,
      max_applicants: max_applicants ? Number(max_applicants) : undefined,
      banner_tag: banner_tag ? banner_tag.trim() : undefined,
      created_by: req.adminUser!.admin_id,
      created_at: now,
      updated_at: now,
    };

    await mutateStore(s => {
      s.opportunities.push(newOpp);

      // Handle custom questions if provided
      if (questions && Array.isArray(questions)) {
        questions.forEach((q: any, idx: number) => {
          if (q.question_text && q.question_text.trim()) {
            s.opportunityQuestions.push({
              question_id: `q-${oppId}-${idx + 1}`,
              opportunity_id: oppId,
              question_text: q.question_text.trim(),
              question_type: q.question_type || QuestionType.TEXT,
              placeholder: q.placeholder || '',
              help_text: q.help_text || '',
              is_required: Boolean(q.is_required),
              sort_order: idx + 1,
              options: Array.isArray(q.options) ? q.options : (typeof q.options_str === 'string' ? q.options_str.split(',').map((opt: string) => opt.trim()).filter(Boolean) : []),
              created_at: now,
              updated_at: now,
            });
          }
        });
      }
    });

    await logAudit({
      action: 'CREATE_OPPORTUNITY',
      entity_type: 'OPPORTUNITY',
      entity_id: oppId,
      actor_id: req.adminUser!.admin_id,
      actor_name: req.adminUser!.name,
      actor_role: req.adminUser!.role,
      details: `Panggilan terbuka "${newOpp.title}" (slug: ${newOpp.slug}) dicipta.`,
    });

    res.status(201).json(enrichOpportunity(newOpp));
  });

  // Admin Update Opportunity
  app.put('/api/opportunities/:id', requireAdminAuth([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]), async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const store = getStore();
    const opp = store.opportunities.find(o => o.opportunity_id === id);
    if (!opp) {
      return res.status(404).json({ error: 'Peluang tidak ditemui.' });
    }

    const {
      title,
      slug,
      category_id,
      description,
      open_call_roles,
      requirements,
      opening_date,
      closing_date,
      status,
      max_applicants,
      banner_tag,
      questions,
    } = req.body;

    const now = new Date().toISOString();

    await mutateStore(s => {
      const target = s.opportunities.find(o => o.opportunity_id === id)!;
      if (title) target.title = title.trim();
      if (slug) {
        const cleanSlug = slug.trim().toLowerCase();
        const conflict = s.opportunities.some(o => o.opportunity_id !== id && o.slug === cleanSlug);
        if (!conflict) target.slug = cleanSlug;
      }
      if (category_id) target.category_id = category_id;
      if (description) target.description = description.trim();
      if (open_call_roles !== undefined) target.open_call_roles = open_call_roles;
      if (requirements !== undefined) target.requirements = requirements;
      if (opening_date) target.opening_date = opening_date;
      if (closing_date) target.closing_date = closing_date;
      if (status) target.status = status;
      if (max_applicants !== undefined) target.max_applicants = max_applicants ? Number(max_applicants) : undefined;
      if (banner_tag !== undefined) target.banner_tag = banner_tag;
      target.updated_at = now;

      // Update questions if provided
      if (questions && Array.isArray(questions)) {
        s.opportunityQuestions = s.opportunityQuestions.filter(q => q.opportunity_id !== id);
        questions.forEach((q: any, idx: number) => {
          if (q.question_text && q.question_text.trim()) {
            s.opportunityQuestions.push({
              question_id: q.question_id || `q-${id}-${idx + 1}`,
              opportunity_id: id,
              question_text: q.question_text.trim(),
              question_type: q.question_type || QuestionType.TEXT,
              placeholder: q.placeholder || '',
              help_text: q.help_text || '',
              is_required: Boolean(q.is_required),
              sort_order: idx + 1,
              options: Array.isArray(q.options) ? q.options : (typeof q.options_str === 'string' ? q.options_str.split(',').map((opt: string) => opt.trim()).filter(Boolean) : []),
              created_at: q.created_at || now,
              updated_at: now,
            });
          }
        });
      }
    });

    await logAudit({
      action: 'UPDATE_OPPORTUNITY',
      entity_type: 'OPPORTUNITY',
      entity_id: id,
      actor_id: req.adminUser!.admin_id,
      actor_name: req.adminUser!.name,
      actor_role: req.adminUser!.role,
      details: `Panggilan terbuka "${opp.title}" dikemaskini. Status: ${status || opp.status}.`,
    });

    res.json(enrichOpportunity(store.opportunities.find(o => o.opportunity_id === id)!));
  });

  // Super Admin Delete Opportunity Permanently
  app.delete('/api/opportunities/:id', requireAdminAuth([AdminRole.SUPER_ADMIN]), async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const store = getStore();
    const opp = store.opportunities.find(o => o.opportunity_id === id);
    if (!opp) {
      return res.status(404).json({ error: 'Peluang tidak ditemui.' });
    }

    await mutateStore(s => {
      s.opportunities = s.opportunities.filter(o => o.opportunity_id !== id);
      s.opportunityQuestions = s.opportunityQuestions.filter(q => q.opportunity_id !== id);
      // Clean up orphaned applications
      const appIdsToRemove = s.applications.filter(a => a.opportunity_id === id).map(a => a.application_id);
      s.applications = s.applications.filter(a => a.opportunity_id !== id);
      s.applicationResponses = s.applicationResponses.filter(r => !appIdsToRemove.includes(r.application_id));
      s.applicationStatusHistory = s.applicationStatusHistory.filter(h => !appIdsToRemove.includes(h.application_id));
      s.adminNotes = s.adminNotes.filter(n => !appIdsToRemove.includes(n.application_id));
      s.invitations = s.invitations.filter(i => i.opportunity_id !== id);
    });

    await logAudit({
      action: 'DELETE_OPPORTUNITY',
      entity_type: 'OPPORTUNITY',
      entity_id: id,
      actor_id: req.adminUser!.admin_id,
      actor_name: req.adminUser!.name,
      actor_role: req.adminUser!.role,
      details: `Peluang "${opp.title}" (${id}) dipadam secara kekal.`,
    });

    res.json({ message: `Peluang "${opp.title}" berjaya dipadam secara kekal.` });
  });

  // -----------------------------------------------------------
  // 6. APPLICATIONS & STATUS WORKFLOW API
  // -----------------------------------------------------------
  app.get('/api/applications', (req: Request, res: Response) => {
    const { opportunity_id, status, student_id_number, student_id } = req.query;
    const store = getStore();
    const isAdmin = checkIsAdmin(req);

    let list = store.applications;

    if (opportunity_id && typeof opportunity_id === 'string' && opportunity_id !== 'all') {
      list = list.filter(a => a.opportunity_id === opportunity_id);
    }

    if (status && typeof status === 'string' && status !== 'all') {
      list = list.filter(a => a.status === status);
    }

    if (student_id && typeof student_id === 'string') {
      list = list.filter(a => a.student_id === student_id);
    }

    if (student_id_number && typeof student_id_number === 'string') {
      const clean = student_id_number.trim().toUpperCase();
      const stu = store.students.find(s => s.student_id_number.toUpperCase() === clean);
      if (stu) {
        list = list.filter(a => a.student_id === stu.student_id);
      } else {
        list = [];
      }
    }

    const enriched = list.map(a => enrichApplication(a, store, isAdmin));
    res.json(enriched);
  });

  app.get('/api/applications/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const store = getStore();
    const isAdmin = checkIsAdmin(req);
    const appItem = store.applications.find(a => a.application_id === id);
    if (!appItem) {
      return res.status(404).json({ error: 'Permohonan tidak ditemui.' });
    }
    res.json(enrichApplication(appItem, store, isAdmin));
  });

  // Student Application Withdrawal
  app.post('/api/applications/:id/withdraw', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { student_id_number, student_id, reason } = req.body;
    const store = getStore();
    const appItem = store.applications.find(a => a.application_id === id);
    if (!appItem) {
      return res.status(404).json({ error: 'Permohonan tidak ditemui.' });
    }

    const student = store.students.find(s => s.student_id === appItem.student_id);
    if (student_id_number && student) {
      const cleanNumber = student_id_number.trim().toUpperCase();
      if (student.student_id_number.toUpperCase() !== cleanNumber) {
        return res.status(403).json({ error: 'Pengesahan ID Pelajar tidak sepadan.' });
      }
    } else if (student_id && appItem.student_id !== student_id) {
      return res.status(403).json({ error: 'Pengesahan ID Pelajar tidak sepadan.' });
    }

    const oldStatus = appItem.status;
    if (oldStatus === ApplicationStatus.WITHDRAWN) {
      return res.status(400).json({ error: 'Permohonan ini telah ditarik balik sebelum ini.' });
    }

    const now = new Date().toISOString();
    await mutateStore(s => {
      const target = s.applications.find(a => a.application_id === id)!;
      target.status = ApplicationStatus.WITHDRAWN;
      target.updated_at = now;

      s.applicationStatusHistory.push({
        history_id: `h-${Date.now()}`,
        application_id: id,
        old_status: oldStatus,
        new_status: ApplicationStatus.WITHDRAWN,
        changed_by: student ? student.full_name : 'Pelajar',
        changed_at: now,
        remarks: reason ? `Ditarik balik oleh pemohon: ${reason}` : 'Permohonan ditarik balik oleh pemohon.',
      });
    });

    await logAudit({
      action: 'WITHDRAW_APPLICATION',
      entity_type: 'APPLICATION',
      entity_id: id,
      actor_id: student ? student.student_id : 'STUDENT',
      actor_name: student ? student.full_name : 'Pelajar',
      actor_role: 'STUDENT',
      details: `Permohonan ${id} ditarik balik oleh pemohon. Sebab: ${reason || 'Tiada catatan'}`,
    });

    res.json({
      message: 'Permohonan berjaya ditarik balik.',
      application: enrichApplication(store.applications.find(a => a.application_id === id)!, store, false),
    });
  });

  // Student Submits New Application
  app.post('/api/applications', async (req: Request, res: Response) => {
    const { opportunity_id, student_id_number, responses_data } = req.body;

    if (!opportunity_id || !student_id_number) {
      return res.status(400).json({ error: 'Opportunity ID dan ID Pelajar diperlukan.' });
    }

    const { normalized, isValid } = normalizeStudentIdNumber(student_id_number);
    if (!isValid) {
      return res.status(400).json({ error: 'Format ID Pelajar tidak sah.' });
    }

    const store = getStore();
    const student = store.students.find(s => s.student_id_number.toUpperCase() === normalized.toUpperCase());
    if (!student) {
      return res.status(400).json({ error: 'Profil pelajar tidak ditemui. Sila lengkapkan profil dahulu.' });
    }

    const opp = store.opportunities.find(o => o.opportunity_id === opportunity_id);
    if (!opp) {
      return res.status(404).json({ error: 'Panggilan terbuka tidak ditemui.' });
    }

    if (opp.status !== OpportunityStatus.OPEN) {
      return res.status(400).json({ error: 'Panggilan terbuka ini telah ditutup untuk permohonan baru.' });
    }

    // Prevent duplicate active application
    const existingApp = store.applications.find(
      a => a.student_id === student.student_id && a.opportunity_id === opportunity_id && a.status !== ApplicationStatus.WITHDRAWN
    );
    if (existingApp) {
      return res.status(400).json({ error: 'Anda sudah menghantar permohonan untuk peluang ini.' });
    }

    const appId = `app-${Date.now()}`;
    const now = new Date().toISOString();

    const newApp: Application = {
      application_id: appId,
      student_id: student.student_id,
      opportunity_id: opp.opportunity_id,
      status: ApplicationStatus.SUBMITTED,
      submitted_at: now,
      updated_at: now,
    };

    await mutateStore(s => {
      s.applications.push(newApp);

      // Record responses
      if (responses_data && Array.isArray(responses_data)) {
        responses_data.forEach((r: any, idx: number) => {
          s.applicationResponses.push({
            response_id: `resp-${appId}-${idx + 1}`,
            application_id: appId,
            question_id: r.question_id,
            response_value: r.response_value,
            created_at: now,
            updated_at: now,
          });
        });
      }

      // Initial status history log
      s.applicationStatusHistory.push({
        history_id: `h-${Date.now()}`,
        application_id: appId,
        old_status: null,
        new_status: ApplicationStatus.SUBMITTED,
        changed_by: student.full_name,
        changed_at: now,
        remarks: 'Permohonan dihantar melalui Portal Bakat Pelajar.',
      });
    });

    // Send in-app notification to Admins
    await createNotification({
      recipient_type: 'ADMIN',
      recipient_id: 'ALL_ADMINS',
      title: `Permohonan Baru: ${opp.title}`,
      message: `${student.full_name} (${student.student_id_number}) telah menghantar permohonan untuk ${opp.title}.`,
      type: 'APPLICATION_SUBMITTED',
      related_entity_id: appId,
    });

    // Send confirmation notification to Student
    await createNotification({
      recipient_type: 'STUDENT',
      recipient_id: student.student_id,
      title: `Permohonan Diterima: ${opp.title}`,
      message: `Permohonan anda untuk ${opp.title} telah berjaya dihantar dan sedang dalam semakan.`,
      type: 'APPLICATION_SUBMITTED',
      related_entity_id: appId,
    });

    await logAudit({
      action: 'SUBMIT_APPLICATION',
      entity_type: 'APPLICATION',
      entity_id: appId,
      actor_id: student.student_id,
      actor_name: student.full_name,
      actor_role: 'STUDENT',
      details: `Permohonan dihantar untuk ${opp.title} (ID Pelajar: ${student.student_id_number}).`,
    });

    res.status(201).json(enrichApplication(newApp));
  });

  // Admin Update Application Status (Workflow State Machine)
  app.patch('/api/applications/:id/status', requireAdminAuth([AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.REVIEWER]), async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { new_status, remarks } = req.body;

    if (!new_status || !Object.values(ApplicationStatus).includes(new_status)) {
      return res.status(400).json({ error: 'Nilai status permohonan tidak sah.' });
    }

    const store = getStore();
    const appItem = store.applications.find(a => a.application_id === id);
    if (!appItem) {
      return res.status(404).json({ error: 'Permohonan tidak ditemui.' });
    }

    const oldStatus = appItem.status;
    const actor = req.adminUser!;
    const now = new Date().toISOString();

    const student = store.students.find(s => s.student_id === appItem.student_id);
    const opp = store.opportunities.find(o => o.opportunity_id === appItem.opportunity_id);

    await mutateStore(s => {
      const target = s.applications.find(a => a.application_id === id)!;
      target.status = new_status;
      target.reviewed_by = `${actor.name} (${actor.role})`;
      target.reviewed_at = now;
      target.updated_at = now;

      // Status history entry
      s.applicationStatusHistory.push({
        history_id: `h-${Date.now()}`,
        application_id: id,
        old_status: oldStatus,
        new_status: new_status as ApplicationStatus,
        changed_by: `${actor.name} (${actor.role})`,
        changed_at: now,
        remarks: remarks || `Status dikemaskini dari ${oldStatus} kepada ${new_status}.`,
      });

      // Auto-create verified participation record upon reaching CONFIRMED or SELECTED
      if (new_status === ApplicationStatus.CONFIRMED || new_status === ApplicationStatus.SELECTED) {
        const existsPart = s.participationHistory.some(
          p => p.student_id === target.student_id && p.opportunity_id === target.opportunity_id
        );
        if (!existsPart && opp) {
          s.participationHistory.push({
            participation_id: `part-${Date.now()}`,
            student_id: target.student_id,
            opportunity_id: opp.opportunity_id,
            opportunity_title: opp.title,
            category: s.categories.find(c => c.category_id === opp.category_id)?.name || 'Kolej',
            role_achieved: new_status === ApplicationStatus.CONFIRMED ? 'Peserta Rasmi (Confirmed)' : 'Peserta Terpilih (Selected)',
            year: new Date().getFullYear(),
            status: 'ONGOING',
            verified_at: now,
          });
        }
      }
    });

    // Notify student of status update
    if (student && opp) {
      await createNotification({
        recipient_type: 'STUDENT',
        recipient_id: student.student_id,
        title: `Status Permohonan Dikemaskini: ${opp.title}`,
        message: `Status permohonan anda telah dikemaskini kepada: ${new_status}. ${remarks ? `Nota: ${remarks}` : ''}`,
        type: 'STATUS_CHANGED',
        related_entity_id: id,
      });
    }

    await logAudit({
      action: 'UPDATE_APPLICATION_STATUS',
      entity_type: 'APPLICATION',
      entity_id: id,
      actor_id: actor.admin_id,
      actor_name: actor.name,
      actor_role: actor.role,
      details: `Status permohonan ${id} diubah dari ${oldStatus} -> ${new_status}. Catatan: ${remarks || 'Tiada'}`,
    });

    res.json({
      message: `Status permohonan berjaya dikemaskini kepada ${new_status}.`,
      application: enrichApplication(store.applications.find(a => a.application_id === id)!),
    });
  });

  // Admin Add Assessment Note to Application
  app.post('/api/applications/:id/notes', requireAdminAuth([AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.REVIEWER]), async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ error: 'Kandungan nota diperlukan.' });
    }

    const store = getStore();
    const appItem = store.applications.find(a => a.application_id === id);
    if (!appItem) {
      return res.status(404).json({ error: 'Permohonan tidak ditemui.' });
    }

    const actor = req.adminUser!;
    const now = new Date().toISOString();

    const newNote: AdminNote = {
      note_id: `an-${Date.now()}`,
      application_id: id,
      admin_id: actor.admin_id,
      admin_name: `${actor.name} (${actor.role})`,
      note: note.trim(),
      created_at: now,
    };

    await mutateStore(s => {
      s.adminNotes.push(newNote);
    });

    await logAudit({
      action: 'ADD_APPLICATION_NOTE',
      entity_type: 'APPLICATION',
      entity_id: id,
      actor_id: actor.admin_id,
      actor_name: actor.name,
      actor_role: actor.role,
      details: `Nota penilaian ditambah pada permohonan ${id}.`,
    });

    res.status(201).json(newNote);
  });

  // Super Admin Delete Application
  app.delete('/api/applications/:id', requireAdminAuth([AdminRole.SUPER_ADMIN]), async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const store = getStore();
    const appItem = store.applications.find(a => a.application_id === id);
    if (!appItem) {
      return res.status(404).json({ error: 'Permohonan tidak ditemui.' });
    }

    await mutateStore(s => {
      s.applications = s.applications.filter(a => a.application_id !== id);
      s.applicationResponses = s.applicationResponses.filter(r => r.application_id !== id);
      s.applicationStatusHistory = s.applicationStatusHistory.filter(h => h.application_id !== id);
      s.adminNotes = s.adminNotes.filter(n => n.application_id !== id);
    });

    await logAudit({
      action: 'DELETE_APPLICATION',
      entity_type: 'APPLICATION',
      entity_id: id,
      actor_id: req.adminUser!.admin_id,
      actor_name: req.adminUser!.name,
      actor_role: req.adminUser!.role,
      details: `Permohonan ${id} dipadam secara kekal.`,
    });

    res.json({ message: `Permohonan ${id} berjaya dipadam secara kekal.` });
  });

  // -----------------------------------------------------------
  // 7. SMART MATCHING & TALENT SEARCH API
  // -----------------------------------------------------------
  app.get('/api/admin/match', requireAdminAuth(), (req: AuthRequest, res: Response) => {
    const { opportunity_id } = req.query;
    if (!opportunity_id || typeof opportunity_id !== 'string') {
      return res.status(400).json({ error: 'Opportunity ID diperlukan untuk pemadanan pintar.' });
    }

    const store = getStore();
    const opp = store.opportunities.find(o => o.opportunity_id === opportunity_id);
    if (!opp) {
      return res.status(404).json({ error: 'Peluang tidak ditemui.' });
    }

    const enrichedOpp = enrichOpportunity(opp, store);
    const enrichedStudents = store.students.map(s => enrichStudentWithSkills(s, store));

    const matches = enrichedStudents.map(student => {
      const matchResult = calculateOpportunityMatch(enrichedOpp, student);
      return {
        student,
        match: matchResult,
      };
    }).sort((a, b) => b.match.score - a.match.score);

    res.json({
      opportunity: enrichedOpp,
      matches,
    });
  });

  // -----------------------------------------------------------
  // 8. TALENT INVITATIONS API
  // -----------------------------------------------------------
  app.get('/api/invitations', (req: Request, res: Response) => {
    const { student_id_number, student_id } = req.query;
    const store = getStore();

    let list = store.invitations;

    if (student_id && typeof student_id === 'string') {
      list = list.filter(i => i.student_id === student_id);
    }

    if (student_id_number && typeof student_id_number === 'string') {
      const clean = student_id_number.trim().toUpperCase();
      const stu = store.students.find(s => s.student_id_number.toUpperCase() === clean);
      if (stu) {
        list = list.filter(i => i.student_id === stu.student_id);
      } else {
        list = [];
      }
    }

    const enriched = list.map(inv => {
      const student = store.students.find(s => s.student_id === inv.student_id);
      const opp = store.opportunities.find(o => o.opportunity_id === inv.opportunity_id);
      return {
        ...inv,
        student: student ? enrichStudentWithSkills(student, store) : undefined,
        opportunity: opp ? enrichOpportunity(opp, store) : undefined,
      };
    });

    res.json(enriched);
  });

  app.post('/api/invitations', requireAdminAuth([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]), async (req: AuthRequest, res: Response) => {
    const { student_id, opportunity_id, notes } = req.body;

    if (!student_id || !opportunity_id) {
      return res.status(400).json({ error: 'Student ID dan Opportunity ID diperlukan.' });
    }

    const store = getStore();
    const student = store.students.find(s => s.student_id === student_id);
    const opp = store.opportunities.find(o => o.opportunity_id === opportunity_id);

    if (!student || !opp) {
      return res.status(404).json({ error: 'Pelajar atau Peluang tidak wujud.' });
    }

    const exists = store.invitations.some(
      i => i.student_id === student_id && i.opportunity_id === opportunity_id && i.status === 'PENDING'
    );
    if (exists) {
      return res.status(400).json({ error: 'Pelajar ini sudah mempunyai jemputan aktif untuk peluang ini.' });
    }

    const actor = req.adminUser!;
    const invId = `inv-${Date.now()}`;
    const now = new Date().toISOString();

    const newInv: Invitation = {
      invitation_id: invId,
      student_id,
      opportunity_id,
      invited_by: actor.admin_id,
      invited_by_name: `${actor.name} (${actor.role})`,
      status: 'PENDING',
      notes: notes || 'Dijemput berdasarkan profil kemahiran yang sepadan.',
      created_at: now,
    };

    await mutateStore(s => {
      s.invitations.push(newInv);
    });

    // Notify Student
    await createNotification({
      recipient_type: 'STUDENT',
      recipient_id: student.student_id,
      title: `Jemputan Khas: ${opp.title}`,
      message: `Pentadbir KPMBP telah menjemput anda menyertai panggilan terbuka "${opp.title}". ${notes ? `Catatan: ${notes}` : ''}`,
      type: 'INVITATION_RECEIVED',
      related_entity_id: invId,
    });

    await logAudit({
      action: 'SEND_INVITATION',
      entity_type: 'INVITATION',
      entity_id: invId,
      actor_id: actor.admin_id,
      actor_name: actor.name,
      actor_role: actor.role,
      details: `Jemputan dihantar kepada ${student.full_name} (${student.student_id_number}) untuk ${opp.title}.`,
    });

    res.status(201).json(newInv);
  });

  // Student Responds to Invitation (Accept / Decline) - supports PATCH and PUT
  const handleInvitationResponse = async (req: Request, res: Response) => {
    const { id } = req.params;
    const rawStatus = req.body.status || req.body.response;
    const status = typeof rawStatus === 'string' ? rawStatus.toUpperCase().trim() : '';
    const { remarks } = req.body;

    if (!['ACCEPTED', 'DECLINED'].includes(status)) {
      return res.status(400).json({ error: 'Status jemputan mestilah ACCEPTED atau DECLINED.' });
    }

    const store = getStore();
    const inv = store.invitations.find(i => i.invitation_id === id);
    if (!inv) {
      return res.status(404).json({ error: 'Jemputan tidak ditemui.' });
    }

    const student = store.students.find(s => s.student_id === inv.student_id);
    const opp = store.opportunities.find(o => o.opportunity_id === inv.opportunity_id);

    await mutateStore(s => {
      const target = s.invitations.find(i => i.invitation_id === id)!;
      target.status = status as 'ACCEPTED' | 'DECLINED';
      if (remarks) {
        target.notes = target.notes ? `${target.notes} | Respons: ${remarks}` : remarks;
      }
    });

    // If accepted, also auto-create application or notify admin
    if (student && opp) {
      await createNotification({
        recipient_type: 'ADMIN',
        recipient_id: 'ALL_ADMINS',
        title: `Maklum Balas Jemputan: ${opp.title}`,
        message: `${student.full_name} telah ${status === 'ACCEPTED' ? 'MENERIMA' : 'MENOLAK'} jemputan untuk ${opp.title}. ${remarks ? `Catatan: ${remarks}` : ''}`,
        type: 'INVITATION_RESPONDED',
        related_entity_id: id,
      });

      await logAudit({
        action: 'RESPOND_INVITATION',
        entity_type: 'INVITATION',
        entity_id: id,
        actor_id: student.student_id,
        actor_name: student.full_name,
        actor_role: 'STUDENT',
        details: `Pelajar ${student.full_name} telah ${status} jemputan ${opp.title}.`,
      });
    }

    res.json({
      message: `Jemputan berjaya dikemaskini kepada status ${status}.`,
      invitation: store.invitations.find(i => i.invitation_id === id),
    });
  };

  app.patch('/api/invitations/:id/respond', handleInvitationResponse);
  app.put('/api/invitations/:id/respond', handleInvitationResponse);

  // -----------------------------------------------------------
  // 9. NOTIFICATIONS API
  // -----------------------------------------------------------
  app.get('/api/notifications', (req: Request, res: Response) => {
    const { recipient_type, recipient_id } = req.query;
    const store = getStore();

    let list = store.notifications;

    if (recipient_type && typeof recipient_type === 'string') {
      list = list.filter(n => n.recipient_type === recipient_type);
    }

    if (recipient_id && typeof recipient_id === 'string') {
      list = list.filter(n => n.recipient_id === recipient_id || n.recipient_id === 'ALL_ADMINS');
    }

    res.json(list);
  });

  app.patch('/api/notifications/:id/read', async (req: Request, res: Response) => {
    const { id } = req.params;
    const store = getStore();
    const notif = store.notifications.find(n => n.notification_id === id);
    if (!notif) {
      return res.status(404).json({ error: 'Notifikasi tidak ditemui.' });
    }

    await mutateStore(s => {
      const target = s.notifications.find(n => n.notification_id === id)!;
      target.is_read = true;
    });

    res.json({ message: 'Notifikasi ditanda sebagai telah dibaca.' });
  });

  app.post('/api/notifications/mark-all-read', async (req: Request, res: Response) => {
    const { recipient_type, recipient_id } = req.body;
    await mutateStore(s => {
      s.notifications.forEach(n => {
        if (
          (!recipient_type || n.recipient_type === recipient_type) &&
          (!recipient_id || n.recipient_id === recipient_id || n.recipient_id === 'ALL_ADMINS')
        ) {
          n.is_read = true;
        }
      });
    });
    res.json({ message: 'Semua notifikasi ditanda sebagai telah dibaca.' });
  });

  // -----------------------------------------------------------
  // 10. AUDIT TRAIL API
  // -----------------------------------------------------------
  app.get('/api/admin/audit-logs', requireAdminAuth([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]), (req: AuthRequest, res: Response) => {
    const store = getStore();
    res.json(store.auditLogs);
  });

  // -----------------------------------------------------------
  // 11. PARTICIPATION & ANALYTICS API
  // -----------------------------------------------------------
  app.get('/api/students/:id/history', (req: Request, res: Response) => {
    const { id } = req.params;
    const store = getStore();
    const history = store.participationHistory.filter(p => p.student_id === id);
    res.json(history);
  });

  app.get('/api/participation', (req: Request, res: Response) => {
    const { student_id, student_id_number } = req.query;
    const store = getStore();
    let list = store.participationHistory;
    if (student_id && typeof student_id === 'string') {
      list = list.filter(p => p.student_id === student_id);
    }
    if (student_id_number && typeof student_id_number === 'string') {
      const clean = student_id_number.trim().toUpperCase();
      const stu = store.students.find(s => s.student_id_number.toUpperCase() === clean);
      if (stu) {
        list = list.filter(p => p.student_id === stu.student_id);
      } else {
        list = [];
      }
    }
    res.json(list);
  });

  app.post('/api/participation', requireAdminAuth([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]), async (req: AuthRequest, res: Response) => {
    const { student_id, opportunity_id, opportunity_title, category, role_achieved, year, status } = req.body;
    if (!student_id || !opportunity_title) {
      return res.status(400).json({ error: 'Student ID dan Tajuk Aktiviti diperlukan.' });
    }

    const partId = `part-${Date.now()}`;
    const newRecord: ParticipationRecord = {
      participation_id: partId,
      student_id,
      opportunity_id: opportunity_id || 'manual',
      opportunity_title: opportunity_title.trim(),
      category: category || 'Kolej',
      role_achieved: role_achieved || 'Peserta',
      year: year ? Number(year) : new Date().getFullYear(),
      status: status || 'COMPLETED',
      verified_at: new Date().toISOString(),
    };

    await mutateStore(s => {
      s.participationHistory.push(newRecord);
    });

    await logAudit({
      action: 'CREATE_PARTICIPATION',
      entity_type: 'PARTICIPATION',
      entity_id: partId,
      actor_id: req.adminUser!.admin_id,
      actor_name: req.adminUser!.name,
      actor_role: req.adminUser!.role,
      details: `Rekod penglibatan ditambah untuk pelajar ${student_id}: ${opportunity_title}.`,
    });

    res.status(201).json(newRecord);
  });

  app.get('/api/analytics', (req: Request, res: Response) => {
    const store = getStore();
    const totalStudents = store.students.length;
    const totalSkillsRegistered = store.studentSkills.length;
    const totalOpportunities = store.opportunities.length;
    const activeOpportunities = store.opportunities.filter(o => o.status === OpportunityStatus.OPEN).length;
    const totalApplications = store.applications.length;
    const shortlistedCount = store.applications.filter(a =>
      [ApplicationStatus.SHORTLISTED, ApplicationStatus.SELECTED, ApplicationStatus.CONFIRMED].includes(a.status)
    ).length;
    const screeningCount = store.applications.filter(a =>
      [ApplicationStatus.SUBMITTED, ApplicationStatus.SCREENING, ApplicationStatus.VIDEO_REQUESTED, ApplicationStatus.INTERVIEW].includes(a.status)
    ).length;

    const skillsBreakdown = store.skills.map(sk => {
      const count = store.studentSkills.filter(ss => ss.skill_id === sk.skill_id).length;
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
  // 12. ENHANCED TALENT PROFILE & TALENT REUSE API
  // -----------------------------------------------------------
  app.get('/api/students/:id/full-profile', (req: Request, res: Response) => {
    const { id } = req.params;
    const store = getStore();
    const student = store.students.find(s => s.student_id === id || s.student_id_number.toUpperCase() === id.toUpperCase());
    if (!student) {
      return res.status(404).json({ error: 'Profil pelajar tidak ditemui.' });
    }

    const enrichedStudent = enrichStudentWithSkills(student, store);
    const applications = store.applications
      .filter(a => a.student_id === student.student_id)
      .map(a => enrichApplication(a, store, checkIsAdmin(req)));
    
    const participations = store.participationHistory.filter(p => p.student_id === student.student_id);
    const invitations = store.invitations
      .filter(i => i.student_id === student.student_id)
      .map(inv => {
        const opp = store.opportunities.find(o => o.opportunity_id === inv.opportunity_id);
        return {
          ...inv,
          opportunity: opp ? enrichOpportunity(opp, store) : undefined,
        };
      });

    // Calculate match scores for all open opportunities
    const openOpps = store.opportunities.filter(o => o.status === OpportunityStatus.OPEN);
    const opportunityMatches = openOpps.map(opp => {
      const match = calculateOpportunityMatch(opp, enrichedStudent);
      return {
        opportunity_id: opp.opportunity_id,
        opportunity_title: opp.title,
        category_name: store.categories.find(c => c.category_id === opp.category_id)?.name,
        match,
      };
    }).sort((a, b) => b.match.score - a.match.score);

    // Build Talent Reuse summary list
    const talentReuseBadges = participations.map(p => ({
      activity_name: p.opportunity_title,
      role: p.role_achieved,
      year: p.year,
      category: p.category,
      is_verified: true,
    }));

    res.json({
      student: enrichedStudent,
      applications,
      participations,
      invitations,
      opportunityMatches,
      talentReuseBadges,
    });
  });

  // -----------------------------------------------------------
  // 13. DATA SAFETY CENTRE (SES 4.4 Standard)
  // -----------------------------------------------------------

  // Simpan CSV: Safe CSV Export
  app.get('/api/admin/data-safety/export-csv', requireAdminAuth([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]), async (req: AuthRequest, res: Response) => {
    const entityType = String(req.query.type || 'students');
    try {
      const { filename, content } = exportEntityToCSV(entityType);
      
      await logAudit({
        action: 'EXPORT_CSV',
        entity_type: 'DATA',
        entity_id: entityType,
        actor_id: req.adminUser!.admin_id,
        actor_name: req.adminUser!.name,
        actor_role: req.adminUser!.role,
        details: `Eksport fail CSV bagi entiti "${entityType}" berjaya dimuat turun (${filename}).`,
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(content);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Gagal mengeksport fail CSV.' });
    }
  });

  // Backup Data: List Backups
  app.get('/api/admin/data-safety/backups', requireAdminAuth([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]), async (req: AuthRequest, res: Response) => {
    try {
      const list = await listBackups();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: 'Gagal memuat senarai salinan sandaran.' });
    }
  });

  // Backup Data: Create New Backup
  app.post('/api/admin/data-safety/backup', requireAdminAuth([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]), async (req: AuthRequest, res: Response) => {
    try {
      const meta = await createBackup(req.adminUser!);
      
      await logAudit({
        action: 'CREATE_BACKUP',
        entity_type: 'DATA',
        entity_id: meta.backup_id,
        actor_id: req.adminUser!.admin_id,
        actor_name: req.adminUser!.name,
        actor_role: req.adminUser!.role,
        details: `Salinan sandaran baharu dicipta (${meta.filename}) mengandungi ${meta.counts.students} rekod pelajar.`,
      });

      res.status(201).json({
        message: 'Salinan sandaran berjaya dicipta.',
        backup: meta,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Gagal mencipta salinan sandaran.' });
    }
  });

  // Safe Restore Preview
  app.post('/api/admin/data-safety/restore-preview', requireAdminAuth([AdminRole.SUPER_ADMIN]), async (req: AuthRequest, res: Response) => {
    const { backup_id } = req.body;
    if (!backup_id) {
      return res.status(400).json({ error: 'ID salinan sandaran diperlukan.' });
    }
    try {
      const preview = await previewRestore(backup_id);
      res.json(preview);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Gagal menyemak salinan sandaran.' });
    }
  });

  // Safe Restore Execute
  app.post('/api/admin/data-safety/restore', requireAdminAuth([AdminRole.SUPER_ADMIN]), async (req: AuthRequest, res: Response) => {
    const { backup_id } = req.body;
    if (!backup_id) {
      return res.status(400).json({ error: 'ID salinan sandaran diperlukan.' });
    }
    try {
      const result = await executeRestore(backup_id, req.adminUser!);
      
      await logAudit({
        action: 'RESTORE_DATA',
        entity_type: 'DATA',
        entity_id: backup_id,
        actor_id: req.adminUser!.admin_id,
        actor_name: req.adminUser!.name,
        actor_role: req.adminUser!.role,
        details: `Pemulihan data dilakukan dari salinan ${backup_id} oleh ${req.adminUser!.name}.`,
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Gagal memulihkan salinan sandaran.' });
    }
  });

  // Audit Duplikasi: Reusable Duplicate Detection
  app.get('/api/admin/data-safety/audit-duplicates', requireAdminAuth([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]), async (req: AuthRequest, res: Response) => {
    try {
      const result = auditDuplicates();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Gagal menjalankan audit duplikasi data.' });
    }
  });

  // Import CSV: Step 1 Preview & Validation
  app.post('/api/admin/data-safety/import-csv/preview', requireAdminAuth([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]), (req: AuthRequest, res: Response) => {
    const { entity_type, csv_content } = req.body;
    if (!entity_type || !csv_content) {
      return res.status(400).json({ error: 'Jenis entiti dan kandungan CSV diperlukan.' });
    }
    try {
      const preview = previewCSVImport(entity_type, csv_content);
      res.json(preview);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Gagal menganalisis fail CSV.' });
    }
  });

  // Import CSV: Step 2 Commit Valid Records
  app.post('/api/admin/data-safety/import-csv/commit', requireAdminAuth([AdminRole.SUPER_ADMIN, AdminRole.ADMIN]), async (req: AuthRequest, res: Response) => {
    const { entity_type, records } = req.body;
    if (!entity_type || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Senarai rekod untuk diimport tidak sah.' });
    }
    try {
      const result = await commitCSVImport(entity_type, records, req.adminUser!);

      await logAudit({
        action: 'IMPORT_CSV',
        entity_type: 'DATA',
        entity_id: entity_type,
        actor_id: req.adminUser!.admin_id,
        actor_name: req.adminUser!.name,
        actor_role: req.adminUser!.role,
        details: `Import CSV selesai bagi ${entity_type}: ${result.imported} ditambah, ${result.skipped} dilepaskan.`,
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Gagal melaksanakan proses import data.' });
    }
  });

  // -----------------------------------------------------------
  // 14. TALENT INTELLIGENCE & REPORTING API
  // -----------------------------------------------------------

  // Talent Gap Analysis (Deterministic)
  app.get('/api/admin/analytics/talent-gap', requireAdminAuth(), (req: AuthRequest, res: Response) => {
    try {
      const analysis = generateTalentGapAnalysis();
      res.json(analysis);
    } catch (err: any) {
      res.status(500).json({ error: 'Gagal menjana analisis jurang bakat.' });
    }
  });

  // Opportunity Funnel Analytics
  app.get('/api/admin/analytics/opportunity-funnel', requireAdminAuth(), (req: AuthRequest, res: Response) => {
    const oppId = req.query.opportunity_id ? String(req.query.opportunity_id) : undefined;
    try {
      const funnel = generateOpportunityAnalytics(oppId);
      res.json(funnel);
    } catch (err: any) {
      res.status(500).json({ error: 'Gagal menjana analisis corong peluang.' });
    }
  });

  // Comprehensive Operational Report
  app.get('/api/admin/analytics/operational-report', requireAdminAuth(), (req: AuthRequest, res: Response) => {
    try {
      const report = generateAdminOperationalReport();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: 'Gagal menjana laporan operasi pentadbiran.' });
    }
  });

  // -----------------------------------------------------------
  // 15. PILOT FEEDBACK CENTRE API (SES 4.4 Standard)
  // -----------------------------------------------------------

  // Submit Feedback (Student / Admin / Reviewer)
  app.post('/api/feedbacks', async (req: Request, res: Response) => {
    const { role, user_identifier, user_name, feedback_type, title, description, page_context, rating } = req.body;
    
    if (!title || !description || !feedback_type || !role) {
      return res.status(400).json({ error: 'Sila lengkapkan jenis maklum balas, tajuk, dan perincian.' });
    }

    const validRoles: FeedbackRole[] = ['STUDENT', 'ADMIN', 'REVIEWER'];
    const validTypes: FeedbackType[] = ['BUG', 'USABILITY', 'DATA_ISSUE', 'WORKFLOW_ISSUE', 'CONTENT_ISSUE', 'ENHANCEMENT'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Peranan pengguna tidak sah.' });
    }

    if (!validTypes.includes(feedback_type)) {
      return res.status(400).json({ error: 'Kategori maklum balas tidak sah.' });
    }

    const feedbackId = `fb-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newFeedback: PilotFeedback = {
      feedback_id: feedbackId,
      role,
      user_identifier: (user_identifier || 'ANONYMOUS').trim(),
      user_name: (user_name || 'Pengguna Pilot').trim(),
      feedback_type,
      title: title.trim(),
      description: description.trim(),
      page_context: page_context ? String(page_context).trim() : undefined,
      rating: typeof rating === 'number' && rating >= 1 && rating <= 5 ? rating : undefined,
      status: 'NEW',
      created_at: new Date().toISOString(),
    };

    await mutateStore(s => {
      if (!s.pilotFeedbacks) s.pilotFeedbacks = [];
      s.pilotFeedbacks.unshift(newFeedback);
    });

    await logAudit({
      action: 'SUBMIT_PILOT_FEEDBACK',
      entity_type: 'DATA',
      entity_id: feedbackId,
      actor_id: user_identifier || 'PILOT_USER',
      actor_name: user_name || 'Pengguna Pilot',
      actor_role: role,
      details: `Maklum balas pilot diterima [${feedback_type}] "${title}" (${role}).`,
    });

    res.status(201).json({
      message: 'Terima kasih! Maklum balas anda telah direkodkan untuk tindakan pasukan Unit Bakat KPMBP.',
      feedback: newFeedback,
    });
  });

  // Get All Feedbacks with Filters (Admin & Reviewer)
  app.get('/api/admin/feedbacks', requireAdminAuth(), (req: AuthRequest, res: Response) => {
    const store = getStore();
    const feedbacks = store.pilotFeedbacks || [];
    
    const { role, feedback_type, status, search } = req.query;

    let filtered = [...feedbacks];

    if (role && role !== 'ALL') {
      filtered = filtered.filter(f => f.role === role);
    }

    if (feedback_type && feedback_type !== 'ALL') {
      filtered = filtered.filter(f => f.feedback_type === feedback_type);
    }

    if (status && status !== 'ALL') {
      filtered = filtered.filter(f => f.status === status);
    }

    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(f => 
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.user_name.toLowerCase().includes(q) ||
        f.user_identifier.toLowerCase().includes(q)
      );
    }

    // Sort descending by created_at
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Compute metrics
    const total = feedbacks.length;
    const bugCount = feedbacks.filter(f => f.feedback_type === 'BUG').length;
    const usabilityCount = feedbacks.filter(f => f.feedback_type === 'USABILITY').length;
    const dataIssueCount = feedbacks.filter(f => f.feedback_type === 'DATA_ISSUE').length;
    const workflowCount = feedbacks.filter(f => f.feedback_type === 'WORKFLOW_ISSUE').length;
    const enhancementCount = feedbacks.filter(f => f.feedback_type === 'ENHANCEMENT').length;
    const studentCount = feedbacks.filter(f => f.role === 'STUDENT').length;
    const adminCount = feedbacks.filter(f => f.role === 'ADMIN').length;
    const reviewerCount = feedbacks.filter(f => f.role === 'REVIEWER').length;
    const resolvedCount = feedbacks.filter(f => f.status === 'RESOLVED').length;

    res.json({
      feedbacks: filtered,
      summary: {
        total,
        bugCount,
        usabilityCount,
        dataIssueCount,
        workflowCount,
        enhancementCount,
        studentCount,
        adminCount,
        reviewerCount,
        resolvedCount,
        resolutionRatePercent: total > 0 ? Math.round((resolvedCount / total) * 100) : 100,
      },
    });
  });

  // Update Feedback Status / Response (Admin & Reviewer)
  app.patch('/api/admin/feedbacks/:id', requireAdminAuth(), async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, admin_response } = req.body;

    const store = getStore();
    const index = (store.pilotFeedbacks || []).findIndex(f => f.feedback_id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Rekod maklum balas tidak ditemui.' });
    }

    let updated: PilotFeedback | null = null;

    await mutateStore(s => {
      if (!s.pilotFeedbacks) s.pilotFeedbacks = [];
      const item = s.pilotFeedbacks[index];
      if (status) item.status = status;
      if (admin_response !== undefined) item.admin_response = admin_response;
      s.pilotFeedbacks[index] = item;
      updated = item;
    });

    await logAudit({
      action: 'UPDATE_PILOT_FEEDBACK',
      entity_type: 'DATA',
      entity_id: id,
      actor_id: req.adminUser!.admin_id,
      actor_name: req.adminUser!.name,
      actor_role: req.adminUser!.role,
      details: `Status maklum balas dikemas kini kepada [${status || updated!.status}] oleh ${req.adminUser!.name}.`,
    });

    res.json(updated);
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
    console.log(`KPMBP Talent Platform Server running on port ${PORT} (SES 4.4 Engine Activated)`);
  });
}

startServer();
