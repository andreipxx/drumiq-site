import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Switch,
  TextInput, Platform,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import type { ThemeMode } from '../constants/theme';
import { getLicenseState } from '../services/licenseManager';
import { confirmChangeCode, confirmLogout } from '../services/accountActions';
import { getOverlayModePro, setOverlayModePro } from '../services/overlayController';
import { Overlay } from '../native/overlay';
import {
  getAdaptiveConsumption, setAdaptiveConsumption, type AdaptiveConsumption,
  DEFAULT_ADAPTIVE,
} from '../services/extendedSettings';
import { getWorkMode } from '../services/workMode';
import { APP_VERSION } from '../constants/config';

interface Props {
  onOpenFuel: () => void;
  onOpenFilters: () => void;
  onOpenUpgrade: () => void;
  onOpenAccessibility: () => void;
  onOpenWorkMode: () => void;
  onOpenLicense: () => void;
}

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'automatic', label: 'Automatic', icon: '◐' },
  { mode: 'light',     label: 'Light',     icon: '☀' },
  { mode: 'dark',      label: 'Dark',      icon: '☾' },
];

export default function SettingsScreen({ onOpenFuel, onOpenFilters, onOpenUpgrade, onOpenAccessibility, onOpenWorkMode, onOpenLicense }: Props) {
  const { mode, setMode, colors } = useTheme();
  const [plan, setPlan] = useState<string | null>(null);
  const [proCard, setProCard] = useState(false);
  const [overlayPerm, setOverlayPerm] = useState<boolean | null>(null);
  const [adaptive, setAdaptiveState] = useState<AdaptiveConsumption>(DEFAULT_ADAPTIVE);
  const [adaptiveSaved, setAdaptiveSaved] = useState(true);
  const [workModeLabel, setWorkModeLabel] = useState('');
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { (async () => {
    const st = await getLicenseState();
    if (st.license) setPlan(st.license.plan);
    setProCard((await getOverlayModePro()) === 'full');
    setOverlayPerm(await Overlay.canDrawOverlays());
    setAdaptiveState(await getAdaptiveConsumption());
    const wm = await getWorkMode();
    setWorkModeLabel(wm.mode === 'flota' ? 'Flotă / mașină închiriată' : 'Individual / PFA / SRL');
  })(); }, []);

  // MED-14: cleanup overlay permission timer on unmount
  useEffect(() => () => {
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
  }, []);

  const isPro = plan === 'pro' || plan === 'root';

  const handleToggleProCard = async (val: boolean) => {
    if (!isPro) { onOpenUpgrade(); return; }
    setProCard(val);
    await setOverlayModePro(val ? 'full' : 'simple');
  };

  const handleRequestOverlay = async () => {
    await Overlay.requestPermission();
    overlayTimerRef.current = setTimeout(async () => {
      overlayTimerRef.current = null;
      setOverlayPerm(await Overlay.canDrawOverlays());
    }, 1500);
  };

  const handleChangeCode = () => confirmChangeCode(onOpenLicense);
  const handleLogout = () => confirmLogout();

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <ScrollView>
        <Text style={[s.pageTitle, { color: colors.text }]}>Settings</Text>

        {plan && (
          <>
            <Text style={[s.sectionLabel, { color: colors.textDim }]}>PLAN</Text>
            <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={s.row}>
                <Text style={[s.label, { color: colors.text }]}>Plan curent</Text>
                <Text style={[s.value, { color: colors.accent }]}>{plan.toUpperCase()}</Text>
              </View>
              {!isPro && (
                <TouchableOpacity onPress={onOpenUpgrade} activeOpacity={0.6}
                  style={[s.row, { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth }]}>
                  <Text style={[s.label, { color: colors.accent }]}>⭐ Upgrade plan</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleChangeCode} activeOpacity={0.6}
                style={[s.row, { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth }]}>
                <Text style={[s.label, { color: colors.accent }]}>Schimbă cod de activare</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} activeOpacity={0.6}
                style={[s.row, { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth }]}>
                <Text style={[s.label, { color: colors.stop }]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <Text style={[s.sectionLabel, { color: colors.textDim }]}>CARBURANT</Text>
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity onPress={onOpenFuel} activeOpacity={0.6} style={s.row}>
            <Text style={[s.label, { color: colors.text }]}>⛽ Tip & preț carburant</Text>
            <Text style={[s.chevron, { color: colors.textDim }]}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={[s.sectionLabel, { color: colors.textDim }]}>MOD DE LUCRU</Text>
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border, opacity: 0.5 }]}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: colors.text }]}>
                {'🔒 Mod de lucru'}
              </Text>
              <Text style={[s.subLabel, { color: colors.textDim }]}>
                Costuri fixe săptămânale pentru calculul profitului
              </Text>
            </View>
            <View style={{ backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>COMING SOON</Text>
            </View>
          </View>
        </View>

        {/* === PRAGURI PROFITABILITATE === */}
        <Text style={[s.sectionLabel, { color: colors.textDim }]}>PRAGURI PROFITABILITATE</Text>
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity onPress={onOpenFilters} activeOpacity={0.6} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: colors.text }]}>Praguri & filtre curse</Text>
              <Text style={[s.subLabel, { color: colors.textDim }]}>
                RON/km, RON/min, pickup max, rating min
              </Text>
            </View>
            <Text style={[s.chevron, { color: colors.textDim }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* === ACCESSIBILITY TEST === */}
        <Text style={[s.sectionLabel, { color: colors.textDim }]}>🔍 DIAGNOSTIC</Text>
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity onPress={onOpenAccessibility} activeOpacity={0.6} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: colors.text }]}>Accessibility Test</Text>
              <Text style={[s.subLabel, { color: colors.textDim }]}>
                Verifică că DRUMIQ citește Bolt corect
              </Text>
            </View>
            <Text style={[s.chevron, { color: colors.textDim }]}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={[s.sectionLabel, { color: colors.textDim }]}>PRO {!isPro && '🔒'}</Text>
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: isPro ? colors.text : colors.textDim }]}>
                {!isPro && '🔒 '}Card complet (overlay detaliat)
              </Text>
              <Text style={[s.subLabel, { color: colors.textDim }]}>
                {isPro ? (proCard ? 'Card complet activ' : 'Bulina simplă activă') : 'Disponibil în planul Pro'}
              </Text>
            </View>
            <Switch value={isPro && proCard} onValueChange={handleToggleProCard}
              thumbColor={colors.surface} trackColor={{ true: colors.accent, false: colors.border }} />
          </View>
        </View>

        <Text style={[s.sectionLabel, { color: colors.textDim }]}>OVERLAY PERMISSION</Text>
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: colors.text }]}>Display over other apps</Text>
              <Text style={[s.subLabel, { color: colors.textDim }]}>{overlayPerm === null ? '...' : overlayPerm ? 'Acordată ✓' : 'Lipsă — apasă pentru a acorda'}</Text>
            </View>
            {overlayPerm === false && (
              <TouchableOpacity onPress={handleRequestOverlay} activeOpacity={0.7} style={[s.smallBtn, { backgroundColor: colors.accent }]}>
                <Text style={s.smallBtnText}>Acordă</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* === CONSUM ADAPTIV (2.4.4) === */}
        <Text style={[s.sectionLabel, { color: colors.textDim }]}>CONSUM ADAPTIV</Text>
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: colors.text }]}>Consum adaptiv (manual din bord)</Text>
            </View>
            <Switch value={adaptive.enabled}
              onValueChange={async (v) => {
                const next = { ...adaptive, enabled: v };
                setAdaptiveState(next);
                await setAdaptiveConsumption(next);
                setAdaptiveSaved(true);
              }}
              thumbColor={colors.surface} trackColor={{ true: colors.accent, false: colors.border }}
            />
          </View>
          {adaptive.enabled && (
            <>
              <View style={[s.row, { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, { color: colors.text }]}>Consum mediu (manual din bord)</Text>
                  <Text style={[s.subLabel, { color: colors.textDim }]}>
                    Valoarea reala din computerul de bord
                  </Text>
                </View>
                <SettingsNumberInput
                  value={adaptive.manualAverage ?? 0}
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
                <Text style={{ fontSize: 14, fontWeight: '800', color: adaptiveSaved ? colors.textDim : colors.accent, letterSpacing: 1 }}>
                  {adaptiveSaved ? '✓ SALVAT' : '💾 SALVEAZĂ'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={[s.sectionLabel, { color: colors.textDim }]}>THEME</Text>
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

        <Text style={[s.footnote, { color: colors.textDim }]}>
          DRUMIQ · v{APP_VERSION} · GO PAMPA S.R.L.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsNumberInput({ value, onChange, suffix, colors }: {
  value: number; onChange: (v: number) => void; suffix: string; colors: any;
}) {
  const [text, setText] = useState(String(value));

  // MED-15: sync text when prop value changes externally, but don't overwrite mid-typing
  useEffect(() => {
    const parsed = parseFloat(text.replace(',', '.'));
    if (isNaN(parsed) || parsed !== value) {
      setText(String(value));
    }
  }, [value, text]);

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
      <Text style={{ fontSize: 11, color: colors.textDim, marginLeft: 4 }}>{suffix}</Text>
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
