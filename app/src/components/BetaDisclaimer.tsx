import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export default function BetaDisclaimer() {
  const { colors } = useTheme();
  return (
    <View style={[s.banner, { backgroundColor: colors.thinkBg, borderColor: colors.think }]}>
      <Text style={[s.title, { color: colors.think }]}>{'⚠'} Aplicație în dezvoltare</Text>
      <Text style={[s.text, { color: colors.textMuted }]}>
        Versiunea finală poate varia. Calculele sunt estimative și trebuie verificate înainte de utilizare reală.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    marginHorizontal: 16, marginTop: 8, marginBottom: 4,
    padding: 12, borderRadius: 10, borderWidth: 1,
  },
  title: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  text: { fontSize: 11, lineHeight: 16 },
});
