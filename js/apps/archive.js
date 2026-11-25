/** Zip and unzip files on the virtual disk. Archives use the stored ZIP method. */

import { el, guessMime } from '../core/util.js';
import { bytesToText, unzipStore, zipStore } from '../core/zip.js';

export const archiveApp = {
  id: 'archive',
  name: 'Archive',
  blurb: 'Zip and unzip on the disk',
  category: 'system',
  width: 720,
  height: 560,
  launch(env) {
    const root = el('div', { class: 'archive' });
    const bar = el('div', { class: 'toolbar' });
    const zipBtn = el('button', { class: 'btn btn-sm btn-primary', type: 'button', text: 'Zip a folder' });
    const openBtn = el('button', { class: 'btn btn-sm', type: 'button', text: 'Open archive' });
    bar.append(zipBtn, openBtn);
    const info = el('div', { class: 'archive-list' });
    root.append(bar, info);
    env.win.body.append(root);
    info.append(el('p', { text: 'Zip files are standard stored archives. Other computers can open them, and NebulaOS can unpack them back onto the disk.' }));

    zipBtn.addEventListener('click', async () => {
      const folder = await env.files.open({ title: 'Choose a folder to zip', start: '/Home' });
      if (!folder) return;
      const stat = env.fs.stat(folder);
      const base = stat.kind === 'dir' ? folder : folder.slice(0, folder.lastIndexOf('/')) || '/';
      const files = [];
      const walk = (dir, prefix) => {
        for (const entry of env.fs.list(dir)) {
          const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.kind === 'dir') walk(entry.path, rel);
          else files.push({ name: rel, data: fileBytes(env.fs.read(entry.path)) });
        }
      };
      if (stat.kind === 'dir') walk(folder, '');
      else files.push({ name: stat.name, data: fileBytes(env.fs.read(folder)) });
      if (!files.length) {
        env.notify({ title: 'Nothing to zip', body: 'That folder has no files.', app: 'archive' });
        return;
      }
      const bytes = zipStore(files);
      const target = await env.files.save({ title: 'Save archive', start: '/Home/Documents', name: `${stat.name || 'archive'}.zip` });
      if (!target) return;
      const path = target.endsWith('.zip') ? target : `${target}.zip`;
      env.fs.write(path, bytesToDataUrl(bytes, 'application/zip'), 'application/zip');
      env.notify({ title: 'Archive saved', body: path.split('/').pop(), app: 'archive' });
      show(env, path, info);
    });
    openBtn.addEventListener('click', async () => {
      const path = await env.files.open({ title: 'Open zip', start: '/Home/Documents', filter: (entry) => entry.name.endsWith('.zip') });
      if (path) show(env, path, info);
    });
    if (env.params.path) show(env, env.params.path, info);
  },
};

function show(env, path, info) {
  info.innerHTML = '';
  let files = [];
  try { files = unzipStore(dataUrlToBytes(String(env.fs.read(path)))); }
  catch (error) {
    info.append(el('p', { text: error.message }));
    return;
  }
  info.append(el('h3', { text: path.split('/').pop() }));
  for (const file of files) info.append(el('div', { class: 'archive-row', text: `${file.name} · ${file.data.length} bytes` }));
  const extract = el('button', { class: 'btn btn-primary', type: 'button', text: 'Extract here' });
  extract.addEventListener('click', async () => {
    const dest = await env.files.save({ title: 'Extract into folder', start: '/Home/Documents', name: 'extracted' });
    if (!dest) return;
    const folder = dest.replace(/\.zip$/i, '') || dest;
    env.fs.mkdir(folder, { parents: true });
    for (const file of files) {
      const pieces = file.name.split('/').filter(Boolean);
      const filename = pieces.pop();
      let dir = folder;
      for (const piece of pieces) {
        dir = `${dir}/${piece}`;
        if (!env.fs.exists(dir)) env.fs.mkdir(dir);
      }
      const text = looksText(file.data) ? bytesToText(file.data) : bytesToDataUrl(file.data, guessMime(filename));
      env.fs.write(`${dir}/${filename}`, text, guessMime(filename));
    }
    env.notify({ title: 'Extracted', body: `${files.length} files`, app: 'archive' });
    env.openApp('files', { path: folder });
  });
  info.append(extract);
}

function fileBytes(content) {
  const text = String(content ?? '');
  if (text.startsWith('data:')) return dataUrlToBytes(text);
  return new TextEncoder().encode(text);
}

function dataUrlToBytes(url) {
  const body = String(url).split(',')[1] || '';
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToDataUrl(bytes, mime) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return `data:${mime};base64,${btoa(binary)}`;
}

function looksText(bytes) {
  if (bytes.includes(0)) return false;
  try {
    bytesToText(bytes);
    return true;
  } catch {
    return false;
  }
}
