import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import {
  getProOverrides, setProOverrides, DEFAULT_PRO_OVERRIDES, type ProOverrides,
} from '../services/userSettings';
import DecimalField from '../components/DecimalField';

interface Props { onBack: () => void; }

export default function ProSettingsScreen({ onBack }: Props) {
  const { colors } = useTheme();
  const [o, setO] = useState<ProOverrides | null>(null);

  useEffect(() => { getProOverrides().then(setO); }, []);

  if (!o) return null;

  const handleSave = async () => {
    try {
      await setProOverrides(o);
      Alert.alert('Salvat', 'Setări Pro salvate.');
      onBack();
    } catch (e: any) {
      Alert.alert('Eroare', e?.message);
    }
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.6}>
        <Text style={[s.backText, { color: colors.accent }]}>‹ Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={[s.title, { color: colors.text }]}>Setări Pro</Text>

        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <DecimalField
            label="Rază pickup max"
            hint="Curse cu pickup peste această distanță = REFUZ automat (2-40 km)"
            suffix="km"
            value={o.maxPickupKm}
            onChange={(n) => setO({ ...o, maxPickupKm: n })}
            min={2} max={40}
            colors={colors}
          />
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.divider }} />
          <DecimalField
            label="Rating pasager minim"
            hint="Pasageri sub această evaluare = REFUZ automat (1.0-5.0)"
            suffix="★"
            value={o.minPassengerRating}
            onChange={(n) => setO({ ...o, minPassengerRating: n })}
            min={1.0} max={5.0}
            colors={colors}
          />
        </View>

        <Text style={[s.hint, { color: colors.textTertiary }]}>
          Aceste reguli forțează verdict roșu (refuză) pe overlay, indiferent de profitabilitate.{'\n'}
          Dacă nu vrei să folosești o regulă, lasă rază = 40 km, rating = 1.0.
        </Text>

        <TouchableOpacity onPress={() => setO({ ...DEFAULT_PRO_OVERRIDES })} activeOpacity={0.7}
          style={[s.btnSecondary, { borderColor: colors.border }]}>
          <Text style={[s.btnSecondaryText, { color: colors.text }]}>Resetează la valori implicite</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSave} activeOpacity={0.7}
          style={[s.cta, { backgroundColor: colors.accent }]}>
          <Text style={s.ctaText}>Salvează</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1 },
  backBtn:      { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 8 },
  backText:     { fontSize: 17 },
  scroll:       { padding: 16, paddingBottom: 60 },
  title:        { fontSize: 28, fontWeight: '700', marginBottom: 20 },
  group:        { borderRadius: 12, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  hint:         { fontSize: 12, paddingHorizontal: 4, paddingTop: 16, lineHeight: 17, fontStyle: 'italic' },
  btnSecondary: { marginTop: 16, paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  btnSecondaryText: { fontSize: 14, fontWeight: '500' },
  cta:          { marginTop: 12, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  ctaText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
});
