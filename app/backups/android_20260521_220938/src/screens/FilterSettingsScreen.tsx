import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import {
  loadThresholds,
  saveThresholds,
  resetThresholds,
  THRESHOLD_LABELS,
  THRESHOLD_UNITS,
  THRESHOLD_ICONS,
  THRESHOLD_HINTS,
} from '../services/filterEngine';
import type { UnifiedThresholds } from '../types';

interface Props {
  onBack: () => void;
}

type ThresholdField = 'kmValue' | 'minValue' | 'hourValue' | 'yellowZone' | 'maxPickupKm' | 'minRating';
type ToggleField = 'kmEnabled' | 'minEnabled' | 'hourEnabled' | 'pickupEnabled' | 'ratingEnabled';

const PROFIT_FIELDS: { field: ThresholdField; toggle: ToggleField }[] = [
  { field: 'kmValue',    toggle: 'kmEnabled' },
  { field: 'minValue',   toggle: 'minEnabled' },
  { field: 'hourValue',  toggle: 'hourEnabled' },
];

const HARD_FIELDS: { field: ThresholdField; toggle: ToggleField; prefix: string }[] = [
  { field: 'maxPickupKm', toggle: 'pickupEnabled', prefix: 'Peste' },
  { field: 'minRating',   toggle: 'ratingEnabled', prefix: 'Sub' },
];

export default function FilterSettingsScreen({ onBack }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [thresholds, setThresholds] = useState<UnifiedThresholds | null>(null);
  const [dirty, setDirty] = useState(false);
  const [inputText, setInputText] = useState<Record<ThresholdField, string>>({
    kmValue: '', minValue: '', hourValue: '', yellowZone: '', maxPickupKm: '', minRating: '',
  });

  useEffect(() => {
    (async () => {
      const t = await loadThresholds();
      setThresholds(t);
      setInputText({
        kmValue: String(t.kmValue),
        minValue: String(t.minValue),
        hourValue: String(t.hourValue),
        yellowZone: String(t.yellowZone),
        maxPickupKm: String(t.maxPickupKm),
        minRating: String(t.minRating),
      });
    })();
  }, []);

  const update = useCallback((patch: Partial<UnifiedThresholds>) => {
    setThresholds(prev => prev ? { ...prev, ...patch } : prev);
    setDirty(true);
  }, []);

  const handleSave = async () => {
    if (!thresholds) return;
    const final = { ...thresholds };
    for (const k of Object.keys(inputText) as ThresholdField[]) {
      const txt = (inputText[k] ?? '').replace(',', '.');
      const n = parseFloat(txt);
      if (!isNaN(n) && isFinite(n)) {
        (final as any)[k] = n;
      }
    }
    await saveThresholds(final);
    setThresholds(final);
    setDirty(false);
    Alert.alert('Salvat', 'Pragurile au fost salvate.');
  };

  const handleReset = async () => {
    Alert.alert('Resetează?', 'Toate pragurile vor reveni la valori implicite.', [
      { text: 'Anulează', style: 'cancel' },
      {
        text: 'Resetează', style: 'destructive',
        onPress: async () => {
          const t = await resetThresholds();
          setThresholds(t);
          setInputText({
            kmValue: String(t.kmValue),
            minValue: String(t.minValue),
            hourValue: String(t.hourValue),
            yellowZone: String(t.yellowZone),
            maxPickupKm: String(t.maxPickupKm),
            minRating: String(t.minRating),
          });
          setDirty(false);
        },
      },
    ]);
  };

  if (!thresholds) {
    return <View style={[s.root, { backgroundColor: colors.bg }]} />;
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <TouchableOpacity onPress={onBack} style={[s.backBtn, { paddingTop: insets.top + 8 }]}>
        <Text style={[s.backTxt, { color: colors.accent }]}>‹ Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={s.content}>
        <Text style={[s.title, { color: colors.text }]}>PRAGURI<Text style={{ color: colors.accent }}> PROFITABILITATE</Text></Text>
        <Text style={[s.sub, { color: colors.textMuted }]}>O singură sursă de adevăr pentru verdicte</Text>

        <View style={[s.infoCard, { backgroundColor: colors.surface, borderColor: colors.borderAccent }]}>
          <Text style={[s.infoTxt, { color: colors.textMuted }]}>
            <Text style={{ color: '#FF3366', fontWeight: '700' }}>X</Text> sub minim ·{' '}
            <Text style={{ color: '#FFB800', fontWeight: '700' }}>?</Text> zona galbenă ·{' '}
            <Text style={{ color: colors.go, fontWeight: '700' }}>$</Text> profitabil
          </Text>
        </View>

        {/* PROFIT THRESHOLDS — un singur filtru activ (radio) */}
        <Text style={[s.sectionTitle, { color: colors.textMuted }]}>PRAG PROFIT (alege unul)</Text>
        {PROFIT_FIELDS.map(({ field, toggle }) => {
          const isActive = !!(thresholds as any)[toggle];
          return (
            <TouchableOpacity
              key={field}
              activeOpacity={0.7}
              onPress={() => {
                const patch: Partial<UnifiedThresholds> = {
                  kmEnabled: false, minEnabled: false, hourEnabled: false,
                  [toggle]: !isActive,
                };
                update(patch);
              }}
              style={[s.card, {
                backgroundColor: colors.surface,
                borderColor: isActive ? colors.go : colors.border,
                borderWidth: isActive ? 2 : 1,
              }]}
            >
              <View style={s.cardHeader}>
                <Text style={[s.cardTitle, { color: isActive ? colors.go : colors.text }]}>
                  {isActive ? '◉' : '○'}  {THRESHOLD_ICONS[field]}  {THRESHOLD_LABELS[field]}
                </Text>
              </View>
              <Text style={[s.hint, { color: colors.textDim }]}>{THRESHOLD_HINTS[field]}</Text>
              {isActive && (
                <View style={s.inputRow}>
                  <Text style={[s.prefix, { color: colors.textMuted }]}>Minim</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
                    value={inputText[field]}
                    onChangeText={txt => {
                      const cleaned = txt.replace(/[^0-9.,]/g, '');
                      setInputText(prev => ({ ...prev, [field]: cleaned }));
                      const n = parseFloat(cleaned.replace(',', '.'));
                      if (!isNaN(n) && isFinite(n)) update({ [field]: n });
                    }}
                    keyboardType="decimal-pad"
                  />
                  <Text style={[s.unit, { color: colors.textMuted }]}>{THRESHOLD_UNITS[field]}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* YELLOW ZONE */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.cardHeader}>
            <Text style={[s.cardTitle, { color: colors.text }]}>
              {THRESHOLD_ICONS.yellowZone}  {THRESHOLD_LABELS.yellowZone}
            </Text>
          </View>
          <Text style={[s.hint, { color: colors.textDim }]}>{THRESHOLD_HINTS.yellowZone}</Text>
          <View style={s.inputRow}>
            <TextInput
              style={[s.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
              value={inputText.yellowZone}
              onChangeText={txt => {
                const cleaned = txt.replace(/[^0-9.,]/g, '');
                setInputText(prev => ({ ...prev, yellowZone: cleaned }));
                const n = parseFloat(cleaned.replace(',', '.'));
                if (!isNaN(n) && isFinite(n)) update({ yellowZone: n });
              }}
              keyboardType="decimal-pad"
            />
            <Text style={[s.unit, { color: colors.textMuted }]}>{THRESHOLD_UNITS.yellowZone}</Text>
          </View>
          <View style={[s.preview, { borderColor: colors.border }]}>
            <Text style={[s.previewTxt, { color: colors.textDim }]}>
              Ex: minim {thresholds.kmValue} RON/km → galben până la {(thresholds.kmValue * (1 + thresholds.yellowZone / 100)).toFixed(2)} RON/km
            </Text>
          </View>
        </View>

        {/* HARD FILTERS */}
        <Text style={[s.sectionTitle, { color: colors.textMuted }]}>FILTRE DURE (independent de profit)</Text>
        {HARD_FIELDS.map(({ field, toggle, prefix }) => (
          <View key={field} style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={s.cardHeader}>
              <Text style={[s.cardTitle, { color: colors.text }]}>
                {THRESHOLD_ICONS[field]}  {THRESHOLD_LABELS[field]}
              </Text>
              <Switch
                value={(thresholds as any)[toggle]}
                onValueChange={v => update({ [toggle]: v })}
                thumbColor={colors.surface}
                trackColor={{ true: colors.go, false: colors.border }}
              />
            </View>
            <Text style={[s.hint, { color: colors.textDim }]}>{THRESHOLD_HINTS[field]}</Text>
            <View style={s.inputRow}>
              <Text style={[s.prefix, { color: colors.textMuted }]}>{prefix}</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
                value={inputText[field]}
                onChangeText={txt => {
                  const cleaned = txt.replace(/[^0-9.,]/g, '');
                  setInputText(prev => ({ ...prev, [field]: cleaned }));
                  const n = parseFloat(cleaned.replace(',', '.'));
                  if (!isNaN(n) && isFinite(n)) update({ [field]: n });
                }}
                keyboardType="decimal-pad"
              />
              <Text style={[s.unit, { color: colors.textMuted }]}>{THRESHOLD_UNITS[field]}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: dirty ? colors.accent : colors.surfaceAlt }]}
          onPress={handleSave}
          disabled={!dirty}
          activeOpacity={0.8}
        >
          <Text style={[s.saveTxt, { color: dirty ? '#000' : colors.textDim }]}>
            {dirty ? 'SALVEAZĂ PRAGURILE' : 'SALVAT'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.resetBtn, { borderColor: colors.border }]} onPress={handleReset}>
          <Text style={[s.resetTxt, { color: colors.textMuted }]}>RESETEAZĂ LA VALORI IMPLICITE</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  backBtn: { paddingHorizontal: 16, paddingBottom: 8 },
  backTxt: { fontSize: 17 },
  content: { padding: 16, paddingTop: 0, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  sub: { fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, marginTop: 2, marginBottom: 16 },
  infoCard: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  infoTxt: { fontSize: 11, lineHeight: 17 },
  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 16, marginBottom: 8 },
  card: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 13, fontWeight: '700' },
  hint: { fontSize: 9, fontFamily: 'monospace', marginBottom: 8, lineHeight: 13 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prefix: { fontSize: 10, fontFamily: 'monospace' },
  input: { width: 90, padding: 8, borderWidth: 1, borderRadius: 6, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  unit: { fontSize: 10, fontFamily: 'monospace' },
  preview: { marginTop: 8, padding: 8, borderWidth: 1, borderStyle: 'dashed', borderRadius: 6 },
  previewTxt: { fontSize: 9, fontFamily: 'monospace' },
  saveBtn: { padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  saveTxt: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  resetBtn: { padding: 12, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginTop: 8 },
  resetTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
});
