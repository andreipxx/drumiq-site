import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import {
  getStatsForPeriod,
  getRidesForPeriod,
  clearAllRides,
  formatDuration,
  getWeeklyChartData,
  getStatsForDay,
  type DayEarnings,
} from '../services/tracker';
import { getDailyGoal } from '../services/userSettings';
import { VERDICT_DISPLAY } from '../types';
import type { TrackerPeriod, Ride, TrackerStats } from '../types';

const TABS: { key: TrackerPeriod; label: string }[] = [
  { key: 'today', label: 'AZI' },
  { key: 'week',  label: 'SAPTAMANAL' },
  { key: 'total', label: 'TOTAL' },
];

export default function TrackerScreen() {
  const { colors } = useTheme();
  const [period, setPeriod] = useState<TrackerPeriod>('today');
  const [stats, setStats] = useState<TrackerStats | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyGoal, setDailyGoalVal] = useState<number>(0);
  const [chartData, setChartData] = useState<DayEarnings[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayEarnings | null>(null);
  const [dayStats, setDayStats] = useState<TrackerStats | null>(null);
  const [dayRides, setDayRides] = useState<Ride[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [s, r, goal, chart] = await Promise.all([
        getStatsForPeriod(period),
        getRidesForPeriod(period),
        getDailyGoal(),
        getWeeklyChartData(),
      ]);
      setStats(s);
      setRides(r.filter(ride => ride.completed));
      setDailyGoalVal(goal);
      setChartData(chart);
      if (selectedDay) {
        const updated = chart.find(d => d.date === selectedDay.date);
        if (updated) {
          setSelectedDay(updated);
          const detail = await getStatsForDay(updated.date);
          setDayStats(detail.stats);
          setDayRides(detail.rides);
        }
      }
    } catch {}
  }, [period, selectedDay]);

  const handleDayPress = async (day: DayEarnings) => {
    if (selectedDay?.date === day.date) {
      setSelectedDay(null);
      setDayStats(null);
      setDayRides([]);
      return;
    }
    setSelectedDay(day);
    const detail = await getStatsForDay(day.date);
    setDayStats(detail.stats);
    setDayRides(detail.rides);
  };

  useEffect(() => { refresh(); }, [refresh]);

  const onRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };

  const handleClearAll = () => {
    Alert.alert(
      'Sterge toate datele?',
      'Toate cursele inregistrate vor fi sterse permanent.',
      [
        { text: 'Anuleaza', style: 'cancel' },
        { text: 'Sterge tot', style: 'destructive', onPress: async () => { await clearAllRides(); await refresh(); } },
      ]
    );
  };

  const earningsToday = stats?.earningsLei ?? 0;
  const goalPct = dailyGoal > 0 ? Math.min(100, (earningsToday / dailyGoal) * 100) : 0;
  const acceptRate = stats && stats.offersCount > 0 ? Math.round((stats.ridesCount / stats.offersCount) * 100) : null;
  const chartMax = Math.max(...chartData.map(d => d.earnings), 1);
  const chartAvg = chartData.length > 0
    ? Math.round(chartData.reduce((s, d) => s + d.earnings, 0) / chartData.length)
    : 0;

  return (
    <ScrollView
      style={[st.root, { backgroundColor: colors.bg }]}
      contentContainerStyle={st.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <Text style={[st.title, { color: colors.text }]}>TRACKER<Text style={{ color: colors.accent }}> CASTIGURI</Text></Text>
      <Text style={[st.sub, { color: colors.textMuted }]}>auto-detectate la accept Bolt</Text>

      {/* Hero earnings card */}
      <View style={[st.heroCard, {
        backgroundColor: colors.surfaceHigh,
        borderColor: colors.accent + '44',
        shadowColor: colors.accent,
        shadowOpacity: 0.25,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
      }]}>
        <View style={[st.heroBadge, { backgroundColor: colors.accent + '1A', borderColor: colors.accent + '44' }]}>
          <Text style={[st.heroBadgeTxt, { color: colors.go }]}>
            {period === 'today' ? 'AZI' : period === 'week' ? 'SAPT' : 'TOTAL'}
          </Text>
        </View>
        <Text style={[st.heroLabel, { color: colors.textMuted }]}>CASTIGURI NETE</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <Text style={[st.heroAmount, { color: colors.go }]}>{Math.round(earningsToday)}</Text>
          <Text style={[st.heroUnit, { color: colors.textMuted }]}> lei</Text>
        </View>
        <Text style={[st.heroSub, { color: colors.textDim }]}>
          {stats?.ridesCount ?? 0} curse finalizate din {stats?.offersCount ?? 0} oferte
        </Text>
      </View>

      {/* Daily goal */}
      {dailyGoal > 0 && (
        <View style={[st.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={st.goalRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 16 }}>&#127919;</Text>
              <Text style={[st.goalLabel, { color: colors.textMuted }]}>TARGET AZI</Text>
            </View>
            <Text style={[st.goalValue, { color: colors.text }]}>
              {Math.round(earningsToday)} / {dailyGoal}
              <Text style={[st.goalUnit, { color: colors.textMuted }]}> RON</Text>
            </Text>
          </View>
          <View style={[st.goalBarBg, { backgroundColor: colors.surfaceAlt }]}>
            <View style={[
              st.goalBarFill,
              {
                width: `${goalPct}%`,
                backgroundColor: earningsToday >= dailyGoal ? colors.go : colors.accentDeep,
              },
            ]}>
              <View style={[st.goalBarHighlight, {
                backgroundColor: earningsToday >= dailyGoal ? colors.go : colors.accent,
              }]} />
            </View>
          </View>
          <Text style={[st.goalSub, { color: colors.textDim }]}>
            {earningsToday >= dailyGoal ? 'Target atins!' : `Mai ai ${Math.round(dailyGoal - earningsToday)} RON`}
          </Text>
        </View>
      )}

      {/* Period tabs */}
      <View style={st.tabs}>
        {TABS.map((t) => {
          const active = t.key === period;
          return (
            <TouchableOpacity
              key={t.key}
              style={[
                st.tab,
                { backgroundColor: active ? colors.accent : colors.surface, borderColor: active ? colors.accent : colors.border },
              ]}
              onPress={() => setPeriod(t.key)}
              activeOpacity={0.7}
            >
              <Text style={[st.tabLbl, { color: active ? '#000' : colors.textMuted }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Acceptance rate strip */}
      {acceptRate != null && (
        <View style={[
          st.acceptStrip,
          {
            backgroundColor: acceptRate > 70 ? colors.goBg : acceptRate >= 50 ? colors.thinkBg : colors.stopBg,
            borderColor: acceptRate > 70 ? colors.go + '33' : acceptRate >= 50 ? colors.think + '40' : colors.stop + '40',
          },
        ]}>
          <Text style={[st.acceptPill, {
            backgroundColor: acceptRate > 70 ? colors.go + '22' : acceptRate >= 50 ? colors.think + '22' : colors.stop + '22',
            color: acceptRate > 70 ? colors.go : acceptRate >= 50 ? colors.think : colors.stop,
          }]}>
            {acceptRate}%
          </Text>
          <Text style={[st.acceptSub, { color: colors.textSoft }]}>
            Rata acceptare {acceptRate > 70 ? '- Excelent' : acceptRate >= 50 ? '- Atentie, sub 70% risc blocare' : '- CRITICA! Sub prag minim'}
          </Text>
        </View>
      )}

      {/* Stats grid — 4 cards */}
      <View style={st.statGrid}>
        <View style={[st.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[st.statLbl, { color: colors.textMuted }]}>FINALIZATE / OFERTE</Text>
          <Text style={[st.statVal, { color: colors.text }]}>{stats?.ridesCount ?? 0}<Text style={[st.statUnit, { color: colors.textMuted }]}> / {stats?.offersCount ?? 0}</Text></Text>
        </View>
        <View style={[st.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[st.statLbl, { color: colors.textMuted }]}>DISTANTA TOTALA</Text>
          <Text style={[st.statVal, { color: colors.text }]}>
            {stats?.distanceKm.toFixed(0) ?? '0'}<Text style={[st.statUnit, { color: colors.textMuted }]}> km</Text>
          </Text>
        </View>
        <View style={[st.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[st.statLbl, { color: colors.textMuted }]}>MEDIE LEI/KM</Text>
          <Text style={[st.statVal, { color: colors.go }]}>{stats?.avgPpkm.toFixed(2) ?? '0.00'}</Text>
        </View>
        <View style={[st.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[st.statLbl, { color: colors.textMuted }]}>MEDIE LEI/MIN</Text>
          <Text style={[st.statVal, { color: (stats?.avgPpmin ?? 0) >= 0.50 ? colors.go : colors.think }]}>{stats?.avgPpmin.toFixed(2) ?? '0.00'}</Text>
        </View>
      </View>

      {/* 7-day bar chart */}
      {chartData.length > 0 && (
        <>
          <Text style={[st.sectionLbl, { color: colors.textMuted }]}>CASTIGURI 7 ZILE</Text>
          <View style={[st.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={st.chartBars}>
              {chartData.map((d, i) => {
                const heightPct = chartMax > 0 ? Math.max(4, (d.earnings / chartMax) * 100) : 4;
                const isSelected = selectedDay?.date === d.date;
                const highlight = d.isToday || isSelected;
                return (
                  <TouchableOpacity key={i} style={st.chartBarWrap} onPress={() => handleDayPress(d)} activeOpacity={0.6}>
                    {d.earnings > 0 && (
                      <Text style={[st.chartBarValue, { color: highlight ? colors.accent : colors.textMuted }]}>
                        {Math.round(d.earnings)}
                      </Text>
                    )}
                    <View style={[
                      st.chartBar,
                      {
                        height: `${heightPct}%`,
                        backgroundColor: isSelected ? colors.go : d.isToday ? colors.accent : colors.accentDim,
                        ...(highlight ? {
                          shadowColor: isSelected ? colors.go : colors.accent,
                          shadowOpacity: 0.5,
                          shadowRadius: 8,
                          shadowOffset: { width: 0, height: 0 },
                          elevation: 6,
                        } : {}),
                      },
                    ]} />
                    <Text style={[st.chartBarDay, { color: highlight ? colors.accent : colors.textDim, fontWeight: isSelected ? '900' : '700' }]}>
                      {d.label}
                    </Text>
                    {isSelected && <View style={[st.chartBarDot, { backgroundColor: colors.go }]} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={[st.chartAvgLine, { borderTopColor: colors.border }]}>
              <Text style={[st.chartAvgLbl, { color: colors.textDim }]}>Medie saptamana</Text>
              <Text style={[st.chartAvgVal, { color: colors.think }]}>{chartAvg} lei/zi</Text>
            </View>
          </View>
        </>
      )}

      {/* Day detail panel */}
      {selectedDay && dayStats && (
        <>
          <View style={[st.dayHeader, { backgroundColor: colors.surface, borderColor: colors.go + '44' }]}>
            <View style={st.dayHeaderTop}>
              <Text style={[st.dayHeaderTitle, { color: colors.text }]}>
                {(() => {
                  const d = new Date(selectedDay.date);
                  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
                })()} · {selectedDay.label}
              </Text>
              <TouchableOpacity onPress={() => { setSelectedDay(null); setDayStats(null); setDayRides([]); }} activeOpacity={0.6}>
                <Text style={[st.dayCloseBtn, { color: colors.accent }]}>INCHIDE</Text>
              </TouchableOpacity>
            </View>
            <View style={st.dayStatsRow}>
              <View style={st.dayStat}>
                <Text style={[st.dayStatVal, { color: colors.go }]}>{Math.round(dayStats.earningsLei)}</Text>
                <Text style={[st.dayStatLbl, { color: colors.textMuted }]}>lei</Text>
              </View>
              <View style={st.dayStat}>
                <Text style={[st.dayStatVal, { color: colors.text }]}>{dayStats.ridesCount}</Text>
                <Text style={[st.dayStatLbl, { color: colors.textMuted }]}>curse</Text>
              </View>
              <View style={st.dayStat}>
                <Text style={[st.dayStatVal, { color: colors.text }]}>{dayStats.distanceKm.toFixed(0)}</Text>
                <Text style={[st.dayStatLbl, { color: colors.textMuted }]}>km</Text>
              </View>
              <View style={st.dayStat}>
                <Text style={[st.dayStatVal, { color: colors.think }]}>{dayStats.avgPpkm.toFixed(2)}</Text>
                <Text style={[st.dayStatLbl, { color: colors.textMuted }]}>lei/km</Text>
              </View>
            </View>
          </View>

          {dayRides.length === 0 ? (
            <View style={[st.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[st.emptyTxt, { color: colors.textMuted }]}>Nicio cursa finalizata in aceasta zi.</Text>
            </View>
          ) : (
            dayRides.map((r) => {
              const v = VERDICT_DISPLAY[r.verdict];
              const dt = new Date(r.timestamp);
              const timeStr = `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
              return (
                <View key={r.id} style={[st.ride, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: v.color }]}>
                  <View style={st.rideTop}>
                    <Text style={[st.rideTime, { color: colors.textMuted }]}>{timeStr}</Text>
                    <Text style={[st.ridePrice, { color: colors.text }]}>{r.grossEarnings.toFixed(2)} lei</Text>
                  </View>
                  {(r.pickupAddress || r.destinationAddress) && (
                    <Text style={[st.rideAddr, { color: colors.textMuted }]} numberOfLines={1}>
                      {(r.pickupAddress || '?').slice(0, 30)} → {(r.destinationAddress || '?').slice(0, 30)}
                    </Text>
                  )}
                  <View style={st.rideBottom}>
                    <Text style={[st.rideMeta, { color: colors.textMuted }]}>
                      {(r.tripKm ?? 0).toFixed(1)}km · {Math.round(r.durationMin ?? 0)}min · {r.source === 'api' ? '✓ Google' : '~ est'}
                    </Text>
                    <Text style={[st.rideVerdict, { color: v.color, backgroundColor: v.color + '22' }]}>{v.symbol} {r.profitPerKm.toFixed(2)}</Text>
                  </View>
                </View>
              );
            })
          )}
        </>
      )}

      {/* Ride list */}
      {!selectedDay && <Text style={[st.sectionLbl, { color: colors.textMuted, marginTop: 16 }]}>CURSE INDIVIDUALE</Text>}
      {!selectedDay && rides.length === 0 ? (
        <View style={[st.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[st.emptyTxt, { color: colors.textMuted }]}>
            Nicio cursa in aceasta perioada.{'\n'}DRUMIQ inregistreaza automat la accept Bolt.
          </Text>
        </View>
      ) : !selectedDay ? (
        rides.map((r) => {
          const v = VERDICT_DISPLAY[r.verdict];
          const dt = new Date(r.timestamp);
          const timeStr = `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
          return (
            <View key={r.id} style={[st.ride, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: v.color }]}>
              <View style={st.rideTop}>
                <Text style={[st.rideTime, { color: colors.textMuted }]}>{timeStr}</Text>
                <Text style={[st.ridePrice, { color: colors.text }]}>{r.grossEarnings.toFixed(2)} lei</Text>
              </View>
              {(r.pickupAddress || r.destinationAddress) && (
                <Text style={[st.rideAddr, { color: colors.textMuted }]} numberOfLines={1}>
                  {(r.pickupAddress || '?').slice(0, 30)} → {(r.destinationAddress || '?').slice(0, 30)}
                </Text>
              )}
              <View style={st.rideBottom}>
                <Text style={[st.rideMeta, { color: colors.textMuted }]}>
                  {(r.tripKm ?? 0).toFixed(1)}km · {Math.round(r.durationMin ?? 0)}min · {r.source === 'api' ? '✓ Google' : '~ est'}
                </Text>
                <Text style={[st.rideVerdict, { color: v.color, backgroundColor: v.color + '22' }]}>{v.symbol} {r.profitPerKm.toFixed(2)}</Text>
              </View>
            </View>
          );
        })
      ) : null}

      {!selectedDay && rides.length > 0 && (
        <TouchableOpacity
          style={[st.dangerBtn, { borderColor: colors.stop }]}
          onPress={handleClearAll}
          activeOpacity={0.7}
        >
          <Text style={[st.dangerTxt, { color: colors.stop }]}>STERGE TOATE DATELE</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  title: { fontSize: 22, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  sub: { fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 1, marginTop: 2, marginBottom: 14 },

  // Hero card
  heroCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    paddingHorizontal: 20,
    marginBottom: 16,
    position: 'relative',
  },
  heroBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  heroBadgeTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  heroLabel: { fontSize: 10, letterSpacing: 3, fontWeight: '700', marginBottom: 4 },
  heroAmount: { fontSize: 48, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 52 },
  heroUnit: { fontSize: 18, fontWeight: '500', marginBottom: 6 },
  heroSub: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 6 },

  // Daily goal
  goalCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  goalLabel: { fontSize: 9, letterSpacing: 2, fontWeight: '700' },
  goalValue: { fontSize: 16, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  goalUnit: { fontSize: 10, fontWeight: '500' },
  goalBarBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  goalBarFill: { height: '100%', borderRadius: 4, overflow: 'hidden', flexDirection: 'row' },
  goalBarHighlight: { width: '60%', height: '100%', borderTopLeftRadius: 4, borderBottomLeftRadius: 4, opacity: 0.7 },
  goalSub: { fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', textAlign: 'right' },

  // Period tabs
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  tab: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  tabLbl: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  // Acceptance rate
  acceptStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  acceptPill: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
  acceptSub: { fontSize: 9, flex: 1 },

  // Stats grid
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statCard: { width: '48.5%', borderWidth: 1, borderRadius: 10, padding: 12 },
  statLbl: { fontSize: 8, letterSpacing: 2, fontWeight: '700', marginBottom: 4 },
  statVal: { fontSize: 22, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  statUnit: { fontSize: 11, fontWeight: '500' },

  // Chart
  sectionLbl: { fontSize: 10, letterSpacing: 2.5, fontWeight: '900', marginBottom: 10 },
  chartCard: { borderWidth: 1, borderRadius: 12, padding: 16, paddingBottom: 12, marginBottom: 4 },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 100, marginBottom: 8 },
  chartBarWrap: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  chartBarValue: { fontSize: 8, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '700', marginBottom: 2 },
  chartBar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 4 },
  chartBarDay: { fontSize: 9, fontWeight: '700', marginTop: 6, letterSpacing: 0.5 },
  chartAvgLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderStyle: 'dashed' },
  chartAvgLbl: { fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  chartAvgVal: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '700' },

  // Rides
  empty: { padding: 20, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  emptyTxt: { fontSize: 12, textAlign: 'center', lineHeight: 18 },

  ride: { padding: 10, borderRadius: 8, borderWidth: 1, borderLeftWidth: 3, marginBottom: 6 },
  rideTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  rideTime: { fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  ridePrice: { fontSize: 14, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  rideAddr: { fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginBottom: 4 },
  rideBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rideMeta: { fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  rideVerdict: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },

  dangerBtn: { padding: 14, borderRadius: 8, borderWidth: 1, alignItems: 'center', marginTop: 16 },
  dangerTxt: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  // Chart bar selection dot
  chartBarDot: { width: 5, height: 5, borderRadius: 3, marginTop: 3 },

  // Day detail panel
  dayHeader: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 12, marginBottom: 8 },
  dayHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dayHeaderTitle: { fontSize: 14, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 0.5 },
  dayCloseBtn: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  dayStatsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  dayStat: { alignItems: 'center' },
  dayStatVal: { fontSize: 20, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  dayStatLbl: { fontSize: 8, letterSpacing: 1.5, fontWeight: '700', marginTop: 2 },
});
