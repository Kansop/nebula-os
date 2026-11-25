/** 2048. Sliding is pure so the rules can be tested headlessly. */

import { el, recordScore } from '../core/util.js';
import { swipe } from './snake.js';

export function slideRow(row) {
  const nums = row.filter(Boolean);
  const out = [];
  let score = 0;
  for (let i = 0; i < nums.length; i += 1) {
    if (nums[i] === nums[i + 1]) {
      const value = nums[i] * 2;
      out.push(value);
      score += value;
      i += 1;
    } else out.push(nums[i]);
  }
  while (out.length < row.length) out.push(0);
  return { row: out, score };
}

export function moveGrid(grid, dir) {
  const size = grid.length;
  const next = grid.map((row) => row.slice());
  let score = 0;
  let changed = false;
  const read = (i, j) => {
    if (dir === 'left') return grid[i][j];
    if (dir === 'right') return grid[i][size - 1 - j];
    if (dir === 'up') return grid[j][i];
    return grid[size - 1 - j][i];
  };
  const write = (i, j, value) => {
    if (dir === 'left') next[i][j] = value;
    else if (dir === 'right') next[i][size - 1 - j] = value;
    else if (dir === 'up') next[j][i] = value;
    else next[size - 1 - j][i] = value;
  };
  for (let i = 0; i < size; i += 1) {
    const row = Array.from({ length: size }, (_, j) => read(i, j));
    const slid = slideRow(row);
    score += slid.score;
    for (let j = 0; j < size; j += 1) {
      if (slid.row[j] !== row[j]) changed = true;
      write(i, j, slid.row[j]);
    }
  }
  return { grid: next, score, changed };
}

export function hasMove(grid) {
  if (grid.some((row) => row.includes(0))) return true;
  return ['left', 'right', 'up', 'down'].some((dir) => moveGrid(grid, dir).changed);
}

export function spawnTile(grid, rng = Math.random) {
  const empty = [];
  grid.forEach((row, y) => row.forEach((value, x) => { if (!value) empty.push([x, y]); }));
  if (!empty.length) return grid;
  const [x, y] = empty[Math.floor(rng() * empty.length)];
  const next = grid.map((row) => row.slice());
  next[y][x] = rng() < 0.9 ? 2 : 4;
  return next;
}

export const g2048App = {
  id: 'g2048',
  name: '2048',
  blurb: 'Slide tiles and build 2048',
  category: 'games',
  width: 480,
  height: 640,
  launch(env) {
    let grid = spawnTile(spawnTile(empty()));
    let score = 0;
    let over = false;
    let won = false;
    const root = el('div', { class: 'game g2048' });
    const hud = el('div', { class: 'hud' });
    const scoreEl = el('strong', { text: '0' });
    const bestEl = el('span', { class: 'muted', text: `Best ${env.settings.get('gameScores')?.g2048 || 0}` });
    const again = el('button', { class: 'btn btn-sm', type: 'button', text: 'Restart' });
    hud.append(el('span', { text: 'Score ' }, [scoreEl]), bestEl, again);
    const board = el('div', { class: 'board-2048' });
    const note = el('div', { class: 'game-note' });
    const pad = el('div', { class: 'dpad' });
    root.append(hud, board, note, pad);
    env.win.body.append(root);

    function paint() {
      board.innerHTML = '';
      for (const row of grid) {
        for (const value of row) {
          const tile = el('div', { class: value ? `tile t${Math.min(value, 2048)}` : 'tile empty', text: value ? String(value) : '' });
          board.append(tile);
        }
      }
      scoreEl.textContent = String(score);
      note.textContent = over ? 'No more moves.' : won ? '2048. Keep going if you want.' : '';
    }
    function move(dir) {
      if (over) return;
      const result = moveGrid(grid, dir);
      if (!result.changed) return;
      grid = spawnTile(result.grid);
      score += result.score;
      if (!won && grid.some((row) => row.some((value) => value >= 2048))) {
        won = true;
        env.notify({ title: '2048', body: 'You built a 2048 tile.', app: 'g2048' });
      }
      if (!hasMove(grid)) {
        over = true;
        const best = recordScore(env.settings, 'g2048', score);
        bestEl.textContent = `Best ${best.best}`;
      }
      paint();
    }
    function restart() {
      grid = spawnTile(spawnTile(empty()));
      score = 0;
      over = false;
      won = false;
      paint();
    }
    for (const [label, dir] of [['↑', 'up'], ['←', 'left'], ['↓', 'down'], ['→', 'right']]) {
      const btn = el('button', { class: 'btn', type: 'button', text: label });
      btn.addEventListener('click', () => move(dir));
      pad.append(btn);
    }
    again.addEventListener('click', restart);
    env.win.el.addEventListener('keydown', (event) => {
      const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
      if (map[event.key]) { event.preventDefault(); move(map[event.key]); }
    });
    swipe(board, (dir) => {
      if (dir.x === 1) move('right');
      if (dir.x === -1) move('left');
      if (dir.y === 1) move('down');
      if (dir.y === -1) move('up');
    });
    env.win.focus();
    paint();
  },
};

function empty() {
  return Array.from({ length: 4 }, () => Array(4).fill(0));
}
