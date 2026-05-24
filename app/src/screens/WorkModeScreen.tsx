import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';

interface Props { onBack: () => void; }

export default function WorkModeScreen({ onBack }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <TouchableOpacity onPress={onBack} style={[s.backBtn, { paddingTop: insets.top + 8 }]} activeOpacity={0.6}>
        <Text style={[s.backText, { color: colors.accent }]}>{'‹ Setări'}</Text>
      </TouchableOpacity>

      <View style={s.center}>
        <Text style={s.lockIcon}>{'🔒'}</Text>
        <Text style={[s.title, { color: colors.text }]}>MOD DE LUCRU</Text>
        <View style={[s.badge, { backgroundColor: colors.accent }]}>
          <Text style={s.badgeText}>COMING SOON</Text>
        </View>
        <Text style={[s.description, { color: colors.textDim }]}>
          Costuri fixe (rate, asigurare, telefon) vor fi incluse automat în calculul profitului.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { paddingHorizontal: 16, paddingBottom: 8 },
  backText: { fontSize: 17 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  lockIcon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  badge: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 20 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  description: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
