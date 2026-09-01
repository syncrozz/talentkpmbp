/**
 * KPMBP Student Talent & Opportunity Platform
 * SES 4.4 Data Normalization, Live Input Masking & Validation Engine
 * 
 * Principle: "USER MASUKKAN DATA, SISTEM URUSKAN FORMAT."
 */

export const STUDENT_ID_REGEX = /^[A-Z]{3}-[0-9]{4}-[0-9]{3}$/;
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const PHONE_REGEX = /^(?:01[0-9]|601[0-9])-[0-9]{7,8}$/;

/**
 * Normalizes Student Full Name:
 * - UPPERCASE
 * - Trim leading/trailing whitespaces
 * - Collapse multiple spaces into a single space
 */
export function normalizeFullName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/**
 * Live Masking for Student ID input (as user types/pastes)
 * Input: "pda2502011" -> "PDA-2502-011"
 */
export function maskStudentIdInput(val: string): string {
  if (!val) return '';
  // Remove all non-alphanumeric characters and make uppercase
  const clean = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  // Format into XXX-XXXX-XXX
  let formatted = '';
  if (clean.length > 0) {
    formatted += clean.substring(0, 3);
  }
  if (clean.length > 3) {
    formatted += '-' + clean.substring(3, 7);
  }
  if (clean.length > 7) {
    formatted += '-' + clean.substring(7, 10);
  }
  return formatted;
}

/**
 * Normalizes Student ID Number and validates regex
 */
export function normalizeStudentIdNumber(val: string): { normalized: string; isValid: boolean; error?: string } {
  if (!val) {
    return { normalized: '', isValid: false, error: 'ID Pelajar diperlukan' };
  }
  
  const formatted = maskStudentIdInput(val);
  const isValid = STUDENT_ID_REGEX.test(formatted);
  
  return {
    normalized: formatted,
    isValid,
    error: isValid ? undefined : 'Format ID Pelajar mestilah XXX-XXXX-XXX (contoh: PDA-2502-011)',
  };
}

/**
 * Live Masking for Phone Number (Malaysia)
 * 0145313756 -> 014-5313756
 * 60145313756 -> 6014-5313756
 * 01112345678 -> 011-12345678
 */
export function maskPhoneInput(val: string): string {
  if (!val) return '';
  // Keep only digits
  const clean = val.replace(/\D/g, '');
  
  // If starts with 601
  if (clean.startsWith('601')) {
    if (clean.length <= 4) return clean;
    return `${clean.substring(0, 4)}-${clean.substring(4, 12)}`;
  }
  
  // If starts with 01
  if (clean.startsWith('01')) {
    if (clean.length <= 3) return clean;
    return `${clean.substring(0, 3)}-${clean.substring(3, 11)}`;
  }
  
  return clean;
}

/**
 * Normalizes Phone Number and validates
 */
export function normalizePhone(val: string): { normalized: string; isValid: boolean; error?: string } {
  if (!val) {
    return { normalized: '', isValid: false, error: 'Nombor telefon diperlukan' };
  }
  
  const masked = maskPhoneInput(val);
  const isValid = PHONE_REGEX.test(masked);
  
  return {
    normalized: masked,
    isValid,
    error: isValid ? undefined : 'Format nombor telefon mestilah 01X-XXXXXXX atau 601X-XXXXXXX',
  };
}

/**
 * Normalizes Email:
 * - trim whitespace
 * - lowercase
 */
export function normalizeEmail(val: string): { normalized: string; isValid: boolean; error?: string } {
  if (!val) {
    return { normalized: '', isValid: false, error: 'E-mel diperlukan' };
  }
  
  const clean = val.trim().toLowerCase();
  const isValid = EMAIL_REGEX.test(clean);
  
  return {
    normalized: clean,
    isValid,
    error: isValid ? undefined : 'Sila masukkan alamat e-mel yang sah',
  };
}

/**
 * Generates URL-friendly, clean, unique slug from title
 * Example: "Legacy Band 2026" -> "legacy-band-2026"
 * Prevents duplicate dashes, removes special characters
 */
export function generateSlug(title: string): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // remove invalid chars
    .replace(/[\s_]+/g, '-') // replace spaces & underscores with single dash
    .replace(/-+/g, '-') // collapse consecutive dashes
    .replace(/^-+|-+$/g, ''); // trim leading/trailing dashes
}

/**
 * Validates slug format
 */
export function validateSlug(slug: string): { isValid: boolean; error?: string } {
  if (!slug) {
    return { isValid: false, error: 'Slug diperlukan' };
  }
  const clean = slug.trim();
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const isValid = slugRegex.test(clean);
  return {
    isValid,
    error: isValid ? undefined : 'Slug mestilah mengandungi huruf kecil, nombor, dan sengkang tunggal sahaja.',
  };
}
