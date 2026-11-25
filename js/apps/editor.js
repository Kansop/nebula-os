/** Text editor with tabs, find and replace, and files on the virtual disk. */

import { icon } from '../core/icons.js';
import { basename, el } from '../core/util.js';

export const editorApp = {
  id: 'editor',
  name: 'Text Editor',
  blurb: 'Tabs, find, and replace',
  category: 'productivity',
  width: 840,
  height: 580,
  launch(env) { mountEditor(env, { highlight: false, run: false }); },
};

export function mountEditor(env, { highlight, run }) {
  const tabs = [];
  let index = 0;
  const root = el('div', { class: highlight ? 'codeed' : 'editor' });
  const tabbar = el('div', { class: 'tabs' });
  const findbar = el('div', { class: 'findbar hidden' });
  const findInput = el('input', { class: 'field field-sm', placeholder: 'Find', 'aria-label': 'Find' });
  const replaceInput = el('input', { class: 'field field-sm', placeholder: 'Replace', 'aria-label': 'Replace' });
  const caseBtn = el('button', { class: 'btn btn-sm', type: 'button', text: 'Aa', title: 'Match case' });
  let matchCase = false;
  caseBtn.addEventListener('click', () => {
    matchCase = !matchCase;
    caseBtn.classList.toggle('active', matchCase);
  });
  const nextBtn = el('button', { class: 'btn btn-sm', type: 'button', text: 'Next' });
  const prevBtn = el('button', { class: 'btn btn-sm', type: 'button', text: 'Prev' });
  const repBtn = el('button', { class: 'btn btn-sm', type: 'button', text: 'Replace' });
  const allBtn = el('button', { class: 'btn btn-sm', type: 'button', text: 'All' });
  findbar.append(findInput, replaceInput, caseBtn, prevBtn, nextBtn, repBtn, allBtn);

  const stage = el('div', { class: 'edit-stage' });
  const gutter = el('div', { class: 'gutter', 'aria-hidden': 'true' });
  const highlightLayer = highlight ? el('pre', { class: 'hl', 'aria-hidden': 'true' }) : null;
  const area = el('textarea', { class: 'edit-area', spellcheck: 'false', 'aria-label': 'Editor' });
  stage.append(gutter);
  if (highlightLayer) stage.append(highlightLayer);
  stage.append(area);

  const consoleBox = run ? el('div', { class: 'console' }) : null;
  const toolbar = el('div', { class: 'toolbar' });
  const openBtn = el('button', { class: 'btn btn-sm', type: 'button', html: `${icon('folder', 14)} Open` });
  const saveBtn = el('button', { class: 'btn btn-sm btn-primary', type: 'button', html: `${icon('save', 14)} Save` });
  const findBtn = el('button', { class: 'btn btn-sm', type: 'button', text: 'Find' });
  const runBtn = run ? el('button', { class: 'btn btn-sm', type: 'button', html: `${icon('play', 14)} Run` }) : null;
  toolbar.append(openBtn, saveBtn, findBtn);
  if (runBtn) toolbar.append(runBtn);
  root.append(toolbar, tabbar, findbar, stage);
  if (consoleBox) root.append(consoleBox);
  env.win.body.append(root);

  function current() { return tabs[index]; }

  function addTab(tab) {
    tabs.push(tab);
    index = tabs.length - 1;
    renderTabs();
    load();
  }

  function blank() {
    addTab({ name: 'Untitled', path: null, text: '', saved: '' });
  }

  function openPath(path) {
    const existing = tabs.findIndex((tab) => tab.path === path);
    if (existing >= 0) {
      index = existing;
      renderTabs();
      load();
      return;
    }
    let text = '';
    try {
      const content = env.fs.read(path);
      if (String(content).startsWith('data:')) {
        env.notify({ title: 'Binary file', body: 'Open images in Viewer or Paint.', app: highlight ? 'code' : 'editor' });
        return;
      }
      text = String(content);
    } catch (error) {
      env.notify({ title: 'Could not open', body: error.message, app: highlight ? 'code' : 'editor' });
      return;
    }
    addTab({ name: basename(path), path, text, saved: text });
  }

  function renderTabs() {
    tabbar.innerHTML = '';
    tabs.forEach((tab, i) => {
      const btn = el('button', { class: `tab${i === index ? ' active' : ''}`, type: 'button' });
      btn.append(el('span', { text: tab.name }));
      if (tab.text !== tab.saved) btn.append(el('i', { class: 'dirty' }));
      const close = el('span', { class: 'tab-x', html: icon('x', 12), title: 'Close tab' });
      close.addEventListener('click', (event) => {
        event.stopPropagation();
        closeTab(i);
      });
      btn.append(close);
      btn.addEventListener('click', () => { capture(); index = i; renderTabs(); load(); });
      tabbar.append(btn);
    });
    const plus = el('button', { class: 'tab-add iconbtn', type: 'button', title: 'New tab', html: icon('plus', 16) });
    plus.addEventListener('click', () => { capture(); blank(); });
    tabbar.append(plus);
    const tab = current();
    env.win.setTitle(tab ? `${tab.name}${tab.text !== tab.saved ? ' •' : ''}` : (highlight ? 'Code' : 'Text Editor'));
  }

  async function closeTab(i) {
    const tab = tabs[i];
    if (tab && tab.text !== tab.saved) {
      const ok = await env.dialogs.confirm({ title: `Close ${tab.name}?`, message: 'Unsaved changes will be lost.', ok: 'Close', danger: true });
      if (!ok) return;
    }
    tabs.splice(i, 1);
    if (!tabs.length) blank();
    index = Math.max(0, Math.min(index, tabs.length - 1));
    renderTabs();
    load();
  }

  function capture() {
    const tab = current();
    if (tab) tab.text = area.value;
  }

  function load() {
    const tab = current();
    area.value = tab?.text || '';
    paint();
  }

  function paint() {
    const lines = area.value.split('\n').length;
    gutter.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
    if (highlightLayer) {
      highlightLayer.innerHTML = env.highlight(area.value);
      highlightLayer.scrollTop = area.scrollTop;
      highlightLayer.scrollLeft = area.scrollLeft;
    }
  }

  async function save() {
    capture();
    const tab = current();
    if (!tab) return;
    let path = tab.path;
    if (!path) {
      path = await env.files.save({
        title: 'Save file',
        start: highlight ? '/Home/Code' : '/Home/Documents',
        name: tab.name.includes('.') ? tab.name : `${tab.name}.txt`,
      });
      if (!path) return;
    }
    try {
      env.fs.write(path, tab.text);
      tab.path = path;
      tab.name = basename(path);
      tab.saved = tab.text;
      renderTabs();
      env.notify({ title: 'Saved', body: tab.name, app: highlight ? 'code' : 'editor' });
    } catch (error) {
      env.notify({ title: 'Save failed', body: error.message, app: highlight ? 'code' : 'editor' });
    }
  }

  function seek(dir) {
    const tab = current();
    const q = findInput.value;
    if (!tab || !q) return false;
    const source = area.value;
    const hay = matchCase ? source : source.toLowerCase();
    const needle = matchCase ? q : q.toLowerCase();
    let from = dir < 0 ? area.selectionStart - 1 : area.selectionEnd;
    let at = dir < 0 ? hay.lastIndexOf(needle, Math.max(0, from)) : hay.indexOf(needle, from);
    if (at < 0) at = dir < 0 ? hay.lastIndexOf(needle) : hay.indexOf(needle);
    if (at < 0) return false;
    area.focus();
    area.setSelectionRange(at, at + needle.length);
    return true;
  }

  function replaceOne() {
    const q = findInput.value;
    if (!q) return;
    const selected = area.value.slice(area.selectionStart, area.selectionEnd);
    const same = matchCase ? selected === q : selected.toLowerCase() === q.toLowerCase();
    if (!same) {
      seek(1);
      return;
    }
    const next = area.value.slice(0, area.selectionStart) + replaceInput.value + area.value.slice(area.selectionEnd);
    area.value = next;
    capture();
    renderTabs();
    paint();
    seek(1);
  }

  function replaceAll() {
    const q = findInput.value;
    if (!q) return;
    const flags = matchCase ? 'g' : 'gi';
    const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    area.value = area.value.replace(pattern, replaceInput.value);
    capture();
    renderTabs();
    paint();
  }

  function runCode() {
    capture();
    const logs = [];
    const mirror = {
      log: (...args) => logs.push(['log', args]),
      info: (...args) => logs.push(['info', args]),
      warn: (...args) => logs.push(['warn', args]),
      error: (...args) => logs.push(['error', args]),
    };
    let thrown = null;
    try {
      const fn = new Function('console', `"use strict";\n${area.value}`);
      fn(mirror);
    } catch (error) {
      thrown = error;
    }
    consoleBox.innerHTML = '';
    if (!logs.length && !thrown) consoleBox.append(el('div', { class: 'log muted', text: 'Finished with no console output.' }));
    for (const [level, args] of logs) {
      consoleBox.append(el('div', { class: `log ${level}`, text: args.map(formatArg).join(' ') }));
    }
    if (thrown) consoleBox.append(el('div', { class: 'log error', text: thrown.stack || thrown.message }));
    consoleBox.scrollTop = consoleBox.scrollHeight;
  }

  area.addEventListener('input', () => { capture(); renderTabs(); paint(); });
  area.addEventListener('scroll', paint);
  area.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      const start = area.selectionStart;
      area.value = `${area.value.slice(0, start)}  ${area.value.slice(area.selectionEnd)}`;
      area.selectionStart = area.selectionEnd = start + 2;
      capture();
      paint();
    }
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && run) {
      event.preventDefault();
      runCode();
    }
  });
  findBtn.addEventListener('click', () => {
    findbar.classList.toggle('hidden');
    if (!findbar.classList.contains('hidden')) findInput.focus();
  });
  nextBtn.addEventListener('click', () => seek(1));
  prevBtn.addEventListener('click', () => seek(-1));
  repBtn.addEventListener('click', replaceOne);
  allBtn.addEventListener('click', replaceAll);
  findInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') seek(event.shiftKey ? -1 : 1);
  });
  openBtn.addEventListener('click', async () => {
    const path = await env.files.open({ title: 'Open file', start: highlight ? '/Home/Code' : '/Home/Documents' });
    if (path) openPath(path);
  });
  saveBtn.addEventListener('click', save);
  runBtn?.addEventListener('click', runCode);

  const offSave = env.bus.on('save', (id) => { if (id === env.win.id) save(); });
  const offFind = env.bus.on('find', (id) => {
    if (id !== env.win.id) return;
    findbar.classList.remove('hidden');
    findInput.focus();
  });
  env.win.onClose(() => { offSave(); offFind(); });

  if (env.params.path) openPath(env.params.path);
  else if (highlight && env.fs.exists('/Home/Code/hello.js')) openPath('/Home/Code/hello.js');
  if (!tabs.length) blank();
}

function formatArg(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'undefined') return 'undefined';
  try { return JSON.stringify(value); }
  catch { return String(value); }
}
