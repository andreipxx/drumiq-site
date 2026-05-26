// Build 17: debug ring buffer — persistent AsyncStorage, 9h history (3 sesiuni × 3h).
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY    = '@dp_debug_log_v1';
const MAX_PER_SES    = 5000;
const SESSION_AGE_MS = 3 * 60 * 60 * 1000;  // 3h per sesiune
const MAX_SESSIONS   = 3;                    // retentie totala 9h
const PER_EVENT_CAP  = 200;                  // truncheaza la 200 chars cu "..."

interface StoredSession { sid: string; startedAt: number; events: string[]; }

const SESSION_ID    = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 12); // ex: "202605061310"
const SESSION_START = Date.now();

let prevSessions: StoredSession[] = [];
let cur: StoredSession = { sid: SESSION_ID, startedAt: SESSION_START, events: [] };
let saveTimer: ReturnType<typeof setTimeout> | null = null;

// Incarca sesiunile anterioare la startup, prune > 9h
(async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const cutoff = Date.now() - SESSION_AGE_MS * MAX_SESSIONS;
    const loaded: StoredSession[] = JSON.parse(raw);
    prevSessions = loaded.filter(s => s.startedAt > cutoff).slice(-(MAX_SESSIONS - 1));
  } catch {}
})();

function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...prevSessions, cur]));
    } catch {}
  }, 3000);
}

export function logDpEvent(tag: string, data?: any): void {
  const _n = new Date();
  const ts = `${String(_n.getHours()).padStart(2,'0')}:${String(_n.getMinutes()).padStart(2,'0')}:${String(_n.getSeconds()).padStart(2,'0')}.${String(_n.getMilliseconds()).padStart(3,'0')}`;
  let str = '';
  try {
    if (data === undefined || data === null || data === '') str = '';
    else if (typeof data === 'string') str = data;
    else str = JSON.stringify(data);
  } catch { str = String(data); }
  let line = `[${ts}] ${tag}${str ? ' ' + str : ''}`;
  if (line.length > PER_EVENT_CAP) line = line.slice(0, PER_EVENT_CAP - 3) + '...';
  cur.events.push(line);
  if (cur.events.length > MAX_PER_SES) cur.events.shift();
  try { console.log('[DP-DEBUG]', line); } catch {}
  scheduleSave();
}

export function getDpEvents(): string[] {
  const prev = prevSessions.flatMap(s => s.events);
  return [...cur.events, ...prev].reverse();
}

export function getDebugStats(): { total: number; curSession: number; sid: string; maxPerSes: number } {
  const total = prevSessions.reduce((n, s) => n + s.events.length, 0) + cur.events.length;
  return { total, curSession: cur.events.length, sid: SESSION_ID, maxPerSes: MAX_PER_SES };
}

export function exportAsJsonl(): string {
  return [...prevSessions, cur].flatMap(sess => {
    const sessDate = new Date(sess.startedAt).toISOString().slice(0, 10);
    return sess.events.map(ev => {
      const m = ev.match(/^\[(\d{2}:\d{2}:\d{2}\.\d{3})\]/);
      const iso = m ? `${sessDate}T${m[1]}` : new Date(sess.startedAt).toISOString();
      return JSON.stringify({ sid: sess.sid, iso, ev });
    });
  }).join('\n');
}

export function clearDpEvents(): void {
  cur.events = [];
  prevSessions = [];
  AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}
