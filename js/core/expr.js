/** Expression evaluator for the Calculator app. No eval(). */

const FUNCS = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log', 'sqrt', 'abs']);

export function evaluate(input, { deg = true } = {}) {
  const src = String(input ?? '')
    .trim()
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'pi');
  if (!src) throw new Error('Empty expression');
  const tokens = lex(src);
  let i = 0;
  const peek = () => tokens[i];
  const eat = (k) => {
    const t = tokens[i];
    if (!t || (k && t.k !== k && t.v !== k)) throw new Error('Syntax error');
    i += 1;
    return t;
  };

  function parseExpr() {
    let left = parseMul();
    while (peek() && (peek().v === '+' || peek().v === '-')) {
      const op = eat().v;
      const right = parseMul();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseMul() {
    let left = parseUnary();
    while (peek() && (peek().v === '*' || peek().v === '/' || peek().v === '%')) {
      const op = eat().v;
      const right = parseUnary();
      if (op === '*') left *= right;
      else if (op === '/') {
        if (right === 0) throw new Error('Division by zero');
        left /= right;
      } else {
        if (right === 0) throw new Error('Division by zero');
        left %= right;
      }
    }
    return left;
  }

  function parseUnary() {
    if (peek()?.v === '-') {
      eat();
      return -parseUnary();
    }
    if (peek()?.v === '+') {
      eat();
      return parseUnary();
    }
    return parsePower();
  }

  function parsePower() {
    const base = parsePostfix();
    if (peek()?.v === '^') {
      eat();
      return base ** parseUnary();
    }
    return base;
  }

  function parsePostfix() {
    let value = parsePrimary();
    while (peek()?.v === '!') {
      eat();
      value = factorial(value);
    }
    return value;
  }

  function parsePrimary() {
    const t = peek();
    if (!t) throw new Error('Syntax error');
    if (t.k === 'num') {
      eat();
      return t.n;
    }
    if (t.k === 'id') {
      eat();
      const name = t.v;
      if (peek()?.v === '(') {
        if (!FUNCS.has(name)) throw new Error(`Unknown function ${name}`);
        eat('(');
        const arg = parseExpr();
        if (peek()?.v !== ')') throw new Error('Missing )');
        eat(')');
        return applyFunc(name, arg, deg);
      }
      if (name === 'pi' || name === 'π') return Math.PI;
      if (name === 'e') return Math.E;
      throw new Error(`Unknown name ${name}`);
    }
    if (t.v === '(') {
      eat();
      const v = parseExpr();
      if (peek()?.v !== ')') throw new Error('Missing )');
      eat(')');
      return v;
    }
    throw new Error('Syntax error');
  }

  const value = parseExpr();
  if (peek()) throw new Error('Syntax error');
  if (!Number.isFinite(value)) throw new Error('Not a number');
  return value;
}

function factorial(n) {
  if (!Number.isFinite(n) || n < 0 || Math.floor(n) !== n) throw new Error('Factorial needs a non-negative integer');
  if (n > 170) throw new Error('Factorial too large');
  let r = 1;
  for (let k = 2; k <= n; k += 1) r *= k;
  return r;
}

function applyFunc(name, x, deg) {
  const toRad = (v) => (deg ? (v * Math.PI) / 180 : v);
  const fromRad = (v) => (deg ? (v * 180) / Math.PI : v);
  switch (name) {
    case 'sin': return Math.sin(toRad(x));
    case 'cos': return Math.cos(toRad(x));
    case 'tan': return Math.tan(toRad(x));
    case 'asin': return fromRad(Math.asin(x));
    case 'acos': return fromRad(Math.acos(x));
    case 'atan': return fromRad(Math.atan(x));
    case 'ln':
      if (x <= 0) throw new Error('ln domain');
      return Math.log(x);
    case 'log':
      if (x <= 0) throw new Error('log domain');
      return Math.log10(x);
    case 'sqrt':
      if (x < 0) throw new Error('sqrt domain');
      return Math.sqrt(x);
    case 'abs': return Math.abs(x);
    default: throw new Error(`Unknown function ${name}`);
  }
}

function lex(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i += 1; continue; }
    if (/[0-9.]/.test(c)) {
      let s = c;
      i += 1;
      while (i < src.length && /[0-9.]/.test(src[i])) s += src[i++];
      if (s === '.' || s.split('.').length > 2) throw new Error('Bad number');
      tokens.push({ k: 'num', n: Number(s), v: s });
      continue;
    }
    if (/[a-z]/i.test(c)) {
      let s = c;
      i += 1;
      while (i < src.length && /[a-z]/i.test(src[i])) s += src[i++];
      tokens.push({ k: 'id', v: s.toLowerCase() });
      continue;
    }
    if ('+-*/%^!(),'.includes(c)) {
      tokens.push({ k: 'op', v: c });
      i += 1;
      continue;
    }
    throw new Error(`Unexpected ${c}`);
  }
  return tokens;
}

export function formatResult(n) {
  if (!Number.isFinite(n)) return 'Error';
  const abs = Math.abs(n);
  if (n !== 0 && (abs >= 1e12 || abs < 1e-8)) return n.toExponential(6).replace(/\.?0+e/, 'e');
  const rounded = Math.round(n * 1e12) / 1e12;
  return String(rounded);
}
