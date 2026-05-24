import { supabase } from './supabase';
import { PLAN_PRICES_RON, REFERRAL_TIERS } from '../constants/config';

export interface ReferralInfo {
  referralCode: string | null;
  activeReferrals: number;
  discountPct: number;
  effectivePrice: number;
  tier: string;
}

export function getDiscountForCount(count: number): { discountPct: number; tier: string } {
  if (count <= 0) return { discountPct: 0, tier: 'none' };
  for (const t of REFERRAL_TIERS) {
    if (count >= t.min && count <= t.max) {
      return { discountPct: t.discountPct, tier: `${t.min}-${t.max === Infinity ? '+' : t.max}` };
    }
  }
  return { discountPct: 30, tier: '10+' };
}

export async function getReferralInfo(): Promise<ReferralInfo> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { referralCode: null, activeReferrals: 0, discountPct: 0, effectivePrice: PLAN_PRICES_RON.pro_monthly, tier: 'none' };
  }

  try {
    const resp = await supabase.functions.invoke('calculate-referral-discount', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (resp.error || !resp.data) throw new Error(resp.error?.message ?? 'No data');

    return {
      referralCode: resp.data.referral_code ?? null,
      activeReferrals: resp.data.active_referrals ?? 0,
      discountPct: resp.data.discount_pct ?? 0,
      effectivePrice: resp.data.effective_price ?? PLAN_PRICES_RON.pro_monthly,
      tier: resp.data.tier ?? 'none',
    };
  } catch {
    return { referralCode: null, activeReferrals: 0, discountPct: 0, effectivePrice: PLAN_PRICES_RON.pro_monthly, tier: 'none' };
  }
}

export async function getOrCreateReferralCode(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  try {
    const resp = await supabase.functions.invoke('generate-referral-code', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (resp.error || !resp.data) return null;
    return resp.data.code ?? null;
  } catch {
    return null;
  }
}
