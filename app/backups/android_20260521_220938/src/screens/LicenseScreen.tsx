// DRUMIQ v1.0.0 — License Screen (Login)
// Dark theme with animated mascot + brutalist code input + activation flow

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { activateCode } from '../services/licenseManager';
import { isValidFormat } from '../constants/licenses';
import { APP_VERSION } from '../constants/config';
import AppMascot from '../components/AppMascot';
interface Props { onActivated: () => void; }

export default function LicenseScreen({ onActivated }: Props) {
  const { colors } = useTheme();
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    if (!key.trim()) return;
    setLoading(true);
    try {
      await activateCode(key);
      onActivated();
    } catch (e: any) {
      Alert.alert('Eroare activare', e?.message || 'Cod invalid.');
    } finally {
      setLoading(false);
    }
  };

  const canActivate = isValidFormat(key) && !loading;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Mascot */}
          <View style={s.mascotWrap}>
            <AppMascot size={130} color={colors.accent} glowing />
          </View>

          {/* Brand */}
          <Text style={[s.brand, { color: colors.text }]}>
            DRUM<Text style={{ color: colors.accent }}>IQ</Text>
          </Text>
          <Text style={[s.tagline, { color: colors.textMuted }]}>
            ROMÂNIA · RIDESHARE INTEL
          </Text>

          {/* Description */}
          <Text style={[s.desc, { color: colors.textMuted }]}>
            Calculează profitabilitatea{'\n'}
            <Text style={{ color: colors.text, fontWeight: '700' }}>fiecărei curse Bolt</Text>, în timp real.
          </Text>

          {/* Code input */}
          <Text style={[s.inputLabel, { color: colors.accent }]}>COD LICENȚĂ</Text>
          <View style={[s.inputWrap, { borderColor: colors.borderAccent }]}>
            {/* Corner brackets */}
            <View style={[s.cornerTL, { borderColor: colors.accent }]} />
            <View style={[s.cornerTR, { borderColor: colors.accent }]} />
            <View style={[s.cornerBL, { borderColor: colors.accent }]} />
            <View style={[s.cornerBR, { borderColor: colors.accent }]} />

            <TextInput
              value={key}
              onChangeText={(t) => setKey(t.toUpperCase().replace(/\s/g, ''))}
              placeholder="DPT-TRIAL-2026"
              placeholderTextColor={colors.textDim}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
              maxLength={25}
              style={[s.input, { color: colors.text }]}
              selectionColor={colors.accent}
            />
          </View>

          <Text style={[s.hint, { color: colors.textDim }]}>
            0 (cifră) ≠ O (literă)  ·  case-insensitive
          </Text>

          {/* Activate button */}
          <TouchableOpacity
            onPress={handleActivate}
            disabled={!canActivate}
            activeOpacity={0.85}
            style={[
              s.btn,
              {
                backgroundColor: canActivate ? colors.accent : colors.surfaceAlt,
                opacity: canActivate ? 1 : 0.5,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={[s.btnTxt, { color: canActivate ? '#000' : colors.textDim }]}>
                ACTIVEAZĂ ▸
              </Text>
            )}
          </TouchableOpacity>

          {/* Fineprint */}
          <Text style={[s.fineprint, { color: colors.textDim }]}>
            Codul activează planul respectiv (TRIAL = 7 zile/100 curse).{'\n'}
            La activare se sincronizează ora cu un server.
          </Text>

          {/* Version */}
          <Text style={[s.version, { color: colors.textDim }]}>
            v{APP_VERSION} · GO PAMPA S.R.L.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },

  mascotWrap: { alignItems: 'center', marginBottom: 12 },

  brand: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  desc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },

  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 8,
  },
  inputWrap: {
    position: 'relative',
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cornerTL: { position: 'absolute', top: -2, left: -2, width: 16, height: 16, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { position: 'absolute', bottom: -2, left: -2, width: 16, height: 16, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderBottomWidth: 2, borderRightWidth: 2 },

  input: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
  },

  hint: {
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 16,
  },

  btn: {
    paddingVertical: 18,
    borderRadius: 6,
    alignItems: 'center',
  },
  btnTxt: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 4,
  },

  fineprint: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 14,
  },

  version: {
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
    marginTop: 24,
    letterSpacing: 1,
  },
});
