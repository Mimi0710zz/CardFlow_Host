import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../services/cashback-feature-ui.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

test('cashflow editor uses dedicated wide modal and all four layout rows span the modal body', () => {
  assert.match(js, /cashflow-editor-modal/);
  assert.match(css, /\.feature-modal\.cashflow-editor-modal \.modal-card\{width:min\(1080px,96vw\)\}/);
  assert.match(css, /\.modal-body> \.cashflow-readonly[\s\S]*grid-column:1\/-1/);
  assert.match(css, /\.modal-body> \.cashflow-fee-compare[\s\S]*grid-column:1\/-1/);
  assert.match(css, /\.modal-body> \.cashflow-settlement-grid[\s\S]*grid-column:1\/-1/);
  assert.match(css, /\.modal-body> \.cashflow-profit-row[\s\S]*grid-column:1\/-1/);
});

test('cashflow fee cards and controls stay contained while preserving compact unequal columns', () => {
  assert.match(css, /cashflow-fee-compare>\*\{[\s\S]*width:100%;[\s\S]*min-width:0;[\s\S]*box-sizing:border-box/);
  assert.match(css, /order-fee-group\{[\s\S]*grid-template-columns:minmax\(56px,72px\) minmax\(88px,118px\) minmax\(130px,1fr\)/);
  assert.match(css, /source-fee-group\{[\s\S]*grid-template-columns:minmax\(56px,72px\) minmax\(88px,118px\) minmax\(120px,1fr\) minmax\(82px,105px\)/);
  assert.match(css, /cashflow-group \.field,[\s\S]*cashflow-group input,[\s\S]*cashflow-group select\{[\s\S]*width:100%;[\s\S]*min-width:0;[\s\S]*box-sizing:border-box/);
});

test('cashflow comparison and settlement rows stay two columns until compact mobile width', () => {
  assert.match(css, /cashflow-editor-modal \.cashflow-fee-compare\{grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)\}/);
  assert.match(css, /cashflow-editor-modal \.cashflow-settlement-grid\{grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)\}/);
  assert.match(css, /@media\(max-width:700px\)/);
});
