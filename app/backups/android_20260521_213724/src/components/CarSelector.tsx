import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import carsData from '../data/cars.json';

interface Engine {
  name: string;
  fuel: string;
  wear: number;
}

interface CarModel {
  brand: string;
  model: string;
  engines: Engine[];
}

interface Props {
  onSelect: (brand: string, model: string, engine: Engine) => void;
}

export default function CarSelector({ onSelect }: Props) {
  const { colors } = useTheme();
  const cars = carsData as CarModel[];

  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const brands = useMemo(() => [...new Set(cars.map(c => c.brand))], []);

  const filteredBrands = useMemo(() => {
    if (!search.trim()) return brands;
    const q = search.toLowerCase();
    return brands.filter(b => b.toLowerCase().includes(q));
  }, [brands, search]);

  const models = useMemo(() =>
    selectedBrand ? cars.filter(c => c.brand === selectedBrand) : [],
    [selectedBrand]
  );
  const engines = useMemo(() => {
    if (!selectedBrand || !selectedModel) return [];
    return cars.find(c => c.brand === selectedBrand && c.model === selectedModel)?.engines ?? [];
  }, [selectedBrand, selectedModel]);

  const renderPills = (items: string[], selected: string | null, onPress: (v: string) => void) => (
    <View style={s.pillWrap}>
      {items.map(item => (
        <TouchableOpacity
          key={item}
          onPress={() => onPress(item)}
          style={[s.pill, { borderColor: item === selected ? colors.accent : colors.border, backgroundColor: item === selected ? colors.accent + '20' : colors.surface }]}
        >
          <Text style={[s.pillTxt, { color: item === selected ? colors.accent : colors.text }]}>{item}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={s.container}>
      <Text style={[s.label, { color: colors.textMuted }]}>MARCĂ</Text>
      <TextInput
        style={[s.searchInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
        placeholder="Caută marca..."
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={(t) => { setSearch(t); setSelectedBrand(null); setSelectedModel(null); }}
      />
      {renderPills(filteredBrands, selectedBrand, (b) => { setSelectedBrand(b); setSelectedModel(null); setSearch(''); })}

      {selectedBrand && (
        <>
          <Text style={[s.label, { color: colors.textMuted }]}>MODEL</Text>
          {renderPills(models.map(m => m.model), selectedModel, setSelectedModel)}
        </>
      )}

      {/* MOTOR step: apare cand un model are engines definite in cars.json.
         Multe modele au o singura optiune generica ("Standard (setez manual)"),
         dar unele (Dacia Duster, BMW Seria 3, Hyundai Tucson, Kia Ceed etc.)
         au mai multe motorizari specifice cu consum/uzura diferita.
         Userul trebuie sa confirme selectia — la tap se apeleaza onSelect(). */}
      {engines.length > 0 && (
        <>
          <Text style={[s.label, { color: colors.textMuted }]}>MOTOR</Text>
          {engines.map(eng => (
            <TouchableOpacity
              key={eng.name}
              onPress={() => onSelect(selectedBrand!, selectedModel!, eng)}
              style={[s.engineRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[s.engineName, { color: colors.text }]}>{eng.name}</Text>
                <Text style={[s.engineFuel, { color: colors.textMuted }]}>{eng.fuel}</Text>
              </View>
              <Text style={[s.engineWear, { color: colors.accent }]}>{eng.wear} RON/km</Text>
            </TouchableOpacity>
          ))}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { width: '100%' },
  label: { fontSize: 10, letterSpacing: 2, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  searchInput: {
    height: 40, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14,
    fontSize: 14, marginBottom: 10,
  },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  pillTxt: { fontSize: 13, fontWeight: '600' },
  engineRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  engineName: { fontSize: 14, fontWeight: '600' },
  engineFuel: { fontSize: 11, marginTop: 2 },
  engineWear: { fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
});
