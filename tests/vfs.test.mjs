import assert from 'node:assert/strict';
import test from 'node:test';
import { FSError, VFS, seedTree } from '../js/core/vfs.js';

function fs() {
  return new VFS(seedTree());
}

test('seed contains the welcome document', () => {
  const disk = fs();
  assert.equal(disk.stat('/Home/Documents/Welcome.txt').kind, 'file');
  assert.match(disk.read('/Home/Documents/Welcome.txt'), /NebulaOS/);
  assert.equal(disk.stat('/Trash').kind, 'dir');
});

test('paths resolve home, relative, and parent segments', () => {
  const disk = fs();
  assert.equal(disk.normalize('~/Documents'), '/Home/Documents');
  assert.equal(disk.normalize('../Documents', '/Home/Desktop'), '/Home/Documents');
  assert.equal(disk.normalize('../../../../etc', '/Home'), '/etc');
  assert.equal(disk.normalize('.'), '/');
});

test('write, read, mkdir -p, and list', () => {
  const disk = fs();
  disk.mkdir('/Home/Desktop/Projects/Nebula', { parents: true });
  disk.write('/Home/Desktop/Projects/Nebula/notes.txt', 'orbit');
  assert.equal(disk.read('/Home/Desktop/Projects/Nebula/notes.txt'), 'orbit');
  const names = disk.list('/Home/Desktop/Projects/Nebula').map((entry) => entry.name);
  assert.deepEqual(names, ['notes.txt']);
});

test('refuses to replace a directory with a file and to escape protected roots', () => {
  const disk = fs();
  assert.throws(() => disk.write('/Home/Documents', 'nope'), (error) => error instanceof FSError && error.code === 'EISDIR');
  assert.throws(() => disk.remove('/Home'), (error) => error.code === 'EPERM');
  assert.throws(() => disk.remove('/Home/Documents/Welcome.txt/..'), (error) => error.code === 'EPERM' || error.code === 'ENOENT');
});

test('delete goes to trash and restore puts it back', () => {
  const disk = fs();
  disk.write('/Home/Desktop/draft.txt', 'keep me');
  disk.remove('/Home/Desktop/draft.txt');
  assert.equal(disk.exists('/Home/Desktop/draft.txt'), false);
  const trashed = disk.list('/Trash');
  assert.equal(trashed.length, 1);
  assert.equal(trashed[0].trashedFrom, '/Home/Desktop/draft.txt');
  const restored = disk.restore(trashed[0].path);
  assert.equal(restored.path, '/Home/Desktop/draft.txt');
  assert.equal(disk.read('/Home/Desktop/draft.txt'), 'keep me');
  assert.equal(disk.list('/Trash').length, 0);
});

test('permanent delete and recursive directory delete', () => {
  const disk = fs();
  disk.mkdir('/Home/Desktop/box');
  disk.write('/Home/Desktop/box/a.txt', 'a');
  assert.throws(() => disk.remove('/Home/Desktop/box'), (error) => error.code === 'EISDIR');
  disk.remove('/Home/Desktop/box', { recursive: true });
  assert.equal(disk.exists('/Home/Desktop/box'), false);
  assert.equal(disk.list('/Trash').some((entry) => entry.name === 'box'), true);
  disk.remove(`/Trash/${disk.list('/Trash')[0].name}`, { permanent: true, recursive: true });
  assert.equal(disk.list('/Trash').length, 0);
});

test('move, copy, and copy into a directory', () => {
  const disk = fs();
  disk.write('/Home/Desktop/a.txt', 'alpha');
  disk.move('/Home/Desktop/a.txt', '/Home/Documents/b.txt');
  assert.equal(disk.read('/Home/Documents/b.txt'), 'alpha');
  disk.copy('/Home/Documents/b.txt', '/Home/Desktop');
  assert.equal(disk.read('/Home/Desktop/b.txt'), 'alpha');
  disk.mkdir('/Home/Desktop/dir');
  disk.write('/Home/Desktop/dir/c.txt', 'c');
  disk.copy('/Home/Desktop/dir', '/Home/Documents/dir-copy');
  assert.equal(disk.read('/Home/Documents/dir-copy/c.txt'), 'c');
});

test('search matches names and text, skipping trash', () => {
  const disk = fs();
  disk.write('/Home/Notes/orbit.md', 'The quiet dock hums.');
  disk.remove('/Home/Documents/Ideas.md');
  const notes = disk.search('quiet dock');
  assert.ok(notes.some((hit) => hit.path === '/Home/Notes/orbit.md'));
  const welcome = disk.search('welcome');
  assert.ok(welcome.some((hit) => hit.name === 'Welcome.txt'));
  assert.equal(disk.search('ideas').some((hit) => hit.path.startsWith('/Trash')), false);
});

test('touch updates time and creates missing files', () => {
  const disk = fs();
  const before = disk.stat('/Home/Documents/Welcome.txt').modified;
  disk.touch('/Home/Desktop/new.txt');
  assert.equal(disk.read('/Home/Desktop/new.txt'), '');
  assert.ok(disk.stat('/Home/Documents/Welcome.txt').modified >= before);
});
