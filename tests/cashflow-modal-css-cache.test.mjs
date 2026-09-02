import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("cashflow modal CSS cache version matches latest layout release", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /styles\.css\?v=20260903-cashflow-modal-layout-v4/);
});
