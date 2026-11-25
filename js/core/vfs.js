/** In-memory virtual file system. Persistence is applied by the host. */

import { basename, byteSize, dirname, guessMime, joinPath } from './util.js';

export class FSError extends Error {
  constructor(code, path, message) {
    super(message || `${code}: ${path}`);
    this.name = 'FSError';
    this.code = code;
    this.path = path;
  }
}

const PROTECTED = new Set([
  '/',
  '/Home',
  '/Home/Desktop',
  '/Home/Documents',
  '/Home/Pictures',
  '/Home/Notes',
  '/Home/Code',
  '/Home/Music',
  '/Trash',
  '/System',
]);

function stamp() {
  return Date.now();
}

function makeDir(name, children = {}) {
  const now = stamp();
  return { kind: 'dir', name, created: now, modified: now, children };
}

function makeFile(name, content, mime) {
  const now = stamp();
  return {
    kind: 'file',
    name,
    mime: mime || guessMime(name),
    content: content ?? '',
    created: now,
    modified: now,
  };
}

export function seedTree() {
  const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1b1140"/>
      <stop offset="0.5" stop-color="#3a2a86"/>
      <stop offset="1" stop-color="#123e58"/>
    </linearGradient>
  </defs>
  <rect width="320" height="200" rx="16" fill="url(#g)"/>
  <ellipse cx="160" cy="100" rx="92" ry="36" fill="none" stroke="#d7c8ff" stroke-width="3" transform="rotate(-18 160 100)"/>
  <circle cx="160" cy="100" r="10" fill="#fff6dc"/>
  <circle cx="228" cy="78" r="3" fill="#9aefff"/>
  <circle cx="96" cy="126" r="2.5" fill="#ffb4dc"/>
</svg>`;

  const home = makeDir('Home', {
    Desktop: makeDir('Desktop'),
    Documents: makeDir('Documents', {
      'Welcome.txt': makeFile('Welcome.txt', WELCOME, 'text/plain'),
      'Ideas.md': makeFile('Ideas.md', IDEAS, 'text/markdown'),
    }),
    Pictures: makeDir('Pictures', {
      'Nebula Mark.svg': makeFile('Nebula Mark.svg', mark, 'image/svg+xml'),
    }),
    Notes: makeDir('Notes', {
      'Getting Started.md': makeFile('Getting Started.md', NOTE, 'text/markdown'),
    }),
    Code: makeDir('Code', {
      'hello.js': makeFile('hello.js', HELLO_JS, 'text/javascript'),
    }),
    Music: makeDir('Music'),
    Calendar: makeDir('Calendar', {
      'events.json': makeFile('events.json', '[]', 'application/json'),
    }),
  });

  return makeDir('', {
    Home: home,
    Trash: makeDir('Trash'),
    System: makeDir('System', {
      'About.txt': makeFile('About.txt', ABOUT, 'text/plain'),
    }),
  });
}

const WELCOME = `Welcome to NebulaOS

This is a desktop that runs in your browser. Everything you save stays on this device, in a virtual disk backed by IndexedDB.

A few things worth trying
- Browse folders in Files. Double-click a file and it opens in the right app.
- Drop files from your computer onto the desktop or into a folder to import them.
- Open Code, then run hello.js. The console underneath the editor is yours.
- Open Terminal and try: ls, cd Documents, cat Welcome.txt, grep Nebula .
- Draw something in Paint and save it into Pictures.
- Right-click the desktop for a new folder, a new file, or a different wallpaper.
- Open Settings to change the theme, accent color, and lock PIN.

Keyboard
- Ctrl+K opens search
- Alt+Tab switches windows
- Alt+Left / Alt+Right snap a window to half the screen
- Ctrl+Alt+Left / Ctrl+Alt+Right switch virtual desktops

Sample weather is labeled as sample data. Music tracks are original pieces played by the built-in synth.
`;

const IDEAS = `# Ideas

- Pin the apps you use on the taskbar.
- Keep notes in the Notes app. They are real files under Home/Notes.
- The trash can restores what you delete, until you empty it.
`;

const NOTE = `# Getting started

NebulaOS notes are markdown files in Home/Notes.

- New note creates a file.
- Other apps can open the same file.
- Search from the taskbar finds note text.
`;

const HELLO_JS = `// NebulaOS sample. Press Run.
const name = 'Nebula';
console.log('Hello from ' + name);

function fib(n) {
  const out = [];
  let a = 0;
  let b = 1;
  for (let i = 0; i < n; i += 1) {
    out.push(a);
    const next = a + b;
    a = b;
    b = next;
  }
  return out;
}

console.log('fib(10) =', fib(10).join(', '));
console.log('square of 12 =', 12 * 12);
`;

const ABOUT = `NebulaOS
A desktop environment that lives in one browser tab.

Files, notes, drawings, and settings are stored locally.
There is no account server and no build step.
`;

function cloneNode(node, name) {
  const copy = structuredClone(node);
  copy.name = name;
  const now = stamp();
  copy.created = now;
  copy.modified = now;
  delete copy.trashedFrom;
  delete copy.trashedAt;
  return copy;
}

export function isValidTree(tree) {
  return Boolean(
    tree
    && tree.kind === 'dir'
    && tree.children
    && tree.children.Home
    && tree.children.Trash
    && tree.children.System,
  );
}

export class VFS {
  constructor(tree) {
    this.tree = tree && isValidTree(tree) ? tree : seedTree();
    this.onChange = null;
  }

  _changed() {
    if (typeof this.onChange === 'function') this.onChange();
  }

  normalize(path, cwd = '/') {
    let raw = path == null ? '' : String(path).trim();
    if (!raw) raw = cwd || '/';
    if (raw === '~' || raw.startsWith('~/')) raw = `/Home${raw.slice(1)}`;
    else if (!raw.startsWith('/')) {
      const base = cwd && cwd !== '/' ? cwd.replace(/\/$/, '') : '';
      raw = `${base}/${raw}`;
    }
    const parts = [];
    for (const seg of raw.split('/')) {
      if (!seg || seg === '.') continue;
      if (seg === '..') parts.pop();
      else parts.push(seg);
    }
    return `/${parts.join('/')}`;
  }

  _walk(path) {
    const norm = this.normalize(path);
    if (norm === '/') return { node: this.tree, parent: null, key: null, path: '/' };
    const parts = norm.slice(1).split('/');
    let node = this.tree;
    let parent = null;
    let key = null;
    for (const part of parts) {
      if (!node || node.kind !== 'dir' || !node.children || !Object.prototype.hasOwnProperty.call(node.children, part)) {
        return null;
      }
      parent = node;
      key = part;
      node = node.children[part];
    }
    return { node, parent, key, path: norm };
  }

  exists(path) {
    return Boolean(this._walk(path));
  }

  _require(path) {
    const hit = this._walk(path);
    if (!hit) throw new FSError('ENOENT', this.normalize(path), `No such file or directory: ${this.normalize(path)}`);
    return hit;
  }

  _requireDir(path) {
    const hit = this._require(path);
    if (hit.node.kind !== 'dir') {
      throw new FSError('ENOTDIR', hit.path, `Not a directory: ${hit.path}`);
    }
    return hit;
  }

  _info(node, path) {
    return {
      name: node.name || '/',
      path,
      kind: node.kind,
      mime: node.mime || (node.kind === 'dir' ? 'inode/directory' : guessMime(node.name || '')),
      size: node.kind === 'file' ? byteSize(node.content) : this._dirSize(node),
      created: node.created,
      modified: node.modified,
      trashedFrom: node.trashedFrom || null,
    };
  }

  _dirSize(node) {
    let total = 0;
    for (const child of Object.values(node.children || {})) {
      total += child.kind === 'file' ? byteSize(child.content) : this._dirSize(child);
    }
    return total;
  }

  stat(path) {
    const hit = this._require(path);
    return this._info(hit.node, hit.path);
  }

  list(path) {
    const hit = this._requireDir(path);
    return Object.values(hit.node.children)
      .map((child) => this._info(child, joinPath(hit.path, child.name)))
      .sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }

  read(path) {
    const hit = this._require(path);
    if (hit.node.kind !== 'file') throw new FSError('EISDIR', hit.path, `Is a directory: ${hit.path}`);
    return hit.node.content ?? '';
  }

  write(path, content, mime) {
    const norm = this.normalize(path);
    const name = basename(norm);
    if (!name || name === '/' || name === '.' || name === '..' || name.includes('\0')) {
      throw new FSError('EINVAL', norm, `Invalid name: ${norm}`);
    }
    const parent = this._requireDir(dirname(norm));
    const existing = parent.node.children[name];
    if (existing && existing.kind === 'dir') throw new FSError('EISDIR', norm, `Is a directory: ${norm}`);
    const now = stamp();
    parent.node.children[name] = {
      kind: 'file',
      name,
      mime: mime || existing?.mime || guessMime(name),
      content: content == null ? '' : String(content),
      created: existing?.created || now,
      modified: now,
    };
    parent.node.modified = now;
    this._changed();
    return this._info(parent.node.children[name], norm);
  }

  mkdir(path, { parents = false } = {}) {
    const norm = this.normalize(path);
    if (norm === '/') return this.stat('/');
    const parts = norm.slice(1).split('/');
    let node = this.tree;
    let built = '';
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      if (!part || part === '.' || part === '..') throw new FSError('EINVAL', norm, `Invalid name: ${norm}`);
      built += `/${part}`;
      const existing = node.children[part];
      const last = i === parts.length - 1;
      if (existing) {
        if (existing.kind !== 'dir') throw new FSError('ENOTDIR', built, `Not a directory: ${built}`);
        if (last && !parents) throw new FSError('EEXIST', built, `File exists: ${built}`);
        node = existing;
        continue;
      }
      if (!last && !parents) throw new FSError('ENOENT', built, `No such file or directory: ${dirname(built)}`);
      const dir = makeDir(part);
      node.children[part] = dir;
      node.modified = dir.modified;
      node = dir;
    }
    this._changed();
    return this.stat(norm);
  }

  touch(path) {
    const norm = this.normalize(path);
    if (this.exists(norm)) {
      const hit = this._require(norm);
      hit.node.modified = stamp();
      this._changed();
      return this._info(hit.node, hit.path);
    }
    return this.write(norm, '', guessMime(norm));
  }

  remove(path, { permanent = false, recursive = false } = {}) {
    const norm = this.normalize(path);
    if (PROTECTED.has(norm)) throw new FSError('EPERM', norm, `Operation not permitted: ${norm}`);
    const hit = this._require(norm);
    if (hit.node.kind === 'dir' && !recursive) {
      throw new FSError('EISDIR', norm, `Is a directory: ${norm}`);
    }
    delete hit.parent.children[hit.key];
    hit.parent.modified = stamp();
    const inTrash = norm === '/Trash' || norm.startsWith('/Trash/');
    if (!permanent && !inTrash) {
      const node = hit.node;
      node.trashedFrom = norm;
      node.trashedAt = stamp();
      const trash = this._requireDir('/Trash').node;
      const base = node.name;
      let name = base;
      let i = 1;
      while (trash.children[name]) name = `${base} (${i++})`;
      node.name = name;
      trash.children[name] = node;
      trash.modified = stamp();
    }
    this._changed();
    return norm;
  }

  restore(path) {
    const norm = this.normalize(path);
    const hit = this._require(norm);
    if (!norm.startsWith('/Trash/')) throw new FSError('EINVAL', norm, `Not in trash: ${norm}`);
    delete hit.parent.children[hit.key];
    const node = hit.node;
    let dest = node.trashedFrom || joinPath('/Home/Desktop', node.name);
    const parentPath = dirname(dest);
    if (!this.exists(parentPath) || this._walk(parentPath).node.kind !== 'dir') {
      dest = joinPath('/Home/Desktop', basename(dest));
    }
    const parent = this._requireDir(dirname(dest));
    let name = basename(dest);
    let i = 1;
    while (parent.node.children[name]) {
      i += 1;
      const dot = basename(dest).lastIndexOf('.');
      const stem = dot > 0 ? basename(dest).slice(0, dot) : basename(dest);
      const ext = dot > 0 ? basename(dest).slice(dot) : '';
      name = `${stem} restored${i > 2 ? ` ${i - 1}` : ''}${ext}`;
    }
    node.name = name;
    delete node.trashedFrom;
    delete node.trashedAt;
    node.modified = stamp();
    parent.node.children[name] = node;
    parent.node.modified = stamp();
    this._changed();
    return this._info(node, joinPath(parent.path, name));
  }

  emptyTrash() {
    const trash = this._requireDir('/Trash').node;
    trash.children = {};
    trash.modified = stamp();
    this._changed();
  }

  move(src, dst) {
    const from = this.normalize(src);
    if (PROTECTED.has(from)) throw new FSError('EPERM', from, `Operation not permitted: ${from}`);
    const hit = this._require(from);
    let dest = this.normalize(dst);
    if (this.exists(dest) && this._walk(dest).node.kind === 'dir') {
      dest = joinPath(dest, hit.node.name);
    }
    if (dest === from) return this.stat(dest);
    if (hit.node.kind === 'dir' && (dest === from || dest.startsWith(`${from}/`))) {
      throw new FSError('EINVAL', dest, `Cannot move a directory into itself: ${dest}`);
    }
    if (PROTECTED.has(dest)) throw new FSError('EPERM', dest, `Operation not permitted: ${dest}`);
    const parent = this._requireDir(dirname(dest));
    const name = basename(dest);
    if (!name) throw new FSError('EINVAL', dest, `Invalid name: ${dest}`);
    const occupying = parent.node.children[name];
    if (occupying && occupying.kind === 'dir') {
      throw new FSError('EISDIR', dest, `Is a directory: ${dest}`);
    }
    delete hit.parent.children[hit.key];
    hit.parent.modified = stamp();
    hit.node.name = name;
    hit.node.modified = stamp();
    delete hit.node.trashedFrom;
    delete hit.node.trashedAt;
    parent.node.children[name] = hit.node;
    parent.node.modified = stamp();
    this._changed();
    return this.stat(dest);
  }

  copy(src, dst) {
    const from = this.normalize(src);
    const hit = this._require(from);
    let dest = this.normalize(dst);
    if (this.exists(dest) && this._walk(dest).node.kind === 'dir') {
      dest = joinPath(dest, hit.node.name);
    }
    if (dest === from || (hit.node.kind === 'dir' && dest.startsWith(`${from}/`))) {
      throw new FSError('EINVAL', dest, `Cannot copy onto itself: ${dest}`);
    }
    const parent = this._requireDir(dirname(dest));
    const name = basename(dest);
    const occupying = parent.node.children[name];
    if (occupying && occupying.kind === 'dir') throw new FSError('EISDIR', dest, `Is a directory: ${dest}`);
    parent.node.children[name] = cloneNode(hit.node, name);
    parent.node.modified = stamp();
    this._changed();
    return this.stat(dest);
  }

  search(query, { limit = 40, includeTrash = false } = {}) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    const hits = [];
    const walk = (node, path) => {
      if (hits.length >= limit) return;
      const children = Object.values(node.children || {});
      for (const child of children) {
        if (hits.length >= limit) return;
        const childPath = joinPath(path, child.name);
        if (!includeTrash && (childPath === '/Trash' || childPath.startsWith('/Trash/'))) continue;
        const nameMatch = child.name.toLowerCase().includes(q);
        let snippet = '';
        if (
          child.kind === 'file'
          && typeof child.content === 'string'
          && !child.content.startsWith('data:')
          && child.content.length < 200000
        ) {
          const idx = child.content.toLowerCase().indexOf(q);
          if (idx >= 0) {
            const start = Math.max(0, idx - 28);
            snippet = child.content.slice(start, idx + q.length + 42).replace(/\s+/g, ' ').trim();
          }
        }
        if (nameMatch || snippet) {
          hits.push({ ...this._info(child, childPath), snippet, match: nameMatch ? 'name' : 'content' });
        }
        if (child.kind === 'dir') walk(child, childPath);
      }
    };
    walk(this.tree, '/');
    return hits;
  }

  stats() {
    let files = 0;
    let dirs = 0;
    let bytes = 0;
    const walk = (node) => {
      for (const child of Object.values(node.children || {})) {
        if (child.kind === 'dir') {
          dirs += 1;
          walk(child);
        } else {
          files += 1;
          bytes += byteSize(child.content);
        }
      }
    };
    walk(this.tree);
    return { files, dirs, bytes };
  }
}

export function prettyError(error) {
  if (!(error instanceof FSError)) return error?.message || String(error);
  return error.message;
}
