export class AppError extends Error {
  constructor(code, message, status = 400, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message, details = undefined) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'অনুগ্রহ করে আবার প্রবেশ করুন।') {
    super('AUTHENTICATION_REQUIRED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'এই কাজটি করার অনুমতি আপনার নেই।') {
    super('FORBIDDEN', message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'রেকর্ডটি পাওয়া যায়নি।') {
    super('NOT_FOUND', message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message, details = undefined) {
    super('CONFLICT', message, 409, details);
  }
}
