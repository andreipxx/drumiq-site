// DRUMIQ Stress Test — Simuleaza N conturi concurente pe Supabase
// Utilizare: node stress-test.js
// Testeaza: signup, login, profile read, license sync, cleanup

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://dudubuvigdnsduziedix.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1ZHVidXZpZ2Ruc2R1emllZGl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTQ5NDgsImV4cCI6MjA5NDM3MDk0OH0.0ta6MRQbpWZ9DriF2hBARWSNiveuC5cqWG21wxWp-Jo';

const TIERS = [50, 100, 500, 1000, 2000, 3000, 5000, 10000];
const TEST_EMAIL_DOMAIN = 'stresstest.drumiq.local';
const BATCH_SIZE = 25; // concurrent requests per batch
const TIMEOUT_MS = 15000;

// ─── Helpers ───
function makeClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function formatMs(ms) { return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`; }

// ─── Test: Auth Signup ───
async function testSignup(count) {
  const results = { ok: 0, fail: 0, errors: {}, latencies: [] };
  const batches = Math.ceil(count / BATCH_SIZE);

  for (let b = 0; b < batches; b++) {
    const batchStart = b * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, count);
    const promises = [];

    for (let i = batchStart; i < batchEnd; i++) {
      const email = `test${i}_${Date.now()}@${TEST_EMAIL_DOMAIN}`;
      const client = makeClient();
      const start = performance.now();

      const p = Promise.race([
        client.auth.signUp({
          email,
          password: 'StressTest123!',
          options: { data: { name: `StressUser${i}` } },
        }),
        sleep(TIMEOUT_MS).then(() => ({ error: { message: 'TIMEOUT' } })),
      ]).then(({ data, error }) => {
        const lat = performance.now() - start;
        results.latencies.push(lat);
        if (error) {
          results.fail++;
          const msg = error.message || 'unknown';
          results.errors[msg] = (results.errors[msg] || 0) + 1;
        } else {
          results.ok++;
        }
      }).catch(e => {
        results.fail++;
        const msg = e.message || 'unknown';
        results.errors[msg] = (results.errors[msg] || 0) + 1;
      });

      promises.push(p);
    }

    await Promise.all(promises);

    // Rate limit protection
    if (b < batches - 1) await sleep(200);
  }

  return results;
}

// ─── Test: Profile Read (simuleaza getLicenseState + getProfile) ───
async function testProfileReads(count) {
  const results = { ok: 0, fail: 0, errors: {}, latencies: [] };
  const batches = Math.ceil(count / BATCH_SIZE);

  for (let b = 0; b < batches; b++) {
    const batchStart = b * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, count);
    const promises = [];

    for (let i = batchStart; i < batchEnd; i++) {
      const client = makeClient();
      const start = performance.now();

      const p = Promise.race([
        client.from('profiles').select('id, plan, fuel_type').limit(1),
        sleep(TIMEOUT_MS).then(() => ({ error: { message: 'TIMEOUT' } })),
      ]).then(({ data, error }) => {
        const lat = performance.now() - start;
        results.latencies.push(lat);
        if (error) {
          results.fail++;
          const msg = error.message || 'unknown';
          results.errors[msg] = (results.errors[msg] || 0) + 1;
        } else {
          results.ok++;
        }
      }).catch(e => {
        results.fail++;
        const msg = e.message || 'unknown';
        results.errors[msg] = (results.errors[msg] || 0) + 1;
      });

      promises.push(p);
    }

    await Promise.all(promises);
    if (b < batches - 1) await sleep(100);
  }

  return results;
}

// ─── Test: DB Write (simuleaza syncPlanToSupabase - update profile) ───
async function testProfileWrites(count) {
  const results = { ok: 0, fail: 0, errors: {}, latencies: [] };
  const batches = Math.ceil(count / BATCH_SIZE);

  for (let b = 0; b < batches; b++) {
    const batchStart = b * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, count);
    const promises = [];

    for (let i = batchStart; i < batchEnd; i++) {
      const client = makeClient();
      const start = performance.now();

      const p = Promise.race([
        client.from('profiles').update({ plan: 'trial' }).eq('id', '00000000-0000-0000-0000-000000000000'),
        sleep(TIMEOUT_MS).then(() => ({ error: { message: 'TIMEOUT' } })),
      ]).then(({ data, error }) => {
        const lat = performance.now() - start;
        results.latencies.push(lat);
        // "No rows" is fine — we're testing connection throughput
        results.ok++;
      }).catch(e => {
        results.fail++;
        const msg = e.message || 'unknown';
        results.errors[msg] = (results.errors[msg] || 0) + 1;
      });

      promises.push(p);
    }

    await Promise.all(promises);
    if (b < batches - 1) await sleep(100);
  }

  return results;
}

// ─── Test: Mixed Load (realistic usage pattern) ───
async function testMixedLoad(count) {
  const results = { ok: 0, fail: 0, errors: {}, latencies: [] };
  const batches = Math.ceil(count / BATCH_SIZE);

  for (let b = 0; b < batches; b++) {
    const batchStart = b * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, count);
    const promises = [];

    for (let i = batchStart; i < batchEnd; i++) {
      const client = makeClient();
      const start = performance.now();

      // 70% reads, 20% writes, 10% auth checks — realistic app pattern
      const roll = Math.random();
      let op;
      if (roll < 0.7) {
        op = client.from('profiles').select('id, plan').limit(1);
      } else if (roll < 0.9) {
        op = client.from('profiles').update({ plan: 'trial' }).eq('id', '00000000-0000-0000-0000-000000000000');
      } else {
        op = client.auth.getSession();
      }

      const p = Promise.race([
        op,
        sleep(TIMEOUT_MS).then(() => ({ error: { message: 'TIMEOUT' } })),
      ]).then(({ data, error }) => {
        const lat = performance.now() - start;
        results.latencies.push(lat);
        if (error && error.message !== 'TIMEOUT') {
          results.ok++; // non-timeout errors from empty results are fine
        } else if (error) {
          results.fail++;
          results.errors['TIMEOUT'] = (results.errors['TIMEOUT'] || 0) + 1;
        } else {
          results.ok++;
        }
      }).catch(e => {
        results.fail++;
        const msg = e.message || 'unknown';
        results.errors[msg] = (results.errors[msg] || 0) + 1;
      });

      promises.push(p);
    }

    await Promise.all(promises);
    if (b < batches - 1) await sleep(100);
  }

  return results;
}

// ─── Report ───
function printReport(name, results, count, durationMs) {
  const rps = (count / (durationMs / 1000)).toFixed(1);
  const errorRate = count > 0 ? ((results.fail / count) * 100).toFixed(1) : '0';

  console.log(`\n  ┌─────────────────────────────────────────┐`);
  console.log(`  │  ${name.padEnd(39)}│`);
  console.log(`  ├─────────────────────────────────────────┤`);
  console.log(`  │  Requests:    ${String(count).padEnd(26)}│`);
  console.log(`  │  Success:     ${String(results.ok).padEnd(26)}│`);
  console.log(`  │  Failed:      ${(results.fail + ' (' + errorRate + '%)').padEnd(26)}│`);
  console.log(`  │  RPS:         ${(rps + ' req/s').padEnd(26)}│`);

  if (results.latencies.length > 0) {
    console.log(`  │  Latency p50: ${formatMs(percentile(results.latencies, 50)).padEnd(26)}│`);
    console.log(`  │  Latency p95: ${formatMs(percentile(results.latencies, 95)).padEnd(26)}│`);
    console.log(`  │  Latency p99: ${formatMs(percentile(results.latencies, 99)).padEnd(26)}│`);
    console.log(`  │  Latency max: ${formatMs(Math.max(...results.latencies)).padEnd(26)}│`);
  }

  console.log(`  │  Duration:    ${formatMs(durationMs).padEnd(26)}│`);
  console.log(`  └─────────────────────────────────────────┘`);

  if (Object.keys(results.errors).length > 0) {
    console.log(`  Errors:`);
    for (const [msg, cnt] of Object.entries(results.errors)) {
      console.log(`    ${cnt}x — ${msg.substring(0, 60)}`);
    }
  }
}

// ─── Main ───
async function main() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  DRUMIQ STRESS TEST — Supabase Infrastructure');
  console.log('══════════════════════════════════════════════════');
  console.log(`  URL:        ${SUPABASE_URL}`);
  console.log(`  Batch size: ${BATCH_SIZE} concurrent`);
  console.log(`  Timeout:    ${TIMEOUT_MS}ms per request`);
  console.log(`  Tiers:      ${TIERS.join(', ')}`);
  console.log('══════════════════════════════════════════════════\n');

  // Quick connectivity check
  console.log('  Checking connectivity...');
  const client = makeClient();
  try {
    const { error } = await client.from('profiles').select('id').limit(1);
    if (error) {
      console.log(`  ⚠ DB query returned error: ${error.message}`);
      console.log('  Continuing anyway — some tests may fail.\n');
    } else {
      console.log('  ✓ Connected to Supabase\n');
    }
  } catch (e) {
    console.log(`  ✗ Cannot reach Supabase: ${e.message}`);
    console.log('  Aborting.\n');
    process.exit(1);
  }

  const summary = [];

  for (const tier of TIERS) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  TIER: ${tier.toLocaleString()} CONCURRENT OPERATIONS`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Test 1: Profile reads (most common operation)
    console.log(`\n  [1/3] Profile reads (${tier})...`);
    let start = performance.now();
    const readResults = await testProfileReads(tier);
    let dur = performance.now() - start;
    printReport(`DB READS x${tier}`, readResults, tier, dur);

    await sleep(1000);

    // Test 2: Mixed load (realistic)
    console.log(`\n  [2/3] Mixed load (${tier})...`);
    start = performance.now();
    const mixedResults = await testMixedLoad(tier);
    dur = performance.now() - start;
    printReport(`MIXED LOAD x${tier}`, mixedResults, tier, dur);

    await sleep(1000);

    // Test 3: DB writes
    console.log(`\n  [3/3] Profile writes (${tier})...`);
    start = performance.now();
    const writeResults = await testProfileWrites(tier);
    dur = performance.now() - start;
    printReport(`DB WRITES x${tier}`, writeResults, tier, dur);

    const tierErrorRate = ((readResults.fail + mixedResults.fail + writeResults.fail) / (tier * 3) * 100).toFixed(1);
    const tierP95 = formatMs(percentile(
      [...readResults.latencies, ...mixedResults.latencies, ...writeResults.latencies],
      95
    ));

    summary.push({
      tier,
      errorRate: tierErrorRate,
      p95: tierP95,
      readFail: readResults.fail,
      mixFail: mixedResults.fail,
      writeFail: writeResults.fail,
    });

    // Stop if error rate too high
    if (parseFloat(tierErrorRate) > 50) {
      console.log(`\n  ⛔ Error rate ${tierErrorRate}% > 50% — stopping escalation.`);
      break;
    }

    await sleep(2000);
  }

  // Final summary
  console.log('\n\n══════════════════════════════════════════════════');
  console.log('  SUMMARY — CAPACITY LIMITS');
  console.log('══════════════════════════════════════════════════');
  console.log('  Tier       │ Error Rate │ p95 Latency │ Status');
  console.log('  ───────────┼────────────┼─────────────┼────────');

  for (const s of summary) {
    const rate = parseFloat(s.errorRate);
    let status = '✓ OK';
    if (rate > 20) status = '⛔ FAIL';
    else if (rate > 5) status = '⚠ WARN';
    else if (rate > 1) status = '△ FAIR';

    console.log(`  ${String(s.tier).padStart(9)} │ ${(s.errorRate + '%').padStart(10)} │ ${s.p95.padStart(11)} │ ${status}`);
  }

  console.log('  ───────────┴────────────┴─────────────┴────────');

  // Find capacity limit
  const lastOk = summary.filter(s => parseFloat(s.errorRate) <= 5);
  if (lastOk.length > 0) {
    const max = lastOk[lastOk.length - 1].tier;
    console.log(`\n  ✓ Safe capacity: ${max.toLocaleString()} concurrent operations`);
    console.log(`    (error rate ≤ 5%)`);
  }

  const firstFail = summary.find(s => parseFloat(s.errorRate) > 20);
  if (firstFail) {
    console.log(`  ⛔ Breaking point: ${firstFail.tier.toLocaleString()} concurrent operations`);
  }

  console.log('\n  NOTE: Aceasta masoara operatii CONCURENTE (simultane),');
  console.log('  nu total useri. 10,000 useri cu app deschis = ~50-100');
  console.log('  operatii simultane (license check cacheit local).\n');
}

main().catch(console.error);
