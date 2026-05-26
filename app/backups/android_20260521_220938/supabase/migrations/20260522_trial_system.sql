-- DrumIQ: Auto-trial system — on-demand code generation
-- 1 trial per device, max 3 per IP (carrier NAT), cap 10,000 total

-- Allow code_hash to be NULL for auto-generated trial codes
ALTER TABLE license_codes ALTER COLUMN code_hash DROP NOT NULL;

-- Track IP address for trial abuse prevention
ALTER TABLE license_codes ADD COLUMN IF NOT EXISTS ip_address TEXT;
CREATE INDEX IF NOT EXISTS idx_license_codes_ip ON license_codes(ip_address);

-- Index for counting active trials efficiently
CREATE INDEX IF NOT EXISTS idx_license_codes_plan_active ON license_codes(plan, is_active) WHERE activated_at IS NOT NULL;
