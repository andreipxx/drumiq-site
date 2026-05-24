-- DrumIQ: Referral system
-- Discount permanent 10/20/30% bazat pe prieteni PRO activi

-- ============================================================
-- 1. Referral codes — one per user
-- ============================================================
CREATE TABLE IF NOT EXISTS referral_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE,
  code          TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- Users can read their own referral code
CREATE POLICY referral_codes_select_own ON referral_codes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Only service_role can insert/update/delete
CREATE POLICY referral_codes_deny_insert ON referral_codes
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY referral_codes_deny_update ON referral_codes
  FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY referral_codes_deny_delete ON referral_codes
  FOR DELETE TO anon, authenticated
  USING (false);

-- ============================================================
-- 2. Referrals — tracks who referred whom
-- ============================================================
CREATE TABLE IF NOT EXISTS referrals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id   UUID NOT NULL,
  referred_id   UUID NOT NULL,
  referred_email TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at  TIMESTAMPTZ,
  expired_at    TIMESTAMPTZ,
  UNIQUE(referrer_id, referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(referrer_id, status) WHERE status = 'active';

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Users can see their own referrals (as referrer)
CREATE POLICY referrals_select_own ON referrals
  FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id);

CREATE POLICY referrals_deny_insert ON referrals
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY referrals_deny_update ON referrals
  FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY referrals_deny_delete ON referrals
  FOR DELETE TO anon, authenticated
  USING (false);

-- ============================================================
-- 3. Founding member counter table
-- ============================================================
CREATE TABLE IF NOT EXISTS founding_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE,
  plan_type     TEXT NOT NULL CHECK (plan_type IN ('founding_annual', 'founding_lifetime')),
  locked_price  INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE founding_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY founding_deny_all ON founding_members
  FOR ALL TO anon, authenticated
  USING (false);
