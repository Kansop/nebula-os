import assert from 'node:assert/strict';
import test from 'node:test';
import { bytesToText, unzipStore, zipStore } from '../js/core/zip.js';

test('stored zip archives round-trip file bytes', () => {
  const archive = zipStore([
    { name: 'notes/hello.txt', data: 'Hello Nebula' },
    { name: 'empty.txt', data: '' },
  ]);
  const files = unzipStore(archive);
  assert.deepEqual(files.map((file) => file.name), ['notes/hello.txt', 'empty.txt']);
  assert.equal(bytesToText(files[0].data), 'Hello Nebula');
  assert.equal(bytesToText(files[1].data), '');
});
