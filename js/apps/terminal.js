/** Terminal bound to the shared virtual disk. */

import { createShell } from '../core/shell.js';
import { el, esc } from '../core/util.js';

export const terminalApp = {
  id: 'terminal',
  name: 'Terminal',
  blurb: 'A shell for the virtual disk',
  category: 'system',
  width: 760,
  height: 480,
  launch(env) {
    const shell = createShell(env.fs, {
      username: () => env.settings.get('username') || 'astronaut',
      open: (path) => env.openPath(path),
    });
    if (env.params.cwd && env.fs.exists(env.params.cwd)) shell.exec(`cd ${quote(env.params.cwd)}`);
    const root = el('div', { class: 'term' });
    const out = el('div', { class: 'term-out' });
    const form = el('form', { class: 'term-line' });
    const prompt = el('span', { class: 'prompt' });
    const input = el('input', { class: 'term-input', spellcheck: 'false', 'aria-label': 'Command', autocomplete: 'off' });
    form.append(prompt, input);
    root.append(out, form);
    env.win.body.append(root);

    const local = [];
    let cursor = 0;

    function pretty(cwd) {
      if (cwd === '/Home') return '~';
      if (cwd.startsWith('/Home/')) return `~/${cwd.slice('/Home/'.length)}`;
      return cwd;
    }
    function paintPrompt() {
      const user = (env.settings.get('username') || 'astronaut').toLowerCase().replace(/\s+/g, '');
      prompt.textContent = `${user}@nebula:${pretty(shell.cwd)}$`;
    }
    function write(text, cls) {
      if (!text) return;
      const row = el('div', { class: `term-row ${cls || ''}` });
      row.innerHTML = esc(text);
      out.append(row);
      out.scrollTop = out.scrollHeight;
    }
    function run(line) {
      write(`${prompt.textContent} ${line}`, 'cmd');
      const result = shell.exec(line);
      if (result.clear) out.innerHTML = '';
      if (result.stdout) write(result.stdout, 'out');
      if (result.stderr) write(result.stderr, 'err');
      paintPrompt();
    }

    write('Nebula shell. Type help to list commands.', 'muted');
    paintPrompt();
    input.focus();

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const line = input.value;
      input.value = '';
      if (line.trim() && local[local.length - 1] !== line) local.push(line);
      cursor = local.length;
      run(line);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        cursor = Math.max(0, cursor - 1);
        input.value = local[cursor] || '';
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        cursor = Math.min(local.length, cursor + 1);
        input.value = local[cursor] || '';
      } else if (event.key === 'Tab') {
        event.preventDefault();
        input.value = complete(shell, env.fs, input.value);
      } else if (event.key === 'l' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        out.innerHTML = '';
      } else if (event.key === 'c' && (event.ctrlKey || event.metaKey) && !input.value) {
        write(`${prompt.textContent} ^C`, 'muted');
      }
    });
    env.win.el.addEventListener('pointerdown', () => input.focus());
  },
};

function quote(path) {
  return `'${String(path).replaceAll("'", `'\\''`)}'`;
}

function complete(shell, fs, line) {
  const match = /^(.*\s)?(\S*)$/.exec(line);
  const prefix = match?.[1] || '';
  const token = match?.[2] || '';
  const first = !prefix.trim();
  if (first) {
    const commands = ['ls', 'cd', 'pwd', 'mkdir', 'touch', 'cat', 'echo', 'rm', 'mv', 'cp', 'grep', 'find', 'head', 'tail', 'wc', 'help', 'open', 'tree', 'clear'];
    const hit = commands.find((cmd) => cmd.startsWith(token));
    return hit ? hit : line;
  }
  const slash = token.lastIndexOf('/');
  const dirToken = slash >= 0 ? token.slice(0, slash + 1) : '';
  const partial = slash >= 0 ? token.slice(slash + 1) : token;
  let dir = shell.cwd;
  try {
    if (dirToken) dir = fs.normalize(dirToken, shell.cwd);
    if (!fs.exists(dir) || fs.stat(dir).kind !== 'dir') return line;
    const hit = fs.list(dir).find((entry) => entry.name.startsWith(partial));
    if (!hit) return line;
    const next = `${dirToken}${hit.name}${hit.kind === 'dir' ? '/' : ''}`;
    return prefix + next;
  } catch {
    return line;
  }
}
