import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const app=readFileSync(new URL("../app.js", import.meta.url),"utf8");

test("Host Thẻ ngân hàng headers are resize-only and do not sort on click",()=>{
  assert.match(app,/function cardTableHeaders\(\)\{[\s\S]*data-column-key/);
  assert.doesNotMatch(app,/data-card-sort/);
  assert.doesNotMatch(app,/th\[data-card-sort\]/);
});

test("Host card rows keep deterministic bank and Card ID grouping",()=>{
  assert.match(app,/function sortVisibleCardRows\(items\)\{[\s\S]*compareText\(left\.bankName,right\.bankName\)[\s\S]*compareCardId\(left,right\)/);
});
