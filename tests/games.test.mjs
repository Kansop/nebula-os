import assert from 'node:assert/strict';
import test from 'node:test';
import { moveGrid, slideRow, hasMove, spawnTile } from '../js/games/g2048.js';
import { placeMines } from '../js/games/mines.js';
import { stepSnake } from '../js/games/snake.js';
import { rotateCW } from '../js/games/tetris.js';
import { APPS } from '../js/core/registry.js';

test('every app has a unique id and a launch function', () => {
  const ids = APPS.map((app) => app.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const app of APPS) {
    assert.equal(typeof app.launch, 'function');
    assert.ok(app.name);
  }
  for (const id of ['files', 'editor', 'code', 'terminal', 'calc', 'paint', 'notes', 'calendar', 'clock', 'music', 'viewer', 'settings', 'tasks', 'browser', 'weather', 'snake', 'tetris', 'mines', 'g2048', 'solitaire', 'breakout']) {
    assert.ok(ids.includes(id), id);
  }
});

test('2048 slides and merges toward the chosen edge', () => {
  const left = moveGrid([[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'left');
  assert.deepEqual(left.grid[0], [4, 0, 0, 0]);
  assert.equal(left.score, 4);
  const right = moveGrid([[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'right');
  assert.deepEqual(right.grid[0], [0, 0, 0, 4]);
  const up = moveGrid([[2, 0, 0, 0], [2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'up');
  assert.equal(up.grid[0][0], 4);
  assert.equal(up.grid[1][0], 0);
  assert.deepEqual(slideRow([4, 0, 4, 4]).row, [8, 4, 0, 0]);
});

test('2048 refuses a stuck board and can spawn into an empty cell', () => {
  const stuck = [
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 2],
  ];
  assert.equal(hasMove(stuck), false);
  const spawned = spawnTile([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], () => 0);
  assert.equal(spawned[0][0], 2);
});

test('snake grows when it eats and dies on a wall', () => {
  const snake = [{ x: 1, y: 1 }, { x: 0, y: 1 }];
  const ate = stepSnake(snake, { x: 1, y: 0 }, { x: 2, y: 1 }, 8, 8);
  assert.equal(ate.ate, true);
  assert.equal(ate.snake.length, 3);
  const dead = stepSnake(snake, { x: -1, y: 0 }, { x: 4, y: 4 }, 8, 8);
  assert.equal(dead.dead, true);
});

test('mines keep the first click and its neighbors clear', () => {
  let n = 0;
  const rng = () => {
    n += 1;
    return ((n * 37) % 97) / 97;
  };
  const { mines, counts } = placeMines(9, 9, 10, 4, 4, rng);
  for (let y = 3; y <= 5; y += 1) {
    for (let x = 3; x <= 5; x += 1) assert.equal(mines.has(y * 9 + x), false);
  }
  assert.equal(mines.size, 10);
  assert.equal(counts[4][4] >= 0, true);
});

test('blocks rotate clockwise', () => {
  assert.deepEqual(rotateCW([[1, 1, 1, 1]]), [[1], [1], [1], [1]]);
  assert.deepEqual(rotateCW([[0, 1, 0], [1, 1, 1]]), [[1, 0], [1, 1], [1, 0]]);
});
