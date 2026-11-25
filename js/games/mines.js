/** Minesweeper. Mine placement is pure and keeps the first click safe. */

import { el, recordScore } from '../core/util.js';

export function placeMines(width, height, count, safeX, safeY, rng = Math.random) {
  const forbidden = new Set();
  for (let y = safeY - 1; y <= safeY + 1; y += 1) {
    for (let x = safeX - 1; x <= safeX + 1; x += 1) {
      if (x >= 0 && y >= 0 && x < width && y < height) forbidden.add(y * width + x);
    }
  }
  const mines = new Set();
  let guard = 0;
  while (mines.size < count && guard < width * height * 30) {
    guard += 1;
    const id = Math.floor(rng() * width * height);
    if (!forbidden.has(id)) mines.add(id);
  }
  const counts = Array.from({ length: height }, () => Array(width).fill(0));
  for (const id of mines) {
    const x = id % width;
    const y = Math.floor(id / width);
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (!mines.has(ny * width + nx)) counts[ny][nx] += 1;
      }
    }
  }
  return { mines, counts };
}

const LEVELS = [
  { id: 'easy', name: 'Easy', w: 9, h: 9, mines: 10 },
  { id: 'medium', name: 'Medium', w: 16, h: 16, mines: 40 },
];

export const minesApp = {
  id: 'mines',
  name: 'Mines',
  blurb: 'Clear the field, flag the mines',
  category: 'games',
  width: 640,
  height: 680,
  launch(env) {
    let level = LEVELS[0];
    let started = 0;
    let board = null;
    let open = [];
    let flags = [];
    let dead = false;
    let won = false;
    const root = el('div', { class: 'game mines' });
    const hud = el('div', { class: 'hud' });
    const mineEl = el('strong', { text: '10' });
    const timeEl = el('span', { text: '0s' });
    const again = el('button', { class: 'btn btn-sm', type: 'button', text: 'New' });
    hud.append(el('span', { text: 'Mines ' }, [mineEl]), timeEl, again);
    const seg = el('div', { class: 'seg' });
    const grid = el('div', { class: 'mine-grid' });
    root.append(hud, seg, grid);
    env.win.body.append(root);

    function reset(next = level) {
      level = next;
      board = null;
      open = Array.from({ length: level.h }, () => Array(level.w).fill(false));
      flags = Array.from({ length: level.h }, () => Array(level.w).fill(false));
      dead = false;
      won = false;
      started = 0;
      render();
    }
    function reveal(x, y) {
      if (dead || won || flags[y][x] || open[y][x]) return;
      if (!board) {
        board = placeMines(level.w, level.h, level.mines, x, y);
        started = Date.now();
      }
      const stack = [[x, y]];
      while (stack.length) {
        const [cx, cy] = stack.pop();
        if (cx < 0 || cy < 0 || cx >= level.w || cy >= level.h || open[cy][cx] || flags[cy][cx]) continue;
        open[cy][cx] = true;
        if (board.mines.has(cy * level.w + cx)) {
          dead = true;
          return;
        }
        if (board.counts[cy][cx] === 0) {
          for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) stack.push([cx + dx, cy + dy]);
        }
      }
      const safe = level.w * level.h - board.mines.size;
      const opened = open.flat().filter(Boolean).length;
      if (opened === safe) {
        won = true;
        const seconds = Math.floor((Date.now() - started) / 1000);
        recordScore(env.settings, `mines-${level.id}`, Math.max(0, 999 - seconds));
        env.notify({ title: 'Mines cleared', body: `${seconds}s on ${level.name}`, app: 'mines' });
      }
    }
    function toggleFlag(x, y) {
      if (dead || won || open[y][x]) return;
      flags[y][x] = !flags[y][x];
    }
    function render() {
      seg.innerHTML = '';
      for (const item of LEVELS) {
        const btn = el('button', { class: `seg-btn${item.id === level.id ? ' active' : ''}`, type: 'button', text: item.name });
        btn.addEventListener('click', () => reset(item));
        seg.append(btn);
      }
      const flagged = flags.flat().filter(Boolean).length;
      mineEl.textContent = String(Math.max(0, level.mines - flagged));
      timeEl.textContent = started && !dead ? `${Math.floor((Date.now() - started) / 1000)}s` : (won ? timeEl.textContent : '0s');
      grid.style.gridTemplateColumns = `repeat(${level.w}, 28px)`;
      grid.innerHTML = '';
      for (let y = 0; y < level.h; y += 1) {
        for (let x = 0; x < level.w; x += 1) {
          const cell = el('button', { class: 'mine', type: 'button' });
          const isMine = board?.mines.has(y * level.w + x);
          if (open[y][x]) {
            cell.classList.add('open');
            if (isMine) cell.classList.add('boom');
            else if (board.counts[y][x]) {
              cell.textContent = String(board.counts[y][x]);
              cell.dataset.n = String(board.counts[y][x]);
            }
          } else if (flags[y][x]) cell.textContent = '⚑';
          else if ((dead || won) && isMine) cell.textContent = '•';
          cell.addEventListener('click', () => { reveal(x, y); render(); });
          cell.addEventListener('contextmenu', (event) => { event.preventDefault(); toggleFlag(x, y); render(); });
          let hold;
          cell.addEventListener('pointerdown', () => { hold = setTimeout(() => { toggleFlag(x, y); render(); }, 450); });
          cell.addEventListener('pointerup', () => clearTimeout(hold));
          cell.addEventListener('pointerleave', () => clearTimeout(hold));
          grid.append(cell);
        }
      }
      if (dead) grid.append(el('div', { class: 'game-note', text: 'A mine went off. Press New.' }));
      if (won) grid.append(el('div', { class: 'game-note', text: 'Field cleared.' }));
    }
    again.addEventListener('click', () => reset());
    const timer = setInterval(() => { if (started && !dead && !won) timeEl.textContent = `${Math.floor((Date.now() - started) / 1000)}s`; }, 500);
    env.win.onClose(() => clearInterval(timer));
    reset();
  },
};
