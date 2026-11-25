/** Markdown editor with a live preview of the same file. */

import { renderMarkdown } from '../core/markdown.js';
import { el } from '../core/util.js';

export const markdownApp = {
  id: 'markdown',
  name: 'Markdown',
  blurb: 'Write on the left, read on the right',
  category: 'productivity',
  width: 920,
  height: 640,
  launch(env) {
    let path = env.params.path || '';
    const root = el('div', { class: 'markdown' });
    const bar = el('div', { class: 'toolbar' });
    const open = el('button', { class: 'btn btn-sm', type: 'button', text: 'Open' });
    const save = el('button', { class: 'btn btn-sm btn-primary', type: 'button', text: 'Save' });
    const label = el('span', { class: 'grow muted', text: 'Untitled.md' });
    bar.append(open, save, label);
    const editor = el('textarea', { class: 'md-editor', 'aria-label': 'Markdown', spellcheck: 'false' });
    const preview = el('article', { class: 'md-preview' });
    root.append(bar, el('div', { class: 'md-split' }, [editor, preview]));
    env.win.body.append(root);
    editor.value = '# Hello\n\nWrite **Markdown**. The preview updates as you type.\n';
    const paint = () => { preview.innerHTML = renderMarkdown(editor.value); };
    editor.addEventListener('input', paint);
    async function saveFile() {
      let file = path;
      if (!file) {
        file = await env.files.save({ title: 'Save Markdown', start: '/Home/Notes', name: 'Note.md' });
        if (!file) return;
        if (!file.endsWith('.md')) file += '.md';
      }
      env.fs.write(file, editor.value, 'text/markdown');
      path = file;
      label.textContent = file.split('/').pop();
      env.win.setTitle(label.textContent);
      env.notify({ title: 'Markdown saved', body: label.textContent, app: 'markdown' });
    }
    open.addEventListener('click', async () => {
      const file = await env.files.open({ title: 'Open Markdown', start: '/Home/Notes', filter: (entry) => entry.name.endsWith('.md') });
      if (!file) return;
      path = file;
      editor.value = String(env.fs.read(file));
      label.textContent = file.split('/').pop();
      paint();
    });
    save.addEventListener('click', saveFile);
    const off = env.bus.on('save', (id) => { if (id === env.win.id) saveFile(); });
    env.win.onClose(off);
    if (path && env.fs.exists(path)) {
      editor.value = String(env.fs.read(path));
      label.textContent = path.split('/').pop();
    }
    paint();
  },
};
