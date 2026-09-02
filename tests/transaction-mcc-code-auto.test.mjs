import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync(new URL("../services/cashback-feature-ui.js",import.meta.url),"utf8");

test("Đánh đơn auto-fills Mã MCC from Nhóm MCC and keeps it read-only",()=>{
  assert.match(source,/name=\"mccCode\" type=\"text\"[^>]*readonly[^>]*required/);
  assert.match(source,/mccCode\.value=selected\?\.codes\?\.\[0\]\|\|\"\"/);
  assert.doesNotMatch(source,/mccCode\.innerHTML=option/);
});
