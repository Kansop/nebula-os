/** Notes are markdown files in Home/Notes, so other apps can open them too. */

import { icon } from '../core/icons.js';
import { el } from '../core/util.js';

const DIR = '/Home/Notes';

export const notesApp = {
  id: 'notes',
  name: 'Notes',
  blurb: 'Notes stored as real files',
  category: 'productivity',
  width: 860,
  height: 560,
  launch(env) {
    env.fs.mkdir(DIR, { parents: true });
    let current = env.params.path && env.params.path.startsWith(DIR) ? env.params.path : null;
    let timer = null;
    const root = el('div', { class: 'notes' });
    const side = el('div', { class: 'side' });
    const head = el('div', { class: 'side-head' });
    const search = el('input', { class: 'field field-sm', placeholder: 'Search notes', 'aria-label': 'Search notes' });
    const add = el('button', { class: 'iconbtn', type: 'button', title: 'New note', html: icon('plus', 16) });
    head.append(search, add);
    const list = el('div', { class: 'note-list' });
    side.append(head, list);
    const main = el('div', { class: 'note-main' });
    const title = el('input', { class: 'note-title', 'aria-label': 'Title' });
    const body = el('textarea', { class: 'note-body', placeholder: 'Start writing…', 'aria-label': 'Note' });
    main.append(title, body);
    root.append(side, main);
    env.win.body.append(root);

    function entries() {
      return env.fs.list(DIR).filter((entry) => entry.kind === 'file');
    }
    function renderListOnly() {
      const q = search.value.trim().toLowerCase();
      list.innerHTML = '';
      const notes = entries().filter((entry) => {
        if (!q) return true;
        return entry.name.toLowerCase().includes(q) || String(env.fs.read(entry.path)).toLowerCase().includes(q);
      });
      if (!current && notes[0]) current = notes[0].path;
      if (!notes.length) list.append(el('div', { class: 'empty', text: 'No notes yet' }));
      for (const note of notes) {
        const btn = el('button', { class: `note-item${note.path === current ? ' active' : ''}`, type: 'button' });
        const text = String(env.fs.read(note.path));
        btn.append(el('strong', { text: note.name.replace(/\.md$/i, '') }));
        btn.append(el('span', { text: text.replace(/\s+/g, ' ').slice(0, 80) || 'Empty note' }));
        btn.addEventListener('click', () => { current = note.path; load(); render(); });
        list.append(btn);
      }
    }
    function render() {
      renderListOnly();
      load();
    }
    function load() {
      if (!current || !env.fs.exists(current)) {
        title.value = '';
        body.value = '';
        return;
      }
      title.value = current.split('/').pop().replace(/\.md$/i, '');
      body.value = String(env.fs.read(current));
      env.win.setTitle(title.value || 'Notes');
    }
    function save() {
      if (!current) return;
      const name = `${(title.value.trim() || 'Untitled').replace(/[\\/]/g, '-')}.md`;
      const next = `${DIR}/${name}`;
      const text = body.value;
      if (next !== current && env.fs.exists(next)) {
        env.notify({ title: 'Name in use', body: name, app: 'notes' });
        return;
      }
      env.fs.write(current, text, 'text/markdown');
      if (next !== current) {
        env.fs.move(current, next);
        current = next;
      }
      env.win.setTitle(title.value || 'Notes');
    }
    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(save, 350);
    }
    add.addEventListener('click', () => {
      let name = 'Untitled.md';
      let i = 2;
      while (env.fs.exists(`${DIR}/${name}`)) name = `Untitled ${i++}.md`;
      const path = `${DIR}/${name}`;
      env.fs.write(path, '', 'text/markdown');
      current = path;
      render();
      title.focus();
      title.select();
    });
    search.addEventListener('input', render);
    title.addEventListener('input', schedule);
    body.addEventListener('input', schedule);
    body.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        save();
      }
    });
    const off = env.bus.on('fs-change', () => {
      if (current && !env.fs.exists(current)) current = null;
      const editing = document.activeElement === body || document.activeElement === title;
      if (!editing) render();
      else renderListOnly();
    });
    env.win.onClose(() => { clearTimeout(timer); off(); });
    render();
  },
};
