/** Snake. The step function is pure so it can be tested without a browser. */

import { el, recordScore } from '../core/util.js';

export function stepSnake(snake, dir, food, width, height) {
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  if (head.x < 0 || head.y < 0 || head.x >= width || head.y >= height) return { dead: true };
  if (snake.some((part) => part.x === head.x && part.y === head.y)) return { dead: true };
  const next = [head, ...snake];
  const ate = head.x === food.x && head.y === food.y;
  if (!ate) next.pop();
  return { snake: next, ate, dead: false };
}

export const snakeApp = {
  id: 'snake',
  name: 'Snake',
  blurb: 'Steer, eat, and do not bite yourself',
  category: 'games',
  width: 560,
  height: 640,
  launch(env) {
    const size = 20;
    let snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
    let dir = { x: 1, y: 0 };
    let queued = dir;
    let food = spawn(snake, size);
    let score = 0;
    let dead = false;
    let paused = false;
    let tickMs = 150;
    const root = el('div', { class: 'game snake' });
    const hud = el('div', { class: 'hud' });
    const scoreEl = el('strong', { text: '0' });
    const bestEl = el('span', { class: 'muted', text: `Best ${env.settings.get('gameScores')?.snake || 0}` });
    const pauseBtn = el('button', { class: 'btn btn-sm', type: 'button', text: 'Pause' });
    const again = el('button', { class: 'btn btn-sm', type: 'button', text: 'Restart' });
    hud.append(el('span', { text: 'Score ' }, [scoreEl]), bestEl, pauseBtn, again);
    const canvas = el('canvas', { class: 'game-canvas', width: '400', height: '400' });
    const pad = dpad((next) => queue(next));
    root.append(hud, canvas, pad);
    env.win.body.append(root);
    const ctx = canvas.getContext('2d');

    function queue(next) {
      if (next.x === -dir.x && next.y === -dir.y) return;
      queued = next;
    }
    function draw() {
      ctx.clearRect(0, 0, 400, 400);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(0, 0, 400, 400);
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(food.x * 20 + 2, food.y * 20 + 2, 16, 16);
      snake.forEach((part, i) => {
        ctx.fillStyle = i === 0 ? '#f8fafc' : '#34d399';
        ctx.fillRect(part.x * 20 + 1, part.y * 20 + 1, 18, 18);
      });
      if (dead || paused) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, 400, 400);
        ctx.fillStyle = '#fff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(dead ? 'Game over' : 'Paused', 200, 200);
      }
    }
    function step() {
      if (dead || paused) return;
      dir = queued;
      const result = stepSnake(snake, dir, food, size, size);
      if (result.dead) {
        dead = true;
        const best = recordScore(env.settings, 'snake', score);
        bestEl.textContent = `Best ${best.best}`;
        if (best.improved) env.notify({ title: 'Snake', body: `New best: ${score}`, app: 'snake' });
        draw();
        return;
      }
      snake = result.snake;
      if (result.ate) {
        score += 10;
        scoreEl.textContent = String(score);
        food = spawn(snake, size);
        if (score % 40 === 0) tickMs = Math.max(70, tickMs - 12);
      }
      draw();
    }
    function restart() {
      snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
      dir = { x: 1, y: 0 };
      queued = dir;
      food = spawn(snake, size);
      score = 0;
      dead = false;
      paused = false;
      tickMs = 150;
      scoreEl.textContent = '0';
      draw();
    }
    let acc = 0;
    let last = performance.now();
    let frame;
    const loop = (now) => {
      acc += now - last;
      last = now;
      while (acc >= tickMs) { step(); acc -= tickMs; }
      frame = requestAnimationFrame(loop);
    };
    pauseBtn.addEventListener('click', () => { paused = !paused; pauseBtn.textContent = paused ? 'Resume' : 'Pause'; draw(); });
    again.addEventListener('click', restart);
    env.win.el.addEventListener('keydown', (event) => {
      const map = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } };
      if (map[event.key]) { event.preventDefault(); queue(map[event.key]); }
      if (event.key === ' ') { event.preventDefault(); pauseBtn.click(); }
    });
    swipe(canvas, (next) => queue(next));
    env.win.focus();
    frame = requestAnimationFrame(loop);
    env.win.onClose(() => cancelAnimationFrame(frame));
    draw();
  },
};

function spawn(snake, size) {
  let spot = { x: 0, y: 0 };
  do {
    spot = { x: Math.floor(Math.random() * size), y: Math.floor(Math.random() * size) };
  } while (snake.some((part) => part.x === spot.x && part.y === spot.y));
  return spot;
}

export function dpad(onDir) {
  const pad = el('div', { class: 'dpad' });
  for (const [label, dir] of [['↑', { x: 0, y: -1 }], ['←', { x: -1, y: 0 }], ['↓', { x: 0, y: 1 }], ['→', { x: 1, y: 0 }]]) {
    const btn = el('button', { class: 'btn', type: 'button', text: label });
    btn.addEventListener('pointerdown', (event) => { event.preventDefault(); onDir(dir); });
    pad.append(btn);
  }
  return pad;
}

export function swipe(node, onDir) {
  let start = null;
  node.addEventListener('pointerdown', (event) => { start = { x: event.clientX, y: event.clientY }; });
  node.addEventListener('pointerup', (event) => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.hypot(dx, dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) onDir({ x: dx > 0 ? 1 : -1, y: 0 });
    else onDir({ x: 0, y: dy > 0 ? 1 : -1 });
  });
}
