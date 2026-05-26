-- DrumIQ: Server-side license validation (CRIT-1 + CRIT-2 fix)
-- Table: license_codes
-- Pattern: HMAC-SHA256 deterministic lookup + bcrypt verify
-- RLS: deny all for anon/authenticated; only service_role can read/write

-- ============================================================
-- 1. Enable pgcrypto for gen_random_uuid
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 2. Create license_codes table
-- ============================================================
CREATE TABLE IF NOT EXISTS license_codes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash      TEXT    NOT NULL,                      -- bcrypt hash of uppercase code
  code_lookup    TEXT    NOT NULL UNIQUE,                -- HMAC-SHA256(code, pepper) hex for indexed SELECT
  plan           TEXT    NOT NULL CHECK (plan IN ('trial', 'simplu', 'pro')),
  duration_days  INTEGER,                                -- NULL = lifetime
  max_rides      INTEGER,                                -- NULL = unlimited
  multi_device   BOOLEAN NOT NULL DEFAULT false,
  used_by_device TEXT,                                   -- device_id that activated; NULL if unused
  activated_at   TIMESTAMPTZ,                            -- when first activated
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active      BOOLEAN NOT NULL DEFAULT true           -- soft-delete / revoke flag
);

-- Index on lookup column for fast SELECT
CREATE INDEX IF NOT EXISTS idx_license_codes_lookup ON license_codes (code_lookup);

-- ============================================================
-- 3. RLS: deny everything for anon and authenticated
--    Only service_role (Edge Functions) can access this table
-- ============================================================
ALTER TABLE license_codes ENABLE ROW LEVEL SECURITY;

-- Deny SELECT
CREATE POLICY license_codes_deny_select ON license_codes
  FOR SELECT TO anon, authenticated
  USING (false);

-- Deny INSERT
CREATE POLICY license_codes_deny_insert ON license_codes
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

-- Deny UPDATE
CREATE POLICY license_codes_deny_update ON license_codes
  FOR UPDATE TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Deny DELETE
CREATE POLICY license_codes_deny_delete ON license_codes
  FOR DELETE TO anon, authenticated
  USING (false);

-- ============================================================
-- 4. Seed existing 8 codes
--    IMPORTANT: These are PLACEHOLDER hashes.
--    After deploying, run the seed script with real pepper to
--    generate correct HMAC lookups and bcrypt hashes.
--
--    The Edge Function uses:
--      code_lookup = HMAC-SHA256(UPPER(code), LICENSE_PEPPER) as hex
--      code_hash   = bcrypt(UPPER(code), 10 rounds)
--
--    You MUST regenerate these with your actual LICENSE_PEPPER secret
--    using the companion seed script (see below).
-- ============================================================

-- ⚠️  TABLE IS EMPTY AFTER THIS MIGRATION — SEED REQUIRED!
--
-- You MUST run the companion seed script AFTER deploying this migration
-- AND after setting secrets:
--
--   supabase secrets set LICENSE_PEPPER=<64-char-hex>
--   supabase secrets set LICENSE_JWT_SECRET=<64-char-hex>
--
-- Then seed codes:
--   SUPABASE_URL=https://dudubuvigdnsduziedix.supabase.co \
--   SUPABASE_SERVICE_ROLE_KEY=<key> \
--   LICENSE_PEPPER=<pepper> \
--   deno run --allow-net --allow-env supabase/seed-license-codes.ts
--
-- Without seeding, ALL license activations will return "Cod necunoscut."

-- ============================================================
-- 5. Rate limiting table for Edge Function
-- ============================================================
CREATE TABLE IF NOT EXISTS license_rate_limits (
  ip_address    TEXT PRIMARY KEY,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  first_attempt TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_attempt  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE license_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY rate_limits_deny_all ON license_rate_limits
  FOR ALL TO anon, authenticated
  USING (false);
