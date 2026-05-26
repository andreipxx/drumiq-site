// LicenseGate decides which screen to show:
//   - Not accepted ToS  -> TermsScreen
//   - No license        -> LicenseScreen
//   - License expired   -> PaywallScreen (irreversible until new code)
//   - Otherwise         -> children (main app)
//
// Re-checks state on AppState 'active' (foreground) so expiration in background is caught.

import React, { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, AppState, StyleSheet, DeviceEventEmitter } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import {
  isToSAccepted, getLicenseState,
  type LicenseState,
} from '../services/licenseManager';
import { syncServerTime, shouldResyncNow } from '../services/timeSync';
import { resetIfVersionChanged } from '../services/versionGuard';
import { getSession } from '../services/auth';
import TermsScreen from '../screens/TermsScreen';
import AuthScreen from '../screens/AuthScreen';
import LicenseScreen from '../screens/LicenseScreen';
import PaywallScreen from '../screens/PaywallScreen';

interface Props { children: React.ReactNode; }

export default function LicenseGate({ children }: Props) {
  const { colors } = useTheme();
  const [tosOk, setTosOk] = useState<boolean | null>(null);
  const [authOk, setAuthOk] = useState<boolean | null>(null);
  const [state, setState] = useState<LicenseState | null>(null);
  const [forceLicense, setForceLicense] = useState(false);

  const refresh = useCallback(async () => {
    await resetIfVersionChanged();
    const ok = await isToSAccepted();
    setTosOk(ok);
    if (!ok) { setAuthOk(null); setState(null); return; }
    // Auth check — must have a valid session before proceeding to license
    try {
      const session = await getSession();
      setAuthOk(!!session);
      if (!session) { setState(null); return; }
    } catch {
      setAuthOk(false);
      setState(null);
      return;
    }
    if (await shouldResyncNow()) { syncServerTime().catch(() => {}); }
    const st = await getLicenseState();
    setState(st);
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    const interval = setInterval(refresh, 5 * 60 * 1000);
    // Build 15.1: listen for explicit license changes (logout button)
    const licSub = DeviceEventEmitter.addListener('dp_license_changed', () => refresh());
    return () => { sub.remove(); clearInterval(interval); licSub.remove(); };
  }, [refresh]);

  if (tosOk === null) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!tosOk) {
    return <TermsScreen onAccepted={() => refresh()} />;
  }

  if (authOk === null) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!authOk) {
    return <AuthScreen onAuthenticated={() => refresh()} />;
  }

  if (state === null) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (forceLicense || (state && state.expirationReason === 'no_license')) {
    return <LicenseScreen onActivated={() => { setForceLicense(false); refresh(); }} />;
  }

  if (state && state.expirationReason) {
    return (
      <PaywallScreen
        reason={state.expirationReason}
        ridesUsed={state.ridesUsed}
        onActivateNew={() => setForceLicense(true)}
      />
    );
  }

  return <>{children}</>;
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
