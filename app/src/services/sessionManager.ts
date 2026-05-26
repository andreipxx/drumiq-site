import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

const SESSION_KEY = '@dp_active_session';

export interface SessionState {
  active: boolean;
  startedAt: number | null;
}

let _cached: SessionState | null = null;

export async function getSessionState(): Promise<SessionState> {
  if (_cached) return _cached;
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (raw) {
      _cached = JSON.parse(raw);
      return _cached!;
    }
  } catch {}
  return { active: false, startedAt: null };
}

export function isSessionActive(): boolean {
  return _cached?.active ?? false;
}

export async function startSession(): Promise<void> {
  _cached = { active: true, startedAt: Date.now() };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(_cached));
  DeviceEventEmitter.emit('dp_session_changed', _cached);
}

export async function stopSession(): Promise<void> {
  _cached = { active: false, startedAt: null };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(_cached));
  DeviceEventEmitter.emit('dp_session_changed', _cached);
}

export async function initSession(): Promise<SessionState> {
  const state = await getSessionState();
  return state;
}
