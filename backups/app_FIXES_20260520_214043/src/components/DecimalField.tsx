import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';

interface DecimalFieldProps {
  label: string;
  hint?: string;
  suffix: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  colors: any;
  /** Optional custom container style */
  containerStyle?: any;
}

/**
 * Decimal-only TextInput with local string state for fluid typing.
 * Solves: native state-as-number causes "7." -> parseFloat -> 7 -> redisplay -> "7" (decimal lost).
 * Accepts both "." and "," as separator (RO locale friendly).
 */
export default function DecimalField({
  label, hint, suffix, value, onChange, min, max, colors, containerStyle,
}: DecimalFieldProps) {
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
      if (isNaN(num)) return;
      if (min != null && num < min) return;
      if (max != null && num > max) return;
      onChange(num);
    }
  };

  return (
    <View style={[s.fieldRow, containerStyle]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.fieldLabel, { color: colors.text }]}>{label}</Text>
        {hint && <Text style={[s.fieldHint, { color: colors.textTertiary }]}>{hint}</Text>}
      </View>
      <View style={s.fieldRight}>
        <TextInput
          value={localValue}
          onChangeText={handleChange}
          keyboardType="decimal-pad"
          style={[s.input, { color: colors.text, backgroundColor: colors.bg, borderColor: colors.border }]}
          selectionColor={colors.accent}
        />
        <Text style={[s.suffix, { color: colors.textTertiary }]}>{suffix}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  fieldRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  fieldLabel: { fontSize: 15, fontWeight: '500' },
  fieldHint:  { fontSize: 12, marginTop: 4, lineHeight: 16 },
  fieldRight: { flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  input:      { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, minWidth: 70, textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 15 },
  suffix:     { fontSize: 14, marginLeft: 6, minWidth: 30 },
});
