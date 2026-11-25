/** Toasts and the notification history. */

import { el } from './util.js';

const MAX = 40;

export function createNotifier({ settings, bus, getAppIcon }) {
  const stack = el('div', { id: 'toasts', class: 'toasts', 'aria-live': 'polite' });
  document.body.append(stack);

  function push(entry) {
    const history = (settings.get('notifHistory') || []).slice(-MAX + 1);
    history.push(entry);
    settings.set('notifHistory', history.slice(-MAX));
    bus.emit('notifications');
  }

  function toast(entry) {
    const node = el('button', { class: 'toast', type: 'button' });
    node.innerHTML = `<span class="toast-ico">${getAppIcon(entry.app || 'settings', 28)}</span>`;
    const text = el('span', { class: 'toast-copy' });
    text.append(el('strong', { text: entry.title || 'NebulaOS' }), el('span', { text: entry.body || '' }));
    node.append(text);
    node.addEventListener('click', () => {
      node.remove();
      entry.onClick?.();
    });
    stack.append(node);
    setTimeout(() => {
      node.classList.add('leaving');
      setTimeout(() => node.remove(), 180);
    }, entry.timeout || 4200);
  }

  function notify({ title, body, app = 'settings', quiet = false, onClick } = {}) {
    const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title, body, app, at: Date.now() };
    if (settings.get('notifications') !== false) push(entry);
    if (!quiet && settings.get('notifications') !== false) toast({ ...entry, onClick });
    return entry;
  }

  return { notify, toast };
}
