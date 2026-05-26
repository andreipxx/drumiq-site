import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { activateCode } from '../services/licenseManager';
import type { License } from '../types';

interface Props {
  onActivated: (license: License) => void;
}

// Formatează cheia pe măsură ce utilizatorul tastează: DPR-XXXX-XXXX-XXXX
function formatKey(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const parts = [
    clean.substring(0, 3),
    clean.substring(3, 7),
    clean.substring(7, 11),
    clean.substring(11, 15),
  ].filter(Boolean);
  return parts.join('-');
}

export default function LoginScreen({ onActivated }: Props) {
  const { colors, isDark } = useTheme();
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (text: string) => {
    setKey(formatKey(text));
  };

  const handleActivate = async () => {
    setLoading(true);
    try {
      const license = await activateCode(key);
      onActivated(license);
    } catch (e: any) {
      Alert.alert('Eroare activare', e?.message || 'Cheie invalidă.');
    } finally {
      setLoading(false);
    }
  };

  const canActivate = key.replace(/-/g, '').length === 15 && !loading;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <Text style={[s.brand, { color: colors.text }]}>DRUMIQ</Text>
            <Text style={[s.tagline, { color: colors.textTertiary }]}>
              Analiza profitabilitate curse Bolt/Uber
            </Text>
          </View>

          <View style={s.form}>
            <Text style={[s.inputLabel, { color: colors.textSecondary }]}>
              Cheie licență
            </Text>

            <TextInput
              value={key}
              onChangeText={handleChange}
              placeholder="DPX-XXXX-XXXX-XXXX"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
              maxLength={18} // 15 chars + 3 dashes
              style={[
                s.input,
                {
                  color: colors.text,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              selectionColor={colors.accent}
              keyboardType={Platform.OS === 'ios' ? 'ascii-capable' : 'visible-password'}
            />

            <View style={[s.hint, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={s.hintIcon}>💡</Text>
              <Text style={[s.hintText, { color: colors.textSecondary }]}>
                Atenție: cheia conține cifra{' '}
                <Text style={[s.hintBold, { color: colors.text }]}>0 (zero)</Text>, nu litera{' '}
                <Text style={[s.hintBold, { color: colors.text }]}>O</Text>.
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleActivate}
              disabled={!canActivate}
              activeOpacity={0.7}
              style={[
                s.btn,
                {
                  backgroundColor: canActivate ? colors.accent : colors.border,
                  opacity: canActivate ? 1 : 0.5,
                },
              ]}
            >
              <Text style={s.btnText}>
                {loading ? 'Se activează...' : 'Activează licența'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.trialLink} activeOpacity={0.6}>
              <Text style={[s.trialText, { color: colors.accent }]}>
                Nu am cheie — încerc gratuit 1 zi
              </Text>
            </TouchableOpacity>
          </View>

          <View style={s.footer}>
            <Text style={[s.footerText, { color: colors.textTertiary }]}>
              Prin activare accepți Termenii & Condițiile
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1 },
  scroll:      { flexGrow: 1, paddingHorizontal: 20, paddingTop: 40, paddingBottom: 40 },
  header:      { alignItems: 'center', marginBottom: 48 },
  brand:       { fontSize: 32, fontWeight: '800', letterSpacing: 0.5 },
  tagline:     { fontSize: 14, marginTop: 8, textAlign: 'center' },
  form:        { flex: 1 },
  inputLabel:  { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, paddingLeft: 4 },
  input: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderRadius: 12,
  },
  hint:        { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, marginTop: 12 },
  hintIcon:    { fontSize: 18, marginRight: 10 },
  hintText:    { flex: 1, fontSize: 14, lineHeight: 20 },
  hintBold:    { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '700', fontSize: 15 },
  btn:         { paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginTop: 28 },
  btnText:     { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
  trialLink:   { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  trialText:   { fontSize: 15, fontWeight: '500' },
  footer:      { alignItems: 'center', paddingTop: 24 },
  footerText:  { fontSize: 12 },
});
