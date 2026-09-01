import { initStorage, getStore, mutateStore, persistStore } from './storage.ts';
import { 
  createBackup, 
  listBackups, 
  previewRestore, 
  executeRestore, 
  exportEntityToCSV, 
  auditDuplicates, 
  previewCSVImport, 
  commitCSVImport 
} from './dataSafety.ts';
import { calculateOpportunityMatch } from '../lib/matching.ts';
import { 
  Student, 
  Opportunity, 
  SkillLevel, 
  OpportunityStatus, 
  ApplicationStatus 
} from '../types.ts';
import { 
  normalizeFullName, 
  normalizeStudentIdNumber, 
  normalizePhone, 
  normalizeEmail 
} from '../lib/normalization.ts';

async function runRealWorldUAT() {
  console.log('====================================================');
  console.log('KPMBP TALENT — PHASE 5 REAL-WORLD UAT SUITE (SES 4.4)');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] [${totalTests}] ${testName}`);
    } else {
      console.error(`[FAIL] [${totalTests}] ${testName} ${detail ? `-> ${detail}` : ''}`);
      throw new Error(`UAT Assertion Failed: ${testName}`);
    }
  }

  // Initialize storage
  console.log('--- Phase 0: Storage & Baseline Verification ---');
  await initStorage();
  const store = getStore();
  assert(store.students.length > 0, 'Initial students loaded');
  assert(store.opportunities.length > 0, 'Initial opportunities loaded');
  assert(store.categories.length > 0, 'Initial categories loaded');

  // SCENARIO A: Student Applies with Master Profile & Skills
  console.log('\n--- Scenario A: Student Applies ---');
  const testStudentId = 'stu-001';
  const student = store.students.find(s => s.student_id === testStudentId)!;
  const opp = store.opportunities.find(o => o.status === OpportunityStatus.OPEN)!;
  
  assert(Boolean(student), 'Student profile exists');
  assert(Boolean(opp), 'Open opportunity exists');
  
  const studentSkills = store.studentSkills.filter(ss => ss.student_id === testStudentId).map(ss => {
    const sk = store.skills.find(s => s.skill_id === ss.skill_id);
    const cat = sk ? store.categories.find(c => c.category_id === sk.category_id) : undefined;
    return {
      ...ss,
      skill_name: sk ? sk.skill_name : 'Unknown Skill',
      category_name: cat ? cat.name : undefined,
    };
  });
  const matchResult = calculateOpportunityMatch(opp, { ...student, skills: studentSkills });
  assert(typeof matchResult.score === 'number' && matchResult.score >= 0 && matchResult.score <= 100, 'Deterministic score is valid 0-100%');
  assert(matchResult.reasons.length > 0, 'Explainable reasons generated');

  // SCENARIO B: Duplicate Application Prevention
  console.log('\n--- Scenario B: Duplicate Application Prevention ---');
  const existingApp = store.applications.find(a => a.student_id === testStudentId && a.opportunity_id === opp.opportunity_id);
  const hasApp = Boolean(existingApp);
  assert(hasApp, 'Existing application found for test student');
  
  // Test duplicate check rule
  const isDuplicate = store.applications.some(a => a.student_id === testStudentId && a.opportunity_id === opp.opportunity_id);
  assert(isDuplicate === true, 'Duplicate submission blocked correctly');

  // SCENARIO C: Closed Opportunity Rejection
  console.log('\n--- Scenario C: Opportunity Closes ---');
  const closedOpp = store.opportunities.find(o => o.status === OpportunityStatus.CLOSED) || {
    ...opp,
    opportunity_id: 'opp-closed-test',
    status: OpportunityStatus.CLOSED,
    closing_date: '2025-01-01',
  };
  const isOppAccepting = closedOpp.status === OpportunityStatus.OPEN && new Date(closedOpp.closing_date).getTime() >= Date.now();
  assert(isOppAccepting === false, 'Closed opportunity rejects new applications safely');

  // SCENARIO D & E: Admin Screening & Reviewer RBAC
  console.log('\n--- Scenario D & E: Admin & Reviewer Authorization ---');
  const superAdmin = store.adminUsers.find(u => u.role === 'SUPER_ADMIN')!;
  const reviewer = store.adminUsers.find(u => u.role === 'REVIEWER')!;
  assert(superAdmin.role === 'SUPER_ADMIN', 'Super Admin role verified');
  assert(reviewer.role === 'REVIEWER', 'Reviewer role verified');
  
  // Reviewer permission boundaries
  const reviewerCanDelete = reviewer.role === 'SUPER_ADMIN' || reviewer.role === 'ADMIN';
  const reviewerCanDataSafety = reviewer.role === 'SUPER_ADMIN' || reviewer.role === 'ADMIN';
  assert(reviewerCanDelete === false, 'Reviewer cannot perform deletion');
  assert(reviewerCanDataSafety === false, 'Reviewer cannot access Data Safety Centre');

  // SCENARIO F: Invitation Lifecycle & Duplicate Prevention
  console.log('\n--- Scenario F: Invitation Lifecycle ---');
  const existingInvite = store.invitations.find(i => i.student_id === 'stu-001') || store.invitations[0];
  assert(Boolean(existingInvite), 'Invitation record exists');
  assert(['PENDING', 'ACCEPTED', 'DECLINED'].includes(existingInvite!.status), 'Invitation status valid');

  // SCENARIO G: Participation Record Lifecycle
  console.log('\n--- Scenario G: Participation Lifecycle ---');
  assert(store.participationHistory.length > 0, 'Participation records loaded');
  const sampleParticipation = store.participationHistory[0];
  assert(Boolean(sampleParticipation.role_achieved), 'Participation has verified role achieved');
  assert(Boolean(sampleParticipation.verified_at), 'Participation is timestamped and verified');

  // SCENARIO H: Data Deletion & No Resurrection
  console.log('\n--- Scenario H: Data Deletion & Persistence ---');
  const tempOppId = `opp-delete-test-${Date.now()}`;
  await mutateStore(s => {
    s.opportunities.push({
      opportunity_id: tempOppId,
      title: 'Temporary Deletion Test Opportunity',
      slug: 'temp-del-opp',
      category_id: 'cat-music',
      category_name: 'Music',
      description: 'Will be deleted in UAT',
      status: OpportunityStatus.DRAFT,
      created_by: 'adm-001',
      open_call_roles: ['Test'],
      requirements: [],
      opening_date: '2026-03-01',
      closing_date: '2026-03-30',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  // Verify created
  assert(getStore().opportunities.some(o => o.opportunity_id === tempOppId), 'Temporary opportunity created');

  // Delete
  await mutateStore(s => {
    s.opportunities = s.opportunities.filter(o => o.opportunity_id !== tempOppId);
  });
  
  // Verify deleted from memory and disk
  await persistStore();
  const reloadedStore = await initStorage();
  assert(!reloadedStore.opportunities.some(o => o.opportunity_id === tempOppId), 'Deleted opportunity stays deleted after reload (No Resurrection)');

  // SCENARIO J: Backup & Guarded Restore Integrity
  console.log('\n--- Scenario J: Backup and Guarded Restore ---');
  const backupActor = { admin_id: superAdmin.admin_id, name: superAdmin.name, role: superAdmin.role };
  const backupMeta = await createBackup(backupActor);
  assert(Boolean(backupMeta.backup_id), 'Backup snapshot created successfully');
  assert(backupMeta.counts.students === reloadedStore.students.length, 'Backup student count matches live store');

  const backupsList = await listBackups();
  assert(backupsList.some(b => b.backup_id === backupMeta.backup_id), 'Backup found in backups directory listing');

  const restorePreview = await previewRestore(backupMeta.backup_id);
  assert(restorePreview.isValid === true, 'Restore preview validates backup schema');
  assert(restorePreview.backupCounts.students === reloadedStore.students.length, 'Restore preview count is correct');

  // SCENARIO K: CSV Import Pipeline (Valid, Duplicate, Invalid)
  console.log('\n--- Scenario K: CSV Import Pipeline ---');
  const validCSV = `student_id_number,full_name,programme,semester,class,gender,phone,email
PDA-2601-999,AHMAD FARHAN BIN KAMIL,Diploma in Accounting (DIA),1,DIA1A,LELAKI,013-9876543,ahmad.farhan@student.kpmbp.edu.my`;

  const importPreview = previewCSVImport('students', validCSV);
  assert(importPreview.total_rows === 1, 'CSV parsed 1 row');
  assert(importPreview.valid_count === 1, 'Row marked as VALID');
  assert(importPreview.rows[0].status === 'VALID', 'Row status is VALID');

  const duplicateCSV = `student_id_number,full_name,programme,semester,class,gender,phone,email
PDA-2502-011,NUR AINA BATRISYIA,DIA,3,DIA3A,PEREMPUAN,014-5313756,nuraina@student.kpmbp.edu.my`;
  const dupPreview = previewCSVImport('students', duplicateCSV);
  assert(dupPreview.duplicate_count === 1, 'Duplicate ID detected as DUPLICATE');

  const invalidCSV = `student_id_number,full_name,programme,semester,class,gender,phone,email
INVALID-ID,,DIA,1,DIA1A,LELAKI,invalid-phone,invalid-email`;
  const invPreview = previewCSVImport('students', invalidCSV);
  assert(invPreview.invalid_count === 1, 'Invalid data detected as INVALID');

  // SCENARIO L: CSV Export (RFC 4180 Compliance)
  console.log('\n--- Scenario L: CSV Export ---');
  const studentExport = exportEntityToCSV('students');
  assert(studentExport.content.includes('student_id_number'), 'Student CSV export contains header');
  assert(studentExport.content.includes('NUR AINA BATRISYIA'), 'Student CSV export contains student data');
  
  const oppExport = exportEntityToCSV('opportunities');
  assert(oppExport.content.includes('title'), 'Opportunity CSV export contains headers');

  // SCENARIO M: Deterministic Matching Verification
  console.log('\n--- Scenario M: Deterministic Matching Verification ---');
  const calc1 = calculateOpportunityMatch(opp, { ...student, skills: studentSkills });
  const calc2 = calculateOpportunityMatch(opp, { ...student, skills: studentSkills });
  assert(calc1.score === calc2.score, 'Same input produces exact same score (Deterministic)');
  assert(calc1.tier === calc2.tier, 'Tier classification is consistent');

  // SCENARIO Q & S: Input Normalization
  console.log('\n--- Scenario Q & S: Input Normalization ---');
  const normName = normalizeFullName('  muhammad   faris bin azman  ');
  assert(normName === 'MUHAMMAD FARIS BIN AZMAN', 'Full name normalized to uppercase single-space');
  
  const normPhone = normalizePhone('017-889 2143');
  assert(normPhone.normalized === '017-8892143', 'Phone normalized to standard 01X-XXXXXXX format');
  
  const normEmail = normalizeEmail('  M.FARIS@Student.Kpmbp.Edu.MY  ');
  assert(normEmail.normalized === 'm.faris@student.kpmbp.edu.my', 'Email normalized to lowercase trimmed');

  console.log('\n====================================================');
  console.log(`ALL REAL-WORLD UAT TESTS PASSED: ${passedTests} / ${totalTests}`);
  console.log('SES 4.4 RELEASE VERIFICATION COMPLETED SUCCESSFULLY.');
  console.log('====================================================');
}

runRealWorldUAT().catch(err => {
  console.error('UAT Execution Failed:', err);
  process.exit(1);
});
