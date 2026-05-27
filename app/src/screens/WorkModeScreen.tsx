import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import AuroraBg from '../components/AuroraBg';
import { LinearGradient } from 'expo-linear-gradient';
import { FONT, SIZE, RADIUS } from '../constants/typography';

interface Props { onBack: () => void; }

export default function WorkModeScreen({ onBack }: Props) {
  const { colors, fontsLoaded } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <AuroraBg />
      <TouchableOpacity onPress={onBack} style={[s.backBtn, { paddingTop: insets.top + 8 }]} activeOpacity={0.6}>
        <Text style={[s.backText, { color: colors.cyan }]}>{'‹ Setări'}</Text>
      </TouchableOpacity>

      <View style={s.center}>
        <Text style={s.lockIcon}>{'🔒'}</Text>
        <Text style={[s.title, { color: colors.text, fontFamily: fontsLoaded ? FONT.display : FONT.system }]}>MOD DE LUCRU</Text>
        <LinearGradient colors={colors.gradPrimary} start={{x:0,y:0}} end={{x:1,y:0}} style={[s.badge, { borderRadius: RADIUS.sm }]}>
          <Text style={[s.badgeText, { fontFamily: fontsLoaded ? FONT.monoBold : FONT.systemMono }]}>COMING SOON</Text>
        </LinearGradient>
        <Text style={[s.description, { color: colors.textFaint }]}>
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
  title: { fontSize: SIZE.xl, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  badge: { borderRadius: RADIUS.sm, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 20 },
  badgeText: { color: '#fff', fontSize: SIZE.sm, fontWeight: '800', letterSpacing: 1.5 },
  description: { fontSize: SIZE.base, textAlign: 'center', lineHeight: 20 },
});
