# REFERRAL SYSTEM — DEPLOY READY

Cand Andrei zice GO, ruleaza acesti pasi IN ORDINE.

## 1. Migrare SQL (Supabase Dashboard)

Deschide Supabase SQL Editor si ruleaza:
```
Fisier: supabase/migrations/20260524_referral_system.sql
```
Creeaza 3 tabele: `referral_codes`, `referrals`, `founding_members` cu RLS.

## 2. Deploy Edge Functions (CLI)

```bash
cd D:\Exercitiu instalare\DrumIQ\app

# Deploy toate 3 functiile referral
npx supabase functions deploy generate-referral-code --project-ref <PROJECT_REF>
npx supabase functions deploy calculate-referral-discount --project-ref <PROJECT_REF>
npx supabase functions deploy stripe-webhook --project-ref <PROJECT_REF>
```

Secrets necesare (setate o singura data):
```bash
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
npx supabase secrets set STRIPE_SECRET_KEY=sk_xxx
npx supabase secrets set LICENSE_PEPPER=<pepper_din_config>
```

## 3. Cod App — Reactivare butoane

### PlanScreen.tsx
- Inlocuieste `comingSoonBadge` cu butonul `TRIMITE INVITATIE` original
- Adauga inapoi: `import { getOrCreateReferralCode } from '../services/referralService'`
- Adauga `useCallback, Share` in imports
- Restaureaza `refCode` state + `handleInvite` callback

### ProfilScreen.tsx
- Inlocuieste `comingSoonBadge` cu cele 2 butoane: `TRIMITE INVITATIE` + `SHARE COD`
- Adauga inapoi: `Share` in RN imports, `getOrCreateReferralCode` in referralService import
- Restaureaza `handleShareReferral` + `handleCopyCode` callbacks

### Signup/Login flow
- Adauga camp `Introdu cod prieten (optional)` in signup
- Trimite codul ca metadata in Stripe checkout: `metadata.referral_code`

## 4. EAS Update (NU Build)

```bash
npx eas update --branch preview --message "Referral system LIVE"
```

## Fisiere existente (toate GATA)

| Fisier | Status |
|--------|--------|
| `supabase/migrations/20260524_referral_system.sql` | READY |
| `supabase/functions/generate-referral-code/index.ts` | READY |
| `supabase/functions/calculate-referral-discount/index.ts` | READY |
| `supabase/functions/stripe-webhook/index.ts` | READY |
| `src/services/referralService.ts` | READY (deja apeleaza Edge Functions cu fallback local) |
| `src/constants/config.ts` | READY (REFERRAL_TIERS definite) |

## Flux complet

1. User A se inregistreaza → primeste cod REF-XXX-XXX (Edge Function)
2. User A trimite cod la prieten (WhatsApp Share)
3. User B la signup introduce codul → metadata Stripe
4. Stripe webhook creeaza `referrals` record: A→B, status=active
5. La renewal (invoice.paid), calculeaza discount pt A bazat pe referrals activi
6. Daca B anuleaza → status=expired → discount A scade
