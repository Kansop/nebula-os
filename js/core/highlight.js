/** Small JavaScript highlighter. Output is escaped HTML. */

const KEYWORDS = new Set(`break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new return static super switch this throw try typeof var void while with yield await of true false null undefined`.split(' '));

function esc(value) {
  return value.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

export function highlightJS(code) {
  const src = String(code ?? '');
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      let j = i + 2;
      while (j < src.length && src[j] !== '\n') j += 1;
      out += `<span class="tok-com">${esc(src.slice(i, j))}</span>`;
      i = j;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      const j = end < 0 ? src.length : end + 2;
      out += `<span class="tok-com">${esc(src.slice(i, j))}</span>`;
      i = j;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === c) { j += 1; break; }
        if (c !== '`' && src[j] === '\n') break;
        j += 1;
      }
      out += `<span class="tok-str">${esc(src.slice(i, j))}</span>`;
      i = j;
      continue;
    }
    if (/[0-9]/.test(c) && (i === 0 || !/[A-Za-z0-9_$]/.test(src[i - 1]))) {
      let j = i + 1;
      while (j < src.length && /[0-9a-fxA-F._]/.test(src[j])) j += 1;
      out += `<span class="tok-num">${esc(src.slice(i, j))}</span>`;
      i = j;
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[A-Za-z0-9_$]/.test(src[j])) j += 1;
      const word = src.slice(i, j);
      out += `<span class="${KEYWORDS.has(word) ? 'tok-kw' : 'tok-id'}">${esc(word)}</span>`;
      i = j;
      continue;
    }
    out += esc(c);
    i += 1;
  }
  if (!out.endsWith('\n')) out += '\n';
  return out;
}
