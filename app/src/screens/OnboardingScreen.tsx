import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Linking, Platform, ActivityIndicator, AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { checkCityEligibility, type GeofenceResult } from '../services/geofence';
import CarSelector from '../components/CarSelector';
import { setFuelSettings, type FuelSettings, DEFAULTS } from '../services/userSettings';
import { Overlay, Battery } from '../native/overlay';
import { Accessibility } from '../native/accessibility';
import { TRIAL } from '../constants/config';

const ONBOARDING_KEY = '@drumiq_onboarded';

type Step = 'splash' | 'welcome' | 'geofence' | 'geofence_fail' | 'car' | 'permissions' | 'ready' | 'bolt';

const DOT_STEPS: Step[] = ['welcome', 'car', 'permissions', 'ready'];

interface Props { onComplete: () => void; }

export async function isOnboardingDone(): Promise<boolean> {
  const v = await AsyncStorage.getItem(ONBOARDING_KEY);
  return v === 'true';
}

export default function OnboardingScreen({ onComplete }: Props) {
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>('splash');
  const [geoResult, setGeoResult] = useState<GeofenceResult | null>(null);

  const [accOk, setAccOk] = useState(false);
  const [overlayOk, setOverlayOk] = useState(false);
  const [batteryOk, setBatteryOk] = useState(false);

  useEffect(() => {
    if (step === 'splash') {
      const t = setTimeout(() => setStep('welcome'), 2000);
      return () => clearTimeout(t);
    }
  }, [step]);

  const refreshPerms = useCallback(async () => {
    const [a, o, b] = await Promise.all([
      Accessibility.isEnabled(),
      Overlay.canDrawOverlays(),
      Battery.isIgnoringOptimizations(),
    ]);
    setAccOk(a);
    setOverlayOk(o);
    setBatteryOk(b);
  }, []);

  useEffect(() => {
    if (step !== 'permissions') return;
    refreshPerms();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refreshPerms();
    });
    return () => sub.remove();
  }, [step, refreshPerms]);

  const allPermsOk = accOk && overlayOk && batteryOk;

  const doGeoCheck = async () => {
    setStep('geofence');
    try {
      const r = await checkCityEligibility();
      setGeoResult(r);
      setStep(r.allowed ? 'car' : 'geofence_fail');
    } catch (e) {
      console.warn('Geofence check failed:', e);
      setStep('geofence_fail');
    }
  };

  const handleCarSelect = async (brand: string, model: string, engine: { name: string; fuel: string; wear: number }) => {
    const fuelMap: Record<string, keyof typeof DEFAULTS> = {
      'Benzină': 'benzina', 'Diesel': 'diesel', 'GPL': 'benzina_gpl',
      'Electric': 'electric', 'Hybrid HEV': 'hybrid_hev', 'Hybrid PHEV': 'hybrid_phev',
    };
    const fuelType = fuelMap[engine.fuel] || 'benzina';
    const base = DEFAULTS[fuelType];
    const settings: FuelSettings = { ...base, wearPerKm: engine.wear };
    await setFuelSettings(settings);
    await AsyncStorage.setItem('@drumiq_vehicle_v1', JSON.stringify({ brand, model, engine: engine.name }));
    setStep('permissions');
  };

  const openAccessibilitySettings = async () => {
    try {
      if (Platform.OS === 'android') {
        await Linking.sendIntent('android.settings.ACCESSIBILITY_SETTINGS');
      }
    } catch (e) {
      console.warn('sendIntent failed, falling back to openSettings:', e);
      try { await Linking.openSettings(); } catch (e2) {
        console.warn('openSettings also failed:', e2);
      }
    }
  };

  const requestOverlay = async () => {
    try { await Overlay.requestPermission(); } catch (e) { console.warn('Overlay permission request failed:', e); }
  };

  const requestBattery = async () => {
    try { await Battery.requestIgnore(); } catch (e) { console.warn('Battery optimization request failed:', e); }
  };

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onComplete();
  };

  const openBolt = async () => {
    await finish();
    try { await Linking.openURL('boltdriver://'); } catch (e) {
      console.warn('Bolt deeplink failed:', e);
      try { await Linking.openURL('https://play.google.com/store/apps/details?id=ee.mtakso.driver'); } catch (e2) {
        console.warn('Play Store link also failed:', e2);
      }
    }
  };

  const dotIndex = DOT_STEPS.indexOf(step);

  // ═══ STEP RENDERS ═══

  if (step === 'splash') {
    return (
      <View style={[s.center, { backgroundColor: '#0d0a08' }]}>
        <View style={[s.logoBg, { backgroundColor: '#E8B27A' }]}>
          <Text style={s.logoTxt}>D</Text>
        </View>
        <Text style={[s.brand, { color: '#E8B27A' }]}>DRUMIQ</Text>
        <Text style={[s.tagline, { color: '#a89580' }]}>Știi instant dacă merită cursa</Text>
      </View>
    );
  }

  const dots = dotIndex >= 0 ? (
    <View style={s.dotsRow}>
      {DOT_STEPS.map((_, i) => (
        <View key={i} style={[s.dot, { backgroundColor: i <= dotIndex ? colors.accent : colors.border }]} />
      ))}
    </View>
  ) : null;

  if (step === 'welcome') {
    return (
      <View style={[s.center, { backgroundColor: colors.bg }]}>
        {dots}
        <Text style={[s.stepTitle, { color: colors.text }]}>Salut!</Text>
        <Text style={[s.stepTitle, { color: colors.accent }]}>Hai să configurăm DRUMIQ</Text>
        <View style={{ height: 32 }} />
        <View style={s.bulletList}>
          <BulletRow color="#00FF88" symbol="$" text="GO = cursă profitabilă" textColor={colors.text} />
          <BulletRow color="#FFB800" symbol="?" text="THINK = analizează" textColor={colors.text} />
          <BulletRow color="#FF3366" symbol="X" text="STOP = evită" textColor={colors.text} />
        </View>
        <TouchableOpacity style={[s.btn, { backgroundColor: colors.accent }]} onPress={doGeoCheck} activeOpacity={0.7}>
          <Text style={s.btnTxt}>{'CONTINUĂ →'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'geofence') {
    return (
      <View style={[s.center, { backgroundColor: colors.bg }]}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>{'📍'}</Text>
        <Text style={[s.stepTitle, { color: colors.text }]}>Se verifică locația</Text>
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 24 }} />
        <Text style={[s.hint, { color: colors.textMuted }]}>DRUMIQ verifică dacă te afli într-un oraș disponibil.</Text>
      </View>
    );
  }

  if (step === 'geofence_fail') {
    const detected = geoResult && !geoResult.allowed && geoResult.reason === 'outside_area'
      ? geoResult.detectedCity : 'Necunoscut';
    return (
      <View style={[s.center, { backgroundColor: colors.bg }]}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>{'🔒'}</Text>
        <Text style={[s.stepTitle, { color: colors.text }]}>DRUMIQ nu este disponibil aici</Text>
        <Text style={[s.hint, { color: colors.textMuted }]}>Orașul detectat: {detected}</Text>
        {/* M10: geofence currently only includes Baia Mare — update if cities are added */}
        <Text style={[s.hint, { color: '#00FF7F' }]}>Disponibil în: Baia Mare, România</Text>
        <TouchableOpacity style={[s.btn, { backgroundColor: colors.accent }]} onPress={doGeoCheck} activeOpacity={0.7}>
          <Text style={s.btnTxt}>VERIFICĂ DIN NOU</Text>
        </TouchableOpacity>
        {/* L6: __DEV__ skip is intentional — allows developers to bypass geofence in dev builds only */}
        {__DEV__ && (
          <TouchableOpacity onPress={() => setStep('car')} activeOpacity={0.6}>
            <Text style={[s.skipLink, { color: colors.textMuted }]}>{'Continuă oricum (demo) →'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (step === 'car') {
    return (
      <ScrollView style={[{ flex: 1, backgroundColor: colors.bg }]} contentContainerStyle={{ padding: 24, paddingTop: 48 }}>
        {dots}
        <Text style={[s.stepTitle, { color: colors.text, textAlign: 'center' }]}>Alege mașina ta</Text>
        <Text style={[s.hint, { color: colors.textMuted, textAlign: 'center', marginBottom: 16 }]}>
          Selectează marca, modelul și motorul
        </Text>
        <CarSelector onSelect={handleCarSelect} />
        <TouchableOpacity onPress={() => setStep('permissions')} activeOpacity={0.6} style={{ marginTop: 20, alignItems: 'center' }}>
          <Text style={[s.skipLink, { color: colors.textMuted }]}>{'Altă mașină (setez manual) →'}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (step === 'permissions') {
    return (
      <View style={[s.center, { backgroundColor: colors.bg }]}>
        {dots}
        <Text style={[s.stepTitle, { color: colors.text }]}>Permisiuni necesare</Text>
        <Text style={[s.hint, { color: colors.textMuted, marginBottom: 24 }]}>
          DRUMIQ are nevoie de aceste permisiuni ca să funcționeze corect
        </Text>

        <View style={[s.privacyBox, { borderColor: '#00FF7F', marginBottom: 20 }]}>
          <Text style={[s.privacyTxt, { color: '#00FF7F' }]}>
            Datele tale rămân DOAR pe telefon.{'\n'}Nu trimitem nimic pe internet.
          </Text>
        </View>

        <View style={{ width: '100%', gap: 12 }}>
          <PermRow
            label="Accessibility"
            desc="Citește ofertele Bolt automat"
            checked={accOk}
            onPress={openAccessibilitySettings}
            colors={colors}
          />
          <PermRow
            label="Overlay (afișare peste alte aplicații)"
            desc="Arată verdictul GO/THINK/STOP peste Bolt"
            checked={overlayOk}
            onPress={requestOverlay}
            colors={colors}
          />
          <PermRow
            label="Baterie (fără optimizare)"
            desc="Previne oprirea DRUMIQ în fundal"
            checked={batteryOk}
            onPress={requestBattery}
            colors={colors}
          />
        </View>

        <TouchableOpacity
          style={[s.btn, { backgroundColor: allPermsOk ? colors.accent : colors.accent + '60' }]}
          onPress={() => setStep('ready')}
          activeOpacity={0.7}
        >
          <Text style={s.btnTxt}>{allPermsOk ? 'CONTINUĂ →' : 'CONTINUĂ ORICUM →'}</Text>
        </TouchableOpacity>

        {!allPermsOk && (
          <Text style={[s.hint, { color: colors.textMuted, fontSize: 12, marginTop: 8 }]}>
            Poți acorda permisiunile și din Setări
          </Text>
        )}
      </View>
    );
  }

  if (step === 'ready') {
    return (
      <View style={[s.center, { backgroundColor: colors.bg }]}>
        {dots}
        <Text style={{ fontSize: 48, marginBottom: 16 }}>{'🎉'}</Text>
        <Text style={[s.stepTitle, { color: colors.accent }]}>Gata!</Text>
        <View style={{ height: 16 }} />
        <View style={[s.trialBox, { backgroundColor: colors.surface, borderColor: colors.accent + '40' }]}>
          <Text style={[s.trialTitle, { color: colors.text }]}>Trial activ</Text>
          <Text style={[s.trialDetail, { color: colors.accent }]}>
            {TRIAL.RIDES} curse · {TRIAL.DAYS} zile
          </Text>
        </View>
        <TouchableOpacity style={[s.btn, { backgroundColor: colors.accent }]} onPress={() => setStep('bolt')} activeOpacity={0.7}>
          <Text style={s.btnTxt}>{'CONTINUĂ →'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'bolt') {
    return (
      <View style={[s.center, { backgroundColor: colors.bg }]}>
        <Text style={[s.stepTitle, { color: colors.text }]}>Deschide Șofer partener</Text>
        <Text style={[s.hint, { color: colors.textMuted }]}>
          Pornește aplicația Bolt Driver și acceptă o cursă.{'\n'}DRUMIQ va analiza automat oferta și îți va arăta verdictul.
        </Text>
        <TouchableOpacity style={[s.btn, { backgroundColor: '#34D058' }]} onPress={openBolt} activeOpacity={0.7}>
          <Text style={[s.btnTxt, { color: '#fff' }]}>DESCHIDE BOLT DRIVER</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={finish} activeOpacity={0.6}>
          <Text style={[s.skipLink, { color: colors.textMuted }]}>{'Închide configurarea →'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

function PermRow({ label, desc, checked, onPress, colors }: {
  label: string; desc: string; checked: boolean; onPress: () => void; colors: any;
}) {
  return (
    <TouchableOpacity
      style={[s.permRow, {
        backgroundColor: colors.surface,
        borderColor: checked ? colors.accent + '50' : colors.border,
      }]}
      onPress={checked ? undefined : onPress}
      activeOpacity={checked ? 1 : 0.7}
    >
      <View style={[s.permCheck, { backgroundColor: checked ? colors.accent : 'transparent', borderColor: checked ? colors.accent : colors.border }]}>
        {checked && <Text style={s.permCheckmark}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.permLabel, { color: checked ? colors.accent : colors.text }]}>{label}</Text>
        <Text style={[s.permDesc, { color: colors.textMuted }]}>{desc}</Text>
      </View>
      {!checked && <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '700' }}>ACORDĂ</Text>}
    </TouchableOpacity>
  );
}

function BulletRow({ color, symbol, text, textColor }: {
  color: string; symbol: string; text: string; textColor: string;
}) {
  return (
    <View style={s.bulletRow}>
      <View style={[s.bulletCircle, { backgroundColor: color }]}>
        <Text style={s.bulletSymbol}>{symbol}</Text>
      </View>
      <Text style={[s.bulletText, { color: textColor }]}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  logoBg: {
    width: 88, height: 88, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoTxt: { fontSize: 52, fontWeight: '900', color: '#000' },
  brand: { fontSize: 34, fontWeight: '900', letterSpacing: 8 },
  tagline: { fontSize: 14, marginTop: 8 },
  stepTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  hint: { fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 21 },
  bulletList: { width: '100%', gap: 16, marginBottom: 32 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  bulletCircle: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  bulletSymbol: { fontSize: 18, fontWeight: '900', color: '#000' },
  bulletText: { fontSize: 15, fontWeight: '600' },
  btn: {
    width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 28,
  },
  btnTxt: { color: '#000', fontSize: 15, fontWeight: '900', letterSpacing: 1.5 },
  skipLink: { fontSize: 13, marginTop: 14, letterSpacing: 0.5, fontWeight: '500' },
  privacyBox: {
    borderWidth: 1, borderRadius: 10, padding: 14, borderStyle: 'dashed', width: '100%',
  },
  privacyTxt: { fontSize: 12, textAlign: 'center', fontWeight: '600', lineHeight: 19 },
  trialBox: {
    borderWidth: 1, borderRadius: 12, padding: 20, width: '100%', alignItems: 'center',
  },
  trialTitle: { fontSize: 18, fontWeight: '700' },
  trialDetail: { fontSize: 22, fontWeight: '900', marginTop: 8 },
  dotsRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 28,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
  },
  permRow: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12,
    borderWidth: 1,
  },
  permCheck: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  permCheckmark: { color: '#000', fontSize: 16, fontWeight: '900' },
  permLabel: { fontSize: 14, fontWeight: '700' },
  permDesc: { fontSize: 12, marginTop: 2 },
});
