import assert from 'node:assert/strict';
import test from 'node:test';
import { cellsFromCsv, cellsToCsv, evalCell, formatSheet } from '../js/core/sheet.js';

const cells = {
  A1: '10',
  A2: '20',
  A3: '30',
  B1: 'pear',
  C1: '2',
  B2: 'apple',
  C2: '5',
  D1: '=A1+A2',
  D2: '=SUM(A1:A3)',
  D3: '=AVERAGE(A1:A2)',
  D4: '=IF(A1>5,"big","small")',
  D5: '=IF(A1>50,"big","small")',
  D6: '=VLOOKUP("pear",B1:C2,2)',
  D7: '=VLOOKUP("apple",B1:C2,2)',
};

test('spreadsheet formulas resolve refs, ranges, IF, and VLOOKUP', () => {
  assert.equal(evalCell(cells, 'D1'), 30);
  assert.equal(evalCell(cells, 'D2'), 60);
  assert.equal(evalCell(cells, 'D3'), 15);
  assert.equal(evalCell(cells, 'D4'), 'big');
  assert.equal(evalCell(cells, 'D5'), 'small');
  assert.equal(evalCell(cells, 'D6'), 2);
  assert.equal(evalCell(cells, 'D7'), 5);
  assert.equal(formatSheet(evalCell(cells, 'D2')), '60');
});

test('circular formulas fail instead of looping', () => {
  assert.throws(() => evalCell({ A1: '=B1', B1: '=A1' }, 'A1'));
});

test('csv round trip keeps quoted commas', () => {
  const parsed = cellsFromCsv('name,note\nAda,"hello, world"');
  assert.equal(parsed.A1, 'name');
  assert.equal(parsed.B2, 'hello, world');
  const csv = cellsToCsv({ A1: 'a,b', B1: 'ok' }, 1, 2);
  assert.equal(csv, '"a,b",ok');
});
