// DRUMIQ v1.0.0 — Filter Settings Screen
// Toggle filters per plan tier (1 for trial, 4 for pro)

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import {
  loadFilters,
  saveFilters,
  resetFilters,
  isFilterAvailable,
  maxFiltersForPlan,
  FILTER_LABEL,
  FILTER_UNIT,
  FILTER_ICON,
} from '../services/filterEngine';
import { getLicenseState } from '../services/licenseManager';
import type { FilterSet, FilterKey, PlanTier } from '../types';
import { FILTER_AVAILABILITY } from '../types';

interface Props {
  onBack: () => void;
}

const FILTER_ORDER: FilterKey[] = ['maxPickupKm', 'minRating'];

const FILTER_HINTS: Record<FilterKey, string> = {
  minPpkm:     'Curse cu profit/km sub această valoare = REFUZ recomandat',
  minPpmin:    'Curse cu profit/min sub = REFUZ',
  maxPickupKm: 'Pickup peste această distanță = REFUZ (independent de profit)',
  minRating:   'Pasageri sub acest rating = REFUZ (siguranță)',
};

const FILTER_PREFIX: Record<FilterKey, string> = {
  minPpkm:     'Peste',
  minPpmin:    'Peste',
  maxPickupKm: 'Sub',
  minRating:   'Peste',
};

export default function FilterSettingsScreen({ onBack }: Props) {
  const { colors } = useTheme();
  const [plan, setPlan] = useState<PlanTier>('trial');
  const [filters, setFilters] = useState<FilterSet | null>(null);
  const [dirty, setDirty] = useState(false);
  const [inputText, setInputText] = useState<Record<FilterKey, string>>({
    minPpkm: '', minPpmin: '', maxPickupKm: '', minRating: '',
  });

  useEffect(() => {
    (async () => {
      const lic = await getLicenseState();
      if (lic.license) setPlan(lic.license.plan);
      const f = await loadFilters();
      setFilters(f);
      setInputText({
        minPpkm: String(f.minPpkm.value),
        minPpmin: String(f.minPpmin.value),
        maxPickupKm: String(f.maxPickupKm.value),
        minRating: String(f.minRating.value),
      });
    })();
  }, []);

  const updateFilter = useCallback((key: FilterKey, patch: Partial<{ enabled: boolean; value: number }>) => {
    setFilters((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: { ...prev[key], ...patch } };
      setDirty(true);
      return next;
    });
  }, []);

  const handleSave = async () => {
    if (!filters) return;
    const finalFilters: FilterSet = { ...filters };
    for (const k of FILTER_ORDER) {
      const txt = (inputText[k] ?? '').replace(',', '.');
      const n = parseFloat(txt);
      if (!isNaN(n) && isFinite(n)) {
        finalFilters[k] = { ...finalFilters[k], value: n };
      }
    }
    await saveFilters(finalFilters);
    setFilters(finalFilters);
    setInputText({
      minPpkm: String(finalFilters.minPpkm.value),
      minPpmin: String(finalFilters.minPpmin.value),
      maxPickupKm: String(finalFilters.maxPickupKm.value),
      minRating: String(finalFilters.minRating.value),
    });
    setDirty(false);
    Alert.alert('Salvat', 'Filtrele au fost salvate.');
  };

  const handleReset = async () => {
    Alert.alert(
      'Resetează filtrele?',
      'Toate filtrele vor reveni la valori implicite.',
      [
        { text: 'Anulează', style: 'cancel' },
        {
          text: 'Resetează',
          style: 'destructive',
          onPress: async () => {
            const f = await resetFilters();
            setFilters(f);
            setInputText({
              minPpkm: String(f.minPpkm.value),
              minPpmin: String(f.minPpmin.value),
              maxPickupKm: String(f.maxPickupKm.value),
              minRating: String(f.minRating.value),
            });
            setDirty(false);
          },
        },
      ]
    );
  };

  if (!filters) {
    return <View style={[s.root, { backgroundColor: colors.bg }]} />;
  }

  const max = maxFiltersForPlan(plan);
  const activeCount = FILTER_ORDER.filter((k) => filters[k].enabled && isFilterAvailable(k, plan)).length;

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <TouchableOpacity onPress={onBack} style={s.backBtn}>
        <Text style={[s.backTxt, { color: colors.accent }]}>‹ Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={s.content}>
        <Text style={[s.title, { color: colors.text }]}>FILTRE<Text style={{ color: colors.accent }}> CURSE</Text></Text>
        <Text style={[s.sub, { color: colors.textMuted }]}>{activeCount}/{max} ACTIVE · plan {plan.toUpperCase()}</Text>

        <View style={[s.infoCard, { backgroundColor: colors.surface, borderColor: colors.borderAccent }]}>
          <Text style={[s.infoTxt, { color: colors.textMuted }]}>
            Overlay apare la <Text style={{ color: colors.text, fontWeight: '700' }}>orice cursă</Text>: <Text style={{ color: '#FF3366', fontWeight: '700' }}>X</Text> refuză · <Text style={{ color: '#FFB800', fontWeight: '700' }}>?</Text> gândește · <Text style={{ color: colors.go, fontWeight: '700' }}>$</Text> acceptă. Filtrele active schimbă verdictul.
          </Text>
        </View>

        {FILTER_ORDER.map((key) => {
          const f = filters[key];
          const available = isFilterAvailable(key, plan);
          return (
            <View
              key={key}
              style={[
                s.filterCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: available ? 1 : 0.4,
                },
              ]}
            >
              <View style={s.filterHeader}>
                <View style={s.filterLeft}>
                  <Text style={[s.filterTitle, { color: colors.text }]}>
                    {FILTER_ICON[key]}  {FILTER_LABEL[key]}
                  </Text>
                  {!available && (
                    <View style={[s.lockPill, { borderColor: colors.border }]}>
                      <Text style={[s.lockTxt, { color: colors.textDim }]}>
                        🔒 PRO
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => available && updateFilter(key, { enabled: !f.enabled })}
                  disabled={!available}
                  activeOpacity={0.7}
                  style={[
                    s.toggle,
                    {
                      backgroundColor: f.enabled && available ? colors.go : colors.surfaceAlt,
                      borderColor: f.enabled && available ? colors.go : colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      s.toggleDot,
                      {
                        backgroundColor: f.enabled && available ? '#000' : colors.textMuted,
                        transform: [{ translateX: f.enabled ? 20 : 0 }],
                      },
                    ]}
                  />
                </TouchableOpacity>
              </View>

              <Text style={[s.filterHint, { color: colors.textDim }]}>{FILTER_HINTS[key]}</Text>

              <View style={s.filterInputRow}>
                <Text style={[s.filterPrefix, { color: colors.textMuted }]}>{FILTER_PREFIX[key]}</Text>
                <TextInput
                  style={[
                    s.filterInput,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={inputText[key]}
                  onChangeText={(txt) => {
                    const cleaned = txt.replace(/[^0-9.,]/g, '');
                    setInputText((prev) => ({ ...prev, [key]: cleaned }));
                    const n = parseFloat(cleaned.replace(',', '.'));
                    if (!isNaN(n) && isFinite(n)) {
                      updateFilter(key, { value: n });
                    }
                  }}
                  keyboardType="decimal-pad"
                  editable={available}
                />
                <Text style={[s.filterUnit, { color: colors.textMuted }]}>{FILTER_UNIT[key]}</Text>
              </View>
            </View>
          );
        })}

        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: dirty ? colors.accent : colors.surfaceAlt }]}
          onPress={handleSave}
          disabled={!dirty}
          activeOpacity={0.8}
        >
          <Text style={[s.saveTxt, { color: dirty ? '#000' : colors.textDim }]}>
            {dirty ? '💾  SALVEAZĂ FILTRELE' : 'SALVAT'}
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
  backBtn: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 8 },
  backTxt: { fontSize: 17 },
  content: { padding: 16, paddingTop: 0, paddingBottom: 40 },

  title: { fontSize: 22, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  sub: { fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, marginTop: 2, marginBottom: 16 },

  infoCard: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  infoTxt: { fontSize: 11, lineHeight: 17 },

  filterCard: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  filterLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  filterTitle: { fontSize: 13, fontWeight: '700' },
  lockPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  lockTxt: { fontSize: 8, fontWeight: '700', letterSpacing: 1 },

  toggle: { width: 44, height: 24, borderRadius: 12, borderWidth: 1, padding: 1, justifyContent: 'center' },
  toggleDot: { width: 18, height: 18, borderRadius: 9 },

  filterHint: { fontSize: 9, fontFamily: 'monospace', marginBottom: 8, lineHeight: 13 },

  filterInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterPrefix: { fontSize: 10, fontFamily: 'monospace' },
  filterInput: { width: 90, padding: 8, borderWidth: 1, borderRadius: 6, fontFamily: 'monospace', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  filterUnit: { fontSize: 10, fontFamily: 'monospace' },

  saveBtn: { padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  saveTxt: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },

  resetBtn: { padding: 12, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginTop: 8 },
  resetTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
});
