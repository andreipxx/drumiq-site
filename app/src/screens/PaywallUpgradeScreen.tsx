import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import type { ThemeColors } from '../constants/theme';
import { PLAN_PRICES_RON } from '../constants/config';
import { FOUNDING_MEMBER } from '../constants/config';

type PlanChoice = 'pro_monthly' | 'pro_annual' | 'pro_lifetime';

interface Props { onClose: () => void; onActivateCode: () => void; }

export default function PaywallUpgradeScreen({ onClose, onActivateCode }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<PlanChoice>('pro_monthly');

  const handlePurchase = async () => {
    const url = `https://drumiq.ro/pricing.html?plan=${selected}`;
    try { await Linking.openURL(url); } catch {}
  };

  const priceMap: Record<PlanChoice, number> = {
    pro_monthly: PLAN_PRICES_RON.pro_monthly,
    pro_annual: FOUNDING_MEMBER.PRO_ANNUAL,
    pro_lifetime: FOUNDING_MEMBER.PRO_LIFETIME,
  };

  const labelMap: Record<PlanChoice, string> = {
    pro_monthly: 'Pro Lunar',
    pro_annual: 'Pro Anual',
    pro_lifetime: 'Pro Lifetime',
  };

  const periodMap: Record<PlanChoice, string> = {
    pro_monthly: '/lună',
    pro_annual: '/an',
    pro_lifetime: ' o dată',
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <TouchableOpacity onPress={onClose} style={[s.closeBtn, { paddingTop: insets.top + 8 }]} activeOpacity={0.6}>
        <Text style={[s.closeText, { color: colors.accent }]}>{'‹ Înapoi'}</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={[s.title, { color: colors.text }]}>Upgrade la PRO</Text>
        <Text style={[s.subtitle, { color: colors.textMuted }]}>Alege planul potrivit pentru tine</Text>

        <PlanCard
          title="Pro Lunar"
          price={PLAN_PRICES_RON.pro_monthly}
          period={`/lună · prima lună ${PLAN_PRICES_RON.first_month} RON`}
          features={[
            { icon: '✓', text: 'Calcul cursă cu trafic real Google', enabled: true },
            { icon: '✓', text: 'Toate 6 filtrele personalizabile', enabled: true },
            { icon: '✓', text: 'Overlay draggable detaliat', enabled: true },
            { icon: '✓', text: 'Post-trip sync + tips tracking', enabled: true },
          ]}
          selected={selected === 'pro_monthly'}
          onSelect={() => setSelected('pro_monthly')}
          colors={colors}
        />

        <PlanCard
          title="Pro Anual"
          price={FOUNDING_MEMBER.PRO_ANNUAL}
          period="/an · ★ Founding Member"
          recommended
          features={[
            { icon: '✓', text: 'TOT din Pro Lunar', enabled: true },
            { icon: '✓', text: `Economisești ${PLAN_PRICES_RON.pro_monthly * 12 - FOUNDING_MEMBER.PRO_ANNUAL} RON/an`, enabled: true },
            { icon: '✓', text: 'Preț blocat pentru totdeauna', enabled: true },
          ]}
          selected={selected === 'pro_annual'}
          onSelect={() => setSelected('pro_annual')}
          colors={colors}
        />

        <PlanCard
          title="Pro Lifetime"
          price={FOUNDING_MEMBER.PRO_LIFETIME}
          period=" · ★ Founding Member"
          features={[
            { icon: '✓', text: 'TOT din Pro, pentru totdeauna', enabled: true },
            { icon: '✓', text: 'Fără reînnoire, zero abonamente', enabled: true },
            { icon: '✓', text: 'Toate update-urile viitoare incluse', enabled: true },
          ]}
          selected={selected === 'pro_lifetime'}
          onSelect={() => setSelected('pro_lifetime')}
          colors={colors}
        />

        <View style={[s.foundingBox, { borderColor: '#E8B27A40', backgroundColor: '#E8B27A10' }]}>
          <Text style={[s.foundingTitle, { color: '#E8B27A' }]}>{'⭐'} Founding Member</Text>
          <Text style={[s.foundingDesc, { color: colors.textMuted }]}>
            Primii {FOUNDING_MEMBER.LIMIT} utilizatori: Anual {FOUNDING_MEMBER.PRO_ANNUAL} RON · Lifetime {FOUNDING_MEMBER.PRO_LIFETIME} RON
          </Text>
        </View>

        <TouchableOpacity onPress={handlePurchase} activeOpacity={0.7}
          style={[s.cta, { backgroundColor: colors.accent }]}>
          <Text style={s.ctaText}>
            Cumpără {labelMap[selected]} — {priceMap[selected]} RON{periodMap[selected]}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onActivateCode} activeOpacity={0.7}
          style={[s.codeBtn, { borderColor: colors.border }]}>
          <Text style={[s.codeBtnText, { color: colors.text }]}>Am deja un cod de activare</Text>
        </TouchableOpacity>

        <Text style={[s.disclaimer, { color: colors.textDim }]}>
          Pentru testing: contactează GO PAMPA S.R.L. pentru un cod gratuit.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

interface PlanCardProps {
  title: string;
  price: number;
  period: string;
  recommended?: boolean;
  features: { icon: string; text: string; enabled: boolean }[];
  selected: boolean;
  onSelect: () => void;
  colors: ThemeColors;
}

function PlanCard({ title, price, period, recommended, features, selected, onSelect, colors }: PlanCardProps) {
  return (
    <TouchableOpacity onPress={onSelect} activeOpacity={0.7}
      style={[s.card, {
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: colors.surface,
        borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
      }]}>
      {recommended && (
        <View style={[s.badge, { backgroundColor: colors.accent }]}>
          <Text style={s.badgeText}>RECOMANDAT</Text>
        </View>
      )}
      <View style={s.cardHeader}>
        <Text style={[s.cardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[s.cardPrice, { color: colors.accent }]}>
          {price} RON<Text style={[s.cardPriceUnit, { color: colors.textMuted }]}>{period}</Text>
        </Text>
      </View>
      {features.map((f, i) => (
        <View key={i} style={s.featureRow}>
          <Text style={[s.featureIcon, { color: f.enabled ? colors.go : colors.stop }]}>{f.icon}</Text>
          <Text style={[s.featureText, { color: f.enabled ? colors.text : colors.textDim }]}>{f.text}</Text>
        </View>
      ))}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1 },
  closeBtn:     { paddingHorizontal: 16, paddingBottom: 8 },
  closeText:    { fontSize: 17 },
  scroll:       { padding: 20, paddingBottom: 40 },
  title:        { fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle:     { fontSize: 14, marginBottom: 24 },
  card:         { borderRadius: 14, padding: 16, marginBottom: 14, position: 'relative' },
  badge:        { position: 'absolute', top: -10, right: 16, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText:    { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  cardTitle:    { fontSize: 20, fontWeight: '700' },
  cardPrice:    { fontSize: 20, fontWeight: '700' },
  cardPriceUnit:{ fontSize: 12, fontWeight: '500' },
  featureRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  featureIcon:  { fontSize: 14, fontWeight: '700', marginRight: 8, width: 16 },
  featureText:  { flex: 1, fontSize: 14 },
  foundingBox:  { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12, alignItems: 'center' },
  foundingTitle:{ fontSize: 14, fontWeight: '700', marginBottom: 4 },
  foundingDesc: { fontSize: 12, textAlign: 'center' },
  cta:          { marginTop: 16, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  ctaText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
  codeBtn:      { marginTop: 10, paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  codeBtnText:  { fontSize: 15, fontWeight: '500' },
  disclaimer:   { fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 16 },
});
