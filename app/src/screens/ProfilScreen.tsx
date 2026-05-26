// DRUMIQ v2.0.0 — Profil Șofer Screen (Aurora × Racing × Cyber)

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, DeviceEventEmitter, TextInput, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { getProfile, onAuthStateChange } from '../services/auth';
import { getLicenseState } from '../services/licenseManager';
import { confirmChangeCode, confirmLogout } from '../services/accountActions';
import { loadRides } from '../services/tracker';
import { getFuelSettings, setFuelSettings, getVehicleInfo, setVehicleInfo, totalCostPerKm, getDailyGoal, saveDailyGoal, type FuelSettings, type VehicleInfo } from '../services/userSettings';
import carsData from '../data/cars.json';
import { getPlatformStatuses, formatLastSeen, type PlatformStatus } from '../services/platformDetector';
import type { PlanTier } from '../types';
import { APP_VERSION, PLAN_PRICES_RON, REFERRAL_TIERS } from '../constants/config';
import { getReferralInfo, type ReferralInfo } from '../services/referralService';
import { FONT, SIZE, RADIUS } from '../constants/typography';

interface ScreenProps { onOpenLicense: () => void; }

export default function ProfilScreen({ onOpenLicense }: ScreenProps) {
  const { colors, fontsLoaded: ff } = useTheme();
  const [profileName, setProfileName] = useState<string>('Utilizator');
  const [profileEmail, setProfileEmail] = useState<string>('');
  const [plan, setPlan] = useState<PlanTier | null>(null);
  const [licKey, setLicKey] = useState<string>('');
  const [fuel, setFuel] = useState<FuelSettings | null>(null);
  const [vehicle, setVehicle] = useState<VehicleInfo>({ licensePlate: '', model: '' });
  const [platforms, setPlatforms] = useState<PlatformStatus[]>([]);
  const [editingPlate, setEditingPlate] = useState<string>('');
  const [editingModel, setEditingModel] = useState<string>('');
  const [completedRides, setCompletedRides] = useState<any[]>([]);
  const [dailyGoal, setDailyGoal] = useState<number>(0);
  const [referral, setReferral] = useState<ReferralInfo | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);

  const lifetimeStats = useMemo(() => ({
    rides: completedRides.length,
    earnings: completedRides.reduce((sum, r) => sum + (r.netEarnings ?? 0), 0),
    km: completedRides.reduce((sum, r) => sum + (r.tripKm ?? 0), 0),
  }), [completedRides]);
  const [editingGoal, setEditingGoal] = useState<string>('');

  const orbPulse = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(orbPulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(orbPulse, { toValue: 0.6, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, []);

  const fetchProfile = async () => {
    try {
      const profile = await getProfile();
      if (profile) {
        const trimmedName = (profile.name || '').trim();
        setProfileName(trimmedName || 'Utilizator');
        setProfileEmail(profile.email || '');
      }
    } catch {}
  };

  useEffect(() => {
    fetchProfile();
    const sub = onAuthStateChange((_event, _session) => { fetchProfile(); });
    return () => {
      if (sub && typeof sub === 'object' && 'data' in sub) {
        (sub as any).data?.subscription?.unsubscribe();
      }
    };
  }, []);

  const reloadFuel = async () => { const f = await getFuelSettings(); setFuel(f); };

  useEffect(() => {
    (async () => {
      try {
        const lic = await getLicenseState();
        if (lic.license) { setPlan(lic.license.plan); setLicKey(lic.license.plan.toUpperCase()); }
        await reloadFuel();
        const veh = await getVehicleInfo();
        setVehicle(veh);
        const plats = await getPlatformStatuses();
        setPlatforms(plats);
        setEditingPlate(veh.licensePlate);
        setEditingModel(veh.model);
        const rides = await loadRides();
        setCompletedRides(rides.filter((r) => r.completed));
        const goal = await getDailyGoal();
        setDailyGoal(goal);
        setEditingGoal(goal > 0 ? String(goal) : '');
      } catch {}
    })();
    const sub = DeviceEventEmitter.addListener('dp_fuel_changed', reloadFuel);
    return () => sub.remove();
  }, []);

  const loadReferral = useCallback(async () => {
    setReferralLoading(true);
    try { const info = await getReferralInfo(); setReferral(info); } catch {}
    setReferralLoading(false);
  }, []);

  useEffect(() => { loadReferral(); }, [loadReferral]);

  const handleSaveVehicle = async () => {
    const next: VehicleInfo = { licensePlate: editingPlate, model: editingModel };
    await setVehicleInfo(next);
    setVehicle(next);
    setEditingPlate(next.licensePlate.toUpperCase().replace(/\s+/g, ''));
    const modelLower = editingModel.toLowerCase().trim();
    const cars = carsData as { brand: string; model: string; engines: { name: string; fuel: string; wear: number }[] }[];
    const matched = cars.find(c => {
      const full = `${c.brand} ${c.model}`.toLowerCase();
      return modelLower.includes(full) || full.includes(modelLower.replace(/\d{4}$/, '').trim());
    });
    if (matched && matched.engines.length > 0) {
      const currentFuel = await getFuelSettings();
      const fuelLower = currentFuel.type.replace('_', '+').replace('benzina', 'benzină');
      const engineMatch = matched.engines.find(e => e.fuel.toLowerCase().includes(fuelLower)) ?? matched.engines[0];
      const updated = { ...currentFuel, wearPerKm: engineMatch.wear };
      await setFuelSettings(updated);
      setFuel(updated);
      Alert.alert('Salvat', `Vehicul actualizat.\nUzură setată automat: ${engineMatch.wear} RON/km (${matched.brand} ${matched.model}).`);
    } else {
      Alert.alert('Salvat', 'Datele vehiculului au fost actualizate.\nModelul nu a fost găsit în baza de date — setează uzura manual în Carburant.');
    }
  };

  const vehicleDirty = editingPlate.toUpperCase().replace(/\s+/g, '') !== vehicle.licensePlate || editingModel.trim() !== vehicle.model;
  const handleChangeCode = () => confirmChangeCode(onOpenLicense);
  const handleLogout = () => confirmLogout();
  const formatLifetimeRon = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0);

  const handleSaveGoal = async () => {
    const n = parseInt(editingGoal.replace(',', '.'), 10);
    const goal = isNaN(n) ? 0 : n;
    await saveDailyGoal(goal);
    setDailyGoal(goal);
    Alert.alert('Salvat', goal > 0 ? `Obiectiv zilnic: ${goal} lei` : 'Obiectiv dezactivat.');
  };
  const goalDirty = editingGoal !== (dailyGoal > 0 ? String(dailyGoal) : '');

  const fuelLabel = fuel?.type === 'benzina_gpl' ? 'Benzină + GPL'
    : fuel?.type === 'diesel' ? 'Diesel'
    : fuel?.type === 'electric' ? 'Electric'
    : fuel?.type === 'hybrid_hev' ? 'Hybrid (HEV)'
    : fuel?.type === 'hybrid_phev' ? 'Plug-in Hybrid (PHEV)'
    : fuel?.type === 'hybrid_gpl' ? 'Hybrid + GPL'
    : 'Benzină';

  return (
    <View style={[st.root, { backgroundColor: colors.bg }]}>
      <View style={[st.auroraBlob, st.aurora1, { backgroundColor: colors.aurora1 }]} />
      <View style={[st.auroraBlob, st.aurora2, { backgroundColor: colors.aurora2 }]} />
      <View style={[st.auroraBlob, st.aurora3, { backgroundColor: colors.aurora3 }]} />

      <ScrollView style={st.scroll} contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={[st.title, { fontFamily: ff ? FONT.displayXB : FONT.system }]}>
          <Text style={{ color: colors.text }}>Profil </Text>
          <Text style={{ color: colors.cyan }}>șofer</Text>
        </Text>
        <Text style={[st.sub, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
          // date locale · pe acest dispozitiv
        </Text>

        {/* Profile hero card */}
        <View style={[st.heroCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Animated.View style={[st.heroOrb, { backgroundColor: colors.violet, opacity: orbPulse }]} />
          <View style={{ position: 'relative', zIndex: 2, alignItems: 'center' }}>
            {/* Avatar */}
            <View style={st.avatarWrap}>
              <LinearGradient colors={colors.gradButton} style={st.avatar}>
                <Text style={[st.avatarTxt, { fontFamily: ff ? FONT.displayXB : FONT.system }]}>
                  {(profileName.charAt(0) || 'U').toUpperCase()}
                </Text>
              </LinearGradient>
            </View>
            <Text style={[st.heroName, { color: colors.text, fontFamily: ff ? FONT.displayXB : FONT.system }]}>
              {profileName}
            </Text>
            <Text style={[st.heroEmail, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
              {profileEmail || 'date locale'}
            </Text>
            {plan && (
              <View style={[st.planPill, { backgroundColor: `${colors.violet}26`, borderColor: `${colors.violet}66` }]}>
                <Text style={[st.planPillTxt, { color: colors.violet, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
                  ◆ {plan.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Vehicul */}
        <SectionLabel text="// Vehicul" colors={colors} ff={ff} />
        <View style={[st.fieldCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
          <FieldRow label="Plăcuță" colors={colors} ff={ff}>
            <TextInput
              value={editingPlate}
              onChangeText={(t) => setEditingPlate(t.toUpperCase().replace(/\s+/g, ''))}
              placeholder="B123GOO"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
              style={[st.inputBox, { color: colors.text, backgroundColor: colors.bgInput, borderColor: colors.borderSoft, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}
            />
          </FieldRow>
          <View style={[st.fieldDivider, { backgroundColor: colors.borderSoft }]} />
          <FieldRow label="Model" colors={colors} ff={ff}>
            <TextInput
              value={editingModel}
              onChangeText={setEditingModel}
              placeholder="Dacia Sandero 2023"
              placeholderTextColor={colors.textFaint}
              maxLength={50}
              style={[st.inputWide, { color: colors.text, backgroundColor: colors.bgInput, borderColor: colors.borderSoft, fontFamily: ff ? FONT.body : FONT.system }]}
            />
          </FieldRow>
          {vehicleDirty && (
            <TouchableOpacity onPress={handleSaveVehicle} activeOpacity={0.8} style={{ marginTop: 10 }}>
              <LinearGradient colors={colors.gradButton} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={st.saveBtn}>
                <Text style={[st.saveBtnTxt, { fontFamily: ff ? FONT.display : FONT.system }]}>💾 SALVEAZĂ VEHICULUL</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          <View style={[st.fieldDivider, { backgroundColor: colors.borderSoft }]} />
          <FieldRow label="Carburant" colors={colors} ff={ff}>
            <Text style={[st.fieldVal, { color: colors.text, fontFamily: ff ? FONT.bodySB : FONT.system }]}>{fuelLabel}</Text>
          </FieldRow>
          <View style={[st.fieldDivider, { backgroundColor: colors.borderSoft }]} />
          <FieldRow label="Cost total/km" colors={colors} ff={ff}>
            <Text style={[st.fieldVal, { color: colors.green, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
              {fuel ? totalCostPerKm(fuel).toFixed(2) : '—'} RON
            </Text>
          </FieldRow>
        </View>

        {/* Obiectiv zilnic */}
        <SectionLabel text="// Obiectiv zilnic" colors={colors} ff={ff} />
        <View style={[st.fieldCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
          <View style={st.goalRow}>
            <Text style={[st.fieldLbl, { color: colors.textSoft, fontFamily: ff ? FONT.bodySB : FONT.system }]}>Target</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                value={editingGoal}
                onChangeText={(t) => setEditingGoal(t.replace(/[^0-9]/g, ''))}
                placeholder="300"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                maxLength={5}
                style={[st.goalInput, { color: colors.text, backgroundColor: colors.bgInput, borderColor: colors.border, fontFamily: ff ? FONT.displayXB : FONT.system }]}
              />
              <Text style={[st.goalUnit, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>lei/zi</Text>
            </View>
          </View>
          <Text style={[st.hintTxt, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
            Overlay afișează progresul AZI: X/{dailyGoal > 0 ? dailyGoal : '?'} lei. 0 = dezactivat.
          </Text>
          {goalDirty && (
            <TouchableOpacity onPress={handleSaveGoal} activeOpacity={0.8} style={{ marginTop: 10 }}>
              <LinearGradient colors={colors.gradButton} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={st.saveBtn}>
                <Text style={[st.saveBtnTxt, { fontFamily: ff ? FONT.display : FONT.system }]}>💾 SALVEAZĂ OBIECTIV</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Platforme */}
        <SectionLabel text="// Platforme · auto-detect" colors={colors} ff={ff} />
        {platforms.map((pl, idx) => {
          const stateColor = pl.state === 'active' ? colors.green : pl.state === 'idle' ? colors.amber : colors.textFaint;
          const stateText = pl.state === 'active' ? 'ACTIV' : pl.state === 'idle' ? 'INACTIV' : 'NEDETECTAT';
          const icon = pl.id === 'bolt' ? '🚗' : '🚙';
          return (
            <View key={pl.id} style={[st.platformCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft, marginBottom: idx < platforms.length - 1 ? 8 : 14 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <Text style={{ fontSize: 24 }}>{icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[st.platformName, { color: colors.text, fontFamily: ff ? FONT.bodySB : FONT.system }]}>{pl.name}</Text>
                  <Text style={[st.platformSub, { color: colors.textFaint, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
                    {pl.lastSeenAt ? `ultimă detecție: ${formatLastSeen(pl.lastSeenAt)}` : 'nu a fost detectat'}
                  </Text>
                </View>
              </View>
              <View style={[st.statusPill, { backgroundColor: `${stateColor}1A`, borderColor: `${stateColor}66` }]}>
                <Text style={[st.statusTxt, { color: stateColor, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>{stateText}</Text>
              </View>
            </View>
          );
        })}

        {/* Lifetime stats */}
        <SectionLabel text="// Lifetime stats" colors={colors} ff={ff} />
        <View style={st.statGrid}>
          {[
            { label: 'CURSE', value: `${lifetimeStats.rides}`, color: colors.text, glow: colors.cyan },
            { label: 'VENIT NET', value: formatLifetimeRon(lifetimeStats.earnings), unit: ' RON', color: colors.green, glow: colors.green },
            { label: 'KM PARCURȘI', value: `${lifetimeStats.km.toFixed(0)}`, unit: ' km', color: colors.text, glow: colors.pink },
            { label: 'LICENȚĂ', value: licKey || '—', color: colors.violet, glow: colors.violet },
          ].map((s, i) => (
            <View key={i} style={[st.statCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
              <View style={[st.statGlow, { backgroundColor: s.glow }]} />
              <Text style={[st.statLbl, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>{s.label}</Text>
              <Text style={[st.statVal, { color: s.color, fontFamily: ff ? FONT.displayXB : FONT.system }]}>
                {s.value}
                {s.unit && <Text style={{ color: colors.textMuted, fontSize: SIZE.sm }}>{s.unit}</Text>}
              </Text>
            </View>
          ))}
        </View>

        {/* Referral */}
        <SectionLabel text="// Invită prieteni · discount" colors={colors} ff={ff} />
        <View style={[st.fieldCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
          {referral?.referralCode ? (
            <View style={[st.refCodeRow, { borderBottomColor: colors.borderSoft, borderBottomWidth: 1, paddingBottom: 10, marginBottom: 8 }]}>
              <Text style={[st.fieldLbl, { color: colors.textMuted, fontFamily: ff ? FONT.body : FONT.system }]}>Codul tău:</Text>
              <Text style={[st.refCode, { color: colors.cyan, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>{referral.referralCode}</Text>
            </View>
          ) : (
            <Text style={[st.fieldLbl, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono, marginBottom: 8 }]}>
              {referralLoading ? 'Se încarcă...' : 'Trimite invitație pentru a genera codul'}
            </Text>
          )}
          <FieldRow label="Prieteni activi PRO" colors={colors} ff={ff}>
            <Text style={[st.fieldVal, { color: colors.green, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>{referral?.activeReferrals ?? 0}</Text>
          </FieldRow>
          <View style={[st.fieldDivider, { backgroundColor: colors.borderSoft }]} />
          <FieldRow label="Discount curent" colors={colors} ff={ff}>
            <Text style={[st.fieldVal, { color: referral?.discountPct ? colors.green : colors.textMuted, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
              {referral?.discountPct ? `${referral.discountPct}%` : '—'}
            </Text>
          </FieldRow>
          {referral?.discountPct ? (
            <>
              <View style={[st.fieldDivider, { backgroundColor: colors.borderSoft }]} />
              <FieldRow label="Preț lunar efectiv" colors={colors} ff={ff}>
                <Text style={[st.fieldVal, { color: colors.green, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>{referral.effectivePrice} RON</Text>
              </FieldRow>
            </>
          ) : null}
          <View style={[st.fieldDivider, { backgroundColor: colors.borderSoft }]} />
          <Text style={[st.refTiersTitle, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>TREPTE DISCOUNT</Text>
          {REFERRAL_TIERS.map((t, i) => (
            <View key={i} style={st.refTierRow}>
              <Text style={[st.refTierLabel, { color: colors.text, fontFamily: ff ? FONT.bodySB : FONT.system }]}>
                {t.min}–{t.max === Infinity ? '∞' : t.max} prieteni
              </Text>
              <Text style={[st.refTierVal, { color: colors.cyan, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>
                {t.discountPct}% → {Math.round(PLAN_PRICES_RON.pro_monthly * (1 - t.discountPct / 100))} RON/lună
              </Text>
            </View>
          ))}
          <View style={[st.comingSoonPill, { borderColor: colors.cyan }]}>
            <Text style={[st.comingSoonTxt, { color: colors.cyan, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>REFERRAL · ÎN CURÂND</Text>
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity style={[st.actionBtn, { borderColor: colors.cyan }]} onPress={handleChangeCode} activeOpacity={0.7}>
          <Text style={[st.actionBtnTxt, { color: colors.cyan, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>SCHIMBĂ COD DE ACTIVARE</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[st.actionBtn, { backgroundColor: `${colors.red}0D`, borderColor: `${colors.red}44` }]} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={[st.actionBtnTxt, { color: colors.red, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>⎋ DECONECTARE</Text>
        </TouchableOpacity>

        <Text style={[st.footer, { color: colors.textFaint, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
          DRUMIQ · v{APP_VERSION}{'\n'}GO PAMPA S.R.L.
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function SectionLabel({ text, colors, ff }: { text: string; colors: any; ff: boolean }) {
  return (
    <View style={st.sectionRow}>
      <Text style={[st.sectionLabel, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>{text}</Text>
      <View style={[st.sectionLine, { backgroundColor: colors.border }]} />
    </View>
  );
}

function FieldRow({ label, colors, ff, children }: { label: string; colors: any; ff: boolean; children: React.ReactNode }) {
  return (
    <View style={st.fieldRow}>
      <Text style={[st.fieldLbl, { color: colors.textSoft, fontFamily: ff ? FONT.bodySB : FONT.system }]}>{label}</Text>
      {children}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  auroraBlob: { position: 'absolute', borderRadius: 300, opacity: 0.7 },
  aurora1: { width: 500, height: 500, top: -200, left: -150 },
  aurora2: { width: 400, height: 400, bottom: -150, right: -120 },
  aurora3: { width: 350, height: 350, top: '40%' as any, right: -100 },

  title: { fontSize: SIZE.xl, letterSpacing: -0.5, marginTop: 4 },
  sub: { fontSize: SIZE.sm, letterSpacing: 8, marginTop: 4, marginBottom: 16 },

  // Hero card
  heroCard: { borderWidth: 1, borderRadius: RADIUS['2xl'], padding: 24, marginBottom: 18, alignItems: 'center', position: 'relative', overflow: 'hidden' },
  heroOrb: { position: 'absolute', width: 300, height: 300, borderRadius: 150, top: -80, left: '50%' as any, marginLeft: -150 },
  avatarWrap: { marginBottom: 12, shadowColor: '#7c3aed', shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 32, color: '#fff' },
  heroName: { fontSize: SIZE.xl, letterSpacing: -0.5, marginBottom: 4 },
  heroEmail: { fontSize: 11, letterSpacing: 3, marginBottom: 12 },
  planPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.pill, borderWidth: 1 },
  planPillTxt: { fontSize: 11, letterSpacing: 4 },

  // Section
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 10 },
  sectionLabel: { fontSize: SIZE.sm, letterSpacing: 10, textTransform: 'uppercase' },
  sectionLine: { flex: 1, height: 1, opacity: 0.5 },

  // Field card
  fieldCard: { borderWidth: 1, borderRadius: RADIUS.lg, padding: 8, paddingHorizontal: 0, marginBottom: 14, overflow: 'hidden' },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18 },
  fieldLbl: { fontSize: SIZE.base },
  fieldVal: { fontSize: SIZE.base },
  fieldDivider: { height: 1 },

  inputBox: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderRadius: 8, fontSize: 12, textAlign: 'center', letterSpacing: 2, minWidth: 120 },
  inputWide: { flex: 1, marginLeft: 16, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderRadius: 8, fontSize: 12, textAlign: 'right' },

  saveBtn: { padding: 10, borderRadius: RADIUS.sm, alignItems: 'center', marginHorizontal: 12 },
  saveBtnTxt: { color: '#fff', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' },

  // Goal
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 18 },
  goalInput: { paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderRadius: RADIUS.sm, fontSize: 18, textAlign: 'center', minWidth: 100 },
  goalUnit: { fontSize: SIZE.sm, letterSpacing: 2 },
  hintTxt: { fontSize: SIZE.sm, paddingHorizontal: 18, lineHeight: 16 },

  // Platform
  platformCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderWidth: 1, borderRadius: RADIUS.lg },
  platformName: { fontSize: SIZE.base },
  platformSub: { fontSize: 9, marginTop: 2, letterSpacing: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill, borderWidth: 1 },
  statusTxt: { fontSize: 9, letterSpacing: 4 },

  // Stats grid
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: { flexBasis: '47%', flexGrow: 1, borderWidth: 1, borderRadius: RADIUS.lg, padding: 14, position: 'relative', overflow: 'hidden' },
  statGlow: { position: 'absolute', top: -10, left: -10, width: 40, height: 40, borderRadius: 20, opacity: 0.5 },
  statLbl: { fontSize: 8, letterSpacing: 6, textTransform: 'uppercase', marginBottom: 8, position: 'relative' },
  statVal: { fontSize: SIZE['2xl'], lineHeight: 32, position: 'relative' },

  // Referral
  refCodeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 10 },
  refCode: { fontSize: SIZE.lg, letterSpacing: 4 },
  refTiersTitle: { fontSize: 8, letterSpacing: 6, textTransform: 'uppercase', marginTop: 4, marginBottom: 4, paddingHorizontal: 18 },
  refTierRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 18 },
  refTierLabel: { fontSize: 12 },
  refTierVal: { fontSize: 11, letterSpacing: 2 },
  comingSoonPill: { padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginTop: 12, marginHorizontal: 12, marginBottom: 4 },
  comingSoonTxt: { fontSize: 11, letterSpacing: 6, textTransform: 'uppercase' },

  // Actions
  actionBtn: { padding: 14, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', marginTop: 8 },
  actionBtnTxt: { fontSize: 12, letterSpacing: 4, textTransform: 'uppercase' },

  footer: { fontSize: 9, textAlign: 'center', marginTop: 20, lineHeight: 14, letterSpacing: 2 },
});
