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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey, x-admin-secret',
};

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
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => chars[b % chars.length]).join('');
  return `${prefix}-${part()}-${part()}`;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

// ─── Main Handler ────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  // Auth: check admin secret
  const headerSecret = req.headers.get('x-admin-secret');

  let planType: string;
  let email: string | null = null;
  let userId: string | null = null;
  let bodySecret: string | null = null;

  try {
    const body = await req.json();
    planType = typeof body.plan_type === 'string' ? body.plan_type.trim() : '';
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() || null : null;
    userId = typeof body.user_id === 'string' ? body.user_id.trim() || null : null;
    bodySecret = typeof body.admin_secret === 'string' ? body.admin_secret : null;
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const secret = headerSecret || bodySecret;
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return errorResponse('Unauthorized', 401);
  }

  const config = PLAN_CONFIGS[planType];
  if (!config) {
    return errorResponse(`Invalid plan_type: ${planType}. Valid: ${Object.keys(PLAN_CONFIGS).join(', ')}`);
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
      return errorResponse('Founding member limit (100) reached');
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
    console.error('Failed to insert license code:', insertError);
    return errorResponse('Failed to generate code', 500);
  }

  return jsonResponse({
    code,
    plan: config.plan,
    plan_type: planType,
    duration_days: config.duration_days,
    max_rides: config.max_rides,
    multi_device: config.multi_device,
    email,
  });
});
