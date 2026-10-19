import { ValidationError } from '../shared/errors.js';

const MONEY_PATTERN = /^(0|[1-9]\d{0,11})(?:\.(\d{1,2}))?$/;
const MAX_MINOR = 900000000000000;

/**
 * Parse a user-entered BDT amount without using floating point arithmetic.
 * The development adapter stores this integer in minor units; the production
 * PostgreSQL schema stores NUMERIC(12,2), with the same two-decimal boundary.
 */
export function parseMoneyToMinor(value, field = 'টাকার পরিমাণ', { allowZero = false } = {}) {
  if (typeof value !== 'string' || !MONEY_PATTERN.test(value.trim())) {
    throw new ValidationError(`${field} দুই দশমিক পর্যন্ত সঠিক টাকার পরিমাণ হতে হবে।`);
  }
  const normalized = value.trim();
  const [, whole, fraction = ''] = normalized.match(MONEY_PATTERN);
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor > MAX_MINOR || (!allowZero && minor <= 0)) {
    throw new ValidationError(`${field} অনুমোদিত সীমার মধ্যে দিন।`);
  }
  return minor;
}

export function formatMoney(minor) {
  if (!Number.isSafeInteger(minor) || minor < 0) throw new Error('Invalid minor-unit amount');
  return `৳${(minor / 100).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function minorToDecimal(minor) {
  if (!Number.isSafeInteger(minor) || minor < 0) throw new Error('Invalid minor-unit amount');
  return (minor / 100).toFixed(2);
}
