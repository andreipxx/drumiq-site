import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import type { ExpirationReason } from '../services/licenseManager';
import { TRIAL } from '../constants/config';

interface Props {
  reason: ExpirationReason;
  ridesUsed?: number;
  onActivateNew: () => void;
}

const REASON_TEXT: Record<ExpirationReason, { title: string; body: string }> = {
  time_expired:           { title: '⏰ Plan expirat', body: 'Perioada de utilizare a expirat. Pentru a continua, introdu un cod nou de activare.' },
  rides_expired:          { title: '🚗 Trial epuizat', body: 'Ai folosit toate cursele incluse în perioada de testare. Pentru a continua, introdu un cod Pro.' },
  rollback:               { title: '🕒 Detectare manipulare oră', body: 'Ceasul telefonului a fost dat înapoi. Pentru a debloca aplicația, sincronizează ora cu rețeaua și introdu un cod nou.' },
  unverified_grace_lapsed:{ title: '🌐 Sincronizare oră eșuată', body: 'Aplicația nu a putut verifica ora cu un server timp de 6 ore. Conectează-te la internet și activează un cod nou pentru a continua.' },
  no_license:             { title: '🔒 Necesită activare', body: 'Pentru a folosi aplicația, introdu un cod de activare valid.' },
};

export default function PaywallScreen({ reason, ridesUsed, onActivateNew }: Props) {
  const { colors } = useTheme();
  const t = REASON_TEXT[reason] || REASON_TEXT.no_license;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <View style={[s.banner, { backgroundColor: colors.stop + '20', borderColor: colors.stop }]}>
        <Text style={[s.title, { color: colors.stop }]}>{t.title}</Text>
        <Text style={[s.body, { color: colors.text }]}>{t.body}</Text>
        {reason === 'rides_expired' && ridesUsed != null && (
          <Text style={[s.stats, { color: colors.textMuted }]}>Curse efectuate: {ridesUsed}/{TRIAL.RIDES}</Text>
        )}
      </View>

      <TouchableOpacity onPress={onActivateNew} activeOpacity={0.7}
        style={[s.cta, { backgroundColor: colors.accent }]}>
        <Text style={s.ctaText}>Activează cod nou</Text>
      </TouchableOpacity>

      <Text style={[s.support, { color: colors.textDim }]}>
        Pentru asistență contactează GO PAMPA S.R.L., Baia Mare.
      </Text>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  banner:    { borderWidth: 2, borderRadius: 16, padding: 24, marginBottom: 28 },
  title:     { fontSize: 24, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  body:      { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  stats:     { fontSize: 14, textAlign: 'center', marginTop: 14, fontWeight: '600' },
  cta:       { paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  ctaText:   { color: '#fff', fontSize: 17, fontWeight: '700' },
  support:   { fontSize: 12, textAlign: 'center', marginTop: 24, lineHeight: 18 },
});
