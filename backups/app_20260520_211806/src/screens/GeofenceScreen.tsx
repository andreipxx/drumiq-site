import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { checkCityEligibility, getEligibleCityNames, type GeofenceResult } from '../services/geofence';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WAITING_LIST_KEY = '@drumiq_waiting_list_v1';

interface Props {
  onAllowed: (city: string) => void;
}

export default function GeofenceScreen({ onAllowed }: Props) {
  const { colors } = useTheme();
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
    await AsyncStorage.setItem(WAITING_LIST_KEY, JSON.stringify(entry));
    setWaitSaved(true);
  };

  if (checking) {
    return (
      <View style={[s.root, { backgroundColor: colors.bg }]}>
        <Text style={[s.checkIcon, { color: colors.accent }]}>{'📍'}</Text>
        <Text style={[s.title, { color: colors.text }]}>Se verifică locația</Text>
        <Text style={[s.desc, { color: colors.textMuted }]}>
          DRUMIQ verifică dacă te afli în Baia Mare, România.
        </Text>
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 24 }} />
        <Text style={[s.hint, { color: colors.textMuted }]}>
          Momentan aplicația poate fi folosită doar în:{'\n'}Baia Mare, România
        </Text>
        <Text style={[s.footer, { color: colors.textMuted }]}>
          Pentru folosire este necesară permisiunea de locație.
        </Text>
      </View>
    );
  }

  if (result && !result.allowed) {
    const detectedCity = result.reason === 'outside_area' ? result.detectedCity : 'Necunoscut';
    const eligible = getEligibleCityNames();

    return (
      <View style={[s.root, { backgroundColor: colors.bg }]}>
        <Text style={[s.lockIcon]}>{'🔒'}</Text>
        <Text style={[s.title, { color: colors.text }]}>DRUMIQ nu este disponibil aici</Text>
        <Text style={[s.desc, { color: colors.textMuted }]}>
          Aplicația este disponibilă momentan doar în Baia Mare.
        </Text>

        <View style={[s.detectedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.detectedLabel, { color: colors.textMuted }]}>Oraș detectat:</Text>
          <Text style={[s.detectedValue, { color: colors.text }]}>{detectedCity}</Text>
        </View>

        <Text style={[s.eligibleTitle, { color: colors.textMuted }]}>
          Momentan aplicația poate fi folosită doar în:
        </Text>
        {eligible.map(city => (
          <Text key={city} style={[s.eligibleCity, { color: '#00FF7F' }]}>
            {city}
          </Text>
        ))}

        <TouchableOpacity
          style={[s.retryBtn, { backgroundColor: colors.accent }]}
          onPress={doCheck}
          activeOpacity={0.7}
        >
          <Text style={s.retryBtnText}>VERIFICĂ DIN NOU LOCAȚIA</Text>
        </TouchableOpacity>

        {/* Waiting list */}
        <View style={[s.waitSection, { borderColor: colors.border }]}>
          <Text style={[s.waitTitle, { color: colors.text }]}>
            Anunță-mă când DRUMIQ ajunge în orașul meu
          </Text>
          {waitSaved ? (
            <Text style={[s.waitSaved, { color: '#00FF7F' }]}>
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
                style={[s.waitInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              />
              <TextInput
                value={waitCity}
                onChangeText={setWaitCity}
                placeholder="Orașul tău"
                placeholderTextColor={colors.textMuted}
                style={[s.waitInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              />
              <TouchableOpacity
                style={[s.waitBtn, { borderColor: colors.accent }]}
                onPress={handleSaveWaiting}
                activeOpacity={0.7}
              >
                <Text style={[s.waitBtnText, { color: colors.accent }]}>TRIMITE</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={[s.footer, { color: colors.textMuted }]}>
          Pentru folosire este necesară permisiunea de locație.
        </Text>
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
    padding: 14, borderRadius: 10, borderWidth: 1, width: '100%', marginTop: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  detectedLabel: { fontSize: 12 },
  detectedValue: { fontSize: 14, fontWeight: '700' },
  eligibleTitle: { fontSize: 12, marginTop: 20, marginBottom: 8 },
  eligibleCity: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  retryBtn: {
    paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, marginTop: 24, width: '100%', alignItems: 'center',
  },
  retryBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  waitSection: {
    borderTopWidth: 1, marginTop: 28, paddingTop: 20, width: '100%', alignItems: 'center',
  },
  waitTitle: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  waitSaved: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  waitInput: {
    width: '100%', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 14,
  },
  waitBtn: {
    borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24,
  },
  waitBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
});
