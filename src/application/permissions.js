import { ForbiddenError } from '../shared/errors.js';

export const PERMISSIONS = Object.freeze({
  READ_STUDENTS: 'students.read',
  WRITE_STUDENTS: 'students.write',
  READ_ACADEMICS: 'academics.read',
  WRITE_ACADEMICS: 'academics.write',
  READ_FINANCE: 'finance.read',
  WRITE_FINANCE: 'finance.write',
  POST_PAYMENT: 'finance.payment.post',
  READ_AUDIT: 'audit.read',
});

const ROLE_PERMISSIONS = Object.freeze({
  administrator: new Set(Object.values(PERMISSIONS)),
  cashier: new Set([PERMISSIONS.READ_STUDENTS, PERMISSIONS.READ_ACADEMICS, PERMISSIONS.READ_FINANCE, PERMISSIONS.POST_PAYMENT]),
  viewer: new Set([PERMISSIONS.READ_STUDENTS, PERMISSIONS.READ_ACADEMICS]),
});

export function hasPermission(user, permission) {
  return Boolean(user && ROLE_PERMISSIONS[user.role]?.has(permission));
}

export function requirePermission(user, permission) {
  if (!hasPermission(user, permission)) {
    throw new ForbiddenError('এই কাজটি করার জন্য আপনার নির্ধারিত অনুমতি নেই।');
  }
}

export function permissionsForRole(role) {
  return [...(ROLE_PERMISSIONS[role] ?? new Set())];
}
