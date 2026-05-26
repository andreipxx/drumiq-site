// DRUMIQ v2.1 — App entry point
// Bottom-tab navigation: Acasă / Tracker / Plan / Profil / Setări

import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, StatusBar, BackHandler, DeviceEventEmitter } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/hooks/useTheme';
import LicenseGate from './src/components/LicenseGate';
import BottomTabs, { type TabKey } from './src/components/BottomTabs';

// Tab screens (v2)
import HomeScreen from './src/screens/HomeScreen';
import TrackerScreen from './src/screens/TrackerScreen';
import PlanScreen from './src/screens/PlanScreen';
import ProfilScreen from './src/screens/ProfilScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Sub-screens reachable from Settings/Plan/Profil
import AccessibilityTestScreen from './src/screens/AccessibilityTestScreen';
import FuelSettingsScreen from './src/screens/FuelSettingsScreen';
import FilterSettingsScreen from './src/screens/FilterSettingsScreen';
import WorkModeScreen from './src/screens/WorkModeScreen';
import PaywallUpgradeScreen from './src/screens/PaywallUpgradeScreen';
import LicenseScreen from './src/screens/LicenseScreen';
import OverlayScreen from './src/screens/OverlayScreen';
import OnboardingScreen, { isOnboardingDone } from './src/screens/OnboardingScreen';

import { getLicenseState } from './src/services/licenseManager';
import { startOverlayController, stopOverlayController } from './src/services/overlayController';

type SubScreen = null | 'accessibility' | 'fuel' | 'filters' | 'upgrade' | 'overlay_demo' | 'workmode' | 'license';

function MainApp() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<TabKey>('home');
  const [sub, setSub] = useState<SubScreen>(null);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    isOnboardingDone().then((done) => setShowOnboarding(!done));
  }, []);

  // Android hardware back button
  useEffect(() => {
    const handler = () => {
      if (sub !== null) { setSub(null); return true; }
      if (tab !== 'home') { setTab('home'); return true; }
      return false; // let Android handle (minimize/exit)
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => subscription.remove();
  }, [sub, tab]);

  // Watch for plan changes — restart overlay controller
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const st = await getLicenseState();
      if (cancelled) return;
      const newPlan = st.license && !st.expirationReason ? st.license.plan : null;
      setActivePlan((prev) => {
        if (prev !== newPlan) {
          stopOverlayController();
          if (newPlan) startOverlayController(newPlan as any).catch(() => {});
        }
        return newPlan;
      });
    };
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => { cancelled = true; clearInterval(interval); stopOverlayController(); };
  }, []);

  // === Onboarding gate ===
  if (showOnboarding === null) return <View style={[s.root, { backgroundColor: colors.bg }]} />;
  if (showOnboarding) return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;

  // === Sub-screens override the tab view ===
  if (sub === 'accessibility') return <AccessibilityTestScreen onBack={() => setSub(null)} />;
  if (sub === 'fuel')          return <FuelSettingsScreen     onBack={() => setSub(null)} />;
  if (sub === 'filters')       return <FilterSettingsScreen   onBack={() => setSub(null)} />;
  if (sub === 'workmode')      return <WorkModeScreen         onBack={() => setSub(null)} />;
  if (sub === 'upgrade')       return <PaywallUpgradeScreen   onClose={() => setSub(null)} onActivateCode={() => setSub('license')} />;
  if (sub === 'license')       return <LicenseScreen onActivated={() => { setSub(null); DeviceEventEmitter.emit('dp_license_changed'); }} />;
  if (sub === 'overlay_demo')  return <OverlayScreen onOpenSettings={() => { setSub(null); setTab('settings'); }} onOpenAccessibility={() => setSub('accessibility')} />;

  // === Main tab content ===
  const renderTab = () => {
    switch (tab) {
      case 'home':    return <HomeScreen onOpenOverlayDemo={() => setSub('overlay_demo')} onOpenTracker={() => setTab('tracker')} />;
      case 'tracker': return <TrackerScreen />;
      case 'plan':    return <PlanScreen onOpenUpgrade={() => setSub('upgrade')} onOpenLicense={() => setSub('license')} />;
      case 'profil':  return <ProfilScreen onOpenLicense={() => setSub('license')} />;
      case 'settings':return <SettingsScreen
                                onOpenFuel={() => setSub('fuel')}
                                onOpenFilters={() => setSub('filters')}
                                onOpenUpgrade={() => setSub('upgrade')}
                                onOpenAccessibility={() => setSub('accessibility')}
                                onOpenWorkMode={() => setSub('workmode')}
                                onOpenLicense={() => setSub('license')}
                              />;
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[s.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} translucent={false} />
      <View style={s.content}>{renderTab()}</View>
      <BottomTabs current={tab} onChange={setTab} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1 },
  content: { flex: 1 },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LicenseGate>
          <MainApp />
        </LicenseGate>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
