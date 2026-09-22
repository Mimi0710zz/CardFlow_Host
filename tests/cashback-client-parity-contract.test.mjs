import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const feature=fs.readFileSync(new URL('../services/cashback-feature-ui.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');
test('Host cashback view is wired to Client-parity workflow, not legacy editor import',()=>{
  assert.match(feature,/renderCashbackProgramPage/);
  assert.match(feature,/cashbackProgramSelection/);
  assert.doesNotMatch(feature,/openCashbackProgramEditor/);
  assert.match(css,/\.cashback-program-layout/);
  assert.match(css,/\.cashback-program-structure/);
});
test('legacy cashback entity table is no longer rendered',()=>{
  assert.doesNotMatch(feature,/toolbar\("program"\).*table\("program"/s);
  assert.match(feature,/renderCashbackProgramWorkspace/);
});
