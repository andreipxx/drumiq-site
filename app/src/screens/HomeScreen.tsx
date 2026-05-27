// DRUMIQ v2.0.0 — Home Screen (Aurora × Racing × Cyber)

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, AppState, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { getLicenseState } from '../services/licenseManager';
import { getStatsForPeriod, getRidesForPeriod } from '../services/tracker';
import { getDailyGoal } from '../services/userSettings';
import { getProfile } from '../services/auth';
import { VERDICT_DISPLAY } from '../types';
import { TRIAL } from '../constants/config';
import type { PlanTier, Ride, TrackerStats } from '../types';
import { FONT, SIZE, RADIUS, GAP } from '../constants/typography';
import BetaDisclaimer from '../components/BetaDisclaimer';
import AuroraBg from '../components/AuroraBg';
import { isFoundingMember, FoundingBadge } from '../components/FoundingBadge';
import { initSession, startSession, stopSession, isSessionActive, type SessionState } from '../services/sessionManager';

interface Props {
  onOpenOverlayDemo: () => void;
  onOpenTracker: () => void;
}

export default function HomeScreen({ onOpenOverlayDemo, onOpenTracker }: Props) {
  const { colors, fontsLoaded } = useTheme();
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
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionStart, setSessionStart] = useState<number | null>(null);

  // Animations
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pulseDotAnim = useRef(new Animated.Value(1)).current;

  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(shimmerAnim, {
      toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true,
    })).start();

    Animated.loop(Animated.sequence([
      Animated.timing(pulseDotAnim, { toValue: 1.4, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulseDotAnim, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();

    Animated.loop(Animated.sequence([
      Animated.timing(blinkAnim, { toValue: 0.3, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(blinkAnim, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, []);

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

  useEffect(() => {
    initSession().then(s => { setSessionActive(s.active); setSessionStart(s.startedAt); });
    const sub = require('react-native').DeviceEventEmitter.addListener('dp_session_changed', (s: SessionState) => {
      setSessionActive(s.active);
      setSessionStart(s.startedAt);
    });
    return () => sub.remove();
  }, []);

  const toggleSession = useCallback(async () => {
    if (sessionActive) {
      await stopSession();
    } else {
      await startSession();
    }
  }, [sessionActive]);

  const refresh = useCallback(async () => {
    try {
      const lic = await getLicenseState();
      if (lic.license) {
        setPlan(lic.license.plan);
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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bună dimineața' : hour < 18 ? 'Bună ziua' : 'Bună seara';

  const goalPct = dailyGoal > 0 ? Math.min(100, ((stats?.earningsLei ?? 0) / dailyGoal) * 100) : 0;
  const goalReached = (stats?.earningsLei ?? 0) >= dailyGoal;


  const ff = fontsLoaded;

  if (initialLoading) {
    return (
      <View style={[st.root, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.cyan} />
      </View>
    );
  }

  return (
    <View style={[st.root, { backgroundColor: colors.bg }]}>
      <AuroraBg />

      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
        showsVerticalScrollIndicator={false}
      >
        <BetaDisclaimer />

        {/* Greeting */}
        <View style={st.header}>
          <View style={{ flex: 1 }}>
            <Text style={[st.salut, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
              // {greeting}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[st.name, { color: colors.text, fontFamily: ff ? FONT.displayXB : FONT.system }]}>
                {driverName}
              </Text>
              <Text style={[st.sparkle, { color: colors.cyan }]}>✦</Text>
              {isFounding && <FoundingBadge compact />}
            </View>
          </View>
          <View style={[st.bellBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={{ fontSize: 16 }}>🔔</Text>
            <View style={[st.bellDot, { backgroundColor: colors.pink }]} />
          </View>
        </View>

        {/* Start / Stop session — chevron shape */}
        <TouchableOpacity onPress={toggleSession} activeOpacity={0.8} style={st.startWrap}>
          <LinearGradient
            colors={sessionActive
              ? [colors.red, colors.pink] as [string, string]
              : colors.gradButton}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={st.startBtn}
          >
            {/* Pulse dot */}
            <Animated.View style={[st.pulseDot, { transform: [{ scale: pulseDotAnim }] }]} />
            <Text style={[st.startIcon, { fontFamily: ff ? FONT.display : FONT.system }]}>▶▶</Text>
            <Text style={[st.startTxt, { fontFamily: ff ? FONT.displayXB : FONT.system }]}>
              {sessionActive ? 'OPREȘTE SESIUNEA' : 'PORNEȘTE SESIUNEA'}
            </Text>
            {sessionActive && sessionStart && (
              <Text style={[st.startSub, { fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
                din {formatTime(sessionStart)}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Plan card mini */}
        <View style={[st.planCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <LinearGradient
            colors={colors.gradPrimary}
            style={st.planStripe}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
          <View style={{ flex: 1, paddingLeft: 12 }}>
            <Text style={[st.planLabel, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
              // Plan activ
            </Text>
            <Text style={[st.planValue, { fontFamily: ff ? FONT.displayXB : FONT.system }]}>
              {(plan || '—').toUpperCase()}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[st.planDays, { color: colors.text, fontFamily: ff ? FONT.bodySB : FONT.system }]}>
              {planExpire}
            </Text>
            <Text style={[st.planFrom, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
              {(planKey || '—').toUpperCase()}
            </Text>
          </View>
          {/* Progress bar at bottom */}
          <View style={st.planProgressWrap}>
            <LinearGradient
              colors={colors.gradPrimary}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[st.planProgressFill, { width: `${progressPct}%` }]}
            />
          </View>
        </View>

        {/* Target hero card with animated orb */}
        {dailyGoal > 0 && (
          <View style={[st.targetCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={{ position: 'relative', zIndex: 2 }}>
              {/* Header */}
              <View style={st.targetHead}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Animated.View style={[st.liveDot, { backgroundColor: colors.cyan, opacity: blinkAnim }]} />
                  <Text style={[st.targetLabel, { color: colors.textSoft, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
                    ◎ Target azi
                  </Text>
                </View>
                <View style={[st.pctPill, {
                  backgroundColor: `${colors.cyan}26`,
                  borderColor: `${colors.cyan}66`,
                }]}>
                  <Text style={[st.pctPillTxt, { color: colors.cyan, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
                    {goalPct.toFixed(0)}%
                  </Text>
                </View>
              </View>

              {/* Hero number */}
              <View style={{ alignItems: 'center', marginVertical: 4 }}>
                <Text style={[st.heroNum, {
                  color: goalReached ? colors.go : colors.text,
                  fontFamily: ff ? FONT.displayXB : FONT.system,
                }]}>
                  {(stats?.earningsLei ?? 0).toFixed(0)}
                </Text>
                <Text style={[st.heroSub, { fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
                  <Text style={{ color: colors.textMuted }}>/ </Text>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{dailyGoal} RON</Text>
                </Text>
              </View>

              {/* Progress bar */}
              <View style={[st.progBar, { backgroundColor: colors.bgInput, borderColor: colors.borderSoft }]}>
                <LinearGradient
                  colors={goalReached ? colors.goGrad : colors.gradPrimary}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[st.progFill, { width: `${goalPct}%` }]}
                />
              </View>

              {/* Footer */}
              <View style={st.targetFoot}>
                <Text style={[st.targetFootL, { color: colors.cyan, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
                  {goalReached ? '✓ Target atins!' : 'Stage 1 · În progres'}
                </Text>
                <Text style={[st.targetFootR, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
                  {goalReached ? '' : `Mai ai ${(dailyGoal - (stats?.earningsLei ?? 0)).toFixed(0)} RON`}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Section label — Statistici */}
        <View style={st.sectionRow}>
          <Text style={[st.sectionLabel, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
            // Statistici · Azi
          </Text>
          <View style={[st.sectionLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Stats grid 2x2 */}
        <View style={st.statGrid}>
          <StatCell
            label="📊 Oferte" value={`${stats?.offersCount ?? 0}`}
            glowColor={colors.cyan} colors={colors} ff={ff}
          />
          <StatCell
            label="📈 Profit net" value={`${(stats?.earningsLei ?? 0).toFixed(0)}`} unit="RON"
            glowColor={colors.green} colors={colors} ff={ff}
            gradientColors={colors.gradSuccess}
          />
          <StatCell
            label="✓ Finalizate" value={`${stats?.ridesCount ?? 0}`}
            glowColor={colors.pink} colors={colors} ff={ff}
          />
          <StatCell
            label="💰 Lei / km" value={`${(stats?.avgPpkm ?? 0).toFixed(2)}`}
            glowColor={colors.amber} colors={colors} ff={ff}
            gradientColors={[colors.amber, colors.pink]}
          />
        </View>

        {/* CTA — overlay demo */}
        <TouchableOpacity
          style={[st.ctaCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
          onPress={onOpenOverlayDemo}
          activeOpacity={0.7}
        >
          <Text style={st.ctaIcon}>✨</Text>
          <Text style={[st.ctaTxt, { color: colors.cyan, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
            VEZI OVERLAY-UL ÎN ACȚIUNE
          </Text>
          <Text style={[st.ctaArrow, { color: colors.cyan }]}>→</Text>
        </TouchableOpacity>

        {/* Recent rides */}
        <View style={st.sectionRowBetween}>
          <View style={st.sectionRow}>
            <Text style={[st.sectionLabel, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
              // Ultimele verdicte
            </Text>
            <View style={[st.sectionLine, { backgroundColor: colors.border }]} />
          </View>
          <TouchableOpacity onPress={onOpenTracker}>
            <Text style={[st.linkBtn, { color: colors.cyan, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
              VEZI TOT →
            </Text>
          </TouchableOpacity>
        </View>

        {recent.length === 0 ? (
          <View style={[st.emptyCard, { borderColor: colors.border }]}>
            <Text style={{ fontSize: 32, opacity: 0.5, marginBottom: 8 }}>🚗</Text>
            <Text style={[st.emptyTitle, { color: colors.textSoft, fontFamily: ff ? FONT.bodySB : FONT.system }]}>
              Nicio cursă încă
            </Text>
            <Text style={[st.emptySub, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
              DRUMIQ înregistrează automat la accept Bolt
            </Text>
          </View>
        ) : (
          recent.map((r) => {
            const v = VERDICT_DISPLAY[r.verdict];
            return (
              <View key={r.id} style={[st.rideCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
                <View style={[st.rideStripe, { backgroundColor: v.color }]} />
                <View style={st.rideContent}>
                  <View style={st.rideTop}>
                    <Text style={[st.rideTime, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
                      {formatTime(r.timestamp)}
                    </Text>
                    <Text style={[st.rideVerdict, { color: v.color, fontFamily: ff ? FONT.displayXB : FONT.system }]}>
                      {v.symbol}
                    </Text>
                  </View>
                  <View style={st.rideMiddle}>
                    <Text style={[st.ridePrice, { color: colors.text, fontFamily: ff ? FONT.displayXB : FONT.system }]}>
                      {(r.grossEarnings ?? 0).toFixed(2)}
                      <Text style={[st.ridePriceUnit, { color: colors.textMuted }]}> lei</Text>
                    </Text>
                    <Text style={[st.rideProfitKm, { color: v.color, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
                      {(r.profitPerKm ?? 0).toFixed(2)}
                      <Text style={[st.rideProfitUnit, { color: colors.textFaint }]}> lei/km</Text>
                    </Text>
                  </View>
                  <Text style={[st.rideMeta, { color: colors.textFaint, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
                    {(r.pickupKm ?? 0).toFixed(1)} + {(r.tripKm ?? 0).toFixed(1)} km · {r.paymentMethod}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ─── StatCell component ───
function StatCell({ label, value, unit, glowColor, colors, ff, gradientColors }: {
  label: string; value: string; unit?: string; glowColor: string;
  colors: any; ff: boolean; gradientColors?: string[];
}) {
  return (
    <View style={[st.statCell, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
      <Text style={[st.statLbl, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
        {label}
      </Text>
      {gradientColors ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={[st.statVal, { color: gradientColors[0], fontFamily: ff ? FONT.displayXB : FONT.system }]}>
            {value}
          </Text>
          {unit && <Text style={[st.statUnit, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}> {unit}</Text>}
        </View>
      ) : (
        <Text style={[st.statVal, { color: colors.text, fontFamily: ff ? FONT.displayXB : FONT.system }]}>
          {value}
        </Text>
      )}
    </View>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// ─── Styles ───
const st = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },


  // Greeting header
  header: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 18, marginTop: 8 },
  salut: { fontSize: SIZE.sm, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  name: { fontSize: SIZE['3xl'], letterSpacing: -1, lineHeight: 40 },
  sparkle: { fontSize: 26, marginLeft: 4 },
  bellBtn: {
    width: 42, height: 42, borderRadius: 21, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  bellDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
    shadowOpacity: 0.8, shadowRadius: 4, elevation: 3,
  },

  // Start button (chevron style)
  startWrap: { marginBottom: 18, shadowColor: '#7c3aed', shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  startBtn: {
    paddingVertical: 20, paddingHorizontal: 24,
    borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    position: 'relative',
  },
  pulseDot: {
    position: 'absolute', left: 18, top: '50%' as any,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#fff',
    shadowColor: '#fff', shadowOpacity: 1, shadowRadius: 6, elevation: 3,
    marginTop: -3,
  },
  startIcon: { fontSize: 14, color: '#fff', letterSpacing: -2 },
  startTxt: { fontSize: 17, color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' },
  startSub: { position: 'absolute', bottom: 6, right: 24, fontSize: 9, color: 'rgba(255,255,255,0.7)', letterSpacing: 2 },

  // Plan card
  planCard: {
    borderWidth: 1, borderRadius: RADIUS.xl, padding: 14, paddingLeft: 6,
    marginBottom: 14, flexDirection: 'row', alignItems: 'center',
    position: 'relative', overflow: 'hidden',
  },
  planStripe: { width: 3, height: '100%' as any, borderRadius: 2, position: 'absolute', left: 0, top: 0 },
  planLabel: { fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  planValue: { fontSize: 24, letterSpacing: 1, color: '#06b6d4' },
  planDays: { fontSize: SIZE.lg, letterSpacing: -0.3 },
  planFrom: { fontSize: 9, letterSpacing: 0.5, marginTop: 2 },
  planProgressWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, overflow: 'hidden',
  },
  planProgressFill: { height: '100%' as any },

  // Target hero card
  targetCard: {
    borderWidth: 1, borderRadius: RADIUS['2xl'], padding: 22,
    marginBottom: 14, position: 'relative', overflow: 'hidden',
  },
  targetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  liveDot: { width: 6, height: 6, borderRadius: 3, shadowOpacity: 0.8, shadowRadius: 4, elevation: 2 },
  targetLabel: { fontSize: SIZE.sm, letterSpacing: 1.5, textTransform: 'uppercase' },
  pctPill: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: RADIUS.pill, borderWidth: 1 },
  pctPillTxt: { fontSize: SIZE.sm, letterSpacing: 2 },
  heroNum: { fontSize: SIZE['5xl'], lineHeight: 90, letterSpacing: -3 },
  heroSub: { fontSize: 12, letterSpacing: 1, marginTop: 2 },

  // Progress bar
  progBar: { height: 6, borderRadius: RADIUS.pill, overflow: 'hidden', marginBottom: 10, borderWidth: 1 },
  progFill: { height: '100%' as any, borderRadius: RADIUS.pill },

  // Target footer
  targetFoot: { flexDirection: 'row', justifyContent: 'space-between' },
  targetFootL: { fontSize: 11, letterSpacing: 2 },
  targetFootR: { fontSize: 11 },

  // Section label
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 10 },
  sectionRowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  sectionLabel: { fontSize: SIZE.sm, letterSpacing: 2, textTransform: 'uppercase' },
  sectionLine: { flex: 1, height: 1, opacity: 0.5 },
  linkBtn: { fontSize: SIZE.sm, letterSpacing: 0.5 },

  // Stats grid
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCell: {
    flexBasis: '47%', flexGrow: 1, borderWidth: 1, borderRadius: RADIUS.lg,
    padding: 14, paddingHorizontal: 16, position: 'relative', overflow: 'hidden',
  },
  statLbl: { fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, position: 'relative' },
  statVal: { fontSize: SIZE['2xl'], lineHeight: 32, position: 'relative' },
  statUnit: { fontSize: SIZE.sm },

  // CTA button
  ctaCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: RADIUS.md, borderWidth: 1, marginBottom: 8,
  },
  ctaIcon: { fontSize: 18, marginRight: 10 },
  ctaTxt: { flex: 1, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  ctaArrow: { fontSize: 20, fontWeight: '700' },

  // Empty state
  emptyCard: {
    padding: 24, borderRadius: RADIUS.lg, borderWidth: 1, borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyTitle: { fontSize: SIZE.base, marginBottom: 4 },
  emptySub: { fontSize: SIZE.xs, letterSpacing: 0.5, textAlign: 'center' },

  // Ride cards
  rideCard: {
    borderWidth: 1, borderRadius: RADIUS.lg, marginBottom: 8,
    flexDirection: 'row', overflow: 'hidden',
  },
  rideStripe: { width: 3 },
  rideContent: { flex: 1, padding: 14 },
  rideTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  rideTime: { fontSize: SIZE.sm, letterSpacing: 0.5 },
  rideVerdict: { fontSize: 14 },
  rideMiddle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  ridePrice: { fontSize: 20 },
  ridePriceUnit: { fontSize: 11 },
  rideProfitKm: { fontSize: SIZE.lg },
  rideProfitUnit: { fontSize: SIZE.sm },
  rideMeta: { fontSize: SIZE.sm, letterSpacing: 2 },
});
