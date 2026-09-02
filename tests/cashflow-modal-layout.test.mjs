import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../services/cashback-feature-ui.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

test('cashflow editor uses dedicated wide modal and all four layout rows span the modal body', () => {
  assert.match(js, /cashflow-editor-modal/);
  assert.match(css, /\.feature-modal\.cashflow-editor-modal \.modal-card\{width:min\(1180px,96vw\)\}/);
  assert.match(css, /\.modal-body> \.cashflow-readonly[\s\S]*grid-column:1\/-1/);
  assert.match(css, /\.modal-body> \.cashflow-fee-compare[\s\S]*grid-column:1\/-1/);
  assert.match(css, /\.modal-body> \.cashflow-settlement-grid[\s\S]*grid-column:1\/-1/);
  assert.match(css, /\.modal-body> \.cashflow-profit-row[\s\S]*grid-column:1\/-1/);
});

test('cashflow comparison and settlement rows stay two columns until compact mobile width', () => {
  assert.match(css, /cashflow-editor-modal \.cashflow-fee-compare\{grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)\}/);
  assert.match(css, /cashflow-editor-modal \.cashflow-settlement-grid\{grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)\}/);
  assert.match(css, /@media\(max-width:700px\)/);
});
