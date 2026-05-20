// DRUMIQ v1.0.0 — Home Screen
// Shows: greeting + plan badge + daily goal + today's stats + last verdicts + overlay demo button

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { getLicenseState } from '../services/licenseManager';
import { getStatsForPeriod, getRidesForPeriod } from '../services/tracker';
import { getDailyGoal } from '../services/userSettings';
import { VERDICT_DISPLAY } from '../types';
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

  const refresh = useCallback(async () => {
    try {
      const lic = await getLicenseState();
      if (lic.license) {
        setPlan(lic.license.plan);
        setPlanKey(lic.license.key);
        if (lic.license.expiresAt) {
          const days = Math.max(0, Math.ceil((lic.license.expiresAt - Date.now()) / 86400000));
          setPlanExpire(`${days} zile rămase`);
          const total = lic.license.plan === 'trial' ? 86400000 : 30 * 86400000;
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
    } catch {}
  }, []);

  useEffect(() => { refresh(); const i = setInterval(refresh, 30000); return () => clearInterval(i); }, [refresh]);

  const onRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };

  const planColor = plan === 'pro' ? colors.go : plan === 'simplu' ? colors.go : colors.think;

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
          <Text style={[s.greetingLabel, { color: colors.textMuted }]}>BUNĂ ZIUA</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[s.greetingName, { color: colors.text }]}>ANDREI</Text>
            {isFounding && <FoundingBadge compact />}
          </View>
        </View>
        <View style={[s.bell, { borderColor: colors.accent, shadowColor: colors.accent }]}>
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

      {/* Daily Goal */}
      {dailyGoal > 0 && (
        <View style={[s.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.goalHeader}>
            <Text style={[s.goalIcon]}>&#127919;</Text>
            <Text style={[s.goalLabel, { color: colors.textMuted }]}>TARGET AZI</Text>
            <Text style={[s.goalValue, { color: colors.text }]}>
              {stats?.earningsLei.toFixed(0) ?? 0} / {dailyGoal}
              <Text style={[s.goalUnit, { color: colors.textMuted }]}> RON</Text>
            </Text>
          </View>
          <View style={[s.goalBarBg, { backgroundColor: colors.surfaceAlt }]}>
            <View style={[
              s.goalBarFill,
              {
                width: `${Math.min(100, ((stats?.earningsLei ?? 0) / dailyGoal) * 100)}%`,
                backgroundColor: (stats?.earningsLei ?? 0) >= dailyGoal ? colors.go : colors.accent,
                shadowColor: (stats?.earningsLei ?? 0) >= dailyGoal ? colors.go : colors.accent,
              },
            ]} />
          </View>
          <Text style={[s.goalSub, { color: colors.textDim }]}>
            {(stats?.earningsLei ?? 0) >= dailyGoal
              ? 'Target atins!'
              : `Mai ai ${(dailyGoal - (stats?.earningsLei ?? 0)).toFixed(0)} RON`}
          </Text>
        </View>
      )}

      {/* Acceptance rate warning */}
      {stats && stats.offersCount > 0 && (() => {
        const acceptRate = Math.round((stats.ridesCount / stats.offersCount) * 100);
        if (acceptRate < 75) return (
          <View style={[s.warningCard, { backgroundColor: acceptRate < 70 ? '#FF336620' : '#FFB80020', borderColor: acceptRate < 70 ? '#FF3366' : '#FFB800' }]}>
            <Text style={[s.warningTxt, { color: acceptRate < 70 ? '#FF3366' : '#FFB800' }]}>
              {acceptRate < 70 ? '🚨' : '⚠️'} Rata acceptare: {acceptRate}% {acceptRate < 70 ? '— SUB PRAG BLOCARE 70%!' : '— aproape de prag 70%'}
            </Text>
          </View>
        );
        return null;
      })()}

      {/* Stats today */}
      <Text style={[s.sectionLabel, { color: colors.textMuted }]}>STATISTICI · AZI</Text>
      <View style={s.statGrid}>
        <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.statLbl, { color: colors.textMuted }]}>📊 OFERTE</Text>
          <Text style={[s.statVal, { color: colors.text }]}>{stats?.offersCount ?? 0}</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.statLbl, { color: colors.textMuted }]}>📈 PROFIT NET</Text>
          <Text style={[s.statVal, { color: colors.go }]}>{stats?.earningsLei.toFixed(0) ?? 0}<Text style={[s.statUnit, { color: colors.textMuted }]}> RON</Text></Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.statLbl, { color: colors.textMuted }]}>✅ FINALIZATE</Text>
          <Text style={[s.statVal, { color: colors.text }]}>{stats?.ridesCount ?? 0}</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.statLbl, { color: colors.textMuted }]}>💰 LEI/KM</Text>
          <Text style={[s.statVal, { color: colors.think }]}>{stats?.avgPpkm.toFixed(2) ?? '0.00'}</Text>
        </View>
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[s.ctaBtn, { backgroundColor: colors.surface, borderColor: colors.accent }]}
        onPress={onOpenOverlayDemo}
        activeOpacity={0.7}
      >
        <Text style={[s.ctaTxt, { color: colors.accent }]}>✨  VEZI OVERLAY-UL ÎN ACȚIUNE</Text>
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
                <Text style={[s.ridePrice, { color: colors.text }]}>{r.grossEarnings.toFixed(2)} lei</Text>
              </View>
              <View style={s.rideBottom}>
                <Text style={[s.rideMeta, { color: colors.textMuted }]}>{(r.pickupKm ?? 0).toFixed(1)} + {(r.tripKm ?? 0).toFixed(1)} km · {r.paymentMethod}</Text>
                <Text style={[s.rideVerdict, { color: v.color }]}>{v.symbol} {(r.profitPerKm ?? 0).toFixed(2)}</Text>
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
  header: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  greetingLabel: { fontSize: 9, letterSpacing: 3, fontWeight: '700' },
  greetingName: { fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  bell: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },

  planBadge: { flexDirection: 'row', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 6, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  planLabel: { fontSize: 9, letterSpacing: 2, fontWeight: '700' },
  planValue: { fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  planExpire: { fontSize: 11, fontFamily: 'monospace' },
  planKey: { fontSize: 9, fontFamily: 'monospace', marginTop: 2 },

  progress: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 16 },
  progressFill: { height: '100%', shadowOpacity: 0.6, shadowRadius: 4 },

  goalCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  goalIcon: { fontSize: 16 },
  goalLabel: { fontSize: 9, letterSpacing: 2, fontWeight: '700' },
  goalValue: { marginLeft: 'auto', fontSize: 16, fontWeight: '900', fontFamily: 'monospace' },
  goalUnit: { fontSize: 10, fontWeight: '500' },
  goalBarBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  goalBarFill: { height: '100%', borderRadius: 4, shadowOpacity: 0.6, shadowRadius: 6, elevation: 4 },
  goalSub: { fontSize: 10, fontFamily: 'monospace', textAlign: 'right' },

  sectionLabel: { fontSize: 10, letterSpacing: 2.5, fontWeight: '900', marginBottom: 10, marginTop: 8 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  linkBtn: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statCard: { width: '48.5%', borderWidth: 1, borderRadius: 10, padding: 12 },
  statLbl: { fontSize: 8, letterSpacing: 2, fontWeight: '700', marginBottom: 4 },
  statVal: { fontSize: 22, fontWeight: '700', fontFamily: 'monospace' },
  statUnit: { fontSize: 11, fontWeight: '500' },

  ctaBtn: { padding: 14, borderRadius: 8, borderWidth: 1, alignItems: 'center', marginBottom: 8 },
  ctaTxt: { fontSize: 13, fontWeight: '700', letterSpacing: 1.2 },

  warningCard: { padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  warningTxt: { fontSize: 11, fontWeight: '700', textAlign: 'center' },

  emptyCard: { padding: 20, borderRadius: 10, borderWidth: 1, alignItems: 'center' },

  rideCard: { padding: 10, borderRadius: 8, borderWidth: 1, borderLeftWidth: 3, marginBottom: 6 },
  rideTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  rideTime: { fontSize: 10, fontFamily: 'monospace' },
  ridePrice: { fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
  rideBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  rideMeta: { fontSize: 10, fontFamily: 'monospace' },
  rideVerdict: { fontSize: 11, fontWeight: '700' },
});
