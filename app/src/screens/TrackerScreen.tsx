// DRUMIQ v2.0.0 — Tracker Screen (Aurora × Racing × Cyber)

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, AppState, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import {
  getStatsForPeriod,
  getRidesForPeriod,
  clearAllRides,
  getWeeklyChartData,
  getStatsForDay,
  type DayEarnings,
} from '../services/tracker';
import { getDailyGoal } from '../services/userSettings';
import { VERDICT_DISPLAY } from '../types';
import type { TrackerPeriod, Ride, TrackerStats } from '../types';
import { FONT, SIZE, RADIUS } from '../constants/typography';

const TABS: { key: TrackerPeriod; label: string }[] = [
  { key: 'today', label: 'Azi' },
  { key: 'week',  label: 'Săptămână' },
  { key: 'total', label: 'Total' },
];

function RideItem({ r, colors, ff }: { r: Ride; colors: any; ff: boolean }) {
  const v = VERDICT_DISPLAY[r.verdict];
  const dt = new Date(r.timestamp);
  const timeStr = `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
  return (
    <View style={[st.ride, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
      <View style={[st.rideStripe, { backgroundColor: v.color }]} />
      <View style={st.rideInner}>
        <View style={st.rideTop}>
          <Text style={[st.rideTime, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>{timeStr}</Text>
          <Text style={[st.ridePrice, { color: colors.text, fontFamily: ff ? FONT.displayXB : FONT.system }]}>
            {(r.grossEarnings ?? 0).toFixed(2)}
            <Text style={[st.ridePriceUnit, { color: colors.textMuted }]}> lei</Text>
          </Text>
        </View>
        {(r.pickupAddress || r.destinationAddress) && (
          <Text style={[st.rideAddr, { color: colors.textFaint, fontFamily: ff ? FONT.mono : FONT.systemMono }]} numberOfLines={1}>
            {(r.pickupAddress || '?').slice(0, 30)} → {(r.destinationAddress || '?').slice(0, 30)}
          </Text>
        )}
        <View style={st.rideBottom}>
          <Text style={[st.rideMeta, { color: colors.textFaint, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
            {(r.tripKm ?? 0).toFixed(1)}km · {Math.round(r.durationMin ?? 0)}min · {r.source === 'api' ? '✓ Google' : '~ est'}
          </Text>
          <View style={[st.rideVerdictPill, { backgroundColor: v.color + '22', borderColor: v.color + '66' }]}>
            <Text style={[st.rideVerdictTxt, { color: v.color, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
              {v.symbol} {r.profitPerKm?.toFixed(2) ?? '-'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function TrackerScreen() {
  const { colors, fontsLoaded: ff } = useTheme();
  const [period, setPeriod] = useState<TrackerPeriod>('today');
  const [stats, setStats] = useState<TrackerStats | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyGoal, setDailyGoalVal] = useState<number>(0);
  const [chartData, setChartData] = useState<DayEarnings[]>([]);
  const [selectedDay, setSelectedDay] = useState<DayEarnings | null>(null);
  const [dayStats, setDayStats] = useState<TrackerStats | null>(null);
  const [dayRides, setDayRides] = useState<Ride[]>([]);
  const selectedDayRef = useRef<DayEarnings | null>(null);
  selectedDayRef.current = selectedDay;

  const orbAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(orbAnim, {
      toValue: 1, duration: 8000, easing: Easing.inOut(Easing.ease), useNativeDriver: true,
    })).start();
  }, []);

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
      const curDay = selectedDayRef.current;
      if (curDay) {
        const updated = chart.find(d => d.date === curDay.date);
        if (updated) {
          setSelectedDay(updated);
          const detail = await getStatsForDay(updated.date);
          setDayStats(detail.stats);
          setDayRides(detail.rides);
        }
      }
    } catch {}
  }, [period]);

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

  useEffect(() => {
    refresh();
    const i = setInterval(() => { if (AppState.currentState === 'active') refresh(); }, 15000);
    return () => clearInterval(i);
  }, [refresh]);

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
  const chartMax = Math.max(...chartData.map(d => d.earnings), 1);

  const orbScale = orbAnim.interpolate({
    inputRange: [0, 0.5, 1], outputRange: [1, 1.15, 1],
  });
  const orbX = orbAnim.interpolate({
    inputRange: [0, 0.5, 1], outputRange: [0, -20, 0],
  });

  return (
    <View style={[st.root, { backgroundColor: colors.bg }]}>
      {/* Aurora blobs */}
      <View style={[st.auroraBlob, st.aurora1, { backgroundColor: colors.aurora1 }]} />
      <View style={[st.auroraBlob, st.aurora2, { backgroundColor: colors.aurora2 }]} />

      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Page title */}
        <Text style={[st.title, { fontFamily: ff ? FONT.displayXB : FONT.system }]}>
          <Text style={{ color: colors.text }}>Tracker </Text>
          <Text style={{ color: colors.cyan }}>câștiguri</Text>
        </Text>
        <Text style={[st.sub, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
          // auto-detect la accept Bolt
        </Text>

        {/* Hero earnings card */}
        <View style={[st.heroCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Animated.View style={[st.heroOrb, {
            backgroundColor: colors.green,
            transform: [{ scale: orbScale }, { translateX: orbX }],
          }]} />
          <View style={{ position: 'relative', zIndex: 2 }}>
            <View style={st.heroRow}>
              <Text style={[st.heroLabel, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
                ◎ Câștiguri nete
              </Text>
              <View style={[st.heroPill, { backgroundColor: `${colors.cyan}26`, borderColor: `${colors.cyan}66` }]}>
                <Text style={[st.heroPillTxt, { color: colors.cyan, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
                  {period === 'today' ? 'AZI' : period === 'week' ? 'SĂPT' : 'TOTAL'}
                </Text>
              </View>
            </View>
            <Text style={[st.heroAmount, { color: colors.green, fontFamily: ff ? FONT.displayXB : FONT.system }]}>
              {Math.round(earningsToday)}
              <Text style={[st.heroUnit, { color: colors.textMuted }]}> lei</Text>
            </Text>
            <Text style={[st.heroSub, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
              {stats?.ridesCount ?? 0} curse finalizate · {stats?.offersCount ?? 0} oferte
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={[st.tabsWrap, { backgroundColor: colors.bgInput, borderColor: colors.borderSoft }]}>
          {TABS.map((t) => {
            const active = t.key === period;
            return (
              <TouchableOpacity key={t.key} style={st.tabOuter} onPress={() => setPeriod(t.key)} activeOpacity={0.7}>
                {active ? (
                  <LinearGradient colors={colors.gradButton} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                    style={[st.tab, { shadowColor: colors.violet }]}>
                    <Text style={[st.tabLbl, { color: '#fff', fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>{t.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={st.tab}>
                    <Text style={[st.tabLbl, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>{t.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Stats grid */}
        <View style={st.statGrid}>
          <StatCell label="Finalizate / Oferte"
            value={`${stats?.ridesCount ?? 0}`} unit={` / ${stats?.offersCount ?? 0}`}
            glowColor={colors.cyan} colors={colors} ff={ff} />
          <StatCell label="Distanță totală"
            value={`${(stats?.distanceKm ?? 0).toFixed(0)}`} unit=" km"
            glowColor={colors.pink} colors={colors} ff={ff} />
          <StatCell label="Medie lei/km"
            value={`${(stats?.avgPpkm ?? 0).toFixed(2)}`}
            glowColor={colors.green} colors={colors} ff={ff}
            valueColor={colors.green} />
          <StatCell label="Medie lei/min"
            value={`${(stats?.avgPpmin ?? 0).toFixed(2)}`}
            glowColor={colors.amber} colors={colors} ff={ff}
            valueColor={(stats?.avgPpmin ?? 0) >= 0.50 ? colors.green : colors.amber} />
        </View>

        {/* Daily goal */}
        {dailyGoal > 0 && period === 'today' && (
          <View style={[st.goalCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={st.goalRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16 }}>🎯</Text>
                <Text style={[st.goalLabel, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
                  TARGET AZI
                </Text>
              </View>
              <Text style={[st.goalValue, { color: colors.text, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
                {Math.round(earningsToday)} / {dailyGoal}
                <Text style={{ color: colors.textMuted, fontSize: 10 }}> RON</Text>
              </Text>
            </View>
            <View style={[st.goalBarBg, { backgroundColor: colors.bgInput, borderColor: colors.borderSoft }]}>
              <LinearGradient
                colors={earningsToday >= dailyGoal ? colors.goGrad : colors.gradPrimary}
                start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                style={[st.goalBarFill, { width: `${goalPct}%` }]}
              />
            </View>
            <Text style={[st.goalSub, { color: colors.textFaint, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
              {earningsToday >= dailyGoal ? '✓ Target atins!' : `Mai ai ${Math.round(dailyGoal - earningsToday)} RON`}
            </Text>
          </View>
        )}

        {/* 7-day chart */}
        {chartData.length > 0 && (
          <>
            <View style={st.sectionRow}>
              <Text style={[st.sectionLabel, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
                // Câștiguri · 7 zile
              </Text>
              <View style={[st.sectionLine, { backgroundColor: colors.border }]} />
            </View>
            <View style={[st.chartCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
              <View style={st.chartBars}>
                {chartData.map((d, i) => {
                  const heightPct = chartMax > 0 ? Math.max(4, (d.earnings / chartMax) * 100) : 4;
                  const isSelected = selectedDay?.date === d.date;
                  const highlight = d.isToday || isSelected;
                  return (
                    <TouchableOpacity key={i} style={st.chartBarWrap} onPress={() => handleDayPress(d)} activeOpacity={0.6}>
                      {d.earnings > 0 && (
                        <Text style={[st.chartBarValue, {
                          color: highlight ? colors.cyan : colors.textFaint,
                          fontFamily: ff ? FONT.mono : FONT.systemMono,
                        }]}>
                          {Math.round(d.earnings)}
                        </Text>
                      )}
                      <View style={{ width: '100%', height: `${heightPct}%`, borderRadius: 4, overflow: 'hidden' }}>
                        <LinearGradient
                          colors={isSelected ? colors.goGrad : colors.gradPrimary}
                          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
                          style={{ flex: 1, opacity: highlight ? 1 : 0.6 }}
                        />
                      </View>
                      <Text style={[st.chartBarDay, {
                        color: d.isToday ? colors.pink : isSelected ? colors.cyan : colors.textMuted,
                        fontFamily: ff ? FONT.mono : FONT.systemMono,
                        fontWeight: highlight ? '700' : '400',
                      }]}>
                        {d.label}
                      </Text>
                      {isSelected && <View style={[st.chartBarDot, { backgroundColor: colors.green }]} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* Day detail panel */}
        {selectedDay && dayStats && (
          <>
            <View style={[st.dayHeader, { backgroundColor: colors.bgCard, borderColor: `${colors.green}66` }]}>
              <View style={st.dayHeaderTop}>
                <Text style={[st.dayHeaderTitle, { color: colors.text, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
                  {(() => {
                    const d = new Date(selectedDay.date);
                    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
                  })()} · {selectedDay.label}
                </Text>
                <TouchableOpacity onPress={() => { setSelectedDay(null); setDayStats(null); setDayRides([]); }} activeOpacity={0.6}>
                  <Text style={[st.dayCloseBtn, { color: colors.cyan, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>ÎNCHIDE</Text>
                </TouchableOpacity>
              </View>
              <View style={st.dayStatsRow}>
                {[
                  { val: Math.round(dayStats.earningsLei), lbl: 'lei', color: colors.green },
                  { val: dayStats.ridesCount, lbl: 'curse', color: colors.text },
                  { val: dayStats.distanceKm.toFixed(0), lbl: 'km', color: colors.text },
                  { val: dayStats.avgPpkm.toFixed(2), lbl: 'lei/km', color: colors.amber },
                ].map((s, i) => (
                  <View key={i} style={st.dayStat}>
                    <Text style={[st.dayStatVal, { color: s.color, fontFamily: ff ? FONT.displayXB : FONT.system }]}>{s.val}</Text>
                    <Text style={[st.dayStatLbl, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>{s.lbl}</Text>
                  </View>
                ))}
              </View>
            </View>
            {dayRides.length === 0 ? (
              <View style={[st.empty, { borderColor: colors.border }]}>
                <Text style={[st.emptyTxt, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
                  Nicio cursă finalizată în această zi.
                </Text>
              </View>
            ) : (
              dayRides.map((r) => <RideItem key={r.id} r={r} colors={colors} ff={ff} />)
            )}
          </>
        )}

        {/* Ride list */}
        {!selectedDay && (
          <View style={st.sectionRow}>
            <Text style={[st.sectionLabel, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
              // Curse individuale
            </Text>
            <View style={[st.sectionLine, { backgroundColor: colors.border }]} />
          </View>
        )}
        {!selectedDay && rides.length === 0 ? (
          <View style={[st.empty, { borderColor: colors.border }]}>
            <Text style={{ fontSize: 28, opacity: 0.5, marginBottom: 10 }}>🚗</Text>
            <Text style={[st.emptyTitle, { color: colors.textSoft, fontFamily: ff ? FONT.bodySB : FONT.system }]}>
              Nicio cursă încă
            </Text>
            <Text style={[st.emptyDesc, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
              DRUMIQ înregistrează automat{'\n'}la accept Bolt
            </Text>
          </View>
        ) : !selectedDay ? (
          rides.map((r) => <RideItem key={r.id} r={r} colors={colors} ff={ff} />)
        ) : null}

        {!selectedDay && rides.length > 0 && (
          <TouchableOpacity
            style={[st.dangerBtn, { borderColor: `${colors.red}44`, backgroundColor: `${colors.red}0D` }]}
            onPress={handleClearAll}
            activeOpacity={0.7}
          >
            <Text style={[st.dangerTxt, { color: colors.red, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
              ȘTERGE TOATE DATELE
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function StatCell({ label, value, unit, glowColor, colors, ff, valueColor }: {
  label: string; value: string; unit?: string; glowColor: string;
  colors: any; ff: boolean; valueColor?: string;
}) {
  return (
    <View style={[st.statCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
      <View style={[st.statGlow, { backgroundColor: glowColor }]} />
      <Text style={[st.statLbl, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>{label}</Text>
      <Text style={[st.statVal, { color: valueColor || colors.text, fontFamily: ff ? FONT.displayXB : FONT.system }]}>
        {value}
        {unit && <Text style={[st.statUnit, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>{unit}</Text>}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  // Aurora
  auroraBlob: { position: 'absolute', borderRadius: 300, opacity: 0.7 },
  aurora1: { width: 400, height: 400, top: -150, right: -100 },
  aurora2: { width: 350, height: 350, bottom: -120, left: -100 },

  // Title
  title: { fontSize: SIZE.xl, letterSpacing: -0.5, marginTop: 4 },
  sub: { fontSize: SIZE.sm, letterSpacing: 8, marginTop: 4, marginBottom: 14 },

  // Hero card
  heroCard: { borderWidth: 1, borderRadius: RADIUS['2xl'], padding: 20, marginBottom: 14, position: 'relative', overflow: 'hidden' },
  heroOrb: { position: 'absolute', width: 200, height: 200, borderRadius: 100, top: -50, right: -50, opacity: 0.3 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  heroLabel: { fontSize: SIZE.sm, letterSpacing: 8, textTransform: 'uppercase' },
  heroPill: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: RADIUS.pill, borderWidth: 1 },
  heroPillTxt: { fontSize: SIZE.sm, letterSpacing: 3 },
  heroAmount: { fontSize: SIZE['4xl'], lineHeight: 68, letterSpacing: -3 },
  heroUnit: { fontSize: SIZE.xl, fontWeight: '400' },
  heroSub: { fontSize: 11, marginTop: 6 },

  // Tabs
  tabsWrap: { flexDirection: 'row', gap: 6, marginBottom: 14, borderWidth: 1, borderRadius: RADIUS.md, padding: 4 },
  tabOuter: { flex: 1 },
  tab: { padding: 10, borderRadius: RADIUS.sm, alignItems: 'center', shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  tabLbl: { fontSize: SIZE.sm, letterSpacing: 6, textTransform: 'uppercase' },

  // Stats grid
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: { flexBasis: '47%', flexGrow: 1, borderWidth: 1, borderRadius: RADIUS.lg, padding: 14, paddingHorizontal: 16, position: 'relative', overflow: 'hidden' },
  statGlow: { position: 'absolute', top: -10, left: -10, width: 40, height: 40, borderRadius: 20, opacity: 0.5 },
  statLbl: { fontSize: 9, letterSpacing: 6, textTransform: 'uppercase', marginBottom: 8, position: 'relative' },
  statVal: { fontSize: SIZE['2xl'], lineHeight: 32, position: 'relative' },
  statUnit: { fontSize: SIZE.sm },

  // Goal card
  goalCard: { borderWidth: 1, borderRadius: RADIUS.xl, padding: 14, marginBottom: 14 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  goalLabel: { fontSize: 9, letterSpacing: 6, textTransform: 'uppercase' },
  goalValue: { fontSize: SIZE.lg },
  goalBarBg: { height: 6, borderRadius: RADIUS.pill, overflow: 'hidden', marginBottom: 6, borderWidth: 1 },
  goalBarFill: { height: '100%' as any, borderRadius: RADIUS.pill },
  goalSub: { fontSize: SIZE.sm, textAlign: 'right' },

  // Section label
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 10 },
  sectionLabel: { fontSize: SIZE.sm, letterSpacing: 10, textTransform: 'uppercase' },
  sectionLine: { flex: 1, height: 1, opacity: 0.5 },

  // Chart
  chartCard: { borderWidth: 1, borderRadius: RADIUS.lg, padding: 16, paddingBottom: 12, marginBottom: 4 },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 100, marginBottom: 8 },
  chartBarWrap: { flex: 1, alignItems: 'center', height: '100%' as any, justifyContent: 'flex-end' },
  chartBarValue: { fontSize: 8, fontWeight: '700', marginBottom: 2 },
  chartBarDay: { fontSize: 9, letterSpacing: 4, marginTop: 6 },
  chartBarDot: { width: 5, height: 5, borderRadius: 3, marginTop: 3 },

  // Empty state
  empty: { padding: 30, borderRadius: RADIUS.lg, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center' },
  emptyTxt: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  emptyTitle: { fontSize: 14, marginBottom: 4 },
  emptyDesc: { fontSize: SIZE.sm, letterSpacing: 2, textAlign: 'center', lineHeight: 18 },

  // Ride cards
  ride: { borderWidth: 1, borderRadius: RADIUS.lg, marginBottom: 8, flexDirection: 'row', overflow: 'hidden' },
  rideStripe: { width: 3 },
  rideInner: { flex: 1, padding: 12 },
  rideTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  rideTime: { fontSize: SIZE.sm, letterSpacing: 3 },
  ridePrice: { fontSize: 16 },
  ridePriceUnit: { fontSize: 11 },
  rideAddr: { fontSize: 9, marginBottom: 4 },
  rideBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rideMeta: { fontSize: 9, letterSpacing: 2 },
  rideVerdictPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill, borderWidth: 1 },
  rideVerdictTxt: { fontSize: 11, letterSpacing: 2 },

  // Danger button
  dangerBtn: { padding: 14, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', marginTop: 16 },
  dangerTxt: { fontSize: 12, letterSpacing: 4, textTransform: 'uppercase' },

  // Day detail
  dayHeader: { borderWidth: 1, borderRadius: RADIUS.xl, padding: 14, marginTop: 12, marginBottom: 8 },
  dayHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dayHeaderTitle: { fontSize: 14, letterSpacing: 1 },
  dayCloseBtn: { fontSize: SIZE.sm, letterSpacing: 4 },
  dayStatsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  dayStat: { alignItems: 'center' },
  dayStatVal: { fontSize: 20 },
  dayStatLbl: { fontSize: 8, letterSpacing: 4, textTransform: 'uppercase', marginTop: 2 },
});
