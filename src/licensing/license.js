import { createHash, sign, verify, randomUUID } from 'node:crypto';
import { ValidationError } from '../shared/errors.js';

const FORMAT_VERSION = 1;

function sortedValue(value) {
  if (Array.isArray(value)) return value.map(sortedValue);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = sortedValue(value[key]);
      return result;
    }, {});
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(sortedValue(value));
}

function encode(value) {
  return Buffer.from(value).toString('base64url');
}

function decode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function payloadDigest(payload) {
  return createHash('sha256').update(canonicalJson(payload)).digest('hex');
}

export function signDocument(payload, privateKey) {
  if (!privateKey) throw new ValidationError('লাইসেন্স স্বাক্ষর করার ব্যক্তিগত কী দেওয়া হয়নি।');
  const body = canonicalJson(payload);
  return {
    formatVersion: FORMAT_VERSION,
    payload,
    signature: sign(null, Buffer.from(body), privateKey).toString('base64url'),
  };
}

export function issueLicense(input, privateKey) {
  const institution = String(input.institution ?? '').trim();
  const branchId = String(input.branchId ?? '').trim();
  if (!institution || !branchId) throw new ValidationError('লাইসেন্সে প্রতিষ্ঠান ও শাখা আবশ্যক।');
  const payload = {
    licenseId: input.licenseId || randomUUID(),
    productId: 'MERQO-COACHDESK',
    institution,
    branchId,
    issueDate: input.issueDate || new Date().toISOString().slice(0, 10),
    licenseType: input.licenseType || 'branch-lifetime',
    versionPolicy: input.versionPolicy || '0.x',
    capabilities: Array.isArray(input.capabilities) ? [...new Set(input.capabilities)].sort() : [],
  };
  return signDocument(payload, privateKey);
}

export function verifyLicense(document, publicKey, { branchId, productId = 'MERQO-COACHDESK' } = {}) {
  try {
    const normalized = typeof document === 'string' ? JSON.parse(document) : document;
    if (!normalized || normalized.formatVersion !== FORMAT_VERSION || !normalized.payload || typeof normalized.signature !== 'string') {
      return { valid: false, reason: 'unsupported-format' };
    }
    const payload = normalized.payload;
    if (payload.productId !== productId) return { valid: false, reason: 'wrong-product' };
    if (branchId && payload.branchId !== branchId) return { valid: false, reason: 'wrong-branch' };
    const validSignature = verify(null, Buffer.from(canonicalJson(payload)), publicKey, Buffer.from(normalized.signature, 'base64url'));
    if (!validSignature) return { valid: false, reason: 'invalid-signature' };
    return { valid: true, payload, fingerprint: payloadDigest(payload) };
  } catch {
    return { valid: false, reason: 'corrupt-license' };
  }
}

export function createRecoveryRequest({ licenseId = null, branchId, reason, installationId = null } = {}) {
  if (!branchId || !reason) throw new ValidationError('পুনরুদ্ধার অনুরোধে শাখা ও কারণ আবশ্যক।');
  return {
    formatVersion: FORMAT_VERSION,
    requestId: randomUUID(),
    productId: 'MERQO-COACHDESK',
    licenseId,
    branchId,
    installationId,
    reason: String(reason).trim().slice(0, 1000),
    createdAt: new Date().toISOString(),
  };
}

export function signRecoveryResponse(request, changes, privateKey) {
  if (!request?.requestId || request.productId !== 'MERQO-COACHDESK') throw new ValidationError('পুনরুদ্ধার অনুরোধটি সঠিক নয়।');
  return signDocument({
    responseId: randomUUID(),
    requestId: request.requestId,
    productId: 'MERQO-COACHDESK',
    branchId: request.branchId,
    changes: changes ?? {},
    issuedAt: new Date().toISOString(),
  }, privateKey);
}

export function verifyRecoveryResponse(document, publicKey, request) {
  const result = verifyLicense(document, publicKey, { branchId: request?.branchId, productId: 'MERQO-COACHDESK' });
  if (!result.valid) return result;
  if (result.payload.requestId !== request?.requestId) return { valid: false, reason: 'wrong-request' };
  return result;
}
