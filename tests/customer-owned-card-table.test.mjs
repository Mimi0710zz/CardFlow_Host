import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const renderer = source.match(/function openCustomerDetail\(id\)\{([\s\S]*?)function openProductDetail/)?.[1] ?? "";

test("customer owned-card table keeps the approved 9-column order", () => {
  const headers = [
    "Card ID",
    "Phôi",
    "Hình thức hoàn",
    "Loại thẻ",
    "Hạn mức",
    "Sao kê",
    "Hạn thanh toán",
    "Chung hạn mức",
    "Trạng thái",
  ];

  assert.ok(renderer.includes(`entityTable([${headers.map((label) => `"${label}"`).join(",")}]`));
  assert.deepEqual(
    [...renderer.matchAll(/\$\{cell\("([^"]+)"/g)].map((match) => match[1]),
    headers,
  );
  assert.ok(renderer.includes('cell("Card ID"'));
  assert.ok(!renderer.includes('cell("Ngân hàng"'));
  assert.ok(!renderer.includes('cell("Hạng thẻ"'));
  assert.ok(!renderer.includes('"Tổ chức thẻ Quốc tế"'));
});
