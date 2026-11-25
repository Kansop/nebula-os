/** Open and save dialogs that browse the virtual disk. */

import { el } from './util.js';
import { icon } from './icons.js';

export function createFileDialogs(fs) {
  function browse({ title, start = '/Home', mode = 'open', name = '', filter }) {
    return new Promise((resolve) => {
      let path = fs.exists(start) && fs.stat(start).kind === 'dir' ? start : '/Home';
      const back = el('div', { class: 'dialog-back' });
      const dialog = el('div', { class: 'dialog dialog-wide', role: 'dialog', 'aria-modal': 'true' });
      const crumbs = el('div', { class: 'crumbs' });
      const list = el('div', { class: 'picker-list' });
      const nameInput = el('input', { class: 'field', value: name, placeholder: 'File name', 'aria-label': 'File name' });
      const finish = (value) => {
        back.remove();
        document.removeEventListener('keydown', onKey);
        resolve(value);
      };
      const onKey = (event) => {
        if (event.key === 'Escape') finish(null);
      };

      function render() {
        crumbs.innerHTML = '';
        const parts = path.split('/').filter(Boolean);
        const rootBtn = el('button', { class: 'crumb', type: 'button', text: 'Disk' });
        rootBtn.addEventListener('click', () => { path = '/'; render(); });
        crumbs.append(rootBtn);
        let built = '';
        for (const part of parts) {
          built += `/${part}`;
          const target = built;
          const btn = el('button', { class: 'crumb', type: 'button', text: part });
          btn.addEventListener('click', () => { path = target; render(); });
          crumbs.append(el('span', { class: 'crumb-sep', text: '/' }), btn);
        }
        list.innerHTML = '';
        const entries = fs.list(path).filter((entry) => entry.kind === 'dir' || !filter || filter(entry));
        if (!entries.length) list.append(el('div', { class: 'empty', text: 'This folder is empty' }));
        for (const entry of entries) {
          const row = el('button', { class: 'picker-row', type: 'button' });
          row.innerHTML = icon(entry.kind === 'dir' ? 'folder' : 'file', 18);
          row.append(el('span', { text: entry.name }));
          row.addEventListener('click', () => {
            if (entry.kind === 'dir') {
              path = entry.path;
              render();
              return;
            }
            nameInput.value = entry.name;
            if (mode === 'open') finish(entry.path);
          });
          row.addEventListener('dblclick', () => {
            if (entry.kind === 'file' && mode === 'open') finish(entry.path);
          });
          list.append(row);
        }
      }

      const actions = el('div', { class: 'dialog-actions' });
      const cancel = el('button', { class: 'btn', type: 'button', text: 'Cancel' });
      const ok = el('button', { class: 'btn btn-primary', type: 'button', text: mode === 'save' ? 'Save' : 'Open' });
      cancel.addEventListener('click', () => finish(null));
      ok.addEventListener('click', () => {
        if (mode === 'open') {
          const candidate = `${path === '/' ? '' : path}/${nameInput.value}`.replace(/\/+/g, '/');
          if (nameInput.value && fs.exists(candidate) && fs.stat(candidate).kind === 'file') finish(candidate);
          return;
        }
        const filename = nameInput.value.trim();
        if (!filename) return;
        finish(`${path === '/' ? '' : path}/${filename}`.replace(/\/+/g, '/'));
      });
      actions.append(cancel, ok);
      dialog.append(
        el('h2', { class: 'dialog-title', text: title }),
        crumbs,
        list,
        el('label', { class: 'field-label', text: 'Name' }),
        nameInput,
        actions,
      );
      back.append(dialog);
      document.body.append(back);
      document.addEventListener('keydown', onKey);
      back.addEventListener('pointerdown', (event) => { if (event.target === back) finish(null); });
      render();
      nameInput.focus();
    });
  }

  return {
    open: (opts) => browse({ ...opts, mode: 'open' }),
    save: (opts) => browse({ ...opts, mode: 'save' }),
  };
}
