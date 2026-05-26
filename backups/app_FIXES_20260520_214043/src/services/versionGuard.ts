import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAllRides } from './tracker';

const VERSION_KEY = '@dp_app_version';
const TOS_KEY = '@dp_tos_accepted_v1';
// Sync cu app.json → expo.version la fiecare release
const CURRENT_VERSION = '2.1.2';

export async function resetIfVersionChanged(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(VERSION_KEY);
    if (stored !== CURRENT_VERSION) {
      await clearAllRides();
      // Force TOS to re-appear on each version bump. Reinstall via `adb install -r`
      // or store update keeps AsyncStorage, so without this the TOS gate silently
      // skips on a fresh build.
      await AsyncStorage.removeItem(TOS_KEY);
      await AsyncStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    }
  } catch {}
}
