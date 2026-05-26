import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dudubuvigdnsduziedix.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PEPPER = process.env.LICENSE_PEPPER;

if (!SERVICE_ROLE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY required'); process.exit(1); }
if (!PEPPER) { console.error('LICENSE_PEPPER required'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const CODES = [
  { code: 'DPT-TRIAL-2026',     plan: 'trial',  duration_days: 7,    max_rides: 100,  multi_device: false },
  { code: 'DPS-TEST-001',       plan: 'simplu', duration_days: 30,   max_rides: null, multi_device: false },
  { code: 'DPS-TEST-002',       plan: 'simplu', duration_days: 30,   max_rides: null, multi_device: false },
  { code: 'DPS-TEST-003',       plan: 'simplu', duration_days: 30,   max_rides: null, multi_device: false },
  { code: 'DPP-TEST-001',       plan: 'pro',    duration_days: 30,   max_rides: null, multi_device: false },
  { code: 'DPP-TEST-002',       plan: 'pro',    duration_days: 30,   max_rides: null, multi_device: false },
  { code: 'DPP-TEST-003',       plan: 'pro',    duration_days: 30,   max_rides: null, multi_device: false },
  { code: 'DPR-ROOT-ANDR-2026', plan: 'pro',    duration_days: null, max_rides: null, multi_device: true  },
];

for (const def of CODES) {
  const upper = def.code.toUpperCase();
  const codeHash = bcrypt.hashSync(upper, 10);
  const codeLookup = createHmac('sha256', PEPPER).update(upper).digest('hex');

  const { error } = await supabase.from('license_codes').upsert({
    code_hash: codeHash,
    code_lookup: codeLookup,
    plan: def.plan,
    duration_days: def.duration_days,
    max_rides: def.max_rides,
    multi_device: def.multi_device,
    is_active: true,
  }, { onConflict: 'code_lookup' });

  if (error) {
    console.error(`FAIL ${def.code}:`, error.message);
  } else {
    console.log(`OK: ${def.code} (${def.plan}) — lookup: ${codeLookup.substring(0, 16)}...`);
  }
}

console.log('Done! 8 codes seeded.');
