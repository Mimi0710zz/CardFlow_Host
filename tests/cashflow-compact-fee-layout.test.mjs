import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css=readFileSync(new URL('../styles.css', import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html', import.meta.url),'utf8');

test('cashflow modal uses compact unequal fee columns',()=>{
  assert.match(css,/cashflow-editor-modal \.order-fee-group\{[\s\S]*grid-template-columns:88px 122px minmax\(150px,1fr\)/);
  assert.match(css,/cashflow-editor-modal \.source-fee-group\{[\s\S]*grid-template-columns:88px 122px minmax\(150px,1fr\) 118px/);
  assert.match(css,/cashflow-editor-modal \.modal-card\{width:min\(1080px,96vw\)\}/);
});

test('cashflow compact fee stylesheet cache is bumped',()=>{
  assert.match(html,/styles\.css\?v=20260903-cashflow-compact-fee-v1/);
});
