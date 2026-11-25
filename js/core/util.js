/** Small shared helpers. No DOM. */

export function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

export function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

export function joinPath(a, b) {
  if (b == null || b === '') return a || '/';
  if (String(b).startsWith('/')) return b;
  if (!a || a === '/') return `/${b}`;
  return `${String(a).replace(/\/$/, '')}/${b}`;
}

export function basename(p) {
  if (!p || p === '/') return p || '/';
  const parts = String(p).split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '/';
}

export function dirname(p) {
  if (!p || p === '/') return '/';
  const parts = String(p).split('/').filter(Boolean);
  parts.pop();
  return `/${parts.join('/')}`;
}

export function extname(name) {
  const base = basename(name);
  const i = base.lastIndexOf('.');
  if (i <= 0) return '';
  return base.slice(i + 1).toLowerCase();
}

export function byteSize(value) {
  if (value == null) return 0;
  if (typeof value !== 'string') return 0;
  return new TextEncoder().encode(value).length;
}

export function formatBytes(n) {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(v < 10 * 1024 ? 1 : 0)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatDate(date = new Date()) {
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatFull(ts) {
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function pad(n) {
  return String(n).padStart(2, '0');
}

export function isoDay(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function guessMime(name) {
  const ext = extname(name);
  const map = {
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    js: 'text/javascript',
    mjs: 'text/javascript',
    css: 'text/css',
    html: 'text/html',
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    csv: 'text/csv',
    log: 'text/plain',
    xml: 'application/xml',
  };
  return map[ext] || 'application/octet-stream';
}

export function isTextMime(mime, name = '') {
  if (!mime) return !name || /^(txt|md|json|js|mjs|css|html|svg|csv|log|xml)$/i.test(extname(name));
  if (mime.startsWith('text/')) return true;
  return /json|javascript|xml|svg/.test(mime);
}

export function isImageName(name, mime = '') {
  if (mime.startsWith('image/')) return true;
  return /^(png|jpe?g|gif|webp|svg|bmp)$/i.test(extname(name));
}

export function uniqueName(name, exists) {
  if (!exists(name)) return name;
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let i = 1;
  let next = `${stem} (${i})${ext}`;
  while (exists(next)) {
    i += 1;
    next = `${stem} (${i})${ext}`;
  }
  return next;
}

export function globToRegExp(glob) {
  let s = '^';
  for (const c of glob) {
    if (c === '*') s += '.*';
    else if (c === '?') s += '.';
    else s += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`${s}$`, 'i');
}

export function downloadBlob(filename, blob) {
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function dataUrlToBlob(dataUrl) {
  const [head, body] = String(dataUrl).split(',');
  const mime = /data:([^;]+)/.exec(head)?.[1] || 'application/octet-stream';
  const binary = atob(body || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function readFileAs(file, asText) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Could not read file'));
    reader.onload = () => resolve(reader.result);
    if (asText) reader.readAsText(file);
    else reader.readAsDataURL(file);
  });
}

export function recordScore(settings, id, score) {
  const all = { ...(settings.get('gameScores') || {}) };
  const prev = all[id] || 0;
  if (score > prev) {
    all[id] = score;
    settings.set('gameScores', all);
  }
  return { best: Math.max(prev, score), improved: score > prev };
}

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset' && v && typeof v === 'object') {
      for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = dv;
    } else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}
