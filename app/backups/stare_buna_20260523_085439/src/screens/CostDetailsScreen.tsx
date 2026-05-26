import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import type { ProfitAnalysis } from '../services/profitCalculator';

interface Props {
  analysis: ProfitAnalysis;
  pickupAddress?: string;
  destinationAddress?: string;
  onBack: () => void;
}

export default function CostDetailsScreen({ analysis, pickupAddress, destinationAddress, onBack }: Props) {
  const { colors } = useTheme();

  return (
    <ScrollView style={[s.root, { backgroundColor: colors.bg }]} contentContainerStyle={s.content}>
      <TouchableOpacity onPress={onBack} activeOpacity={0.6}>
        <Text style={[s.back, { color: colors.accent }]}>{'‹ Înapoi'}</Text>
      </TouchableOpacity>

      <Text style={[s.title, { color: colors.text }]}>Detalii costuri</Text>

      <Text style={[s.sectionLabel, { color: colors.textMuted }]}>ADRESE BOLT</Text>
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <DetailRow label="Preluare" value={pickupAddress || 'Nedetectată'} colors={colors} />
        <DetailRow label="Destinație" value={destinationAddress || 'Nedetectată'} colors={colors} last />
      </View>

      <Text style={[s.sectionLabel, { color: colors.textMuted }]}>COSTURI</Text>
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <DetailRow label="Cost vehicul (combustibil + uzura)" value={`${analysis.vehicleCost.toFixed(2)} lei`} colors={colors} last />
      </View>

      <Text style={[s.sectionLabel, { color: colors.textMuted }]}>PROFIT</Text>
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <DetailRow label="Profit estimat" value={`${analysis.profit.toFixed(2)} lei`} valueColor="#00FF7F" colors={colors} />
        <DetailRow label="Profit/km" value={`${analysis.profitPerKm.toFixed(2)} lei/km`} colors={colors} />
        <DetailRow label="Profit/oră" value={`${analysis.profitPerHour.toFixed(2)} lei/oră`} colors={colors} last />
      </View>

      <Text style={[s.sectionLabel, { color: colors.textMuted }]}>DISTANȚĂ ȘI TIMP</Text>
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <DetailRow label="Km preluare" value={`${analysis.pickupKm.toFixed(1)} km`} colors={colors} />
        <DetailRow label="Km cursă (estimat)" value={`${analysis.tripKmEstimate.toFixed(1)} km`} colors={colors} />
        <DetailRow label="Km total" value={`${analysis.totalKm.toFixed(1)} km`} colors={colors} />
        <DetailRow label="Timp total" value={`${analysis.totalMinutes} min`} colors={colors} last />
      </View>
    </ScrollView>
  );
}

function DetailRow({ label, value, valueColor, colors, last }: {
  label: string; value: string; valueColor?: string; colors: any; last?: boolean;
}) {
  return (
    <View style={[s.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <Text style={[s.rowLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[s.rowValue, { color: valueColor || colors.text }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  back: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 20 },
  sectionLabel: {
    fontSize: 11, letterSpacing: 1.5, fontWeight: '700', marginTop: 16, marginBottom: 8,
  },
  card: { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  rowLabel: { fontSize: 13, flex: 1 },
  rowValue: { fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
});
