/**
 * DrumIQ — calculate-referral-discount Edge Function
 *
 * Counts a user's active PRO referrals and returns the discount tier.
 * Called at renewal time or from app to show current discount.
 *
 * Input:  POST with Authorization: Bearer <jwt>
 * Output: { active_referrals, discount_pct, effective_price, tier }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const PRO_MONTHLY_PRICE = 49;

const REFERRAL_TIERS = [
  { min: 1, max: 4, discountPct: 10 },
  { min: 5, max: 9, discountPct: 20 },
  { min: 10, max: Infinity, discountPct: 30 },
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

function getTier(activeCount: number): { discountPct: number; tier: string } {
  if (activeCount <= 0) return { discountPct: 0, tier: 'none' };
  for (const t of REFERRAL_TIERS) {
    if (activeCount >= t.min && activeCount <= t.max) {
      return { discountPct: t.discountPct, tier: `${t.min}-${t.max === Infinity ? '+' : t.max}` };
    }
  }
  return { discountPct: 30, tier: '10+' };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing auth token' }), {
      status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUser = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Count active referrals where referred user has an active PRO license
  const { count, error: countError } = await supabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', user.id)
    .eq('status', 'active');

  if (countError) {
    console.error('Referral count error:', countError);
    return new Response(JSON.stringify({ error: 'Failed to count referrals' }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const activeCount = count ?? 0;
  const { discountPct, tier } = getTier(activeCount);
  const effectivePrice = Math.round(PRO_MONTHLY_PRICE * (1 - discountPct / 100));

  // Also fetch referral code
  const { data: codeRow } = await supabase
    .from('referral_codes')
    .select('code')
    .eq('user_id', user.id)
    .single();

  return new Response(JSON.stringify({
    active_referrals: activeCount,
    discount_pct: discountPct,
    effective_price: effectivePrice,
    base_price: PRO_MONTHLY_PRICE,
    tier,
    referral_code: codeRow?.code ?? null,
  }), {
    status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
});
