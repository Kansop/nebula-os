/** Shared context menu. */

import { el, esc } from './util.js';
import { icon } from './icons.js';

export function createMenus() {
  const menu = el('div', { id: 'menu', class: 'menu hidden', role: 'menu' });
  document.body.append(menu);

  function close() {
    menu.classList.add('hidden');
    menu.innerHTML = '';
  }

  function show(x, y, items) {
    menu.innerHTML = '';
    for (const item of items) {
      if (!item || item.hidden) continue;
      if (item.sep) {
        menu.append(el('div', { class: 'sep', role: 'separator' }));
        continue;
      }
      const btn = el('button', {
        class: `menu-item${item.danger ? ' danger' : ''}`,
        type: 'button',
        role: 'menuitem',
      });
      if (item.disabled) btn.disabled = true;
      btn.innerHTML = `<span class="mi-ico">${item.icon ? icon(item.icon, 16) : ''}</span><span class="mi-label">${esc(item.label)}</span>${item.hint ? `<span class="mi-hint">${esc(item.hint)}</span>` : ''}`;
      btn.addEventListener('click', () => {
        close();
        item.action?.();
      });
      menu.append(btn);
    }
    menu.classList.remove('hidden');
    const rect = menu.getBoundingClientRect();
    const left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8));
    const top = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  document.addEventListener('pointerdown', (event) => {
    if (!menu.contains(event.target)) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
  window.addEventListener('blur', close);
  window.addEventListener('resize', close);

  return { show, close, element: menu };
}
