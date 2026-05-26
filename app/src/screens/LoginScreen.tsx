import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { activateCode, activateTrial } from '../services/licenseManager';
import { FONT, SIZE, RADIUS } from '../constants/typography';
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
  const { colors, fontsLoaded: ff } = useTheme();
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

  const handleTrial = async () => {
    setLoading(true);
    try {
      const license = await activateTrial();
      onActivated(license);
    } catch (e: any) {
      Alert.alert('Eroare trial', e?.message || 'Nu s-a putut activa perioada de probă.');
    } finally {
      setLoading(false);
    }
  };

  const canActivate = key.replace(/-/g, '').length === 15 && !loading;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      {/* Aurora blobs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ position:'absolute', top:-80, left:-60, width:260, height:260, borderRadius:300, backgroundColor:colors.aurora1 }} />
        <View style={{ position:'absolute', top:120, right:-80, width:220, height:220, borderRadius:300, backgroundColor:colors.aurora2 }} />
        <View style={{ position:'absolute', bottom:100, left:40, width:180, height:180, borderRadius:300, backgroundColor:colors.aurora3 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <Text style={[s.brand, { color: colors.text, fontFamily: ff ? FONT.displayXB : FONT.system }]}>DRUMIQ</Text>
            <Text style={[s.tagline, { color: colors.textMuted }]}>
              Analiza profitabilitate curse Bolt/Uber
            </Text>
          </View>

          <View style={s.form}>
            <Text style={[s.inputLabel, { color: colors.textSoft, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
              Cheie licență
            </Text>

            <TextInput
              value={key}
              onChangeText={handleChange}
              placeholder="DPX-XXXX-XXXX-XXXX"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
              maxLength={18} // 15 chars + 3 dashes
              style={[
                s.input,
                {
                  color: colors.text,
                  backgroundColor: colors.bgCard,
                  borderColor: colors.border,
                  fontFamily: ff ? FONT.mono : FONT.systemMono,
                },
              ]}
              selectionColor={colors.cyan}
              keyboardType={Platform.OS === 'ios' ? 'ascii-capable' : 'visible-password'}
            />

            <View style={[s.hint, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={s.hintIcon}>💡</Text>
              <Text style={[s.hintText, { color: colors.textSoft }]}>
                Atenție: cheia conține cifra{' '}
                <Text style={[s.hintBold, { color: colors.text, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>0 (zero)</Text>, nu litera{' '}
                <Text style={[s.hintBold, { color: colors.text, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>O</Text>.
              </Text>
            </View>

            {canActivate ? (
              <TouchableOpacity onPress={handleActivate} activeOpacity={0.7}>
                <LinearGradient colors={colors.gradButton} start={{x:0,y:0}} end={{x:1,y:0}} style={[s.btn, { borderRadius: RADIUS.md }]}>
                  <Text style={s.btnText}>
                    {loading ? 'Se activează...' : 'Activează licența'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={[s.btn, { backgroundColor: colors.border, opacity: 0.5, borderRadius: RADIUS.md }]}>
                <Text style={s.btnText}>
                  {loading ? 'Se activează...' : 'Activează licența'}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={s.trialLink}
              activeOpacity={0.6}
              onPress={handleTrial}
              disabled={loading}
            >
              <Text style={[s.trialText, { color: colors.cyan, opacity: loading ? 0.5 : 1 }]}>
                {loading ? 'Se activează...' : 'Nu am cheie — încerc gratuit 1 zi'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={s.footer}>
            <Text style={[s.footerText, { color: colors.textMuted }]}>
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
  brand:       { fontSize: SIZE['3xl'], fontWeight: '800', letterSpacing: 0.5 },
  tagline:     { fontSize: 14, marginTop: 8, textAlign: 'center' },
  form:        { flex: 1 },
  inputLabel:  { fontSize: SIZE.base, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, paddingLeft: 4 },
  input: {
    fontSize: SIZE.xl,
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderRadius: RADIUS.lg,
  },
  hint:        { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: RADIUS.sm, borderWidth: StyleSheet.hairlineWidth, marginTop: 12 },
  hintIcon:    { fontSize: 18, marginRight: 10 },
  hintText:    { flex: 1, fontSize: 14, lineHeight: 20 },
  hintBold:    { fontWeight: '700', fontSize: 15 },
  btn:         { paddingVertical: 18, alignItems: 'center', marginTop: 28 },
  btnText:     { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
  trialLink:   { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  trialText:   { fontSize: 15, fontWeight: '500' },
  footer:      { alignItems: 'center', paddingTop: 24 },
  footerText:  { fontSize: 12 },
});
