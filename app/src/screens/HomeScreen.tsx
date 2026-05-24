// DRUMIQ v1.0.0 — Home Screen (UI Pro v1 dark fintech theme)
// Shows: greeting + plan badge + daily goal + today's stats + last verdicts + overlay demo button

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, AppState } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { getLicenseState } from '../services/licenseManager';
import { getStatsForPeriod, getRidesForPeriod } from '../services/tracker';
import { getDailyGoal } from '../services/userSettings';
import { getProfile } from '../services/auth';
import { VERDICT_DISPLAY } from '../types';
import { TRIAL } from '../constants/config';
import type { PlanTier, Ride, TrackerStats } from '../types';
import BetaDisclaimer from '../components/BetaDisclaimer';
import { isFoundingMember, FoundingBadge } from '../components/FoundingBadge';

interface Props {
  onOpenOverlayDemo: () => void;
  onOpenTracker: () => void;
}

export default function HomeScreen({ onOpenOverlayDemo, onOpenTracker }: Props) {
  const { colors } = useTheme();
  const [plan, setPlan] = useState<PlanTier | null>(null);
  const [planExpire, setPlanExpire] = useState<string>('');
  const [planKey, setPlanKey] = useState<string>('');
  const [progressPct, setProgressPct] = useState<number>(0);
  const [stats, setStats] = useState<TrackerStats | null>(null);
  const [recent, setRecent] = useState<Ride[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyGoal, setDailyGoalVal] = useState<number>(0);
  const [isFounding, setIsFounding] = useState(false);
  const [driverName, setDriverName] = useState<string>('ȘOFER');
  const [initialLoading, setInitialLoading] = useState(true);

  // Fetch profile name once (not in the 30s loop)
  useEffect(() => {
    (async () => {
      try {
        const profile = await getProfile();
        if (profile?.name?.trim()) {
          setDriverName(profile.name.trim().split(/\s+/)[0].toUpperCase());
        }
      } catch {}
    })();
  }, []);

  const refresh = useCallback(async () => {
    try {
      const lic = await getLicenseState();
      if (lic.license) {
        setPlan(lic.license.plan);
        // Show activation date in compact format (e.g., "din 21.05.26")
        if (lic.license.activatedAt) {
          const d = new Date(lic.license.activatedAt);
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yy = String(d.getFullYear()).slice(-2);
          setPlanKey(`din ${dd}.${mm}.${yy}`);
        } else {
          setPlanKey('ACTIV');
        }
        if (lic.license.expiresAt) {
          const days = Math.max(0, Math.ceil((lic.license.expiresAt - Date.now()) / 86400000));
          setPlanExpire(`${days} zile rămase`);
          const total = lic.license.plan === 'trial' ? TRIAL.DAYS * 86400000 : 30 * 86400000;
          const elapsed = Date.now() - lic.license.activatedAt;
          setProgressPct(Math.max(0, Math.min(100, ((total - elapsed) / total) * 100)));
        } else {
          setPlanExpire('LIFETIME');
          setProgressPct(100);
        }
      }
      const [todayStats, todayRides, goal] = await Promise.all([
        getStatsForPeriod('today'),
        getRidesForPeriod('today'),
        getDailyGoal(),
      ]);
      setStats(todayStats);
      setRecent(todayRides.slice(0, 5));
      setDailyGoalVal(goal);
      setIsFounding(await isFoundingMember());
    } catch {} finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); const i = setInterval(() => { if (AppState.currentState === 'active') refresh(); }, 30000); return () => clearInterval(i); }, [refresh]);

  const onRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };

  const planColor = plan === 'trial' || !plan ? colors.think : colors.go;

  // Time-of-day greeting (computed at render, no state needed)
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'BUNĂ DIMINEAȚA' : hour < 18 ? 'BUNĂ ZIUA' : 'BUNĂ SEARA';

  // Daily goal progress percentage
  const goalPct = dailyGoal > 0 ? Math.min(100, ((stats?.earningsLei ?? 0) / dailyGoal) * 100) : 0;
  const goalReached = (stats?.earningsLei ?? 0) >= dailyGoal;

  if (initialLoading) {
    return (
      <View style={[s.root, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[s.root, { backgroundColor: colors.bg }]}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <BetaDisclaimer />

      {/* Greeting */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={[s.greetingLabel, { color: colors.textMuted }]}>{greeting}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[s.greetingName, { color: colors.text }]}>{driverName}</Text>
            {isFounding && <FoundingBadge compact />}
          </View>
        </View>
        <View style={[s.bell, { borderColor: colors.border, opacity: 0.4 }]}>
          <Text style={{ fontSize: 16 }}>🔔</Text>
        </View>
      </View>

      {/* Plan badge */}
      <View style={[s.planBadge, { backgroundColor: colors.surface, borderColor: planColor, shadowColor: planColor }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.planLabel, { color: colors.textMuted }]}>PLAN ACTIV</Text>
          <Text style={[s.planValue, { color: planColor }]}>{(plan || '—').toUpperCase()}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[s.planExpire, { color: colors.textMuted }]}>{planExpire}</Text>
          <Text style={[s.planKey, { color: colors.textDim }]}>{planKey || '—'}</Text>
        </View>
      </View>
      <View style={[s.progress, { backgroundColor: colors.surfaceAlt }]}>
        <View style={[s.progressFill, { width: `${progressPct}%`, backgroundColor: planColor, shadowColor: planColor }]} />
      </View>

      {/* Daily Goal — prominent card with hero number */}
      {dailyGoal > 0 && (
        <View style={[s.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.goalHeader}>
            <Text style={[s.goalIcon]}>🎯</Text>
            <Text style={[s.goalLabel, { color: colors.textMuted }]}>TARGET AZI</Text>
          </View>
          <View style={s.goalHero}>
            <Text style={[s.goalHeroValue, { color: goalReached ? colors.go : colors.text }]}>
              {(stats?.earningsLei ?? 0).toFixed(0)}
            </Text>
            <View style={s.goalHeroSub}>
              <Text style={[s.goalHeroDivider, { color: colors.textDim }]}>/</Text>
              <Text style={[s.goalHeroTarget, { color: colors.textMuted }]}>{dailyGoal}</Text>
              <Text style={[s.goalHeroUnit, { color: colors.textDim }]}> RON</Text>
            </View>
          </View>
          <View style={[s.goalBarBg, { backgroundColor: colors.surfaceAlt }]}>
            <View style={[
              s.goalBarFill,
              {
                width: `${goalPct}%`,
                backgroundColor: goalReached ? colors.go : colors.accent,
                shadowColor: goalReached ? colors.go : colors.accent,
              },
            ]} />
          </View>
          <View style={s.goalFooter}>
            <Text style={[s.goalPct, { color: goalReached ? colors.go : colors.accent }]}>
              {goalPct.toFixed(0)}%
            </Text>
            <Text style={[s.goalSub, { color: colors.textDim }]}>
              {goalReached
                ? '✓ Target atins!'
                : `Mai ai ${(dailyGoal - (stats?.earningsLei ?? 0)).toFixed(0)} RON`}
            </Text>
          </View>
        </View>
      )}

      {/* Stats today */}
      <Text style={[s.sectionLabel, { color: colors.textMuted }]}>STATISTICI · AZI</Text>
      <View style={s.statGrid}>
        <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.statLbl, { color: colors.textMuted }]}>📊 OFERTE</Text>
          <Text style={[s.statVal, { color: colors.text }]}>{stats?.offersCount ?? 0}</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.statLbl, { color: colors.textMuted }]}>📈 PROFIT NET</Text>
          <Text style={[s.statVal, { color: colors.go }]}>
            {(stats?.earningsLei ?? 0).toFixed(0)}
            <Text style={[s.statUnit, { color: colors.textMuted }]}> RON</Text>
          </Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.statLbl, { color: colors.textMuted }]}>✅ FINALIZATE</Text>
          <Text style={[s.statVal, { color: colors.text }]}>{stats?.ridesCount ?? 0}</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.statLbl, { color: colors.textMuted }]}>💰 LEI/KM</Text>
          <Text style={[s.statVal, { color: colors.think }]}>{(stats?.avgPpkm ?? 0).toFixed(2)}</Text>
        </View>
      </View>

      {/* CTA — prominent with icon left + arrow right */}
      <TouchableOpacity
        style={[s.ctaBtn, { backgroundColor: colors.surface, borderColor: colors.accent, shadowColor: colors.accent }]}
        onPress={onOpenOverlayDemo}
        activeOpacity={0.7}
      >
        <Text style={s.ctaIcon}>✨</Text>
        <Text style={[s.ctaTxt, { color: colors.accent }]}>VEZI OVERLAY-UL ÎN ACȚIUNE</Text>
        <Text style={[s.ctaArrow, { color: colors.accent }]}>→</Text>
      </TouchableOpacity>

      {/* Recent rides */}
      <View style={s.sectionRow}>
        <Text style={[s.sectionLabel, { color: colors.textMuted }]}>ULTIMELE VERDICTE</Text>
        <TouchableOpacity onPress={onOpenTracker}><Text style={[s.linkBtn, { color: colors.accent }]}>VEZI TOT →</Text></TouchableOpacity>
      </View>
      {recent.length === 0 ? (
        <View style={[s.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center' }}>
            Nicio cursă azi.{'\n'}Pornește Bolt și DRUMIQ va înregistra automat.
          </Text>
        </View>
      ) : (
        recent.map((r) => {
          const v = VERDICT_DISPLAY[r.verdict];
          return (
            <View key={r.id} style={[s.rideCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: v.color }]}>
              <View style={s.rideTop}>
                <Text style={[s.rideTime, { color: colors.textMuted }]}>{formatTime(r.timestamp)}</Text>
                <Text style={[s.rideVerdict, { color: v.color }]}>{v.symbol}</Text>
              </View>
              <View style={s.rideMiddle}>
                <Text style={[s.ridePrice, { color: colors.text }]}>{(r.grossEarnings ?? 0).toFixed(2)}<Text style={[s.ridePriceUnit, { color: colors.textMuted }]}> lei</Text></Text>
                <Text style={[s.rideProfitKm, { color: v.color }]}>{(r.profitPerKm ?? 0).toFixed(2)} <Text style={[s.rideProfitUnit, { color: colors.textDim }]}>lei/km</Text></Text>
              </View>
              <View style={s.rideBottom}>
                <Text style={[s.rideMeta, { color: colors.textDim }]}>{(r.pickupKm ?? 0).toFixed(1)} + {(r.tripKm ?? 0).toFixed(1)} km · {r.paymentMethod}</Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  // Greeting
  header: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 },
  greetingLabel: { fontSize: 9, letterSpacing: 3, fontWeight: '700', marginBottom: 2 },
  greetingName: { fontSize: 26, fontWeight: '900', letterSpacing: 1 },
  bell: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 },

  // Plan badge
  planBadge: { flexDirection: 'row', padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 6, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  planLabel: { fontSize: 9, letterSpacing: 2.5, fontWeight: '700' },
  planValue: { fontSize: 24, fontWeight: '900', letterSpacing: 1, fontFamily: 'monospace' },
  planExpire: { fontSize: 11, fontFamily: 'monospace' },
  planKey: { fontSize: 9, fontFamily: 'monospace', marginTop: 2 },

  // Progress bar
  progress: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 20 },
  progressFill: { height: '100%', shadowOpacity: 0.6, shadowRadius: 4 },

  // Daily goal — hero card
  goalCard: { borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 16 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  goalIcon: { fontSize: 18 },
  goalLabel: { fontSize: 10, letterSpacing: 2.5, fontWeight: '900' },
  goalHero: { alignItems: 'center', marginBottom: 16 },
  goalHeroValue: { fontSize: 48, fontWeight: '900', fontFamily: 'monospace', lineHeight: 52 },
  goalHeroSub: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
  goalHeroDivider: { fontSize: 20, fontFamily: 'monospace', fontWeight: '300' },
  goalHeroTarget: { fontSize: 20, fontFamily: 'monospace', fontWeight: '700' },
  goalHeroUnit: { fontSize: 11, fontWeight: '500', letterSpacing: 1 },
  goalBarBg: { height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 10 },
  goalBarFill: { height: '100%', borderRadius: 5, shadowOpacity: 0.7, shadowRadius: 8, elevation: 6 },
  goalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalPct: { fontSize: 13, fontWeight: '900', fontFamily: 'monospace' },
  goalSub: { fontSize: 11, fontFamily: 'monospace' },

  // Section labels
  sectionLabel: { fontSize: 10, letterSpacing: 2.5, fontWeight: '900', marginBottom: 10, marginTop: 8 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  linkBtn: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  // Stats grid
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { flexBasis: '47%', flexGrow: 1, borderWidth: 1, borderRadius: 14, padding: 14 },
  statLbl: { fontSize: 9, letterSpacing: 2, fontWeight: '700', marginBottom: 6 },
  statVal: { fontSize: 26, fontWeight: '900', fontFamily: 'monospace' },
  statUnit: { fontSize: 12, fontWeight: '500' },

  // CTA button
  ctaBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1.5, marginBottom: 8, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 6 },
  ctaIcon: { fontSize: 18, marginRight: 10 },
  ctaTxt: { flex: 1, fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  ctaArrow: { fontSize: 20, fontWeight: '700' },

  // Empty card
  emptyCard: { padding: 24, borderRadius: 14, borderWidth: 1, alignItems: 'center' },

  // Ride verdict cards
  rideCard: { padding: 14, borderRadius: 14, borderWidth: 1, borderLeftWidth: 3, marginBottom: 8 },
  rideTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  rideTime: { fontSize: 10, fontFamily: 'monospace', letterSpacing: 1 },
  rideMiddle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  ridePrice: { fontSize: 20, fontWeight: '900', fontFamily: 'monospace' },
  ridePriceUnit: { fontSize: 11, fontWeight: '500' },
  rideProfitKm: { fontSize: 16, fontWeight: '900', fontFamily: 'monospace' },
  rideProfitUnit: { fontSize: 10, fontWeight: '500' },
  rideBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  rideMeta: { fontSize: 10, fontFamily: 'monospace' },
  rideVerdict: { fontSize: 14, fontWeight: '900' },
});
