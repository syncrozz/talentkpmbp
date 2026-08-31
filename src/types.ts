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
