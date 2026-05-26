import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { DPAccessibility } = NativeModules;

export interface AccessibilityCapture {
  text: string;
  package: string;
  timestamp: number;
}

export interface LogStats {
  exists: boolean;
  sizeBytes: number;
  sizeBytesOld: number;
  captures: number;
  firstLine: string;
  lastLine: string;
}

export interface ExportResult {
  path: string;
  sizeBytes: number;
}

export type CaptureListener = (capture: AccessibilityCapture) => void;

const emitter = DPAccessibility ? new NativeEventEmitter(DPAccessibility) : null;

export const Accessibility = {
  isAvailable(): boolean {
    return Platform.OS === 'android' && !!DPAccessibility;
  },

  async isEnabled(): Promise<boolean> {
    if (!DPAccessibility) return false;
    return DPAccessibility.isEnabled();
  },

  async openSettings(): Promise<boolean> {
    if (!DPAccessibility) return false;
    return DPAccessibility.openSettings();
  },

  async getLastCapture(): Promise<AccessibilityCapture> {
    if (!DPAccessibility) return { text: '', package: '', timestamp: 0 };
    return DPAccessibility.getLastCapture();
  },

  async copyLastCapture(): Promise<number> {
    if (!DPAccessibility) return 0;
    return DPAccessibility.copyLastCapture();
  },

  async readLog(): Promise<string> {
    if (!DPAccessibility) return '(native module unavailable)';
    return DPAccessibility.readLog();
  },

  async getLogPath(): Promise<string> {
    if (!DPAccessibility) return '';
    return DPAccessibility.getLogPath();
  },

  async clearLog(): Promise<boolean> {
    if (!DPAccessibility) return false;
    return DPAccessibility.clearLog();
  },

  async getLogStats(): Promise<LogStats> {
    if (!DPAccessibility) return { exists: false, sizeBytes: 0, sizeBytesOld: 0, captures: 0, firstLine: '', lastLine: '' };
    return DPAccessibility.getLogStats();
  },

  async copyLogToDownloads(): Promise<ExportResult> {
    if (!DPAccessibility) throw new Error('Native module unavailable');
    return DPAccessibility.copyLogToDownloads();
  },

  async writeExportToDownloads(content: string): Promise<ExportResult> {
    if (!DPAccessibility) throw new Error('Native module unavailable');
    return DPAccessibility.writeExportToDownloads(content);
  },

  startListening(): void {
    if (!DPAccessibility) return;
    DPAccessibility.startListening();
  },

  stopListening(): void {
    if (!DPAccessibility) return;
    DPAccessibility.stopListening();
  },

  addCaptureListener(listener: CaptureListener): () => void {
    if (!emitter) return () => {};
    const sub = emitter.addListener('DPAccessibilityCapture', listener);
    return () => sub.remove();
  },

  async startLifeService(): Promise<boolean> {
    if (!DPAccessibility?.startLifeService) return false;
    return DPAccessibility.startLifeService();
  },

  async stopLifeService(): Promise<boolean> {
    if (!DPAccessibility?.stopLifeService) return false;
    return DPAccessibility.stopLifeService();
  },
};
