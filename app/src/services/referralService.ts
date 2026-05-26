import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { PLAN_PRICES_RON, REFERRAL_TIERS } from '../constants/config';

const REFERRAL_CODE_KEY = '@dp_referral_code';

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

function generateLocalCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `REF-${part(3)}-${part(3)}`;
}

export async function getOrCreateReferralCode(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const cached = await AsyncStorage.getItem(REFERRAL_CODE_KEY);
  if (cached) return cached;

  try {
    const resp = await supabase.functions.invoke('generate-referral-code', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!resp.error && resp.data?.code) {
      await AsyncStorage.setItem(REFERRAL_CODE_KEY, resp.data.code);
      return resp.data.code;
    }
  } catch {}

  const code = generateLocalCode();
  await AsyncStorage.setItem(REFERRAL_CODE_KEY, code);
  return code;
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
    if (!resp.error && resp.data) {
      const code = resp.data.referral_code ?? null;
      if (code) await AsyncStorage.setItem(REFERRAL_CODE_KEY, code);
      return {
        referralCode: code,
        activeReferrals: resp.data.active_referrals ?? 0,
        discountPct: resp.data.discount_pct ?? 0,
        effectivePrice: resp.data.effective_price ?? PLAN_PRICES_RON.pro_monthly,
        tier: resp.data.tier ?? 'none',
      };
    }
  } catch {}

  const code = await getOrCreateReferralCode();
  return {
    referralCode: code,
    activeReferrals: 0,
    discountPct: 0,
    effectivePrice: PLAN_PRICES_RON.pro_monthly,
    tier: 'none',
  };
}
