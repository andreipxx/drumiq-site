import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import AuroraBg from '../components/AuroraBg';
import { FONT, SIZE, RADIUS } from '../constants/typography';
import type { ProfitAnalysis } from '../services/profitCalculator';

interface Props {
  analysis: ProfitAnalysis;
  pickupAddress?: string;
  destinationAddress?: string;
  onBack: () => void;
}

export default function CostDetailsScreen({ analysis, pickupAddress, destinationAddress, onBack }: Props) {
  const { colors, fontsLoaded } = useTheme();

  const monoFont = fontsLoaded ? FONT.mono : FONT.systemMono;
  const monoBoldFont = fontsLoaded ? FONT.monoBold : FONT.systemMono;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AuroraBg />
      <ScrollView style={[s.root, { backgroundColor: 'transparent' }]} contentContainerStyle={s.content}>
      <TouchableOpacity onPress={onBack} activeOpacity={0.6}>
        <Text style={[s.back, { color: colors.cyan }]}>{'‹ Înapoi'}</Text>
      </TouchableOpacity>

      <Text style={[s.title, { color: colors.text, fontFamily: fontsLoaded ? FONT.display : FONT.system }]}>Detalii costuri</Text>

      <Text style={[s.sectionLabel, { color: colors.textMuted, fontFamily: monoFont }]}>ADRESE BOLT</Text>
      <View style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <DetailRow label="Preluare" value={pickupAddress || 'Nedetectată'} colors={colors} monoFont={monoBoldFont} />
        <DetailRow label="Destinație" value={destinationAddress || 'Nedetectată'} colors={colors} monoFont={monoBoldFont} last />
      </View>

      <Text style={[s.sectionLabel, { color: colors.textMuted, fontFamily: monoFont }]}>COSTURI</Text>
      <View style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <DetailRow label="Cost vehicul (combustibil + uzura)" value={`${analysis.vehicleCost.toFixed(2)} lei`} colors={colors} monoFont={monoBoldFont} last />
      </View>

      <Text style={[s.sectionLabel, { color: colors.textMuted, fontFamily: monoFont }]}>PROFIT</Text>
      <View style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <DetailRow label="Profit estimat" value={`${analysis.profit.toFixed(2)} lei`} valueColor={colors.go} colors={colors} monoFont={monoBoldFont} />
        <DetailRow label="Profit/km" value={`${analysis.profitPerKm.toFixed(2)} lei/km`} colors={colors} monoFont={monoBoldFont} />
        <DetailRow label="Profit/oră" value={`${analysis.profitPerHour.toFixed(2)} lei/oră`} colors={colors} monoFont={monoBoldFont} last />
      </View>

      <Text style={[s.sectionLabel, { color: colors.textMuted, fontFamily: monoFont }]}>DISTANȚĂ ȘI TIMP</Text>
      <View style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <DetailRow label="Km preluare" value={`${analysis.pickupKm.toFixed(1)} km`} colors={colors} monoFont={monoBoldFont} />
        <DetailRow label="Km cursă (estimat)" value={`${analysis.tripKmEstimate.toFixed(1)} km`} colors={colors} monoFont={monoBoldFont} />
        <DetailRow label="Km total" value={`${analysis.totalKm.toFixed(1)} km`} colors={colors} monoFont={monoBoldFont} />
        <DetailRow label="Timp total" value={`${analysis.totalMinutes} min`} colors={colors} monoFont={monoBoldFont} last />
      </View>
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value, valueColor, colors, monoFont, last }: {
  label: string; value: string; valueColor?: string; colors: any; monoFont: string; last?: boolean;
}) {
  return (
    <View style={[s.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <Text style={[s.rowLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[s.rowValue, { color: valueColor || colors.text, fontFamily: monoFont }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  back: { fontSize: SIZE.lg, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: SIZE.xl, fontWeight: '800', marginBottom: 20 },
  sectionLabel: {
    fontSize: 11, letterSpacing: 1.5, fontWeight: '700', marginTop: 16, marginBottom: 8,
  },
  card: { borderWidth: 1, borderRadius: RADIUS.md, overflow: 'hidden' },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  rowLabel: { fontSize: SIZE.base, flex: 1 },
  rowValue: { fontSize: SIZE.base, fontWeight: '700' },
});
