/** Standard and scientific calculator. The math lives in core/expr.js. */

import { evaluate, formatResult } from '../core/expr.js';
import { el } from '../core/util.js';

const STANDARD = [
  ['AC', '⌫', '%', '/'],
  ['7', '8', '9', '*'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['±', '0', '.', '='],
];

const SCIENCE = [
  ['sin', 'cos', 'tan', 'ln', 'log'],
  ['asin', 'acos', 'atan', 'sqrt', '^'],
  ['(', ')', 'pi', 'e', '!'],
];

export const calcApp = {
  id: 'calc',
  name: 'Calculator',
  blurb: 'Standard and scientific',
  category: 'productivity',
  width: 420,
  height: 620,
  minWidth: 320,
  minHeight: 480,
  launch(env) {
    let expr = '';
    let deg = true;
    let scientific = false;
    const root = el('div', { class: 'calc' });
    const modes = el('div', { class: 'seg' });
    const stdBtn = el('button', { class: 'seg-btn active', type: 'button', text: 'Standard' });
    const sciBtn = el('button', { class: 'seg-btn', type: 'button', text: 'Scientific' });
    const angle = el('button', { class: 'btn btn-sm', type: 'button', text: 'DEG' });
    modes.append(stdBtn, sciBtn, angle);
    const screen = el('div', { class: 'calc-screen' });
    const formula = el('div', { class: 'calc-expr', text: '' });
    const result = el('div', { class: 'calc-result', text: '0' });
    screen.append(formula, result);
    const science = el('div', { class: 'calc-science hidden' });
    const pad = el('div', { class: 'calc-pad' });
    root.append(modes, screen, science, pad);
    env.win.body.append(root);

    function preview() {
      formula.textContent = expr;
      if (!expr.trim()) {
        result.textContent = '0';
        return;
      }
      try { result.textContent = formatResult(evaluate(expr, { deg })); }
      catch { result.textContent = expr.endsWith('(') || /[+\-*/^%]$/.test(expr.trim()) ? '' : 'Error'; }
    }
    function push(token) {
      if (token === 'AC') expr = '';
      else if (token === '⌫') expr = expr.slice(0, -1);
      else if (token === '=') {
        try { expr = formatResult(evaluate(expr, { deg })); }
        catch { expr = ''; result.textContent = 'Error'; formula.textContent = ''; return; }
      } else if (token === '±') {
        if (expr.startsWith('-')) expr = expr.slice(1);
        else expr = `-${expr}`;
      } else if (token === '%') expr += '/100';
      else if (['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log', 'sqrt'].includes(token)) expr += `${token}(`;
      else expr += token;
      preview();
    }
    function grid(target, rows, cols) {
      target.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      target.innerHTML = '';
      for (const row of rows) {
        for (const key of row) {
          const btn = el('button', { class: `calc-key${'/*-+='.includes(key) || key === '/' ? ' op' : ''}${key === '=' ? ' eq' : ''}`, type: 'button', text: key });
          btn.addEventListener('click', () => push(key));
          target.append(btn);
        }
      }
    }
    function layout() {
      science.classList.toggle('hidden', !scientific);
      grid(science, SCIENCE, 5);
      grid(pad, STANDARD, 4);
    }
    stdBtn.addEventListener('click', () => {
      scientific = false;
      stdBtn.classList.add('active');
      sciBtn.classList.remove('active');
      layout();
    });
    sciBtn.addEventListener('click', () => {
      scientific = true;
      sciBtn.classList.add('active');
      stdBtn.classList.remove('active');
      layout();
    });
    angle.addEventListener('click', () => {
      deg = !deg;
      angle.textContent = deg ? 'DEG' : 'RAD';
      preview();
    });
    env.win.el.addEventListener('keydown', (event) => {
      if (event.target.matches('input, textarea')) return;
      const key = event.key;
      if (/^[0-9.+\-*/()^%!]$/.test(key)) push(key === '%' ? '%' : key);
      else if (key === 'Enter' || key === '=') { event.preventDefault(); push('='); }
      else if (key === 'Backspace') push('⌫');
      else if (key === 'Escape') push('AC');
      else if (key === 'p') push('pi');
    });
    layout();
    preview();
  },
};
