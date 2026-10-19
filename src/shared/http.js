import { randomUUID } from 'node:crypto';
import { AppError, ValidationError } from './errors.js';

export const MAX_BODY_BYTES = 1024 * 1024;

export function requestId() {
  return randomUUID();
}

export function sendJson(response, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...headers,
  });
  response.end(body);
}

export async function readJson(request) {
  const contentType = request.headers['content-type'] ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new ValidationError('অনুরোধের ধরন JSON হতে হবে।');
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new AppError('PAYLOAD_TOO_LARGE', 'অনুরোধের আকার অনুমোদিত সীমা অতিক্রম করেছে।', 413);
    chunks.push(chunk);
  }
  if (size === 0) throw new ValidationError('অনুরোধের তথ্য দেওয়া হয়নি।');
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ValidationError('অনুরোধের JSON সঠিক নয়।');
  }
}

export function bearerToken(request) {
  const header = request.headers.authorization;
  if (typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1] ?? null;
}
