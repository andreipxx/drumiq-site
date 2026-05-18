import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import WorkModeSetup from '../components/WorkModeSetup';
import { getWorkMode, setWorkMode, type WorkModeConfig } from '../services/workMode';

interface Props { onBack: () => void; }

export default function WorkModeScreen({ onBack }: Props) {
  const { colors } = useTheme();
  const [config, setConfig] = useState<WorkModeConfig | null>(null);

  useEffect(() => { getWorkMode().then(setConfig); }, []);

  if (!config) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.6}>
        <Text style={[s.backText, { color: colors.accent }]}>{'‹ Setări'}</Text>
      </TouchableOpacity>
      <WorkModeSetup
        initialConfig={config}
        onSave={async (cfg) => {
          await setWorkMode(cfg);
          onBack();
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  backBtn: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 8 },
  backText: { fontSize: 17 },
});
