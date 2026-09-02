import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const appSource=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const featureSource=readFileSync(new URL("../services/cashback-feature-ui.js",import.meta.url),"utf8");
const cssSource=readFileSync(new URL("../styles.css",import.meta.url),"utf8");

test("order type master UI exposes color column and color picker",()=>{
  assert.match(appSource,/entityTable\(\["Mã loại đơn","Màu","Mô tả","Ghi chú"\]/);
  assert.match(appSource,/function colorPickerField\(name,label,value\)/);
  assert.match(appSource,/input name="\$\{name\}" type="color"/);
  assert.match(appSource,/data-color-choice/);
  assert.match(appSource,/color:normalizeColor\(data\.color\)\|\|orderTypeDefaultColor\(code\)/);
});

test("transaction order type display uses master color badge with contrast fallback",()=>{
  assert.match(featureSource,/const readableTextColor=color=>/);
  assert.match(featureSource,/const orderTypeColor=\(items,code\)=>normalizeColor/);
  assert.match(featureSource,/const orderTypeBadge=\(items,code\)=>/);
  assert.match(featureSource,/orderTypeBadge\(state\.orderTypes,x\.orderTypeCode\)/);
  assert.match(featureSource,/orderTypeOptionLabel/);
});

test("order type color CSS supports swatches, picker and compact badges",()=>{
  assert.match(cssSource,/\.color-swatch/);
  assert.match(cssSource,/\.color-picker-control/);
  assert.match(cssSource,/\.color-choice\.selected/);
  assert.match(cssSource,/\.order-type-badge/);
  assert.match(cssSource,/--order-type-bg/);
  assert.match(cssSource,/--order-type-fg/);
});
