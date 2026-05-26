/**
 * DrumIQ — activate-trial Edge Function
 *
 * Auto-assigns a 7-day / 100-ride trial to new devices.
 * Generates a unique trial code on-demand (no pre-seeding needed).
 *
 * Limits:
 *   - 1 trial per device_id
 *   - Max 3 trials per IP (carrier NAT safety in Romania)
 *   - Cap: 10,000 total trials
 *
 * Input:  POST { device_id: string }
 * Output: { token: string, plan: "trial" }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LICENSE_PEPPER = Deno.env.get('LICENSE_PEPPER')!;
const JWT_SECRET = Deno.env.get('LICENSE_JWT_SECRET')!;

const MAX_TRIALS_TOTAL = 10000;
const MAX_TRIALS_PER_IP = 1;
const TRIAL_DURATION_DAYS = 7;
const TRIAL_MAX_RIDES = 100;

const WHITELISTED_DEVICES = new Set([
  '8968dfdcc5db7d62',
]);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

// ─── Helpers (Web Crypto only) ───────────────────────────────

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
  return `${signingInput}.${buf2base64url(sig)}`;
}

function generateTrialCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => chars[b % chars.length]).join('');
  return `DPT-${part()}-${part()}`;
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

// ─── Main Handler ─────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  if (!LICENSE_PEPPER || !JWT_SECRET) {
    return errorResponse('Server configuration error', 500, 'SERVER_CONFIG_ERROR');
  }

  let deviceId: string;
  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    const body = await req.json();
    deviceId = typeof body.device_id === 'string' ? body.device_id.trim() : '';
    userId = typeof body.user_id === 'string' ? body.user_id.trim() || null : null;
    userEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() || null : null;
  } catch {
    return errorResponse('Invalid JSON body', 400, 'INVALID_BODY');
  }

  if (!deviceId) {
    return errorResponse('Missing device_id', 400, 'MISSING_FIELDS');
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('cf-connecting-ip')
    || 'unknown';

  // ─── Check: user already has ANY active paid license → return that instead ─
  if (userId) {
    const { data: paidLicense } = await supabase
      .from('license_codes')
      .select('id, activated_at, duration_days, max_rides, plan, multi_device, used_by_device')
      .eq('activated_by_user', userId)
      .eq('is_active', true)
      .neq('plan', 'trial')
      .limit(1)
      .single();

    if (paidLicense) {
      const activatedAt = new Date(paidLicense.activated_at).getTime();
      const expiresAt = paidLicense.duration_days != null
        ? activatedAt + paidLicense.duration_days * 24 * 60 * 60 * 1000
        : null;
      const expSeconds = expiresAt
        ? Math.floor(expiresAt / 1000)
        : Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 60 * 60;

      const jti = crypto.randomUUID();
      const token = await signJwt({
        sub: deviceId,
        plan: paidLicense.plan,
        device_id: deviceId,
        activated_at: activatedAt,
        expires_at: expiresAt,
        max_rides: paidLicense.max_rides,
        multi_device: paidLicense.multi_device,
        duration_days: paidLicense.duration_days,
        jti,
        iat: Math.floor(Date.now() / 1000),
        exp: expSeconds,
      });

      return jsonResponse({ token, plan: paidLicense.plan, existing: true });
    }
  }

  // ─── Check: user already has a trial? (prefer user lookup over device) ─
  let existingTrial = null;
  if (userId) {
    const { data } = await supabase
      .from('license_codes')
      .select('id, activated_at, duration_days, max_rides, plan, multi_device')
      .eq('activated_by_user', userId)
      .eq('plan', 'trial')
      .eq('is_active', true)
      .single();
    existingTrial = data;
  }
  if (!existingTrial) {
    const { data } = await supabase
      .from('license_codes')
      .select('id, activated_at, duration_days, max_rides, plan, multi_device')
      .eq('used_by_device', deviceId)
      .eq('plan', 'trial')
      .eq('is_active', true)
      .single();
    existingTrial = data;
  }

  if (existingTrial) {
    const activatedAt = new Date(existingTrial.activated_at).getTime();
    const expiresAt = activatedAt + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();

    if (now > expiresAt) {
      return errorResponse(
        'Perioada de trial a expirat. Activeaza un cod PRO pentru a continua.',
        400, 'TRIAL_EXPIRED'
      );
    }

    const jti = crypto.randomUUID();
    const token = await signJwt({
      sub: deviceId,
      plan: 'trial',
      device_id: deviceId,
      activated_at: activatedAt,
      expires_at: expiresAt,
      max_rides: TRIAL_MAX_RIDES,
      multi_device: false,
      duration_days: TRIAL_DURATION_DAYS,
      jti,
      iat: Math.floor(now / 1000),
      exp: Math.floor(expiresAt / 1000),
    });

    return jsonResponse({ token, plan: 'trial', existing: true });
  }

  // ─── Check: IP limit (1 trial per IP, whitelisted devices bypass) ─
  if (!WHITELISTED_DEVICES.has(deviceId)) {
    const { count: ipCount } = await supabase
      .from('license_codes')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', clientIp)
      .eq('plan', 'trial')
      .eq('is_active', true);

    if ((ipCount ?? 0) >= MAX_TRIALS_PER_IP) {
      return errorResponse(
        'Limita de activari trial atinsa pentru aceasta retea. Contacteaza suportul.',
        400, 'IP_LIMIT_REACHED'
      );
    }
  }

  // ─── Check: total trial cap ─────────────────────────────────
  const { count: totalTrials } = await supabase
    .from('license_codes')
    .select('id', { count: 'exact', head: true })
    .eq('plan', 'trial')
    .eq('is_active', true)
    .not('activated_at', 'is', null);

  if ((totalTrials ?? 0) >= MAX_TRIALS_TOTAL) {
    return errorResponse(
      'Nu mai sunt trial-uri disponibile. Activeaza un cod PRO.',
      400, 'TRIAL_CAP_REACHED'
    );
  }

  // ─── Generate unique trial code ─────────────────────────────
  const code = generateTrialCode();
  const codeLookup = await hmacSha256Hex(code, LICENSE_PEPPER);
  const now = new Date();

  const { error: insertError } = await supabase
    .from('license_codes')
    .insert({
      code_hash: null,
      code_lookup: codeLookup,
      plan: 'trial',
      duration_days: TRIAL_DURATION_DAYS,
      max_rides: TRIAL_MAX_RIDES,
      multi_device: false,
      used_by_device: deviceId,
      activated_at: now.toISOString(),
      ip_address: clientIp,
      is_active: true,
      activated_by_user: userId,
      activated_by_email: userEmail,
    });

  if (insertError) {
    console.error('Failed to insert trial:', insertError);
    return errorResponse('Eroare server la activare trial.', 500, 'INSERT_FAILED');
  }

  // ─── Build JWT ──────────────────────────────────────────────
  const activatedAt = now.getTime();
  const expiresAt = activatedAt + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;
  const jti = crypto.randomUUID();

  const token = await signJwt({
    sub: deviceId,
    plan: 'trial',
    device_id: deviceId,
    activated_at: activatedAt,
    expires_at: expiresAt,
    max_rides: TRIAL_MAX_RIDES,
    multi_device: false,
    duration_days: TRIAL_DURATION_DAYS,
    jti,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(expiresAt / 1000),
  });

  return jsonResponse({ token, plan: 'trial', existing: false });
});
