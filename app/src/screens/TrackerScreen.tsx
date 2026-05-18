// DRUMIQ v1.0.0 — Tracker Screen
// Tabs: Azi / Săptămânal / Total. Auto-detected ride list with stats.

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { getStatsForPeriod, getRidesForPeriod, clearAllRides, formatDuration } from '../services/tracker';
import { VERDICT_DISPLAY } from '../types';
import type { TrackerPeriod, Ride, TrackerStats } from '../types';

const TABS: { key: TrackerPeriod; label: string }[] = [
  { key: 'today', label: 'AZI' },
  { key: 'week',  label: 'SĂPTĂMÂNAL' },
  { key: 'total', label: 'TOTAL' },
];

type StatusFilter = 'completed' | 'accepted' | 'all';
const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'completed', label: 'FINALIZATE' },
  { key: 'accepted',  label: 'ACCEPTATE' },
  { key: 'all',       label: 'TOATE' },
];

export default function TrackerScreen() {
  const { colors } = useTheme();
  const [period, setPeriod] = useState<TrackerPeriod>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('completed');
  const [stats, setStats] = useState<TrackerStats | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([
        getStatsForPeriod(period),
        getRidesForPeriod(period),
      ]);
      setStats(s);
      const filtered = statusFilter === 'all' ? r
        : statusFilter === 'completed' ? r.filter(ride => ride.completed)
        : r.filter(ride => ride.accepted);
      setRides(filtered);
    } catch {}
  }, [period, statusFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  const onRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };

  const handleClearAll = () => {
    Alert.alert(
      'Șterge toate datele?',
      'Toate cursele înregistrate vor fi șterse permanent.',
      [
        { text: 'Anulează', style: 'cancel' },
        { text: 'Șterge tot', style: 'destructive', onPress: async () => { await clearAllRides(); await refresh(); } },
      ]
    );
  };

  return (
    <ScrollView
      style={[s.root, { backgroundColor: colors.bg }]}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <Text style={[s.title, { color: colors.text }]}>TRACKER<Text style={{ color: colors.accent }}> CÂȘTIGURI</Text></Text>
      <Text style={[s.sub, { color: colors.textMuted }]}>auto-detectate la accept Bolt</Text>

      {/* Period tabs */}
      <View style={s.tabs}>
        {TABS.map((t) => {
          const active = t.key === period;
          return (
            <TouchableOpacity
              key={t.key}
              style={[
                s.tab,
                { backgroundColor: active ? colors.accent : colors.surface, borderColor: active ? colors.accent : colors.border },
              ]}
              onPress={() => setPeriod(t.key)}
              activeOpacity={0.7}
            >
              <Text style={[s.tabLbl, { color: active ? '#000' : colors.textMuted }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Status filter */}
      <View style={s.tabs}>
        {STATUS_FILTERS.map((f) => {
          const active = f.key === statusFilter;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                s.tab,
                { backgroundColor: active ? colors.go + '33' : colors.surface, borderColor: active ? colors.go : colors.border },
              ]}
              onPress={() => setStatusFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[s.tabLbl, { color: active ? colors.go : colors.textMuted }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Stats grid */}
      <View style={s.statGrid}>
        <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.statLbl, { color: colors.textMuted }]}>CÂȘTIGURI</Text>
          <Text style={[s.statVal, { color: colors.go }]}>
            {stats?.earningsLei.toFixed(0) ?? '0'}<Text style={[s.statUnit, { color: colors.textMuted }]}> lei</Text>
          </Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.statLbl, { color: colors.textMuted }]}>FINALIZATE / OFERTE</Text>
          <Text style={[s.statVal, { color: colors.text }]}>{stats?.ridesCount ?? 0}<Text style={[s.statUnit, { color: colors.textMuted }]}> / {stats?.offersCount ?? 0}</Text></Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.statLbl, { color: colors.textMuted }]}>DISTANȚĂ</Text>
          <Text style={[s.statVal, { color: colors.text }]}>
            {stats?.distanceKm.toFixed(0) ?? '0'}<Text style={[s.statUnit, { color: colors.textMuted }]}> km</Text>
          </Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.statLbl, { color: colors.textMuted }]}>TIMP TOTAL</Text>
          <Text style={[s.statVal, { color: colors.text }]}>{stats ? formatDuration(stats.durationMin) : '0min'}</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.statLbl, { color: colors.textMuted }]}>MEDIE LEI/KM</Text>
          <Text style={[s.statVal, { color: colors.go }]}>{stats?.avgPpkm.toFixed(2) ?? '0.00'}</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.statLbl, { color: colors.textMuted }]}>MEDIE LEI/MIN</Text>
          <Text style={[s.statVal, { color: colors.think }]}>{stats?.avgPpmin.toFixed(2) ?? '0.00'}</Text>
        </View>
      </View>

      {/* Ride list */}
      <Text style={[s.sectionLbl, { color: colors.textMuted }]}>CURSE INDIVIDUALE</Text>
      {rides.length === 0 ? (
        <View style={[s.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.emptyTxt, { color: colors.textMuted }]}>
            Nicio cursă în această perioadă.{'\n'}DRUMIQ înregistrează automat la accept Bolt.
          </Text>
        </View>
      ) : (
        rides.map((r) => {
          const v = VERDICT_DISPLAY[r.verdict];
          const dt = new Date(r.timestamp);
          const dateStr = `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')} · ${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
          const status = r.completed ? 'finalizată' : r.accepted ? 'acceptată' : 'oferită';
          const statusColor = r.completed ? colors.go : r.accepted ? colors.think : colors.textMuted;
          return (
            <View key={r.id} style={[s.ride, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: v.color }]}>
              <View style={s.rideTop}>
                <Text style={[s.rideTime, { color: colors.textMuted }]}>{dateStr}</Text>
                <Text style={[s.ridePrice, { color: colors.text }]}>{r.grossEarnings.toFixed(2)} lei</Text>
              </View>
              {(r.pickupAddress || r.destinationAddress) && (
                <Text style={[s.rideAddr, { color: colors.textMuted }]} numberOfLines={1}>
                  {(r.pickupAddress || '?').slice(0, 30)} → {(r.destinationAddress || '?').slice(0, 30)}
                </Text>
              )}
              <View style={s.rideBottom}>
                <Text style={[s.rideMeta, { color: colors.textMuted }]}>
                  {r.tripKm.toFixed(1)}km · {Math.round(r.durationMin)}min · {r.source === 'api' ? '✓ Google' : '~ est'}
                </Text>
                <View style={s.rideRight}>
                  <Text style={[s.rideStatus, { color: statusColor }]}>{status}</Text>
                  <Text style={[s.rideVerdict, { color: v.color }]}>{v.symbol} {r.profitPerKm.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          );
        })
      )}

      {rides.length > 0 && (
        <TouchableOpacity
          style={[s.dangerBtn, { borderColor: colors.stop }]}
          onPress={handleClearAll}
          activeOpacity={0.7}
        >
          <Text style={[s.dangerTxt, { color: colors.stop }]}>🗑  ȘTERGE TOATE DATELE</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  title: { fontSize: 22, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  sub: { fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, marginTop: 2, marginBottom: 12 },

  tabs: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  tab: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  tabLbl: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statCard: { width: '48.5%', borderWidth: 1, borderRadius: 10, padding: 12 },
  statLbl: { fontSize: 8, letterSpacing: 2, fontWeight: '700', marginBottom: 4 },
  statVal: { fontSize: 22, fontWeight: '700', fontFamily: 'monospace' },
  statUnit: { fontSize: 11, fontWeight: '500' },

  sectionLbl: { fontSize: 10, letterSpacing: 2.5, fontWeight: '900', marginBottom: 10, marginTop: 4 },

  empty: { padding: 20, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  emptyTxt: { fontSize: 12, textAlign: 'center', lineHeight: 18 },

  ride: { padding: 10, borderRadius: 8, borderWidth: 1, borderLeftWidth: 3, marginBottom: 6 },
  rideTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  rideTime: { fontSize: 10, fontFamily: 'monospace' },
  ridePrice: { fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
  rideAddr: { fontSize: 9, fontFamily: 'monospace', marginBottom: 4 },
  rideBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rideMeta: { fontSize: 9, fontFamily: 'monospace' },
  rideRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rideStatus: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  rideVerdict: { fontSize: 11, fontWeight: '700' },

  dangerBtn: { padding: 14, borderRadius: 8, borderWidth: 1, alignItems: 'center', marginTop: 16 },
  dangerTxt: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
});
