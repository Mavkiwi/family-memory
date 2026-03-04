/**
 * Family Memory — Shared API Utilities
 * Adapted from DC Labour Tracker pattern for Cloudflare Pages Functions.
 */

// --------------- TYPES ---------------
export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  TOKEN_SECRET: string;
  OPENAI_API_KEY: string;
  ADMIN_PIN: string;
  ENVIRONMENT?: string;
}

export interface ApiResponse<T = unknown> {
  data: T | null;
  meta?: { page?: number; limit?: number; total?: number };
  error?: string;
  code?: string;
}

// --------------- CORS ---------------
const ALLOWED_ORIGINS = [
  'https://family-memory.pages.dev',
  'http://localhost:5173',
  'http://localhost:8788',
];

function getCorsOrigin(request: Request): string {
  const origin = request.headers.get('Origin') || '';
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (!origin) return ALLOWED_ORIGINS[0];
  return ALLOWED_ORIGINS[0];
}

// --------------- SECURITY HEADERS ---------------
export function getHeaders(request: Request, methods = 'GET, OPTIONS'): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(request),
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), geolocation=()',
  };
}

// --------------- RESPONSE HELPERS ---------------
export function jsonResponse<T>(
  request: Request,
  data: T,
  status = 200,
  methods = 'GET, OPTIONS',
  meta?: ApiResponse['meta']
): Response {
  const body: ApiResponse<T> = { data };
  if (meta) body.meta = meta;
  return new Response(JSON.stringify(body), {
    status,
    headers: getHeaders(request, methods),
  });
}

export function errorResponse(
  request: Request,
  message: string,
  code: string,
  status: number,
  methods = 'GET, OPTIONS'
): Response {
  const body: ApiResponse = { data: null, error: message, code };
  return new Response(JSON.stringify(body), {
    status,
    headers: getHeaders(request, methods),
  });
}

export function validationError(request: Request, message: string, methods = 'GET, OPTIONS'): Response {
  return errorResponse(request, message, 'VALIDATION_ERROR', 400, methods);
}

export function notFoundError(request: Request, message = 'Not found', methods = 'GET, OPTIONS'): Response {
  return errorResponse(request, message, 'NOT_FOUND', 404, methods);
}

export function corsPreflightResponse(request: Request, methods = 'GET, OPTIONS'): Response {
  return new Response(null, { status: 204, headers: getHeaders(request, methods) });
}

// --------------- ERROR HANDLER ---------------
export function handleError(request: Request, error: unknown, methods = 'GET, OPTIONS'): Response {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({
    level: 'error',
    message: msg,
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    url: request.url,
    method: request.method,
  }));
  return errorResponse(request, 'Internal server error', 'E500', 500, methods);
}

// --------------- ADMIN AUTH ---------------
export function getAdminToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

// --------------- PIN RATE LIMITING ---------------
export async function checkPinRateLimit(
  DB: D1Database,
  clientIp: string
): Promise<{ allowed: boolean; remaining: number }> {
  const MAX_ATTEMPTS = 5;
  const WINDOW_MINUTES = 15;
  try {
    await DB.prepare(
      `DELETE FROM pin_attempts WHERE attempted_at < datetime('now', '-${WINDOW_MINUTES} minutes')`
    ).run();

    const count = await DB.prepare(
      `SELECT COUNT(*) as cnt FROM pin_attempts WHERE client_ip = ? AND attempted_at > datetime('now', '-${WINDOW_MINUTES} minutes')`
    ).bind(clientIp).first<{ cnt: number }>();

    const attempts = count?.cnt || 0;
    return { allowed: attempts < MAX_ATTEMPTS, remaining: Math.max(0, MAX_ATTEMPTS - attempts) };
  } catch {
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }
}

export async function recordPinAttempt(DB: D1Database, clientIp: string): Promise<void> {
  try {
    await DB.prepare('INSERT INTO pin_attempts (client_ip) VALUES (?)').bind(clientIp).run();
  } catch {
    // Non-critical
  }
}

// --------------- AUDIT LOG ---------------
export async function auditLog(
  DB: D1Database,
  action: string,
  entityType?: string,
  entityId?: number,
  details?: string,
  ipAddress?: string
): Promise<void> {
  try {
    await DB.prepare(
      'INSERT INTO audit_log (action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?)'
    ).bind(action, entityType ?? null, entityId ?? null, details ?? null, ipAddress ?? null).run();
  } catch {
    // Non-critical
  }
}

// --------------- REQUEST HELPERS ---------------
export function getClientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
}
