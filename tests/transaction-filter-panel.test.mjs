import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../services/cashback-feature-ui.js",import.meta.url),"utf8");
const appSource=readFileSync(new URL("../app.js",import.meta.url),"utf8");

test("transaction filter panel has apply, clear and cancel actions in order",()=>{
  assert.match(source,/const filterActionBar=\(\{apply,clear,cancel\}\)=>`<div class="filter-action-bar"><button type="button" class="primary filter-action--apply" \$\{apply\}>Áp dụng<\/button><button type="button" class="filter-action--clear" \$\{clear\}>Xóa lọc<\/button><button type="button" class="secondary-btn filter-action--cancel" \$\{cancel\}>Huỷ<\/button><\/div>`/);
  assert.match(source,/filterActionBar\(\{apply:`data-apply-filter="\$\{group\}"`,clear:`data-clear-list-filter="\$\{group\}"`,cancel:`data-cancel-filter="\$\{group\}"`\}\)/);
});

test("outside click and cancel share the same close-without-apply behavior",()=>{
  assert.match(source,/function closeFilterPanelWithoutApply\(panel,trigger\)/);
  assert.match(source,/data-cancel-filter[\s\S]*closeFilterPanelWithoutApply/);
  assert.match(source,/registerFilterOutsideClose[\s\S]*closeFilterPanelWithoutApply\(panel,trigger\)/);
  assert.match(source,/syncFilterPanelFromApplied\(panel\)/);
});

test("host compact entity filters share apply, clear and cancel order",()=>{
  assert.match(appSource,/function filterActionBar\(\{apply,clear,cancel\}\)\{return `<div class="filter-action-bar"><button type="button" class="primary filter-action--apply" \$\{apply\}>Áp dụng<\/button><button type="button" class="filter-action--clear" \$\{clear\}>Xóa lọc<\/button><button type="button" class="secondary-btn filter-action--cancel" \$\{cancel\}>Huỷ<\/button><\/div>`;\}/);
  assert.match(appSource,/filterActionBar\(\{apply:`data-compact-apply="\$\{group\}"`,clear:`data-compact-clear="\$\{group\}"`,cancel:`data-compact-cancel="\$\{group\}"`\}\)/);
  assert.match(appSource,/function closeCompactFilterPanelWithoutApply\(panel,trigger\)/);
  assert.match(appSource,/registerCompactFilterOutsideClose[\s\S]*closeCompactFilterPanelWithoutApply\(panel,trigger\)/);
});
