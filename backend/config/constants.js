/**
 * Application Constants and Enums
 * IEM Student Admission Portal
 */

const ROLES = Object.freeze({
  STUDENT: 'student',
  ADMIN: 'admin'
});

const APPLICATION_STATUS = Object.freeze({
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  SELECTED: 'Selected',
  REJECTED: 'Rejected'
});

const DOCUMENT_TYPES = Object.freeze({
  PHOTO: 'photo',
  SIGNATURE: 'signature',
  MARKSHEET_10: 'marksheet10',
  MARKSHEET_12: 'marksheet12',
  RANK_CARD: 'rankCard'
});

const ALLOWED_MIME_TYPES = Object.freeze([
  'application/pdf',
  'image/jpeg',
  'image/png'
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// System-wide active admission cycle controlled strictly by the backend
const ACTIVE_ADMISSION_CYCLE = process.env.ACTIVE_ADMISSION_CYCLE || '2026-2027';

module.exports = {
  ROLES,
  APPLICATION_STATUS,
  DOCUMENT_TYPES,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  ACTIVE_ADMISSION_CYCLE
};

