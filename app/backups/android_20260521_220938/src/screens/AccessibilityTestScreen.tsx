import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, AppState, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { Accessibility, type AccessibilityCapture } from '../native/accessibility';
import { parseBoltRide } from '../services/boltParser';
import { analyzeRide } from '../services/profitCalculator';
import { getLicenseState } from '../services/licenseManager';
import { getFuelSettings, type FuelSettings } from '../services/userSettings';
import { loadThresholds } from '../services/filterEngine';
import type { UnifiedThresholds } from '../types';
import { VERDICT_DISPLAY } from '../types';
import { getDpEvents, getDebugStats } from '../services/dpDebug';
import { generateFullExport } from '../services/fullExport';
import { clearAllRides } from '../services/tracker';

interface Props { onBack: () => void; }

export default function AccessibilityTestScreen({ onBack }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [capture, setCapture] = useState<AccessibilityCapture | null>(null);
  const [licInfo, setLicInfo] = useState<{ plan: string; ridesUsed: number; ridesRemaining: number | null; expiresAt: number | null } | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [debugEvents, setDebugEvents] = useState<string[]>([]);
  const [debugStats, setDebugStats] = useState<ReturnType<typeof getDebugStats> | null>(null);

  const refreshStatus = useCallback(async () => {
    setEnabled(await Accessibility.isEnabled());
    const st = await getLicenseState();
    if (st.license) {
      setLicInfo({ plan: st.license.plan, ridesUsed: st.ridesUsed, ridesRemaining: st.ridesRemaining, expiresAt: st.license.expiresAt });
    }
  }, []);

  const refreshCapture = useCallback(async () => {
    const c = await Accessibility.getLastCapture();
    if (c && c.timestamp > 0) setCapture(c);
  }, []);

  const refreshDebug = useCallback(() => {
    setDebugEvents(getDpEvents());
    setDebugStats(getDebugStats());
  }, []);

  useEffect(() => {
    refreshStatus(); refreshCapture(); refreshDebug();
    pollingRef.current = setInterval(() => {
      refreshCapture();
      refreshDebug();
    }, 2000);
    const unsub = Accessibility.addCaptureListener(setCapture);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') { refreshStatus(); refreshCapture(); refreshDebug(); } });
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      unsub();
      sub.remove();
    };
  }, [refreshStatus, refreshCapture, refreshDebug]);

  const [fuel, setFuel] = useState<FuelSettings | null>(null);
  const [thresholds, setThresholdsState] = useState<UnifiedThresholds | null>(null);

  useEffect(() => {
    getFuelSettings().then(setFuel);
    loadThresholds().then(setThresholdsState);
  }, []);

  const parsed = useMemo(() => capture?.text ? parseBoltRide(capture.text) : null, [capture]);
  const analysis = useMemo(() => {
    if (!parsed || !fuel || !licInfo) return null;
    const plan = (licInfo.plan as any) || 'trial';
    return analyzeRide(parsed, { fuel, plan, thresholds: thresholds ?? undefined });
  }, [parsed, fuel, thresholds, licInfo]);

  const handleOpenSettings = async () => { await Accessibility.openSettings(); };

  const [exporting, setExporting] = useState(false);
  const handleFullExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const json = await generateFullExport();
      const result = await Accessibility.writeExportToDownloads(json);
      const mb = (result.sizeBytes / (1024 * 1024)).toFixed(2);
      Alert.alert('Export complet', `Salvat in Downloads:\n${result.path.split('/').pop()}\n\n${mb} MB — ${json.length} caractere`);
    } catch (e: any) {
      Alert.alert('Eroare export', e?.message || 'Export esuat');
    } finally {
      setExporting(false);
    }
  };

  const available = Accessibility.isAvailable();

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <TouchableOpacity onPress={onBack} style={[s.backBtn, { paddingTop: insets.top + 8 }]} activeOpacity={0.6}>
        <Text style={[s.backText, { color: colors.accent }]}>‹ Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={[s.title, { color: colors.text }]}>Accessibility Test</Text>

        {licInfo && (
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.cardLabel, { color: colors.textDim }]}>PLAN ACTIV</Text>
            <Row label="Plan" value={licInfo.plan.toUpperCase()} colors={colors} valueColor={colors.accent} />
            {licInfo.ridesRemaining != null && (
              <Row label="Curse rămase" value={`${licInfo.ridesRemaining} (folosite ${licInfo.ridesUsed})`} colors={colors} />
            )}
            {licInfo.expiresAt != null && (
              <Row label="Expiră" value={new Date(licInfo.expiresAt).toLocaleString('ro-RO')} colors={colors} />
            )}
          </View>
        )}

        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.cardLabel, { color: colors.textDim }]}>STATUS</Text>
          <Row label="Platform" value={Platform.OS} colors={colors} />
          <Row label="Native module" value={available ? 'detected ✓' : 'missing ✗'} colors={colors} valueColor={available ? colors.go : colors.stop} />
          <Row label="Service enabled" value={enabled === null ? '...' : enabled ? 'YES ✓' : 'NO'} colors={colors} valueColor={enabled ? colors.go : colors.stop} />
        </View>

        {!enabled && available && (
          <TouchableOpacity onPress={handleOpenSettings} style={[s.btn, { backgroundColor: colors.accent }]} activeOpacity={0.7}>
            <Text style={s.btnText}>Deschide Settings Accessibility</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => { refreshStatus(); refreshCapture(); }} style={[s.btnSecondary, { borderColor: colors.border }]} activeOpacity={0.7}>
          <Text style={[s.btnSecondaryText, { color: colors.text }]}>Reîmprospătează</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleFullExport}
          style={[s.btn, { backgroundColor: exporting ? colors.border : '#00CC66', marginTop: 16 }]}
          activeOpacity={0.7}
          disabled={exporting}
        >
          <Text style={s.btnText}>{exporting ? 'Se exporta...' : 'EXPORT TOT (JSON)'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'ATENTIE: Sterge toate datele?',
              'Aceasta actiune este ireversibila! Cursele, statisticile si cache-ul vor fi sterse permanent. Esti sigur?',
              [
              { text: 'Anuleaza', style: 'cancel' },
              { text: 'Da, sterge tot', style: 'destructive', onPress: async () => {
                await clearAllRides();
                Alert.alert('Gata', 'Toate datele au fost sterse.');
              }},
            ]);
          }}
          style={[s.btnSecondary, { borderColor: colors.stop, marginTop: 10 }]}
          activeOpacity={0.7}
        >
          <Text style={[s.btnSecondaryText, { color: colors.stop }]}>STERGE TOATE DATELE</Text>
        </TouchableOpacity>

        {analysis && parsed?.screen === 'ride_offer' && (
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors[analysis.verdict], borderWidth: 2, marginTop: 20 }]}>
            <Text style={[s.cardLabel, { color: colors.textDim }]}>ANALIZĂ PROFIT (preview)</Text>
            <Text style={[s.verdictBig, { color: colors[analysis.verdict] }]}>
              {VERDICT_DISPLAY[analysis.verdict].emoji} {VERDICT_DISPLAY[analysis.verdict].label}
            </Text>
            <Row label="Profit/km" value={`${analysis.profitPerKm.toFixed(2)} RON/km`} colors={colors} valueColor={colors[analysis.verdict]} />
            <Row label="Profit total" value={`${analysis.profit.toFixed(2)} RON`} colors={colors} />
            <Row label="Bolt NET" value={`${analysis.netAfterTax.toFixed(2)} RON`} colors={colors} />
            <Row label="Cost mașină" value={`${analysis.vehicleCost.toFixed(2)} RON`} colors={colors} />
            <Row label="Total km est." value={`${analysis.totalKm.toFixed(1)} km`} colors={colors} />
            {analysis.isExternalRide && <Row label="Tip cursă" value="EXTERNĂ (+25%)" colors={colors} valueColor={colors.accent} />}
            {analysis.confidence === 'low' && (
              <Text style={[s.warn, { color: colors.decide }]}>⚠ Date parțiale — pickup km lipsesc, am estimat 1.0 km</Text>
            )}
          </View>
        )}

        {parsed && (
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 20 }]}>
            <Text style={[s.cardLabel, { color: colors.textDim }]}>DATE PARSATE</Text>
            <Row label="Ecran detectat" value={parsed.screen} colors={colors} valueColor={colors.accent} />
            <Row label="Preț NET" value={parsed.grossNet != null ? `${parsed.grossNet} lei` : '—'} colors={colors} />
            <Row label="Pickup km" value={parsed.pickupKm != null ? `${parsed.pickupKm} km` : '—'} colors={colors} />
            <Row label="Pickup min" value={parsed.pickupMin != null ? `${parsed.pickupMin} min` : '—'} colors={colors} />
            <Row label="Pasager" value={parsed.passengerName ?? '—'} colors={colors} />
            <Row label="Rating pasager" value={parsed.passengerRating != null ? `${parsed.passengerRating} ★` : '—'} colors={colors} />
            <Row label="Surge" value={parsed.surgeMultiplier != null ? `${parsed.surgeMultiplier}x` : '—'} colors={colors} />
            <Row label="Plata" value={parsed.paymentMethod ?? '—'} colors={colors} />
            <Row label="În afara razei" value={parsed.outsideRange ? 'DA' : 'NU'} colors={colors} />
            {parsed.pickupAddress && <Row label="Pickup" value={parsed.pickupAddress} colors={colors} />}
            {parsed.destinationAddress && <Row label="Destinație" value={parsed.destinationAddress} colors={colors} />}
          </View>
        )}

        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 20 }]}>
          <Text style={[s.cardLabel, { color: colors.textDim }]}>ULTIMA CAPTURĂ (polling 2s)</Text>
          {capture && capture.timestamp > 0 ? (
            <>
              <Row label="Package" value={capture.package} colors={colors} />
              <Row label="Timestamp" value={new Date(capture.timestamp).toLocaleTimeString()} colors={colors} />
              <View style={[s.captureBox, { borderColor: colors.border }]}>
                <Text style={[s.captureText, { color: colors.text }]} selectable>{capture.text}</Text>
              </View>
            </>
          ) : (
            <Text style={[s.hint, { color: colors.textDim }]}>Deschide Bolt Driver / Waze. Polling activ la 2s.</Text>
          )}
        </View>

        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.cardLabel, { color: colors.textDim }]}>
            {'DEBUG LIVE (' + (debugStats?.total ?? debugEvents.length) + ' total, sesiune: ' + (debugStats?.curSession ?? 0) + ')'}
          </Text>
          {debugEvents.length === 0 ? (
            <Text style={[s.hint, { color: colors.textDim }]}>Nicio activitate. Deschide Bolt si asteapta o oferta.</Text>
          ) : (
            debugEvents.slice(0, 25).map((e, i) => (
              <Text key={i} style={[s.captureText, { color: colors.text, fontSize: 11, paddingVertical: 1 }]}>{e}</Text>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, colors, valueColor }: any) {
  return (
    <View style={s.row}>
      <Text style={[s.rowLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[s.rowValue, { color: valueColor || colors.text }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1 },
  backBtn:          { paddingHorizontal: 16, paddingBottom: 8 },
  backText:         { fontSize: 17 },
  scroll:           { padding: 16, paddingBottom: 60 },
  title:            { fontSize: 28, fontWeight: '700', marginBottom: 20 },
  card:             { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 16, marginTop: 12 },
  cardLabel:        { fontSize: 12, letterSpacing: 0.5, marginBottom: 8 },
  row:              { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 },
  rowLabel:         { fontSize: 14, flexShrink: 0 },
  rowValue:         { fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' },
  verdictBig:       { fontSize: 22, fontWeight: '800', textAlign: 'center', paddingVertical: 12 },
  warn:             { fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  btn:              { marginTop: 20, paddingVertical: 16, borderRadius: 10, alignItems: 'center' },
  btnText:          { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnSecondary:     { marginTop: 10, paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  btnSecondaryText: { fontSize: 15, fontWeight: '500' },
  captureBox:       { marginTop: 10, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, maxHeight: 250 },
  captureText:      { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, lineHeight: 18 },
  hint:             { fontSize: 13, lineHeight: 20, marginTop: 8, fontStyle: 'italic' },
});
