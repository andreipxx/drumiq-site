// DRUMIQ — License code types and format validation
// CRIT-1 FIX: All license codes moved server-side (Supabase license_codes table).
// Only format validation remains client-side for UX feedback before server call.

/**
 * Client-side format check — fast UX feedback before hitting server.
 * Pattern: DP + [T/P/R] + dash + 4-20 alphanumeric chars with dashes
 * Only DPT- (trial), DPP- (pro), DPR- (root) are valid prefixes.
 */
export function isValidFormat(rawKey: string): boolean {
  const k = rawKey.trim().toUpperCase();
  return /^DP[TPR]-[A-Z0-9-]{4,20}$/.test(k);
}
