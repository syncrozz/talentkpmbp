import fs from 'fs/promises';
import path from 'path';
import {
  DataStore,
  getStore,
  mutateStore,
  persistStore
} from './storage.ts';
import {
  Student,
  Opportunity,
  Application,
  Invitation,
  ParticipationRecord,
  StudentSkill,
  BackupMetadata,
  RestorePreview,
  DuplicateAuditResult,
  DuplicateItem,
  CSVImportPreview,
  CSVImportPreviewRow,
  CSVImportResult,
  SkillLevel,
  OpportunityStatus,
  ApplicationStatus,
} from '../types.ts';
import {
  normalizeFullName,
  normalizeStudentIdNumber,
  normalizePhone,
  normalizeEmail,
  generateSlug,
} from '../lib/normalization.ts';

const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');

/**
 * Ensures backup directory exists
 */
async function ensureBackupDir() {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
}

/**
 * -------------------------------------------------------------
 * 1. BACKUP DATA MANAGEMENT (SES 4.4 Standard)
 * -------------------------------------------------------------
 */

export async function createBackup(actor: { admin_id: string; name: string; role: string }): Promise<BackupMetadata> {
  await ensureBackupDir();
  const store = getStore();
  const timestamp = new Date().toISOString();
  const dateSlug = timestamp.replace(/[:.]/g, '-');
  const backupId = `backup-${dateSlug}`;
  const filename = `kpmbp-talent-backup-${dateSlug}.json`;
  const filePath = path.join(BACKUP_DIR, filename);

  const payload = {
    metadata: {
      backup_id: backupId,
      filename,
      timestamp,
      created_by_id: actor.admin_id,
      created_by_name: actor.name,
      actor_role: actor.role,
      engine: 'SES 4.4 Data Safety Engine',
    },
    data: store,
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  await fs.writeFile(filePath, jsonStr, 'utf-8');
  const stat = await fs.stat(filePath);

  const meta: BackupMetadata = {
    backup_id: backupId,
    filename,
    timestamp,
    created_by_id: actor.admin_id,
    created_by_name: actor.name,
    file_size_bytes: stat.size,
    counts: {
      students: store.students.length,
      studentSkills: store.studentSkills.length,
      opportunities: store.opportunities.length,
      applications: store.applications.length,
      invitations: store.invitations.length,
      participationHistory: store.participationHistory.length,
      categories: store.categories.length,
      skills: store.skills.length,
    },
  };

  return meta;
}

export async function listBackups(): Promise<BackupMetadata[]> {
  await ensureBackupDir();
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files.filter(f => f.startsWith('kpmbp-talent-backup-') && f.endsWith('.json'));
    
    const results: BackupMetadata[] = [];
    for (const f of backupFiles) {
      try {
        const filePath = path.join(BACKUP_DIR, f);
        const stat = await fs.stat(filePath);
        const raw = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.metadata && parsed.data) {
          results.push({
            backup_id: parsed.metadata.backup_id || f.replace('.json', ''),
            filename: f,
            timestamp: parsed.metadata.timestamp || stat.mtime.toISOString(),
            created_by_id: parsed.metadata.created_by_id || 'adm-system',
            created_by_name: parsed.metadata.created_by_name || 'Pentadbir KPMBP',
            file_size_bytes: stat.size,
            counts: {
              students: parsed.data.students?.length || 0,
              studentSkills: parsed.data.studentSkills?.length || 0,
              opportunities: parsed.data.opportunities?.length || 0,
              applications: parsed.data.applications?.length || 0,
              invitations: parsed.data.invitations?.length || 0,
              participationHistory: parsed.data.participationHistory?.length || 0,
              categories: parsed.data.categories?.length || 0,
              skills: parsed.data.skills?.length || 0,
            },
          });
        }
      } catch (readErr) {
        // Skip corrupted or unparseable files
      }
    }

    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    console.error('Error listing backups:', err);
    return [];
  }
}

export async function previewRestore(backupId: string): Promise<RestorePreview> {
  await ensureBackupDir();
  const files = await fs.readdir(BACKUP_DIR);
  const targetFile = files.find(f => f.includes(backupId) || f === `${backupId}.json`);
  if (!targetFile) {
    throw new Error('Fail salinan sandaran tidak ditemui.');
  }

  const filePath = path.join(BACKUP_DIR, targetFile);
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw);

  if (!parsed.data) {
    throw new Error('Format salinan sandaran tidak sah atau rosak.');
  }

  const currentStore = getStore();

  return {
    backup_id: backupId,
    timestamp: parsed.metadata?.timestamp || new Date().toISOString(),
    isValid: true,
    currentCounts: {
      students: currentStore.students.length,
      opportunities: currentStore.opportunities.length,
      applications: currentStore.applications.length,
      invitations: currentStore.invitations.length,
      participation: currentStore.participationHistory.length,
    },
    backupCounts: {
      students: parsed.data.students?.length || 0,
      opportunities: parsed.data.opportunities?.length || 0,
      applications: parsed.data.applications?.length || 0,
      invitations: parsed.data.invitations?.length || 0,
      participation: parsed.data.participationHistory?.length || 0,
    },
    warningMessage: 'Tindakan ini akan menggantikan rekod semasa dengan rekod dari salinan sandaran yang dipilih.',
  };
}

export async function executeRestore(
  backupId: string,
  actor: { admin_id: string; name: string; role: string }
): Promise<{ success: boolean; message: string }> {
  await ensureBackupDir();
  const files = await fs.readdir(BACKUP_DIR);
  const targetFile = files.find(f => f.includes(backupId) || f === `${backupId}.json`);
  if (!targetFile) {
    throw new Error('Fail salinan sandaran tidak ditemui.');
  }

  const filePath = path.join(BACKUP_DIR, targetFile);
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw);

  if (!parsed.data) {
    throw new Error('Format data salinan sandaran tidak sah.');
  }

  // Mutate authoritative store safely
  await mutateStore(store => {
    store.categories = parsed.data.categories || store.categories;
    store.skills = parsed.data.skills || store.skills;
    store.students = parsed.data.students || [];
    store.studentSkills = parsed.data.studentSkills || [];
    store.opportunities = parsed.data.opportunities || [];
    store.opportunityQuestions = parsed.data.opportunityQuestions || [];
    store.applications = parsed.data.applications || [];
    store.applicationResponses = parsed.data.applicationResponses || [];
    store.applicationStatusHistory = parsed.data.applicationStatusHistory || [];
    store.adminNotes = parsed.data.adminNotes || [];
    store.invitations = parsed.data.invitations || [];
    store.participationHistory = parsed.data.participationHistory || [];
  });

  return {
    success: true,
    message: `Data berjaya dipulihkan daripada salinan sandaran bertarikh ${parsed.metadata?.timestamp || backupId}.`,
  };
}

/**
 * -------------------------------------------------------------
 * 2. SIMPAN CSV (RFC 4180 Standard Safe Export)
 * -------------------------------------------------------------
 */

function escapeCSVField(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export function exportEntityToCSV(entityType: string): { filename: string; content: string } {
  const store = getStore();
  const nowStr = new Date().toISOString().slice(0, 10);

  switch (entityType.toLowerCase()) {
    case 'students': {
      const headers = ['student_id', 'student_id_number', 'full_name', 'preferred_name', 'programme', 'semester', 'class', 'gender', 'phone', 'email', 'status', 'created_at'];
      const rows = store.students.map(s => [
        escapeCSVField(s.student_id),
        escapeCSVField(s.student_id_number),
        escapeCSVField(s.full_name),
        escapeCSVField(s.preferred_name || ''),
        escapeCSVField(s.programme),
        escapeCSVField(s.semester),
        escapeCSVField(s.class),
        escapeCSVField(s.gender),
        escapeCSVField(s.phone),
        escapeCSVField(s.email),
        escapeCSVField(s.status),
        escapeCSVField(s.created_at),
      ].join(','));
      return {
        filename: `KPMBP_Pelajar_${nowStr}.csv`,
        content: [headers.join(','), ...rows].join('\r\n'),
      };
    }

    case 'studentskills':
    case 'student_skills':
    case 'skills': {
      const headers = ['student_skill_id', 'student_id', 'student_id_number', 'student_name', 'skill_name', 'skill_level', 'experience_duration', 'is_primary', 'created_at'];
      const rows = store.studentSkills.map(ss => {
        const student = store.students.find(s => s.student_id === ss.student_id);
        const skill = store.skills.find(sk => sk.skill_id === ss.skill_id);
        return [
          escapeCSVField(ss.student_skill_id),
          escapeCSVField(ss.student_id),
          escapeCSVField(student?.student_id_number || ''),
          escapeCSVField(student?.full_name || ''),
          escapeCSVField(skill?.skill_name || 'Bakat'),
          escapeCSVField(ss.skill_level),
          escapeCSVField(ss.experience_duration || ''),
          escapeCSVField(ss.is_primary ? 'YA' : 'TIDAK'),
          escapeCSVField(ss.created_at),
        ].join(',');
      });
      return {
        filename: `KPMBP_Kemahiran_Pelajar_${nowStr}.csv`,
        content: [headers.join(','), ...rows].join('\r\n'),
      };
    }

    case 'opportunities': {
      const headers = ['opportunity_id', 'title', 'slug', 'category_name', 'status', 'open_call_roles', 'opening_date', 'closing_date', 'total_applications', 'created_at'];
      const rows = store.opportunities.map(o => {
        const cat = store.categories.find(c => c.category_id === o.category_id);
        const appCount = store.applications.filter(a => a.opportunity_id === o.opportunity_id).length;
        return [
          escapeCSVField(o.opportunity_id),
          escapeCSVField(o.title),
          escapeCSVField(o.slug),
          escapeCSVField(cat?.name || ''),
          escapeCSVField(o.status),
          escapeCSVField((o.open_call_roles || []).join('; ')),
          escapeCSVField(o.opening_date),
          escapeCSVField(o.closing_date),
          escapeCSVField(appCount),
          escapeCSVField(o.created_at),
        ].join(',');
      });
      return {
        filename: `KPMBP_Peluang_Panggilan_Terbuka_${nowStr}.csv`,
        content: [headers.join(','), ...rows].join('\r\n'),
      };
    }

    case 'applications': {
      const headers = ['application_id', 'student_id_number', 'student_name', 'programme', 'opportunity_title', 'status', 'submitted_at', 'reviewed_at', 'reviewed_by'];
      const rows = store.applications.map(a => {
        const s = store.students.find(stu => stu.student_id === a.student_id);
        const o = store.opportunities.find(opp => opp.opportunity_id === a.opportunity_id);
        return [
          escapeCSVField(a.application_id),
          escapeCSVField(s?.student_id_number || ''),
          escapeCSVField(s?.full_name || ''),
          escapeCSVField(s?.programme || ''),
          escapeCSVField(o?.title || ''),
          escapeCSVField(a.status),
          escapeCSVField(a.submitted_at),
          escapeCSVField(a.reviewed_at || ''),
          escapeCSVField(a.reviewed_by || ''),
        ].join(',');
      });
      return {
        filename: `KPMBP_Permohonan_Pelajar_${nowStr}.csv`,
        content: [headers.join(','), ...rows].join('\r\n'),
      };
    }

    case 'invitations': {
      const headers = ['invitation_id', 'student_id_number', 'student_name', 'opportunity_title', 'status', 'invited_by_name', 'notes', 'created_at'];
      const rows = store.invitations.map(i => {
        const s = store.students.find(stu => stu.student_id === i.student_id);
        const o = store.opportunities.find(opp => opp.opportunity_id === i.opportunity_id);
        return [
          escapeCSVField(i.invitation_id),
          escapeCSVField(s?.student_id_number || ''),
          escapeCSVField(s?.full_name || ''),
          escapeCSVField(o?.title || ''),
          escapeCSVField(i.status),
          escapeCSVField(i.invited_by_name || i.invited_by),
          escapeCSVField(i.notes || ''),
          escapeCSVField(i.created_at),
        ].join(',');
      });
      return {
        filename: `KPMBP_Jemputan_Pentadbir_${nowStr}.csv`,
        content: [headers.join(','), ...rows].join('\r\n'),
      };
    }

    case 'participation':
    case 'participationhistory': {
      const headers = ['participation_id', 'student_id_number', 'student_name', 'opportunity_title', 'category', 'role_achieved', 'year', 'status', 'verified_at'];
      const rows = store.participationHistory.map(p => {
        const s = store.students.find(stu => stu.student_id === p.student_id);
        return [
          escapeCSVField(p.participation_id),
          escapeCSVField(s?.student_id_number || ''),
          escapeCSVField(s?.full_name || ''),
          escapeCSVField(p.opportunity_title),
          escapeCSVField(p.category),
          escapeCSVField(p.role_achieved),
          escapeCSVField(p.year),
          escapeCSVField(p.status),
          escapeCSVField(p.verified_at),
        ].join(',');
      });
      return {
        filename: `KPMBP_Sejarah_Penglibatan_${nowStr}.csv`,
        content: [headers.join(','), ...rows].join('\r\n'),
      };
    }

    case 'feedbacks':
    case 'feedback': {
      const headers = ['feedback_id', 'role', 'user_identifier', 'user_name', 'feedback_type', 'title', 'description', 'page_context', 'rating', 'status', 'admin_response', 'created_at'];
      const rows = (store.pilotFeedbacks || []).map(f => [
        escapeCSVField(f.feedback_id),
        escapeCSVField(f.role),
        escapeCSVField(f.user_identifier),
        escapeCSVField(f.user_name),
        escapeCSVField(f.feedback_type),
        escapeCSVField(f.title),
        escapeCSVField(f.description),
        escapeCSVField(f.page_context || ''),
        escapeCSVField(f.rating ? String(f.rating) : ''),
        escapeCSVField(f.status),
        escapeCSVField(f.admin_response || ''),
        escapeCSVField(f.created_at),
      ].join(','));
      return {
        filename: `KPMBP_Maklum_Balas_Pilot_${nowStr}.csv`,
        content: [headers.join(','), ...rows].join('\r\n'),
      };
    }

    default:
      throw new Error(`Kategori eksport CSV "${entityType}" tidak disokong.`);
  }
}

/**
 * -------------------------------------------------------------
 * 3. AUDIT DUPLIKASI (Duplicate Audit Engine)
 * -------------------------------------------------------------
 */

export function auditDuplicates(): DuplicateAuditResult {
  const store = getStore();
  const duplicates: DuplicateItem[] = [];

  // A. Audit Students: ID Number, Normalized Email, Normalized Name + Programme
  const studentIdMap = new Map<string, Student[]>();
  const emailMap = new Map<string, Student[]>();
  const nameMap = new Map<string, Student[]>();

  store.students.forEach(s => {
    const idKey = s.student_id_number.trim().toUpperCase();
    if (!studentIdMap.has(idKey)) studentIdMap.set(idKey, []);
    studentIdMap.get(idKey)!.push(s);

    const emailKey = s.email.trim().toLowerCase();
    if (emailKey) {
      if (!emailMap.has(emailKey)) emailMap.set(emailKey, []);
      emailMap.get(emailKey)!.push(s);
    }

    const nameKey = `${normalizeFullName(s.full_name)}__${(s.programme || '').trim().toUpperCase()}`;
    if (!nameMap.has(nameKey)) nameMap.set(nameKey, []);
    nameMap.get(nameKey)!.push(s);
  });

  studentIdMap.forEach((list, idKey) => {
    if (list.length > 1) {
      duplicates.push({
        id: `dup-stu-id-${idKey}`,
        entity_type: 'STUDENT',
        duplicate_key: idKey,
        reason: `Terdapat ${list.length} rekod pelajar berkongsi ID Pelajar yang sama (${idKey}).`,
        count: list.length,
        affected_records: list.map(l => ({ id: l.student_id, label: `${l.full_name} (${l.student_id_number})` })),
        recommended_action: 'Semak dan gabungkan rekod pelajar atau padam entri pendua yang tidak aktif.',
      });
    }
  });

  emailMap.forEach((list, emailKey) => {
    if (list.length > 1 && !duplicates.some(d => d.entity_type === 'STUDENT' && list.every(item => d.affected_records.some(r => r.id === item.student_id)))) {
      duplicates.push({
        id: `dup-stu-email-${emailKey}`,
        entity_type: 'STUDENT',
        duplicate_key: emailKey,
        reason: `Terdapat ${list.length} profil pelajar berkongsi e-mel yang sama (${emailKey}).`,
        count: list.length,
        affected_records: list.map(l => ({ id: l.student_id, label: `${l.full_name} (${l.student_id_number})` })),
        recommended_action: 'Kemas kini alamat e-mel individu bagi mengelakkan percampuran notifikasi.',
      });
    }
  });

  // B. Audit Applications: Same Student + Same Opportunity
  const appMap = new Map<string, Application[]>();
  store.applications.forEach(appItem => {
    const key = `${appItem.student_id}__${appItem.opportunity_id}`;
    if (!appMap.has(key)) appMap.set(key, []);
    appMap.get(key)!.push(appItem);
  });

  appMap.forEach((list, key) => {
    if (list.length > 1) {
      const student = store.students.find(s => s.student_id === list[0].student_id);
      const opp = store.opportunities.find(o => o.opportunity_id === list[0].opportunity_id);
      duplicates.push({
        id: `dup-app-${key}`,
        entity_type: 'APPLICATION',
        duplicate_key: key,
        reason: `Pelajar ${student?.full_name || 'Pelajar'} mempunyai ${list.length} permohonan aktif bagi peluang "${opp?.title || 'Peluang'}".`,
        count: list.length,
        affected_records: list.map(l => ({ id: l.application_id, label: `Permohonan ${l.application_id} (Status: ${l.status})` })),
        recommended_action: 'Kekalkan permohonan terkini dan arkibkan atau tolak permohonan sebelumnya.',
      });
    }
  });

  // C. Audit Invitations: Same Student + Same Opportunity
  const invMap = new Map<string, Invitation[]>();
  store.invitations.forEach(inv => {
    const key = `${inv.student_id}__${inv.opportunity_id}`;
    if (!invMap.has(key)) invMap.set(key, []);
    invMap.get(key)!.push(inv);
  });

  invMap.forEach((list, key) => {
    if (list.length > 1) {
      const student = store.students.find(s => s.student_id === list[0].student_id);
      const opp = store.opportunities.find(o => o.opportunity_id === list[0].opportunity_id);
      duplicates.push({
        id: `dup-inv-${key}`,
        entity_type: 'INVITATION',
        duplicate_key: key,
        reason: `Terdapat ${list.length} jemputan berulang kepada ${student?.full_name || 'Pelajar'} bagi "${opp?.title || 'Peluang'}".`,
        count: list.length,
        affected_records: list.map(l => ({ id: l.invitation_id, label: `Jemputan ${l.invitation_id} (Status: ${l.status})` })),
        recommended_action: 'Tolak atau batalkan jemputan pendua bagi mengekalkan satu jemputan rasmi sahaja.',
      });
    }
  });

  // D. Audit Participation: Same Student + Same Opportunity + Same Context
  const partMap = new Map<string, ParticipationRecord[]>();
  store.participationHistory.forEach(part => {
    const key = `${part.student_id}__${(part.opportunity_title || '').trim().toLowerCase()}__${part.year}`;
    if (!partMap.has(key)) partMap.set(key, []);
    partMap.get(key)!.push(part);
  });

  partMap.forEach((list, key) => {
    if (list.length > 1) {
      const student = store.students.find(s => s.student_id === list[0].student_id);
      duplicates.push({
        id: `dup-part-${key}`,
        entity_type: 'PARTICIPATION',
        duplicate_key: key,
        reason: `Rekod penglibatan berulang bagi ${student?.full_name || 'Pelajar'} dalam acara "${list[0].opportunity_title}" (Tahun ${list[0].year}).`,
        count: list.length,
        affected_records: list.map(l => ({ id: l.participation_id, label: `Rekod ${l.participation_id} (${l.role_achieved})` })),
        recommended_action: 'Padam rekod penglibatan pendua bagi memastikan ketepatan merit pelajar.',
      });
    }
  });

  const summary = {
    students: duplicates.filter(d => d.entity_type === 'STUDENT').length,
    applications: duplicates.filter(d => d.entity_type === 'APPLICATION').length,
    invitations: duplicates.filter(d => d.entity_type === 'INVITATION').length,
    participation: duplicates.filter(d => d.entity_type === 'PARTICIPATION').length,
  };

  return {
    scanned_at: new Date().toISOString(),
    total_duplicates_found: duplicates.length,
    summary,
    duplicates,
  };
}

/**
 * -------------------------------------------------------------
 * 4. CSV IMPORT & PREVIEW ENGINE (Safe, Normalized, Multi-Phase)
 * -------------------------------------------------------------
 */

/**
 * Parses raw CSV string handling quoted fields and CRLF
 */
export function parseCSVString(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentField.trim());
        if (currentRow.some(c => c.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some(c => c.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(c => c.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

export function previewCSVImport(entityType: string, csvContent: string): CSVImportPreview {
  const parsedRows = parseCSVString(csvContent);
  if (parsedRows.length < 2) {
    return {
      entity_type: entityType,
      total_rows: 0,
      valid_count: 0,
      duplicate_count: 0,
      invalid_count: 0,
      warning_count: 0,
      rows: [],
    };
  }

  const rawHeaders = parsedRows[0].map(h => h.toLowerCase().replace(/[\s_-]+/g, ''));
  const dataRows = parsedRows.slice(1);
  const store = getStore();

  const previewRows: CSVImportPreviewRow[] = [];
  const seenInBatch = new Set<string>();

  switch (entityType.toLowerCase()) {
    case 'students': {
      dataRows.forEach((rowValues, idx) => {
        const rawMap: Record<string, string> = {};
        rawHeaders.forEach((h, hIdx) => {
          rawMap[h] = rowValues[hIdx] || '';
        });

        const rawId = rawMap['studentidnumber'] || rawMap['studentid'] || rawMap['noic'] || rawMap['matrik'] || '';
        const rawName = rawMap['fullname'] || rawMap['name'] || rawMap['namapelajar'] || '';
        const rawProg = rawMap['programme'] || rawMap['program'] || rawMap['kursus'] || 'Diploma in Accounting (DIA)';
        const rawSem = parseInt(rawMap['semester'] || rawMap['sem'] || '1', 10);
        const rawClass = rawMap['class'] || rawMap['kelas'] || 'DIA1A';
        const rawGender = (rawMap['gender'] || rawMap['jantina'] || '').toUpperCase();
        const rawPhone = rawMap['phone'] || rawMap['notel'] || rawMap['telefon'] || '';
        const rawEmail = rawMap['email'] || rawMap['emel'] || '';

        // Validation & Normalization
        const { normalized: normId, isValid: isIdValid } = normalizeStudentIdNumber(rawId);
        const normName = normalizeFullName(rawName);
        const { normalized: normPhone, isValid: isPhoneValid } = normalizePhone(rawPhone);
        const { normalized: normEmail, isValid: isEmailValid } = normalizeEmail(rawEmail);

        let status: 'VALID' | 'DUPLICATE' | 'INVALID' | 'WARNING' = 'VALID';
        let message = 'Sedia untuk diimport.';
        let dupMatchedId: string | undefined = undefined;

        if (!rawName || rawName.trim().length < 3) {
          status = 'INVALID';
          message = 'Nama penuh pelajar tidak sah atau terlalu pendek.';
        } else if (!isIdValid) {
          status = 'INVALID';
          message = 'Format ID Pelajar tidak sah (mesti cth: PDA-2502-011).';
        } else if (!isEmailValid) {
          status = 'INVALID';
          message = 'Format e-mel tidak sah.';
        } else if (!isPhoneValid && rawPhone.trim().length > 0) {
          status = 'WARNING';
          message = 'Format nombor telefon kurang tepat, tetapi masih boleh diimport.';
        }

        // Duplicate Check against batch
        if (status !== 'INVALID') {
          if (seenInBatch.has(normId)) {
            status = 'DUPLICATE';
            message = 'Terdapat entri berulang bagi ID Pelajar ini di dalam fail CSV yang sama.';
          } else {
            seenInBatch.add(normId);

            // Duplicate Check against store
            const existing = store.students.find(s => s.student_id_number.toUpperCase() === normId.toUpperCase());
            if (existing) {
              status = 'DUPLICATE';
              message = `ID Pelajar ${normId} telah wujud dalam pangkalan data (${existing.full_name}).`;
              dupMatchedId = existing.student_id;
            }
          }
        }

        const normalizedData: Partial<Student> = {
          student_id: dupMatchedId || `stu-${Date.now()}-${idx}`,
          student_id_number: normId,
          full_name: normName,
          preferred_name: rawMap['preferredname'] || normName.split(' ')[0],
          programme: rawProg,
          semester: isNaN(rawSem) ? 1 : Math.min(Math.max(rawSem, 1), 6),
          class: rawClass.toUpperCase(),
          gender: rawGender.includes('PEREMPUAN') || rawGender === 'P' || rawGender === 'F' ? 'PEREMPUAN' : 'LELAKI',
          phone: normPhone || rawPhone,
          email: normEmail,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        previewRows.push({
          row_index: idx + 1,
          raw_data: rawMap,
          normalized_data: normalizedData,
          status,
          message,
          duplicate_matched_id: dupMatchedId,
        });
      });
      break;
    }

    case 'studentskills':
    case 'skills': {
      dataRows.forEach((rowValues, idx) => {
        const rawMap: Record<string, string> = {};
        rawHeaders.forEach((h, hIdx) => {
          rawMap[h] = rowValues[hIdx] || '';
        });

        const rawStudentId = rawMap['studentidnumber'] || rawMap['studentid'] || '';
        const rawSkillName = rawMap['skillname'] || rawMap['skill'] || rawMap['bakat'] || '';
        const rawLevel = (rawMap['skilllevel'] || rawMap['level'] || 'INTERMEDIATE').toUpperCase();
        const rawExp = rawMap['experienceduration'] || rawMap['experience'] || rawMap['pengalaman'] || '1 tahun';
        const rawPrimary = (rawMap['isprimary'] || rawMap['primary'] || 'false').toUpperCase();

        const { normalized: normStudentId, isValid: isIdValid } = normalizeStudentIdNumber(rawStudentId);
        const student = store.students.find(s => s.student_id_number.toUpperCase() === normStudentId || s.student_id === rawStudentId);

        let status: 'VALID' | 'DUPLICATE' | 'INVALID' | 'WARNING' = 'VALID';
        let message = 'Sedia untuk diimport.';

        let matchedSkill = store.skills.find(sk => sk.skill_name.toLowerCase() === rawSkillName.toLowerCase().trim());

        if (!rawSkillName || rawSkillName.trim().length < 2) {
          status = 'INVALID';
          message = 'Nama kemahiran diperlukan.';
        } else if (!student && !normStudentId) {
          status = 'INVALID';
          message = 'ID Pelajar tidak sah atau tidak dijumpai.';
        } else if (!student) {
          status = 'WARNING';
          message = `Pelajar (${normStudentId}) belum berdaftar. Kemahiran akan disimpan jika pelajar diwujudkan.`;
        }

        const validLevel = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(rawLevel)
          ? (rawLevel as SkillLevel)
          : SkillLevel.INTERMEDIATE;

        // Check if student already has this skill
        if (student && matchedSkill) {
          const hasSkill = store.studentSkills.some(ss => ss.student_id === student.student_id && ss.skill_id === matchedSkill!.skill_id);
          if (hasSkill) {
            status = 'DUPLICATE';
            message = `Pelajar telah memiliki kemahiran ${matchedSkill.skill_name}.`;
          }
        }

        const normalizedData = {
          student_skill_id: `ss-${Date.now()}-${idx}`,
          student_id: student?.student_id || normStudentId,
          student_id_number: normStudentId,
          skill_id: matchedSkill?.skill_id || `sk-custom-${generateSlug(rawSkillName)}`,
          skill_name: matchedSkill?.skill_name || rawSkillName.trim(),
          skill_level: validLevel,
          experience_duration: rawExp,
          is_primary: rawPrimary === 'TRUE' || rawPrimary === 'YA' || rawPrimary === '1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        previewRows.push({
          row_index: idx + 1,
          raw_data: rawMap,
          normalized_data: normalizedData,
          status,
          message,
        });
      });
      break;
    }

    case 'opportunities': {
      dataRows.forEach((rowValues, idx) => {
        const rawMap: Record<string, string> = {};
        rawHeaders.forEach((h, hIdx) => {
          rawMap[h] = rowValues[hIdx] || '';
        });

        const rawTitle = rawMap['title'] || rawMap['tajuk'] || rawMap['name'] || '';
        const rawCategory = rawMap['categoryname'] || rawMap['category'] || rawMap['kategori'] || 'Music';
        const rawDesc = rawMap['description'] || rawMap['penerangan'] || '';
        const rawRoles = rawMap['opencallroles'] || rawMap['roles'] || rawMap['peranan'] || '';
        const rawClosing = rawMap['closingdate'] || rawMap['tarikhtutup'] || '2026-09-30T23:59:00Z';

        let status: 'VALID' | 'DUPLICATE' | 'INVALID' | 'WARNING' = 'VALID';
        let message = 'Sedia untuk diimport.';

        if (!rawTitle || rawTitle.trim().length < 3) {
          status = 'INVALID';
          message = 'Tajuk peluang terlalu pendek atau kosong.';
        }

        const slug = generateSlug(rawTitle);
        const existingSlug = store.opportunities.find(o => o.slug === slug || o.title.toLowerCase() === rawTitle.toLowerCase());
        if (existingSlug) {
          status = 'DUPLICATE';
          message = `Peluang dengan tajuk atau slug "${slug}" telah wujud.`;
        }

        const matchedCat = store.categories.find(c => c.name.toLowerCase() === rawCategory.toLowerCase() || c.slug === generateSlug(rawCategory));

        const normalizedData: Partial<Opportunity> = {
          opportunity_id: `opp-${Date.now()}-${idx}`,
          title: rawTitle.trim(),
          slug,
          category_id: matchedCat?.category_id || 'cat-music',
          category_name: matchedCat?.name || rawCategory,
          description: rawDesc || `Panggilan terbuka ${rawTitle}.`,
          open_call_roles: rawRoles ? rawRoles.split(/[,;]+/).map(r => r.trim()).filter(Boolean) : ['Peserta'],
          opening_date: new Date().toISOString(),
          closing_date: rawClosing,
          status: OpportunityStatus.OPEN,
          created_by: 'adm-import',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        previewRows.push({
          row_index: idx + 1,
          raw_data: rawMap,
          normalized_data: normalizedData,
          status,
          message,
        });
      });
      break;
    }

    default:
      throw new Error(`Entiti import "${entityType}" tidak disokong.`);
  }

  const validCount = previewRows.filter(r => r.status === 'VALID').length;
  const dupCount = previewRows.filter(r => r.status === 'DUPLICATE').length;
  const invCount = previewRows.filter(r => r.status === 'INVALID').length;
  const warnCount = previewRows.filter(r => r.status === 'WARNING').length;

  return {
    entity_type: entityType,
    total_rows: previewRows.length,
    valid_count: validCount,
    duplicate_count: dupCount,
    invalid_count: invCount,
    warning_count: warnCount,
    rows: previewRows,
  };
}

export async function commitCSVImport(
  entityType: string,
  recordsToImport: any[],
  actor: { admin_id: string; name: string; role: string }
): Promise<CSVImportResult> {
  const store = getStore();
  let imported = 0;
  let skipped = 0;
  let duplicate = 0;
  let invalid = 0;
  const errors: string[] = [];

  await mutateStore(s => {
    switch (entityType.toLowerCase()) {
      case 'students': {
        recordsToImport.forEach(rec => {
          if (!rec.student_id_number || !rec.full_name) {
            invalid++;
            errors.push(`Baris ditolak: Data pelajar tidak lengkap.`);
            return;
          }
          const exists = s.students.some(stu => stu.student_id_number.toUpperCase() === rec.student_id_number.toUpperCase());
          if (exists) {
            duplicate++;
            skipped++;
            return;
          }

          const newStudent: Student = {
            student_id: rec.student_id || `stu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            student_id_number: rec.student_id_number,
            full_name: rec.full_name,
            preferred_name: rec.preferred_name || rec.full_name.split(' ')[0],
            programme: rec.programme || 'Diploma in Accounting (DIA)',
            semester: Number(rec.semester) || 1,
            class: rec.class || 'DIA1A',
            gender: rec.gender || 'LELAKI',
            phone: rec.phone || '012-0000000',
            email: rec.email || `${rec.student_id_number.toLowerCase()}@student.kpmbp.edu.my`,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          s.students.push(newStudent);
          imported++;
        });
        break;
      }

      case 'studentskills':
      case 'skills': {
        recordsToImport.forEach(rec => {
          let studentId = rec.student_id;
          if (rec.student_id_number) {
            const foundStudent = s.students.find(stu => stu.student_id_number.toUpperCase() === rec.student_id_number.toUpperCase());
            if (foundStudent) studentId = foundStudent.student_id;
          }

          if (!studentId || !rec.skill_name) {
            invalid++;
            errors.push('Baris kemahiran ditolak: ID Pelajar atau nama kemahiran tidak sah.');
            return;
          }

          // Ensure skill exists in category
          let skillObj = s.skills.find(sk => sk.skill_name.toLowerCase() === rec.skill_name.toLowerCase());
          if (!skillObj) {
            skillObj = {
              skill_id: `sk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              skill_name: rec.skill_name,
              category_id: 'cat-music',
              status: 'ACTIVE',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            s.skills.push(skillObj);
          }

          const alreadyHas = s.studentSkills.some(ss => ss.student_id === studentId && ss.skill_id === skillObj!.skill_id);
          if (alreadyHas) {
            duplicate++;
            skipped++;
            return;
          }

          const newStudentSkill: StudentSkill = {
            student_skill_id: rec.student_skill_id || `ss-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            student_id: studentId,
            skill_id: skillObj.skill_id,
            skill_level: rec.skill_level || SkillLevel.INTERMEDIATE,
            experience_duration: rec.experience_duration || '1 tahun',
            is_primary: Boolean(rec.is_primary),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          s.studentSkills.push(newStudentSkill);
          imported++;
        });
        break;
      }

      case 'opportunities': {
        recordsToImport.forEach(rec => {
          if (!rec.title) {
            invalid++;
            errors.push('Peluang ditolak: Tajuk tidak dinyatakan.');
            return;
          }
          const slug = rec.slug || generateSlug(rec.title);
          const exists = s.opportunities.some(o => o.slug === slug);
          if (exists) {
            duplicate++;
            skipped++;
            return;
          }

          const newOpp: Opportunity = {
            opportunity_id: rec.opportunity_id || `opp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: rec.title,
            slug,
            category_id: rec.category_id || 'cat-music',
            description: rec.description || `Panggilan terbuka ${rec.title}.`,
            open_call_roles: Array.isArray(rec.open_call_roles) ? rec.open_call_roles : ['Peserta'],
            opening_date: rec.opening_date || new Date().toISOString(),
            closing_date: rec.closing_date || '2026-09-30T23:59:00Z',
            status: OpportunityStatus.OPEN,
            created_by: actor.admin_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          s.opportunities.push(newOpp);
          imported++;
        });
        break;
      }

      default:
        throw new Error(`Entiti ${entityType} tidak disokong.`);
    }
  });

  return {
    entity_type: entityType,
    imported,
    skipped,
    duplicate,
    invalid,
    message: `Proses import selesai. ${imported} rekod berjaya diimport (${skipped} dilepaskan/pendua, ${invalid} tidak sah).`,
    timestamp: new Date().toISOString(),
    errors,
  };
}
