/** Spreadsheet with formulas, a bar chart, and CSV import/export. */

import { cellsFromCsv, cellsToCsv, columnName, evalCell, formatSheet } from '../core/sheet.js';
import { el } from '../core/util.js';

const ROWS = 24;
const COLS = 10;

export const sheetApp = {
  id: 'sheet',
  name: 'Sheets',
  blurb: 'Formulas, charts, and CSV',
  category: 'productivity',
  width: 980,
  height: 640,
  launch(env) {
    const cells = {};
    let current = 'A1';
    let file = env.params.path || '';
    const root = el('div', { class: 'sheet' });
    const bar = el('div', { class: 'toolbar' });
    const name = el('span', { class: 'grow', text: 'Untitled sheet' });
    const formula = el('input', { class: 'field', 'aria-label': 'Formula' });
    const chartBtn = el('button', { class: 'btn btn-sm', type: 'button', text: 'Chart' });
    const csvBtn = el('button', { class: 'btn btn-sm', type: 'button', text: 'Import CSV' });
    const exportBtn = el('button', { class: 'btn btn-sm', type: 'button', text: 'Export CSV' });
    const saveBtn = el('button', { class: 'btn btn-sm btn-primary', type: 'button', text: 'Save' });
    bar.append(name, formula, chartBtn, csvBtn, exportBtn, saveBtn);
    const chart = el('canvas', { class: 'sheet-chart hidden', width: '640', height: '160' });
    const grid = el('div', { class: 'sheet-grid', role: 'grid' });
    root.append(bar, chart, grid);
    env.win.body.append(root);

    function load(path) {
      file = path;
      Object.keys(cells).forEach((key) => delete cells[key]);
      const text = String(env.fs.read(path));
      const parsed = path.endsWith('.csv') ? cellsFromCsv(text) : JSON.parse(text || '{}').cells || {};
      Object.assign(cells, parsed);
      name.textContent = path.split('/').pop();
      env.win.setTitle(name.textContent);
      render();
    }
    function display(key) {
      try { return formatSheet(evalCell(cells, key)); }
      catch { return '#ERR'; }
    }
    function render() {
      grid.innerHTML = '';
      grid.append(el('div', { class: 'sheet-corner' }));
      for (let c = 0; c < COLS; c += 1) grid.append(el('div', { class: 'sheet-col', text: columnName(c) }));
      for (let r = 1; r <= ROWS; r += 1) {
        grid.append(el('div', { class: 'sheet-row', text: String(r) }));
        for (let c = 0; c < COLS; c += 1) {
          const key = `${columnName(c)}${r}`;
          const cell = el('button', { class: `sheet-cell${key === current ? ' selected' : ''}`, type: 'button', text: display(key) });
          cell.addEventListener('click', () => select(key));
          grid.append(cell);
        }
      }
      formula.value = cells[current] ?? '';
    }
    function select(key) {
      current = key;
      formula.value = cells[current] ?? '';
      render();
      formula.focus();
    }
    function commit() {
      const value = formula.value;
      if (value === '') delete cells[current];
      else cells[current] = value;
      render();
    }
    formula.addEventListener('change', commit);
    formula.addEventListener('keydown', (event) => { if (event.key === 'Enter') commit(); });
    chartBtn.addEventListener('click', () => {
      chart.classList.toggle('hidden');
      if (!chart.classList.contains('hidden')) drawChart(chart, cells);
    });
    csvBtn.addEventListener('click', async () => {
      const path = await env.files.open({ title: 'Import CSV', start: '/Home/Documents', filter: (entry) => entry.name.endsWith('.csv') });
      if (path) load(path);
    });
    exportBtn.addEventListener('click', () => {
      const csv = cellsToCsv(cells, ROWS, COLS);
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (name.textContent || 'sheet').replace(/\.sheet$/i, '') + '.csv';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    saveBtn.addEventListener('click', save);
    const off = env.bus.on('save', (id) => { if (id === env.win.id) save(); });
    env.win.onClose(off);
    async function save() {
      let path = file && file.endsWith('.sheet') ? file : '';
      if (!path) {
        path = await env.files.save({ title: 'Save sheet', start: '/Home/Documents', name: 'Budget.sheet' });
        if (!path) return;
        if (!path.endsWith('.sheet')) path += '.sheet';
      }
      env.fs.write(path, JSON.stringify({ cells }), 'application/json');
      file = path;
      name.textContent = path.split('/').pop();
      env.notify({ title: 'Sheet saved', body: name.textContent, app: 'sheet' });
    }
    if (file && env.fs.exists(file)) load(file);
    else {
      Object.assign(cells, { A1: 'Item', B1: 'Amount', A2: 'Orbit', B2: '12', A3: 'Dock', B3: '8', B4: '=SUM(B2:B3)' });
      render();
    }
  },
};

function drawChart(canvas, cells) {
  const ctx = canvas.getContext('2d');
  const values = [];
  for (let row = 2; row <= 8; row += 1) {
    try {
      const value = evalCell(cells, `B${row}`);
      if (typeof value === 'number') values.push({ label: String(cells[`A${row}`] || row), value });
    } catch { /* skip errors */ }
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!values.length) return;
  const max = Math.max(...values.map((item) => item.value), 1);
  const gap = canvas.width / values.length;
  values.forEach((item, index) => {
    const h = (item.value / max) * (canvas.height - 28);
    ctx.fillStyle = '#7c6bff';
    ctx.fillRect(index * gap + 16, canvas.height - 20 - h, gap - 28, h);
    ctx.fillStyle = '#445';
    ctx.font = '12px sans-serif';
    ctx.fillText(item.label.slice(0, 10), index * gap + 16, canvas.height - 6);
  });
}
