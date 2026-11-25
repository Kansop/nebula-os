import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluate } from '../js/core/expr.js';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ~= ${expected}`);

test('arithmetic precedence and parentheses', () => {
  near(evaluate('2+3*4'), 14);
  near(evaluate('(2+3)*4'), 20);
  near(evaluate('-2^2'), -4);
  near(evaluate('2^3^2'), 512);
  near(evaluate('2^-2'), 0.25);
  near(evaluate('7%4'), 3);
});

test('scientific functions, constants, and factorial', () => {
  near(evaluate('sin(90)'), 1);
  near(evaluate('cos(0)'), 1);
  near(evaluate('sin(pi/2)', { deg: false }), 1);
  near(evaluate('log(100)'), 2);
  near(evaluate('ln(e)'), 1);
  near(evaluate('sqrt(144)'), 12);
  near(evaluate('5!'), 120);
  near(evaluate('(2+3)!'), 120);
  near(evaluate('abs(-3.5)'), 3.5);
});

test('rejects invalid expressions', () => {
  assert.throws(() => evaluate('1/0'));
  assert.throws(() => evaluate('(-1)!'));
  assert.throws(() => evaluate('sqrt(-1)'));
  assert.throws(() => evaluate('2+'));
  assert.throws(() => evaluate('nope(1)'));
});
