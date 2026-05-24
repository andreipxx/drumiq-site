// DRUMIQ v1.0.0 — Profile Screen
// Driver info + vehicle + platform connections + lifetime stats

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, DeviceEventEmitter, TextInput, Linking, Share } from 'react-native';
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
import { getOrCreateReferralCode, getReferralInfo, type ReferralInfo } from '../services/referralService';

interface ScreenProps { onOpenLicense: () => void; }

export default function ProfilScreen({ onOpenLicense }: ScreenProps) {
  const { colors } = useTheme();
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

  // MED-18: derive lifetime stats from stored rides instead of 3 separate useStates
  const lifetimeStats = useMemo(() => ({
    rides: completedRides.length,
    earnings: completedRides.reduce((sum, r) => sum + (r.netEarnings ?? 0), 0),
    km: completedRides.reduce((sum, r) => sum + (r.tripKm ?? 0), 0),
  }), [completedRides]);
  const [editingGoal, setEditingGoal] = useState<string>('');

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

  const reloadFuel = async () => {
    const f = await getFuelSettings();
    setFuel(f);
  };

  useEffect(() => {
    (async () => {
      try {
        const lic = await getLicenseState();
        if (lic.license) {
          setPlan(lic.license.plan);
          setLicKey(lic.license.plan.toUpperCase());
        }
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
    try {
      const info = await getReferralInfo();
      setReferral(info);
    } catch {}
    setReferralLoading(false);
  }, []);

  useEffect(() => { loadReferral(); }, [loadReferral]);

  const handleShareReferral = useCallback(async () => {
    let code = referral?.referralCode;
    if (!code) {
      code = await getOrCreateReferralCode();
      if (code) setReferral(prev => prev ? { ...prev, referralCode: code! } : prev);
    }
    if (!code) { Alert.alert('Eroare', 'Nu s-a putut genera codul de referral.'); return; }
    const msg = `Folosește codul meu ${code} la DrumIQ și primim amândoi discount! Descarcă: https://drumiq.ro`;
    Share.share({ message: msg });
  }, [referral]);

  const handleCopyCode = useCallback(async () => {
    let code = referral?.referralCode;
    if (!code) {
      code = await getOrCreateReferralCode();
      if (code) setReferral(prev => prev ? { ...prev, referralCode: code! } : prev);
    }
    if (!code) { Alert.alert('Eroare', 'Nu s-a putut genera codul.'); return; }
    Share.share({ message: code });
  }, [referral]);

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

  return (
    <ScrollView
      style={[s.root, { backgroundColor: colors.bg }]}
      contentContainerStyle={s.content}
    >
      <Text style={[s.title, { color: colors.text }]}>PROFIL<Text style={{ color: colors.accent }}> ȘOFER</Text></Text>
      <Text style={[s.sub, { color: colors.textMuted }]}>date locale · pe acest dispozitiv</Text>

      {/* Avatar card */}
      <View style={[s.avatarCard, { backgroundColor: colors.surface, borderColor: colors.borderAccent, shadowColor: colors.accent }]}>
        <View style={[s.avatar, { borderColor: colors.accent, shadowColor: colors.accent }]}>
          <Text style={[s.avatarTxt, { color: colors.accent }]}>{(profileName.charAt(0) || 'U').toUpperCase()}</Text>
        </View>
        <Text style={[s.avatarName, { color: colors.text }]}>{profileName.toUpperCase()}</Text>
        <Text style={[s.avatarSub, { color: colors.textMuted }]}>{profileEmail || 'date locale'}</Text>
        {plan && (
          <View style={[s.planPill, { borderColor: colors.accent }]}>
            <Text style={[s.planPillTxt, { color: colors.accent }]}>{plan.toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* Vehicle */}
      <Text style={[s.sectionLbl, { color: colors.textMuted }]}>VEHICUL</Text>
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={s.editRow}>
          <Text style={[s.rowLbl, { color: colors.textMuted }]}>Plăcuță</Text>
          <TextInput
            value={editingPlate}
            onChangeText={(t) => setEditingPlate(t.toUpperCase().replace(/\s+/g, ''))}
            placeholder="B123GOO"
            placeholderTextColor={colors.textDim}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
            style={[s.input, { color: colors.text, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          />
        </View>
        <View style={[s.divider, { backgroundColor: colors.divider }]} />
        <View style={s.editRow}>
          <Text style={[s.rowLbl, { color: colors.textMuted }]}>Model</Text>
          <TextInput
            value={editingModel}
            onChangeText={setEditingModel}
            placeholder="Dacia Sandero 2023"
            placeholderTextColor={colors.textDim}
            maxLength={50}
            style={[s.inputWide, { color: colors.text, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          />
        </View>
        {vehicleDirty && (
          <TouchableOpacity onPress={handleSaveVehicle} style={[s.saveVehicleBtn, { backgroundColor: colors.accent }]}>
            <Text style={s.saveVehicleTxt}>💾  SALVEAZĂ DATELE VEHICULULUI</Text>
          </TouchableOpacity>
        )}
        <View style={[s.divider, { backgroundColor: colors.divider }]} />
        <View style={s.row}>
          <Text style={[s.rowLbl, { color: colors.textMuted }]}>Carburant</Text>
          <Text style={[s.rowVal, { color: colors.text }]}>{
            fuel?.type === 'benzina_gpl' ? 'Benzină + GPL'
            : fuel?.type === 'diesel' ? 'Diesel'
            : fuel?.type === 'electric' ? 'Electric'
            : fuel?.type === 'hybrid_hev' ? 'Hybrid (HEV)'
            : fuel?.type === 'hybrid_phev' ? 'Plug-in Hybrid (PHEV)'
            : 'Benzină'
          }</Text>
        </View>
        <View style={[s.divider, { backgroundColor: colors.divider }]} />
        <View style={s.row}>
          <Text style={[s.rowLbl, { color: colors.textMuted }]}>Cost total/km</Text>
          <Text style={[s.rowVal, { color: colors.go }]}>
            {fuel ? totalCostPerKm(fuel).toFixed(2) : '—'} RON
          </Text>
        </View>
      </View>

      {/* Daily goal */}
      <Text style={[s.sectionLbl, { color: colors.textMuted }]}>OBIECTIV ZILNIC</Text>
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={s.editRow}>
          <Text style={[s.rowLbl, { color: colors.textMuted }]}>Target</Text>
          <TextInput
            value={editingGoal}
            onChangeText={(t) => setEditingGoal(t.replace(/[^0-9]/g, ''))}
            placeholder="ex: 300"
            placeholderTextColor={colors.textDim}
            keyboardType="number-pad"
            maxLength={5}
            style={[s.input, { color: colors.text, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          />
          <Text style={[s.rowLbl, { color: colors.textMuted }]}> lei/zi</Text>
        </View>
        <Text style={[s.hintTxt, { color: colors.textDim }]}>Overlay afișează progresul AZI: X/{dailyGoal > 0 ? dailyGoal : '?'} lei. 0 = dezactivat.</Text>
        {goalDirty && (
          <TouchableOpacity onPress={handleSaveGoal} style={[s.saveVehicleBtn, { backgroundColor: colors.accent }]}>
            <Text style={s.saveVehicleTxt}>💾  SALVEAZĂ OBIECTIV</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Platform connections - auto-detected via Accessibility */}
      <Text style={[s.sectionLbl, { color: colors.textMuted }]}>PLATFORME · auto-detect</Text>
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {platforms.map((pl, idx) => {
          const stateColor = pl.state === 'active' ? colors.go : pl.state === 'idle' ? colors.think : colors.textDim;
          const stateText = pl.state === 'active' ? 'ACTIV' : pl.state === 'idle' ? 'INACTIV' : 'NEDETECTAT';
          const icon = pl.id === 'bolt' ? '🚗' : '🚙';
          return (
            <React.Fragment key={pl.id}>
              {idx > 0 && <View style={[s.divider, { backgroundColor: colors.divider }]} />}
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowLbl, { color: colors.text }]}>{icon} {pl.name}</Text>
                  <Text style={[s.platSub, { color: colors.textDim }]}>
                    {pl.lastSeenAt ? `ultimă detecție: ${formatLastSeen(pl.lastSeenAt)}` : 'nu a fost detectat'}
                  </Text>
                </View>
                <View style={[s.statusPill, { borderColor: stateColor }]}>
                  <Text style={[s.statusTxt, { color: stateColor }]}>{stateText}</Text>
                </View>
              </View>
            </React.Fragment>
          );
        })}
      </View>

      {/* Lifetime stats */}
      <Text style={[s.sectionLbl, { color: colors.textMuted }]}>LIFETIME STATS</Text>
      <View style={s.statGrid}>
        <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.statLbl, { color: colors.textMuted }]}>CURSE TOTAL</Text>
          <Text style={[s.statVal, { color: colors.text }]}>{lifetimeStats.rides}</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.statLbl, { color: colors.textMuted }]}>VENIT NET</Text>
          <Text style={[s.statVal, { color: colors.go }]}>{formatLifetimeRon(lifetimeStats.earnings)}<Text style={[s.statUnit, { color: colors.textMuted }]}> RON</Text></Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.statLbl, { color: colors.textMuted }]}>KM PARCURȘI</Text>
          <Text style={[s.statVal, { color: colors.text }]}>{lifetimeStats.km.toFixed(0)}<Text style={[s.statUnit, { color: colors.textMuted }]}> km</Text></Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.statLbl, { color: colors.textMuted }]}>LICENȚĂ</Text>
          <Text style={[s.licKey, { color: colors.textMuted }]}>{licKey || '—'}</Text>
        </View>
      </View>

      {/* Referral */}
      <Text style={[s.sectionLbl, { color: colors.textMuted }]}>INVITĂ PRIETENI · DISCOUNT</Text>
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {referral?.referralCode ? (
          <View style={s.refCodeRow}>
            <Text style={[s.refCodeLabel, { color: colors.textMuted }]}>Codul tău:</Text>
            <Text style={[s.refCode, { color: colors.accent }]}>{referral.referralCode}</Text>
          </View>
        ) : (
          <Text style={[s.refCodeLabel, { color: colors.textMuted }]}>
            {referralLoading ? 'Se încarcă...' : 'Trimite invitație pentru a genera codul'}
          </Text>
        )}
        <View style={[s.divider, { backgroundColor: colors.divider }]} />
        <View style={s.row}>
          <Text style={[s.rowLbl, { color: colors.textMuted }]}>Prieteni activi PRO</Text>
          <Text style={[s.rowVal, { color: colors.go }]}>{referral?.activeReferrals ?? 0}</Text>
        </View>
        <View style={[s.divider, { backgroundColor: colors.divider }]} />
        <View style={s.row}>
          <Text style={[s.rowLbl, { color: colors.textMuted }]}>Discount curent</Text>
          <Text style={[s.rowVal, { color: referral?.discountPct ? colors.go : colors.textMuted }]}>
            {referral?.discountPct ? `${referral.discountPct}%` : '—'}
          </Text>
        </View>
        {referral?.discountPct ? (
          <>
            <View style={[s.divider, { backgroundColor: colors.divider }]} />
            <View style={s.row}>
              <Text style={[s.rowLbl, { color: colors.textMuted }]}>Preț lunar efectiv</Text>
              <Text style={[s.rowVal, { color: colors.go }]}>{referral.effectivePrice} RON</Text>
            </View>
          </>
        ) : null}
        <View style={[s.divider, { backgroundColor: colors.divider }]} />
        <Text style={[s.refTiersTitle, { color: colors.textMuted }]}>TREPTE DISCOUNT</Text>
        {REFERRAL_TIERS.map((t, i) => (
          <View key={i} style={s.refTierRow}>
            <Text style={[s.refTierLabel, { color: colors.text }]}>
              {t.min}–{t.max === Infinity ? '∞' : t.max} prieteni
            </Text>
            <Text style={[s.refTierVal, { color: colors.accent }]}>
              {t.discountPct}% → {Math.round(PLAN_PRICES_RON.pro_monthly * (1 - t.discountPct / 100))} RON/lună
            </Text>
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TouchableOpacity
            onPress={handleShareReferral}
            style={[s.refBtn, { backgroundColor: '#25D366', flex: 1 }]}
            activeOpacity={0.7}
          >
            <Text style={s.refBtnTxt}>TRIMITE INVITAȚIE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleCopyCode}
            style={[s.refBtn, { backgroundColor: colors.accent, flex: 1 }]}
            activeOpacity={0.7}
          >
            <Text style={s.refBtnTxt}>SHARE COD</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Change code */}
      <TouchableOpacity
        style={[s.changeCodeBtn, { borderColor: colors.accent }]}
        onPress={handleChangeCode}
        activeOpacity={0.7}
      >
        <Text style={[s.changeCodeTxt, { color: colors.accent }]}>SCHIMBĂ COD DE ACTIVARE</Text>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity
        style={[s.logoutBtn, { borderColor: colors.stop }]}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Text style={[s.logoutTxt, { color: colors.stop }]}>LOGOUT</Text>
      </TouchableOpacity>

      <Text style={[s.footer, { color: colors.textDim }]}>
        DRUMIQ · v{APP_VERSION}{'\n'}GO PAMPA S.R.L.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  title: { fontSize: 22, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  sub: { fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, marginTop: 2, marginBottom: 16 },

  avatarCard: { padding: 24, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginBottom: 16, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 10, shadowOpacity: 0.6, shadowRadius: 12, elevation: 8 },
  avatarTxt: { fontSize: 32, fontWeight: '900' },
  avatarName: { fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  avatarSub: { fontSize: 9, fontFamily: 'monospace', letterSpacing: 2, marginTop: 4 },
  planPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, marginTop: 10 },
  planPillTxt: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },

  sectionLbl: { fontSize: 10, letterSpacing: 2.5, fontWeight: '900', marginBottom: 8, marginTop: 4 },

  card: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  rowLbl: { fontSize: 11 },
  rowVal: { fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },
  divider: { height: 1, marginVertical: 4 },

  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  platSub: { fontSize: 9, fontFamily: 'monospace', marginTop: 2 },
  statusTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statCard: { width: '48.5%', borderWidth: 1, borderRadius: 10, padding: 12 },
  statLbl: { fontSize: 8, letterSpacing: 2, fontWeight: '700', marginBottom: 4 },
  statVal: { fontSize: 22, fontWeight: '700', fontFamily: 'monospace' },
  statUnit: { fontSize: 11, fontWeight: '500' },
  licKey: { fontSize: 11, fontFamily: 'monospace', marginTop: 6 },

  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  input: { width: 130, padding: 8, borderWidth: 1, borderRadius: 6, fontFamily: 'monospace', fontSize: 13, fontWeight: '700', textAlign: 'center', letterSpacing: 1 },
  inputWide: { flex: 1, marginLeft: 16, padding: 8, borderWidth: 1, borderRadius: 6, fontSize: 12, textAlign: 'right' },
  hintTxt: { fontSize: 9, fontFamily: 'monospace', marginTop: 4, lineHeight: 13 },
  saveVehicleBtn: { padding: 10, borderRadius: 6, alignItems: 'center', marginTop: 10 },
  saveVehicleTxt: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  changeCodeBtn: { padding: 14, borderRadius: 8, borderWidth: 1, alignItems: 'center', marginTop: 8 },
  changeCodeTxt: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  logoutBtn: { padding: 14, borderRadius: 8, borderWidth: 1, alignItems: 'center', marginTop: 8 },
  logoutTxt: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },

  refCodeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  refCodeLabel: { fontSize: 11 },
  refCode: { fontSize: 16, fontWeight: '900', fontFamily: 'monospace', letterSpacing: 2 },
  refTiersTitle: { fontSize: 8, letterSpacing: 2, fontWeight: '700', marginTop: 4, marginBottom: 4 },
  refTierRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  refTierLabel: { fontSize: 11 },
  refTierVal: { fontSize: 11, fontWeight: '700', fontFamily: 'monospace' },
  refBtn: { padding: 12, borderRadius: 8, alignItems: 'center' },
  refBtnTxt: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  footer: { fontSize: 9, textAlign: 'center', marginTop: 20, fontFamily: 'monospace', lineHeight: 14 },
});
