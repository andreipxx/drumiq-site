import { NativeModules, Platform } from 'react-native';

const { DPOverlay } = NativeModules;

export type OverlayMode = 'simple' | 'full';
export type OverlayVerdict = 'stop' | 'think' | 'go';

export interface OverlayData {
  mode: OverlayMode;
  verdict: OverlayVerdict;
  label: string;
  pickup?: string;
  trip?: string;
  duration?: string;
  gross?: string;
  profitKm?: string;
  profitMin?: string;
  net?: string;
  shortRide?: boolean;
  sanityError?: boolean;
  deadKm?: string;
  dailyProgress?: string;
  source?: string;
}

export const Overlay = {
  isAvailable(): boolean {
    return Platform.OS === 'android' && !!DPOverlay;
  },
  async canDrawOverlays(): Promise<boolean> {
    if (!DPOverlay) return false;
    return DPOverlay.canDrawOverlays();
  },
  async requestPermission(): Promise<boolean> {
    if (!DPOverlay) return false;
    return DPOverlay.requestOverlayPermission();
  },
  async show(data: OverlayData): Promise<boolean> {
    if (!DPOverlay) return false;
    return DPOverlay.show(data);
  },
  async hide(): Promise<boolean> {
    if (!DPOverlay) return false;
    return DPOverlay.hide();
  },
};

export const Battery = {
  async isIgnoringOptimizations(): Promise<boolean> {
    if (!DPOverlay) return false;
    return DPOverlay.isIgnoringBatteryOptimizations();
  },
  async requestIgnore(): Promise<boolean> {
    if (!DPOverlay) return false;
    return DPOverlay.requestIgnoreBatteryOptimizations();
  },
};
