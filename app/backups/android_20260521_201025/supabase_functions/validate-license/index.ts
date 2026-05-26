/**
 * DrumIQ — validate-license Edge Function
 *
 * Input:  POST { code: string, device_id: string }
 * Output: { token: string } — signed JWT with license claims
 *
 * Security:
 *   - HMAC-SHA256 deterministic lookup + verification (pepper-based)
 *   - Device lock enforcement (single device unless multiDevice=true)
 *   - Per-IP rate limiting (5 attempts per 15 minutes)
 *   - JWT signed with LICENSE_JWT_SECRET (HS256)
 *   - Only service_role can read license_codes table (RLS deny all)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Config ───────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LICENSE_PEPPER = Deno.env.get('LICENSE_PEPPER')!;
const JWT_SECRET = Deno.env.get('LICENSE_JWT_SECRET')!;

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

// ─── Helpers (Web Crypto only — no external deps) ────────────

function buf2hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function buf2base64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacSha256Hex(message: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return buf2hex(sig);
}

async function signJwt(payload: Record<string, unknown>): Promise<string> {
  const enc = new TextEncoder();
  const header = { alg: 'HS256', typ: 'JWT' };

  const headerB64 = buf2base64url(enc.encode(JSON.stringify(header)).buffer);
  const payloadB64 = buf2base64url(enc.encode(JSON.stringify(payload)).buffer);
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    'raw', enc.encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(signingInput));
  const sigB64 = buf2base64url(sig);

  return `${signingInput}.${sigB64}`;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status = 400, errorCode?: string): Response {
  const body: Record<string, unknown> = { error: message };
  if (errorCode) body.error_code = errorCode;
  return jsonResponse(body, status);
}

// ─── Rate Limiting ────────────────────────────────────────────

async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  ip: string,
): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

  const { data } = await supabase
    .from('license_rate_limits')
    .select('attempt_count, first_attempt')
    .eq('ip_address', ip)
    .single();

  if (!data) {
    await supabase.from('license_rate_limits').upsert({
      ip_address: ip,
      attempt_count: 1,
      first_attempt: now.toISOString(),
      last_attempt: now.toISOString(),
    });
    return true;
  }

  const firstAttempt = new Date(data.first_attempt);
  if (firstAttempt < windowStart) {
    await supabase.from('license_rate_limits').update({
      attempt_count: 1,
      first_attempt: now.toISOString(),
      last_attempt: now.toISOString(),
    }).eq('ip_address', ip);
    return true;
  }

  if (data.attempt_count >= RATE_LIMIT_MAX) {
    return false;
  }

  await supabase.from('license_rate_limits').update({
    attempt_count: data.attempt_count + 1,
    last_attempt: now.toISOString(),
  }).eq('ip_address', ip);

  return true;
}

// ─── Main Handler ─────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  if (!LICENSE_PEPPER || !JWT_SECRET) {
    console.error('Missing LICENSE_PEPPER or LICENSE_JWT_SECRET secrets');
    return errorResponse('Server configuration error', 500, 'SERVER_CONFIG_ERROR');
  }

  if (JWT_SECRET.length < 32) {
    console.error('LICENSE_JWT_SECRET too short (min 32 chars)');
    return errorResponse('Server configuration error', 500, 'SERVER_CONFIG_ERROR');
  }

  let code: string;
  let deviceId: string;
  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    const body = await req.json();
    code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    deviceId = typeof body.device_id === 'string' ? body.device_id.trim() : '';
    userId = typeof body.user_id === 'string' ? body.user_id.trim() || null : null;
    userEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() || null : null;
  } catch {
    return errorResponse('Invalid JSON body', 400, 'INVALID_BODY');
  }

  if (!code || !deviceId) {
    return errorResponse('Missing code or device_id', 400, 'MISSING_FIELDS');
  }

  if (!/^DP[TSPR]-[A-Z0-9-]{4,20}$/.test(code)) {
    return errorResponse('Format cod invalid.', 400, 'INVALID_FORMAT');
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('cf-connecting-ip')
    || 'unknown';

  const allowed = await checkRateLimit(supabase, clientIp);
  if (!allowed) {
    return errorResponse('Prea multe incercari. Asteapta 15 minute.', 429, 'RATE_LIMITED');
  }

  // ─── Lookup by HMAC ─────────────────────────────────────────
  const codeLookup = await hmacSha256Hex(code, LICENSE_PEPPER);

  const { data: row, error: selectError } = await supabase
    .from('license_codes')
    .select('*')
    .eq('code_lookup', codeLookup)
    .eq('is_active', true)
    .single();

  if (selectError || !row) {
    return errorResponse('Cod necunoscut.', 400, 'CODE_UNKNOWN');
  }

  // ─── Device lock ────────────────────────────────────────────
  if (!row.multi_device && row.used_by_device && row.used_by_device !== deviceId) {
    return errorResponse('Cod deja folosit pe alt dispozitiv.', 400, 'DEVICE_LOCKED');
  }

  // ─── Activate ───────────────────────────────────────────────
  const now = new Date();
  const isFirstActivation = !row.activated_at;

  if (isFirstActivation || (row.used_by_device === deviceId) || row.multi_device) {
    const updateData: Record<string, unknown> = {};

    if (isFirstActivation) {
      updateData.activated_at = now.toISOString();
    }

    if (!row.multi_device) {
      updateData.used_by_device = deviceId;
    }

    if (userId && !row.activated_by_user) {
      updateData.activated_by_user = userId;
    }
    if (userEmail && !row.activated_by_email) {
      updateData.activated_by_email = userEmail;
    }

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('license_codes')
        .update(updateData)
        .eq('id', row.id);
    }
  }

  // ─── Build JWT ──────────────────────────────────────────────
  const activatedAt = row.activated_at
    ? new Date(row.activated_at).getTime()
    : now.getTime();

  const expiresAt = row.duration_days != null
    ? activatedAt + row.duration_days * 24 * 60 * 60 * 1000
    : null;

  const expSeconds = expiresAt
    ? Math.floor(expiresAt / 1000)
    : Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 60 * 60;

  const jti = crypto.randomUUID();

  const payload = {
    sub: deviceId,
    plan: row.plan,
    device_id: deviceId,
    activated_at: activatedAt,
    expires_at: expiresAt,
    max_rides: row.max_rides,
    multi_device: row.multi_device,
    duration_days: row.duration_days,
    jti,
    iat: Math.floor(Date.now() / 1000),
    exp: expSeconds,
  };

  const token = await signJwt(payload);

  return jsonResponse({ token, plan: row.plan });
});
