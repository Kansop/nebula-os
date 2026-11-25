import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';
import { ASSETS } from '../js/core/assets.js';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules' || name === 'tests' || name === 'tools') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(relative('.', path).split('\\').join('/'));
  }
  return out;
}

test('precached files exist and cover the static site', () => {
  for (const asset of ASSETS) assert.equal(existsSync(asset), true, asset);
  const skip = new Set(['package.json', 'README.md', 'sw.js', '.nojekyll']);
  const files = walk('.').filter((file) => !skip.has(file) && !file.startsWith('.'));
  const listed = new Set(ASSETS);
  for (const file of files) assert.equal(listed.has(file), true, `missing from ASSETS: ${file}`);
});
