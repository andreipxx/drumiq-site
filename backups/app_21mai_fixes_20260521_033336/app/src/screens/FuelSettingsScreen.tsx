import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Platform, Alert,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import {
  getFuelSettings, setFuelSettings, DEFAULTS, totalCostPerKm, type FuelType, type FuelSettings,
} from '../services/userSettings';

interface Props { onBack: () => void; }

const FUEL_LABELS: { type: FuelType; label: string; unit: string; consumptionUnit: string }[] = [
  { type: 'benzina',     label: 'Benzină',     unit: 'RON/L',   consumptionUnit: 'L/100km'   },
  { type: 'diesel',      label: 'Diesel',      unit: 'RON/L',   consumptionUnit: 'L/100km'   },
  { type: 'electric',    label: 'Electric',    unit: 'RON/kWh', consumptionUnit: 'kWh/100km' },
  { type: 'benzina_gpl', label: 'Benzină+GPL', unit: 'RON/L',   consumptionUnit: 'L/100km'   },
  { type: 'hybrid_hev',  label: 'Hybrid (HEV)',  unit: 'RON/L',   consumptionUnit: 'L/100km'   },
  { type: 'hybrid_phev', label: 'Plug-in Hybrid (PHEV)', unit: 'RON/L',  consumptionUnit: 'L/100km'   },
];

export default function FuelSettingsScreen({ onBack }: Props) {
  const { colors } = useTheme();
  const [settings, setSettings] = useState<FuelSettings | null>(null);

  useEffect(() => { getFuelSettings().then(setSettings); }, []);

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
      Alert.alert('Salvat', 'Setările carburant au fost salvate.');
      onBack();
    } catch (e: any) {
      Alert.alert('Eroare', e?.message || 'Salvare eșuată.');
    }
  };

  const meta = FUEL_LABELS.find((f) => f.type === settings.type)!;
  const isGpl = settings.type === 'benzina_gpl';
  const isPhev = settings.type === 'hybrid_phev';
  const totalCost = totalCostPerKm(settings).toFixed(2);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.6}>
        <Text style={[s.backText, { color: colors.accent }]}>‹ Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={[s.title, { color: colors.text }]}>Carburant</Text>

        <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>TIP CARBURANT</Text>
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {FUEL_LABELS.map((f, i) => {
            const sel = settings.type === f.type;
            const last = i === FUEL_LABELS.length - 1;
            return (
              <TouchableOpacity key={f.type} onPress={() => updateType(f.type)} activeOpacity={0.6}
                style={[s.optionRow, !last && { borderBottomColor: colors.divider, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <Text style={[s.optionLabel, { color: colors.text }]}>{f.label}</Text>
                <View style={[s.radio, { borderColor: sel ? colors.accent : colors.border }, sel && { backgroundColor: colors.accent }]}>
                  {sel && <View style={s.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>VALORI {meta.label.toUpperCase()}</Text>
        <View style={[s.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Field label="Consum" suffix={meta.consumptionUnit} value={String(settings.consumption)}
                 onChange={(v: string) => updateField('consumption', v)} colors={colors} />
          <Divider colors={colors} />
          <Field label="Preț" suffix={meta.unit} value={String(settings.pricePerUnit)}
                 onChange={(v: string) => updateField('pricePerUnit', v)} colors={colors} />
          {isGpl && (
            <>
              <Divider colors={colors} />
              <Field label="Consum GPL" suffix="L/100km" value={String(settings.consumptionGpl ?? 0)}
                     onChange={(v: string) => updateField('consumptionGpl', v)} colors={colors} />
              <Divider colors={colors} />
              <Field label="Preț GPL" suffix="RON/L" value={String(settings.pricePerUnitGpl ?? 0)}
                     onChange={(v: string) => updateField('pricePerUnitGpl', v)} colors={colors} />
            </>
          )}
          {isPhev && (
            <>
              <Divider colors={colors} />
              <Field label="Consum electric" suffix="kWh/100km" value={String(settings.consumptionKwh ?? 0)}
                     onChange={(v: string) => updateField('consumptionKwh', v)} colors={colors} />
              <Divider colors={colors} />
              <Field label="Preț kWh" suffix="RON/kWh" value={String(settings.pricePerKwh ?? 0)}
                     onChange={(v: string) => updateField('pricePerKwh', v)} colors={colors} />
              <Divider colors={colors} />
              <Field label="Procent electric" suffix="(0-1)" value={String(settings.electricRatio ?? 0.6)}
                     onChange={(v: string) => updateField('electricRatio', v)} colors={colors} />
            </>
          )}
          <Divider colors={colors} />
          <Field label="Uzură" suffix="RON/km" value={String(settings.wearPerKm)}
                 onChange={(v: string) => updateField('wearPerKm', v)} colors={colors} />
        </View>

        <Text style={[s.hint, { color: colors.textTertiary }]}>
          Cost total estimat: {totalCost} RON/km{isGpl ? '\n(estimat la 80% GPL + 20% benzină)' : ''}{isPhev ? `\n(${Math.round((settings.electricRatio ?? 0.6) * 100)}% electric + ${Math.round((1 - (settings.electricRatio ?? 0.6)) * 100)}% benzină)` : ''}
        </Text>

        <TouchableOpacity onPress={handleSave} activeOpacity={0.7}
          style={[s.cta, { backgroundColor: colors.accent }]}>
          <Text style={s.ctaText}>Salvează</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, suffix, value, onChange, colors }: any) {
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
    <View style={s.fieldRow}>
      <Text style={[s.fieldLabel, { color: colors.text }]}>{label}</Text>
      <View style={s.fieldRight}>
        <TextInput value={localValue} onChangeText={handleChange} keyboardType="decimal-pad"
          style={[s.input, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.border }]}
          selectionColor={colors.accent} />
        <Text style={[s.suffix, { color: colors.textTertiary }]}>{suffix}</Text>
      </View>
    </View>
  );
}

function Divider({ colors }: any) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.divider }} />;
}

const s = StyleSheet.create({
  container:    { flex: 1 },
  backBtn:      { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 8 },
  backText:     { fontSize: 17 },
  scroll:       { padding: 16, paddingBottom: 60 },
  title:        { fontSize: 28, fontWeight: '700', marginBottom: 20 },
  sectionLabel: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 4, paddingTop: 12, paddingBottom: 8 },
  group:        { borderRadius: 12, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  optionRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, justifyContent: 'space-between' },
  optionLabel:  { fontSize: 16, fontWeight: '500' },
  radio:        { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  fieldRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  fieldLabel:   { fontSize: 15, fontWeight: '500' },
  fieldRight:   { flexDirection: 'row', alignItems: 'center' },
  input:        { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, minWidth: 80, textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 15 },
  suffix:       { fontSize: 12, marginLeft: 8, minWidth: 60 },
  hint:         { fontSize: 12, paddingHorizontal: 4, paddingTop: 12, lineHeight: 17, fontStyle: 'italic' },
  cta:          { marginTop: 24, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  ctaText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
});
