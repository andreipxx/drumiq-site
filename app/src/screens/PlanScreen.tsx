// DRUMIQ v1.0.0 — Plan Screen
// Shows current plan + upgrade options with feature comparison

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { getLicenseState } from '../services/licenseManager';
import { PLAN_PRICES_RON, FOUNDING_MEMBER, REFERRAL_TIERS } from '../constants/config';
import type { PlanTier } from '../types';

interface Props {
  onOpenUpgrade: () => void;
  onOpenLicense: () => void;
}

interface PlanCard {
  id: string;
  planTier: PlanTier;
  name: string;
  price: string;
  priceLabel: string;
  strikePrice?: string;
  badge?: string;
  color: 'go' | 'think' | 'accent';
  recommended?: boolean;
  features: { text: string; enabled: boolean }[];
}

const PLAN_CARDS: PlanCard[] = [
  {
    id: 'trial',
    planTier: 'trial',
    name: 'TRIAL',
    price: 'GRATUIT',
    priceLabel: '100 curse · 7 zile',
    color: 'think',
    features: [
      { text: 'Bulina verdict GO/THINK/STOP', enabled: true },
      { text: '1 filtru personalizat (lei/km)', enabled: true },
      { text: 'Tracker câștiguri', enabled: true },
      { text: 'Calcul Google trafic real', enabled: false },
      { text: 'Overlay draggable detaliat', enabled: false },
      { text: 'Toate 6 filtre + setări Pro', enabled: false },
    ],
  },
  {
    id: 'pro_monthly',
    planTier: 'pro',
    name: 'PRO LUNAR',
    price: `${PLAN_PRICES_RON.pro_monthly} RON`,
    priceLabel: `/lună · prima lună ${PLAN_PRICES_RON.first_month} RON`,
    color: 'go',
    features: [
      { text: 'TOT din Trial', enabled: true },
      { text: 'Calcul Google trafic real', enabled: true },
      { text: 'Overlay draggable detaliat', enabled: true },
      { text: 'Toate 6 filtrele personalizabile', enabled: true },
      { text: 'Post-trip sync + tips tracking', enabled: true },
      { text: 'Anulezi oricând', enabled: true },
    ],
  },
  {
    id: 'pro_annual',
    planTier: 'pro',
    name: 'PRO ANUAL',
    price: `${FOUNDING_MEMBER.PRO_ANNUAL} RON`,
    strikePrice: `${PLAN_PRICES_RON.pro_annual} RON`,
    priceLabel: '/an · 16.6 RON / lună',
    badge: '★ FOUNDING MEMBER',
    color: 'go',
    recommended: true,
    features: [
      { text: 'TOT din PRO Lunar', enabled: true },
      { text: 'Preț blocat 12 luni', enabled: true },
      { text: 'Post-trip sync + tips tracking', enabled: true },
      { text: 'Suport prioritar WhatsApp', enabled: true },
      { text: `Economisești ${PLAN_PRICES_RON.pro_monthly * 12 - FOUNDING_MEMBER.PRO_ANNUAL} RON/an`, enabled: true },
    ],
  },
  {
    id: 'pro_lifetime',
    planTier: 'pro',
    name: 'PRO LIFETIME',
    price: `${FOUNDING_MEMBER.PRO_LIFETIME} RON`,
    strikePrice: `${PLAN_PRICES_RON.pro_lifetime} RON`,
    priceLabel: 'o singură dată · pe viață',
    badge: '★ FOUNDING MEMBER',
    color: 'accent',
    features: [
      { text: 'TOT din PRO, pentru totdeauna', enabled: true },
      { text: 'Zero abonamente lunare', enabled: true },
      { text: 'Toate update-urile viitoare incluse', enabled: true },
      { text: 'Founding Member badge în app', enabled: true },
      { text: 'Acces prioritar la features noi', enabled: true },
    ],
  },
];

export default function PlanScreen({ onOpenUpgrade, onOpenLicense }: Props) {
  const { colors } = useTheme();
  const [currentPlan, setCurrentPlan] = useState<PlanTier | null>(null);

  useEffect(() => {
    (async () => {
      const lic = await getLicenseState();
      if (lic.license) setCurrentPlan(lic.license.plan);
    })();
  }, []);

  return (
    <ScrollView
      style={[s.root, { backgroundColor: colors.bg }]}
      contentContainerStyle={s.content}
    >
      <Text style={[s.title, { color: colors.text }]}>PLAN<Text style={{ color: colors.accent }}> & FACTURARE</Text></Text>
      <Text style={[s.sub, { color: colors.textMuted }]}>alege ce ți se potrivește</Text>

      {PLAN_CARDS.map((p) => {
        const isCurrent = p.planTier === currentPlan;
        const isRoot = currentPlan === 'root';
        const accentColor = p.color === 'go' ? colors.go : p.color === 'accent' ? colors.accent : colors.think;
        return (
          <View
            key={p.id}
            style={[
              s.card,
              {
                backgroundColor: colors.surface,
                borderColor: accentColor,
                borderWidth: p.recommended ? 2 : 1,
                shadowColor: p.recommended ? accentColor : 'transparent',
                shadowOpacity: p.recommended ? 0.4 : 0,
                shadowRadius: 12,
                elevation: p.recommended ? 8 : 0,
              },
            ]}
          >
            {p.recommended && (
              <View style={[s.recBadge, { backgroundColor: accentColor }]}>
                <Text style={s.recTxt}>★ RECOMANDAT</Text>
              </View>
            )}
            {!p.recommended && p.badge && (
              <View style={[s.recBadge, { backgroundColor: accentColor }]}>
                <Text style={s.recTxt}>{p.badge}</Text>
              </View>
            )}

            <View style={s.cardHeader}>
              <Text style={[s.cardName, { color: accentColor }]}>{p.name}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                {p.strikePrice && (
                  <Text style={[s.strikePrice, { color: colors.textDim }]}>{p.strikePrice}</Text>
                )}
                <Text style={[s.cardPrice, { color: colors.text }]}>
                  {p.price}
                </Text>
                <Text style={[s.cardSub, { color: colors.textMuted }]}>{p.priceLabel}</Text>
              </View>
            </View>

            <View style={s.features}>
              {p.features.map((f, i) => (
                <View key={i} style={s.featureRow}>
                  <Text style={[s.featureCheck, { color: f.enabled ? colors.go : colors.textDim }]}>
                    {f.enabled ? '✓' : '✗'}
                  </Text>
                  <Text style={[s.featureTxt, { color: f.enabled ? colors.textMuted : colors.textDim, opacity: f.enabled ? 1 : 0.5 }]}>
                    {f.text}
                  </Text>
                </View>
              ))}
            </View>

            {(isRoot && p.planTier === 'pro') ? (
              <View style={[s.currentBadge, { borderColor: colors.go }]}>
                <Text style={[s.currentTxt, { color: colors.go }]}>✓ ACCES ROOT COMPLET</Text>
              </View>
            ) : (isCurrent && p.planTier !== 'trial') ? (
              <View style={[s.currentBadge, { borderColor: colors.go }]}>
                <Text style={[s.currentTxt, { color: colors.go }]}>✓ PLANUL TĂU ACTUAL</Text>
              </View>
            ) : p.planTier !== 'trial' ? (
              <TouchableOpacity
                style={[s.cardBtn, { backgroundColor: accentColor }]}
                onPress={onOpenUpgrade}
                activeOpacity={0.8}
              >
                <Text style={s.cardBtnTxt}>CUMPĂRĂ {p.name}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        );
      })}

      <View style={[s.referralBox, { backgroundColor: colors.surface, borderColor: colors.accent }]}>
        <Text style={[s.referralTitle, { color: colors.accent }]}>INVITĂ PRIETENI · PLĂTEȘTI MAI PUȚIN</Text>
        <Text style={[s.referralDesc, { color: colors.textMuted }]}>
          Discount permanent pe abonament, cât prietenii tăi rămân PRO activi.
        </Text>
        {REFERRAL_TIERS.map((tier, i) => (
          <View key={i} style={s.referralRow}>
            <Text style={[s.referralTierLabel, { color: colors.text }]}>
              {tier.max === Infinity ? `${tier.min}+` : `${tier.min}–${tier.max}`} prieteni
            </Text>
            <Text style={[s.referralTierValue, { color: colors.go }]}>
              {tier.discountPct}% off → {Math.round(PLAN_PRICES_RON.pro_monthly * (1 - tier.discountPct / 100))} RON/lună
            </Text>
          </View>
        ))}
        <TouchableOpacity
          style={[s.referralBtn, { backgroundColor: colors.accent }]}
          onPress={() => {
            const msg = encodeURIComponent(
              'Salut! Folosesc DRUMIQ — îți arată instant dacă o cursă Bolt merită. ' +
              'Descarcă de pe drumiq.ro și hai să câștigăm amândoi! 🚗💰'
            );
            Linking.openURL(`https://wa.me/?text=${msg}`);
          }}
          activeOpacity={0.8}
        >
          <Text style={s.referralBtnTxt}>INVITĂ PE WHATSAPP</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[s.codeBtn, { borderColor: colors.border }]}
        onPress={onOpenLicense}
        activeOpacity={0.7}
      >
        <Text style={[s.codeBtnTxt, { color: colors.text }]}>📋  AM DEJA UN COD DE ACTIVARE</Text>
      </TouchableOpacity>

      <Text style={[s.footer, { color: colors.textDim }]}>
        {currentPlan === 'root'
          ? 'Ai acces ROOT complet. Toate funcțiile sunt deblocate.'
          : `Toate planurile pot fi anulate oricând.\nPlățile sunt procesate prin Stripe.`}
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  title: { fontSize: 22, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  sub: { fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, marginTop: 2, marginBottom: 16 },

  card: { padding: 14, borderRadius: 12, marginBottom: 12, position: 'relative' },
  recBadge: { position: 'absolute', top: -10, right: 14, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4 },
  recTxt: { fontSize: 9, fontWeight: '900', color: '#000', letterSpacing: 2 },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardName: { fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  cardPrice: { fontSize: 18, fontWeight: '800', fontFamily: 'monospace' },
  strikePrice: { fontSize: 11, fontFamily: 'monospace', textDecorationLine: 'line-through' as const, marginBottom: 2 },
  cardSub: { fontSize: 9, fontFamily: 'monospace', letterSpacing: 1, marginTop: 2 },

  features: { gap: 6, marginBottom: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureCheck: { fontSize: 14, fontWeight: '700', width: 14 },
  featureTxt: { fontSize: 12, flex: 1 },

  cardBtn: { padding: 12, borderRadius: 8, alignItems: 'center' },
  cardBtnTxt: { color: '#000', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },

  currentBadge: { padding: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center', backgroundColor: 'transparent' },
  currentTxt: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },

  referralBox: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12, marginTop: 4 },
  referralTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 6 },
  referralDesc: { fontSize: 11, marginBottom: 10, lineHeight: 16 },
  referralRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  referralTierLabel: { fontSize: 12, fontWeight: '600' },
  referralTierValue: { fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },
  referralBtn: { padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  referralBtnTxt: { color: '#000', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },

  codeBtn: { padding: 14, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginTop: 8 },
  codeBtnTxt: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  footer: { fontSize: 9, textAlign: 'center', marginTop: 16, fontFamily: 'monospace', lineHeight: 14 },
});
