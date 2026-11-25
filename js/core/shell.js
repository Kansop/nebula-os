/** Command shell over a VFS instance. Pure: no DOM. */

import { FSError } from './vfs.js';
import { basename, dirname, formatBytes, globToRegExp } from './util.js';

const HELP = [
  ['help', 'List commands, or help <command>'],
  ['ls', 'List a directory. Flags: -l -a'],
  ['ll', 'Alias of ls -la'],
  ['cd', 'Change directory. cd, cd -, cd ~'],
  ['pwd', 'Print the working directory'],
  ['mkdir', 'Create a directory. Flag: -p'],
  ['rmdir', 'Remove an empty directory (to Trash)'],
  ['touch', 'Create an empty file or update its time'],
  ['cat', 'Print file contents'],
  ['echo', 'Print text. Supports > and >>'],
  ['rm', 'Move to Trash. Flags: -r recursive, -f permanent'],
  ['mv', 'Move or rename'],
  ['cp', 'Copy a file or directory'],
  ['grep', 'Search text. Flags: -n -i -r'],
  ['find', 'Find by name. find [path] -name pattern'],
  ['head', 'First lines. head -n 10 file'],
  ['tail', 'Last lines. tail -n 10 file'],
  ['wc', 'Count lines, words, and bytes'],
  ['stat', 'Show file details'],
  ['tree', 'Show a directory tree'],
  ['du', 'Disk usage of a path'],
  ['df', 'Disk usage of the whole drive'],
  ['open', 'Open a path in the desktop'],
  ['trash', 'List Trash'],
  ['restore', 'Restore a trashed item by name or path'],
  ['empty-trash', 'Permanently empty Trash'],
  ['history', 'Show recent commands'],
  ['clear', 'Clear the screen'],
  ['whoami', 'Print the current user'],
  ['date', 'Print the date and time'],
  ['basename', 'Print the last part of a path'],
  ['dirname', 'Print the parent of a path'],
];

export function tokenize(line) {
  const tokens = [];
  let cur = '';
  let quoted = false;
  let quote = null;
  const push = () => {
    if (cur !== '' || quoted) tokens.push({ value: cur, quoted });
    cur = '';
    quoted = false;
  };
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (quote) {
      if (c === '\\' && quote === '"' && i + 1 < line.length) {
        const n = line[i + 1];
        cur += n === 'n' ? '\n' : n;
        i += 1;
        continue;
      }
      if (c === quote) quote = null;
      else cur += c;
      continue;
    }
    if (c === '\\' && i + 1 < line.length) {
      cur += line[i + 1];
      i += 1;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      quoted = true;
      continue;
    }
    if (c === '#' && cur === '') break;
    if (c === ';') {
      push();
      tokens.push({ value: ';', quoted: false });
      continue;
    }
    if (c === '>' || c === '|' || c === '&') {
      push();
      if (line[i + 1] === c) {
        tokens.push({ value: c + c, quoted: false });
        i += 1;
      } else tokens.push({ value: c, quoted: false });
      continue;
    }
    if (/\s/.test(c)) {
      push();
      continue;
    }
    cur += c;
  }
  if (quote) {
    const error = new Error('unclosed quote');
    error.code = 'SYNTAX';
    throw error;
  }
  push();
  return tokens;
}

function splitChains(tokens) {
  const parts = [];
  let cur = [];
  let op = null;
  for (const token of tokens) {
    if (!token.quoted && (token.value === '&&' || token.value === '||' || token.value === ';')) {
      parts.push({ op, tokens: cur });
      op = token.value;
      cur = [];
    } else cur.push(token);
  }
  parts.push({ op, tokens: cur });
  return parts;
}

function splitRedirect(tokens) {
  const argv = [];
  let redir = null;
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token.quoted && (token.value === '>' || token.value === '>>')) {
      if (redir) throw syntax('extra redirect');
      const target = tokens[i + 1];
      if (!target) throw syntax('missing redirect target');
      redir = { append: token.value === '>>', target: target.value, quoted: target.quoted };
      i += 1;
      continue;
    }
    if (redir) throw syntax(`unexpected ${token.value}`);
    if (!token.quoted && (token.value === '|' || token.value === '&')) {
      throw syntax(token.value === '|' ? 'pipes are not supported (try &&)' : `unexpected ${token.value}`);
    }
    argv.push(token);
  }
  return { argv, redir };
}

function syntax(message) {
  const error = new Error(`syntax error: ${message}`);
  error.code = 'SYNTAX';
  return error;
}

function ok(stdout = '', extra = {}) {
  return { stdout: stdout == null ? '' : String(stdout), stderr: '', code: 0, ...extra };
}

function fail(stderr, code = 1) {
  return { stdout: '', stderr: String(stderr), code };
}

function parseFlags(args) {
  const flags = new Set();
  const rest = [];
  let end = false;
  for (const arg of args) {
    if (!end && arg.value === '--') {
      end = true;
      continue;
    }
    if (!end && !arg.quoted && arg.value.startsWith('-') && arg.value.length > 1 && !/^-?\d+$/.test(arg.value)) {
      for (const ch of arg.value.slice(1)) flags.add(ch);
    } else rest.push(arg);
  }
  return { flags, rest };
}

function textOf(fs, path) {
  const stat = fs.stat(path);
  if (stat.kind !== 'file') throw new FSError('EISDIR', path, `Is a directory: ${path}`);
  const content = fs.read(path);
  if (typeof content === 'string' && content.startsWith('data:')) {
    throw new FSError('EBINARY', path, `Binary file: ${path}`);
  }
  return String(content);
}

function formatLong(entry) {
  const kind = entry.kind === 'dir' ? 'dir ' : 'file';
  const size = formatBytes(entry.size).padStart(8, ' ');
  const when = new Date(entry.modified);
  const stamp = Number.isNaN(when.getTime())
    ? 'unknown'
    : when.toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  return `${kind} ${size}  ${stamp}  ${entry.name}`;
}

function visible(entries, flags) {
  return entries.filter((entry) => flags.has('a') || !entry.name.startsWith('.'));
}

function expandArg(token, cwd, fs) {
  if (token.quoted || (!token.value.includes('*') && !token.value.includes('?'))) return [token.value];
  const abs = fs.normalize(token.value, cwd);
  const dir = dirname(abs);
  const base = basename(abs);
  if (dir.includes('*') || dir.includes('?')) return [token.value];
  if (!fs.exists(dir) || fs.stat(dir).kind !== 'dir') return [token.value];
  const matcher = globToRegExp(base);
  const matches = fs.list(dir).filter((entry) => matcher.test(entry.name)).map((entry) => entry.path);
  return matches.length ? matches : [token.value];
}

function treeLines(fs, path, prefix = '') {
  const entries = fs.list(path).filter((entry) => !entry.name.startsWith('.'));
  const lines = [];
  entries.forEach((entry, index) => {
    const last = index === entries.length - 1;
    lines.push(`${prefix}${last ? '└── ' : '├── '}${entry.name}`);
    if (entry.kind === 'dir') lines.push(...treeLines(fs, entry.path, `${prefix}${last ? '    ' : '│   '}`));
  });
  return lines;
}

function grepFile(fs, path, pattern, { sensitive, numbers }) {
  let text;
  try {
    text = textOf(fs, path);
  } catch (error) {
    if (error instanceof FSError && (error.code === 'EBINARY' || error.code === 'EISDIR')) return [];
    throw error;
  }
  const lines = text.split(/\r?\n/);
  const hits = [];
  lines.forEach((line, index) => {
    const hay = sensitive ? line : line.toLowerCase();
    const needle = sensitive ? pattern : pattern.toLowerCase();
    if (hay.includes(needle)) {
      hits.push(numbers ? `${path}:${index + 1}:${line}` : `${path}:${line}`);
    }
  });
  return hits;
}

function walkFiles(fs, path, recursive) {
  const stat = fs.stat(path);
  if (stat.kind === 'file') return [stat.path];
  if (!recursive) throw new FSError('EISDIR', path, `Is a directory: ${path}`);
  const out = [];
  const visit = (dir) => {
    for (const entry of fs.list(dir)) {
      if (entry.kind === 'dir') visit(entry.path);
      else out.push(entry.path);
    }
  };
  visit(stat.path);
  return out;
}

function runCommand(argvTokens, state, fs, hooks) {
  if (!argvTokens.length) return ok('');
  const expanded = argvTokens.flatMap((token) => expandArg(token, state.cwd, fs).map((value) => ({ value, quoted: token.quoted })));
  let cmd = expanded[0].value;
  let args = expanded.slice(1);
  if (cmd === 'll') {
    cmd = 'ls';
    args = [{ value: '-la', quoted: false }, ...args];
  } else if (cmd === 'cls' || cmd === 'dir') {
    if (cmd === 'cls') cmd = 'clear';
    if (cmd === 'dir') cmd = 'ls';
  }
  const handler = COMMANDS[cmd];
  if (!handler) return fail(`nebula: ${cmd}: command not found`);
  return handler(args, state, fs, hooks);
}

const COMMANDS = {
  help(args) {
    const topic = args[0]?.value;
    if (!topic) {
      const width = Math.max(...HELP.map(([name]) => name.length));
      return ok(HELP.map(([name, text]) => `${name.padEnd(width + 2, ' ')}${text}`).join('\n'));
    }
    const row = HELP.find(([name]) => name === topic);
    if (!row) return fail(`help: no entry for ${topic}`);
    return ok(`${row[0]} — ${row[1]}`);
  },
  pwd(_args, state) {
    return ok(state.cwd);
  },
  whoami(_args, _state, _fs, hooks) {
    return ok(hooks.username?.() || 'astronaut');
  },
  date(_args, _state, _fs, hooks) {
    return ok((hooks.now?.() || new Date()).toString());
  },
  clear() {
    return ok('', { clear: true });
  },
  history(_args, state) {
    return ok(state.history.map((line, index) => `${String(index + 1).padStart(4, ' ')}  ${line}`).join('\n'));
  },
  cd(args, state, fs) {
    const target = args[0]?.value;
    const next = !target || target === '~' ? '/Home' : target === '-' ? state.lastCwd : fs.normalize(target, state.cwd);
    const stat = fs.stat(next);
    if (stat.kind !== 'dir') throw new FSError('ENOTDIR', next, `Not a directory: ${next}`);
    state.lastCwd = state.cwd;
    state.cwd = next === '/' ? '/' : next.replace(/\/$/, '') || '/';
    return ok('');
  },
  ls(args, state, fs) {
    const { flags, rest } = parseFlags(args);
    const targets = rest.length ? rest.map((arg) => fs.normalize(arg.value, state.cwd)) : [state.cwd];
    const blocks = [];
    for (const target of targets) {
      const stat = fs.stat(target);
      if (stat.kind === 'file') {
        blocks.push(flags.has('l') ? formatLong(stat) : stat.name);
        continue;
      }
      const entries = visible(fs.list(target), flags);
      const body = flags.has('l')
        ? entries.map(formatLong).join('\n')
        : entries.map((entry) => entry.name).join('\n');
      blocks.push(targets.length > 1 ? `${target}:\n${body}` : body);
    }
    return ok(blocks.filter(Boolean).join('\n\n'));
  },
  mkdir(args, state, fs) {
    const { flags, rest } = parseFlags(args);
    if (!rest.length) return fail('mkdir: missing operand');
    for (const arg of rest) fs.mkdir(fs.normalize(arg.value, state.cwd), { parents: flags.has('p') });
    return ok('');
  },
  rmdir(args, state, fs) {
    if (!args.length) return fail('rmdir: missing operand');
    for (const arg of args) {
      const path = fs.normalize(arg.value, state.cwd);
      const stat = fs.stat(path);
      if (stat.kind !== 'dir') throw new FSError('ENOTDIR', path, `Not a directory: ${path}`);
      if (fs.list(path).length) throw new FSError('ENOTEMPTY', path, `Directory not empty: ${path}`);
      fs.remove(path, { recursive: true });
    }
    return ok('');
  },
  touch(args, state, fs) {
    if (!args.length) return fail('touch: missing operand');
    for (const arg of args) fs.touch(fs.normalize(arg.value, state.cwd));
    return ok('');
  },
  cat(args, state, fs) {
    if (!args.length) return fail('cat: missing operand');
    const parts = args.map((arg) => textOf(fs, fs.normalize(arg.value, state.cwd)));
    return ok(parts.join(parts.some((part) => !part.endsWith('\n')) ? '\n' : ''));
  },
  echo(args) {
    const newline = !(args[0] && !args[0].quoted && args[0].value === '-n');
    const parts = newline ? args : args.slice(1);
    return ok(parts.map((arg) => arg.value).join(' ') + (newline ? '\n' : ''));
  },
  rm(args, state, fs) {
    const { flags, rest } = parseFlags(args);
    if (!rest.length) return fail('rm: missing operand');
    for (const arg of rest) {
      fs.remove(fs.normalize(arg.value, state.cwd), { permanent: flags.has('f'), recursive: flags.has('r') || flags.has('R') });
    }
    return ok('');
  },
  mv(args, state, fs) {
    if (args.length !== 2) return fail('mv: usage: mv source dest');
    fs.move(fs.normalize(args[0].value, state.cwd), fs.normalize(args[1].value, state.cwd));
    return ok('');
  },
  cp(args, state, fs) {
    if (args.length !== 2) return fail('cp: usage: cp source dest');
    fs.copy(fs.normalize(args[0].value, state.cwd), fs.normalize(args[1].value, state.cwd));
    return ok('');
  },
  grep(args, state, fs) {
    const { flags, rest } = parseFlags(args);
    if (!rest.length) return fail('grep: usage: grep [-n] [-i] [-r] pattern [path]');
    const pattern = rest[0].value;
    const paths = rest.slice(1).map((arg) => fs.normalize(arg.value, state.cwd));
    const targets = paths.length ? paths : [state.cwd];
    const recursive = flags.has('r') || flags.has('R') || targets.some((path) => fs.stat(path).kind === 'dir');
    const lines = [];
    for (const target of targets) {
      for (const file of walkFiles(fs, target, recursive || fs.stat(target).kind === 'dir')) {
        lines.push(...grepFile(fs, file, pattern, { sensitive: !flags.has('i'), numbers: flags.has('n') }));
      }
    }
    return ok(lines.join('\n'), { code: lines.length ? 0 : 1, stderr: lines.length ? '' : '' });
  },
  find(args, state, fs) {
    let path = state.cwd;
    let pattern = '*';
    const values = args.map((arg) => arg.value);
    if (values[0] && values[0] !== '-name') {
      path = fs.normalize(values[0], state.cwd);
      values.shift();
    }
    if (values[0] === '-name') {
      if (!values[1]) return fail('find: missing pattern');
      pattern = values[1];
    }
    const matcher = globToRegExp(pattern);
    const hits = [];
    const visit = (dir) => {
      for (const entry of fs.list(dir)) {
        if (matcher.test(entry.name)) hits.push(entry.path);
        if (entry.kind === 'dir') visit(entry.path);
      }
    };
    const stat = fs.stat(path);
    if (stat.kind === 'file') {
      if (matcher.test(stat.name)) hits.push(stat.path);
    } else visit(stat.path);
    return ok(hits.join('\n'));
  },
  head(args, state, fs) {
    return sliceFile(args, state, fs, 'head');
  },
  tail(args, state, fs) {
    return sliceFile(args, state, fs, 'tail');
  },
  wc(args, state, fs) {
    if (!args.length) return fail('wc: missing operand');
    const lines = args.map((arg) => {
      const path = fs.normalize(arg.value, state.cwd);
      const text = textOf(fs, path);
      const rows = (text.match(/\n/g) || []).length;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const bytes = new TextEncoder().encode(text).length;
      return `${String(rows).padStart(7, ' ')}${String(words).padStart(8, ' ')}${String(bytes).padStart(8, ' ')} ${path}`;
    });
    return ok(lines.join('\n'));
  },
  stat(args, state, fs) {
    if (!args.length) return fail('stat: missing operand');
    const blocks = args.map((arg) => {
      const stat = fs.stat(fs.normalize(arg.value, state.cwd));
      return [
        `  File: ${stat.path}`,
        `  Kind: ${stat.kind}`,
        `  MIME: ${stat.mime}`,
        `  Size: ${formatBytes(stat.size)} (${stat.size})`,
        `  Modified: ${new Date(stat.modified).toString()}`,
        stat.trashedFrom ? `  From: ${stat.trashedFrom}` : '',
      ].filter(Boolean).join('\n');
    });
    return ok(blocks.join('\n\n'));
  },
  tree(args, state, fs) {
    const path = fs.normalize(args[0]?.value || state.cwd, state.cwd);
    const stat = fs.stat(path);
    if (stat.kind !== 'dir') return ok(stat.path);
    return ok([stat.path, ...treeLines(fs, stat.path)].join('\n'));
  },
  du(args, state, fs) {
    const targets = args.length ? args.map((arg) => fs.normalize(arg.value, state.cwd)) : [state.cwd];
    return ok(targets.map((path) => {
      const stat = fs.stat(path);
      return `${formatBytes(stat.size).padStart(8, ' ')}  ${path}`;
    }).join('\n'));
  },
  df(_args, _state, fs) {
    const stats = fs.stats();
    return ok(`Filesystem   Used     Files  Dirs\nnebula-fs  ${formatBytes(stats.bytes).padStart(8, ' ')}  ${String(stats.files).padStart(5, ' ')}  ${String(stats.dirs).padStart(4, ' ')}`);
  },
  open(args, state, fs, hooks) {
    if (!args.length) return fail('open: missing operand');
    const path = fs.normalize(args[0].value, state.cwd);
    fs.stat(path);
    if (hooks.open) hooks.open(path);
    return ok(path);
  },
  trash(_args, _state, fs) {
    const entries = fs.list('/Trash');
    if (!entries.length) return ok('Trash is empty');
    return ok(entries.map((entry) => `${entry.name}${entry.trashedFrom ? `  <- ${entry.trashedFrom}` : ''}`).join('\n'));
  },
  restore(args, _state, fs) {
    if (!args.length) return fail('restore: usage: restore <name or /Trash/name>');
    const raw = args[0].value;
    const path = raw.startsWith('/') ? fs.normalize(raw) : fs.normalize(raw, '/Trash');
    const info = fs.restore(path);
    return ok(info.path);
  },
  'empty-trash'(_args, _state, fs) {
    fs.emptyTrash();
    return ok('');
  },
  basename(args, state, fs) {
    if (!args.length) return fail('basename: missing operand');
    return ok(basename(fs.normalize(args[0].value, state.cwd)));
  },
  dirname(args, state, fs) {
    if (!args.length) return fail('dirname: missing operand');
    return ok(dirname(fs.normalize(args[0].value, state.cwd)));
  },
};

function sliceFile(args, state, fs, which) {
  let count = 10;
  const files = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.quoted && arg.value === '-n') {
      const n = Number(args[i + 1]?.value);
      if (!Number.isFinite(n)) return fail(`${which}: bad line count`);
      count = n;
      i += 1;
      continue;
    }
    if (!arg.quoted && /^-\d+$/.test(arg.value)) {
      count = Number(arg.value.slice(1));
      continue;
    }
    files.push(arg.value);
  }
  if (!files.length) return fail(`${which}: missing operand`);
  const chunks = files.map((file) => {
    const text = textOf(fs, fs.normalize(file, state.cwd));
    const lines = text.split(/\r?\n/);
    if (text.endsWith('\n') && lines[lines.length - 1] === '') lines.pop();
    const slice = which === 'head' ? lines.slice(0, count) : lines.slice(Math.max(0, lines.length - count));
    return slice.join('\n');
  });
  return ok(chunks.join('\n'));
}

export function createShell(fs, hooks = {}) {
  const state = {
    cwd: '/Home',
    lastCwd: '/Home',
    history: [],
  };

  function exec(line) {
    const raw = String(line ?? '');
    const trimmed = raw.trim();
    if (!trimmed) return { stdout: '', stderr: '', code: 0, cwd: state.cwd };
    if (state.history[state.history.length - 1] !== trimmed) state.history.push(trimmed);
    if (state.history.length > 200) state.history.splice(0, state.history.length - 200);
    try {
      const tokens = tokenize(raw);
      const chains = splitChains(tokens);
      if (chains.length === 1 && chains[0].tokens.length === 0) {
        return { stdout: '', stderr: '', code: 0, cwd: state.cwd };
      }
      if (chains.some((part) => part.tokens.length === 0)) throw syntax('empty command');
      let stdout = '';
      let stderr = '';
      let code = 0;
      let clear = false;
      for (const part of chains) {
        if (part.op === '&&' && code !== 0) continue;
        if (part.op === '||' && code === 0) continue;
        try {
          const { argv, redir } = splitRedirect(part.tokens);
          let result = runCommand(argv, state, fs, hooks);
          if (redir && result.code === 0) {
            const matches = expandArg({ value: redir.target, quoted: redir.quoted }, state.cwd, fs);
            if (matches.length !== 1) throw syntax('redirect needs one target');
            const target = fs.normalize(matches[0], state.cwd);
            let prev = '';
            if (redir.append && fs.exists(target)) {
              const stat = fs.stat(target);
              if (stat.kind !== 'file') throw new FSError('EISDIR', target, `Is a directory: ${target}`);
              prev = String(fs.read(target));
              if (prev && !prev.endsWith('\n') && result.stdout) prev += '\n';
            }
            fs.write(target, prev + result.stdout);
            result = { ...result, stdout: '' };
          }
          if (result.clear) clear = true;
          stdout += result.stdout ? result.stdout + (result.stdout.endsWith('\n') ? '' : '\n') : '';
          stderr += result.stderr ? result.stderr + (result.stderr.endsWith('\n') ? '' : '\n') : '';
          code = result.code;
        } catch (error) {
          const message = error instanceof FSError ? error.message : (error.message || String(error));
          stderr += `${message}\n`;
          code = 1;
        }
      }
      return {
        stdout: stdout.replace(/\n$/, ''),
        stderr: stderr.replace(/\n$/, ''),
        code,
        clear,
        cwd: state.cwd,
      };
    } catch (error) {
      const message = error instanceof FSError ? error.message : (error.message || String(error));
      return { stdout: '', stderr: message, code: 1, cwd: state.cwd };
    }
  }

  return {
    exec,
    get cwd() { return state.cwd; },
    get history() { return state.history.slice(); },
  };
}
