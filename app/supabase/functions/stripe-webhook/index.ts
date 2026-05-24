/**
 * DrumIQ — stripe-webhook Edge Function
 *
 * Handles Stripe webhook events:
 * - checkout.session.completed → generate license + process referral
 * - customer.subscription.deleted → expire referral status
 * - invoice.paid → renewal with referral discount applied
 *
 * Stripe sends: POST with Stripe-Signature header
 * Secrets needed: STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const LICENSE_PEPPER = Deno.env.get('LICENSE_PEPPER')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
};

const REFERRAL_TIERS = [
  { min: 1, max: 4, discountPct: 10 },
  { min: 5, max: 9, discountPct: 20 },
  { min: 10, max: Infinity, discountPct: 30 },
];

function getDiscountPct(count: number): number {
  if (count <= 0) return 0;
  for (const t of REFERRAL_TIERS) {
    if (count >= t.min && count <= t.max) return t.discountPct;
  }
  return 30;
}

// ─── Stripe signature verification ────────────────────────────
async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  if (!secret) return true; // Skip verification if no secret configured (dev mode)

  const parts = Object.fromEntries(
    sigHeader.split(',').map(p => {
      const [k, v] = p.split('=');
      return [k, v];
    })
  );

  const timestamp = parts['t'];
  const expectedSig = parts['v1'];
  if (!timestamp || !expectedSig) return false;

  // Reject timestamps older than 5 minutes
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (Math.abs(age) > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(signedPayload));
  const computed = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');

  return computed === expectedSig;
}

// ─── License code generation (same pattern as generate-license) ──
function generateLicenseCode(prefix: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => chars[b % chars.length]).join('');
  return `${prefix}-${part()}-${part()}`;
}

async function hmacSha256Hex(message: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Plan mapping ─────────────────────────────────────────────
interface PlanInfo {
  plan: string;
  duration_days: number | null;
}

const PLAN_MAP: Record<string, PlanInfo> = {
  pro_monthly:       { plan: 'pro', duration_days: 30 },
  pro_annual:        { plan: 'pro', duration_days: 365 },
  pro_lifetime:      { plan: 'pro', duration_days: null },
  founding_annual:   { plan: 'pro', duration_days: 365 },
  founding_lifetime: { plan: 'pro', duration_days: null },
};

// ─── Main Handler ─────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await req.text();
  const sigHeader = req.headers.get('Stripe-Signature') ?? '';

  const valid = await verifyStripeSignature(body, sigHeader, STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    console.error('Invalid Stripe signature');
    return new Response('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(body);
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    switch (event.type) {
      // ─── New purchase ───────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object;
        const email = session.customer_email ?? session.customer_details?.email;
        const planType = session.metadata?.plan_type ?? 'pro_monthly';
        const referralCode = session.metadata?.referral_code;
        const userId = session.metadata?.user_id;

        const planInfo = PLAN_MAP[planType];
        if (!planInfo) {
          console.error('Unknown plan_type:', planType);
          break;
        }

        // 1. Generate license code
        const code = generateLicenseCode('DPP');
        const codeLookup = await hmacSha256Hex(code, LICENSE_PEPPER);

        await supabase.from('license_codes').insert({
          code_hash: null,
          code_lookup: codeLookup,
          plan: planInfo.plan,
          duration_days: planInfo.duration_days,
          max_rides: null,
          multi_device: false,
          is_active: true,
          activated_by_user: userId ?? null,
          activated_by_email: email ?? null,
        });

        // 2. Process referral if code provided
        if (referralCode && userId) {
          const { data: refCode } = await supabase
            .from('referral_codes')
            .select('user_id')
            .eq('code', referralCode.toUpperCase())
            .single();

          if (refCode && refCode.user_id !== userId) {
            await supabase.from('referrals').upsert({
              referrer_id: refCode.user_id,
              referred_id: userId,
              referred_email: email,
              status: 'active',
              activated_at: new Date().toISOString(),
            }, { onConflict: 'referrer_id,referred_id' });
          }
        }

        // 3. Track founding member
        if (planType === 'founding_annual' || planType === 'founding_lifetime') {
          const price = planType === 'founding_annual' ? 199 : 399;
          if (userId) {
            await supabase.from('founding_members').upsert({
              user_id: userId,
              plan_type: planType,
              locked_price: price,
            }, { onConflict: 'user_id' });
          }
        }

        console.log(`License generated for ${email}: ${planType}`);
        break;
      }

      // ─── Subscription cancelled → expire referral ──────
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const email = sub.metadata?.email;
        const userId = sub.metadata?.user_id;

        if (userId) {
          // Mark all referrals where this user is the referred_id as expired
          await supabase
            .from('referrals')
            .update({ status: 'expired', expired_at: new Date().toISOString() })
            .eq('referred_id', userId)
            .eq('status', 'active');

          console.log(`Referral expired for user ${userId}`);
        }
        break;
      }

      // ─── Renewal → calculate discount for referrer ─────
      case 'invoice.paid': {
        const invoice = event.data.object;
        const userId = invoice.metadata?.user_id ?? invoice.subscription_details?.metadata?.user_id;

        if (userId && invoice.billing_reason === 'subscription_cycle') {
          // Count active referrals for this user
          const { count } = await supabase
            .from('referrals')
            .select('id', { count: 'exact', head: true })
            .eq('referrer_id', userId)
            .eq('status', 'active');

          const discountPct = getDiscountPct(count ?? 0);

          if (discountPct > 0) {
            console.log(`Referral discount ${discountPct}% for user ${userId} (${count} active referrals)`);
            // Stripe coupon/discount applied via Stripe API at subscription creation
            // or via Stripe Billing Portal — logged here for audit
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
    return new Response('Webhook processing error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
});
