import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors.js';
import { nowIso } from '../../shared/time.js';
import { parseMoneyToMinor, minorToDecimal } from '../../domain/money.js';
import { validatePaymentAllocations } from '../../domain/finance.js';
import { optionalIsoDate, optionalPhone, optionalText, requiredText } from '../../shared/validation.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(HERE, 'schema.sql');
const PASSWORD_KEY_LENGTH = 64;

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH);
  return `${salt.toString('base64')}:${hash.toString('base64')}`;
}

function verifyPassword(password, encoded) {
  const [saltText, hashText] = String(encoded).split(':');
  if (!saltText || !hashText) return false;
  try {
    const expected = Buffer.from(hashText, 'base64');
    const actual = scryptSync(password, Buffer.from(saltText, 'base64'), expected.length || PASSWORD_KEY_LENGTH);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function booleanFromSql(value) {
  return value === 1 || value === true;
}

function cloneJson(value) {
  return value === undefined || value === null ? null : JSON.stringify(value);
}

function parseJson(value) {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

function mapStudent(row) {
  return row ? { ...row } : null;
}

export class SqliteDevelopmentRepository {
  constructor({ filePath, bootstrapPassword, logger = console } = {}) {
    if (!filePath) throw new Error('A development database path is required.');
    if (process.env.NODE_ENV === 'production') {
      throw new Error('The SQLite adapter is development-only and cannot run as production.');
    }
    this.filePath = resolve(filePath);
    this.bootstrapPassword = bootstrapPassword || 'local-development-only';
    this.logger = logger;
    mkdirSync(dirname(this.filePath), { recursive: true });
    this.db = new DatabaseSync(this.filePath);
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    this.db.exec(readFileSync(SCHEMA_PATH, 'utf8'));
    this.seedDevelopmentAdministrator();
  }

  close() {
    this.db.close();
  }

  transaction(work) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      try { this.db.exec('ROLLBACK'); } catch (rollbackError) { this.logger.error('ROLLBACK failed', rollbackError); }
      throw error;
    }
  }

  seedDevelopmentAdministrator() {
    const existing = this.db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    if (existing) return;
    const timestamp = nowIso();
    this.db.prepare(`INSERT INTO users (id, username, display_name, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      randomUUID(), 'admin', 'স্থানীয় প্রশাসক', hashPassword(this.bootstrapPassword), 'administrator', timestamp, timestamp,
    );
  }

  authenticate(username, password) {
    if (typeof username !== 'string' || typeof password !== 'string') return null;
    const row = this.db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username.trim());
    if (!row || !verifyPassword(password, row.password_hash)) return null;
    return row;
  }

  getUserById(id) {
    return this.db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(id) ?? null;
  }

  recordAudit({ actorUserId, action, entityType, entityId = null, before = null, after = null, requestId = null }) {
    this.db.prepare(`INSERT INTO audit_logs
      (id, actor_user_id, action, entity_type, entity_id, occurred_at, before_json, after_json, request_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      randomUUID(), actorUserId, action, entityType, entityId, nowIso(), cloneJson(before), cloneJson(after), requestId,
    );
  }

  listAudit({ page = 1, pageSize = 25 } = {}) {
    const offset = (page - 1) * pageSize;
    const rows = this.db.prepare(`SELECT a.id, a.action, a.entity_type, a.entity_id, a.occurred_at,
      a.before_json, a.after_json, u.username, u.display_name
      FROM audit_logs a JOIN users u ON u.id = a.actor_user_id
      ORDER BY a.occurred_at DESC LIMIT ? OFFSET ?`).all(pageSize, offset);
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      occurredAt: row.occurred_at,
      actor: { username: row.username, displayName: row.display_name },
      before: parseJson(row.before_json),
      after: parseJson(row.after_json),
    }));
  }

  createStudent(input, actorUserId, requestId = null) {
    const nameBn = requiredText(input.nameBn, 'বাংলা নাম', 200);
    const nameEn = optionalText(input.nameEn, 'ইংরেজি নাম', 200);
    const phone = optionalPhone(input.phone);
    const address = optionalText(input.address, 'ঠিকানা', 1000);
    const dateOfBirth = optionalIsoDate(input.dateOfBirth, 'জন্মতারিখ');
    const notes = optionalText(input.notes, 'নোট', 2000);
    const suppliedId = optionalText(input.studentId, 'শিক্ষার্থী আইডি', 40);
    const timestamp = nowIso();
    return this.transaction(() => {
      let studentId = suppliedId;
      if (studentId) {
        const duplicate = this.db.prepare('SELECT id FROM students WHERE student_id = ?').get(studentId);
        if (duplicate) throw new ConflictError('এই শিক্ষার্থী আইডি আগে থেকেই ব্যবহার করা হয়েছে।');
      } else {
        const counter = this.db.prepare('SELECT next_value FROM student_counter WHERE id = 1').get();
        studentId = `MQR-${String(counter.next_value).padStart(6, '0')}`;
        this.db.prepare('UPDATE student_counter SET next_value = next_value + 1 WHERE id = 1').run();
      }
      const id = randomUUID();
      this.db.prepare(`INSERT INTO students
        (id, student_id, name_bn, name_en, phone, address, date_of_birth, status, notes, created_at, updated_at, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`).run(
        id, studentId, nameBn, nameEn, phone, address, dateOfBirth, notes, timestamp, timestamp, actorUserId, actorUserId,
      );
      const row = this.db.prepare('SELECT * FROM students WHERE id = ?').get(id);
      this.recordAudit({ actorUserId, action: 'student.created', entityType: 'student', entityId: id, after: mapStudent(row), requestId });
      return row;
    });
  }

  listStudents({ query = '', page = 1, pageSize = 25 } = {}) {
    const search = String(query).trim();
    const like = `%${search}%`;
    const where = search ? 'WHERE student_id LIKE ? OR name_bn LIKE ? OR COALESCE(name_en, \'\') LIKE ? OR COALESCE(phone, \'\') LIKE ?' : '';
    const params = search ? [like, like, like, like] : [];
    const total = this.db.prepare(`SELECT COUNT(*) AS count FROM students ${where}`).get(...params).count;
    const rows = this.db.prepare(`SELECT id, student_id, name_bn, name_en, phone, address, date_of_birth, status, created_at, updated_at
      FROM students ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, pageSize, (page - 1) * pageSize);
    return { rows, total };
  }

  getStudent(id) {
    const row = this.db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    if (!row) throw new NotFoundError('শিক্ষার্থীটি পাওয়া যায়নি।');
    const enrollments = this.db.prepare(`SELECT e.*, b.code AS batch_code, b.name AS batch_name, c.code AS course_code, c.name AS course_name
      FROM enrollments e JOIN batches b ON b.id = e.batch_id JOIN courses c ON c.id = b.course_id
      WHERE e.student_id = ? ORDER BY e.admission_date DESC`).all(id);
    const feeItems = this.db.prepare(`SELECT f.*, e.student_id, e.batch_id
      FROM fee_items f JOIN enrollments e ON e.id = f.enrollment_id
      WHERE e.student_id = ? ORDER BY f.due_date IS NULL, f.due_date`).all(id);
    return { student: row, enrollments, feeItems };
  }

  createCourse(input, actorUserId, requestId = null) {
    const code = requiredText(input.code, 'কোর্স কোড', 40).toUpperCase();
    const name = requiredText(input.name, 'কোর্সের নাম', 200);
    const timestamp = nowIso();
    return this.transaction(() => {
      if (this.db.prepare('SELECT id FROM courses WHERE code = ?').get(code)) {
        throw new ConflictError('এই কোর্স কোড আগে থেকেই আছে।');
      }
      const id = randomUUID();
      this.db.prepare(`INSERT INTO courses (id, code, name, created_at, updated_at, created_by) VALUES (?, ?, ?, ?, ?, ?)`).run(id, code, name, timestamp, timestamp, actorUserId);
      const row = this.db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
      this.recordAudit({ actorUserId, action: 'course.created', entityType: 'course', entityId: id, after: row, requestId });
      return row;
    });
  }

  listCourses() {
    return this.db.prepare(`SELECT c.*, (SELECT COUNT(*) FROM batches b WHERE b.course_id = c.id AND b.status = 'active') AS active_batch_count
      FROM courses c WHERE c.status <> 'archived' ORDER BY c.name`).all();
  }

  createBatch(input, actorUserId, requestId = null) {
    const courseId = requiredText(input.courseId, 'কোর্স', 80);
    const code = requiredText(input.code, 'ব্যাচ কোড', 40).toUpperCase();
    const name = requiredText(input.name, 'ব্যাচের নাম', 200);
    const academicYear = requiredText(input.academicYear, 'শিক্ষাবর্ষ', 30);
    const capacity = input.capacity === undefined || input.capacity === null || input.capacity === '' ? null : Number(input.capacity);
    if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000)) throw new ValidationError('ব্যাচের ধারণক্ষমতা সঠিক নয়।');
    const timestamp = nowIso();
    return this.transaction(() => {
      if (!this.db.prepare('SELECT id FROM courses WHERE id = ? AND status <> \'archived\'').get(courseId)) throw new NotFoundError('কোর্সটি পাওয়া যায়নি।');
      if (this.db.prepare('SELECT id FROM batches WHERE code = ?').get(code)) throw new ConflictError('এই ব্যাচ কোড আগে থেকেই আছে।');
      const id = randomUUID();
      this.db.prepare(`INSERT INTO batches (id, course_id, code, name, academic_year, capacity, created_at, updated_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, courseId, code, name, academicYear, capacity, timestamp, timestamp, actorUserId);
      const row = this.db.prepare('SELECT * FROM batches WHERE id = ?').get(id);
      this.recordAudit({ actorUserId, action: 'batch.created', entityType: 'batch', entityId: id, after: row, requestId });
      return row;
    });
  }

  listBatches({ courseId = null } = {}) {
    const where = courseId ? 'WHERE b.course_id = ? AND b.status <> \'archived\'' : 'WHERE b.status <> \'archived\'';
    return this.db.prepare(`SELECT b.*, c.code AS course_code, c.name AS course_name,
      (SELECT COUNT(*) FROM enrollments e WHERE e.batch_id = b.id AND e.status = 'active') AS active_enrollment_count
      FROM batches b JOIN courses c ON c.id = b.course_id ${where} ORDER BY b.academic_year DESC, b.name`).all(...(courseId ? [courseId] : []));
  }

  createEnrollment(input, actorUserId, requestId = null) {
    const studentId = requiredText(input.studentId, 'শিক্ষার্থী', 80);
    const batchId = requiredText(input.batchId, 'ব্যাচ', 80);
    const academicYear = requiredText(input.academicYear, 'শিক্ষাবর্ষ', 30);
    const admissionDate = optionalIsoDate(input.admissionDate, 'ভর্তির তারিখ') ?? new Date().toISOString().slice(0, 10);
    const timestamp = nowIso();
    return this.transaction(() => {
      if (!this.db.prepare('SELECT id FROM students WHERE id = ?').get(studentId)) throw new NotFoundError('শিক্ষার্থীটি পাওয়া যায়নি।');
      const batch = this.db.prepare('SELECT * FROM batches WHERE id = ? AND status = \'active\'').get(batchId);
      if (!batch) throw new NotFoundError('সক্রিয় ব্যাচটি পাওয়া যায়নি।');
      if (batch.capacity !== null) {
        const count = this.db.prepare("SELECT COUNT(*) AS count FROM enrollments WHERE batch_id = ? AND status = 'active'").get(batchId).count;
        if (count >= batch.capacity) throw new ConflictError('এই ব্যাচের ধারণক্ষমতা পূর্ণ হয়েছে।');
      }
      const duplicate = this.db.prepare(`SELECT id FROM enrollments WHERE student_id = ? AND batch_id = ? AND academic_year = ?`).get(studentId, batchId, academicYear);
      if (duplicate) throw new ConflictError('এই শিক্ষার্থীর একই ব্যাচে একই শিক্ষাবর্ষের ভর্তি আগে থেকেই আছে।');
      const id = randomUUID();
      this.db.prepare(`INSERT INTO enrollments (id, student_id, batch_id, academic_year, admission_date, created_at, updated_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, studentId, batchId, academicYear, admissionDate, timestamp, timestamp, actorUserId);
      const row = this.db.prepare('SELECT * FROM enrollments WHERE id = ?').get(id);
      this.recordAudit({ actorUserId, action: 'enrollment.created', entityType: 'enrollment', entityId: id, after: row, requestId });
      return row;
    });
  }

  createFeeItem(input, actorUserId, requestId = null) {
    const enrollmentId = requiredText(input.enrollmentId, 'ভর্তি রেকর্ড', 80);
    const title = requiredText(input.title, 'ফি-এর নাম', 200);
    const amountMinor = parseMoneyToMinor(input.amount, 'ফি-এর পরিমাণ');
    const dueDate = optionalIsoDate(input.dueDate, 'শেষ তারিখ');
    const timestamp = nowIso();
    return this.transaction(() => {
      if (!this.db.prepare('SELECT id FROM enrollments WHERE id = ?').get(enrollmentId)) throw new NotFoundError('ভর্তি রেকর্ডটি পাওয়া যায়নি।');
      const id = randomUUID();
      this.db.prepare(`INSERT INTO fee_items (id, enrollment_id, title, amount_minor, due_date, created_at, updated_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, enrollmentId, title, amountMinor, dueDate, timestamp, timestamp, actorUserId);
      const row = this.db.prepare('SELECT * FROM fee_items WHERE id = ?').get(id);
      this.recordAudit({ actorUserId, action: 'fee_item.created', entityType: 'fee_item', entityId: id, after: { ...row, amount_minor: undefined } , requestId });
      return row;
    });
  }

  listFeeItems({ enrollmentId = null, studentId = null } = {}) {
    const conditions = [];
    const params = [];
    if (enrollmentId) { conditions.push('f.enrollment_id = ?'); params.push(enrollmentId); }
    if (studentId) { conditions.push('e.student_id = ?'); params.push(studentId); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = this.db.prepare(`SELECT f.*, e.student_id FROM fee_items f JOIN enrollments e ON e.id = f.enrollment_id ${where} ORDER BY f.due_date IS NULL, f.due_date, f.created_at`).all(...params);
    return rows.map((row) => ({ ...row, amount: minorToDecimal(row.amount_minor), allocated: minorToDecimal(row.allocated_minor), outstanding: minorToDecimal(row.amount_minor - row.allocated_minor) }));
  }

  recordPayment(input, actorUserId, requestId = null) {
    const amountMinor = parseMoneyToMinor(input.amount, 'পেমেন্টের পরিমাণ');
    const method = requiredText(input.method, 'পেমেন্টের মাধ্যম', 40);
    const reference = optionalText(input.reference, 'রেফারেন্স', 120);
    const idempotencyKey = requiredText(input.idempotencyKey, 'পেমেন্ট অনুরোধের পরিচিতি', 120);
    if (!Array.isArray(input.allocations)) throw new ValidationError('পেমেন্ট বরাদ্দের তালিকা আবশ্যক।');
    return this.transaction(() => {
      const existing = this.db.prepare('SELECT * FROM payments WHERE idempotency_key = ?').get(idempotencyKey);
      if (existing) return { payment: existing, duplicate: true, allocations: this.paymentAllocations(existing.id) };
      const itemIds = input.allocations.map((allocation) => allocation?.feeItemId).filter(Boolean);
      const feeItems = itemIds.length
        ? this.db.prepare(`SELECT * FROM fee_items WHERE id IN (${itemIds.map(() => '?').join(',')})`).all(...itemIds)
        : [];
      const feeItemsById = new Map(feeItems.map((item) => [item.id, { ...item, amountMinor: item.amount_minor, allocatedMinor: item.allocated_minor }]));
      const allocationResult = validatePaymentAllocations(amountMinor, input.allocations.map((allocation) => ({
        feeItemId: allocation.feeItemId,
        amountMinor: parseMoneyToMinor(allocation.amount, 'বরাদ্দের পরিমাণ'),
      })), feeItemsById);
      const paymentId = randomUUID();
      const postedAt = nowIso();
      this.db.prepare(`INSERT INTO payments (id, amount_minor, method, reference, idempotency_key, posted_at, posted_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)`).run(paymentId, amountMinor, method, reference, idempotencyKey, postedAt, actorUserId);
      for (const allocation of allocationResult.allocations) {
        this.db.prepare(`INSERT INTO payment_allocations (id, payment_id, fee_item_id, amount_minor, created_at)
          VALUES (?, ?, ?, ?, ?)`).run(randomUUID(), paymentId, allocation.feeItemId, allocation.amountMinor, postedAt);
        const next = feeItemsById.get(allocation.feeItemId).allocatedMinor + allocation.amountMinor;
        const status = next >= feeItemsById.get(allocation.feeItemId).amountMinor ? 'paid' : 'partially_paid';
        this.db.prepare('UPDATE fee_items SET allocated_minor = ?, status = ?, updated_at = ? WHERE id = ?').run(next, status, postedAt, allocation.feeItemId);
      }
      const payment = this.db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
      const allocations = this.paymentAllocations(paymentId);
      this.recordAudit({ actorUserId, action: 'payment.posted', entityType: 'payment', entityId: paymentId, after: {
        id: paymentId, amount: minorToDecimal(amountMinor), method, reference, allocations: allocations.map((item) => ({ feeItemId: item.fee_item_id, amount: minorToDecimal(item.amount_minor) })), unallocated: minorToDecimal(allocationResult.unallocatedMinor),
      }, requestId });
      return { payment, duplicate: false, allocations };
    });
  }

  paymentAllocations(paymentId) {
    return this.db.prepare('SELECT * FROM payment_allocations WHERE payment_id = ? ORDER BY created_at').all(paymentId);
  }

  paymentView(paymentResult) {
    const { payment, duplicate, allocations } = paymentResult;
    return {
      id: payment.id,
      amount: minorToDecimal(payment.amount_minor),
      method: payment.method,
      reference: payment.reference,
      postedAt: payment.posted_at,
      duplicate,
      allocations: allocations.map((allocation) => ({ feeItemId: allocation.fee_item_id, amount: minorToDecimal(allocation.amount_minor) })),
    };
  }

  dashboard() {
    const row = this.db.prepare(`SELECT
      (SELECT COUNT(*) FROM students WHERE status = 'active') AS active_students,
      (SELECT COUNT(*) FROM courses WHERE status = 'active') AS active_courses,
      (SELECT COUNT(*) FROM batches WHERE status = 'active') AS active_batches,
      (SELECT COALESCE(SUM(amount_minor - allocated_minor), 0) FROM fee_items WHERE status IN ('open', 'partially_paid')) AS outstanding_minor,
      (SELECT COALESCE(SUM(amount_minor), 0) FROM payments WHERE date(posted_at) = date('now')) AS today_collection_minor,
      (SELECT COUNT(*) FROM audit_logs WHERE date(occurred_at) = date('now')) AS today_activity`).get();
    return {
      activeStudents: row.active_students,
      activeCourses: row.active_courses,
      activeBatches: row.active_batches,
      outstanding: minorToDecimal(row.outstanding_minor),
      todayCollection: minorToDecimal(row.today_collection_minor),
      todayActivity: row.today_activity,
    };
  }
}

export function createDevelopmentRepository(options = {}) {
  return new SqliteDevelopmentRepository(options);
}
