/**
 * DrumIQ — Seed license codes into Supabase
 *
 * Run this ONCE after deploying the migration and setting secrets:
 *   supabase secrets set LICENSE_PEPPER=<your-random-64-char-hex>
 *   supabase secrets set LICENSE_JWT_SECRET=<your-random-64-char-hex>
 *
 * Execute with Deno:
 *   deno run --allow-net --allow-env seed-license-codes.ts
 *
 * Or run directly against Supabase using the service_role key:
 *   SUPABASE_URL=https://dudubuvigdnsduziedix.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> \
 *   LICENSE_PEPPER=<your-pepper> \
 *   deno run --allow-net --allow-env seed-license-codes.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.208.0/crypto/mod.ts';
import { encode as hexEncode } from 'https://deno.land/std@0.208.0/encoding/hex.ts';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://dudubuvigdnsduziedix.supabase.co';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const PEPPER = Deno.env.get('LICENSE_PEPPER');

if (!SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY env var required');
if (!PEPPER) throw new Error('LICENSE_PEPPER env var required');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface CodeDef {
  code: string;
  plan: 'trial' | 'simplu' | 'pro';
  duration_days: number | null;
  max_rides: number | null;
  multi_device: boolean;
}

const CODES: CodeDef[] = [
  { code: 'DPT-TRIAL-2026',     plan: 'trial',  duration_days: 7,    max_rides: 100,  multi_device: false },
  { code: 'DPS-TEST-001',       plan: 'simplu', duration_days: 30,   max_rides: null, multi_device: false },
  { code: 'DPS-TEST-002',       plan: 'simplu', duration_days: 30,   max_rides: null, multi_device: false },
  { code: 'DPS-TEST-003',       plan: 'simplu', duration_days: 30,   max_rides: null, multi_device: false },
  { code: 'DPP-TEST-001',       plan: 'pro',    duration_days: 30,   max_rides: null, multi_device: false },
  { code: 'DPP-TEST-002',       plan: 'pro',    duration_days: 30,   max_rides: null, multi_device: false },
  { code: 'DPP-TEST-003',       plan: 'pro',    duration_days: 30,   max_rides: null, multi_device: false },
  { code: 'DPR-ROOT-ANDR-2026', plan: 'pro',    duration_days: null, max_rides: null, multi_device: true  },
];

async function hmacSha256(message: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const msgData = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return new TextDecoder().decode(hexEncode(new Uint8Array(sig)));
}

async function main() {
  console.log('Seeding license codes...');

  for (const def of CODES) {
    const upperCode = def.code.toUpperCase();
    const codeHash = await bcrypt.hash(upperCode, 10);
    const codeLookup = await hmacSha256(upperCode, PEPPER);

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
      console.error(`Failed to seed ${def.code}:`, error.message);
    } else {
      console.log(`Seeded: ${def.code} (${def.plan}) — lookup: ${codeLookup.substring(0, 16)}...`);
    }
  }

  console.log('Done! All 8 codes seeded.');
}

main().catch(console.error);
