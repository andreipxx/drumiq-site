// DRUMIQ v1.0.0 — Plan Screen
// Shows current plan + upgrade options with feature comparison

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { getLicenseState } from '../services/licenseManager';
import { PLAN_PRICES_RON } from '../constants/config';
import type { PlanTier } from '../types';

interface Props {
  onOpenUpgrade: () => void;
  onOpenLicense: () => void;
}

interface PlanCard {
  id: PlanTier;
  name: string;
  price: string;
  priceLabel: string;
  color: 'go' | 'think';
  recommended?: boolean;
  features: { text: string; enabled: boolean }[];
}

const PLAN_CARDS: PlanCard[] = [
  {
    id: 'trial',
    name: 'TRIAL',
    price: 'GRATUIT',
    priceLabel: '100 curse · 7 zile',
    color: 'think',
    features: [
      { text: 'Bulina verdict ($/?/X)', enabled: true },
      { text: '1 filtru personalizat (lei/km)', enabled: true },
      { text: 'Tracker câștiguri', enabled: true },
      { text: 'Calcul Google trafic real', enabled: false },
      { text: 'Card detaliat overlay', enabled: false },
      { text: 'Toate 4 filtre + setări Pro', enabled: false },
    ],
  },
  {
    id: 'pro',
    name: 'PRO',
    price: `${PLAN_PRICES_RON.pro_monthly} RON`,
    priceLabel: '/lună',
    color: 'go',
    recommended: true,
    features: [
      { text: 'TOT din Trial', enabled: true },
      { text: 'Calcul Google trafic real', enabled: true },
      { text: 'Card detaliat overlay', enabled: true },
      { text: 'Toate 4 filtrele personalizabile', enabled: true },
      { text: 'Rază pickup max (2-40 km)', enabled: true },
      { text: 'Rating pasager minim', enabled: true },
      { text: `Anual: ${PLAN_PRICES_RON.pro_annual} RON · Lifetime: ${PLAN_PRICES_RON.pro_lifetime} RON`, enabled: true },
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
        const isCurrent = p.id === currentPlan;
        const accentColor = p.color === 'go' ? colors.go : colors.think;
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

            <View style={s.cardHeader}>
              <Text style={[s.cardName, { color: accentColor }]}>{p.name}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.cardPrice, { color: colors.text }]}>
                  {p.price}
                  {p.priceLabel.startsWith('/') && (
                    <Text style={[s.cardPriceUnit, { color: colors.textMuted }]}>{p.priceLabel}</Text>
                  )}
                </Text>
                {!p.priceLabel.startsWith('/') && (
                  <Text style={[s.cardSub, { color: colors.textMuted }]}>{p.priceLabel}</Text>
                )}
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

            {(isCurrent || (currentPlan === 'root' && p.id === 'pro')) ? (
              <View style={[s.currentBadge, { borderColor: colors.go }]}>
                <Text style={[s.currentTxt, { color: colors.go }]}>
                  {currentPlan === 'root' ? '✓ ACCES ROOT COMPLET' : '✓ PLANUL TĂU ACTUAL'}
                </Text>
              </View>
            ) : p.id !== 'trial' ? (
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
  cardPriceUnit: { fontSize: 10, fontWeight: '500' },
  cardSub: { fontSize: 9, fontFamily: 'monospace', letterSpacing: 1, marginTop: 2 },

  features: { gap: 6, marginBottom: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureCheck: { fontSize: 14, fontWeight: '700', width: 14 },
  featureTxt: { fontSize: 12, flex: 1 },

  cardBtn: { padding: 12, borderRadius: 8, alignItems: 'center' },
  cardBtnTxt: { color: '#000', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },

  currentBadge: { padding: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center', backgroundColor: 'transparent' },
  currentTxt: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },

  codeBtn: { padding: 14, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginTop: 8 },
  codeBtnTxt: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  footer: { fontSize: 9, textAlign: 'center', marginTop: 16, fontFamily: 'monospace', lineHeight: 14 },
});
