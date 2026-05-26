// DRUMIQ v1.0.0 — Bottom navigation tabs

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export type TabKey = 'home' | 'tracker' | 'plan' | 'profil' | 'settings';

interface TabDef {
  key: TabKey;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

const TABS: TabDef[] = [
  { key: 'home',     icon: 'home-outline',     label: 'ACASĂ' },
  { key: 'tracker',  icon: 'stats-chart',       label: 'TRACKER' },
  { key: 'plan',     icon: 'diamond-outline',   label: 'PLAN' },
  { key: 'profil',   icon: 'person-outline',    label: 'PROFIL' },
  { key: 'settings', icon: 'settings-outline',  label: 'SETĂRI' },
];

interface Props {
  current: TabKey;
  onChange: (k: TabKey) => void;
}

export default function BottomTabs({ current, onChange }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.root, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: 8 + insets.bottom }]}>
      {TABS.map((t) => {
        const active = t.key === current;
        return (
          <TouchableOpacity
            key={t.key}
            style={s.tab}
            onPress={() => onChange(t.key)}
            activeOpacity={0.7}
          >
            {active && <View style={[s.indicator, { backgroundColor: colors.accent, shadowColor: colors.accent }]} />}
            <Ionicons name={t.icon} size={20} color={active ? colors.accent : colors.textMuted} style={s.icon} />
            <Text style={[s.label, { color: active ? colors.accent : colors.textMuted }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  indicator: {
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
    width: '50%',
    height: 2,
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  icon: {
    marginBottom: 4,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
});
