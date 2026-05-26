import AsyncStorage from '@react-native-async-storage/async-storage';

const VERSION_KEY = '@dp_app_version';
const TOS_KEY = '@dp_tos_accepted_v1';
// Single source of truth: citim versiunea din app.json
const CURRENT_VERSION: string = require('../../app.json').expo.version;

export async function resetIfVersionChanged(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(VERSION_KEY);
    if (stored !== CURRENT_VERSION) {
      // CRIT-4 FIX: NU mai stergem ride data la update versiune.
      // clearAllRides() a fost eliminat — cursele trebuie pastrate intre update-uri.
      // Force TOS to re-appear on each version bump. Reinstall via `adb install -r`
      // or store update keeps AsyncStorage, so without this the TOS gate silently
      // skips on a fresh build.
      await AsyncStorage.removeItem(TOS_KEY);
      await AsyncStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    }
  } catch {}
}
