import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert, Switch,
  TextInput, Platform,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import type { ThemeMode } from '../constants/theme';
import { getLicenseState, clearLicense } from '../services/licenseManager';
import { signOut } from '../services/auth';
import { getOverlayModePro, setOverlayModePro } from '../services/overlayController';
import { Overlay } from '../native/overlay';
import { DeviceEventEmitter } from 'react-native';
import {
  getAdaptiveConsumption, setAdaptiveConsumption, type AdaptiveConsumption,
  getTaxSettings, setTaxSettings, type TaxSettings,
  DEFAULT_ADAPTIVE, DEFAULT_TAX,
} from '../services/extendedSettings';
import { getWorkMode } from '../services/workMode';

interface Props {
  onOpenFuel: () => void;
  onOpenFilters: () => void;
  onOpenUpgrade: () => void;
  onOpenAccessibility: () => void;
  onOpenWorkMode: () => void;
}

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'automatic', label: 'Automatic', icon: '◐' },
  { mode: 'light',     label: 'Light',     icon: '☀' },
  { mode: 'dark',      label: 'Dark',      icon: '☾' },
];

export default function SettingsScreen({ onOpenFuel, onOpenFilters, onOpenUpgrade, onOpenAccessibility, onOpenWorkMode }: Props) {
  const { mode, setMode, colors } = useTheme();
  const [plan, setPlan] = useState<string | null>(null);
  const [proCard, setProCard] = useState(false);
  const [overlayPerm, setOverlayPerm] = useState<boolean | null>(null);
  const [adaptive, setAdaptiveState] = useState<AdaptiveConsumption>(DEFAULT_ADAPTIVE);
  const [adaptiveSaved, setAdaptiveSaved] = useState(true);
  const [tax, setTaxState] = useState<TaxSettings>(DEFAULT_TAX);
  const [taxSaved, setTaxSaved] = useState(true);
  const [workModeLabel, setWorkModeLabel] = useState('');

  useEffect(() => { (async () => {
    const st = await getLicenseState();
    if (st.license) setPlan(st.license.plan);
    setProCard((await getOverlayModePro()) === 'full');
    setOverlayPerm(await Overlay.canDrawOverlays());
    setAdaptiveState(await getAdaptiveConsumption());
    setTaxState(await getTaxSettings());
    const wm = await getWorkMode();
    setWorkModeLabel(wm.mode === 'flota' ? 'Flotă / mașină închiriată' : 'Individual / PFA / SRL');
  })(); }, []);

  const isPro = plan === 'pro';

  const handleToggleProCard = async (val: boolean) => {
    if (!isPro) { onOpenUpgrade(); return; }
    setProCard(val);
    await setOverlayModePro(val ? 'full' : 'simple');
  };

  const handleRequestOverlay = async () => {
    await Overlay.requestPermission();
    setTimeout(async () => setOverlayPerm(await Overlay.canDrawOverlays()), 1500);
  };

  const handleResetLicense = () => {
    Alert.alert('Schimbă cod', 'Vei fi delogat și redirectat la activare. Continui?', [
      { text: 'Anulează', style: 'cancel' },
      { text: 'Continuă', style: 'destructive', onPress: async () => {
        try { await signOut(); } catch {}
        await clearLicense();
        DeviceEventEmitter.emit('dp_license_changed');
      } },
    ]);
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <ScrollView>
        <Text style={[s.pageTitle, { color: colors.text }]}>Settings</Text>

        {plan && (
          <>
            <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>PLAN</Text>
            <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={s.row}>
                <Text style={[s.label, { color: colors.text }]}>Plan curent</Text>
                <Text style={[s.value, { color: colors.accent }]}>{plan.toUpperCase()}</Text>
              </View>
              {plan !== 'pro' && (
                <TouchableOpacity onPress={onOpenUpgrade} activeOpacity={0.6}
                  style={[s.row, { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth }]}>
                  <Text style={[s.label, { color: colors.accent }]}>⭐ Upgrade plan</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleResetLicense} activeOpacity={0.6}
                style={[s.row, { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth }]}>
                <Text style={[s.label, { color: colors.critic }]}>Schimbă cod / Logout</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>CARBURANT</Text>
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity onPress={onOpenFuel} activeOpacity={0.6} style={s.row}>
            <Text style={[s.label, { color: colors.text }]}>⛽ Tip & preț carburant</Text>
            <Text style={[s.chevron, { color: colors.textTertiary }]}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>MOD DE LUCRU</Text>
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity onPress={onOpenWorkMode} activeOpacity={0.6} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: colors.text }]}>
                {workModeLabel || 'Mod de lucru'}
              </Text>
              <Text style={[s.subLabel, { color: colors.textTertiary }]}>
                Costuri fixe săptămânale pentru calculul profitului
              </Text>
            </View>
            <Text style={[s.chevron, { color: colors.textTertiary }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* === PRAGURI PROFITABILITATE === */}
        <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>PRAGURI PROFITABILITATE</Text>
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity onPress={onOpenFilters} activeOpacity={0.6} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: colors.text }]}>Praguri & filtre curse</Text>
              <Text style={[s.subLabel, { color: colors.textTertiary }]}>
                RON/km, RON/min, pickup max, rating min
              </Text>
            </View>
            <Text style={[s.chevron, { color: colors.textTertiary }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* === ACCESSIBILITY TEST === */}
        <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>🔍 DIAGNOSTIC</Text>
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity onPress={onOpenAccessibility} activeOpacity={0.6} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: colors.text }]}>Accessibility Test</Text>
              <Text style={[s.subLabel, { color: colors.textTertiary }]}>
                Verifică că DRUMIQ citește Bolt corect
              </Text>
            </View>
            <Text style={[s.chevron, { color: colors.textTertiary }]}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>PRO {!isPro && '🔒'}</Text>
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: isPro ? colors.text : colors.textTertiary }]}>
                {!isPro && '🔒 '}Card complet (overlay detaliat)
              </Text>
              <Text style={[s.subLabel, { color: colors.textTertiary }]}>
                {isPro ? (proCard ? 'Card complet activ' : 'Bulina simplă activă') : 'Disponibil în planul Pro'}
              </Text>
            </View>
            <Switch value={isPro && proCard} onValueChange={handleToggleProCard}
              thumbColor={colors.surface} trackColor={{ true: colors.accent, false: colors.border }} />
          </View>
        </View>

        <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>OVERLAY PERMISSION</Text>
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: colors.text }]}>Display over other apps</Text>
              <Text style={[s.subLabel, { color: colors.textTertiary }]}>{overlayPerm === null ? '...' : overlayPerm ? 'Acordată ✓' : 'Lipsă — apasă pentru a acorda'}</Text>
            </View>
            {overlayPerm === false && (
              <TouchableOpacity onPress={handleRequestOverlay} activeOpacity={0.7} style={[s.smallBtn, { backgroundColor: colors.accent }]}>
                <Text style={s.smallBtnText}>Acordă</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* === CONSUM ADAPTIV (2.4.4) === */}
        <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>CONSUM ADAPTIV</Text>
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: colors.text }]}>Consum adaptiv (manual din bord)</Text>
            </View>
            <Switch value={adaptive.enabled}
              onValueChange={(v) => {
                const next = { ...adaptive, enabled: v };
                setAdaptiveState(next);
                setAdaptiveSaved(false);
              }}
              thumbColor={colors.surface} trackColor={{ true: colors.accent, false: colors.border }}
            />
          </View>
          {adaptive.enabled && (
            <>
              <View style={[s.row, { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, { color: colors.text }]}>Consum mediu (manual din bord)</Text>
                  <Text style={[s.subLabel, { color: colors.textTertiary }]}>
                    Valoarea reala din computerul de bord
                  </Text>
                </View>
                <SettingsNumberInput
                  value={adaptive.manualAverage ?? adaptive.city}
                  onChange={(v) => {
                    setAdaptiveState(prev => ({ ...prev, manualAverage: v }));
                    setAdaptiveSaved(false);
                  }}
                  suffix="l/100km"
                  colors={colors}
                />
              </View>
              <TouchableOpacity
                style={[s.row, { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth, justifyContent: 'center' }]}
                onPress={async () => { await setAdaptiveConsumption(adaptive); setAdaptiveSaved(true); }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: adaptiveSaved ? colors.textTertiary : colors.accent, letterSpacing: 1 }}>
                  {adaptiveSaved ? '✓ SALVAT' : '💾 SALVEAZĂ'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* === TAXE (2.4.5) === */}
        <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>TAXE</Text>
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: colors.text }]}>Taxe</Text>
              <Text style={[s.subLabel, { color: colors.textTertiary }]}>
                Taxele se aplică estimativ pe venitul cursei
              </Text>
            </View>
            <SettingsNumberInput
              value={tax.taxRate}
              onChange={(v) => {
                setTaxState(prev => ({ ...prev, taxRate: v }));
                setTaxSaved(false);
              }}
              suffix="%"
              colors={colors}
            />
          </View>
          <View style={[s.row, { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: colors.text }]}>Comision Bolt</Text>
              <Text style={[s.subLabel, { color: colors.textTertiary }]}>
                Dacă suma Bolt e deja netă, lasă 0%
              </Text>
            </View>
            <SettingsNumberInput
              value={tax.boltCommission}
              onChange={(v) => {
                setTaxState(prev => ({ ...prev, boltCommission: v }));
                setTaxSaved(false);
              }}
              suffix="%"
              colors={colors}
            />
          </View>
          <TouchableOpacity
            style={[s.row, { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth, justifyContent: 'center' }]}
            onPress={async () => { await setTaxSettings(tax); setTaxSaved(true); }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 14, fontWeight: '800', color: taxSaved ? colors.textTertiary : colors.accent, letterSpacing: 1 }}>
              {taxSaved ? '✓ SALVAT' : '💾 SALVEAZĂ'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>THEME</Text>
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {THEME_OPTIONS.map((opt, i) => {
            const sel = mode === opt.mode;
            const last = i === THEME_OPTIONS.length - 1;
            return (
              <TouchableOpacity key={opt.mode} onPress={() => setMode(opt.mode)} activeOpacity={0.6}
                style={[s.row, !last && { borderBottomColor: colors.divider, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <Text style={[s.icon, { color: colors.text }]}>{opt.icon}</Text>
                <Text style={[s.label, { color: colors.text }]}>{opt.label}</Text>
                <View style={[s.radio, { borderColor: sel ? colors.accent : colors.border }, sel && { backgroundColor: colors.accent }]}>
                  {sel && <View style={s.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[s.footnote, { color: colors.textTertiary }]}>
          DRUMIQ · v1.0.0 · GO PAMPA S.R.L.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsNumberInput({ value, onChange, suffix, colors }: {
  value: number; onChange: (v: number) => void; suffix: string; colors: any;
}) {
  const [text, setText] = useState(String(value));
  const handleChange = (t: string) => {
    const normalized = t.replace(',', '.');
    if (!/^\d*\.?\d*$/.test(normalized)) return;
    setText(t);
    const num = parseFloat(normalized);
    if (!isNaN(num)) onChange(num);
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
      <TextInput
        value={text}
        onChangeText={handleChange}
        keyboardType="decimal-pad"
        style={{
          borderWidth: StyleSheet.hairlineWidth, borderRadius: 8,
          borderColor: colors.border, backgroundColor: colors.bg, color: colors.text,
          paddingVertical: 4, paddingHorizontal: 8, minWidth: 50,
          textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
          fontSize: 14, fontWeight: '600',
        }}
        selectionColor={colors.accent}
      />
      <Text style={{ fontSize: 11, color: colors.textTertiary, marginLeft: 4 }}>{suffix}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1 },
  pageTitle:    { fontSize: 34, fontWeight: '700', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  sectionLabel: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 20, paddingBottom: 8, paddingTop: 12 },
  group:        { marginHorizontal: 16, borderRadius: 12, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  row:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  icon:         { fontSize: 22, width: 32 },
  label:        { fontSize: 16, fontWeight: '500' },
  subLabel:     { fontSize: 12, marginTop: 2 },
  value:        { fontSize: 16, fontWeight: '600', marginLeft: 'auto' },
  chevron:      { fontSize: 22, marginLeft: 'auto' },
  radio:        { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  radioDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  smallBtn:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  smallBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  footnote:     { fontSize: 12, textAlign: 'center', paddingTop: 24, paddingBottom: 16 },
});
