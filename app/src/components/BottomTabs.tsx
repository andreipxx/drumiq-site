// DRUMIQ v2.0.0 — Bottom navigation (Aurora theme)

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { FONT, SIZE } from '../constants/typography';

export type TabKey = 'home' | 'tracker' | 'plan' | 'profil' | 'settings';

interface TabDef {
  key: TabKey;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

const TABS: TabDef[] = [
  { key: 'home',     icon: 'home-outline',     label: 'Acasă' },
  { key: 'tracker',  icon: 'stats-chart',       label: 'Tracker' },
  { key: 'plan',     icon: 'diamond-outline',   label: 'Plan' },
  { key: 'profil',   icon: 'person-outline',    label: 'Profil' },
  { key: 'settings', icon: 'settings-outline',  label: 'Setări' },
];

interface Props {
  current: TabKey;
  onChange: (k: TabKey) => void;
}

export default function BottomTabs({ current, onChange }: Props) {
  const { colors, fontsLoaded: ff } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[st.root, {
      backgroundColor: colors.bgNav,
      borderTopColor: colors.borderSoft,
      paddingBottom: Math.max(24, insets.bottom),
    }]}>
      {TABS.map((t) => {
        const active = t.key === current;
        return (
          <TouchableOpacity
            key={t.key}
            style={st.tab}
            onPress={() => onChange(t.key)}
            activeOpacity={0.7}
          >
            {/* Active indicator — gradient line top with glow */}
            {active && (
              <LinearGradient
                colors={colors.gradPrimary}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[st.indicator, {
                  shadowColor: colors.pink,
                }]}
              />
            )}

            {/* Icon — gradient tint when active */}
            <Ionicons
              name={t.icon}
              size={20}
              color={active ? colors.cyan : colors.textMuted}
              style={st.icon}
            />

            {/* Label */}
            <Text style={[st.label, {
              color: active ? colors.text : colors.textMuted,
              fontFamily: ff ? FONT.mono : FONT.systemMono,
            }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  root: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 14,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: -14,
    width: 24,
    height: 2,
    borderRadius: 100,
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  icon: {
    marginBottom: 5,
  },
  label: {
    fontSize: SIZE.xs,
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
});
