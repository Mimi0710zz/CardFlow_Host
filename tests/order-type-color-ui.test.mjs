import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const appSource=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const featureSource=readFileSync(new URL("../services/cashback-feature-ui.js",import.meta.url),"utf8");
const cssSource=readFileSync(new URL("../styles.css",import.meta.url),"utf8");

test("order type master UI exposes Word-style color picker",()=>{
  assert.match(appSource,/entityTable\(\["Mã loại đơn","Màu","Mô tả","Ghi chú"\]/);
  assert.match(appSource,/function colorPickerField\(name,label,value\)/);
  assert.match(appSource,/data-word-color-picker/);
  assert.match(appSource,/Màu chủ đề/);
  assert.match(appSource,/Màu tiêu chuẩn/);
  assert.match(appSource,/Thêm màu\.\.\./);
  assert.match(appSource,/data-word-more-dialog/);
  assert.match(appSource,/data-word-native-color/);
  assert.match(appSource,/color:normalizeColor\(data\.color\)\|\|orderTypeDefaultColor\(code\)/);
});

test("transaction order type display uses master color badge with contrast fallback",()=>{
  assert.match(featureSource,/const readableTextColor=color=>/);
  assert.match(featureSource,/const orderTypeColor=\(items,code\)=>normalizeColor/);
  assert.match(featureSource,/const orderTypeBadge=\(items,code\)=>/);
  assert.match(featureSource,/orderTypeBadge\(state\.orderTypes,x\.orderTypeCode\)/);
  assert.match(featureSource,/orderTypeOptionLabel/);
});

test("order type color CSS supports Word picker and compact badges",()=>{
  assert.match(cssSource,/\.color-swatch/);
  assert.match(cssSource,/\.word-color-trigger/);
  assert.match(cssSource,/\.word-theme-grid/);
  assert.match(cssSource,/\.word-more-dialog/);
  assert.match(cssSource,/\.order-type-badge/);
  assert.match(cssSource,/--order-type-bg/);
  assert.match(cssSource,/--order-type-fg/);
});
