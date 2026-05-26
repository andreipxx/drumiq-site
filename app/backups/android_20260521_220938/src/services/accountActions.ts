// Shared account actions (change license code, logout)
// Used by both ProfilScreen and SettingsScreen (M3 dedup)

import { Alert, DeviceEventEmitter } from 'react-native';
import { signOut } from './auth';
import { clearLicense, clearLicenseForCodeChange } from './licenseManager';

/**
 * Shows confirmation dialog and clears current license for code change.
 * @param onOpenLicense callback to open the license input screen
 */
export function confirmChangeCode(onOpenLicense: () => void): void {
  Alert.alert(
    'Schimbă cod',
    'Licența curentă va fi ștearsă și vei introduce un cod nou. Continui?',
    [
      { text: 'Anulează', style: 'cancel' },
      {
        text: 'Continuă',
        style: 'destructive',
        onPress: async () => {
          await clearLicenseForCodeChange();
          DeviceEventEmitter.emit('dp_license_changed');
          onOpenLicense();
        },
      },
    ],
  );
}

/**
 * Shows confirmation dialog and logs user out (clears license + session).
 */
export function confirmLogout(): void {
  Alert.alert(
    'Logout?',
    'Vei fi deconectat. Licența ta rămâne salvată.',
    [
      { text: 'Anulează', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try { await signOut(); } catch {}
          await clearLicense();
          DeviceEventEmitter.emit('dp_license_changed');
        },
      },
    ],
  );
}
