import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const appSource=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const featureSource=readFileSync(new URL("../services/cashback-feature-ui.js",import.meta.url),"utf8");

test("clicking outside tables clears selected table rows globally",()=>{
  assert.match(appSource,/function clearSelectedTableRows\(\)\{[\s\S]*table tbody tr\.selected[\s\S]*classList\.remove\('selected'\)/);
  assert.match(appSource,/document\.addEventListener\('click',[\s\S]*if\(!e\.target\.closest\('table'\)\)clearSelectedTableRows\(\)/);
});

test("feature table persistent MCC selection resets with global deselection",()=>{
  assert.match(appSource,/cardflow:table-selection-cleared/);
  assert.match(featureSource,/if\(typeof document!=="undefined"\)document\.addEventListener\("cardflow:table-selection-cleared",\(\)=>\{selectedMccId="";\}\)/);
});
