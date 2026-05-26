-- Add user tracking columns to license_codes
ALTER TABLE license_codes ADD COLUMN IF NOT EXISTS activated_by_user UUID;
ALTER TABLE license_codes ADD COLUMN IF NOT EXISTS activated_by_email TEXT;

-- Index for lookup by user
CREATE INDEX IF NOT EXISTS idx_license_codes_activated_by_user ON license_codes(activated_by_user);
