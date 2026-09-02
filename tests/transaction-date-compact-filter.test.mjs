import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../services/cashback-feature-ui.js",import.meta.url),"utf8");

test("transaction compact filter includes Ngày while keeping shared Năm-Tháng scope",()=>{
  assert.match(source,/transaction:\{q:"",date:""/);
  assert.match(source,/data-list-filter="transaction\.date"/);
  assert.match(source,/<option value="">Ngày: Tất cả<\/option>/);
  assert.match(source,/transactionDates=\[\.\.\.new Set\(monthlyTransactions\.map/);
  assert.match(source,/\(!tf\.date\|\|String\(x\.date\|\|""\)===tf\.date\)/);
  assert.match(source,/data-transaction-tab="orders"/);
  assert.match(source,/data-transaction-tab="cashflow"/);
  assert.match(source,/startsWith\(monthPrefix\)/);
});
