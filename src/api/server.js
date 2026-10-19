import { createServer as createHttpServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createDevelopmentRepository } from '../infrastructure/sqlite/repository.js';
import { AuthenticationError, AppError, NotFoundError, ValidationError } from '../shared/errors.js';
import { bearerToken, readJson, requestId, sendJson } from '../shared/http.js';
import { pageParams } from '../shared/validation.js';
import { publicStudent, publicUser } from '../shared/response.js';
import { requirePermission, PERMISSIONS, hasPermission } from '../application/permissions.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(HERE, 'public');
const DEFAULT_DATA_DIR = resolve(HERE, '../../var/development');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

class SessionStore {
  constructor() {
    this.sessions = new Map();
  }

  issue(user) {
    const token = randomBytes(32).toString('base64url');
    this.sessions.set(token, { userId: user.id, expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
    return token;
  }

  get(token, repository) {
    if (!token) return null;
    const session = this.sessions.get(token);
    if (!session || session.expiresAt <= Date.now()) {
      this.sessions.delete(token);
      return null;
    }
    const user = repository.getUserById(session.userId);
    if (!user) {
      this.sessions.delete(token);
      return null;
    }
    return user;
  }

  revoke(token) {
    if (token) this.sessions.delete(token);
  }
}

function safeStaticPath(pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const absolute = resolve(PUBLIC_DIR, `.${requested}`);
  return absolute.startsWith(`${PUBLIC_DIR}/`) ? absolute : null;
}

function publicCourse(row) {
  return { id: row.id, code: row.code, name: row.name, status: row.status, activeBatchCount: row.active_batch_count };
}

function publicBatch(row) {
  return {
    id: row.id, courseId: row.course_id, code: row.code, name: row.name,
    academicYear: row.academic_year, capacity: row.capacity, status: row.status,
    courseName: row.course_name, activeEnrollmentCount: row.active_enrollment_count,
  };
}

function publicEnrollment(row) {
  return {
    id: row.id, studentId: row.student_id, batchId: row.batch_id,
    academicYear: row.academic_year, admissionDate: row.admission_date, status: row.status,
  };
}

function publicFeeItem(row) {
  return {
    id: row.id, enrollmentId: row.enrollment_id, title: row.title,
    amount: row.amount ?? (row.amount_minor / 100).toFixed(2),
    allocated: row.allocated ?? (row.allocated_minor / 100).toFixed(2),
    outstanding: row.outstanding ?? ((row.amount_minor - row.allocated_minor) / 100).toFixed(2),
    status: row.status, dueDate: row.due_date,
  };
}

function sendCors(response, request) {
  const origin = request.headers.origin;
  if (origin) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Request-Id');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

export function createApplicationServer({ repository, logger = console, sessions = new SessionStore() } = {}) {
  if (!repository) throw new Error('repository is required');
  const loginAttempts = new Map();

  async function handle(request, response) {
    const id = requestId();
    sendCors(response, request);
    response.setHeader('X-Request-Id', id);
    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }
    try {
      const url = new URL(request.url, 'http://localhost');
      if (!url.pathname.startsWith('/api/')) {
        serveStatic(url.pathname, response);
        return;
      }
      if (request.method === 'GET' && url.pathname === '/api/v1/health') {
        sendJson(response, 200, { data: { status: 'healthy', service: 'MERQO CoachDesk', mode: 'development-sqlite', requestId: id } });
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/v1/auth/login') {
        await login(request, response, id);
        return;
      }
      const user = authenticatedUser(request, repository, sessions);
      if (request.method === 'GET' && url.pathname === '/api/v1/auth/me') {
        sendJson(response, 200, { data: publicUser(user) });
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/v1/auth/logout') {
        sessions.revoke(bearerToken(request));
        sendJson(response, 200, { data: { signedOut: true } });
        return;
      }

      await routeApi({ request, response, url, user, id });
    } catch (error) {
      const appError = error instanceof AppError ? error : new AppError('INTERNAL_ERROR', 'অপ্রত্যাশিত সার্ভার সমস্যা হয়েছে।', 500);
      if (!(error instanceof AppError)) logger.error(`[${id}] request failed`, error);
      sendJson(response, appError.status, {
        error: { code: appError.code, message: appError.message, details: appError.details },
        requestId: id,
      });
    }
  }

  async function login(request, response, id) {
    const ip = request.socket.remoteAddress ?? 'unknown';
    const attempt = loginAttempts.get(ip) ?? { count: 0, firstAt: Date.now() };
    if (Date.now() - attempt.firstAt > 5 * 60 * 1000) {
      attempt.count = 0;
      attempt.firstAt = Date.now();
    }
    if (attempt.count >= 10) {
      throw new AppError('RATE_LIMITED', 'অনেকবার ব্যর্থ চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।', 429);
    }
    const body = await readJson(request);
    if (typeof body.username !== 'string' || typeof body.password !== 'string') {
      throw new ValidationError('ব্যবহারকারীর নাম ও পাসওয়ার্ড আবশ্যক।');
    }
    const user = repository.authenticate(body.username, body.password);
    if (!user) {
      attempt.count += 1;
      loginAttempts.set(ip, attempt);
      throw new AuthenticationError('ব্যবহারকারীর নাম অথবা পাসওয়ার্ড সঠিক নয়।');
    }
    loginAttempts.delete(ip);
    const token = sessions.issue(user);
    repository.recordAudit({ actorUserId: user.id, action: 'security.login', entityType: 'user', entityId: user.id, requestId: id });
    sendJson(response, 200, { data: { token, user: publicUser(user) }, requestId: id });
  }

  async function routeApi({ request, response, url, user, id }) {
    const { pathname } = url;
    if (request.method === 'GET' && pathname === '/api/v1/dashboard') {
      requirePermission(user, PERMISSIONS.READ_STUDENTS);
      const dashboard = repository.dashboard();
      if (!hasPermission(user, PERMISSIONS.READ_FINANCE)) {
        dashboard.outstanding = null;
        dashboard.todayCollection = null;
      }
      sendJson(response, 200, { data: dashboard, requestId: id });
      return;
    }

    if (pathname === '/api/v1/students' && request.method === 'GET') {
      requirePermission(user, PERMISSIONS.READ_STUDENTS);
      const params = pageParams(url.searchParams);
      const result = repository.listStudents({ query: url.searchParams.get('query') ?? '', ...params });
      sendJson(response, 200, { data: result.rows.map(publicStudent), meta: { page: params.page, pageSize: params.pageSize, total: result.total }, requestId: id });
      return;
    }
    if (pathname === '/api/v1/students' && request.method === 'POST') {
      requirePermission(user, PERMISSIONS.WRITE_STUDENTS);
      const student = repository.createStudent(await readJson(request), user.id, id);
      sendJson(response, 201, { data: publicStudent(student), requestId: id });
      return;
    }
    const studentMatch = pathname.match(/^\/api\/v1\/students\/([^/]+)$/);
    if (studentMatch && request.method === 'GET') {
      requirePermission(user, PERMISSIONS.READ_STUDENTS);
      const result = repository.getStudent(decodeURIComponent(studentMatch[1]));
      sendJson(response, 200, {
        data: {
          ...publicStudent(result.student),
          enrollments: result.enrollments.map(publicEnrollment),
          feeItems: result.feeItems.map(publicFeeItem),
        },
        requestId: id,
      });
      return;
    }

    if (pathname === '/api/v1/courses' && request.method === 'GET') {
      requirePermission(user, PERMISSIONS.READ_ACADEMICS);
      sendJson(response, 200, { data: repository.listCourses().map(publicCourse), requestId: id });
      return;
    }
    if (pathname === '/api/v1/courses' && request.method === 'POST') {
      requirePermission(user, PERMISSIONS.WRITE_ACADEMICS);
      sendJson(response, 201, { data: publicCourse(repository.createCourse(await readJson(request), user.id, id)), requestId: id });
      return;
    }
    if (pathname === '/api/v1/batches' && request.method === 'GET') {
      requirePermission(user, PERMISSIONS.READ_ACADEMICS);
      sendJson(response, 200, { data: repository.listBatches({ courseId: url.searchParams.get('courseId') }).map(publicBatch), requestId: id });
      return;
    }
    if (pathname === '/api/v1/batches' && request.method === 'POST') {
      requirePermission(user, PERMISSIONS.WRITE_ACADEMICS);
      sendJson(response, 201, { data: publicBatch(repository.createBatch(await readJson(request), user.id, id)), requestId: id });
      return;
    }
    if (pathname === '/api/v1/enrollments' && request.method === 'POST') {
      requirePermission(user, PERMISSIONS.WRITE_ACADEMICS);
      sendJson(response, 201, { data: publicEnrollment(repository.createEnrollment(await readJson(request), user.id, id)), requestId: id });
      return;
    }

    if (pathname === '/api/v1/fee-items' && request.method === 'GET') {
      requirePermission(user, PERMISSIONS.READ_FINANCE);
      sendJson(response, 200, { data: repository.listFeeItems({ enrollmentId: url.searchParams.get('enrollmentId'), studentId: url.searchParams.get('studentId') }).map(publicFeeItem), requestId: id });
      return;
    }
    if (pathname === '/api/v1/fee-items' && request.method === 'POST') {
      requirePermission(user, PERMISSIONS.WRITE_FINANCE);
      sendJson(response, 201, { data: publicFeeItem(repository.createFeeItem(await readJson(request), user.id, id)), requestId: id });
      return;
    }
    if (pathname === '/api/v1/payments' && request.method === 'POST') {
      requirePermission(user, PERMISSIONS.POST_PAYMENT);
      const result = repository.recordPayment(await readJson(request), user.id, id);
      sendJson(response, result.duplicate ? 200 : 201, { data: repository.paymentView(result), requestId: id });
      return;
    }
    if (pathname === '/api/v1/audit' && request.method === 'GET') {
      requirePermission(user, PERMISSIONS.READ_AUDIT);
      const params = pageParams(url.searchParams);
      sendJson(response, 200, { data: repository.listAudit(params), meta: params, requestId: id });
      return;
    }
    throw new NotFoundError('অনুরোধ করা পথটি পাওয়া যায়নি।');
  }

  return createHttpServer((request, response) => {
    handle(request, response).catch((error) => {
      logger.error('unhandled request promise', error);
      if (!response.headersSent) sendJson(response, 500, { error: { code: 'INTERNAL_ERROR', message: 'অপ্রত্যাশিত সার্ভার সমস্যা হয়েছে।' } });
      else response.destroy();
    });
  });
}

function authenticatedUser(request, repository, sessions) {
  const user = sessions.get(bearerToken(request), repository);
  if (!user) throw new AuthenticationError();
  return user;
}

function serveStatic(pathname, response) {
  const filePath = safeStaticPath(pathname);
  if (!filePath || !existsSync(filePath)) throw new NotFoundError('পৃষ্ঠাটি পাওয়া যায়নি।');
  const content = readFileSync(filePath);
  response.writeHead(200, { 'Content-Type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
  response.end(content);
}

export function startFromEnvironment() {
  const dataDir = resolve(process.env.COACHDESK_DATA_DIR || DEFAULT_DATA_DIR);
  const filePath = join(dataDir, 'coachdesk-development.sqlite');
  const repository = createDevelopmentRepository({ filePath, bootstrapPassword: process.env.COACHDESK_DEV_PASSWORD, logger: console });
  const server = createApplicationServer({ repository, logger: console });
  const port = Number(process.env.COACHDESK_PORT || 4310);
  server.listen(port, '0.0.0.0', () => {
    console.log(`MERQO CoachDesk development service listening on 0.0.0.0:${port}`);
    console.log(`Development data directory: ${dataDir}`);
  });
  const shutdown = () => {
    server.close(() => repository.close());
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  return { server, repository };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  startFromEnvironment();
}
