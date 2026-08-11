import type { PdfCvContent, ValidationResult } from './pdf-content.types';

export function validateCvForExport(cv: PdfCvContent): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!cv.identity?.fullName?.trim()) {
    errors.push('Full name is required');
  }
  if (!cv.identity?.email?.trim()) {
    errors.push('Email is required');
  }

  if (!cv.experiences?.length) {
    warnings.push('No work experience added');
  }
  if (!cv.education?.length) {
    warnings.push('No education added');
  }
  if (!cv.skills?.length) {
    warnings.push('No skills added');
  }

  const photo = cv.identity?.photoUrl;
  if (photo && photo.startsWith('data:') && photo.length > 2_000_000) {
    warnings.push('Profile photo is large; PDF generation may be slow');
  }

  return { valid: errors.length === 0, errors, warnings };
}
