// DRUMIQ v2.0.0 — Settings (Aurora theme)

import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch,
  TextInput, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import type { ThemeMode } from '../constants/theme';
import { FONT, SIZE, RADIUS, GAP } from '../constants/typography';
import { getLicenseState } from '../services/licenseManager';
import { confirmChangeCode, confirmLogout } from '../services/accountActions';
import { getOverlayModePro, setOverlayModePro } from '../services/overlayController';
import { Overlay } from '../native/overlay';
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

/* ── Section label (// text + gradient line) ── */
function SectionLabel({ text, colors, ff }: { text: string; colors: any; ff: boolean }) {
  return (
    <View style={st.sectionRow}>
      <Text style={[st.sectionText, {
        color: colors.textMuted,
        fontFamily: ff ? FONT.mono : FONT.systemMono,
      }]}>
        {'// '}{text}
      </Text>
      <LinearGradient
        colors={colors.gradPrimary}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={st.sectionLine}
      />
    </View>
  );
}

export default function SettingsScreen({ onOpenFuel, onOpenFilters, onOpenUpgrade, onOpenAccessibility, onOpenWorkMode, onOpenLicense }: Props) {
  const { mode, setMode, colors, fontsLoaded: ff } = useTheme();
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<string | null>(null);
  const [proCard, setProCard] = useState(false);
  const [overlayPerm, setOverlayPerm] = useState<boolean | null>(null);
  const [workModeLabel, setWorkModeLabel] = useState('');
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { (async () => {
    const st = await getLicenseState();
    if (st.license) setPlan(st.license.plan);
    setProCard((await getOverlayModePro()) === 'full');
    setOverlayPerm(await Overlay.canDrawOverlays());
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
    <View style={[st.root, { backgroundColor: colors.bg }]}>
      {/* Aurora blobs */}
      <View style={[st.blob, st.blob1, { backgroundColor: colors.aurora1 }]} />
      <View style={[st.blob, st.blob2, { backgroundColor: colors.aurora2 }]} />
      <View style={[st.blob, st.blob3, { backgroundColor: colors.aurora3 }]} />

      <ScrollView
        contentContainerStyle={[st.scroll, { paddingTop: Math.max(24, insets.top), paddingBottom: Math.max(32, insets.bottom + 16) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Page title */}
        <View style={st.titleWrap}>
          <Text style={[st.title, {
            color: colors.text,
            fontFamily: ff ? FONT.display : FONT.system,
          }]}>
            Setări{' '}
            <Text style={{ fontFamily: ff ? FONT.serifItalic : FONT.system, color: colors.cyan }}>
              app
            </Text>
          </Text>
          <Text style={[st.subtitle, {
            color: colors.textMuted,
            fontFamily: ff ? FONT.mono : FONT.systemMono,
          }]}>
            {'// configurare · preferințe'}
          </Text>
        </View>

        {/* ═══ PLAN ═══ */}
        {plan && (
          <>
            <SectionLabel text="Plan" colors={colors} ff={ff} />
            <View style={[st.group, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
              {/* Plan curent */}
              <View style={st.row}>
                <View style={[st.iconCircle, { backgroundColor: colors.violet + '22' }]}>
                  <Text style={st.iconEmoji}>◆</Text>
                </View>
                <View style={st.rowBody}>
                  <Text style={[st.rowTitle, { color: colors.text, fontFamily: ff ? FONT.bodySB : FONT.system }]}>
                    Plan curent
                  </Text>
                </View>
                <View style={[st.pill, { backgroundColor: colors.violet + '22', borderColor: colors.violet + '44' }]}>
                  <Text style={[st.pillText, { color: colors.violet, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
                    {plan.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Upgrade */}
              {!isPro && (
                <TouchableOpacity onPress={onOpenUpgrade} activeOpacity={0.6}
                  style={[st.row, { borderTopColor: colors.borderSoft, borderTopWidth: StyleSheet.hairlineWidth }]}>
                  <View style={[st.iconCircle, { backgroundColor: colors.amber + '22' }]}>
                    <Text style={st.iconEmoji}>⭐</Text>
                  </View>
                  <Text style={[st.rowTitle, { color: colors.amber, fontFamily: ff ? FONT.bodySB : FONT.system }]}>
                    Upgrade plan
                  </Text>
                  <Text style={[st.chevron, { color: colors.textMuted }]}>›</Text>
                </TouchableOpacity>
              )}

              {/* Change code */}
              <TouchableOpacity onPress={handleChangeCode} activeOpacity={0.6}
                style={[st.row, { borderTopColor: colors.borderSoft, borderTopWidth: StyleSheet.hairlineWidth }]}>
                <View style={[st.iconCircle, { backgroundColor: colors.cyan + '22' }]}>
                  <Text style={st.iconEmoji}>🔑</Text>
                </View>
                <Text style={[st.rowTitle, { color: colors.cyan, fontFamily: ff ? FONT.bodySB : FONT.system }]}>
                  Schimbă cod de activare
                </Text>
                <Text style={[st.chevron, { color: colors.textMuted }]}>›</Text>
              </TouchableOpacity>

              {/* Logout */}
              <TouchableOpacity onPress={handleLogout} activeOpacity={0.6}
                style={[st.row, { borderTopColor: colors.borderSoft, borderTopWidth: StyleSheet.hairlineWidth }]}>
                <View style={[st.iconCircle, { backgroundColor: colors.red + '22' }]}>
                  <Text style={st.iconEmoji}>⎋</Text>
                </View>
                <Text style={[st.rowTitle, { color: colors.red, fontFamily: ff ? FONT.bodySB : FONT.system }]}>
                  Logout
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ═══ CARBURANT ═══ */}
        <SectionLabel text="Carburant" colors={colors} ff={ff} />
        <View style={[st.group, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
          <TouchableOpacity onPress={onOpenFuel} activeOpacity={0.6} style={st.row}>
            <View style={[st.iconCircle, { backgroundColor: colors.amber + '22' }]}>
              <Text style={st.iconEmoji}>⛽</Text>
            </View>
            <View style={st.rowBody}>
              <Text style={[st.rowTitle, { color: colors.text, fontFamily: ff ? FONT.bodySB : FONT.system }]}>
                Tip & preț carburant
              </Text>
            </View>
            <Text style={[st.chevron, { color: colors.textMuted }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ MOD DE LUCRU ═══ */}
        <SectionLabel text="Mod de lucru" colors={colors} ff={ff} />
        <View style={[st.group, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft, opacity: 0.5 }]}>
          <View style={st.row}>
            <View style={[st.iconCircle, { backgroundColor: colors.violet + '22' }]}>
              <Text style={st.iconEmoji}>🔒</Text>
            </View>
            <View style={st.rowBody}>
              <Text style={[st.rowTitle, { color: colors.text, fontFamily: ff ? FONT.bodySB : FONT.system }]}>
                Mod de lucru
              </Text>
              <Text style={[st.rowDesc, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
                Costuri fixe săptămânale pentru calculul profitului
              </Text>
            </View>
            <View style={[st.comingSoonPill, { backgroundColor: colors.violet + '22', borderColor: colors.violet + '44' }]}>
              <Text style={[st.comingSoonText, { color: colors.violet, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
                COMING SOON
              </Text>
            </View>
          </View>
        </View>

        {/* ═══ PRAGURI PROFITABILITATE ═══ */}
        <SectionLabel text="Praguri profitabilitate" colors={colors} ff={ff} />
        <View style={[st.group, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
          <TouchableOpacity onPress={onOpenFilters} activeOpacity={0.6} style={st.row}>
            <View style={[st.iconCircle, { backgroundColor: colors.green + '22' }]}>
              <Text style={st.iconEmoji}>⚙</Text>
            </View>
            <View style={st.rowBody}>
              <Text style={[st.rowTitle, { color: colors.text, fontFamily: ff ? FONT.bodySB : FONT.system }]}>
                Praguri & filtre curse
              </Text>
              <Text style={[st.rowDesc, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
                RON/km, RON/min, pickup max, rating min
              </Text>
            </View>
            <Text style={[st.chevron, { color: colors.textMuted }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ DIAGNOSTIC ═══ */}
        <SectionLabel text="Diagnostic" colors={colors} ff={ff} />
        <View style={[st.group, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
          <TouchableOpacity onPress={onOpenAccessibility} activeOpacity={0.6} style={st.row}>
            <View style={[st.iconCircle, { backgroundColor: colors.cyan + '22' }]}>
              <Text style={st.iconEmoji}>🔍</Text>
            </View>
            <View style={st.rowBody}>
              <Text style={[st.rowTitle, { color: colors.text, fontFamily: ff ? FONT.bodySB : FONT.system }]}>
                Accessibility Test
              </Text>
              <Text style={[st.rowDesc, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
                Verifică că DRUMIQ citește Bolt corect
              </Text>
            </View>
            <Text style={[st.chevron, { color: colors.textMuted }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ OVERLAY & PERMISIUNI ═══ */}
        <SectionLabel text="Overlay & Permisiuni" colors={colors} ff={ff} />
        <View style={[st.group, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
          {/* PRO overlay mode */}
          <View style={st.row}>
            <View style={[st.iconCircle, { backgroundColor: colors.pink + '22' }]}>
              <Text style={st.iconEmoji}>👁</Text>
            </View>
            <View style={st.rowBody}>
              <Text style={[st.rowTitle, {
                color: isPro ? colors.text : colors.textMuted,
                fontFamily: ff ? FONT.bodySB : FONT.system,
              }]}>
                {!isPro && '🔒 '}Card complet (overlay detaliat)
              </Text>
              <Text style={[st.rowDesc, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
                {isPro ? (proCard ? 'Card complet activ' : 'Bulina simplă activă') : 'Disponibil în planul Pro'}
              </Text>
            </View>
            <Switch value={isPro && proCard} onValueChange={handleToggleProCard}
              thumbColor={colors.bgCardStrong} trackColor={{ true: colors.cyan, false: colors.border }} />
          </View>

          {/* Overlay permission */}
          <View style={[st.row, { borderTopColor: colors.borderSoft, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <View style={[st.iconCircle, { backgroundColor: colors.green + '22' }]}>
              <Text style={st.iconEmoji}>📍</Text>
            </View>
            <View style={st.rowBody}>
              <Text style={[st.rowTitle, { color: colors.text, fontFamily: ff ? FONT.bodySB : FONT.system }]}>
                Display over other apps
              </Text>
              <Text style={[st.rowDesc, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
                {overlayPerm === null ? '...' : overlayPerm ? 'Acordată ✓' : 'Lipsă — apasă pentru a acorda'}
              </Text>
            </View>
            {overlayPerm === false && (
              <TouchableOpacity onPress={handleRequestOverlay} activeOpacity={0.7}>
                <LinearGradient
                  colors={colors.gradButton}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={st.grantBtn}
                >
                  <Text style={[st.grantBtnText, { fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
                    Acordă
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ═══ TEMĂ ═══ */}
        <SectionLabel text="Aspect" colors={colors} ff={ff} />
        <View style={[st.group, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
          {THEME_OPTIONS.map((opt, i) => {
            const sel = mode === opt.mode;
            const last = i === THEME_OPTIONS.length - 1;
            return (
              <TouchableOpacity key={opt.mode} onPress={() => setMode(opt.mode)} activeOpacity={0.6}
                style={[st.row, !last && { borderBottomColor: colors.borderSoft, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <View style={[st.iconCircle, { backgroundColor: colors.cyan + '22' }]}>
                  <Text style={st.iconEmoji}>{opt.icon}</Text>
                </View>
                <Text style={[st.rowTitle, { color: colors.text, fontFamily: ff ? FONT.bodySB : FONT.system }]}>
                  {opt.label}
                </Text>
                <View style={[st.radio, { borderColor: sel ? colors.cyan : colors.border }]}>
                  {sel && (
                    <LinearGradient
                      colors={colors.gradPrimary}
                      style={st.radioDot}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ═══ App info card ═══ */}
        <SectionLabel text="Aplicație" colors={colors} ff={ff} />
        <View style={[st.appCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
          <Text style={[st.appLogo, { color: colors.cyan, fontFamily: ff ? FONT.displayXB : FONT.system }]}>
            DRUMIQ
          </Text>
          <Text style={[st.appVersion, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
            v{APP_VERSION} · GO PAMPA S.R.L.
          </Text>
        </View>
      </ScrollView>
    </View>
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
          borderWidth: StyleSheet.hairlineWidth, borderRadius: RADIUS.sm,
          borderColor: colors.border, backgroundColor: colors.bgInput, color: colors.text,
          paddingVertical: 4, paddingHorizontal: 8, minWidth: 50,
          textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
          fontSize: 14, fontWeight: '600',
        }}
        selectionColor={colors.cyan}
      />
      <Text style={{ fontSize: 11, color: colors.textMuted, marginLeft: 4 }}>{suffix}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },

  // Aurora blobs
  blob:  { position: 'absolute', borderRadius: 300 },
  blob1: { width: 260, height: 260, top: -60, left: -80 },
  blob2: { width: 200, height: 200, top: 180, right: -60 },
  blob3: { width: 180, height: 180, bottom: 100, left: 20 },

  scroll: { paddingHorizontal: 20 },

  // Title
  titleWrap: { marginBottom: GAP.xl },
  title: { fontSize: SIZE['2xl'], letterSpacing: -0.5 },
  subtitle: { fontSize: SIZE.xs, letterSpacing: 6, textTransform: 'uppercase', marginTop: 4 },

  // Section label
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginTop: GAP.xl, marginBottom: GAP.sm, gap: 10 },
  sectionText: { fontSize: SIZE.xs, letterSpacing: 6, textTransform: 'uppercase' },
  sectionLine: { flex: 1, height: 1, borderRadius: 1, opacity: 0.4 },

  // Groups
  group: { borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },

  // Rows
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },

  // Icon circle
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  iconEmoji: { fontSize: 16 },

  // Row content
  rowBody: { flex: 1 },
  rowTitle: { fontSize: SIZE.lg },
  rowDesc: { fontSize: SIZE.xs, letterSpacing: 3, marginTop: 2 },

  // Chevron
  chevron: { fontSize: 22, marginLeft: 'auto' },

  // Pill
  pill: { borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, marginLeft: 'auto' },
  pillText: { fontSize: SIZE.xs, letterSpacing: 4 },

  // Coming soon
  comingSoonPill: { borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, marginLeft: 8 },
  comingSoonText: { fontSize: 8, letterSpacing: 4 },

  // Grant button
  grantBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.sm },
  grantBtnText: { color: '#fff', fontSize: SIZE.sm, letterSpacing: 4 },

  // Radio
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },

  // App card
  appCard: { borderRadius: RADIUS.lg, borderWidth: 1, paddingVertical: 24, alignItems: 'center', marginTop: 0 },
  appLogo: { fontSize: SIZE.xl, letterSpacing: 6 },
  appVersion: { fontSize: SIZE.xs, letterSpacing: 4, marginTop: 6 },
});
