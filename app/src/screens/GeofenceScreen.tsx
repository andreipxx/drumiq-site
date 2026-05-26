import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { checkCityEligibility, getEligibleCityNames, type GeofenceResult } from '../services/geofence';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FONT, SIZE, RADIUS } from '../constants/typography';

const WAITING_LIST_KEY = '@drumiq_waiting_list_v1';

interface Props {
  onAllowed: (city: string) => void;
}

export default function GeofenceScreen({ onAllowed }: Props) {
  const { colors, fontsLoaded } = useTheme();
  const [checking, setChecking] = useState(true);
  const [result, setResult] = useState<GeofenceResult | null>(null);
  const [waitEmail, setWaitEmail] = useState('');
  const [waitCity, setWaitCity] = useState('');
  const [waitSaved, setWaitSaved] = useState(false);

  const doCheck = async () => {
    setChecking(true);
    setResult(null);
    try {
      const r = await checkCityEligibility();
      setResult(r);
      if (r.allowed) {
        onAllowed(r.city);
      }
    } catch {
      setResult({ allowed: false, reason: 'permission_denied' });
    }
    setChecking(false);
  };

  useEffect(() => { doCheck(); }, []);

  const handleSaveWaiting = async () => {
    if (!waitEmail.trim() || !waitCity.trim()) {
      Alert.alert('Completează', 'Introdu email-ul și orașul tău.');
      return;
    }
    const entry = { email: waitEmail.trim(), city: waitCity.trim(), date: new Date().toISOString() };
    // TODO: Send signups to backend (e.g. Supabase waiting_list table)
    await AsyncStorage.setItem(WAITING_LIST_KEY, JSON.stringify(entry));
    setWaitSaved(true);
  };

  // ═══ AURORA BLOBS ═══
  const AuroraBlobs = () => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ position: 'absolute', top: -80, left: -60, width: 260, height: 260, borderRadius: 300, backgroundColor: colors.aurora1 }} />
      <View style={{ position: 'absolute', top: 120, right: -80, width: 220, height: 220, borderRadius: 300, backgroundColor: colors.aurora2 }} />
      <View style={{ position: 'absolute', bottom: 100, left: 40, width: 180, height: 180, borderRadius: 300, backgroundColor: colors.aurora3 }} />
    </View>
  );

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <AuroraBlobs />
        <View style={[s.root, { backgroundColor: 'transparent' }]}>
          <Text style={[s.checkIcon, { color: colors.cyan }]}>{'📍'}</Text>
          <Text style={[s.title, { color: colors.text, fontFamily: fontsLoaded ? FONT.display : FONT.system }]}>Se verifică locația</Text>
          <Text style={[s.desc, { color: colors.textMuted, fontFamily: fontsLoaded ? FONT.body : FONT.system }]}>
            DRUMIQ verifică dacă te afli în Baia Mare, România.
          </Text>
          <ActivityIndicator size="large" color={colors.cyan} style={{ marginTop: 24 }} />
          <Text style={[s.hint, { color: colors.textMuted, fontFamily: fontsLoaded ? FONT.body : FONT.system }]}>
            Momentan aplicația poate fi folosită doar în:{'\n'}Baia Mare, România
          </Text>
          <Text style={[s.footer, { color: colors.textMuted, fontFamily: fontsLoaded ? FONT.body : FONT.system }]}>
            Pentru folosire este necesară permisiunea de locație.
          </Text>
        </View>
      </View>
    );
  }

  if (result && !result.allowed) {
    const detectedCity = result.reason === 'outside_area' ? result.detectedCity : 'Necunoscut';
    const eligible = getEligibleCityNames();

    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <AuroraBlobs />
        <View style={[s.root, { backgroundColor: 'transparent' }]}>
          <Text style={[s.lockIcon]}>{'🔒'}</Text>
          <Text style={[s.title, { color: colors.text, fontFamily: fontsLoaded ? FONT.display : FONT.system }]}>DRUMIQ nu este disponibil aici</Text>
          <Text style={[s.desc, { color: colors.textMuted, fontFamily: fontsLoaded ? FONT.body : FONT.system }]}>
            Aplicația este disponibilă momentan doar în Baia Mare.
          </Text>

          <View style={[s.detectedCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[s.detectedLabel, { color: colors.textMuted, fontFamily: fontsLoaded ? FONT.body : FONT.system }]}>Oraș detectat:</Text>
            <Text style={[s.detectedValue, { color: colors.text, fontFamily: fontsLoaded ? FONT.display : FONT.system }]}>{detectedCity}</Text>
          </View>

          <Text style={[s.eligibleTitle, { color: colors.textMuted, fontFamily: fontsLoaded ? FONT.body : FONT.system }]}>
            Momentan aplicația poate fi folosită doar în:
          </Text>
          {eligible.map(city => (
            <Text key={city} style={[s.eligibleCity, { color: colors.go, fontFamily: fontsLoaded ? FONT.bodySB : FONT.system }]}>
              {city}
            </Text>
          ))}

          <TouchableOpacity onPress={doCheck} activeOpacity={0.7} style={{ width: '100%', marginTop: 24 }}>
            <LinearGradient colors={colors.gradButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.retryBtn, { borderRadius: RADIUS.md, marginTop: 0 }]}>
              <Text style={[s.retryBtnText, { fontFamily: fontsLoaded ? FONT.display : FONT.system }]}>VERIFICĂ DIN NOU LOCAȚIA</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Waiting list */}
          <View style={[s.waitSection, { borderColor: colors.border }]}>
            <Text style={[s.waitTitle, { color: colors.text, fontFamily: fontsLoaded ? FONT.bodySB : FONT.system }]}>
              Anunță-mă când DRUMIQ ajunge în orașul meu
            </Text>
            {waitSaved ? (
              <Text style={[s.waitSaved, { color: colors.go, fontFamily: fontsLoaded ? FONT.bodySB : FONT.system }]}>
                Te-am înscris! Te vom anunța.
              </Text>
            ) : (
              <>
                <TextInput
                  value={waitEmail}
                  onChangeText={setWaitEmail}
                  placeholder="Email"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[s.waitInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bgInput, fontFamily: fontsLoaded ? FONT.body : FONT.system }]}
                />
                <TextInput
                  value={waitCity}
                  onChangeText={setWaitCity}
                  placeholder="Orașul tău"
                  placeholderTextColor={colors.textMuted}
                  style={[s.waitInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bgInput, fontFamily: fontsLoaded ? FONT.body : FONT.system }]}
                />
                <TouchableOpacity
                  style={[s.waitBtn, { borderColor: colors.cyan }]}
                  onPress={handleSaveWaiting}
                  activeOpacity={0.7}
                >
                  <Text style={[s.waitBtnText, { color: colors.cyan, fontFamily: fontsLoaded ? FONT.bodySB : FONT.system }]}>TRIMITE</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={[s.footer, { color: colors.textMuted, fontFamily: fontsLoaded ? FONT.body : FONT.system }]}>
            Pentru folosire este necesară permisiunea de locație.
          </Text>
        </View>
      </View>
    );
  }

  return null;
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  checkIcon: { fontSize: 48, marginBottom: 16 },
  lockIcon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  desc: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 24, lineHeight: 18 },
  footer: { fontSize: 11, textAlign: 'center', marginTop: 32 },
  detectedCard: {
    padding: 14, borderRadius: RADIUS.md, borderWidth: 1, width: '100%', marginTop: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  detectedLabel: { fontSize: 12 },
  detectedValue: { fontSize: 14, fontWeight: '700' },
  eligibleTitle: { fontSize: 12, marginTop: 20, marginBottom: 8 },
  eligibleCity: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  retryBtn: {
    paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, width: '100%', alignItems: 'center',
  },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  waitSection: {
    borderTopWidth: 1, marginTop: 28, paddingTop: 20, width: '100%', alignItems: 'center',
  },
  waitTitle: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  waitSaved: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  waitInput: {
    width: '100%', borderWidth: 1, borderRadius: RADIUS.sm, padding: 12, marginBottom: 10, fontSize: 14,
  },
  waitBtn: {
    borderWidth: 1.5, borderRadius: RADIUS.sm, paddingVertical: 12, paddingHorizontal: 24,
  },
  waitBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
});
