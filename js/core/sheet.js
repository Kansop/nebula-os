/** Spreadsheet formulas: cell refs, ranges, SUM, AVERAGE, IF, and VLOOKUP. */

const OPS = new Set(['+', '-', '*', '/', '=', '<>', '<', '>', '<=', '>=']);

export function columnName(index) {
  let n = index + 1;
  let name = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

export function parseAddress(text) {
  const match = /^\$?([A-Z]+)\$?(\d+)$/i.exec(String(text || '').trim());
  if (!match) return null;
  let col = 0;
  for (const char of match[1].toUpperCase()) col = col * 26 + (char.charCodeAt(0) - 64);
  const row = Number(match[2]);
  if (!row) return null;
  return { col: col - 1, row: row - 1, key: `${match[1].toUpperCase()}${row}` };
}

export function rangeKeys(range) {
  const [start, end] = String(range).split(':');
  const a = parseAddress(start);
  const b = parseAddress(end || start);
  if (!a || !b) throw new Error(`Bad range ${range}`);
  const keys = [];
  for (let row = Math.min(a.row, b.row); row <= Math.max(a.row, b.row); row += 1) {
    for (let col = Math.min(a.col, b.col); col <= Math.max(a.col, b.col); col += 1) {
      keys.push(`${columnName(col)}${row + 1}`);
    }
  }
  return keys;
}

export function formatSheet(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '#ERR';
    const rounded = Math.round(value * 1e10) / 1e10;
    return String(rounded);
  }
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (value == null) return '';
  return String(value);
}

export function evalCell(cells, key, stack = new Set()) {
  const raw = cells[key] == null ? '' : String(cells[key]);
  if (!raw.startsWith('=')) return coerce(raw);
  if (stack.has(key)) throw new Error(`Circular reference at ${key}`);
  stack.add(key);
  try {
    return evaluateFormula(cells, raw.slice(1), stack);
  } finally {
    stack.delete(key);
  }
}

export function evaluateFormula(cells, source, stack = new Set()) {
  const tokens = lex(source);
  let index = 0;
  const peek = () => tokens[index];
  const eat = () => tokens[index++];

  function parseComparison() {
    let left = parseAdd();
    const op = peek();
    if (op && op.k === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(op.v)) {
      eat();
      const right = parseAdd();
      return compare(left, right, op.v);
    }
    return left;
  }
  function parseAdd() {
    let left = parseMul();
    while (peek() && peek().k === 'op' && (peek().v === '+' || peek().v === '-')) {
      const op = eat().v;
      const right = num(parseMul());
      left = op === '+' ? num(left) + right : num(left) - right;
    }
    return left;
  }
  function parseMul() {
    let left = parseUnary();
    while (peek() && peek().k === 'op' && (peek().v === '*' || peek().v === '/')) {
      const op = eat().v;
      const right = num(parseUnary());
      if (op === '/' && right === 0) throw new Error('Division by zero');
      left = op === '*' ? num(left) * right : num(left) / right;
    }
    return left;
  }
  function parseUnary() {
    if (peek()?.v === '-') {
      eat();
      return -num(parseUnary());
    }
    return parsePrimary();
  }
  function parsePrimary() {
    const token = peek();
    if (!token) throw new Error('Missing value');
    if (token.k === 'num') { eat(); return token.n; }
    if (token.k === 'str') { eat(); return token.v; }
    if (token.v === '(') {
      eat();
      const value = parseComparison();
      if (peek()?.v !== ')') throw new Error('Missing )');
      eat();
      return value;
    }
    if (token.k === 'id') {
      eat();
      const name = token.v.toUpperCase();
      if (name === 'TRUE') return true;
      if (name === 'FALSE') return false;
      if (peek()?.v !== '(') throw new Error(`Unknown name ${name}`);
      eat();
      if (name === 'VLOOKUP') return vlookup();
      const args = parseArgs();
      if (name === 'SUM') return flatten(args).reduce((sum, value) => sum + num(value), 0);
      if (name === 'AVERAGE') {
        const values = flatten(args);
        if (!values.length) throw new Error('AVERAGE of empty range');
        return values.reduce((sum, value) => sum + num(value), 0) / values.length;
      }
      if (name === 'IF') {
        const [cond, yes, no] = args;
        return truthy(cond) ? (yes ?? '') : (no ?? '');
      }
      throw new Error(`Unknown function ${name}`);
    }
    if (token.k === 'ref') return cellOrRange();
    throw new Error('Bad formula');
  }
  function parseArgs() {
    const args = [];
    if (peek()?.v === ')') { eat(); return args; }
    args.push(parseArg());
    while (peek()?.v === ',') {
      eat();
      args.push(parseArg());
    }
    if (peek()?.v !== ')') throw new Error('Missing )');
    eat();
    return args;
  }
  function parseArg() {
    if (peek()?.k === 'ref' && tokens[index + 1]?.v === ':') return cellOrRange();
    return parseComparison();
  }
  function cellOrRange() {
    const start = eat();
    if (start.k !== 'ref') throw new Error('Expected cell');
    if (peek()?.v === ':') {
      eat();
      const end = eat();
      if (end?.k !== 'ref') throw new Error('Expected cell');
      return rangeKeys(`${start.v}:${end.v}`).map((key) => evalCell(cells, key, stack));
    }
    return evalCell(cells, start.v, stack);
  }
  function vlookup() {
    const key = parseComparison();
    if (peek()?.v !== ',') throw new Error('VLOOKUP needs a range');
    eat();
    const start = eat();
    if (start?.k !== 'ref' || peek()?.v !== ':') throw new Error('VLOOKUP range');
    eat();
    const end = eat();
    if (end?.k !== 'ref') throw new Error('VLOOKUP range');
    if (peek()?.v !== ',') throw new Error('VLOOKUP column');
    eat();
    const column = num(parseComparison());
    if (peek()?.v !== ')') throw new Error('Missing )');
    eat();
    const a = parseAddress(start.v);
    const b = parseAddress(end.v);
    const col = a.col + column - 1;
    if (column < 1 || col > Math.max(a.col, b.col)) throw new Error('VLOOKUP column');
    for (let row = Math.min(a.row, b.row); row <= Math.max(a.row, b.row); row += 1) {
      const found = evalCell(cells, `${columnName(a.col)}${row + 1}`, stack);
      if (same(found, key)) return evalCell(cells, `${columnName(col)}${row + 1}`, stack);
    }
    throw new Error('VLOOKUP miss');
  }

  const value = parseComparison();
  if (peek()) throw new Error('Unexpected input');
  return value;
}

function lex(source) {
  const tokens = [];
  let i = 0;
  while (i < source.length) {
    const char = source[i];
    if (/\s/.test(char)) { i += 1; continue; }
    if (char === '"') {
      let text = '';
      i += 1;
      while (i < source.length && source[i] !== '"') text += source[i++];
      if (source[i] !== '"') throw new Error('Unclosed string');
      i += 1;
      tokens.push({ k: 'str', v: text });
      continue;
    }
    if (/[0-9.]/.test(char)) {
      let text = char;
      i += 1;
      while (i < source.length && /[0-9.]/.test(source[i])) text += source[i++];
      tokens.push({ k: 'num', n: Number(text), v: text });
      continue;
    }
    if (/[A-Za-z]/.test(char)) {
      let text = char;
      i += 1;
      while (i < source.length && /[A-Za-z]/.test(source[i])) text += source[i++];
      let j = i;
      while (j < source.length && source[j] === '$') j += 1;
      if (/[0-9]/.test(source[j] || '')) {
        while (j < source.length && /[0-9]/.test(source[j])) j += 1;
        const addr = parseAddress(source.slice(i - text.length, j).replaceAll('$', ''));
        if (addr) {
          tokens.push({ k: 'ref', v: addr.key });
          i = j;
          continue;
        }
      }
      tokens.push({ k: 'id', v: text });
      i += 0;
      continue;
    }
    const two = source.slice(i, i + 2);
    if (two === '<=' || two === '>=' || two === '<>') {
      tokens.push({ k: 'op', v: two });
      i += 2;
      continue;
    }
    if (OPS.has(char) || '():,'.includes(char)) {
      tokens.push({ k: char === '(' || char === ')' || char === ',' || char === ':' ? 'op' : 'op', v: char === ':' ? ':' : char });
      i += 1;
      continue;
    }
    throw new Error(`Unexpected ${char}`);
  }
  return tokens;
}

function coerce(raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return '';
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  if (/^true$/i.test(text)) return true;
  if (/^false$/i.test(text)) return false;
  return text;
}

function num(value) {
  if (Array.isArray(value)) throw new Error('Range where a value was expected');
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === '' || value == null) return 0;
  const n = Number(value);
  if (Number.isFinite(n) && String(value).trim() !== '') return n;
  throw new Error(`Not a number: ${value}`);
}

function flatten(args) {
  const out = [];
  for (const arg of args) {
    if (Array.isArray(arg)) out.push(...arg);
    else out.push(arg);
  }
  return out.filter((value) => value !== '');
}

function truthy(value) {
  if (Array.isArray(value)) throw new Error('Range where a value was expected');
  return Boolean(value);
}

function same(a, b) {
  if (typeof a === 'number' || typeof b === 'number') {
    const left = Number(a);
    const right = Number(b);
    if (Number.isFinite(left) && Number.isFinite(right)) return left === right;
  }
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function compare(left, right, op) {
  if (typeof left === 'number' || typeof right === 'number') {
    const a = num(left);
    const b = num(right);
    if (op === '=') return a === b;
    if (op === '<>') return a !== b;
    if (op === '<') return a < b;
    if (op === '>') return a > b;
    if (op === '<=') return a <= b;
    return a >= b;
  }
  const a = String(left);
  const b = String(right);
  if (op === '=') return a === b;
  if (op === '<>') return a !== b;
  if (op === '<') return a < b;
  if (op === '>') return a > b;
  if (op === '<=') return a <= b;
  return a >= b;
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const src = String(text || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i += 1) {
    const char = src[i];
    if (quoted) {
      if (char === '"' && src[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (char !== '\r') cell += char;
  }
  row.push(cell);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows;
}

export function cellsFromCsv(text) {
  const cells = {};
  parseCsv(text).forEach((row, r) => {
    row.forEach((value, c) => {
      if (value !== '') cells[`${columnName(c)}${r + 1}`] = value;
    });
  });
  return cells;
}

export function cellsToCsv(cells, rows, cols) {
  const lines = [];
  for (let r = 0; r < rows; r += 1) {
    const values = [];
    for (let c = 0; c < cols; c += 1) {
      const raw = cells[`${columnName(c)}${r + 1}`] ?? '';
      const text = String(raw);
      values.push(/[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text);
    }
    lines.push(values.join(','));
  }
  return lines.join('\n');
}
