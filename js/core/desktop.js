/** Desktop chrome: icons, taskbar, start menu, lock screen, trays, and shortcuts. */

import { eventsOn } from '../apps/calendar.js';
import { appsForFile } from '../core/associations.js';
import { appIcon, icon, logo } from '../core/icons.js';
import { importFiles } from '../core/transfer.js';
import { createWindowManager } from '../core/wm.js';
import { el, formatDate, formatTime, isoDay } from '../core/util.js';
import { cityById, SAMPLE_NOTE } from '../core/weather-data.js';

const DESKTOPS = 3;
const SHORTCUTS = [
  ['files', 'Files'],
  ['editor', 'Text Editor'],
  ['code', 'Code'],
  ['terminal', 'Terminal'],
  ['notes', 'Notes'],
  ['paint', 'Paint'],
  ['browser', 'Browser'],
  ['settings', 'Settings'],
];

export function createDesktop(os, api) {
  let desktopIndex = 0;
  const selected = new Set();
  const coarse = window.matchMedia('(pointer: coarse)').matches;

  const wallpaper = el('div', { class: 'wallpaper', 'aria-hidden': 'true' });
  const dimmer = el('div', { class: 'dimmer', 'aria-hidden': 'true' });
  const desktop = el('div', { id: 'desktop', class: 'desktop hidden' });
  const widget = el('button', { id: 'widget', class: 'widget', type: 'button' });
  const icons = el('div', { id: 'icons', class: 'desktop-icons', 'data-drop': '/Home/Desktop' });
  const windows = el('div', { id: 'windows', class: 'windows' });
  const taskbar = el('header', { class: 'taskbar' });
  const startBtn = el('button', { class: 'start-btn', type: 'button', 'aria-label': 'Start', html: logo(28) });
  const taskList = el('div', { class: 'task-list' });
  const deskSwitch = el('div', { class: 'desk-switch', 'aria-label': 'Virtual desktops' });
  const tray = el('div', { class: 'tray' });
  taskbar.append(startBtn, taskList, deskSwitch, tray);
  desktop.append(widget, icons, windows, taskbar);

  const start = el('div', { id: 'start', class: 'start hidden', role: 'dialog', 'aria-label': 'Start menu' });
  const flyout = el('div', { id: 'flyout', class: 'flyout hidden' });
  const switcher = el('div', { id: 'switcher', class: 'switcher hidden' });
  const lock = buildLock();
  const shutdown = el('div', { id: 'shutdown', class: 'overlay hidden' });
  shutdown.append(el('div', { class: 'boot-card' }, [
    el('div', { html: logo(88) }),
    el('h1', { text: 'NebulaOS is off' }),
    el('p', { class: 'muted', text: 'The desktop is still here. Power on when you want it back.' }),
  ]));
  const powerOn = el('button', { class: 'btn btn-primary', type: 'button', text: 'Power on' });
  shutdown.querySelector('.boot-card').append(powerOn);
  os.append(wallpaper, dimmer, desktop, start, flyout, switcher, lock.el, shutdown);

  const wm = createWindowManager(windows, {
    getDesktop: () => desktopIndex,
    onChange: () => api.bus.emit('windows'),
    renderIcon: (id, size) => appIcon(id, size),
  });

  function phone() { return window.matchMedia('(max-width: 760px)').matches; }
  function closeTransient() {
    start.classList.add('hidden');
    flyout.classList.add('hidden');
    switcher.classList.add('hidden');
    api.menus.close();
  }
  function openItem(item) {
    if (item.kind === 'app') api.openApp(item.id);
    else if (item.kind === 'trash') api.openApp('files', { path: '/Trash' });
    else if (item.entry?.kind === 'dir') api.openApp('files', { path: item.path });
    else api.openPath(item.path);
  }

  function iconItems() {
    const apps = SHORTCUTS.map(([id, name]) => ({ key: `app:${id}`, kind: 'app', id, name }));
    let files = [];
    try {
      files = api.fs.list('/Home/Desktop').map((entry) => ({
        key: `file:${entry.path}`,
        kind: 'file',
        path: entry.path,
        name: entry.name,
        entry,
      }));
    } catch { files = []; }
    return [...apps, ...files, { key: 'trash', kind: 'trash', name: 'Trash' }];
  }

  function placeIcons(items) {
    const saved = api.settings.get('iconPositions') || {};
    const rows = Math.max(1, Math.floor((window.innerHeight - 96) / 108));
    return items.map((item, index) => {
      const pos = saved[item.key];
      if (pos && !phone()) return { ...item, x: pos.x, y: pos.y };
      const col = Math.floor(index / rows);
      const row = index % rows;
      return { ...item, x: 16 + col * 108, y: 12 + row * 108 };
    });
  }

  function renderIcons() {
    const items = placeIcons(iconItems());
    icons.innerHTML = '';
    for (const item of items) {
      const btn = el('button', { class: `desk-icon${selected.has(item.key) ? ' selected' : ''}`, type: 'button' });
      if (!phone()) {
        btn.style.left = `${item.x}px`;
        btn.style.top = `${item.y}px`;
      }
      if (item.kind === 'trash') btn.dataset.drop = 'trash';
      else if (item.entry?.kind === 'dir') btn.dataset.drop = item.path;
      const glyph = item.kind === 'file'
        ? icon(item.entry.kind === 'dir' ? 'folder' : 'file', 28)
        : appIcon(item.kind === 'trash' ? 'trash' : item.id, 48);
      btn.innerHTML = `<span class="desk-glyph">${glyph}</span><span class="desk-label"></span>`;
      btn.querySelector('.desk-label').textContent = item.name;
      btn.addEventListener('click', () => {
        if (btn.dataset.dragged) { delete btn.dataset.dragged; return; }
        if (coarse) { openItem(item); return; }
        selected.clear();
        selected.add(item.key);
        icons.querySelectorAll('.desk-icon').forEach((node) => node.classList.remove('selected'));
        btn.classList.add('selected');
      });
      btn.addEventListener('dblclick', () => { if (!coarse) openItem(item); });
      btn.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        event.stopPropagation();
        selected.clear();
        selected.add(item.key);
        const fileItems = item.kind === 'file' ? [
          { label: 'Open', icon: 'external', action: () => openItem(item) },
          ...(item.entry.kind === 'file' ? appsForFile(item.name).slice(1).map((appId) => ({
            label: `Open with ${api.appName(appId)}`,
            icon: 'grid',
            action: () => api.openPath(item.path, appId),
          })) : []),
          { label: 'Rename', icon: 'pencil', action: () => renameFile(item) },
          { label: 'Download', icon: 'download', hidden: item.entry.kind !== 'file', action: () => api.download(item.path) },
          { sep: true },
          { label: 'Move to Trash', icon: 'trash', danger: true, action: () => api.fs.remove(item.path, { recursive: true }) },
        ] : [
          { label: 'Open', icon: 'external', action: () => openItem(item) },
        ];
        api.menus.show(event.clientX, event.clientY, fileItems);
      });
      if (!phone()) dragIcon(btn, item);
      icons.append(btn);
    }
  }

  function dragIcon(btn, item) {
    btn.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      const sx = event.clientX;
      const sy = event.clientY;
      const ox = btn.offsetLeft;
      const oy = btn.offsetTop;
      let dragging = false;
      const move = (ev) => {
        if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
        dragging = true;
        btn.dataset.dragged = '1';
        btn.style.left = `${ox + ev.clientX - sx}px`;
        btn.style.top = `${Math.max(0, oy + ev.clientY - sy)}px`;
        btn.style.zIndex = '5';
      };
      const up = (ev) => {
        btn.removeEventListener('pointermove', move);
        if (!dragging) return;
        const zone = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-drop]');
        const dest = zone && zone !== btn ? zone.dataset.drop : '';
        if (item.kind === 'file' && dest && dest !== item.path) {
          try {
            if (dest === 'trash') api.fs.remove(item.path, { recursive: true });
            else api.clip.drop([item.path], dest);
          } catch (error) {
            api.notify({ title: 'Could not move', body: error.message, app: 'files' });
          }
          return;
        }
        const positions = { ...(api.settings.get('iconPositions') || {}) };
        positions[item.key] = { x: btn.offsetLeft, y: btn.offsetTop };
        api.settings.set('iconPositions', positions);
      };
      btn.addEventListener('pointermove', move);
      btn.addEventListener('pointerup', up, { once: true });
      btn.addEventListener('pointercancel', up, { once: true });
    });
  }

  async function renameFile(item) {
    const name = await api.dialogs.prompt({ title: 'Rename', value: item.name, ok: 'Rename' });
    if (!name || name === item.name) return;
    try { api.fs.move(item.path, `/Home/Desktop/${name}`); }
    catch (error) { api.notify({ title: 'Could not rename', body: error.message, app: 'files' }); }
  }

  function renderWidget() {
    const show = api.settings.get('showWidget') !== false;
    widget.classList.toggle('hidden', !show);
    if (!show) return;
    const city = cityById(api.settings.get('weatherCity'));
    widget.innerHTML = `<span class="badge">${SAMPLE_NOTE}</span><strong>${city.temp}°</strong><span>${city.name}</span><em>${city.condition}</em>`;
  }

  function renderTasks() {
    taskList.innerHTML = '';
    const pinned = api.settings.get('pinned') || [];
    const wins = wm.list().filter((win) => win.desktop === desktopIndex);
    const ids = [...pinned];
    for (const win of wins) if (!ids.includes(win.appId)) ids.push(win.appId);
    for (const id of ids) {
      const app = api.getApp(id);
      if (!app) continue;
      const mine = wins.filter((win) => win.appId === id);
      const btn = el('button', { class: `task-btn${mine.some((win) => win.active && !win.minimized) ? ' active' : ''}${mine.length ? ' running' : ''}`, type: 'button', title: app.name });
      btn.innerHTML = appIcon(id, 28);
      btn.addEventListener('click', () => activateApp(id));
      btn.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const pinnedNow = api.settings.get('pinned') || [];
        api.menus.show(event.clientX, event.clientY, [
          { label: 'Open', icon: 'external', action: () => api.openApp(id) },
          { label: pinnedNow.includes(id) ? 'Unpin from taskbar' : 'Pin to taskbar', icon: 'pin', action: () => {
            const next = pinnedNow.includes(id) ? pinnedNow.filter((item) => item !== id) : pinnedNow.concat(id);
            api.settings.set('pinned', next);
          } },
          { label: 'Close windows', icon: 'x', hidden: !mine.length, action: () => mine.forEach((win) => wm.close(win.id)) },
        ]);
      });
      taskList.append(btn);
    }
  }

  function activateApp(id) {
    const mine = wm.list().filter((win) => win.appId === id && win.desktop === desktopIndex);
    closeTransient();
    if (!mine.length) { api.openApp(id); return; }
    const focused = mine.find((win) => win.active && !win.minimized);
    if (focused) wm.minimize(focused.id);
    else wm.focus(mine.slice().sort((a, b) => b.z - a.z)[0].id);
  }

  function renderDesks() {
    deskSwitch.innerHTML = '';
    for (let i = 0; i < DESKTOPS; i += 1) {
      const btn = el('button', { class: `desk-pip${i === desktopIndex ? ' active' : ''}`, type: 'button', 'aria-label': `Desktop ${i + 1}` });
      btn.addEventListener('click', () => setDesktop(i));
      deskSwitch.append(btn);
    }
  }

  function setDesktop(index) {
    desktopIndex = (index + DESKTOPS) % DESKTOPS;
    wm.syncDesktops();
    renderDesks();
    renderTasks();
  }

  function renderTray() {
    tray.innerHTML = '';
    if (api.music.state.playing) {
      const musicBtn = el('button', { class: 'tray-btn', type: 'button', title: 'Music', html: icon('music', 16) });
      musicBtn.addEventListener('click', () => api.openApp('music'));
      tray.append(musicBtn);
    }
    const net = el('button', { class: 'tray-btn', type: 'button', title: navigator.onLine ? 'Online' : 'Offline', html: icon(navigator.onLine ? 'wifi' : 'wifi-off', 16) });
    const vol = el('button', { class: 'tray-btn', type: 'button', title: 'Volume', html: icon(api.settings.get('muted') ? 'volume-off' : 'volume', 16) });
    const bell = el('button', { class: 'tray-btn', type: 'button', title: 'Notifications', html: icon('bell', 16) });
    const unread = (api.settings.get('notifHistory') || []).filter((item) => item.at > (api.settings.get('notifSeenAt') || 0)).length;
    if (unread) bell.append(el('i', { class: 'badge-count', text: String(unread) }));
    const clock = el('button', { class: 'clock-btn', type: 'button' });
    clock.append(el('strong', { text: formatTime() }), el('span', { text: formatDate() }));
    vol.addEventListener('click', (event) => openFlyout(event.currentTarget, volumePanel()));
    bell.addEventListener('click', (event) => {
      api.settings.set('notifSeenAt', Date.now());
      openFlyout(event.currentTarget, notificationPanel());
    });
    clock.addEventListener('click', (event) => openFlyout(event.currentTarget, calendarPanel()));
    net.addEventListener('click', (event) => openFlyout(event.currentTarget, quickPanel()));
    tray.append(net, vol, bell, clock);
  }

  function openFlyout(anchor, node) {
    if (!flyout.classList.contains('hidden') && flyout.dataset.owner === anchor.title) {
      flyout.classList.add('hidden');
      return;
    }
    start.classList.add('hidden');
    flyout.innerHTML = '';
    flyout.dataset.owner = anchor.title || 'panel';
    flyout.append(node);
    flyout.classList.remove('hidden');
    const rect = anchor.getBoundingClientRect();
    flyout.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
    flyout.style.left = 'auto';
    flyout.style.bottom = 'calc(var(--taskbar) + 10px)';
  }

  function volumePanel() {
    const panel = el('div', { class: 'panel' });
    panel.append(el('h3', { text: 'Volume' }));
    const slider = el('input', { type: 'range', min: '0', max: '1', step: '0.01', value: String(api.settings.get('volume') ?? 0.8), 'aria-label': 'Volume' });
    const mute = el('button', { class: 'btn btn-sm', type: 'button', text: api.settings.get('muted') ? 'Unmute' : 'Mute' });
    slider.addEventListener('input', () => api.settings.set('volume', Number(slider.value)));
    mute.addEventListener('click', () => { api.settings.set('muted', !api.settings.get('muted')); renderTray(); flyout.classList.add('hidden'); });
    panel.append(slider, mute);
    return panel;
  }
  function notificationPanel() {
    const panel = el('div', { class: 'panel notif-panel' });
    const head = el('div', { class: 'inline' });
    head.append(el('h3', { class: 'grow', text: 'Notifications' }));
    const clear = el('button', { class: 'btn btn-sm', type: 'button', text: 'Clear' });
    clear.addEventListener('click', () => { api.settings.set('notifHistory', []); api.bus.emit('notifications'); flyout.classList.add('hidden'); });
    head.append(clear);
    panel.append(head);
    const items = (api.settings.get('notifHistory') || []).slice().reverse();
    if (!items.length) panel.append(el('p', { class: 'muted', text: 'You are all caught up.' }));
    for (const item of items.slice(0, 12)) {
      const row = el('div', { class: 'notif-row' });
      row.innerHTML = appIcon(item.app || 'settings', 28);
      const copy = el('div');
      copy.append(el('strong', { text: item.title || 'NebulaOS' }), el('span', { text: item.body || '' }));
      row.append(copy);
      panel.append(row);
    }
    return panel;
  }
  function calendarPanel() {
    const panel = el('div', { class: 'panel' });
    const now = new Date();
    panel.append(el('h3', { text: formatDate(now) }), el('p', { class: 'big-time', text: formatTime(now) }));
    const events = eventsOn(api.fs, isoDay(now));
    if (!events.length) panel.append(el('p', { class: 'muted', text: 'No events today.' }));
    for (const event of events) panel.append(el('div', { class: 'event', text: `${event.time || ''} ${event.title}`.trim() }));
    const open = el('button', { class: 'btn btn-sm', type: 'button', text: 'Open Calendar' });
    open.addEventListener('click', () => { flyout.classList.add('hidden'); api.openApp('calendar'); });
    panel.append(open);
    return panel;
  }
  function quickPanel() {
    const panel = el('div', { class: 'panel' });
    panel.append(el('h3', { text: 'Quick settings' }));
    panel.append(el('p', { text: navigator.onLine ? 'Network online' : 'Network offline' }));
    const dim = el('input', { type: 'range', min: '0', max: '0.65', step: '0.01', value: String(api.settings.get('dim') || 0), 'aria-label': 'Display dim' });
    dim.addEventListener('input', () => api.settings.set('dim', Number(dim.value)));
    const theme = el('button', { class: 'btn btn-sm', type: 'button', text: api.settings.get('theme') === 'light' ? 'Use dark theme' : 'Use light theme' });
    theme.addEventListener('click', () => api.settings.set('theme', api.settings.get('theme') === 'light' ? 'dark' : 'light'));
    panel.append(el('span', { class: 'field-label', text: 'Dim' }), dim, theme);
    return panel;
  }

  let searchQuery = '';
  let searchIndex = 0;
  function toggleStart(focusSearch = false) {
    const open = start.classList.contains('hidden');
    closeTransient();
    if (!open) return;
    flyout.classList.add('hidden');
    start.classList.remove('hidden');
    renderStart();
    if (focusSearch) start.querySelector('input')?.focus();
  }
  function renderStart() {
    start.innerHTML = '';
    const input = el('input', { class: 'field start-search', placeholder: 'Search apps, files, and settings', 'aria-label': 'Search', value: searchQuery });
    const body = el('div', { class: 'start-body' });
    start.append(input, body, startFooter());
    input.addEventListener('input', () => { searchQuery = input.value; searchIndex = 0; renderStartResults(body, input.value); });
    input.addEventListener('keydown', (event) => {
      const results = body.querySelectorAll('.result');
      if (event.key === 'ArrowDown') { event.preventDefault(); searchIndex = Math.min(results.length - 1, searchIndex + 1); mark(results); }
      if (event.key === 'ArrowUp') { event.preventDefault(); searchIndex = Math.max(0, searchIndex - 1); mark(results); }
      if (event.key === 'Enter' && results[searchIndex]) results[searchIndex].click();
    });
    renderStartResults(body, searchQuery);
    if (document.activeElement?.classList.contains('start-search') || searchQuery) input.focus();
  }
  function mark(results) {
    results.forEach((node, index) => node.classList.toggle('active', index === searchIndex));
    results[searchIndex]?.scrollIntoView({ block: 'nearest' });
  }
  function renderStartResults(body, query) {
    body.innerHTML = '';
    const results = query.trim() ? api.search(query) : [];
    if (query.trim()) {
      if (!results.length) body.append(el('div', { class: 'empty', text: 'No matches' }));
      results.forEach((result, index) => {
        const btn = el('button', { class: `result${index === searchIndex ? ' active' : ''}`, type: 'button' });
        const glyph = result.type === 'app' ? appIcon(result.appId, 32) : result.type === 'file' ? icon('file', 20) : icon('sliders', 20);
        btn.innerHTML = `<span class="result-ico">${glyph}</span>`;
        const copy = el('span', { class: 'result-copy' });
        copy.append(el('strong', { text: result.title }), el('span', { text: result.subtitle || '' }));
        btn.append(copy);
        btn.addEventListener('click', () => {
          closeTransient();
          if (result.type === 'app') api.openApp(result.appId);
          else if (result.type === 'file') api.openPath(result.path);
          else api.runAction(result.actionId);
        });
        body.append(btn);
      });
      return;
    }
    const pinned = el('div', { class: 'start-pinned' });
    for (const app of api.apps.filter((item) => item.category !== 'games').slice(0, 8)) {
      const btn = el('button', { class: 'app-tile', type: 'button' });
      btn.innerHTML = appIcon(app.id, 42);
      btn.append(el('span', { text: app.name }));
      btn.addEventListener('click', () => { closeTransient(); api.openApp(app.id); });
      pinned.append(btn);
    }
    body.append(el('h3', { text: 'Apps' }), pinned);
    const cats = ['system', 'productivity', 'media', 'games'];
    for (const cat of cats) {
      const group = api.apps.filter((item) => item.category === cat);
      if (!group.length) continue;
      body.append(el('h3', { text: cat[0].toUpperCase() + cat.slice(1) }));
      const list = el('div', { class: 'start-list' });
      for (const app of group) {
        const btn = el('button', { class: 'start-app', type: 'button' });
        btn.innerHTML = appIcon(app.id, 28);
        btn.append(el('span', { text: app.name }));
        btn.addEventListener('click', () => { closeTransient(); api.openApp(app.id); });
        list.append(btn);
      }
      body.append(list);
    }
  }
  function startFooter() {
    const foot = el('div', { class: 'start-foot' });
    const user = el('button', { class: 'user-chip', type: 'button' });
    user.innerHTML = icon('user', 18);
    user.append(el('span', { text: api.settings.get('username') || 'Astronaut' }));
    user.addEventListener('click', () => { closeTransient(); api.openApp('settings', { section: 'account' }); });
    const install = el('button', { class: 'btn btn-sm', type: 'button', text: 'Install' });
    install.classList.toggle('hidden', !api.install.available || api.install.installed);
    install.addEventListener('click', async () => {
      const accepted = await api.install.prompt();
      api.notify({ title: 'Install', body: accepted ? 'NebulaOS was added to this device.' : 'Install was dismissed.', app: 'settings' });
      renderStart();
    });
    const power = el('button', { class: 'iconbtn', type: 'button', title: 'Power', html: icon('power', 18) });
    power.addEventListener('click', (event) => {
      event.stopPropagation();
      api.menus.show(event.clientX, event.clientY, [
        { label: 'Lock', icon: 'lock', action: () => lockScreen() },
        { label: 'Restart', icon: 'refresh', action: () => location.reload() },
        { label: 'Shut down', icon: 'power', danger: true, action: () => { closeTransient(); desktop.classList.add('hidden'); shutdown.classList.remove('hidden'); } },
      ]);
    });
    foot.append(user, install, power);
    return foot;
  }

  function buildLock() {
    const elock = el('div', { id: 'lock', class: 'overlay hidden' });
    const time = el('div', { class: 'lock-time' });
    const date = el('div', { class: 'lock-date' });
    const card = el('div', { class: 'lock-card' });
    const avatar = el('div', { class: 'avatar', html: icon('user', 28) });
    const name = el('div', { class: 'lock-name' });
    const enter = el('button', { class: 'btn btn-primary', type: 'button', text: 'Enter' });
    const pinWrap = el('div', { class: 'pin-wrap hidden' });
    const dots = el('div', { class: 'pin-dots', 'aria-hidden': 'true' });
    const error = el('div', { class: 'lock-error' });
    const pad = el('div', { class: 'pin-pad' });
    let pin = '';
    function paintDots() {
      dots.innerHTML = '';
      for (let i = 0; i < 4; i += 1) dots.append(el('i', { class: i < pin.length ? 'on' : '' }));
    }
    async function submit() {
      if (!pin) return;
      const hash = await api.hashPin(pin);
      if (hash === api.settings.get('pinHash')) unlock();
      else {
        error.textContent = 'Wrong PIN';
        pin = '';
        paintDots();
      }
    }
    for (const key of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK']) {
      const btn = el('button', { class: 'pin-key', type: 'button', text: key });
      btn.addEventListener('click', () => {
        error.textContent = '';
        if (key === 'C') pin = '';
        else if (key === 'OK') submit();
        else if (pin.length < 8) pin += key;
        paintDots();
        if (pin.length >= 4 && key !== 'OK' && key !== 'C') submit();
      });
      pad.append(btn);
    }
    pinWrap.append(dots, pad, error);
    card.append(avatar, name, enter, pinWrap);
    elock.append(time, date, card);
    enter.addEventListener('click', unlock);
    function tick() {
      const now = new Date();
      time.textContent = formatTime(now);
      date.textContent = formatDate(now);
      name.textContent = api.settings.get('username') || 'Astronaut';
    }
    setInterval(tick, 1000);
    tick();
    return { el: elock, tick, show() {
      pin = '';
      paintDots();
      error.textContent = '';
      const secured = Boolean(api.settings.get('pinHash'));
      enter.classList.toggle('hidden', secured);
      pinWrap.classList.toggle('hidden', !secured);
      elock.classList.remove('hidden');
      desktop.classList.add('hidden');
      tick();
    } };
  }

  function lockScreen() {
    closeTransient();
    lock.show();
  }
  function unlock() {
    lock.el.classList.add('hidden');
    shutdown.classList.add('hidden');
    desktop.classList.remove('hidden');
    if (!api.settings.get('welcomed')) {
      api.settings.set('welcomed', true);
      api.notify({ title: 'Welcome to NebulaOS', body: 'Files stay on this device. Search with Ctrl+K.', app: 'settings' });
    }
  }

  icons.addEventListener('contextmenu', (event) => {
    if (event.target.closest('.desk-icon')) return;
    event.preventDefault();
    selected.clear();
    renderIcons();
    api.menus.show(event.clientX, event.clientY, [
      { label: 'New folder', icon: 'folder-plus', action: () => newDesktopItem('folder') },
      { label: 'New text file', icon: 'file-plus', action: () => newDesktopItem('file') },
      { label: 'Paste', icon: 'paste', disabled: !api.clip.state.paths.length, action: () => api.clip.paste('/Home/Desktop') },
      { sep: true },
      { label: 'Open Terminal', icon: 'terminal', action: () => api.openApp('terminal', { cwd: '/Home/Desktop' }) },
      { label: 'Personalize', icon: 'palette', action: () => api.openApp('settings', { section: 'personal' }) },
      { label: 'Refresh', icon: 'refresh', action: () => renderIcons() },
    ]);
  });
  icons.addEventListener('pointerdown', (event) => {
    if (event.target === icons) { selected.clear(); renderIcons(); }
  });
  icons.addEventListener('dragover', (event) => {
    if ([...event.dataTransfer.types].includes('Files')) event.preventDefault();
  });
  icons.addEventListener('drop', async (event) => {
    if (!event.dataTransfer.files?.length) return;
    event.preventDefault();
    const saved = await importFiles(api.fs, event.dataTransfer.files, '/Home/Desktop');
    api.notify({ title: 'Imported', body: `${saved.length} file${saved.length === 1 ? '' : 's'} on the desktop`, app: 'files' });
  });

  async function newDesktopItem(kind) {
    if (kind === 'folder') {
      const name = await api.dialogs.prompt({ title: 'New folder', value: 'Untitled folder', ok: 'Create' });
      if (name) api.fs.mkdir(`/Home/Desktop/${name}`);
    } else {
      const name = await api.dialogs.prompt({ title: 'New text file', value: 'Untitled.txt', ok: 'Create' });
      if (!name) return;
      api.fs.write(`/Home/Desktop/${name}`, '');
      api.openPath(`/Home/Desktop/${name}`);
    }
  }

  startBtn.addEventListener('click', () => toggleStart(true));
  powerOn.addEventListener('click', () => { shutdown.classList.add('hidden'); lock.show(); });
  widget.addEventListener('click', () => api.openApp('weather'));

  document.addEventListener('pointerdown', (event) => {
    if (!start.contains(event.target) && !startBtn.contains(event.target)) start.classList.add('hidden');
    if (!flyout.contains(event.target) && !event.target.closest('.tray')) flyout.classList.add('hidden');
  });
  document.addEventListener('contextmenu', (event) => {
    if (event.target.closest('input, textarea')) return;
    if (event.target.closest('.desktop, .taskbar, .window, .start')) event.preventDefault();
  });
  window.addEventListener('keydown', (event) => onKey(event), true);
  window.addEventListener('keyup', (event) => { if (event.key === 'Alt') switcher.classList.add('hidden'); });
  window.addEventListener('resize', () => { renderIcons(); renderTasks(); });
  api.bus.on('windows', renderTasks);
  api.bus.on('fs-change', renderIcons);
  api.bus.on('notifications', renderTray);
  api.bus.on('music', renderTray);
  api.settings.onChange((key) => {
    if (key === 'showWidget' || key === 'weatherCity') renderWidget();
    if (key === 'pinned') renderTasks();
    if (key === 'username') renderStart();
    if (key === 'volume' || key === 'muted') renderTray();
  });

  function onKey(event) {
    const meta = event.ctrlKey || event.metaKey;
    const key = event.key;
    const typing = event.target.matches?.('input, textarea, select') || event.target.isContentEditable;
    const dialogOpen = document.querySelector('.dialog-back');
    if (key === 'Escape') {
      closeTransient();
      return;
    }
    if (meta && key.toLowerCase() === 'k') { event.preventDefault(); searchQuery = ''; toggleStart(true); return; }
    if ((meta && key === 'Escape') || (key === 'Meta' && !event.repeat)) { event.preventDefault(); toggleStart(true); return; }
    if (dialogOpen) return;
    if (event.altKey && key === 'Tab') {
      event.preventDefault();
      const next = wm.cycle(event.shiftKey ? -1 : 1);
      showSwitcher(next);
      return;
    }
    if ((event.altKey && key === 'F4') || (meta && key.toLowerCase() === 'w' && !event.shiftKey)) {
      event.preventDefault();
      const active = wm.active();
      if (active && active.desktop === desktopIndex) wm.close(active.id);
      return;
    }
    if (meta && key.toLowerCase() === 's') {
      event.preventDefault();
      const active = wm.active();
      if (active) api.bus.emit('save', active.id);
      return;
    }
    if (meta && key.toLowerCase() === 'f') {
      event.preventDefault();
      const active = wm.active();
      if (active) api.bus.emit('find', active.id);
      return;
    }
    if (typing) return;
    if (event.altKey && key === 'ArrowLeft') { event.preventDefault(); snap('left'); }
    else if (event.altKey && key === 'ArrowRight') { event.preventDefault(); snap('right'); }
    else if (event.altKey && key === 'ArrowUp') { event.preventDefault(); snap('max'); }
    else if (event.altKey && key === 'ArrowDown') { event.preventDefault(); snap('restore'); }
    else if (meta && event.altKey && event.shiftKey && key === 'ArrowRight') { moveActiveDesktop(1); event.preventDefault(); }
    else if (meta && event.altKey && key === 'ArrowLeft') { event.preventDefault(); setDesktop(desktopIndex - 1); }
    else if (meta && event.altKey && key === 'ArrowRight') { event.preventDefault(); setDesktop(desktopIndex + 1); }
    else if (meta && event.altKey && key.toLowerCase() === 't') { event.preventDefault(); api.openApp('terminal'); }
    else if (key === 'Backspace') event.preventDefault();
  }
  function snap(mode) {
    const active = wm.active();
    if (active && active.desktop === desktopIndex) wm.snap(active.id, mode);
  }
  function moveActiveDesktop(delta) {
    const active = wm.active();
    if (!active) return;
    const next = (active.desktop + delta + DESKTOPS) % DESKTOPS;
    wm.moveToDesktop(active.id, next);
    setDesktop(next);
  }
  function showSwitcher() {
    const list = wm.list().filter((win) => win.desktop === desktopIndex);
    switcher.innerHTML = '';
    if (!list.length) { switcher.classList.add('hidden'); return; }
    for (const win of list.sort((a, b) => b.z - a.z)) {
      const btn = el('button', { class: `switcher-item${win.active ? ' active' : ''}`, type: 'button' });
      btn.innerHTML = appIcon(win.icon, 36);
      btn.append(el('span', { text: win.title }));
      btn.addEventListener('click', () => { wm.focus(win.id); switcher.classList.add('hidden'); });
      switcher.append(btn);
    }
    switcher.classList.remove('hidden');
  }

  renderIcons();
  renderWidget();
  renderTasks();
  renderDesks();
  renderTray();
  setInterval(() => {
    const clock = tray.querySelector('.clock-btn');
    if (!clock) return;
    const now = new Date();
    const strong = clock.querySelector('strong');
    const span = clock.querySelector('span');
    if (strong) strong.textContent = formatTime(now);
    if (span) span.textContent = formatDate(now);
  }, 1000);

  return { wm, lock: lockScreen, unlock, setDesktop, closeTransient, renderIcons };
}
