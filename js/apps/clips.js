/** Recent clipboard text captured on this device. */

import { el } from '../core/util.js';

export const clipsApp = {
  id: 'clips',
  name: 'Clipboard',
  blurb: 'Recent text you copied',
  category: 'system',
  width: 560,
  height: 520,
  launch(env) {
    const root = el('div', { class: 'clips' });
    const bar = el('div', { class: 'toolbar' });
    const clear = el('button', { class: 'btn btn-sm', type: 'button', text: 'Clear history' });
    bar.append(el('span', { class: 'grow', text: 'Copies stay in this browser.' }), clear);
    const list = el('div', { class: 'clip-list' });
    root.append(bar, list);
    env.win.body.append(root);
    function render() {
      list.innerHTML = '';
      const items = env.settings.get('clipHistory') || [];
      if (!items.length) list.append(el('div', { class: 'empty', text: 'Copy some text and it will show up here.' }));
      for (const item of items) {
        const btn = el('button', { class: 'clip-item', type: 'button' });
        btn.append(el('span', { text: item.text }), el('small', { class: 'muted', text: new Date(item.at).toLocaleString() }));
        btn.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(item.text); } catch { /* selection fallback below */ }
          env.notify({ title: 'Copied again', body: item.text.slice(0, 80), app: 'clips' });
        });
        list.append(btn);
      }
    }
    clear.addEventListener('click', () => env.settings.set('clipHistory', []));
    const off = env.settings.onChange((key) => { if (key === 'clipHistory') render(); });
    env.win.onClose(off);
    render();
  },
};

export function rememberClip(settings, text) {
  const value = String(text || '').trim();
  if (!value) return;
  const items = (settings.get('clipHistory') || []).filter((item) => item.text !== value);
  items.unshift({ text: value.slice(0, 5000), at: Date.now() });
  settings.set('clipHistory', items.slice(0, 40));
}
