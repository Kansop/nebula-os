/** Settings for appearance, account, sound, storage, and install. */

import { icon } from '../core/icons.js';
import { ACCENTS, WALLPAPERS, hashPin } from '../core/settings.js';
import { SHORTCUTS } from '../core/shortcuts.js';
import { VERSION } from '../core/version.js';
import { el, formatBytes } from '../core/util.js';

const SECTIONS = [
  ['personal', 'Personalization', 'palette'],
  ['desktop', 'Desktop', 'monitor'],
  ['sound', 'Sound', 'volume'],
  ['notifications', 'Notifications', 'bell'],
  ['account', 'Account', 'user'],
  ['storage', 'Storage', 'layers'],
  ['keyboard', 'Keyboard', 'keyboard'],
  ['about', 'About', 'info'],
];

export const settingsApp = {
  id: 'settings',
  name: 'Settings',
  blurb: 'Theme, wallpaper, account, storage',
  category: 'system',
  width: 860,
  height: 600,
  launch(env) {
    let section = env.params.section || 'personal';
    const root = el('div', { class: 'settings' });
    const nav = el('nav', { class: 'side' });
    const main = el('div', { class: 'settings-main' });
    root.append(nav, main);
    env.win.body.append(root);

    function renderNav() {
      nav.innerHTML = '';
      for (const [id, label, glyph] of SECTIONS) {
        const btn = el('button', { class: `place${id === section ? ' active' : ''}`, type: 'button' });
        btn.innerHTML = icon(glyph, 16);
        btn.append(el('span', { text: label }));
        btn.addEventListener('click', () => { section = id; render(); });
        nav.append(btn);
      }
    }
    function render() {
      renderNav();
      main.innerHTML = '';
      const title = SECTIONS.find((item) => item[0] === section)?.[1] || 'Settings';
      main.append(el('h2', { text: title }));
      if (section === 'personal') personal(main, env);
      else if (section === 'desktop') desktop(main, env);
      else if (section === 'sound') sound(main, env);
      else if (section === 'notifications') notifications(main, env);
      else if (section === 'account') account(main, env);
      else if (section === 'storage') storage(main, env);
      else if (section === 'keyboard') keyboard(main);
      else about(main, env);
    }
    const off = env.settings.onChange(() => { if (section === 'storage' || section === 'about') render(); });
    env.win.onClose(off);
    render();
  },
};

function row(label, control) {
  const line = el('label', { class: 'set-row' });
  line.append(el('span', { text: label }), control);
  return line;
}

function personal(main, env) {
  const theme = el('div', { class: 'seg' });
  for (const [id, label] of [['dark', 'Dark'], ['light', 'Light']]) {
    const btn = el('button', { class: `seg-btn${env.settings.get('theme') === id ? ' active' : ''}`, type: 'button', text: label });
    btn.addEventListener('click', () => {
      env.settings.set('theme', id);
      theme.querySelectorAll('.seg-btn').forEach((node) => node.classList.toggle('active', node === btn));
    });
    theme.append(btn);
  }
  main.append(row('Theme', theme));
  const accents = el('div', { class: 'swatches' });
  for (const accent of ACCENTS) {
    const btn = el('button', { class: `swatch${env.settings.get('accent') === accent.color ? ' selected' : ''}`, type: 'button', title: accent.label });
    btn.style.background = accent.color;
    btn.addEventListener('click', () => {
      env.settings.set('accent', accent.color);
      accents.querySelectorAll('.swatch').forEach((node) => node.classList.toggle('selected', node === btn));
    });
    accents.append(btn);
  }
  main.append(row('Accent', accents));
  const walls = el('div', { class: 'wall-grid' });
  for (const wall of WALLPAPERS) {
    const btn = el('button', { class: `wall-swatch wall-${wall.id}${env.settings.get('wallpaper') === wall.id ? ' selected' : ''}`, type: 'button', title: wall.name });
    btn.addEventListener('click', () => {
      env.settings.set('wallpaper', wall.id);
      walls.querySelectorAll('.wall-swatch').forEach((node) => node.classList.toggle('selected', node === btn));
    });
    walls.append(btn);
  }
  const custom = el('button', { class: 'btn btn-sm', type: 'button', text: 'Upload wallpaper' });
  custom.addEventListener('click', async () => {
    const input = el('input', { type: 'file', accept: 'image/*' });
    input.click();
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        await env.setCustomWallpaper(String(reader.result));
        env.notify({ title: 'Wallpaper updated', body: file.name, app: 'settings' });
      };
      reader.readAsDataURL(file);
    });
  });
  main.append(el('div', { class: 'set-block', text: 'Wallpaper' }), walls, custom);
  main.append(row('Transparency', toggle(env, 'transparency', true)));
  main.append(row('Reduce motion', toggle(env, 'reducedMotion', false)));
  main.append(row('Display dim', slider(env, 'dim', 0, 0.65, 0.01)));
  main.append(row('Text size', slider(env, 'fontScale', 0.9, 1.25, 0.05)));
}

function desktop(main, env) {
  main.append(row('Weather widget', toggle(env, 'showWidget', true)));
  main.append(el('p', { class: 'muted', text: 'The widget uses the same sample forecast as the Weather app.' }));
}

function sound(main, env) {
  main.append(row('Muted', toggle(env, 'muted', false)));
  main.append(row('Volume', slider(env, 'volume', 0, 1, 0.01)));
}

function notifications(main, env) {
  main.append(row('Allow notifications', toggle(env, 'notifications', true)));
  const clear = el('button', { class: 'btn', type: 'button', text: 'Clear notification history' });
  clear.addEventListener('click', () => {
    env.settings.set('notifHistory', []);
    env.settings.set('notifSeenAt', Date.now());
    env.bus.emit('notifications');
  });
  main.append(clear);
}

function account(main, env) {
  const name = el('input', { class: 'field', value: env.settings.get('username') || '', 'aria-label': 'Display name' });
  const save = el('button', { class: 'btn btn-primary', type: 'button', text: 'Save name' });
  save.addEventListener('click', () => {
    const value = name.value.trim() || 'Astronaut';
    env.settings.set('username', value);
    env.notify({ title: 'Account', body: `You are ${value}.`, app: 'settings' });
  });
  main.append(row('Display name', name), save);
  const setPin = el('button', { class: 'btn', type: 'button', text: env.settings.get('pinHash') ? 'Change PIN' : 'Set a PIN' });
  const clear = el('button', { class: 'btn', type: 'button', text: 'Remove PIN' });
  setPin.addEventListener('click', async () => {
    const pin = await env.dialogs.prompt({ title: 'Choose a PIN', message: 'Use 4 to 8 digits. It stays on this device.', placeholder: 'PIN' });
    if (pin == null) return;
    if (!/^\d{4,8}$/.test(pin)) {
      env.notify({ title: 'PIN not saved', body: 'Use 4 to 8 digits.', app: 'settings' });
      return;
    }
    const again = await env.dialogs.prompt({ title: 'Confirm PIN', placeholder: 'PIN' });
    if (again !== pin) {
      env.notify({ title: 'PIN not saved', body: 'The two entries did not match.', app: 'settings' });
      return;
    }
    env.settings.set('pinHash', await hashPin(pin));
    env.notify({ title: 'PIN saved', body: 'The lock screen will ask for it.', app: 'settings' });
  });
  clear.addEventListener('click', () => {
    env.settings.set('pinHash', null);
    env.notify({ title: 'PIN removed', body: 'The lock screen opens with one click.', app: 'settings' });
  });
  main.append(el('div', { class: 'inline' }, [setPin, clear]));
  main.append(el('p', { class: 'muted', text: 'The PIN is stored as a hash in local settings. It is not an account password and does not leave this browser.' }));
}

function storage(main, env) {
  const stats = env.fs.stats();
  main.append(el('p', { text: `${stats.files} files · ${stats.dirs} folders · ${formatBytes(stats.bytes)} on the virtual disk` }));
  const bar = el('div', { class: 'meter' });
  const fill = el('span');
  fill.style.width = `${Math.min(100, stats.bytes / 20000)}%`;
  bar.append(fill);
  main.append(bar);
  const empty = el('button', { class: 'btn', type: 'button', text: 'Empty Trash' });
  empty.addEventListener('click', async () => {
    const ok = await env.dialogs.confirm({ title: 'Empty Trash?', message: 'This cannot be undone.', ok: 'Empty Trash', danger: true });
    if (ok) env.fs.emptyTrash();
  });
  main.append(empty);
}

function keyboard(main) {
  const list = el('div', { class: 'shortcut-list' });
  for (const [keys, action] of SHORTCUTS) {
    const line = el('div', { class: 'shortcut' });
    line.append(el('span', { text: action }), el('kbd', { text: keys }));
    list.append(line);
  }
  main.append(list);
}

function about(main, env) {
  main.append(el('p', { text: `NebulaOS ${VERSION}` }));
  main.append(el('p', { class: 'muted', text: 'A desktop that runs in the browser. Files and settings stay on this device. There is no server behind the apps.' }));
  const install = el('button', { class: 'btn btn-primary', type: 'button', text: env.install.installed ? 'Installed' : 'Install app' });
  install.disabled = env.install.installed;
  install.addEventListener('click', async () => {
    if (env.install.available) {
      const accepted = await env.install.prompt();
      env.notify({ title: 'Install', body: accepted ? 'NebulaOS was added to this device.' : 'Install was dismissed.', app: 'settings' });
    } else if (!env.install.installed) {
      env.notify({ title: 'Install', body: 'This browser has not offered an install prompt yet. You can also use the browser menu.', app: 'settings' });
    }
  });
  main.append(install);
  const online = el('p', { class: 'muted', text: navigator.onLine ? 'Network: online' : 'Network: offline' });
  main.append(online);
}

function toggle(env, key, fallback) {
  const input = el('input', { type: 'checkbox' });
  const current = env.settings.get(key);
  input.checked = current == null ? fallback : Boolean(current);
  input.addEventListener('change', () => env.settings.set(key, input.checked));
  return input;
}

function slider(env, key, min, max, step) {
  const input = el('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(env.settings.get(key) ?? min) });
  input.addEventListener('input', () => env.settings.set(key, Number(input.value)));
  return input;
}
