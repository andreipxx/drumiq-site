import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FOUNDING_KEY_LEGACY = '@drumiq_founding_member';
const FOUNDING_KEY = 'drumiq_founding_member';

export async function isFoundingMember(): Promise<boolean> {
  // Try SecureStore first (new location)
  const secure = await SecureStore.getItemAsync(FOUNDING_KEY);
  if (secure !== null) return secure === 'true';
  // Migrate from AsyncStorage if present
  const legacy = await AsyncStorage.getItem(FOUNDING_KEY_LEGACY);
  if (legacy !== null) {
    await SecureStore.setItemAsync(FOUNDING_KEY, legacy);
    await AsyncStorage.removeItem(FOUNDING_KEY_LEGACY);
    return legacy === 'true';
  }
  return false;
}

export async function setFoundingMember(value: boolean): Promise<void> {
  await SecureStore.setItemAsync(FOUNDING_KEY, value ? 'true' : 'false');
  // Clean up legacy key if it still exists
  await AsyncStorage.removeItem(FOUNDING_KEY_LEGACY).catch(() => {});
}

export function FoundingBadge({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <View style={s.badgeSmall}>
        <Text style={s.badgeSmallText}>{'⭐'} FM</Text>
      </View>
    );
  }
  return (
    <View style={s.badge}>
      <Text style={s.badgeIcon}>{'⭐'}</Text>
      <View>
        <Text style={s.badgeTitle}>Founding Member</Text>
        <Text style={s.badgeSub}>Preț blocat pe viață · Mulțumim că ai fost printre primii!</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#E8B27A15', borderColor: '#E8B27A40', borderWidth: 1,
    borderRadius: 10, padding: 12, marginHorizontal: 16, marginVertical: 6,
  },
  badgeIcon: { fontSize: 24 },
  badgeTitle: { color: '#E8B27A', fontSize: 14, fontWeight: '700' },
  badgeSub: { color: '#a89580', fontSize: 11, marginTop: 2 },
  badgeSmall: {
    backgroundColor: '#E8B27A20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeSmallText: { color: '#E8B27A', fontSize: 10, fontWeight: '700' },
});
