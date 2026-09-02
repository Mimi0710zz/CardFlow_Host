import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {canonicalize} from "../services/local-repository.js";

const appSource=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const featureSource=readFileSync(new URL("../services/cashback-feature-ui.js",import.meta.url),"utf8");
const cssSource=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
const htmlSource=readFileSync(new URL("../index.html",import.meta.url),"utf8");

test("source-name master exists in nav, view and CRUD model",()=>{
  assert.match(htmlSource,/data-view="source-names"/);
  assert.match(htmlSource,/id="view-source-names"/);
  assert.match(appSource,/function renderSourceNames\(/);
  assert.match(appSource,/entity==="sourceName"/);
  const state=canonicalize({transactions:[{sourceName:"NN"}]});
  assert.equal(state.sourceNames[0].name,"NN");
});

test("Giao Dịch is split into Đánh đơn and Dòng tiền with shared month scope",()=>{
  assert.match(featureSource,/data-transaction-tab="orders"/);
  assert.match(featureSource,/data-transaction-tab="cashflow"/);
  assert.match(featureSource,/startsWith\(monthPrefix\)/);
  assert.doesNotMatch(featureSource,/data-period-day/);
  assert.match(featureSource,/\["Ngày","Tên KH","Loại đơn","Nhóm MCC","Mã MCC","Loại thẻ \(Card ID\)","Tiền đơn","Chương trình hoàn tiền","Ghi chú"\]/);
});

test("cashflow has no add/delete actions and financial grouping styles",()=>{
  assert.match(featureSource,/const cashToolbar=.*data-feature-edit="transactionCashflow"/s);
  const cashToolbarLine=featureSource.match(/const cashToolbar=`[^`]+`;/)?.[0]||"";
  assert.doesNotMatch(cashToolbarLine,/data-feature-add/);
  assert.match(featureSource,/transaction-cashflow[\s\S]*Phí đơn<br>\(%\)[\s\S]*Tên<br>nguồn/);
  assert.match(cssSource,/\.fee-order\{background:/);
  assert.match(cssSource,/\.fee-source\{background:/);
  assert.match(cssSource,/\.fee-text\{color:#c83b3b/);
  assert.match(cssSource,/\.cashflow-group\.order-fee-group/);
  assert.match(cssSource,/\.cashflow-group\.source-fee-group/);
});

test("cashflow status labels use requested semantics",()=>{
  assert.match(featureSource,/completed:"Đã về",pending:"Chưa về"/);
  assert.match(featureSource,/completed:"Đã đi",pending:"Chưa đi"/);
});
