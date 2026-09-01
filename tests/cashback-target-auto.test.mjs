import test from "node:test";
import assert from "node:assert/strict";
import { calculateCashbackTarget } from "../services/cashback-feature-ui.js?v=20260901-cashback-target-auto-v8";

test("auto target = max cashback / rate",()=>{
  assert.equal(calculateCashbackTarget(5,500000),10000000);
  assert.equal(calculateCashbackTarget(16.8,680000),4047619);
  assert.equal(calculateCashbackTarget(10,400000),4000000);
});

test("auto target requires positive rate and max",()=>{
  assert.equal(calculateCashbackTarget(0,500000),null);
  assert.equal(calculateCashbackTarget(5,0),null);
  assert.equal(calculateCashbackTarget("",500000),null);
});
