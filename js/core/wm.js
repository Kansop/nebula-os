/** Window manager: drag, resize, snap, focus, minimize, maximize, virtual desktops. */

import { el } from './util.js';
import { icon } from './icons.js';

function isPhone() {
  return window.matchMedia('(max-width: 760px)').matches;
}

export function createWindowManager(layer, { getDesktop, onChange, renderIcon }) {
  const windows = new Map();
  let z = 30;
  let seq = 1;
  let activeId = null;
  const preview = el('div', { id: 'snap-preview', class: 'snap-preview', hidden: true });
  layer.parentElement?.append(preview) || document.body.append(preview);

  function workArea() {
    const taskbar = 64;
    return {
      x: 8,
      y: 8,
      w: Math.max(280, window.innerWidth - 16),
      h: Math.max(180, window.innerHeight - taskbar - 16),
    };
  }

  function emit() { onChange?.(); }

  function geometry(win) {
    win.el.style.left = `${win.x}px`;
    win.el.style.top = `${win.y}px`;
    win.el.style.width = `${win.w}px`;
    win.el.style.height = `${win.h}px`;
    win.el.style.zIndex = String(win.z);
  }

  function focus(id) {
    const win = windows.get(id);
    if (!win || win.closed) return;
    win.minimized = false;
    win.el.classList.remove('minimized');
    win.z = ++z;
    activeId = id;
    for (const other of windows.values()) other.el.classList.toggle('active', other.id === id);
    geometry(win);
    win.el.focus({ preventScroll: true });
    emit();
  }

  function remember(win) {
    if (win.maximized || win.snapped) return;
    win.restore = { x: win.x, y: win.y, w: win.w, h: win.h };
  }

  function applySnap(win, mode) {
    const area = workArea();
    if (!win.restore) remember(win);
    if (mode === 'left' || mode === 'right') {
      win.maximized = false;
      win.snapped = mode;
      win.w = Math.round(area.w / 2) - 4;
      win.h = area.h;
      win.x = mode === 'left' ? area.x : area.x + Math.round(area.w / 2) + 4;
      win.y = area.y;
    } else if (mode === 'max') {
      win.maximized = true;
      win.snapped = null;
      win.x = area.x;
      win.y = area.y;
      win.w = area.w;
      win.h = area.h;
    } else {
      win.maximized = false;
      win.snapped = null;
      const back = win.restore || { x: 80, y: 48, w: 720, h: 480 };
      Object.assign(win, back);
    }
    win.el.classList.toggle('maximized', win.maximized || isPhone());
    geometry(win);
    emit();
  }

  function showPreview(mode) {
    if (!mode) {
      preview.hidden = true;
      return;
    }
    const area = workArea();
    let x = area.x;
    let y = area.y;
    let w = area.w;
    let h = area.h;
    if (mode === 'left' || mode === 'right') {
      w = Math.round(area.w / 2) - 4;
      x = mode === 'left' ? area.x : area.x + Math.round(area.w / 2) + 4;
    }
    preview.hidden = false;
    preview.style.left = `${x}px`;
    preview.style.top = `${y}px`;
    preview.style.width = `${w}px`;
    preview.style.height = `${h}px`;
  }

  function edgeMode(clientX, clientY) {
    if (clientY < 10) return 'max';
    if (clientX < 14) return 'left';
    if (clientX > window.innerWidth - 14) return 'right';
    return null;
  }

  function close(id) {
    const win = windows.get(id);
    if (!win || win.closed) return;
    win.closed = true;
    win.el.classList.add('closing');
    const finish = () => {
      win.controller.abort();
      win.el.remove();
      windows.delete(id);
      if (activeId === id) {
        const next = [...windows.values()].filter((item) => item.desktop === getDesktop() && !item.minimized).sort((a, b) => b.z - a.z)[0];
        activeId = next?.id || null;
        if (next) next.el.classList.add('active');
      }
      emit();
    };
    if (document.documentElement.dataset.motion === 'reduce') finish();
    else window.setTimeout(finish, 140);
  }

  function minimize(id) {
    const win = windows.get(id);
    if (!win) return;
    win.minimized = true;
    win.el.classList.add('minimized');
    win.el.classList.remove('active');
    if (activeId === id) activeId = null;
    emit();
  }

  function open(opts) {
    const id = `w${seq++}`;
    const area = workArea();
    const phone = isPhone();
    const n = windows.size;
    const width = Math.min(opts.width || 760, area.w);
    const height = Math.min(opts.height || 500, area.h);
    const win = {
      id,
      appId: opts.appId,
      title: opts.title || 'Window',
      icon: opts.icon || opts.appId,
      x: phone ? area.x : Math.min(area.w - width, 56 + (n % 8) * 28),
      y: phone ? area.y : Math.min(area.h - height, 24 + (n % 8) * 26),
      w: phone ? area.w : width,
      h: phone ? area.h : height,
      minW: opts.minWidth || 300,
      minH: opts.minHeight || 200,
      maximized: phone,
      snapped: null,
      minimized: false,
      closed: false,
      desktop: getDesktop(),
      z: ++z,
      restore: null,
      controller: new AbortController(),
    };
    const node = el('section', { class: `window${phone ? ' maximized' : ''}`, tabindex: '-1', role: 'dialog', 'aria-label': win.title });
    node.dataset.id = id;
    node.dataset.app = win.appId;
    const bar = el('header', { class: 'titlebar' });
    const title = el('div', { class: 'w-title' });
    const glyph = el('span', { class: 'w-glyph', html: renderIcon(win.icon, 18) });
    const label = el('span', { class: 'w-label', text: win.title });
    title.append(glyph, label);
    const controls = el('div', { class: 'w-controls' });
    const mk = (name, glyphName, action) => {
      const btn = el('button', { class: `w-btn w-${name}`, type: 'button', 'aria-label': action, html: icon(glyphName, 14) });
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (name === 'min') minimize(id);
        else if (name === 'max') applySnap(win, win.maximized || win.snapped ? 'restore' : 'max');
        else close(id);
      });
      return btn;
    };
    controls.append(mk('min', 'minus', 'Minimize'), mk('max', 'square', 'Maximize'), mk('close', 'x', 'Close'));
    bar.append(title, controls);
    const body = el('div', { class: 'window-body' });
    node.append(bar, body);
    for (const dir of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
      const handle = el('div', { class: `resize ${dir}` });
      handle.addEventListener('pointerdown', (event) => startResize(win, dir, event));
      node.append(handle);
    }
    win.el = node;
    win.body = body;
    layer.append(node);
    geometry(win);
    windows.set(id, win);

    const signal = win.controller.signal;
    node.addEventListener('pointerdown', () => focus(id), { signal });
    bar.addEventListener('pointerdown', (event) => startDrag(win, event), { signal });
    bar.addEventListener('dblclick', (event) => {
      if (event.target.closest('button')) return;
      applySnap(win, win.maximized || win.snapped ? 'restore' : 'max');
    }, { signal });

    const ro = new ResizeObserver(() => win.onResize?.());
    ro.observe(body);
    signal.addEventListener('abort', () => ro.disconnect());

    const api = {
      id,
      appId: win.appId,
      el: node,
      body,
      signal,
      setTitle(text) {
        win.title = text;
        label.textContent = text;
        node.setAttribute('aria-label', text);
        emit();
      },
      close: () => close(id),
      focus: () => focus(id),
      minimize: () => minimize(id),
      onClose(fn) { signal.addEventListener('abort', fn); },
      onResize(fn) { win.onResize = fn; },
    };
    win.api = api;
    focus(id);
    requestAnimationFrame(() => node.classList.add('shown'));
    return api;
  }

  function startDrag(win, event) {
    if (event.button !== 0 || event.target.closest('button') || isPhone()) return;
    event.preventDefault();
    const pointer = event.pointerId;
    event.currentTarget.setPointerCapture?.(pointer);
    const sx = event.clientX;
    const sy = event.clientY;
    if (win.maximized || win.snapped) {
      const ratio = Math.min(0.8, Math.max(0.1, (event.clientX - win.x) / win.w));
      applySnap(win, 'restore');
      win.x = Math.round(event.clientX - win.w * ratio);
      win.y = Math.max(0, event.clientY - 20);
      geometry(win);
    }
    const ox = win.x;
    const oy = win.y;
    let mode = null;
    const move = (ev) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      win.x = ox + dx;
      win.y = Math.max(0, oy + dy);
      win.maximized = false;
      win.snapped = null;
      win.el.classList.remove('maximized');
      geometry(win);
      mode = edgeMode(ev.clientX, ev.clientY);
      showPreview(mode);
    };
    let done = false;
    const up = () => {
      if (done) return;
      done = true;
      event.currentTarget.removeEventListener('pointermove', move);
      showPreview(null);
      if (mode) applySnap(win, mode);
      else emit();
    };
    event.currentTarget.addEventListener('pointermove', move);
    event.currentTarget.addEventListener('pointerup', up);
    event.currentTarget.addEventListener('pointercancel', up);
  }

  function startResize(win, dir, event) {
    if (event.button !== 0 || isPhone()) return;
    event.preventDefault();
    event.stopPropagation();
    focus(win.id);
    if (win.maximized) return;
    const pointer = event.pointerId;
    event.currentTarget.setPointerCapture?.(pointer);
    const sx = event.clientX;
    const sy = event.clientY;
    const box = { x: win.x, y: win.y, w: win.w, h: win.h };
    const move = (ev) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      let { x, y, w, h } = box;
      if (dir.includes('e')) w = box.w + dx;
      if (dir.includes('s')) h = box.h + dy;
      if (dir.includes('w')) { w = box.w - dx; x = box.x + dx; }
      if (dir.includes('n')) { h = box.h - dy; y = box.y + dy; }
      if (w < win.minW) { if (dir.includes('w')) x -= win.minW - w; w = win.minW; }
      if (h < win.minH) { if (dir.includes('n')) y -= win.minH - h; h = win.minH; }
      win.x = x;
      win.y = Math.max(0, y);
      win.w = w;
      win.h = h;
      win.snapped = null;
      geometry(win);
    };
    const up = () => {
      event.currentTarget.removeEventListener('pointermove', move);
      emit();
    };
    event.currentTarget.addEventListener('pointermove', move);
    event.currentTarget.addEventListener('pointerup', up, { once: true });
    event.currentTarget.addEventListener('pointercancel', up, { once: true });
  }

  function syncDesktops() {
    const current = getDesktop();
    for (const win of windows.values()) {
      win.el.classList.toggle('offdesk', win.desktop !== current);
    }
    emit();
  }

  function retile() {
    if (!isPhone()) return;
    const area = workArea();
    for (const win of windows.values()) {
      win.x = area.x;
      win.y = area.y;
      win.w = area.w;
      win.h = area.h;
      win.maximized = true;
      geometry(win);
    }
  }

  window.addEventListener('resize', () => {
    for (const win of windows.values()) {
      if (win.maximized || win.snapped) applySnap(win, win.snapped || 'max');
    }
    retile();
  });

  return {
    open,
    focus,
    close,
    minimize,
    snap: (id, mode) => {
      const win = windows.get(id);
      if (win) applySnap(win, mode);
    },
    moveToDesktop(id, desktop) {
      const win = windows.get(id);
      if (!win) return;
      win.desktop = desktop;
      syncDesktops();
    },
    syncDesktops,
    active: () => windows.get(activeId) || null,
    list() {
      return [...windows.values()].map((win) => ({
        id: win.id,
        appId: win.appId,
        title: win.title,
        icon: win.icon,
        minimized: win.minimized,
        maximized: win.maximized,
        snapped: win.snapped,
        desktop: win.desktop,
        active: win.id === activeId,
        z: win.z,
      }));
    },
    cycle(step) {
      const list = [...windows.values()].filter((win) => win.desktop === getDesktop() && !win.closed);
      if (!list.length) return;
      list.sort((a, b) => a.z - b.z);
      const index = Math.max(0, list.findIndex((win) => win.id === activeId));
      const next = list[(index + step + list.length) % list.length];
      focus(next.id);
      return next;
    },
  };
}
