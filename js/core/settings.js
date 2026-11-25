/** User preferences. Persisted in localStorage. */

const KEY = 'nebula.settings.v1';

export const ACCENTS = [
  { id: 'violet', label: 'Violet', color: '#7c6bff' },
  { id: 'blue', label: 'Blue', color: '#4c82ff' },
  { id: 'cyan', label: 'Cyan', color: '#22b8cf' },
  { id: 'teal', label: 'Teal', color: '#2fbf9b' },
  { id: 'amber', label: 'Amber', color: '#e2a23b' },
  { id: 'rose', label: 'Rose', color: '#e85d8c' },
];

export const WALLPAPERS = [
  { id: 'nebula', name: 'Nebula' },
  { id: 'aurora', name: 'Aurora' },
  { id: 'dusk', name: 'Dusk' },
  { id: 'midnight', name: 'Midnight' },
  { id: 'ocean', name: 'Ocean' },
  { id: 'dawn', name: 'Dawn' },
  { id: 'paper', name: 'Paper' },
];

export function defaultSettings() {
  const light = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches;
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    theme: light ? 'light' : 'dark',
    accent: '#7c6bff',
    wallpaper: light ? 'dawn' : 'nebula',
    transparency: true,
    reducedMotion: reduce,
    fontScale: 1,
    dim: 0,
    username: 'Astronaut',
    pinHash: null,
    volume: 0.8,
    muted: false,
    showWidget: true,
    notifications: true,
    weatherCity: 'lisbon',
    iconPositions: {},
    pinned: ['files', 'editor', 'code', 'terminal', 'browser', 'settings'],
    notifHistory: [],
    notifSeenAt: 0,
    alarms: [],
    timer: null,
    gameScores: {},
    welcomed: false,
    removedApps: [],
    contrast: false,
    sounds: true,
    widgetClock: true,
    widgetNote: true,
    widgetBoard: true,
    clipHistory: [],
  };
}

function merge(base, extra) {
  const out = { ...base };
  if (!extra || typeof extra !== 'object') return out;
  for (const key of Object.keys(base)) {
    if (extra[key] !== undefined) out[key] = extra[key];
  }
  return out;
}

export function createSettings(userId) {
  const key = userId ? `${KEY}:${userId}` : KEY;
  let data = defaultSettings();
  try {
    const raw = localStorage.getItem(key);
    if (raw) data = merge(data, JSON.parse(raw));
  } catch {
    data = defaultSettings();
  }
  const listeners = new Set();
  function persist() {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      /* quota: keep the session copy */
    }
  }
  return {
    get data() { return data; },
    get(key) { return data[key]; },
    set(key, value) {
      data = { ...data, [key]: value };
      persist();
      for (const fn of listeners) fn(key, value);
      return value;
    },
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export async function hashPin(pin) {
  const encoded = new TextEncoder().encode(`nebula-os:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
