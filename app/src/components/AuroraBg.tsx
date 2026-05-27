import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';

// Full-screen aurora gradient wash (violet → dark/light → cyan diagonal).
// Render as the first child of a screen's root View so it sits behind content.
export default function AuroraBg() {
  const { colors } = useTheme();
  return (
    <LinearGradient
      colors={colors.gradAurora}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}
