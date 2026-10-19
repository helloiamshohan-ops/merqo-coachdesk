import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, beforeEach, afterEach } from 'node:test';
import { generateKeyPairSync } from 'node:crypto';
import { createDevelopmentRepository } from '../src/infrastructure/sqlite/repository.js';
import { createApplicationServer } from '../src/api/server.js';
import { issueLicense, verifyLicense, createRecoveryRequest, signRecoveryResponse, verifyRecoveryResponse } from '../src/licensing/license.js';
import { parseMoneyToMinor } from '../src/domain/money.js';

let dataDirectory;
let repository;
let server;
let baseUrl;

beforeEach(async () => {
  dataDirectory = await mkdtemp(join(tmpdir(), 'merqo-coachdesk-'));
  repository = createDevelopmentRepository({ filePath: join(dataDirectory, 'test.sqlite'), bootstrapPassword: 'test-password', logger: { error() {} } });
  server = createApplicationServer({ repository, logger: { error() {} } });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  repository.close();
  await rm(dataDirectory, { recursive: true, force: true });
});

async function request(path, { token, ...options } = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body = await response.json();
  return { response, body };
}

async function login() {
  const result = await request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ username: 'admin', password: 'test-password' }) });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.data.user.displayName, 'স্থানীয় প্রশাসক');
  return result.body.data.token;
}

test('health is public and write routes require authentication', async () => {
  const health = await request('/api/v1/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.body.data.status, 'healthy');
  const students = await request('/api/v1/students');
  assert.equal(students.response.status, 401);
  assert.equal(students.body.error.code, 'AUTHENTICATION_REQUIRED');
});

test('API persists a Bengali student and exposes actual dashboard metrics', async () => {
  const token = await login();
  const created = await request('/api/v1/students', {
    method: 'POST', token,
    body: JSON.stringify({ nameBn: 'সুমাইয়া রহমান', nameEn: 'Sumaiya Rahman', phone: '+8801712345678', address: 'টাঙ্গাইল, ঢাকা বিভাগ' }),
  });
  assert.equal(created.response.status, 201);
  assert.match(created.body.data.studentId, /^MQR-/);
  assert.equal(created.body.data.nameBn, 'সুমাইয়া রহমান');

  const listed = await request('/api/v1/students?query=সুমাইয়া', { token });
  assert.equal(listed.response.status, 200);
  assert.equal(listed.body.meta.total, 1);
  assert.equal(listed.body.data[0].studentId, created.body.data.studentId);

  const dashboard = await request('/api/v1/dashboard', { token });
  assert.equal(dashboard.body.data.activeStudents, 1);
  assert.equal(dashboard.body.data.outstanding, '0.00');
});

test('enrollment and payment path is transactional, allocatable, and idempotent', async () => {
  const token = await login();
  const student = await request('/api/v1/students', { method: 'POST', token, body: JSON.stringify({ nameBn: 'রাইয়ান করিম' }) });
  const course = await request('/api/v1/courses', { method: 'POST', token, body: JSON.stringify({ code: 'HSC26', name: 'এইচএসসি প্রস্তুতি' }) });
  const batch = await request('/api/v1/batches', { method: 'POST', token, body: JSON.stringify({ courseId: course.body.data.id, code: 'HSC26-A', name: 'সকাল ব্যাচ', academicYear: '২০২৬' }) });
  const enrollment = await request('/api/v1/enrollments', { method: 'POST', token, body: JSON.stringify({ studentId: student.body.data.id, batchId: batch.body.data.id, academicYear: '২০২৬', admissionDate: '2026-10-19' }) });
  assert.equal(enrollment.response.status, 201);
  const firstFee = await request('/api/v1/fee-items', { method: 'POST', token, body: JSON.stringify({ enrollmentId: enrollment.body.data.id, title: 'ভর্তি ফি', amount: '100.00' }) });
  const secondFee = await request('/api/v1/fee-items', { method: 'POST', token, body: JSON.stringify({ enrollmentId: enrollment.body.data.id, title: 'মাসিক ফি', amount: '50.00' }) });

  const firstPayment = await request('/api/v1/payments', {
    method: 'POST', token,
    body: JSON.stringify({ amount: '120.00', method: 'cash', idempotencyKey: 'pay-001', allocations: [
      { feeItemId: firstFee.body.data.id, amount: '70.00' },
      { feeItemId: secondFee.body.data.id, amount: '50.00' },
    ] }),
  });
  assert.equal(firstPayment.response.status, 201);
  assert.equal(firstPayment.body.data.allocations.length, 2);
  assert.equal(firstPayment.body.data.amount, '120.00');

  const duplicate = await request('/api/v1/payments', {
    method: 'POST', token,
    body: JSON.stringify({ amount: '120.00', method: 'cash', idempotencyKey: 'pay-001', allocations: [{ feeItemId: firstFee.body.data.id, amount: '70.00' }] }),
  });
  assert.equal(duplicate.response.status, 200);
  assert.equal(duplicate.body.data.duplicate, true);
  assert.equal(duplicate.body.data.allocations.length, 2);

  const secondPayment = await request('/api/v1/payments', {
    method: 'POST', token,
    body: JSON.stringify({ amount: '30.00', method: 'cash', idempotencyKey: 'pay-002', allocations: [{ feeItemId: firstFee.body.data.id, amount: '30.00' }] }),
  });
  assert.equal(secondPayment.response.status, 201);
  const fees = await request(`/api/v1/fee-items?enrollmentId=${enrollment.body.data.id}`, { token });
  assert.deepEqual(fees.body.data.map((fee) => fee.outstanding), ['0.00', '0.00']);
  const dashboard = await request('/api/v1/dashboard', { token });
  assert.equal(dashboard.body.data.outstanding, '0.00');
  assert.equal(dashboard.body.data.todayCollection, '150.00');
});

test('financial validation rejects over-allocation before a payment is posted', async () => {
  const token = await login();
  const student = await request('/api/v1/students', { method: 'POST', token, body: JSON.stringify({ nameBn: 'মাহিরা ইসলাম' }) });
  const course = await request('/api/v1/courses', { method: 'POST', token, body: JSON.stringify({ code: 'SSC26', name: 'এসএসসি প্রস্তুতি' }) });
  const batch = await request('/api/v1/batches', { method: 'POST', token, body: JSON.stringify({ courseId: course.body.data.id, code: 'SSC26-A', name: 'বিকাল ব্যাচ', academicYear: '২০২৬' }) });
  const enrollment = await request('/api/v1/enrollments', { method: 'POST', token, body: JSON.stringify({ studentId: student.body.data.id, batchId: batch.body.data.id, academicYear: '২০২৬' }) });
  const fee = await request('/api/v1/fee-items', { method: 'POST', token, body: JSON.stringify({ enrollmentId: enrollment.body.data.id, title: 'কোর্স ফি', amount: '100.00' }) });
  const failed = await request('/api/v1/payments', { method: 'POST', token, body: JSON.stringify({ amount: '150.00', method: 'cash', idempotencyKey: 'bad-001', allocations: [{ feeItemId: fee.body.data.id, amount: '101.00' }] }) });
  assert.equal(failed.response.status, 409);
  assert.equal(failed.body.error.code, 'CONFLICT');
  const fees = await request(`/api/v1/fee-items?enrollmentId=${enrollment.body.data.id}`, { token });
  assert.equal(fees.body.data[0].allocated, '0.00');
});

test('Ed25519 licenses and recovery responses reject tampering', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const license = issueLicense({ institution: 'মেরকো কোচিং', branchId: 'tangail-main', versionPolicy: '1.x' }, privateKey);
  assert.equal(verifyLicense(license, publicKey, { branchId: 'tangail-main' }).valid, true);
  const changed = { ...license, payload: { ...license.payload, branchId: 'other-branch' } };
  assert.equal(verifyLicense(changed, publicKey, { branchId: 'tangail-main' }).reason, 'wrong-branch');
  const malformed = { ...license, signature: `${license.signature.slice(0, -2)}xx` };
  assert.equal(verifyLicense(malformed, publicKey, { branchId: 'tangail-main' }).valid, false);

  const request = createRecoveryRequest({ licenseId: license.payload.licenseId, branchId: 'tangail-main', reason: 'স্থানীয় পুনরুদ্ধার পরীক্ষা' });
  const response = signRecoveryResponse(request, { operation: 'rebind-branch-record' }, privateKey);
  assert.equal(verifyRecoveryResponse(response, publicKey, request).valid, true);
  assert.equal(verifyRecoveryResponse(response, publicKey, { ...request, requestId: 'different' }).reason, 'wrong-request');
});

test('money parser rejects floating-point-shaped and zero amounts', () => {
  assert.equal(parseMoneyToMinor('100.25'), 10025);
  assert.throws(() => parseMoneyToMinor('100.257'), /দুই দশমিক/);
  assert.throws(() => parseMoneyToMinor('0.00'), /অনুমোদিত/);
});
