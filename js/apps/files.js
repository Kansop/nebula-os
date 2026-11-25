/** Files — browse the virtual disk, and hand files to other apps. */

import { appsForFile } from '../core/associations.js';
import { icon } from '../core/icons.js';
import { downloadEntry, importFiles } from '../core/transfer.js';
import { el, formatBytes, formatFull } from '../core/util.js';

const PLACES = [
  ['Home', '/Home', 'home'],
  ['Desktop', '/Home/Desktop', 'desktop'],
  ['Documents', '/Home/Documents', 'text'],
  ['Pictures', '/Home/Pictures', 'image'],
  ['Notes', '/Home/Notes', 'notes'],
  ['Code', '/Home/Code', 'code'],
  ['Music', '/Home/Music', 'music'],
  ['Trash', '/Trash', 'trash'],
];

export const filesApp = {
  id: 'files',
  name: 'Files',
  blurb: 'Browse, move, and open your files',
  category: 'system',
  width: 920,
  height: 580,
  minWidth: 520,
  launch(env) {
    const { fs, win } = env;
    let path = env.params.path && fs.exists(env.params.path) && fs.stat(env.params.path).kind === 'dir'
      ? env.params.path
      : '/Home';
    const history = [];
    const future = [];
    const selected = new Set();
    let filter = '';

    win.body.classList.add('files');
    const toolbar = el('div', { class: 'toolbar' });
    const backBtn = button('chevron-left', 'Back');
    const fwdBtn = button('chevron-right', 'Forward');
    const upBtn = button('chevron-up', 'Up');
    const crumbs = el('div', { class: 'crumbs grow' });
    const search = el('input', { class: 'field field-sm', placeholder: 'Filter', 'aria-label': 'Filter files' });
    const newBtn = button('folder-plus', 'New folder');
    const fileBtn = button('file-plus', 'New file');
    const uploadBtn = button('upload', 'Upload');
    const upload = el('input', { type: 'file', multiple: true, hidden: true });
    toolbar.append(backBtn, fwdBtn, upBtn, crumbs, search, newBtn, fileBtn, uploadBtn, upload);

    const body = el('div', { class: 'files-body' });
    const side = el('nav', { class: 'side', 'aria-label': 'Places' });
    const main = el('div', { class: 'file-main', 'data-drop': path });
    const grid = el('div', { class: 'file-grid' });
    const status = el('div', { class: 'statusbar' });
    main.append(grid);
    body.append(side, main);
    win.body.append(toolbar, body, status);

    function button(name, label) {
      return el('button', { class: 'iconbtn', type: 'button', title: label, 'aria-label': label, html: icon(name, 18) });
    }

    function go(next, { record = true } = {}) {
      if (!fs.exists(next) || fs.stat(next).kind !== 'dir') return;
      if (record && next !== path) {
        history.push(path);
        future.length = 0;
      }
      path = next;
      selected.clear();
      render();
    }

    function openEntry(entry, appId) {
      if (entry.kind === 'dir') go(entry.path);
      else env.openPath(entry.path, appId);
    }

    async function rename(entry) {
      const name = await env.dialogs.prompt({ title: 'Rename', value: entry.name, ok: 'Rename' });
      if (!name || name === entry.name) return;
      const parent = entry.path.slice(0, entry.path.lastIndexOf('/')) || '/';
      try {
        fs.move(entry.path, `${parent === '/' ? '' : parent}/${name}`);
        env.notify({ title: 'Renamed', body: name, app: 'files' });
      } catch (error) {
        env.notify({ title: 'Could not rename', body: error.message, app: 'files' });
      }
    }

    function removeSelected(permanent = false) {
      const paths = [...selected];
      for (const item of paths) {
        try { fs.remove(item, { recursive: true, permanent: permanent || item.startsWith('/Trash/') }); }
        catch (error) { env.notify({ title: 'Could not delete', body: error.message, app: 'files' }); }
      }
      selected.clear();
    }

    function renderSide() {
      side.innerHTML = '';
      for (const [label, target, glyph] of PLACES) {
        const btn = el('button', { class: `place${target === path ? ' active' : ''}`, type: 'button', 'data-drop': target === '/Trash' ? 'trash' : target });
        btn.innerHTML = icon(glyph, 16);
        btn.append(el('span', { text: label }));
        btn.addEventListener('click', () => go(target));
        side.append(btn);
      }
    }

    function renderCrumbs() {
      crumbs.innerHTML = '';
      const root = el('button', { class: 'crumb', type: 'button', text: 'Disk' });
      root.addEventListener('click', () => go('/'));
      crumbs.append(root);
      let built = '';
      for (const part of path.split('/').filter(Boolean)) {
        built += `/${part}`;
        const target = built;
        const btn = el('button', { class: 'crumb', type: 'button', text: part });
        btn.addEventListener('click', () => go(target));
        crumbs.append(el('span', { class: 'crumb-sep', text: '/' }), btn);
      }
    }

    function renderGrid() {
      grid.innerHTML = '';
      main.dataset.drop = path === '/Trash' ? '' : path;
      let entries = [];
      try { entries = fs.list(path); }
      catch { entries = []; }
      const q = filter.trim().toLowerCase();
      if (q) entries = entries.filter((entry) => entry.name.toLowerCase().includes(q));
      if (!entries.length) {
        grid.append(el('div', { class: 'empty', text: path === '/Trash' ? 'Trash is empty' : 'This folder is empty' }));
      }
      for (const entry of entries) {
        const item = el('button', { class: `file-item${selected.has(entry.path) ? ' selected' : ''}${env.clip.state.mode === 'cut' && env.clip.state.paths.includes(entry.path) ? ' cut' : ''}`, type: 'button' });
        if (entry.kind === 'dir' && entry.path !== '/Trash') item.dataset.drop = entry.path;
        item.innerHTML = `<span class="file-glyph">${icon(entry.kind === 'dir' ? 'folder' : 'file', 28)}</span>`;
        const meta = el('span', { class: 'file-meta' });
        meta.append(el('span', { class: 'file-name', text: entry.name }));
        meta.append(el('span', { class: 'muted', text: entry.kind === 'dir' ? 'Folder' : formatBytes(entry.size) }));
        item.append(meta);
        item.addEventListener('click', (event) => {
          if (item.dataset.dragged) {
            delete item.dataset.dragged;
            return;
          }
          if (event.shiftKey || event.metaKey || event.ctrlKey) {
            if (selected.has(entry.path)) selected.delete(entry.path);
            else selected.add(entry.path);
          } else {
            selected.clear();
            selected.add(entry.path);
          }
          renderGrid();
          renderStatus();
        });
        item.addEventListener('dblclick', () => openEntry(entry));
        item.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!selected.has(entry.path)) {
            selected.clear();
            selected.add(entry.path);
            renderGrid();
          }
          const inTrash = path === '/Trash' || entry.path.startsWith('/Trash/');
          const apps = entry.kind === 'file' ? appsForFile(entry.name) : [];
          env.menus.show(event.clientX, event.clientY, [
            { label: 'Open', icon: 'external', action: () => openEntry(entry) },
            ...apps.slice(1).map((appId) => ({
              label: `Open with ${env.appName(appId)}`,
              icon: 'grid',
              action: () => openEntry(entry, appId),
            })),
            { sep: true },
            { label: 'Download', icon: 'download', hidden: entry.kind !== 'file', action: () => downloadEntry(fs, entry.path) },
            { label: 'Rename', icon: 'pencil', action: () => rename(entry) },
            { sep: true },
            { label: 'Cut', icon: 'cut', action: () => env.clip.cut([...selected]) },
            { label: 'Copy', icon: 'copy', action: () => env.clip.copy([...selected]) },
            { sep: true },
            inTrash
              ? { label: 'Restore', icon: 'undo', action: () => { try { fs.restore(entry.path); } catch (error) { env.notify({ title: 'Restore failed', body: error.message, app: 'files' }); } } }
              : { label: 'Move to Trash', icon: 'trash', danger: true, action: () => removeSelected(false) },
            { label: 'Delete permanently', icon: 'x', danger: true, hidden: !inTrash, action: () => removeSelected(true) },
            { sep: true },
            { label: 'Properties', icon: 'info', action: () => env.dialogs.alert({ title: entry.name, message: `${entry.kind === 'dir' ? 'Folder' : entry.mime}\n${formatBytes(entry.size)}\nModified ${formatFull(entry.modified)}\n${entry.path}${entry.trashedFrom ? `\nOriginal ${entry.trashedFrom}` : ''}` }) },
          ]);
        });
        item.addEventListener('pointerdown', (event) => startDrag(event, item, entry));
        grid.append(item);
      }
      if (path === '/Trash' && fs.list('/Trash').length) {
        const empty = el('button', { class: 'btn btn-danger trash-empty', type: 'button', text: 'Empty Trash' });
        empty.addEventListener('click', async () => {
          const ok = await env.dialogs.confirm({ title: 'Empty Trash?', message: 'This permanently deletes everything in Trash.', ok: 'Empty Trash', danger: true });
          if (ok) fs.emptyTrash();
        });
        grid.append(empty);
      }
    }

    function startDrag(event, item, entry) {
      if (event.button !== 0) return;
      const sx = event.clientX;
      const sy = event.clientY;
      let dragging = false;
      let ghost = null;
      const paths = () => (selected.has(entry.path) ? [...selected] : [entry.path]);
      const move = (ev) => {
        if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
        if (!dragging) {
          dragging = true;
          item.dataset.dragged = '1';
          ghost = el('div', { class: 'drag-ghost', text: paths().length > 1 ? `${paths().length} items` : entry.name });
          document.body.append(ghost);
        }
        ghost.style.left = `${ev.clientX + 14}px`;
        ghost.style.top = `${ev.clientY + 14}px`;
        highlight(ev);
      };
      const up = (ev) => {
        item.removeEventListener('pointermove', move);
        ghost?.remove();
        clearHot();
        if (!dragging) return;
        const under = document.elementFromPoint(ev.clientX, ev.clientY);
        const zone = under?.closest('[data-drop]');
        const dest = zone?.dataset.drop;
        const winEl = under?.closest('.window');
        if (!dest && winEl?.dataset.app) {
          paths().filter((itemPath) => fs.exists(itemPath) && fs.stat(itemPath).kind === 'file').forEach((itemPath) => env.openApp(winEl.dataset.app, { path: itemPath }));
          return;
        }
        if (!dest) return;
        try {
          if (dest === 'trash') paths().forEach((itemPath) => fs.remove(itemPath, { recursive: true }));
          else env.clip.drop(paths(), dest);
        } catch (error) {
          env.notify({ title: 'Could not move', body: error.message, app: 'files' });
        }
      };
      item.setPointerCapture?.(event.pointerId);
      item.addEventListener('pointermove', move);
      item.addEventListener('pointerup', up, { once: true });
      item.addEventListener('pointercancel', up, { once: true });
    }

    function highlight(event) {
      clearHot();
      const zone = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-drop]');
      zone?.classList.add('drop-hot');
    }
    function clearHot() {
      document.querySelectorAll('.drop-hot').forEach((node) => node.classList.remove('drop-hot'));
    }

    function renderStatus() {
      const entries = fs.exists(path) ? fs.list(path) : [];
      const extra = selected.size ? ` · ${selected.size} selected` : '';
      status.textContent = `${entries.length} item${entries.length === 1 ? '' : 's'}${extra}`;
    }

    function render() {
      win.setTitle(path === '/' ? 'Files' : path.split('/').filter(Boolean).pop());
      renderSide();
      renderCrumbs();
      renderGrid();
      renderStatus();
    }

    backBtn.addEventListener('click', () => {
      const prev = history.pop();
      if (!prev) return;
      future.push(path);
      path = prev;
      selected.clear();
      render();
    });
    fwdBtn.addEventListener('click', () => {
      const next = future.pop();
      if (!next) return;
      history.push(path);
      path = next;
      selected.clear();
      render();
    });
    upBtn.addEventListener('click', () => {
      if (path === '/') return;
      go(path.split('/').slice(0, -1).join('/') || '/');
    });
    search.addEventListener('input', () => { filter = search.value; renderGrid(); });
    newBtn.addEventListener('click', async () => {
      const name = await env.dialogs.prompt({ title: 'New folder', value: 'Untitled folder', ok: 'Create' });
      if (!name) return;
      try { fs.mkdir(`${path === '/' ? '' : path}/${name}`); }
      catch (error) { env.notify({ title: 'Could not create folder', body: error.message, app: 'files' }); }
    });
    fileBtn.addEventListener('click', async () => {
      const name = await env.dialogs.prompt({ title: 'New text file', value: 'Untitled.txt', ok: 'Create' });
      if (!name) return;
      try {
        const target = `${path === '/' ? '' : path}/${name}`;
        fs.write(target, '');
        env.openPath(target);
      } catch (error) { env.notify({ title: 'Could not create file', body: error.message, app: 'files' }); }
    });
    uploadBtn.addEventListener('click', () => upload.click());
    upload.addEventListener('change', async () => {
      if (!upload.files?.length) return;
      const saved = await importFiles(fs, upload.files, path);
      upload.value = '';
      env.notify({ title: 'Uploaded', body: `${saved.length} file${saved.length === 1 ? '' : 's'} added`, app: 'files' });
    });

    main.addEventListener('dragover', (event) => {
      if ([...event.dataTransfer.types].includes('Files')) event.preventDefault();
    });
    main.addEventListener('drop', async (event) => {
      if (!event.dataTransfer.files?.length) return;
      event.preventDefault();
      const saved = await importFiles(fs, event.dataTransfer.files, path);
      env.notify({ title: 'Imported', body: `${saved.length} file${saved.length === 1 ? '' : 's'}`, app: 'files' });
    });
    main.addEventListener('contextmenu', (event) => {
      if (event.target.closest('.file-item')) return;
      event.preventDefault();
      env.menus.show(event.clientX, event.clientY, [
        { label: 'New folder', icon: 'folder-plus', action: () => newBtn.click() },
        { label: 'New text file', icon: 'file-plus', action: () => fileBtn.click() },
        { label: 'Upload…', icon: 'upload', action: () => upload.click() },
        { sep: true },
        { label: 'Paste', icon: 'paste', disabled: !env.clip.state.paths.length, action: () => env.clip.paste(path) },
        { sep: true },
        { label: 'Open Terminal here', icon: 'terminal', action: () => env.openApp('terminal', { cwd: path }) },
      ]);
    });
    win.el.addEventListener('keydown', (event) => {
      const typing = event.target.matches('input, textarea');
      if (typing) return;
      if (event.key === 'Backspace') { event.preventDefault(); upBtn.click(); }
      if (event.key === 'Delete') removeSelected(path === '/Trash');
      if (event.key === 'Enter' && selected.size === 1) {
        const only = [...selected][0];
        const entry = fs.list(path).find((item) => item.path === only);
        if (entry) openEntry(entry);
      }
      if (event.key === 'F2' && selected.size === 1) {
        const only = fs.list(path).find((item) => item.path === [...selected][0]);
        if (only) rename(only);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') env.clip.copy([...selected]);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'x') env.clip.cut([...selected]);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v') env.clip.paste(path);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
        selected.clear();
        fs.list(path).forEach((entry) => selected.add(entry.path));
        renderGrid();
        renderStatus();
      }
    });

    const off = env.bus.on('fs-change', () => {
      if (!fs.exists(path)) path = '/Home';
      const live = new Set((fs.exists(path) ? fs.list(path) : []).map((entry) => entry.path));
      for (const item of [...selected]) if (!live.has(item)) selected.delete(item);
      render();
    });
    win.onClose(off);
    render();
  },
};
