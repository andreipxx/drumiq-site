// DRUMIQ v2.0.0 — Plan & Facturare Screen (Aurora × Racing × Cyber)

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import AuroraBg from '../components/AuroraBg';
import { getLicenseState } from '../services/licenseManager';
import { PLAN_PRICES_RON, FOUNDING_MEMBER, REFERRAL_TIERS } from '../constants/config';
import type { PlanTier } from '../types';
import { FONT, SIZE, RADIUS } from '../constants/typography';

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
    price: 'Gratuit',
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
  const { colors, fontsLoaded: ff } = useTheme();
  const [currentPlan, setCurrentPlan] = useState<PlanTier | null>(null);

  useEffect(() => {
    (async () => {
      const lic = await getLicenseState();
      if (lic.license) setCurrentPlan(lic.license.plan);
    })();
  }, []);

  return (
    <View style={[st.root, { backgroundColor: colors.bg }]}>
      <AuroraBg />

      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={[st.title, { fontFamily: ff ? FONT.displayXB : FONT.system }]}>
          <Text style={{ color: colors.text }}>Plan & </Text>
          <Text style={{ color: colors.cyan }}>facturare</Text>
        </Text>
        <Text style={[st.sub, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
          // alege ce ți se potrivește
        </Text>

        {PLAN_CARDS.map((p) => {
          const isCurrent = p.planTier === currentPlan;
          const isRoot = currentPlan === 'root';
          const accentColor = p.color === 'go' ? colors.green : p.color === 'accent' ? colors.violet : colors.amber;
          const isTrial = p.id === 'trial';
          const isProLunar = p.id === 'pro_monthly';
          const isProAnual = p.id === 'pro_annual';

          return (
            <View
              key={p.id}
              style={[
                st.card,
                {
                  backgroundColor: colors.bgCard,
                  borderColor: isCurrent ? colors.green
                    : p.recommended ? colors.pink
                    : colors.border,
                  borderWidth: (p.recommended || isCurrent) ? 1.5 : 1,
                  shadowColor: isCurrent ? colors.green : p.recommended ? colors.pink : 'transparent',
                  shadowOpacity: (p.recommended || isCurrent) ? 0.25 : 0,
                  shadowRadius: 16,
                  elevation: (p.recommended || isCurrent) ? 8 : 0,
                },
              ]}
            >
              {/* Recommended / badge */}
              {(p.recommended || p.badge) && (
                <View style={st.recBadgeWrap}>
                  <LinearGradient
                    colors={p.recommended ? colors.gradPrimary : [accentColor, accentColor]}
                    start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                    style={st.recBadge}
                  >
                    <Text style={[st.recTxt, { fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
                      {p.recommended ? '★ RECOMANDAT' : p.badge}
                    </Text>
                  </LinearGradient>
                </View>
              )}

              {/* Header */}
              <View style={st.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[st.cardName, {
                    color: isTrial ? colors.amber : accentColor,
                    fontFamily: ff ? FONT.displayXB : FONT.system,
                  }]}>
                    {p.name}
                  </Text>
                  {isProLunar && (
                    <Text style={[st.cardMeta, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
                      cel mai popular
                    </Text>
                  )}
                  {isProAnual && (
                    <Text style={[st.cardMeta, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
                      economisești {PLAN_PRICES_RON.pro_monthly * 12 - FOUNDING_MEMBER.PRO_ANNUAL}/an
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {p.strikePrice && (
                    <Text style={[st.strikePrice, { color: colors.textFaint, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
                      {p.strikePrice}
                    </Text>
                  )}
                  <Text style={[st.cardPrice, { color: colors.text, fontFamily: ff ? FONT.displayXB : FONT.system }]}>
                    {p.price}
                  </Text>
                  <Text style={[st.cardPriceSub, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
                    {p.priceLabel}
                  </Text>
                </View>
              </View>

              {/* Features */}
              <View style={st.features}>
                {p.features.map((f, i) => (
                  <View key={i} style={st.featureRow}>
                    <View style={[st.featureCheck, {
                      backgroundColor: f.enabled ? `${colors.green}33` : colors.bgInput,
                    }]}>
                      <Text style={[st.featureCheckTxt, {
                        color: f.enabled ? colors.green : colors.textFaint,
                        fontFamily: ff ? FONT.monoBold : FONT.systemMono,
                      }]}>
                        {f.enabled ? '✓' : '×'}
                      </Text>
                    </View>
                    <Text style={[st.featureTxt, {
                      color: f.enabled ? colors.text : colors.textFaint,
                      fontFamily: ff ? FONT.body : FONT.system,
                      opacity: f.enabled ? 1 : 0.5,
                    }]}>
                      {f.text}
                    </Text>
                  </View>
                ))}
              </View>

              {/* CTA */}
              {(isRoot && p.planTier === 'pro') ? (
                <View style={[st.currentPill, { backgroundColor: `${colors.green}26`, borderColor: `${colors.green}66` }]}>
                  <Text style={[st.currentPillTxt, { color: colors.green, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
                    ✓ ACCES ROOT COMPLET
                  </Text>
                </View>
              ) : (isCurrent && p.planTier !== 'trial') ? (
                <View style={[st.currentPill, { backgroundColor: `${colors.green}26`, borderColor: `${colors.green}66` }]}>
                  <Text style={[st.currentPillTxt, { color: colors.green, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
                    ✓ Planul tău actual
                  </Text>
                </View>
              ) : p.planTier !== 'trial' ? (
                <TouchableOpacity onPress={onOpenUpgrade} activeOpacity={0.8}>
                  <LinearGradient
                    colors={colors.gradButton}
                    start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                    style={st.ctaBtn}
                  >
                    <Text style={[st.ctaBtnTxt, { fontFamily: ff ? FONT.display : FONT.system }]}>
                      {p.recommended ? '▶▶ Trece la anual' : `CUMPĂRĂ ${p.name}`}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}

        {/* Referral box */}
        <View style={[st.referralBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[st.referralTitle, { color: colors.cyan, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
            INVITĂ PRIETENI · PLĂTEȘTI MAI PUȚIN
          </Text>
          <Text style={[st.referralDesc, { color: colors.textMuted, fontFamily: ff ? FONT.body : FONT.system }]}>
            Discount permanent pe abonament, cât prietenii tăi rămân PRO activi.
          </Text>
          {REFERRAL_TIERS.map((tier, i) => (
            <View key={i} style={[st.referralRow, { borderBottomColor: colors.borderSoft }]}>
              <Text style={[st.referralTierLabel, { color: colors.text, fontFamily: ff ? FONT.bodySB : FONT.system }]}>
                {tier.max === Infinity ? `${tier.min}+` : `${tier.min}–${tier.max}`} prieteni
              </Text>
              <Text style={[st.referralTierValue, { color: colors.green, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
                {tier.discountPct}% off → {Math.round(PLAN_PRICES_RON.pro_monthly * (1 - tier.discountPct / 100))} RON/lună
              </Text>
            </View>
          ))}
          <View style={[st.comingSoonPill, { borderColor: colors.cyan }]}>
            <Text style={[st.comingSoonTxt, { color: colors.cyan, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
              ÎN CURÂND
            </Text>
          </View>
        </View>

        {/* Code activation */}
        <TouchableOpacity
          style={[st.codeBtn, { borderColor: colors.border }]}
          onPress={onOpenLicense}
          activeOpacity={0.7}
        >
          <Text style={[st.codeBtnTxt, { color: colors.text, fontFamily: ff ? FONT.bodySB : FONT.system }]}>
            📋  AM DEJA UN COD DE ACTIVARE
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={[st.footer, { color: colors.textFaint, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
          {currentPlan === 'root'
            ? 'Ai acces ROOT complet. Toate funcțiile sunt deblocate.'
            : `Toate planurile pot fi anulate oricând.\nPlățile sunt procesate prin Stripe.`}
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },


  // Title
  title: { fontSize: SIZE.xl, letterSpacing: -0.5, marginTop: 4 },
  sub: { fontSize: SIZE.sm, letterSpacing: 1.5, marginTop: 4, marginBottom: 16 },

  // Plan card
  card: {
    borderRadius: RADIUS['2xl'], padding: 20, marginBottom: 14,
    position: 'relative', overflow: 'hidden',
  },

  // Recommended badge
  recBadgeWrap: { position: 'absolute', top: 14, right: 14, zIndex: 5 },
  recBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill, shadowColor: '#ec4899', shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
  recTxt: { fontSize: 9, color: '#fff', letterSpacing: 1, textTransform: 'uppercase' },

  // Header
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  cardName: { fontSize: 24, letterSpacing: -0.5, lineHeight: 28, marginBottom: 4 },
  cardMeta: { fontSize: SIZE.sm, letterSpacing: 1, textTransform: 'uppercase' },
  cardPrice: { fontSize: 32, letterSpacing: -1, lineHeight: 36 },
  strikePrice: { fontSize: 11, textDecorationLine: 'line-through' as const, marginBottom: 2 },
  cardPriceSub: { fontSize: SIZE.sm, letterSpacing: 0.5, marginTop: 4 },

  // Features
  features: { gap: 8, marginBottom: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureCheck: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  featureCheckTxt: { fontSize: 10 },
  featureTxt: { fontSize: SIZE.base, flex: 1 },

  // CTA buttons
  currentPill: { padding: 12, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center' },
  currentPillTxt: { fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },
  ctaBtn: { padding: 12, borderRadius: RADIUS.md, alignItems: 'center', shadowColor: '#7c3aed', shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  ctaBtnTxt: { color: '#fff', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' },

  // Referral
  referralBox: { padding: 16, borderRadius: RADIUS['2xl'], borderWidth: 1, marginBottom: 12, marginTop: 4 },
  referralTitle: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  referralDesc: { fontSize: 12, marginBottom: 10, lineHeight: 18 },
  referralRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1 },
  referralTierLabel: { fontSize: 12 },
  referralTierValue: { fontSize: 12, letterSpacing: 2 },
  comingSoonPill: { padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginTop: 10 },
  comingSoonTxt: { fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' },

  // Code button
  codeBtn: { padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginTop: 8 },
  codeBtnTxt: { fontSize: 12, letterSpacing: 0.5 },

  // Footer
  footer: { fontSize: 9, textAlign: 'center', marginTop: 16, lineHeight: 14, letterSpacing: 2 },
});
