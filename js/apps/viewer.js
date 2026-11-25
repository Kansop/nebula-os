/** Image viewer for pictures stored on the virtual disk. */

import { icon } from '../core/icons.js';
import { el } from '../core/util.js';

export const viewerApp = {
  id: 'viewer',
  name: 'Viewer',
  blurb: 'Look at pictures',
  category: 'media',
  width: 860,
  height: 640,
  launch(env) {
    let path = env.params.path || firstImage(env.fs);
    let scale = 1;
    const root = el('div', { class: 'viewer' });
    const bar = el('div', { class: 'toolbar' });
    const prev = el('button', { class: 'iconbtn', type: 'button', html: icon('chevron-left', 18), 'aria-label': 'Previous' });
    const next = el('button', { class: 'iconbtn', type: 'button', html: icon('chevron-right', 18), 'aria-label': 'Next' });
    const name = el('span', { class: 'grow viewer-name' });
    const zoomOut = el('button', { class: 'iconbtn', type: 'button', html: icon('zoom-out', 18), 'aria-label': 'Zoom out' });
    const zoomIn = el('button', { class: 'iconbtn', type: 'button', html: icon('zoom-in', 18), 'aria-label': 'Zoom in' });
    const fit = el('button', { class: 'btn btn-sm', type: 'button', text: 'Fit' });
    const wall = el('button', { class: 'btn btn-sm', type: 'button', text: 'Set as wallpaper' });
    const edit = el('button', { class: 'btn btn-sm', type: 'button', text: 'Edit in Paint' });
    bar.append(prev, next, name, zoomOut, zoomIn, fit, wall, edit);
    const stage = el('div', { class: 'viewer-stage' });
    const img = el('img', { class: 'viewer-img', alt: '' });
    stage.append(img);
    root.append(bar, stage);
    env.win.body.append(root);

    function siblings() {
      if (!path) return [];
      const dir = path.split('/').slice(0, -1).join('/') || '/';
      if (!env.fs.exists(dir)) return [];
      return env.fs.list(dir).filter((entry) => entry.kind === 'file' && /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(entry.name));
    }
    function show() {
      if (!path || !env.fs.exists(path)) {
        name.textContent = 'No image';
        img.removeAttribute('src');
        return;
      }
      const src = imageSource(env.fs, path);
      img.src = src;
      img.alt = path.split('/').pop();
      name.textContent = img.alt;
      env.win.setTitle(img.alt);
      img.style.transform = `scale(${scale})`;
    }
    function step(delta) {
      const list = siblings();
      const index = list.findIndex((entry) => entry.path === path);
      if (!list.length) return;
      const nextIndex = (index + delta + list.length) % list.length;
      path = list[nextIndex].path;
      scale = 1;
      show();
    }
    prev.addEventListener('click', () => step(-1));
    next.addEventListener('click', () => step(1));
    zoomIn.addEventListener('click', () => { scale = Math.min(6, scale + 0.25); show(); });
    zoomOut.addEventListener('click', () => { scale = Math.max(0.25, scale - 0.25); show(); });
    fit.addEventListener('click', () => { scale = 1; show(); });
    stage.addEventListener('wheel', (event) => {
      event.preventDefault();
      scale = Math.min(6, Math.max(0.25, scale + (event.deltaY < 0 ? 0.15 : -0.15)));
      show();
    }, { passive: false });
    wall.addEventListener('click', async () => {
      if (!path) return;
      const src = imageSource(env.fs, path);
      if (!src) return;
      await env.setCustomWallpaper(src);
      env.notify({ title: 'Wallpaper updated', body: path.split('/').pop(), app: 'viewer' });
    });
    edit.addEventListener('click', () => { if (path) env.openApp('paint', { path }); });
    show();
  },
};

function firstImage(fs) {
  if (!fs.exists('/Home/Pictures')) return null;
  return fs.list('/Home/Pictures').find((entry) => /\.(png|jpe?g|gif|webp|svg)$/i.test(entry.name))?.path || null;
}

export function imageSource(fs, path) {
  const content = String(fs.read(path) ?? '');
  if (content.startsWith('data:') || content.startsWith('blob:')) return content;
  if (path.toLowerCase().endsWith('.svg') || content.trim().startsWith('<svg')) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`;
  }
  return '';
}
