// DRUMIQ v2.0.0 — Praguri profitabilitate (Aurora theme)

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import AuroraBg from '../components/AuroraBg';
import { FONT, SIZE, RADIUS, GAP } from '../constants/typography';
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

export default function FilterSettingsScreen({ onBack }: Props) {
  const { colors, fontsLoaded: ff } = useTheme();
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
    return <View style={[st.root, { backgroundColor: colors.bg }]} />;
  }

  return (
    <View style={[st.root, { backgroundColor: colors.bg }]}>
      <AuroraBg />
      {/* Back button */}
      <TouchableOpacity onPress={onBack} style={[st.backBtn, { paddingTop: insets.top + 8 }]}>
        <Text style={[st.backTxt, {
          color: colors.cyan,
          fontFamily: ff ? FONT.bodySB : FONT.system,
        }]}>‹ Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={[st.title, {
          color: colors.text,
          fontFamily: ff ? FONT.display : FONT.system,
        }]}>
          Praguri{' '}
          <Text style={{ fontFamily: ff ? FONT.serifItalic : FONT.system, color: colors.cyan }}>
            profitabilitate
          </Text>
        </Text>
        <Text style={[st.sub, {
          color: colors.textMuted,
          fontFamily: ff ? FONT.mono : FONT.systemMono,
        }]}>
          {'// o singură sursă de adevăr pentru verdicte'}
        </Text>

        {/* Legend card */}
        <View style={[st.legendCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
          <Text style={[st.legendTxt, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
            <Text style={{ color: colors.stop, fontWeight: '700' }}>X</Text> sub minim ·{' '}
            <Text style={{ color: colors.think, fontWeight: '700' }}>?</Text> zona galbenă ·{' '}
            <Text style={{ color: colors.go, fontWeight: '700' }}>$</Text> profitabil
          </Text>
        </View>

        {/* ═══ PROFIT THRESHOLDS ═══ */}
        <SectionLabel text="Prag profit (alege unul)" colors={colors} ff={ff} />
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
              style={[st.card, {
                backgroundColor: colors.bgCard,
                borderColor: isActive ? colors.go : colors.borderSoft,
                borderWidth: isActive ? 2 : 1,
              }]}
            >
              <View style={st.cardHeader}>
                <Text style={[st.cardTitle, {
                  color: isActive ? colors.go : colors.text,
                  fontFamily: ff ? FONT.bodySB : FONT.system,
                }]}>
                  {isActive ? '◉' : '○'}  {THRESHOLD_ICONS[field]}  {THRESHOLD_LABELS[field]}
                </Text>
              </View>
              <Text style={[st.hint, {
                color: colors.textFaint,
                fontFamily: ff ? FONT.mono : FONT.systemMono,
              }]}>{THRESHOLD_HINTS[field]}</Text>
              {isActive && (
                <View style={st.inputRow}>
                  <Text style={[st.prefix, {
                    color: colors.textMuted,
                    fontFamily: ff ? FONT.mono : FONT.systemMono,
                  }]}>Minim</Text>
                  <TextInput
                    style={[st.input, {
                      backgroundColor: colors.bgInput,
                      borderColor: colors.border,
                      color: colors.text,
                      fontFamily: ff ? FONT.monoBold : FONT.systemMono,
                    }]}
                    value={inputText[field]}
                    onChangeText={txt => {
                      const cleaned = txt.replace(/[^0-9.,]/g, '');
                      setInputText(prev => ({ ...prev, [field]: cleaned }));
                      const n = parseFloat(cleaned.replace(',', '.'));
                      if (!isNaN(n) && isFinite(n)) update({ [field]: n });
                    }}
                    keyboardType="decimal-pad"
                    selectionColor={colors.cyan}
                  />
                  <Text style={[st.unit, {
                    color: colors.textMuted,
                    fontFamily: ff ? FONT.mono : FONT.systemMono,
                  }]}>{THRESHOLD_UNITS[field]}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* ═══ YELLOW ZONE ═══ */}
        <SectionLabel text="Zona galbenă" colors={colors} ff={ff} />
        <View style={[st.card, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
          <View style={st.cardHeader}>
            <Text style={[st.cardTitle, {
              color: colors.text,
              fontFamily: ff ? FONT.bodySB : FONT.system,
            }]}>
              {THRESHOLD_ICONS.yellowZone}  {THRESHOLD_LABELS.yellowZone}
            </Text>
          </View>
          <Text style={[st.hint, {
            color: colors.textFaint,
            fontFamily: ff ? FONT.mono : FONT.systemMono,
          }]}>{THRESHOLD_HINTS.yellowZone}</Text>
          <View style={st.inputRow}>
            <TextInput
              style={[st.input, {
                backgroundColor: colors.bgInput,
                borderColor: colors.border,
                color: colors.text,
                fontFamily: ff ? FONT.monoBold : FONT.systemMono,
              }]}
              value={inputText.yellowZone}
              onChangeText={txt => {
                const cleaned = txt.replace(/[^0-9.,]/g, '');
                setInputText(prev => ({ ...prev, yellowZone: cleaned }));
                const n = parseFloat(cleaned.replace(',', '.'));
                if (!isNaN(n) && isFinite(n)) update({ yellowZone: n });
              }}
              keyboardType="decimal-pad"
              selectionColor={colors.cyan}
            />
            <Text style={[st.unit, {
              color: colors.textMuted,
              fontFamily: ff ? FONT.mono : FONT.systemMono,
            }]}>{THRESHOLD_UNITS.yellowZone}</Text>
          </View>
          <View style={[st.preview, { borderColor: colors.borderSoft }]}>
            <Text style={[st.previewTxt, {
              color: colors.textFaint,
              fontFamily: ff ? FONT.mono : FONT.systemMono,
            }]}>
              Ex: minim {thresholds.kmValue} RON/km → galben până la {(thresholds.kmValue * (1 + thresholds.yellowZone / 100)).toFixed(2)} RON/km
            </Text>
          </View>
        </View>

        {/* ═══ HARD FILTERS ═══ */}
        <SectionLabel text="Filtre dure (independent de profit)" colors={colors} ff={ff} />
        {HARD_FIELDS.map(({ field, toggle, prefix }) => (
          <View key={field} style={[st.card, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
            <View style={st.cardHeader}>
              <Text style={[st.cardTitle, {
                color: colors.text,
                fontFamily: ff ? FONT.bodySB : FONT.system,
              }]}>
                {THRESHOLD_ICONS[field]}  {THRESHOLD_LABELS[field]}
              </Text>
              <Switch
                value={(thresholds as any)[toggle]}
                onValueChange={v => update({ [toggle]: v })}
                thumbColor={colors.bgCardStrong}
                trackColor={{ true: colors.cyan, false: colors.border }}
              />
            </View>
            <Text style={[st.hint, {
              color: colors.textFaint,
              fontFamily: ff ? FONT.mono : FONT.systemMono,
            }]}>{THRESHOLD_HINTS[field]}</Text>
            <View style={st.inputRow}>
              <Text style={[st.prefix, {
                color: colors.textMuted,
                fontFamily: ff ? FONT.mono : FONT.systemMono,
              }]}>{prefix}</Text>
              <TextInput
                style={[st.input, {
                  backgroundColor: colors.bgInput,
                  borderColor: colors.border,
                  color: colors.text,
                  fontFamily: ff ? FONT.monoBold : FONT.systemMono,
                }]}
                value={inputText[field]}
                onChangeText={txt => {
                  const cleaned = txt.replace(/[^0-9.,]/g, '');
                  setInputText(prev => ({ ...prev, [field]: cleaned }));
                  const n = parseFloat(cleaned.replace(',', '.'));
                  if (!isNaN(n) && isFinite(n)) update({ [field]: n });
                }}
                keyboardType="decimal-pad"
                selectionColor={colors.cyan}
              />
              <Text style={[st.unit, {
                color: colors.textMuted,
                fontFamily: ff ? FONT.mono : FONT.systemMono,
              }]}>{THRESHOLD_UNITS[field]}</Text>
            </View>
          </View>
        ))}

        {/* Save button */}
        {dirty ? (
          <TouchableOpacity onPress={handleSave} activeOpacity={0.8} style={st.saveBtnWrap}>
            <LinearGradient
              colors={colors.gradButton}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={st.saveBtn}
            >
              <Text style={[st.saveTxt, { color: '#fff', fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
                SALVEAZĂ PRAGURILE
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={[st.saveBtn, { backgroundColor: colors.bgCardStrong }]}>
            <Text style={[st.saveTxt, { color: colors.textFaint, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
              SALVAT
            </Text>
          </View>
        )}

        {/* Reset button */}
        <TouchableOpacity style={[st.resetBtn, { borderColor: colors.borderSoft }]} onPress={handleReset}>
          <Text style={[st.resetTxt, {
            color: colors.textMuted,
            fontFamily: ff ? FONT.mono : FONT.systemMono,
          }]}>RESETEAZĂ LA VALORI IMPLICITE</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },

  // Back
  backBtn: { paddingHorizontal: 20, paddingBottom: 8, zIndex: 2 },
  backTxt: { fontSize: SIZE.lg },

  // Content
  content: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 40 },

  // Title
  title: { fontSize: SIZE.xl, letterSpacing: -0.5, marginTop: 4 },
  sub: { fontSize: SIZE.xs, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4, marginBottom: GAP.lg },

  // Section label
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginTop: GAP.xl, marginBottom: GAP.sm, gap: 10 },
  sectionText: { fontSize: SIZE.xs, letterSpacing: 1.5, textTransform: 'uppercase' },
  sectionLine: { flex: 1, height: 1, borderRadius: 1, opacity: 0.4 },

  // Legend
  legendCard: { padding: 14, borderRadius: RADIUS.md, borderWidth: 1, marginBottom: 4 },
  legendTxt: { fontSize: SIZE.sm, lineHeight: 17 },

  // Card
  card: { padding: 16, borderRadius: RADIUS.lg, borderWidth: 1, marginBottom: GAP.sm, overflow: 'hidden', position: 'relative' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: SIZE.base },
  hint: { fontSize: SIZE.xs, letterSpacing: 0.5, marginBottom: GAP.sm, lineHeight: 14 },

  // Input row
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prefix: { fontSize: SIZE.xs, letterSpacing: 0.5 },
  input: { width: 90, padding: 8, borderWidth: 1, borderRadius: RADIUS.sm, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  unit: { fontSize: SIZE.xs, letterSpacing: 0.5 },

  // Preview
  preview: { marginTop: GAP.sm, padding: 8, borderWidth: 1, borderStyle: 'dashed', borderRadius: RADIUS.sm },
  previewTxt: { fontSize: SIZE.xs, letterSpacing: 2 },

  // Save
  saveBtnWrap: { marginTop: GAP.xl },
  saveBtn: { padding: 16, borderRadius: RADIUS.md, alignItems: 'center', marginTop: GAP.xl },
  saveTxt: { fontSize: SIZE.sm, letterSpacing: 1.5 },

  // Reset
  resetBtn: { padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginTop: GAP.sm },
  resetTxt: { fontSize: SIZE.xs, letterSpacing: 1.5 },
});
