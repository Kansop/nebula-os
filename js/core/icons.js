/** Original line icons and gradient app tiles. No emoji. */

const GLYPHS = {
  folder: '<path d="M3.5 8.2A1.8 1.8 0 0 1 5.3 6.4h3.6l1.6 1.7h8.2a1.8 1.8 0 0 1 1.8 1.8v7.2a1.8 1.8 0 0 1-1.8 1.8H5.3a1.8 1.8 0 0 1-1.8-1.8Z"/>',
  file: '<path d="M14 3.5H7.2A1.7 1.7 0 0 0 5.5 5.2v13.6a1.7 1.7 0 0 0 1.7 1.7h9.6a1.7 1.7 0 0 0 1.7-1.7V8.2Z"/><path d="M14 3.5V8h4.5"/>',
  text: '<path d="M14 3.5H7.2A1.7 1.7 0 0 0 5.5 5.2v13.6a1.7 1.7 0 0 0 1.7 1.7h9.6a1.7 1.7 0 0 0 1.7-1.7V8.2Z"/><path d="M14 3.5V8h4.5M8.2 12.2h7.6M8.2 16h5"/>',
  code: '<path d="M9 8 4.8 12 9 16M15 8l4.2 4L15 16M13.2 6.5l-2.4 11"/>',
  terminal: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M7 9l3 2.5L7 14M12 14.5h5"/>',
  calc: '<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M7.5 7.5h9M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
  paint: '<path d="M14.2 4.2 19.8 9.8 10.5 19.1H5v-5.5Z"/><path d="M12.5 5.9l5.6 5.6"/>',
  notes: '<path d="M7 3.8h8.2L19 7.6V20.2H7Z"/><path d="M15 3.8v4h4M9 12h7M9 15.5h5"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M8 3.8v3.2M16 3.8v3.2M4 10h16M8 14h2M12 14h2M8 17h2"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4.2l2.8 1.8"/>',
  music: '<path d="M9 17.5V7.2l10-2v10.2"/><circle cx="7.2" cy="17.5" r="2"/><circle cx="17" cy="15.4" r="2"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="9" r="1.4"/><path d="M4.5 16.5 9 12.5l3 2.6 2.2-1.8 5.3 4.2"/>',
  settings: '<circle cx="12" cy="12" r="3.1"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6"/>',
  tasks: '<path d="M5 19V11M10 19V6M15 19v-7M20 19V9"/>',
  browser: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.4 2.6 3.6 5.4 3.6 8s-1.2 5.4-3.6 8c-2.4-2.6-3.6-5.4-3.6-8s1.2-5.4 3.6-8Z"/>',
  weather: '<circle cx="8.5" cy="9" r="2.6"/><path d="M8.5 4.8v1.2M8.5 12v1.2M4.3 9H5.5M11.5 9h1.2M5.6 6.1l.8.8M10.6 11.1l.8.8M11.4 6.1l-.8.8"/><path d="M10 16.8h6.2a2.6 2.6 0 0 0 .3-5.2 3.6 3.6 0 0 0-6.8 1.1"/>',
  snake: '<path d="M6 8c0-1.7 1.6-3 3.4-3H14c2 0 3.5 1.4 3.5 3.2S16 11.4 14 11.4H9.5C7.6 11.4 6 12.8 6 14.6S7.6 18 9.5 18H18"/>',
  tetris: '<path d="M4 14h6v6H4zM10 8h6v6h-6zM10 14h6v6h-6zM16 4h4v4h-4z"/>',
  mines: '<path d="M6 20V5M6 6h8.5l-2.2 3 2.2 3H6"/><path d="M15.5 16.5l.8 2M18.2 14.2l2 .4M18.2 18.4l1.8 1.2"/>',
  tiles: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.4"/><path d="M15.2 18.2h3.6M17 16.4v3.6"/>',
  cards: '<rect x="7" y="4" width="12" height="16" rx="1.6"/><rect x="4" y="6.5" width="12" height="14" rx="1.6"/>',
  breakout: '<path d="M4 8h4v3H4zM9 8h4v3H9zM14 8h6v3h-6z"/><circle cx="9" cy="14" r="1.3"/><path d="M6 18.5h8"/>',
  trash: '<path d="M4.5 7h15M9 7V5.2h6V7M7.5 7l.8 12.2h7.4L16.5 7"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M15.8 15.8 20 20"/>',
  power: '<path d="M12 3.5v7"/><path d="M7.2 6.4a7 7 0 1 0 9.6 0"/>',
  user: '<circle cx="12" cy="9" r="3.2"/><path d="M5.5 19.2a6.5 6.5 0 0 1 13 0"/>',
  wifi: '<path d="M5 10.2a10 10 0 0 1 14 0"/><path d="M7.8 13a6 6 0 0 1 8.4 0"/><path d="M10.5 15.8a2.4 2.4 0 0 1 3 0"/><circle cx="12" cy="18.2" r=".8" fill="currentColor" stroke="none"/>',
  'wifi-off': '<path d="M4 9.5a12 12 0 0 1 4.2-2M9.5 5.2A12 12 0 0 1 20 10"/><path d="M8.2 13.2a6 6 0 0 1 7.8.2"/><path d="M4 4l16 16"/>',
  volume: '<path d="M4.5 10h3.2L12 6.2v11.6L7.7 14H4.5z"/><path d="M15.2 9.2a4 4 0 0 1 0 5.6M17.6 7a7 7 0 0 1 0 10"/>',
  'volume-off': '<path d="M4.5 10h3.2L12 6.2v11.6L7.7 14H4.5z"/><path d="M16 10l4 4M20 10l-4 4"/>',
  battery: '<rect x="3" y="8" width="16" height="8" rx="1.6"/><path d="M19 10.5h1.2v3H19M6 11h6"/>',
  bell: '<path d="M6 16.5h12l-1.2-2V11a4.8 4.8 0 0 0-9.6 0v3.5Z"/><path d="M10 16.5a2 2 0 0 0 4 0"/>',
  sun: '<circle cx="12" cy="12" r="3.4"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18"/>',
  moon: '<path d="M16 4.5A7.5 7.5 0 1 0 19.5 15 6 6 0 0 1 16 4.5Z"/>',
  pin: '<path d="M9 4.5h6l-1 6.2 2.2 2.3H7.8L10 10.7Z"/><path d="M12 13v6.5"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2"/>',
  minus: '<path d="M5 12h14"/>',
  square: '<rect x="5" y="5" width="14" height="14" rx="1.6"/>',
  restore: '<rect x="7" y="7" width="11" height="11" rx="1.4"/><path d="M6 15H5.2A1.2 1.2 0 0 1 4 13.8V5.2A1.2 1.2 0 0 1 5.2 4H13.8A1.2 1.2 0 0 1 15 5.2V6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  copy: '<rect x="8" y="8" width="11" height="11" rx="1.6"/><path d="M6.2 15H5.5A1.5 1.5 0 0 1 4 13.5v-8A1.5 1.5 0 0 1 5.5 4h8A1.5 1.5 0 0 1 15 5.5V6.2"/>',
  download: '<path d="M12 4v10M8 10l4 4 4-4M5 19h14"/>',
  upload: '<path d="M12 16V6M8 10l4-4 4 4M5 19h14"/>',
  pencil: '<path d="M4 20l1.2-4.2L16.5 4.5a1.6 1.6 0 0 1 2.2 2.2L7.4 18.1Z"/><path d="M13.8 6.8l3.4 3.4"/>',
  info: '<circle cx="12" cy="12" r="8"/><path d="M12 11v5M12 8h.01"/>',
  play: '<path d="M8 5.5v13l11-6.5Z"/>',
  pause: '<path d="M7.5 5.5h3v13h-3zM13.5 5.5h3v13h-3z"/>',
  'skip-next': '<path d="M6 6.5v11l8-5.5Z"/><path d="M17 6.5v11"/>',
  'skip-prev': '<path d="M18 6.5v11l-8-5.5Z"/><path d="M7 6.5v11"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5 9.5 17 19 7"/>',
  alert: '<path d="M12 4.2 21 19H3Z"/><path d="M12 10v4.2M12 16.8h.01"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9" rx="1.8"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  help: '<circle cx="12" cy="12" r="8"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.8.4-1.2.9-1.2 1.8V14.2M12 17h.01"/>',
  home: '<path d="M4 11.2 12 4l8 7.2V20H4Z"/><path d="M10 20v-6h4v6"/>',
  'chevron-left': '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  'chevron-right': '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
  'chevron-up': '<path d="M6 14.5 12 8l6 6.5"/>',
  'chevron-down': '<path d="M6 9.5 12 16l6-6.5"/>',
  refresh: '<path d="M19 12a7 7 0 1 1-1.8-4.7"/><path d="M19 5v4.2h-4.2"/>',
  save: '<path d="M5 4.5h11l3 3V19.5H5Z"/><path d="M8 4.5V9h7V4.5M8 19.5v-5h8v5"/>',
  undo: '<path d="M8 8H4.5V4.5"/><path d="M5 9.2A7.5 7.5 0 1 1 6.2 16"/>',
  redo: '<path d="M16 8h3.5V4.5"/><path d="M19 9.2A7.5 7.5 0 1 0 17.8 16"/>',
  palette: '<path d="M12 4a8 8 0 1 0 0 16h1.2a1.8 1.8 0 0 0 0-3.6H12a1.6 1.6 0 0 1 0-3.2h2.4A6.4 6.4 0 0 0 12 4Z"/><circle cx="8" cy="10" r=".8" fill="currentColor" stroke="none"/><circle cx="10" cy="7.4" r=".8" fill="currentColor" stroke="none"/><circle cx="14" cy="7.4" r=".8" fill="currentColor" stroke="none"/>',
  monitor: '<rect x="3.5" y="4.5" width="17" height="12" rx="1.8"/><path d="M8 19.5h8M12 16.5v3"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="1.6"/><path d="M9 3.5v2.5M12 3.5v2.5M15 3.5v2.5M9 18v2.5M12 18v2.5M15 18v2.5M3.5 9H6M3.5 12H6M3.5 15H6M18 9h2.5M18 12h2.5M18 15h2.5"/>',
  keyboard: '<rect x="3" y="6" width="18" height="12" rx="1.8"/><path d="M7 10h.01M10.5 10h.01M14 10h.01M17 10h.01M7 13.5h10"/>',
  install: '<path d="M12 4v9M8.5 10.5 12 14l3.5-3.5M5 18.5h14"/>',
  globe: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.2 2.4 3.3 5.2 3.3 8s-1.1 5.6-3.3 8c-2.2-2.4-3.3-5.2-3.3-8s1.1-5.6 3.3-8Z"/>',
  gamepad: '<rect x="3" y="8" width="18" height="9" rx="3"/><path d="M8 11v4M6 13h4M16.5 12h.01M18 14.5h.01"/>',
  star: '<path d="M12 3.8 14.2 9l5.6.5-4.3 3.6 1.3 5.4L12 15.8 7.2 18.5 8.5 13 4.2 9.5 9.8 9Z"/>',
  sliders: '<path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/>',
  eye: '<path d="M2.8 12S6.2 6.5 12 6.5 21.2 12 21.2 12 17.8 17.5 12 17.5 2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.4"/>',
  desktop: '<rect x="3" y="4" width="18" height="12" rx="1.6"/><path d="M8 20h8M12 16v4"/>',
  layers: '<path d="M12 4 4 8l8 4 8-4Z"/><path d="M4 12l8 4 8-4M4 16l8 4 8-4"/>',
  brightness: '<circle cx="12" cy="12" r="3.2"/><path d="M12 4v1.6M12 18.4V20M4 12h1.6M18.4 12H20M6.4 6.4l1.1 1.1M16.5 16.5l1.1 1.1M17.6 6.4l-1.1 1.1M7.5 16.5l-1.1 1.1"/>',
  flag: '<path d="M6 20V4.5M6 5h9l-1.6 3L15 11H6"/>',
  timer: '<circle cx="12" cy="13" r="7"/><path d="M12 13V9.5M10 3.5h4M18.5 6.2l-1.2 1.2"/>',
  alarm: '<circle cx="12" cy="13" r="7"/><path d="M12 10v3.4l2 1.4M6 5 4 3.2M18 5l2-1.8"/>',
  stopwatch: '<circle cx="12" cy="13" r="7"/><path d="M12 13V9M12 4.2v2M10.2 4.2h3.6"/>',
  external: '<path d="M14 5h5v5M19 5l-8 8"/><path d="M16 13.5V19H5V8h5.5"/>',
  'zoom-in': '<circle cx="11" cy="11" r="6"/><path d="M20 20l-3.8-3.8M11 8.5v5M8.5 11h5"/>',
  'zoom-out': '<circle cx="11" cy="11" r="6"/><path d="M20 20l-3.8-3.8M8.5 11h5"/>',
  more: '<circle cx="6" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1" fill="currentColor" stroke="none"/>',
  'folder-plus': '<path d="M3.5 8.2A1.8 1.8 0 0 1 5.3 6.4h3.6l1.6 1.7H14"/><path d="M12.2 9.2H19a1.8 1.8 0 0 1 1.8 1.8v7.1a1.8 1.8 0 0 1-1.8 1.8H5.3a1.8 1.8 0 0 1-1.8-1.8v-8"/><path d="M12 13v4M10 15h4"/>',
  'file-plus': '<path d="M14 3.5H7.2A1.7 1.7 0 0 0 5.5 5.2v13.6a1.7 1.7 0 0 0 1.7 1.7h9.6a1.7 1.7 0 0 0 1.7-1.7V8.2Z"/><path d="M14 3.5V8h4.5M12 12v5M9.5 14.5h5"/>',
  cut: '<circle cx="7" cy="8" r="2"/><circle cx="7" cy="16" r="2"/><path d="M8.6 9.4 19 18M8.6 14.6 19 6"/>',
  paste: '<path d="M9 4.5h6"/><rect x="7" y="6" width="10" height="4" rx="1"/><path d="M8 8H6.5A1.5 1.5 0 0 0 5 9.5v9A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 17.5 8H16"/>',
  eraser: '<path d="M4 15.5 13.2 6.2a2 2 0 0 1 2.8 0l2.8 2.8a2 2 0 0 1 0 2.8L12 19.6H6.2Z"/><path d="M8.5 14.2 12 17.8"/>',
  droplet: '<path d="M12 3.5s6 6.2 6 10a6 6 0 0 1-12 0c0-3.8 6-10 6-10Z"/>',
  line: '<path d="M5 19 19 5"/>',
  rect: '<rect x="5" y="6" width="14" height="12" rx="1.4"/>',
  circle: '<circle cx="12" cy="12" r="7"/>',
  hash: '<path d="M9 4.5 7.5 19.5M16.5 4.5 15 19.5M4.5 9h15M4 15h15"/>',
};

const TILES = {
  files: ['#6ea2ff', '#2f5fe0'],
  editor: ['#5ee0c4', '#149a86'],
  code: ['#c4b5fd', '#6d28d9'],
  terminal: ['#94a3b8', '#334155'],
  calc: ['#fdba74', '#ea580c'],
  paint: ['#fda4af', '#e11d48'],
  notes: ['#fcd34d', '#d97706'],
  calendar: ['#93c5fd', '#2563eb'],
  clock: ['#a5b4fc', '#4338ca'],
  music: ['#f0abfc', '#c026d3'],
  viewer: ['#67e8f9', '#0891b2'],
  settings: ['#cbd5e1', '#475569'],
  tasks: ['#86efac', '#16a34a'],
  browser: ['#7dd3fc', '#0284c7'],
  weather: ['#fde68a', '#0ea5e9'],
  snake: ['#86efac', '#15803d'],
  tetris: ['#c4b5fd', '#7c3aed'],
  mines: ['#fca5a5', '#b91c1c'],
  g2048: ['#fcd34d', '#b45309'],
  solitaire: ['#bbf7d0', '#166534'],
  breakout: ['#a5b4fc', '#1d4ed8'],
  trash: ['#fda4af', '#9f1239'],
};

const APP_GLYPH = {
  files: 'folder',
  editor: 'text',
  code: 'code',
  terminal: 'terminal',
  calc: 'calc',
  paint: 'paint',
  notes: 'notes',
  calendar: 'calendar',
  clock: 'clock',
  music: 'music',
  viewer: 'image',
  settings: 'settings',
  tasks: 'tasks',
  browser: 'browser',
  weather: 'weather',
  snake: 'snake',
  tetris: 'tetris',
  mines: 'mines',
  g2048: 'tiles',
  solitaire: 'cards',
  breakout: 'breakout',
  trash: 'trash',
};

let seq = 0;

export function icon(name, size = 24) {
  const body = GLYPHS[name] || GLYPHS.file;
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

export function appIcon(id, size = 48) {
  const glyph = GLYPHS[APP_GLYPH[id] || id] || GLYPHS.grid;
  const [a, b] = TILES[id] || ['#7c6bff', '#4338ca'];
  const gid = `ng${seq++}`;
  return `<svg class="app-ico" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
    <defs><linearGradient id="${gid}" x1="6" y1="4" x2="42" y2="46"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect x="1.25" y="1.25" width="45.5" height="45.5" rx="13" fill="url(#${gid})"/>
    <g fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" transform="translate(12 12)">${glyph}</g>
  </svg>`;
}

export function logo(size = 88) {
  const gid = `logo-bg-${seq++}`;
  return `<svg class="logo" width="${size}" height="${size}" viewBox="0 0 88 88" aria-hidden="true">
    <defs>
      <linearGradient id="${gid}" x1="10" y1="6" x2="78" y2="84">
        <stop offset="0" stop-color="#2a1b68"/>
        <stop offset="0.55" stop-color="#4a33a8"/>
        <stop offset="1" stop-color="#14556e"/>
      </linearGradient>
    </defs>
    <rect width="88" height="88" rx="22" fill="url(#${gid})"/>
    <ellipse cx="44" cy="44" rx="26" ry="10" fill="none" stroke="#efe8ff" stroke-width="2.2" transform="rotate(-24 44 44)"/>
    <circle cx="44" cy="44" r="4.2" fill="#fff8e4"/>
    <circle cx="66" cy="34" r="1.7" fill="#b9f3ff"/>
    <circle cx="26" cy="56" r="1.4" fill="#ffc4e4"/>
  </svg>`;
}
