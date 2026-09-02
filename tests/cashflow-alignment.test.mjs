import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

test('cashflow table aligns text, numbers and source name by semantic type', () => {
  assert.match(css, /transaction-cashflow"\]\s*td:nth-child\(13\)\{text-align:center\}/);
  assert.match(css, /td:nth-child\(16\)\{text-align:right\}/);
  assert.match(css, /td:nth-child\(15\)\{text-align:left\}/);
});

test('cashflow modal aligns numeric inputs right and source name centered', () => {
  assert.match(css, /input\[name="profit"\]\{text-align:right\}/);
  assert.match(css, /select\[name="sourceName"\]\{text-align:center;text-align-last:center\}/);
});
