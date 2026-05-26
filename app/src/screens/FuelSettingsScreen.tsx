// DRUMIQ v2.0.0 — Fuel Settings (Aurora theme)

import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { FONT, SIZE, RADIUS, GAP } from '../constants/typography';
import {
  getFuelSettings, setFuelSettings, DEFAULTS, totalCostPerKm, type FuelType, type FuelSettings,
} from '../services/userSettings';
import {
  getAdaptiveConsumption, setAdaptiveConsumption, type AdaptiveConsumption, DEFAULT_ADAPTIVE,
} from '../services/extendedSettings';
import {
  getLiveFuelPrices, forceFetchPrices, formatLastUpdate, type LiveFuelPrices,
} from '../services/fuelPriceService';

interface Props { onBack: () => void; }

const FUEL_LABELS: { type: FuelType; label: string; unit: string; consumptionUnit: string }[] = [
  { type: 'benzina',     label: 'Benzină',     unit: 'RON/L',   consumptionUnit: 'L/100km'   },
  { type: 'diesel',      label: 'Diesel',      unit: 'RON/L',   consumptionUnit: 'L/100km'   },
  { type: 'electric',    label: 'Electric',    unit: 'RON/kWh', consumptionUnit: 'kWh/100km' },
  { type: 'benzina_gpl', label: 'Benzină+GPL', unit: 'RON/L',   consumptionUnit: 'L/100km'   },
  { type: 'hybrid_hev',  label: 'Hybrid (HEV)',  unit: 'RON/L',   consumptionUnit: 'L/100km'   },
  { type: 'hybrid_phev', label: 'Plug-in Hybrid (PHEV)', unit: 'RON/L',  consumptionUnit: 'L/100km'   },
  { type: 'hybrid_gpl',  label: 'Hybrid + GPL',  unit: 'RON/L',   consumptionUnit: 'L/100km'   },
];

/* ── Section label ── */
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

/* ── Divider ── */
function Divider({ colors }: { colors: any }) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSoft }} />;
}

export default function FuelSettingsScreen({ onBack }: Props) {
  const { colors, fontsLoaded: ff } = useTheme();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<FuelSettings | null>(null);
  const [adaptive, setAdaptiveState] = useState<AdaptiveConsumption>(DEFAULT_ADAPTIVE);
  const [livePrices, setLivePrices] = useState<LiveFuelPrices | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    getFuelSettings().then(setSettings);
    getAdaptiveConsumption().then(setAdaptiveState);
    getLiveFuelPrices().then(setLivePrices);
  }, []);

  const handleLiveRefresh = async () => {
    setRefreshing(true);
    try {
      const fresh = await forceFetchPrices();
      setLivePrices(fresh);
    } catch {}
    setRefreshing(false);
  };

  if (!settings) return null;

  const updateType = (type: FuelType) => {
    setSettings({ ...DEFAULTS[type] });
  };

  const updateField = (field: keyof FuelSettings, val: string) => {
    const num = parseFloat(val.replace(',', '.'));
    if (isNaN(num) || num < 0) return;
    setSettings({ ...settings, [field]: num });
  };

  const handleSave = async () => {
    try {
      await setFuelSettings(settings);
      await setAdaptiveConsumption(adaptive);
      Alert.alert('Salvat', 'Setările carburant au fost salvate.');
      onBack();
    } catch (e: any) {
      Alert.alert('Eroare', e?.message || 'Salvare eșuată.');
    }
  };

  const applyAllLivePrices = async () => {
    if (!livePrices || !settings) return;
    const updated = { ...settings };
    if (settings.type === 'diesel') {
      updated.pricePerUnit = livePrices.diesel;
    } else {
      updated.pricePerUnit = livePrices.benzina;
    }
    if (settings.type === 'benzina_gpl' || settings.type === 'hybrid_gpl') {
      updated.pricePerUnitGpl = livePrices.gpl;
    }
    setSettings(updated);
    try {
      await setFuelSettings(updated);
      await setAdaptiveConsumption(adaptive);
      Alert.alert('Salvat', 'Prețurile LIVE au fost aplicate și salvate.');
    } catch (e: any) {
      Alert.alert('Eroare', e?.message || 'Salvare eșuată.');
    }
  };

  const meta = FUEL_LABELS.find((f) => f.type === settings.type) ?? FUEL_LABELS[0];
  const isGpl = settings.type === 'benzina_gpl' || settings.type === 'hybrid_gpl';
  const isPhev = settings.type === 'hybrid_phev';
  const isElectric = settings.type === 'electric';
  const totalCost = totalCostPerKm(settings).toFixed(2);

  return (
    <View style={[st.root, { backgroundColor: colors.bg }]}>
      {/* Aurora blobs */}
      <View style={[st.blob, st.blob1, { backgroundColor: colors.aurora1 }]} />
      <View style={[st.blob, st.blob2, { backgroundColor: colors.aurora2 }]} />
      <View style={[st.blob, st.blob3, { backgroundColor: colors.aurora3 }]} />

      {/* Back */}
      <TouchableOpacity onPress={onBack} style={[st.backBtn, { paddingTop: insets.top + 8 }]} activeOpacity={0.6}>
        <Text style={[st.backText, {
          color: colors.cyan,
          fontFamily: ff ? FONT.bodySB : FONT.system,
        }]}>‹ Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Title row */}
        <View style={st.titleRow}>
          <View>
            <Text style={[st.title, {
              color: colors.text,
              fontFamily: ff ? FONT.display : FONT.system,
            }]}>
              Carburant{' '}
              <Text style={{ fontFamily: ff ? FONT.serifItalic : FONT.system, color: colors.amber }}>
                & cost
              </Text>
            </Text>
          </View>
          {!isElectric && (
            <TouchableOpacity onPress={handleLiveRefresh} activeOpacity={0.7} disabled={refreshing}>
              <LinearGradient
                colors={refreshing ? [colors.border, colors.border] as [string, string] : colors.gradSuccess}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={st.liveBtn}
              >
                <Text style={[st.liveBtnText, { fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
                  {refreshing ? '...' : 'LIVE'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* ═══ TIP CARBURANT ═══ */}
        <SectionLabel text="Tip carburant" colors={colors} ff={ff} />
        <View style={[st.group, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
          {FUEL_LABELS.map((f, i) => {
            const sel = settings.type === f.type;
            const last = i === FUEL_LABELS.length - 1;
            return (
              <TouchableOpacity key={f.type} onPress={() => updateType(f.type)} activeOpacity={0.6}
                style={[st.optionRow, !last && { borderBottomColor: colors.borderSoft, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <Text style={[st.optionLabel, {
                  color: sel ? colors.text : colors.textSoft,
                  fontFamily: ff ? FONT.bodySB : FONT.system,
                }]}>{f.label}</Text>
                <View style={[st.radio, { borderColor: sel ? colors.cyan : colors.border }]}>
                  {sel && (
                    <LinearGradient colors={colors.gradPrimary} style={st.radioDot} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ═══ VALORI ═══ */}
        <SectionLabel text={`Valori ${meta.label}`} colors={colors} ff={ff} />
        <View style={[st.group, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
          <Field label="Consum" suffix={meta.consumptionUnit} value={String(settings.consumption)}
                 onChange={(v: string) => updateField('consumption', v)} colors={colors} ff={ff} />
          <Divider colors={colors} />
          <Field label="Preț" suffix={meta.unit} value={String(settings.pricePerUnit)}
                 onChange={(v: string) => updateField('pricePerUnit', v)} colors={colors} ff={ff} />
          {isGpl && (
            <>
              <Divider colors={colors} />
              <Field label="Consum GPL" suffix="L/100km" value={String(settings.consumptionGpl ?? 0)}
                     onChange={(v: string) => updateField('consumptionGpl', v)} colors={colors} ff={ff} />
              <Divider colors={colors} />
              <Field label="Preț GPL" suffix="RON/L" value={String(settings.pricePerUnitGpl ?? 0)}
                     onChange={(v: string) => updateField('pricePerUnitGpl', v)} colors={colors} ff={ff} />
              <Divider colors={colors} />
              <Field label="Ratio GPL" suffix="%" value={String(Math.round((settings.gplRatio ?? 0.8) * 100))}
                     onChange={(v: string) => {
                       const pct = parseFloat(v.replace(',', '.'));
                       if (isNaN(pct) || pct < 0 || pct > 100) return;
                       setSettings({ ...settings, gplRatio: pct / 100 });
                     }} colors={colors} ff={ff} />
            </>
          )}
          {isPhev && (
            <>
              <Divider colors={colors} />
              <Field label="Consum electric" suffix="kWh/100km" value={String(settings.consumptionKwh ?? 0)}
                     onChange={(v: string) => updateField('consumptionKwh', v)} colors={colors} ff={ff} />
              <Divider colors={colors} />
              <Field label="Preț kWh" suffix="RON/kWh" value={String(settings.pricePerKwh ?? 0)}
                     onChange={(v: string) => updateField('pricePerKwh', v)} colors={colors} ff={ff} />
              <Divider colors={colors} />
              <Field label="Procent electric" suffix="%" value={String(Math.round((settings.electricRatio ?? 0.6) * 100))}
                     onChange={(v: string) => {
                       const pct = parseFloat(v.replace(',', '.'));
                       if (isNaN(pct) || pct < 0 || pct > 100) return;
                       setSettings({ ...settings, electricRatio: pct / 100 });
                     }} colors={colors} ff={ff} />
            </>
          )}
          <Divider colors={colors} />
          <Field label="Uzură" suffix="RON/km" value={String(settings.wearPerKm)}
                 onChange={(v: string) => updateField('wearPerKm', v)} colors={colors} ff={ff} />
        </View>

        {/* Cost total */}
        <Text style={[st.costHint, {
          color: colors.textMuted,
          fontFamily: ff ? FONT.mono : FONT.systemMono,
        }]}>
          Cost total estimat: {totalCost} RON/km{isGpl ? `\n(${Math.round((settings.gplRatio ?? 0.8) * 100)}% GPL + ${Math.round((1 - (settings.gplRatio ?? 0.8)) * 100)}% benzină)` : ''}{isPhev ? `\n(${Math.round((settings.electricRatio ?? 0.6) * 100)}% electric + ${Math.round((1 - (settings.electricRatio ?? 0.6)) * 100)}% benzină)` : ''}
        </Text>

        {/* ═══ PREȚ CARBURANT LIVE ═══ */}
        {livePrices && !isElectric && (
          <>
            <SectionLabel text="Preț carburant LIVE" colors={colors} ff={ff} />
            <View style={[st.group, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
              {settings.type !== 'diesel' && (
                <View style={st.fieldRow}>
                  <Text style={[st.fieldLabel, {
                    color: colors.text,
                    fontFamily: ff ? FONT.bodySB : FONT.system,
                  }]}>Benzină</Text>
                  <Text style={[st.livePrice, {
                    color: colors.green,
                    fontFamily: ff ? FONT.monoBold : FONT.systemMono,
                  }]}>{livePrices.benzina.toFixed(2)} RON/L</Text>
                </View>
              )}
              {settings.type === 'diesel' && (
                <View style={st.fieldRow}>
                  <Text style={[st.fieldLabel, {
                    color: colors.text,
                    fontFamily: ff ? FONT.bodySB : FONT.system,
                  }]}>Diesel</Text>
                  <Text style={[st.livePrice, {
                    color: colors.green,
                    fontFamily: ff ? FONT.monoBold : FONT.systemMono,
                  }]}>{livePrices.diesel.toFixed(2)} RON/L</Text>
                </View>
              )}
              {isGpl && (
                <>
                  <Divider colors={colors} />
                  <View style={st.fieldRow}>
                    <Text style={[st.fieldLabel, {
                      color: colors.text,
                      fontFamily: ff ? FONT.bodySB : FONT.system,
                    }]}>GPL</Text>
                    <Text style={[st.livePrice, {
                      color: colors.green,
                      fontFamily: ff ? FONT.monoBold : FONT.systemMono,
                    }]}>{livePrices.gpl.toFixed(2)} RON/L</Text>
                  </View>
                </>
              )}
              <Divider colors={colors} />
              <TouchableOpacity onPress={applyAllLivePrices} activeOpacity={0.7} style={st.liveCtaWrap}>
                <LinearGradient
                  colors={colors.gradSuccess}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={st.liveCta}
                >
                  <Text style={[st.liveCtaText, { fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
                    Aplică prețurile LIVE și salvează
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <Text style={[st.liveUpdate, {
              color: colors.textFaint,
              fontFamily: ff ? FONT.mono : FONT.systemMono,
            }]}>
              Ultima actualizare: {formatLastUpdate(livePrices.updatedAt)} (auto 24h) · PretCarburant.ro
            </Text>
          </>
        )}

        {/* ═══ CONSUM ADAPTIV ═══ */}
        <SectionLabel text="Consum adaptiv (din bord)" colors={colors} ff={ff} />
        <View style={[st.group, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
          <View style={st.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={[st.fieldLabel, {
                color: colors.text,
                fontFamily: ff ? FONT.bodySB : FONT.system,
              }]}>Folosește consumul real</Text>
              <Text style={[st.adaptiveHint, {
                color: colors.textMuted,
                fontFamily: ff ? FONT.mono : FONT.systemMono,
              }]}>
                Înlocuiește valorile de mai sus cu ce arată bordul
              </Text>
            </View>
            <Switch value={adaptive.enabled}
              onValueChange={(v) => setAdaptiveState(prev => ({ ...prev, enabled: v }))}
              thumbColor={colors.bgCardStrong} trackColor={{ true: colors.cyan, false: colors.border }}
            />
          </View>
          {adaptive.enabled && (
            <>
              {!isElectric && (
                <>
                  <Divider colors={colors} />
                  <Field
                    label={isGpl ? 'Consum mixt bord' : 'Consum mediu bord'}
                    suffix="L/100km"
                    value={String(adaptive.manualAverage ?? 0)}
                    onChange={(v: string) => {
                      const num = parseFloat(v);
                      if (!isNaN(num) && num >= 0) setAdaptiveState(prev => ({ ...prev, manualAverage: num }));
                    }}
                    colors={colors} ff={ff}
                  />
                </>
              )}
              {(isElectric || isPhev) && (
                <>
                  <Divider colors={colors} />
                  <Field
                    label={isElectric ? 'Consum electric bord' : 'Consum electric bord'}
                    suffix="kWh/100km"
                    value={String(adaptive.manualKwh ?? 0)}
                    onChange={(v: string) => {
                      const num = parseFloat(v);
                      if (!isNaN(num) && num >= 0) setAdaptiveState(prev => ({ ...prev, manualKwh: num }));
                    }}
                    colors={colors} ff={ff}
                  />
                </>
              )}
            </>
          )}
        </View>

        {adaptive.enabled && (
          <Text style={[st.costHint, {
            color: colors.cyan,
            fontFamily: ff ? FONT.mono : FONT.systemMono,
          }]}>
            {'⚡ Overlay va folosi consumul din bord în loc de valorile de mai sus'}
          </Text>
        )}

        {/* Info box */}
        <View style={[st.infoBox, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
          <Text style={[st.infoIcon, { color: colors.textMuted }]}>ℹ</Text>
          <Text style={[st.infoText, {
            color: colors.textMuted,
            fontFamily: ff ? FONT.body : FONT.system,
          }]}>
            <Text style={{ fontWeight: '600', color: colors.text }}>Costurile fixe</Text>
            {' (asigurare RCA/CASCO, ITP, revizie anuală) '}
            <Text style={{ fontWeight: '600', color: colors.text }}>nu sunt incluse</Text>
            {' deoarece diferă mult de la un șofer la altul și de la o mașină la alta. Le poți adăuga manual în uzura per km dacă dorești.'}
          </Text>
        </View>

        {/* Save CTA */}
        <TouchableOpacity onPress={handleSave} activeOpacity={0.7} style={st.ctaWrap}>
          <LinearGradient
            colors={colors.gradButton}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={st.cta}
          >
            <Text style={[st.ctaText, { fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
              Salvează
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Field({ label, suffix, value, onChange, colors, ff }: any) {
  const [localValue, setLocalValue] = useState<string>(String(value));

  useEffect(() => {
    const parsed = parseFloat(localValue.replace(',', '.'));
    if (isNaN(parsed) || parsed !== Number(value)) {
      setLocalValue(String(value));
    }
  }, [value]);

  const handleChange = (text: string) => {
    const normalized = text.replace(',', '.');
    if (!/^\d*\.?\d*$/.test(normalized)) return;
    setLocalValue(text);
    if (normalized && normalized !== '.') {
      const num = parseFloat(normalized);
      if (!isNaN(num) && num >= 0) onChange(String(num));
    }
  };

  return (
    <View style={st.fieldRow}>
      <Text style={[st.fieldLabel, {
        color: colors.text,
        fontFamily: ff ? FONT.bodySB : FONT.system,
      }]}>{label}</Text>
      <View style={st.fieldRight}>
        <TextInput value={localValue} onChangeText={handleChange} keyboardType="decimal-pad"
          style={[st.input, {
            color: colors.text,
            backgroundColor: colors.bgInput,
            borderColor: colors.border,
            fontFamily: ff ? FONT.monoBold : FONT.systemMono,
          }]}
          selectionColor={colors.cyan} />
        <Text style={[st.suffix, {
          color: colors.textMuted,
          fontFamily: ff ? FONT.mono : FONT.systemMono,
        }]}>{suffix}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },

  // Aurora blobs
  blob:  { position: 'absolute', borderRadius: 300 },
  blob1: { width: 260, height: 260, top: -60, left: -80 },
  blob2: { width: 200, height: 200, top: 220, right: -60 },
  blob3: { width: 160, height: 160, bottom: 100, left: 30 },

  // Back
  backBtn:  { paddingHorizontal: 20, paddingBottom: 8, zIndex: 2 },
  backText: { fontSize: SIZE.lg },

  // Scroll
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },

  // Title
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: GAP.lg },
  title:    { fontSize: SIZE['2xl'], letterSpacing: -0.5 },
  liveBtn:  { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.pill },
  liveBtnText: { color: '#fff', fontSize: SIZE.sm, letterSpacing: 4 },

  // Section label
  sectionRow:  { flexDirection: 'row', alignItems: 'center', marginTop: GAP.xl, marginBottom: GAP.sm, gap: 10 },
  sectionText: { fontSize: SIZE.xs, letterSpacing: 6, textTransform: 'uppercase' },
  sectionLine: { flex: 1, height: 1, borderRadius: 1, opacity: 0.4 },

  // Group
  group: { borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1 },

  // Fuel type selection
  optionRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, justifyContent: 'space-between' },
  optionLabel: { fontSize: SIZE.lg },
  radio:       { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot:    { width: 10, height: 10, borderRadius: 5 },

  // Field row
  fieldRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  fieldLabel: { fontSize: SIZE.base },
  fieldRight: { flexDirection: 'row', alignItems: 'center' },
  input:      { borderWidth: StyleSheet.hairlineWidth, borderRadius: RADIUS.sm, paddingVertical: 6, paddingHorizontal: 10, minWidth: 80, textAlign: 'right', fontSize: 15 },
  suffix:     { fontSize: SIZE.xs, letterSpacing: 3, marginLeft: 8, minWidth: 60 },

  // Hints
  costHint:     { fontSize: SIZE.sm, paddingHorizontal: 4, paddingTop: 12, lineHeight: 17, letterSpacing: 2 },
  adaptiveHint: { fontSize: SIZE.xs, letterSpacing: 3, marginTop: 2 },

  // Live prices
  livePrice:   { fontSize: SIZE.lg },
  liveCtaWrap: { paddingHorizontal: 16, paddingVertical: 12 },
  liveCta:     { paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center' },
  liveCtaText: { color: '#fff', fontSize: SIZE.sm, letterSpacing: 4 },
  liveUpdate:  { fontSize: SIZE.xs, letterSpacing: 3, textAlign: 'center', marginTop: 6, marginBottom: 4 },

  // Info box
  infoBox:  { flexDirection: 'row', borderRadius: RADIUS.lg, borderWidth: 1, padding: 14, marginTop: GAP.xl, gap: 10 },
  infoIcon: { fontSize: 18 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },

  // CTA
  ctaWrap: { marginTop: GAP.xl },
  cta:     { paddingVertical: 16, borderRadius: RADIUS.md, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: SIZE.lg, letterSpacing: 4 },
});
