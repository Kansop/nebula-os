/** Install and remove desktop apps. Core apps stay. */

import { CORE_APPS, isInstalled } from '../core/catalog.js';
import { appIcon } from '../core/icons.js';
import { el } from '../core/util.js';

export const storeApp = {
  id: 'store',
  name: 'App Store',
  blurb: 'Choose which apps stay on the desk',
  category: 'system',
  width: 760,
  height: 640,
  launch(env) {
    const root = el('div', { class: 'store' });
    const list = el('div', { class: 'store-list' });
    root.append(el('p', { class: 'muted', text: 'Removing an app hides it from the menu. Its files stay on the disk. Files, Terminal, Settings, and the App Store cannot be removed.' }), list);
    env.win.body.append(root);
    function render() {
      list.innerHTML = '';
      for (const app of env.apps) {
        const row = el('div', { class: 'store-row' });
        row.innerHTML = appIcon(app.id, 40);
        const copy = el('div', { class: 'grow' });
        copy.append(el('strong', { text: app.name }), el('span', { class: 'muted', text: app.blurb || '' }));
        const core = CORE_APPS.includes(app.id);
        const installed = isInstalled(env.settings, app.id);
        const btn = el('button', { class: `btn btn-sm${installed && !core ? '' : ' btn-primary'}`, type: 'button', text: core ? 'Built in' : installed ? 'Remove' : 'Install' });
        btn.disabled = core;
        btn.addEventListener('click', () => {
          const next = new Set(env.settings.get('removedApps') || []);
          if (installed) next.add(app.id);
          else next.delete(app.id);
          env.settings.set('removedApps', [...next]);
          env.bus.emit('apps-changed');
          env.notify({ title: installed ? 'Removed' : 'Installed', body: app.name, app: 'store' });
        });
        row.append(copy, btn);
        list.append(row);
      }
    }
    const off = env.settings.onChange((key) => { if (key === 'removedApps') render(); });
    env.win.onClose(off);
    render();
  },
};
