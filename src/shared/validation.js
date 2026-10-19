import { ValidationError } from './errors.js';

export function requiredText(value, field, maxLength = 200) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} আবশ্যক।`);
  }
  const result = value.trim();
  if (result.length > maxLength) {
    throw new ValidationError(`${field} ${maxLength} অক্ষরের বেশি হতে পারবে না।`);
  }
  return result;
}

export function optionalText(value, field, maxLength = 500) {
  if (value === undefined || value === null || value === '') return null;
  return requiredText(value, field, maxLength);
}

export function optionalIsoDate(value, field) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`${field} সঠিক তারিখ নয়।`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ValidationError(`${field} সঠিক তারিখ নয়।`);
  }
  return value;
}

export function optionalPhone(value, field = 'ফোন নম্বর') {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new ValidationError(`${field} সঠিক নয়।`);
  const result = value.trim();
  if (!/^[+\d][\d\s()\-]{5,24}$/.test(result)) {
    throw new ValidationError(`${field} সঠিক নয়।`);
  }
  return result;
}

export function boundedInteger(value, field, { min = 0, max = 1000000 } = {}) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ValidationError(`${field} সঠিক সীমার মধ্যে দিন।`);
  }
  return value;
}

export function pageParams(searchParams) {
  const rawPage = Number(searchParams.get('page') ?? 1);
  const rawPageSize = Number(searchParams.get('pageSize') ?? 25);
  const page = Number.isInteger(rawPage) ? Math.max(1, Math.min(rawPage, 100000)) : 1;
  const pageSize = Number.isInteger(rawPageSize) ? Math.max(1, Math.min(rawPageSize, 100)) : 25;
  return { page, pageSize, offset: (page - 1) * pageSize };
}
