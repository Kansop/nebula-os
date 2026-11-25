import assert from 'node:assert/strict';
import test from 'node:test';
import { createShell } from '../js/core/shell.js';
import { VFS, seedTree } from '../js/core/vfs.js';

function boot() {
  const disk = new VFS(seedTree());
  const opened = [];
  const shell = createShell(disk, {
    username: () => 'astra',
    open: (path) => opened.push(path),
    now: () => new Date('2026-11-25T12:00:00Z'),
  });
  return { disk, shell, opened };
}

test('pwd, cd, home, and previous directory', () => {
  const { shell } = boot();
  assert.equal(shell.exec('pwd').stdout, '/Home');
  assert.equal(shell.exec('cd Documents').code, 0);
  assert.equal(shell.exec('pwd').stdout, '/Home/Documents');
  assert.equal(shell.exec('cd .. && pwd').stdout, '/Home');
  assert.equal(shell.exec('cd - && pwd').stdout, '/Home/Documents');
  assert.equal(shell.exec('cd ~').code, 0);
  assert.equal(shell.cwd, '/Home');
});

test('echo, quotes, redirects, and append', () => {
  const { disk, shell } = boot();
  assert.equal(shell.exec('echo hello nebula').stdout, 'hello nebula');
  assert.equal(shell.exec('echo "a > b"').stdout, 'a > b');
  assert.equal(shell.exec('echo orbit > Desktop/log.txt').code, 0);
  assert.equal(disk.read('/Home/Desktop/log.txt'), 'orbit\n');
  shell.exec('echo second >> Desktop/log.txt');
  assert.equal(disk.read('/Home/Desktop/log.txt'), 'orbit\nsecond\n');
  assert.equal(shell.exec("echo -n plain > Desktop/plain.txt").code, 0);
  assert.equal(disk.read('/Home/Desktop/plain.txt'), 'plain');
});

test('ls, cat, glob, and grep', () => {
  const { shell } = boot();
  const list = shell.exec('ls Documents').stdout.split('\n');
  assert.ok(list.includes('Welcome.txt'));
  assert.match(shell.exec('cat Documents/Welcome.txt').stdout, /browser/);
  assert.match(shell.exec('ls Documents/*.txt').stdout, /Welcome\.txt/);
  const grep = shell.exec('grep -n Nebula Documents/Welcome.txt');
  assert.equal(grep.code, 0);
  assert.match(grep.stdout, /Welcome\.txt:1:/);
  assert.equal(shell.exec('grep -i missing-token Documents/Welcome.txt').code, 1);
  assert.match(shell.exec('grep browser Documents').stdout, /Welcome\.txt:/);
});

test('mkdir, copy, move, remove, restore', () => {
  const { disk, shell } = boot();
  assert.equal(shell.exec('mkdir -p Desktop/a/b').code, 0);
  assert.equal(shell.exec('touch Desktop/a/b/note.txt').code, 0);
  assert.equal(shell.exec('cp Desktop/a/b/note.txt Documents/note.txt').code, 0);
  assert.equal(disk.exists('/Home/Documents/note.txt'), true);
  assert.equal(shell.exec('mv Documents/note.txt Documents/renamed.txt').code, 0);
  assert.equal(shell.exec('rm Documents/renamed.txt').code, 0);
  assert.match(shell.exec('trash').stdout, /renamed\.txt/);
  assert.equal(shell.exec('restore renamed.txt').stdout, '/Home/Documents/renamed.txt');
  assert.equal(shell.exec('rm -r Desktop/a').code, 0);
  assert.equal(disk.exists('/Home/Desktop/a'), false);
  assert.equal(shell.exec('rm /Home').code, 1);
});

test('wc, head, tail, find, tree, and chains', () => {
  const { shell } = boot();
  shell.exec('echo alpha > Desktop/poem.txt');
  shell.exec('echo beta >> Desktop/poem.txt');
  const wc = shell.exec('wc Desktop/poem.txt');
  assert.match(wc.stdout, /2\s+2/);
  assert.equal(shell.exec('head -n 1 Desktop/poem.txt').stdout, 'alpha');
  assert.equal(shell.exec('tail -n 1 Desktop/poem.txt').stdout, 'beta');
  assert.match(shell.exec('find Code -name "*.js"').stdout, /hello\.js/);
  assert.match(shell.exec('tree /Home/Code').stdout, /hello\.js/);
  assert.equal(shell.exec('cd /missing && echo no').stdout, '');
  assert.match(shell.exec('cd /missing && echo no').stderr, /No such file/);
  assert.equal(shell.exec('cd /missing || echo recovered').stdout, 'recovered');
});

test('history, whoami, help, open, and syntax errors', () => {
  const { shell, opened } = boot();
  shell.exec('pwd');
  assert.match(shell.exec('history').stdout, /pwd/);
  assert.equal(shell.exec('whoami').stdout, 'astra');
  assert.match(shell.exec('help').stdout, /mkdir/);
  assert.equal(shell.exec('help nope').code, 1);
  assert.equal(shell.exec('open Documents/Welcome.txt').code, 0);
  assert.deepEqual(opened, ['/Home/Documents/Welcome.txt']);
  assert.match(shell.exec('echo "oops').stderr, /unclosed quote/);
  assert.match(shell.exec('not-a-command').stderr, /command not found/);
  assert.equal(shell.exec('echo pipe | cat').code, 1);
});
