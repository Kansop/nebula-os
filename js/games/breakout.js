/** Breakout with a paddle, bricks, and more than one level. */

import { el, recordScore } from '../core/util.js';

export const breakoutApp = {
  id: 'breakout',
  name: 'Breakout',
  blurb: 'Clear the bricks',
  category: 'games',
  width: 560,
  height: 680,
  launch(env) {
    const canvas = el('canvas', { class: 'game-canvas', width: '480', height: '560' });
    const hud = el('div', { class: 'hud' });
    const scoreEl = el('strong', { text: '0' });
    const livesEl = el('span', { text: 'Lives 3' });
    const again = el('button', { class: 'btn btn-sm', type: 'button', text: 'Restart' });
    hud.append(el('span', { text: 'Score ' }, [scoreEl]), livesEl, again);
    const root = el('div', { class: 'game breakout' });
    root.append(hud, canvas, el('p', { class: 'muted game-help', text: 'Move with the pointer, or the left and right arrow keys.' }));
    env.win.body.append(root);
    const ctx = canvas.getContext('2d');
    const state = reset(1);
    let frame;
    let recorded = false;

    function loop() {
      if (!state.over && !state.wait) {
        const remaining = state.bricks.filter((brick) => !brick.gone).length;
        step(state);
        const left = state.bricks.filter((brick) => !brick.gone).length;
        if (!state.over && remaining > 0 && left === 0) {
          env.notify({ title: 'Breakout', body: `Level ${state.level} cleared`, app: 'breakout' });
          const next = reset(state.level + 1);
          next.score = state.score;
          next.lives = state.lives;
          Object.assign(state, next);
        }
        if (state.over && !recorded) {
          recorded = true;
          recordScore(env.settings, 'breakout', state.score);
        }
      }
      draw(ctx, state);
      scoreEl.textContent = String(state.score);
      livesEl.textContent = state.over ? 'Game over' : `Lives ${state.lives} · Level ${state.level}`;
      frame = requestAnimationFrame(loop);
    }
    canvas.addEventListener('pointermove', (event) => {
      const rect = canvas.getBoundingClientRect();
      state.px = ((event.clientX - rect.left) / rect.width) * canvas.width;
    });
    canvas.addEventListener('pointerdown', () => { state.wait = false; });
    env.win.el.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); state.px -= 24; state.wait = false; }
      if (event.key === 'ArrowRight') { event.preventDefault(); state.px += 24; state.wait = false; }
    });
    again.addEventListener('click', () => {
      recorded = false;
      Object.assign(state, reset(1));
    });
    env.win.focus();
    frame = requestAnimationFrame(loop);
    env.win.onClose(() => cancelAnimationFrame(frame));
  },
};

function reset(level) {
  return {
    level,
    score: 0,
    lives: 3,
    px: 240,
    ball: { x: 240, y: 460, vx: 3.1 + level * 0.35, vy: -(3.4 + level * 0.25) },
    bricks: makeBricks(level),
    over: false,
    paused: false,
    wait: true,
  };
}

function makeBricks(level) {
  const bricks = [];
  const rows = Math.min(8, 4 + level);
  const cols = 8;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      bricks.push({ x: 24 + x * 56, y: 40 + y * 22, w: 52, h: 16, gone: false, hue: (y * 40 + level * 20) % 360 });
    }
  }
  return bricks;
}

function step(state) {
  const ball = state.ball;
  state.px = Math.max(36, Math.min(444, state.px));
  ball.x += ball.vx;
  ball.y += ball.vy;
  if (ball.x < 8 || ball.x > 472) ball.vx *= -1;
  if (ball.y < 8) ball.vy *= -1;
  if (ball.y > 530 && ball.vy > 0 && Math.abs(ball.x - state.px) < 48 && ball.y < 548) {
    ball.vy = -Math.abs(ball.vy);
    ball.vx += (ball.x - state.px) / 18;
  } else if (ball.y > 560) {
    state.lives -= 1;
    if (state.lives <= 0) state.over = true;
    else {
      ball.x = state.px;
      ball.y = 460;
      ball.vx = Math.sign(ball.vx || 1) * (3 + state.level * 0.3);
      ball.vy = -(3.4 + state.level * 0.2);
      state.wait = true;
    }
  }
  for (const brick of state.bricks) {
    if (brick.gone) continue;
    if (ball.x > brick.x && ball.x < brick.x + brick.w && ball.y > brick.y && ball.y < brick.y + brick.h) {
      brick.gone = true;
      ball.vy *= -1;
      state.score += 10 * state.level;
      break;
    }
  }
}

function draw(ctx, state) {
  ctx.clearRect(0, 0, 480, 560);
  for (const brick of state.bricks) {
    if (brick.gone) continue;
    ctx.fillStyle = `hsl(${brick.hue} 70% 58%)`;
    ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
  }
  ctx.fillStyle = '#e8eaf4';
  ctx.fillRect(state.px - 36, 532, 72, 10);
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, 7, 0, Math.PI * 2);
  ctx.fill();
  if (state.wait && !state.over) {
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Click or press an arrow to serve', 240, 300);
  }
}
