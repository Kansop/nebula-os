/** Document viewer for PDFs and saved HTML/text files. */

import { dataUrlToBlob, el } from '../core/util.js';

export const docsApp = {
  id: 'docs',
  name: 'Documents',
  blurb: 'Read PDFs and saved pages',
  category: 'productivity',
  width: 860,
  height: 680,
  launch(env) {
    const root = el('div', { class: 'docs' });
    const bar = el('div', { class: 'toolbar' });
    const open = el('button', { class: 'btn btn-sm', type: 'button', text: 'Open' });
    const label = el('span', { class: 'grow muted', text: 'No document' });
    bar.append(open, label);
    const stage = el('div', { class: 'docs-stage' });
    root.append(bar, stage);
    env.win.body.append(root);
    let url = '';

    function show(path) {
      if (url) URL.revokeObjectURL(url);
      url = '';
      stage.innerHTML = '';
      label.textContent = path.split('/').pop();
      env.win.setTitle(label.textContent);
      const content = String(env.fs.read(path));
      const lower = path.toLowerCase();
      if (lower.endsWith('.pdf') || content.startsWith('data:application/pdf')) {
        const blob = content.startsWith('data:') ? dataUrlToBlob(content) : new Blob([content], { type: 'application/pdf' });
        url = URL.createObjectURL(blob);
        const frame = el('iframe', { class: 'docs-frame', title: label.textContent, src: url });
        stage.append(frame);
        stage.append(el('p', { class: 'muted docs-note', text: 'PDFs open with the browser’s built-in viewer.' }));
        return;
      }
      if (lower.endsWith('.html') || lower.endsWith('.ndoc')) {
        const page = el('article', { class: 'docs-html' });
        page.innerHTML = content;
        stage.append(page);
        return;
      }
      stage.append(el('pre', { class: 'docs-text', text: content }));
    }
    open.addEventListener('click', async () => {
      const path = await env.files.open({ title: 'Open a document', start: '/Home/Documents' });
      if (path) show(path);
    });
    env.win.onClose(() => { if (url) URL.revokeObjectURL(url); });
    if (env.params.path && env.fs.exists(env.params.path)) show(env.params.path);
    else stage.append(el('div', { class: 'empty', text: 'Open a PDF, HTML document, or text file.' }));
  },
};
