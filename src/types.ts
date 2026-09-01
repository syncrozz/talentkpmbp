export enum SkillLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export enum OpportunityStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export enum ApplicationStatus {
  INTERESTED = 'INTERESTED',
  SUBMITTED = 'SUBMITTED',
  SCREENING = 'SCREENING',
  VIDEO_REQUESTED = 'VIDEO_REQUESTED',
  INTERVIEW = 'INTERVIEW',
  SHORTLISTED = 'SHORTLISTED',
  TRIAL = 'TRIAL',
  SELECTED = 'SELECTED',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum QuestionType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  SINGLE_SELECT = 'SINGLE_SELECT',
  MULTI_SELECT = 'MULTI_SELECT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  URL = 'URL',
  VIDEO_LINK = 'VIDEO_LINK',
  BOOLEAN = 'BOOLEAN',
}

export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  REVIEWER = 'REVIEWER',
}

export interface Student {
  student_id: string; // Internal UUID
  student_id_number: string; // Formatted XXX-XXXX-XXX
  full_name: string; // UPPERCASE
  preferred_name?: string;
  programme: string; // e.g., DIA, DBS, DIT, DCIS, DCS
  semester: number; // 1 - 6
  class: string; // e.g., DIA3A, DBS2B
  gender: 'LELAKI' | 'PEREMPUAN';
  phone: string; // Formatted 01X-XXXXXXX
  email: string; // lowercase
  status: 'ACTIVE' | 'INACTIVE' | 'GRADUATED';
  skills?: StudentSkillWithDetails[];
  created_at: string;
  updated_at: string;
}

export interface Category {
  category_id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  created_at: string;
}

export interface Skill {
  skill_id: string;
  skill_name: string;
  category_id: string;
  category_name?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface StudentSkill {
  student_skill_id: string;
  student_id: string;
  skill_id: string;
  skill_level: SkillLevel;
  experience_duration?: string; // e.g. "2 tahun", "Sejak sekolah menengah"
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentSkillWithDetails extends StudentSkill {
  skill_name: string;
  category_name?: string;
}

export interface OpportunityRequirement {
  requirement_id?: string;
  skill_id?: string;
  skill_name?: string;
  minimum_level?: SkillLevel;
  is_required: boolean;
  notes?: string;
}

export interface Opportunity {
  opportunity_id: string;
  title: string;
  slug: string;
  category_id: string;
  category_name?: string;
  description: string;
  requirements?: OpportunityRequirement[];
  open_call_roles?: string[]; // e.g., ["Guitar", "Bass"]
  opening_date: string;
  closing_date: string;
  status: OpportunityStatus;
  max_applicants?: number;
  banner_tag?: string;
  questions?: OpportunityQuestion[];
  created_by: string;
  created_at: string;
  updated_at: string;
  total_applications?: number;
}

export interface OpportunityQuestion {
  question_id: string;
  opportunity_id: string;
  question_text: string;
  question_type: QuestionType;
  placeholder?: string;
  help_text?: string;
  is_required: boolean;
  sort_order: number;
  options?: string[]; // For SELECT types
  validation_rule?: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationResponse {
  response_id: string;
  application_id: string;
  question_id: string;
  question_text?: string;
  response_value: string | string[] | boolean | number;
  created_at: string;
  updated_at: string;
}

export interface ApplicationStatusHistory {
  history_id: string;
  application_id: string;
  old_status: ApplicationStatus | null;
  new_status: ApplicationStatus;
  changed_by: string;
  changed_at: string;
  remarks?: string;
}

export interface AdminNote {
  note_id: string;
  application_id: string;
  admin_id: string;
  admin_name: string;
  note: string;
  created_at: string;
}

export interface Application {
  application_id: string;
  student_id: string;
  opportunity_id: string;
  status: ApplicationStatus;
  submitted_at: string;
  updated_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  admin_notes?: string;
  notes_list?: AdminNote[];
  status_history?: ApplicationStatusHistory[];
  responses?: ApplicationResponse[];
  student?: Student;
  opportunity?: Opportunity;
}

export interface AdminUser {
  admin_id: string;
  name: string;
  email: string;
  role: AdminRole;
  department: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface Invitation {
  invitation_id: string;
  student_id: string;
  opportunity_id: string;
  invited_by: string;
  invited_by_name?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  notes?: string;
  message?: string;
  created_at: string;
  student?: Student;
  opportunity?: Opportunity;
}

export interface ParticipationRecord {
  participation_id: string;
  student_id: string;
  opportunity_id: string;
  opportunity_title: string;
  category: string;
  role_achieved: string;
  year: number;
  status: 'COMPLETED' | 'ONGOING';
  verified_at: string;
}

export interface MatchedSkillDetail {
  skill_name: string;
  student_level: SkillLevel;
  required_level?: SkillLevel;
  is_primary: boolean;
  level_met: boolean;
}

export interface MatchResult {
  score: number; // 0 - 100
  tier: 'EXCELLENT' | 'STRONG' | 'MODERATE' | 'POTENTIAL' | 'NONE';
  matched_skills: MatchedSkillDetail[];
  reasons: string[];
  matched_items: string[];
  partial_items: string[];
  missing_items: string[];
}

export interface NotificationItem {
  notification_id: string;
  recipient_type: 'STUDENT' | 'ADMIN';
  recipient_id: string; // student_id, admin_id, or 'ALL_ADMINS'
  title: string;
  message: string;
  type: 'APPLICATION_SUBMITTED' | 'STATUS_CHANGED' | 'INVITATION_RECEIVED' | 'INVITATION_RESPONDED' | 'SYSTEM';
  related_entity_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  log_id: string;
  action: string;
  entity_type: 'OPPORTUNITY' | 'APPLICATION' | 'STUDENT' | 'INVITATION' | 'PARTICIPATION' | 'AUTH' | 'DATA';
  entity_id: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  timestamp: string;
  details: string;
}

export interface BackupMetadata {
  backup_id: string;
  filename: string;
  timestamp: string;
  created_by_id: string;
  created_by_name: string;
  file_size_bytes: number;
  counts: {
    students: number;
    studentSkills: number;
    opportunities: number;
    applications: number;
    invitations: number;
    participationHistory: number;
    categories: number;
    skills: number;
  };
}

export interface RestorePreview {
  backup_id: string;
  timestamp: string;
  isValid: boolean;
  currentCounts: Record<string, number>;
  backupCounts: Record<string, number>;
  warningMessage?: string;
}

export interface DuplicateItem {
  id: string;
  entity_type: 'STUDENT' | 'APPLICATION' | 'INVITATION' | 'PARTICIPATION';
  duplicate_key: string;
  reason: string;
  count: number;
  affected_records: any[];
  recommended_action: string;
}

export interface DuplicateAuditResult {
  scanned_at: string;
  total_duplicates_found: number;
  summary: {
    students: number;
    applications: number;
    invitations: number;
    participation: number;
  };
  duplicates: DuplicateItem[];
}

export interface CSVImportPreviewRow {
  row_index: number;
  raw_data: Record<string, string>;
  normalized_data: any;
  status: 'VALID' | 'DUPLICATE' | 'INVALID' | 'WARNING';
  message: string;
  duplicate_matched_id?: string;
}

export interface CSVImportPreview {
  entity_type: string;
  total_rows: number;
  valid_count: number;
  duplicate_count: number;
  invalid_count: number;
  warning_count: number;
  rows: CSVImportPreviewRow[];
}

export interface CSVImportResult {
  entity_type: string;
  imported: number;
  skipped: number;
  duplicate: number;
  invalid: number;
  message: string;
  timestamp: string;
  errors: string[];
}

export interface TalentGapSkill {
  skill_name: string;
  category_name: string;
  required_by_opportunities: string[];
  available_students_count: number;
  advanced_count: number;
  intermediate_count: number;
  beginner_count: number;
  coverage_status: 'SUFFICIENT' | 'LOW' | 'MISSING';
  recommendation: string;
}

export interface TalentGapAnalysis {
  total_skills_evaluated: number;
  sufficient_count: number;
  low_count: number;
  missing_count: number;
  skill_gaps: TalentGapSkill[];
  generated_at: string;
}

export interface OpportunityFunnelAnalytics {
  opportunity_id: string;
  title: string;
  category_name?: string;
  total_applications: number;
  screening_count: number;
  shortlisted_count: number;
  selected_count: number;
  confirmed_count: number;
  participation_count: number;
  conversion_rate_percent: number;
  top_matched_talents: { student_name: string; score: number; student_id_number: string }[];
  unmet_requirements: string[];
}

export type FeedbackType = 'BUG' | 'USABILITY' | 'DATA_ISSUE' | 'WORKFLOW_ISSUE' | 'CONTENT_ISSUE' | 'ENHANCEMENT';
export type FeedbackRole = 'STUDENT' | 'ADMIN' | 'REVIEWER';

export interface PilotFeedback {
  feedback_id: string;
  role: FeedbackRole;
  user_identifier: string; // e.g. student_id_number, student full name, or admin email
  user_name: string;
  feedback_type: FeedbackType;
  title: string;
  description: string;
  page_context?: string; // e.g. 'Peluang', 'Permohonan', 'Screening', 'Padanan', 'Keselamatan Data'
  rating?: number; // 1 - 5 optional
  status: 'NEW' | 'REVIEWED' | 'RESOLVED';
  admin_response?: string;
  created_at: string;
}

