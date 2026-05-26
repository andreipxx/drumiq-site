import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import type {
  WorkMode, WorkModeConfig, IndividualCosts, FlotaCosts,
} from '../services/workMode';
import {
  DEFAULT_INDIVIDUAL, DEFAULT_FLOTA, getWeeklyCosts, getMonthlyCosts,
} from '../services/workMode';
import {
  getTaxSettings, setTaxSettings, type TaxSettings, DEFAULT_TAX,
} from '../services/extendedSettings';

interface Props {
  onSave: (config: WorkModeConfig) => void;
  initialConfig?: WorkModeConfig;
}

export default function WorkModeSetup({ onSave, initialConfig }: Props) {
  const { colors } = useTheme();
  const [mode, setMode] = useState<WorkMode>(initialConfig?.mode ?? 'individual');
  const [individual, setIndividual] = useState<IndividualCosts>(
    initialConfig?.individual ?? DEFAULT_INDIVIDUAL
  );
  const [flota, setFlota] = useState<FlotaCosts>(
    initialConfig?.flota ?? DEFAULT_FLOTA
  );
  const [tax, setTaxState] = useState<TaxSettings | null>(null);

  useEffect(() => { getTaxSettings().then(setTaxState); }, []);

  const config: WorkModeConfig = { mode, individual, flota };
  const weeklyCost = useMemo(() => getWeeklyCosts(config), [mode, individual, flota]);
  const monthlyCost = useMemo(() => getMonthlyCosts(config), [mode, individual, flota]);

  const handleSave = async () => {
    if (tax) await setTaxSettings(tax);
    onSave(config);
  };

  return (
    <ScrollView style={[s.root, { backgroundColor: colors.bg }]} contentContainerStyle={s.content}>
      <Text style={[s.title, { color: colors.text }]}>Cum lucrezi?</Text>
      <Text style={[s.subtitle, { color: colors.textMuted }]}>
        Alege modul de lucru ca DRUMIQ să calculeze corect
      </Text>

      <View style={s.modeRow}>
        <TouchableOpacity
          onPress={() => setMode('individual')}
          style={[
            s.modeCard,
            { borderColor: mode === 'individual' ? colors.accent : colors.border,
              backgroundColor: mode === 'individual' ? colors.accent + '15' : colors.surface },
          ]}
          activeOpacity={0.7}
        >
          <Text style={[s.modeIcon, { color: mode === 'individual' ? colors.accent : colors.text }]}>
            {'👤'}
          </Text>
          <Text style={[s.modeLabel, { color: mode === 'individual' ? colors.accent : colors.text }]}>
            Individual / PFA / SRL
          </Text>
          <Text style={[s.modeDesc, { color: colors.textMuted }]}>
            Lucrezi pe cont propriu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode('flota')}
          style={[
            s.modeCard,
            { borderColor: mode === 'flota' ? colors.accent : colors.border,
              backgroundColor: mode === 'flota' ? colors.accent + '15' : colors.surface },
          ]}
          activeOpacity={0.7}
        >
          <Text style={[s.modeIcon, { color: mode === 'flota' ? colors.accent : colors.text }]}>
            {'🚗'}
          </Text>
          <Text style={[s.modeLabel, { color: mode === 'flota' ? colors.accent : colors.text }]}>
            Flotă / mașină închiriată
          </Text>
          <Text style={[s.modeDesc, { color: colors.textMuted }]}>
            Plătești chirie și carte de muncă
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'individual' && (
        <View style={[s.costSection, { borderColor: colors.border }]}>
          <Text style={[s.costSectionTitle, { color: colors.textMuted }]}>COSTURI INDIVIDUALE</Text>
          <CostInput
            label="Contabilitate"
            value={individual.contabilitate}
            onChange={(v) => setIndividual({ ...individual, contabilitate: v })}
            suffix="RON/lună"
            colors={colors}
          />
          <CostInput
            label="Alte cheltuieli"
            value={individual.alteCheltuieli}
            onChange={(v) => setIndividual({ ...individual, alteCheltuieli: v })}
            suffix="RON/săpt."
            colors={colors}
          />
        </View>
      )}

      {mode === 'flota' && (
        <View style={[s.costSection, { borderColor: colors.border }]}>
          <Text style={[s.costSectionTitle, { color: colors.textMuted }]}>COSTURI FLOTĂ</Text>
          <CostInput
            label="Chirie mașină"
            value={flota.chirieMasina}
            onChange={(v) => setFlota({ ...flota, chirieMasina: v })}
            suffix="RON/săpt."
            placeholder="550"
            colors={colors}
          />
          <CostInput
            label="Carte muncă / contract"
            value={flota.carteMunca}
            onChange={(v) => setFlota({ ...flota, carteMunca: v })}
            suffix="RON/săpt."
            placeholder="200"
            colors={colors}
          />
          <CostInput
            label="Contabilitate"
            value={flota.contabilitate}
            onChange={(v) => setFlota({ ...flota, contabilitate: v })}
            suffix="RON/săpt."
            placeholder="50"
            colors={colors}
          />
          <CostInput
            label="Alte cheltuieli"
            value={flota.alteCheltuieli}
            onChange={(v) => setFlota({ ...flota, alteCheltuieli: v })}
            suffix="RON/săpt."
            colors={colors}
          />

          <View style={[s.totalBox, { backgroundColor: colors.accent + '10', borderColor: colors.accent + '30' }]}>
            <View style={s.totalRow}>
              <Text style={[s.totalLabel, { color: colors.text }]}>Total săptămânal:</Text>
              <Text style={[s.totalValue, { color: colors.accent }]}>{weeklyCost.toFixed(0)} RON</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={[s.totalLabel, { color: colors.text }]}>Total lunar:</Text>
              <Text style={[s.totalValue, { color: colors.accent }]}>{monthlyCost.toFixed(0)} RON</Text>
            </View>
          </View>
        </View>
      )}

      {mode === 'individual' && (
        <View style={[s.totalBox, { backgroundColor: colors.accent + '10', borderColor: colors.accent + '30', marginHorizontal: 0, marginTop: 12 }]}>
          <View style={s.totalRow}>
            <Text style={[s.totalLabel, { color: colors.text }]}>Total săptămânal:</Text>
            <Text style={[s.totalValue, { color: colors.accent }]}>{weeklyCost.toFixed(0)} RON</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={[s.totalLabel, { color: colors.text }]}>Total lunar:</Text>
            <Text style={[s.totalValue, { color: colors.accent }]}>{monthlyCost.toFixed(0)} RON</Text>
          </View>
        </View>
      )}

      <View style={[s.costSection, { borderColor: colors.border, marginTop: 20 }]}>
        <Text style={[s.costSectionTitle, { color: colors.textMuted }]}>TAXE</Text>
        {tax === null ? (
          <View style={{ padding: 16, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : (
          <>
            <CostInput
              label="Taxe pe venit"
              value={tax.taxRate}
              onChange={(v) => setTaxState(prev => prev ? { ...prev, taxRate: v } : prev)}
              suffix="%"
              placeholder="0"
              colors={colors}
            />
            <CostInput
              label="Comision Bolt"
              value={tax.boltCommission}
              onChange={(v) => setTaxState(prev => prev ? { ...prev, boltCommission: v } : prev)}
              suffix="%"
              placeholder="0"
              colors={colors}
            />
            <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
              <Text style={[s.costSuffix, { color: colors.textMuted, marginLeft: 0 }]}>
                Taxele se aplică estimativ pe venitul cursei. Dacă Bolt arată deja suma netă, lasă 0%.
              </Text>
            </View>
          </>
        )}
      </View>

      <TouchableOpacity
        style={[s.saveBtn, { backgroundColor: colors.accent }]}
        onPress={handleSave}
        activeOpacity={0.7}
      >
        <Text style={s.saveBtnText}>SALVEAZĂ</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function CostInput({ label, value, onChange, suffix, placeholder, colors }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
  placeholder?: string;
  colors: any;
}) {
  const [text, setText] = useState(value > 0 ? String(value) : '');

  useEffect(() => {
    setText(value > 0 ? String(value) : '');
  }, [value]);

  const handleChange = (t: string) => {
    const normalized = t.replace(',', '.');
    if (!/^\d*\.?\d*$/.test(normalized)) return;
    setText(t);
    const num = parseFloat(normalized);
    onChange(isNaN(num) ? 0 : num);
  };

  return (
    <View style={[s.costRow, { borderBottomColor: colors.border }]}>
      <Text style={[s.costLabel, { color: colors.text }]}>{label}</Text>
      <View style={s.costRight}>
        <TextInput
          value={text}
          onChangeText={handleChange}
          keyboardType="decimal-pad"
          placeholder={placeholder ?? '0'}
          placeholderTextColor={colors.textMuted}
          style={[s.costInput, {
            color: colors.text,
            backgroundColor: colors.bg,
            borderColor: colors.border,
          }]}
          selectionColor={colors.accent}
        />
        <Text style={[s.costSuffix, { color: colors.textMuted }]}>{suffix}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 24, paddingTop: 48, paddingBottom: 64 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 28 },
  modeRow: { gap: 12, marginBottom: 20 },
  modeCard: {
    borderWidth: 1.5, borderRadius: 14, padding: 18, alignItems: 'center',
  },
  modeIcon: { fontSize: 28, marginBottom: 8 },
  modeLabel: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  modeDesc: { fontSize: 12, marginTop: 4, textAlign: 'center' },
  costSection: { borderWidth: 1, borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  costSectionTitle: {
    fontSize: 11, letterSpacing: 1.5, fontWeight: '700', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
  },
  costRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  costLabel: { fontSize: 14, fontWeight: '500', flex: 1 },
  costRight: { flexDirection: 'row', alignItems: 'center' },
  costInput: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 10, minWidth: 70,
    textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 15, fontWeight: '600',
  },
  costSuffix: { fontSize: 11, marginLeft: 6, minWidth: 60 },
  totalBox: {
    borderWidth: 1, borderRadius: 10, padding: 14, marginTop: 12, marginHorizontal: 16,
  },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4,
  },
  totalLabel: { fontSize: 14, fontWeight: '500' },
  totalValue: { fontSize: 16, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  saveBtn: {
    marginTop: 28, paddingVertical: 16, borderRadius: 12, alignItems: 'center',
  },
  saveBtnText: { color: '#000', fontSize: 15, fontWeight: '900', letterSpacing: 1.5 },
});
