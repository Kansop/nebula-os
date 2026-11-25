/** Which app opens which file. Shared by Files, search, and the desktop. */

import { extname } from './util.js';

const TABLE = [
  { ext: 'txt', app: 'editor' },
  { ext: 'md', app: 'editor', also: ['notes'] },
  { ext: 'log', app: 'editor' },
  { ext: 'csv', app: 'editor' },
  { ext: 'json', app: 'code', also: ['editor'] },
  { ext: 'js', app: 'code', also: ['editor'] },
  { ext: 'mjs', app: 'code', also: ['editor'] },
  { ext: 'css', app: 'code', also: ['editor'] },
  { ext: 'html', app: 'code', also: ['editor'] },
  { ext: 'svg', app: 'viewer', also: ['code', 'editor'] },
  { ext: 'png', app: 'viewer', also: ['paint'] },
  { ext: 'jpg', app: 'viewer', also: ['paint'] },
  { ext: 'jpeg', app: 'viewer', also: ['paint'] },
  { ext: 'gif', app: 'viewer' },
  { ext: 'webp', app: 'viewer' },
  { ext: 'bmp', app: 'viewer' },
];

export function appsForFile(name) {
  const ext = extname(name);
  const row = TABLE.find((item) => item.ext === ext);
  if (!row) return ['editor'];
  return [row.app, ...(row.also || [])];
}

export function defaultAppFor(name) {
  return appsForFile(name)[0];
}
