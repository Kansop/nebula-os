/** Boots NebulaOS: settings, disk, windows, and the desktop shell. */

import { highlightJS } from './highlight.js';
import { createActions } from './actions.js';
import { defaultAppFor } from './associations.js';
import { createBus } from './bus.js';
import { createClipboard } from './clipboard.js';
import { createClockService } from './clock-service.js';
import { createDesktop } from './desktop.js';
import { createDialogs } from './dialogs.js';
import { createFileDialogs } from './filedialog.js';
import { createMenus } from './menus.js';
import { createMusic } from './music.js';
import { createNotifier } from './notify.js';
import { persistGet, persistSet } from './persist.js';
import { APPS, getApp } from './registry.js';
import { searchSystem } from './search.js';
import { createSettings, hashPin } from './settings.js';
import { applyAppearance } from './theme.js';
import { downloadEntry } from './transfer.js';
import { VERSION } from './version.js';
import { isValidTree, seedTree, VFS } from './vfs.js';
import { appIcon } from './icons.js';

export async function boot() {
  const bootEl = document.getElementById('boot');
  const status = document.getElementById('boot-status');
  const fill = document.getElementById('boot-fill');
  const setStatus = (text, amount) => {
    if (status) status.textContent = text;
    if (fill) fill.style.width = `${amount}%`;
  };
  const started = performance.now();
  let skipped = false;
  document.getElementById('boot-skip')?.addEventListener('click', () => { skipped = true; });

  setStatus('Loading settings', 18);
  const settings = createSettings();
  let customWall = '';
  try { customWall = (await persistGet('wallpaper')) || ''; } catch { customWall = ''; }
  applyAppearance(settings, customWall);

  setStatus('Mounting file system', 42);
  const bus = createBus();
  let stored = null;
  try { stored = await persistGet('fs'); } catch { stored = null; }
  const fs = new VFS(isValidTree(stored) ? stored : seedTree());
  let saveTimer = 0;
  fs.onChange = () => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      persistSet('fs', structuredClone(fs.tree)).catch(() => {});
      bus.emit('fs-change');
    }, 160);
  };

  setStatus('Starting services', 68);
  const dialogs = createDialogs();
  const menus = createMenus();
  const files = createFileDialogs(fs);
  const clip = createClipboard(fs);
  const notifyApi = createNotifier({ settings, bus, getAppIcon: (id, size) => appIcon(id, size) });
  const notify = (payload) => notifyApi.notify(payload);
  const music = createMusic({ settings, bus });
  const clock = createClockService({ settings, notify, beep: () => music.beep() });

  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstall = event;
    bus.emit('install');
  });
  const install = {
    get available() { return Boolean(deferredInstall); },
    get installed() {
      return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    },
    async prompt() {
      if (!deferredInstall) return false;
      deferredInstall.prompt();
      const choice = await deferredInstall.userChoice;
      deferredInstall = null;
      bus.emit('install');
      return choice.outcome === 'accepted';
    },
  };

  const os = document.getElementById('os');
  let openApp = () => {};
  let openPath = () => {};
  const actions = () => createActions({ settings, openApp, notify, fs });
  const desktop = createDesktop(os, {
    settings,
    fs,
    bus,
    menus,
    dialogs,
    notify,
    music,
    clock,
    install,
    clip,
    apps: APPS,
    getApp,
    appName: (id) => getApp(id)?.name || id,
    hashPin,
    download: (path) => downloadEntry(fs, path),
    openApp: (...args) => openApp(...args),
    openPath: (...args) => openPath(...args),
    search: (query) => searchSystem({ fs, apps: APPS, actions: actions(), query }),
    runAction: (id) => actions().find((action) => action.id === id)?.run(),
    setCustomWallpaper: async (url) => {
      customWall = url;
      await persistSet('wallpaper', url);
      settings.set('wallpaper', 'custom');
      applyAppearance(settings, customWall);
    },
  });

  function makeEnv(win, params) {
    return {
      win,
      fs,
      bus,
      settings,
      notify,
      dialogs,
      files,
      menus,
      clip,
      music,
      clock,
      install,
      params: params || {},
      version: VERSION,
      highlight: highlightJS,
      openApp,
      openPath,
      appName: (id) => getApp(id)?.name || id,
      listWindows: () => desktop.wm.list(),
      closeWindow: (id) => desktop.wm.close(id),
      focusWindow: (id) => desktop.wm.focus(id),
      setCustomWallpaper: async (url) => {
        customWall = url;
        await persistSet('wallpaper', url);
        settings.set('wallpaper', 'custom');
        applyAppearance(settings, customWall);
      },
    };
  }

  openApp = function launch(id, params = {}) {
    const app = getApp(id);
    if (!app) return null;
    desktop.closeTransient();
    const win = desktop.wm.open({
      appId: app.id,
      title: app.name,
      icon: app.id,
      width: app.width,
      height: app.height,
      minWidth: app.minWidth,
      minHeight: app.minHeight,
    });
    try {
      app.launch(makeEnv(win, params));
    } catch (error) {
      win.body.replaceChildren();
      const message = document.createElement('p');
      message.className = 'empty';
      message.textContent = error?.message || 'This app could not start.';
      win.body.append(message);
      notify({ title: app.name, body: message.textContent, app: app.id });
    }
    return win;
  };

  openPath = function launchPath(path, appId) {
    const stat = fs.stat(path);
    if (stat.kind === 'dir') return openApp('files', { path });
    return openApp(appId || defaultAppFor(stat.name), { path });
  };

  settings.onChange((key) => {
    if (['theme', 'accent', 'wallpaper', 'transparency', 'reducedMotion', 'fontScale', 'dim'].includes(key)) {
      applyAppearance(settings, customWall);
    }
  });

  setStatus('Ready', 100);
  const minimum = 1100;
  const wait = skipped ? 0 : Math.max(0, minimum - (performance.now() - started));
  await new Promise((resolve) => window.setTimeout(resolve, wait));
  if (skipped || performance.now() - started >= 0) bootEl?.classList.add('hidden');
  desktop.lock();
  registerWorker(bus, notify);
  window.addEventListener('online', () => notify({ title: 'Network', body: 'You are back online.', app: 'settings' }));
  window.addEventListener('offline', () => notify({ title: 'Network', body: 'You are offline. Cached pages still open.', app: 'settings' }));
}

function registerWorker(bus, notify) {
  if (!('serviceWorker' in navigator)) return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.register('./sw.js', { type: 'module' }).then((reg) => {
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (hadController && worker.state === 'installed') {
          notify({
            title: 'Update ready',
            body: 'Restart NebulaOS to finish updating.',
            app: 'settings',
            onClick: () => location.reload(),
          });
          bus.emit('update');
        }
      });
    });
  }).catch(() => {});
}
