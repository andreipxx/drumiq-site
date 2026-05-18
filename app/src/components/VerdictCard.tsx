import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import type { ProfitVerdict } from '../types';
import { VERDICT_DISPLAY } from '../types';
import type { ProfitAnalysis } from '../services/profitCalculator';

const VERDICT_BG: Record<ProfitVerdict, string> = {
  go: '#00FF7F10',
  think: '#FFB80010',
  stop: '#FF336610',
};

const VERDICT_LABEL: Record<ProfitVerdict, string> = {
  go: 'Cursă profitabilă',
  think: 'Atenție — analizează',
  stop: 'Cursă neprofitabilă',
};

interface Props {
  analysis: ProfitAnalysis;
  grossEarnings: number;
  rideType?: string;
  onDetails?: () => void;
}

export default function VerdictCard({ analysis, grossEarnings, rideType, onDetails }: Props) {
  const { colors } = useTheme();
  const v = analysis.verdict;
  const display = VERDICT_DISPLAY[v];
  const bgColor = VERDICT_BG[v];
  const borderColor = display.color + '40';

  return (
    <View style={[s.card, { backgroundColor: bgColor, borderColor }]}>
      <View style={s.header}>
        <Text style={[s.subtitle, { color: colors.textMuted }]}>
          BOLT{rideType ? ` · ${rideType}` : ''}
        </Text>
        <Text style={[s.earnings, { color: colors.text }]}>
          Primești {grossEarnings.toFixed(2)} lei
        </Text>
      </View>

      <View style={s.verdictCenter}>
        <View style={[s.verdictCircle, { backgroundColor: display.color + '20', borderColor: display.color, shadowColor: display.color }]}>
          <Text style={[s.verdictSymbol, { color: display.color }]}>{display.symbol}</Text>
        </View>
        <Text style={[s.verdictLabel, { color: display.color }]}>{VERDICT_LABEL[v]}</Text>
      </View>

      <View style={s.statsGrid}>
        <StatCell label="Profit" value={`${analysis.profit.toFixed(2)} lei`} color={display.color} />
        <StatCell label="Lei/km" value={analysis.profitPerKm.toFixed(2)} color={display.color} />
        <StatCell label="Lei/oră" value={analysis.profitPerHour.toFixed(2)} color={display.color} />
        <StatCell label="Km total" value={analysis.totalKm.toFixed(1)} color={colors.textMuted} />
        <StatCell label="Timp" value={`${analysis.totalMinutes} min`} color={colors.textMuted} />
        <StatCell label="Comision Bolt" value={`${analysis.boltCommissionAmount.toFixed(2)} lei`} color={colors.textMuted} />
      </View>

      {onDetails && (
        <TouchableOpacity onPress={onDetails} activeOpacity={0.6} style={s.detailsLink}>
          <Text style={[s.detailsText, { color: colors.accent }]}>{'Detalii costuri ›'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={s.statCell}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 1, borderRadius: 14, padding: 16, marginHorizontal: 16, marginVertical: 8,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  subtitle: { fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  earnings: { fontSize: 14, fontWeight: '700' },
  verdictCenter: { alignItems: 'center', marginBottom: 16 },
  verdictCircle: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.6, shadowRadius: 16, elevation: 8,
  },
  verdictSymbol: { fontSize: 28, fontWeight: '900' },
  verdictLabel: { fontSize: 14, fontWeight: '700', marginTop: 8 },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  statCell: {
    width: '31%', alignItems: 'center', paddingVertical: 8,
  },
  statValue: { fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 2 },
  detailsLink: { alignItems: 'center', marginTop: 12 },
  detailsText: { fontSize: 13, fontWeight: '600' },
});
