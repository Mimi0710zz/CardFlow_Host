import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../services/cashback-feature-ui.js",import.meta.url),"utf8");

test("transaction filter panel has cancel, clear and apply actions in order",()=>{
  assert.match(source,/clear\?\.insertAdjacentHTML\("beforebegin",`<button type="button" class="secondary-btn" data-cancel-filter="\$\{group\}">Huỷ<\/button>`\)/);
  assert.match(source,/clear\?\.insertAdjacentHTML\("afterend",`<button type="button" class="primary" data-apply-filter="\$\{group\}">Áp dụng<\/button>`\)/);
});

test("outside click and cancel share the same close-without-apply behavior",()=>{
  assert.match(source,/function closeFilterPanelWithoutApply\(panel,trigger\)/);
  assert.match(source,/data-cancel-filter[\s\S]*closeFilterPanelWithoutApply/);
  assert.match(source,/registerFilterOutsideClose[\s\S]*closeFilterPanelWithoutApply\(panel,trigger\)/);
  assert.match(source,/syncFilterPanelFromApplied\(panel\)/);
});
