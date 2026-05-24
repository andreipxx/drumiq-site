/**
 * DrumIQ — generate-license Edge Function
 *
 * Generates a random PRO license code and inserts it into the database.
 * Called after a successful Stripe payment (via webhook or manual).
 *
 * Input:  POST { plan_type, email?, user_id?, admin_secret }
 *   plan_type: "pro_monthly" | "pro_annual" | "pro_lifetime" | "founding_annual" | "founding_lifetime"
 *   email: buyer email (optional, for pre-linking)
 *   user_id: buyer Supabase user ID (optional, for pre-linking)
 *   admin_secret: shared secret to authorize code generation
 *
 * Output: { code, plan, duration_days, max_rides }
 *
 * Security: requires ADMIN_SECRET header or body field — not callable by anonymous users.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LICENSE_PEPPER = Deno.env.get('LICENSE_PEPPER')!;
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET')!;

// SEC-M4: Admin-only endpoint — restrict CORS to known origins or server-to-server calls.
// If called only from Stripe webhooks / server scripts, CORS is not needed at all.
// Keeping minimal CORS for manual admin use from a known dashboard.
const ALLOWED_ORIGINS = (Deno.env.get('ADMIN_ALLOWED_ORIGINS') ?? '').split(',').map(s => s.trim()).filter(Boolean);

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  // If no allowed origins configured or origin matches, allow it; otherwise deny
  const allowOrigin = ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)
    ? (origin || 'null')
    : 'null';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey, x-admin-secret',
  };
}

// ─── Plan configs ────────────────────────────────────────────

interface PlanConfig {
  plan: string;
  duration_days: number | null;
  max_rides: number | null;
  multi_device: boolean;
  prefix: string;
}

const PLAN_CONFIGS: Record<string, PlanConfig> = {
  pro_monthly: {
    plan: 'pro',
    duration_days: 30,
    max_rides: null,
    multi_device: false,
    prefix: 'DPP',
  },
  pro_annual: {
    plan: 'pro',
    duration_days: 365,
    max_rides: null,
    multi_device: false,
    prefix: 'DPP',
  },
  pro_lifetime: {
    plan: 'pro',
    duration_days: null,
    max_rides: null,
    multi_device: false,
    prefix: 'DPP',
  },
  founding_annual: {
    plan: 'pro',
    duration_days: 365,
    max_rides: null,
    multi_device: false,
    prefix: 'DPP',
  },
  founding_lifetime: {
    plan: 'pro',
    duration_days: null,
    max_rides: null,
    multi_device: false,
    prefix: 'DPP',
  },
  root: {
    plan: 'root',
    duration_days: null,
    max_rides: null,
    multi_device: true,
    prefix: 'DPR',
  },
};

// ─── Helpers ─────────────────────────────────────────────────

function buf2hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256Hex(message: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return buf2hex(sig);
}

function generateCode(prefix: string): string {
  // SEC-L2: chars.length=32, so b%32 has zero modulo bias from 256 values (256/32=8 exact).
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => chars[b % chars.length]).join('');
  return `${prefix}-${part()}-${part()}`;
}

// SEC-M2: Constant-time string comparison to prevent timing attacks on admin secret
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  let result = 0;
  for (let i = 0; i < bufA.length; i++) result |= bufA[i] ^ bufB[i];
  return result === 0;
}

function jsonResponse(body: Record<string, unknown>, status = 200, corsHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...(corsHeaders ?? {}), 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status = 400, corsHeaders?: Record<string, string>): Response {
  return jsonResponse({ error: message }, status, corsHeaders);
}

// ─── Main Handler ────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, cors);
  }

  // Auth: check admin secret
  const headerSecret = req.headers.get('x-admin-secret');

  let planType: string;
  let email: string | null = null;
  let userId: string | null = null;
  let bodySecret: string | null = null;

  try {
    // SEC-M1: Parse body but never log the raw body or admin_secret field
    const body = await req.json();
    planType = typeof body.plan_type === 'string' ? body.plan_type.trim() : '';
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() || null : null;
    userId = typeof body.user_id === 'string' ? body.user_id.trim() || null : null;
    bodySecret = typeof body.admin_secret === 'string' ? body.admin_secret : null;
  } catch {
    return errorResponse('Invalid JSON body', 400, cors);
  }

  const secret = headerSecret || bodySecret;
  // SEC-M2: Use constant-time comparison to prevent timing attacks
  if (!ADMIN_SECRET || !secret || !timingSafeEqual(secret, ADMIN_SECRET)) {
    return errorResponse('Unauthorized', 401, cors);
  }

  const config = PLAN_CONFIGS[planType];
  if (!config) {
    return errorResponse(`Invalid plan_type: ${planType}. Valid: ${Object.keys(PLAN_CONFIGS).join(', ')}`, 400, cors);
  }

  // Check founding member limit
  if (planType === 'founding_annual' || planType === 'founding_lifetime') {
    const supabaseCheck = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { count } = await supabaseCheck
      .from('license_codes')
      .select('id', { count: 'exact', head: true })
      .eq('plan', 'pro')
      .eq('is_active', true)
      .not('activated_at', 'is', null);

    if ((count ?? 0) >= 100) {
      return errorResponse('Founding member limit (100) reached', 400, cors);
    }
  }

  // Generate unique code + HMAC lookup
  const code = generateCode(config.prefix);
  const codeLookup = await hmacSha256Hex(code, LICENSE_PEPPER);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: insertError } = await supabase
    .from('license_codes')
    .insert({
      code_hash: null,
      code_lookup: codeLookup,
      plan: config.plan,
      duration_days: config.duration_days,
      max_rides: config.max_rides,
      multi_device: config.multi_device,
      is_active: true,
      activated_by_user: userId,
      activated_by_email: email,
    });

  if (insertError) {
    // SEC-M1: Log only the error object, never the admin secret or raw body
    console.error('Failed to insert license code:', insertError);
    return errorResponse('Failed to generate code', 500, cors);
  }

  return jsonResponse({
    code,
    plan: config.plan,
    plan_type: planType,
    duration_days: config.duration_days,
    max_rides: config.max_rides,
    multi_device: config.multi_device,
    email,
  }, 200, cors);
});
