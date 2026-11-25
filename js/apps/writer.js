/** Word processor: rich text, headings, lists, HTML download, and print-to-PDF. */

import { el } from '../core/util.js';

export const writerApp = {
  id: 'writer',
  name: 'Writer',
  blurb: 'Rich text, HTML, and print',
  category: 'productivity',
  width: 860,
  height: 680,
  launch(env) {
    let path = env.params.path || '';
    const root = el('div', { class: 'writer' });
    const bar = el('div', { class: 'toolbar' });
    const tools = [
      ['strong', 'Bold'],
      ['em', 'Italic'],
      ['u', 'Underline'],
      ['h1', 'Heading'],
      ['h2', 'Subhead'],
      ['p', 'Body'],
    ];
    for (const [tag, label] of tools) {
      const btn = el('button', { class: 'btn btn-sm', type: 'button', text: label });
      btn.addEventListener('mousedown', (event) => event.preventDefault());
      btn.addEventListener('click', () => wrapSelection(tag));
      bar.append(btn);
    }
    const listBtn = el('button', { class: 'btn btn-sm', type: 'button', text: 'List' });
    listBtn.addEventListener('mousedown', (event) => event.preventDefault());
    listBtn.addEventListener('click', () => insertHtml('<ul><li>Item</li></ul>'));
    bar.append(listBtn);
    const htmlBtn = el('button', { class: 'btn btn-sm', type: 'button', text: 'Export HTML' });
    const printBtn = el('button', { class: 'btn btn-sm', type: 'button', text: 'Print / PDF' });
    const saveBtn = el('button', { class: 'btn btn-sm btn-primary', type: 'button', text: 'Save' });
    bar.append(htmlBtn, printBtn, saveBtn);
    const page = el('div', { class: 'writer-page', contenteditable: 'true', role: 'textbox', 'aria-label': 'Document' });
    page.innerHTML = '<h1>Untitled</h1><p>Start writing.</p>';
    root.append(bar, page);
    env.win.body.append(root);

    function load(file) {
      path = file;
      page.innerHTML = String(env.fs.read(file));
      env.win.setTitle(file.split('/').pop());
    }
    async function save() {
      let file = path;
      if (!file) {
        file = await env.files.save({ title: 'Save document', start: '/Home/Documents', name: 'Letter.ndoc' });
        if (!file) return;
        if (!/\.ndoc$|\.html$/i.test(file)) file += '.ndoc';
      }
      env.fs.write(file, page.innerHTML, 'text/html');
      path = file;
      env.win.setTitle(file.split('/').pop());
      env.notify({ title: 'Document saved', body: file.split('/').pop(), app: 'writer' });
    }
    htmlBtn.addEventListener('click', () => {
      const blob = new Blob([page.innerHTML], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'document.html';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    printBtn.addEventListener('click', () => printHtml(page.innerHTML, env.win.el.getAttribute('aria-label') || 'Document'));
    saveBtn.addEventListener('click', save);
    const off = env.bus.on('save', (id) => { if (id === env.win.id) save(); });
    env.win.onClose(off);
    if (path && env.fs.exists(path)) load(path);
  },
};

function wrapSelection(tag) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  const node = document.createElement(tag);
  node.append(range.extractContents());
  if (!node.textContent) node.textContent = tag === 'p' ? 'Paragraph' : 'Text';
  range.insertNode(node);
}

function insertHtml(html) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const holder = document.createElement('div');
  holder.innerHTML = html;
  const node = holder.firstElementChild;
  range.insertNode(node);
}

function printHtml(html, title) {
  const frame = document.createElement('iframe');
  frame.className = 'print-frame';
  document.body.append(frame);
  const doc = frame.contentDocument;
  doc.open();
  doc.write(`<!doctype html><html><head><title>${title}</title><style>body{font:16px Georgia,serif;margin:2cm;color:#111}h1{font-weight:600}</style></head><body>${html}</body></html>`);
  doc.close();
  frame.contentWindow.focus();
  frame.contentWindow.print();
  setTimeout(() => frame.remove(), 800);
}
