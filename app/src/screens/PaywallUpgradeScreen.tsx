import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import type { ThemeColors } from '../constants/theme';
import { PLAN_PRICES_RON } from '../constants/config';
import { FOUNDING_MEMBER } from '../constants/config';
import { FONT, SIZE, RADIUS } from '../constants/typography';

type PlanChoice = 'pro_monthly' | 'pro_annual' | 'pro_lifetime';

interface Props { onClose: () => void; onActivateCode: () => void; }

export default function PaywallUpgradeScreen({ onClose, onActivateCode }: Props) {
  const { colors, fontsLoaded } = useTheme();
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
      {/* Aurora blobs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ position:'absolute', top:-80, left:-60, width:260, height:260, borderRadius:300, backgroundColor:colors.aurora1 }} />
        <View style={{ position:'absolute', top:120, right:-80, width:220, height:220, borderRadius:300, backgroundColor:colors.aurora2 }} />
        <View style={{ position:'absolute', bottom:100, left:40, width:180, height:180, borderRadius:300, backgroundColor:colors.aurora3 }} />
      </View>

      <TouchableOpacity onPress={onClose} style={[s.closeBtn, { paddingTop: insets.top + 8 }]} activeOpacity={0.6}>
        <Text style={[s.closeText, { color: colors.cyan }]}>{'‹ Înapoi'}</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={[s.title, { color: colors.text, fontFamily: fontsLoaded ? FONT.display : FONT.system }]}>Upgrade la PRO</Text>
        <Text style={[s.subtitle, { color: colors.textMuted, fontFamily: fontsLoaded ? FONT.body : FONT.system }]}>Alege planul potrivit pentru tine</Text>

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
          fontsLoaded={fontsLoaded}
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
          fontsLoaded={fontsLoaded}
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
          fontsLoaded={fontsLoaded}
        />

        <View style={[s.foundingBox, { borderColor: '#E8B27A40', backgroundColor: '#E8B27A10' }]}>
          <Text style={[s.foundingTitle, { color: '#E8B27A', fontFamily: fontsLoaded ? FONT.display : FONT.system }]}>{'⭐'} Founding Member</Text>
          <Text style={[s.foundingDesc, { color: colors.textMuted, fontFamily: fontsLoaded ? FONT.mono : FONT.systemMono }]}>
            Primii {FOUNDING_MEMBER.LIMIT} utilizatori: Anual {FOUNDING_MEMBER.PRO_ANNUAL} RON · Lifetime {FOUNDING_MEMBER.PRO_LIFETIME} RON
          </Text>
        </View>

        <TouchableOpacity onPress={handlePurchase} activeOpacity={0.7}>
          <LinearGradient
            colors={colors.gradButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[s.cta, { borderRadius: RADIUS.md }]}
          >
            <Text style={[s.ctaText, { fontFamily: fontsLoaded ? FONT.display : FONT.system }]}>
              Cumpără {labelMap[selected]} — {priceMap[selected]} RON{periodMap[selected]}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={onActivateCode} activeOpacity={0.7}
          style={[s.codeBtn, { borderColor: colors.border }]}>
          <Text style={[s.codeBtnText, { color: colors.text, fontFamily: fontsLoaded ? FONT.body : FONT.system }]}>Am deja un cod de activare</Text>
        </TouchableOpacity>

        <Text style={[s.disclaimer, { color: colors.textFaint, fontFamily: fontsLoaded ? FONT.mono : FONT.systemMono }]}>
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
  fontsLoaded: boolean;
}

function PlanCard({ title, price, period, recommended, features, selected, onSelect, colors, fontsLoaded }: PlanCardProps) {
  return (
    <TouchableOpacity onPress={onSelect} activeOpacity={0.7}
      style={[s.card, {
        borderColor: selected ? colors.cyan : colors.border,
        backgroundColor: colors.bgCard,
        borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
      }]}>
      {recommended && (
        <LinearGradient
          colors={colors.gradPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.badge}
        >
          <Text style={[s.badgeText, { fontFamily: fontsLoaded ? FONT.monoMd : FONT.systemMono }]}>RECOMANDAT</Text>
        </LinearGradient>
      )}
      <View style={s.cardHeader}>
        <Text style={[s.cardTitle, { color: colors.text, fontFamily: fontsLoaded ? FONT.display : FONT.system }]}>{title}</Text>
        <Text style={[s.cardPrice, { color: colors.cyan, fontFamily: fontsLoaded ? FONT.monoBold : FONT.systemMono }]}>
          {price} RON<Text style={[s.cardPriceUnit, { color: colors.textMuted }]}>{period}</Text>
        </Text>
      </View>
      {features.map((f, i) => (
        <View key={i} style={s.featureRow}>
          <Text style={[s.featureIcon, { color: f.enabled ? colors.go : colors.stop }]}>{f.icon}</Text>
          <Text style={[s.featureText, { color: f.enabled ? colors.text : colors.textFaint, fontFamily: fontsLoaded ? FONT.body : FONT.system }]}>{f.text}</Text>
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
  title:        { fontSize: SIZE['2xl'], fontWeight: '700', marginBottom: 6 },
  subtitle:     { fontSize: 14, marginBottom: 24 },
  card:         { borderRadius: RADIUS.md, padding: 16, marginBottom: 14, position: 'relative' },
  badge:        { position: 'absolute', top: -10, right: 16, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.sm },
  badgeText:    { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  cardTitle:    { fontSize: 20, fontWeight: '700' },
  cardPrice:    { fontSize: 20, fontWeight: '700' },
  cardPriceUnit:{ fontSize: 12, fontWeight: '500' },
  featureRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  featureIcon:  { fontSize: 14, fontWeight: '700', marginRight: 8, width: 16 },
  featureText:  { flex: 1, fontSize: 14 },
  foundingBox:  { borderWidth: 1, borderRadius: RADIUS.md, padding: 14, marginBottom: 12, alignItems: 'center' },
  foundingTitle:{ fontSize: 14, fontWeight: '700', marginBottom: 4 },
  foundingDesc: { fontSize: 12, textAlign: 'center' },
  cta:          { marginTop: 16, paddingVertical: 16, alignItems: 'center' },
  ctaText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
  codeBtn:      { marginTop: 10, paddingVertical: 14, borderRadius: RADIUS.sm, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed' },
  codeBtnText:  { fontSize: 15, fontWeight: '500' },
  disclaimer:   { fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 16 },
});
