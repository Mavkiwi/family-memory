import type { Env } from '../_shared';
import {
  jsonResponse, errorResponse, validationError,
  handleError, corsPreflightResponse,
  checkPinRateLimit, recordPinAttempt, getClientIp, auditLog,
} from '../_shared';
import { pinSchema } from '../_schemas';

/**
 * POST /api/auth/verify-pin — Admin PIN login
 * Returns a simple session token (SHA-256 of PIN + timestamp).
 * Rate-limited to 5 attempts per 15 minutes per IP.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const clientIp = getClientIp(request);

    // Rate limit check
    const rateLimit = await checkPinRateLimit(env.DB, clientIp);
    if (!rateLimit.allowed) {
      return errorResponse(request, 'Too many attempts. Try again later.', 'RATE_LIMITED', 429, 'POST, OPTIONS');
    }

    const body = await request.json();
    const parsed = pinSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(request, 'PIN must be 4 digits', 'POST, OPTIONS');
    }

    // Hash the provided PIN
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(parsed.data.pin));
    const pinHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Check against stored admin PIN hash
    const admin = await env.DB.prepare(
      'SELECT id, name FROM admin_users WHERE pin_hash = ? AND active = 1'
    ).bind(pinHash).first<{ id: number; name: string }>();

    if (!admin) {
      await recordPinAttempt(env.DB, clientIp);
      await auditLog(env.DB, 'auth.failed', 'admin', undefined, undefined, clientIp);
      return errorResponse(request, 'Invalid PIN', 'AUTH_FAILED', 401, 'POST, OPTIONS');
    }

    // Generate session token
    const sessionPayload = `${admin.id}.${Date.now()}.${crypto.randomUUID()}`;
    const sessionBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(sessionPayload));
    const sessionToken = Array.from(new Uint8Array(sessionBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Update last login
    await env.DB.prepare(
      "UPDATE admin_users SET last_login_at = datetime('now') WHERE id = ?"
    ).bind(admin.id).run();

    await auditLog(env.DB, 'auth.success', 'admin', admin.id, undefined, clientIp);

    return jsonResponse(request, {
      token: sessionToken,
      admin: { id: admin.id, name: admin.name },
    }, 200, 'POST, OPTIONS');
  } catch (error) {
    return handleError(request, error, 'POST, OPTIONS');
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return corsPreflightResponse(request, 'POST, OPTIONS');
};
