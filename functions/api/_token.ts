/**
 * Family Memory — HMAC Token Generation & Validation
 * Ported from Node.js crypto to Web Crypto API for Cloudflare Workers.
 *
 * Token format: base64url(recipientId.assignmentId.expiryTimestamp.hmac)
 * HMAC: first 16 hex chars of SHA-256(payload, TOKEN_SECRET)
 */

const TOKEN_EXPIRY_DAYS = 14;

// --------------- Web Crypto HMAC ---------------
async function generateHmac(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const hex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hex.substring(0, 16);
}

// --------------- Base64url ---------------
function base64urlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64urlDecode(str: string): string {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = 4 - (s.length % 4);
  if (padding !== 4) s += '='.repeat(padding);
  return atob(s);
}

// --------------- Token Generation ---------------
export interface TokenPayload {
  token: string;
  expiresAt: string;
  recipientId: number;
  assignmentId: number;
}

export async function generateAssignmentToken(
  recipientId: number,
  assignmentId: number,
  secret: string,
  expiryDays = TOKEN_EXPIRY_DAYS
): Promise<TokenPayload> {
  const expiry = Date.now() + expiryDays * 24 * 60 * 60 * 1000;
  const payload = `${recipientId}.${assignmentId}.${expiry}`;
  const hmac = await generateHmac(payload, secret);
  const token = base64urlEncode(`${payload}.${hmac}`);
  return {
    token,
    expiresAt: new Date(expiry).toISOString(),
    recipientId,
    assignmentId,
  };
}

// --------------- Token Validation ---------------
export interface TokenValidation {
  valid: boolean;
  recipientId?: number;
  assignmentId?: number;
  expiresAt?: string;
  error?: 'INVALID_FORMAT' | 'TOKEN_EXPIRED' | 'INVALID_SIGNATURE' | 'INVALID_TOKEN';
}

export async function validateAssignmentToken(
  token: string,
  secret: string
): Promise<TokenValidation> {
  try {
    const decoded = base64urlDecode(token);
    const parts = decoded.split('.');

    if (parts.length !== 4) {
      return { valid: false, error: 'INVALID_FORMAT' };
    }

    const [recipientId, assignmentId, expiry, hmac] = parts;

    if (Date.now() > parseInt(expiry)) {
      return { valid: false, error: 'TOKEN_EXPIRED' };
    }

    const payload = `${recipientId}.${assignmentId}.${expiry}`;
    const expectedHmac = await generateHmac(payload, secret);

    if (hmac !== expectedHmac) {
      return { valid: false, error: 'INVALID_SIGNATURE' };
    }

    return {
      valid: true,
      recipientId: parseInt(recipientId),
      assignmentId: parseInt(assignmentId),
      expiresAt: new Date(parseInt(expiry)).toISOString(),
    };
  } catch {
    return { valid: false, error: 'INVALID_TOKEN' };
  }
}
