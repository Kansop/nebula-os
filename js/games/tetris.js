/** Falling blocks. Rotation is exported for tests. */

import { el, recordScore } from '../core/util.js';
import { dpad } from './snake.js';

export const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
};

const COLORS = { I: '#22d3ee', O: '#fbbf24', T: '#a78bfa', S: '#34d399', Z: '#fb7185', J: '#60a5fa', L: '#fb923c' };

export function rotateCW(matrix) {
  const h = matrix.length;
  const w = matrix[0].length;
  const next = Array.from({ length: w }, () => Array(h).fill(0));
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) next[x][h - 1 - y] = matrix[y][x];
  }
  return next;
}

export const tetrisApp = {
  id: 'tetris',
  name: 'Blocks',
  blurb: 'Clear lines of falling blocks',
  category: 'games',
  width: 520,
  height: 680,
  launch(env) {
    const cols = 10;
    const rows = 20;
    let board = empty();
    let bag = [];
    let current = null;
    let score = 0;
    let lines = 0;
    let level = 1;
    let over = false;
    let paused = false;
    const root = el('div', { class: 'game tetris' });
    const hud = el('div', { class: 'hud' });
    const scoreEl = el('strong', { text: '0' });
    const meta = el('span', { class: 'muted', text: 'Lines 0 · Lv 1' });
    const pauseBtn = el('button', { class: 'btn btn-sm', type: 'button', text: 'Pause' });
    const again = el('button', { class: 'btn btn-sm', type: 'button', text: 'Restart' });
    hud.append(el('span', { text: 'Score ' }, [scoreEl]), meta, pauseBtn, again);
    const canvas = el('canvas', { class: 'game-canvas', width: '240', height: '480' });
    const controls = el('div', { class: 'inline' });
    const rot = el('button', { class: 'btn', type: 'button', text: 'Rotate' });
    const drop = el('button', { class: 'btn', type: 'button', text: 'Drop' });
    controls.append(rot, drop);
    root.append(hud, canvas, dpad((dir) => { if (dir.x) shift(dir.x); if (dir.y > 0) soft(); }), controls);
    env.win.body.append(root);
    const ctx = canvas.getContext('2d');

    function pull() {
      if (!bag.length) bag = shuffle(Object.keys(SHAPES));
      const name = bag.pop();
      return { name, shape: SHAPES[name].map((row) => row.slice()), x: 3, y: 0 };
    }
    function spawn() {
      current = pull();
      if (!fits(board, current.shape, current.x, current.y)) over = true;
    }
    function shift(dx) {
      if (over || paused || !current) return;
      if (fits(board, current.shape, current.x + dx, current.y)) current.x += dx;
      draw();
    }
    function rotate() {
      if (over || paused || !current || current.name === 'O') return;
      const turned = rotateCW(current.shape);
      for (const kick of [0, -1, 1, -2, 2]) {
        if (fits(board, turned, current.x + kick, current.y)) {
          current.shape = turned;
          current.x += kick;
          draw();
          return;
        }
      }
    }
    function soft() {
      if (over || paused || !current) return;
      if (fits(board, current.shape, current.x, current.y + 1)) {
        current.y += 1;
        score += 1;
      } else lock();
      draw();
    }
    function hard() {
      if (over || paused || !current) return;
      while (fits(board, current.shape, current.x, current.y + 1)) {
        current.y += 1;
        score += 2;
      }
      lock();
      draw();
    }
    function lock() {
      stamp(board, current);
      const cleared = clearLines(board);
      lines += cleared;
      score += [0, 100, 300, 500, 800][cleared] * level;
      level = 1 + Math.floor(lines / 10);
      scoreEl.textContent = String(score);
      meta.textContent = `Lines ${lines} · Lv ${level}`;
      spawn();
      if (over) {
        const best = recordScore(env.settings, 'tetris', score);
        if (best.improved) env.notify({ title: 'Blocks', body: `New best: ${score}`, app: 'tetris' });
      }
    }
    function draw() {
      ctx.clearRect(0, 0, 240, 480);
      const cell = 24;
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          if (!board[y][x]) continue;
          ctx.fillStyle = COLORS[board[y][x]];
          ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
        }
      }
      if (current) {
        let ghost = current.y;
        while (fits(board, current.shape, current.x, ghost + 1)) ghost += 1;
        drawPiece(current.shape, current.x, ghost, COLORS[current.name], 0.25);
        drawPiece(current.shape, current.x, current.y, COLORS[current.name], 1);
      }
      if (over || paused) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, 240, 480);
        ctx.fillStyle = '#fff';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(over ? 'Game over' : 'Paused', 120, 240);
      }
    }
    function drawPiece(shape, ox, oy, color, alpha) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      shape.forEach((row, y) => row.forEach((value, x) => {
        if (value) ctx.fillRect((ox + x) * 24 + 1, (oy + y) * 24 + 1, 22, 22);
      }));
      ctx.globalAlpha = 1;
    }
    function restart() {
      board = empty();
      bag = [];
      score = 0;
      lines = 0;
      level = 1;
      over = false;
      paused = false;
      scoreEl.textContent = '0';
      meta.textContent = 'Lines 0 · Lv 1';
      spawn();
      draw();
    }
    rot.addEventListener('click', rotate);
    drop.addEventListener('click', hard);
    pauseBtn.addEventListener('click', () => { if (!over) { paused = !paused; pauseBtn.textContent = paused ? 'Resume' : 'Pause'; draw(); } });
    again.addEventListener('click', restart);
    env.win.el.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); shift(-1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); shift(1); }
      if (event.key === 'ArrowDown') { event.preventDefault(); soft(); }
      if (event.key === 'ArrowUp') { event.preventDefault(); rotate(); }
      if (event.key === ' ') { event.preventDefault(); hard(); }
    });
    let acc = 0;
    let last = performance.now();
    let frame;
    const loop = (now) => {
      const wait = Math.max(90, 800 - (level - 1) * 70);
      acc += now - last;
      last = now;
      if (!paused && !over && acc >= wait) {
        acc = 0;
        soft();
      }
      frame = requestAnimationFrame(loop);
    };
    env.win.focus();
    spawn();
    draw();
    frame = requestAnimationFrame(loop);
    env.win.onClose(() => cancelAnimationFrame(frame));
  },
};

function empty() {
  return Array.from({ length: 20 }, () => Array(10).fill(null));
}
function fits(board, shape, ox, oy) {
  for (let y = 0; y < shape.length; y += 1) {
    for (let x = 0; x < shape[0].length; x += 1) {
      if (!shape[y][x]) continue;
      const nx = ox + x;
      const ny = oy + y;
      if (nx < 0 || nx >= 10 || ny >= 20) return false;
      if (ny >= 0 && board[ny][nx]) return false;
    }
  }
  return true;
}
function stamp(board, piece) {
  piece.shape.forEach((row, y) => row.forEach((value, x) => {
    if (value && piece.y + y >= 0) board[piece.y + y][piece.x + x] = piece.name;
  }));
}
function clearLines(board) {
  let cleared = 0;
  for (let y = board.length - 1; y >= 0; y -= 1) {
    if (board[y].every(Boolean)) {
      board.splice(y, 1);
      board.unshift(Array(10).fill(null));
      cleared += 1;
      y += 1;
    }
  }
  return cleared;
}
function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
