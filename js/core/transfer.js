/** Import from and export to the real computer. */

import { dataUrlToBlob, downloadBlob, guessMime, isTextMime, joinPath, readFileAs, uniqueName } from './util.js';

export async function importFiles(fs, fileList, destDir) {
  const saved = [];
  for (const file of [...fileList]) {
    const asText = isTextMime(file.type, file.name) && file.size < 2_000_000;
    const content = await readFileAs(file, asText);
    const name = uniqueName(file.name || 'upload', (candidate) => fs.exists(joinPath(destDir, candidate)));
    const path = joinPath(destDir, name);
    fs.write(path, content, file.type || guessMime(name));
    saved.push(path);
  }
  return saved;
}

export function downloadEntry(fs, path) {
  const stat = fs.stat(path);
  if (stat.kind !== 'file') return;
  const content = String(fs.read(path) ?? '');
  const blob = content.startsWith('data:')
    ? dataUrlToBlob(content)
    : new Blob([content], { type: stat.mime || 'text/plain' });
  downloadBlob(stat.name, blob);
}
