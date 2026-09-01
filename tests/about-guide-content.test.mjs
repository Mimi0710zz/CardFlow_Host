import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { currentAboutIntroduction, currentHostGuideItems } from "../services/about-guide-content.js";

const guides = currentHostGuideItems();
const guideText = guides.map((item) => `${item.title} ${item.summary} ${item.html}`).join(" ");

test("current About content describes HOST, user-built data and author", () => {
  const html = currentAboutIntroduction();
  for (const text of ["QUẢN LÝ THẺ - HOST", "dữ liệu do người dùng tự xây dựng", "Google Drive synchronization", "NGUYỄN QUANG MINH", "quangminh071093@gmail.com"])
    assert.ok(html.includes(text), text);
});

test("current Guide covers implemented cashback and coordination concepts", () => {
  for (const text of ["Mã ngân hàng", "Hướng dẫn hình thức hoàn", "Card ID", "Phôi", "Hạn thanh toán", "Tất cả", "Chi tiêu nhóm", "Chi tiêu tổng", "Loại trừ lẫn nhau", "Giao dịch đã hủy", "Theo sao kê", "Nhắc nhở", "Xem chi tiết", "Gợi ý đơn mới", "Sắp hết kỳ"])
    assert.ok(guideText.includes(text), text);
});

test("current Guide does not expose obsolete configuration wording", () => {
  for (const obsolete of ["Ngày đến hạn", "Tổ chức thẻ Quốc tế", "defaultStatementDay", "exclusiveGroupId", "Shared Cashback Group"])
    assert.ok(!guideText.includes(obsolete), obsolete);
});

test("About renderer keeps two child tabs and uses current content provider", () => {
  const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.match(appSource, /data-help-tab="intro"/);
  assert.match(appSource, /data-help-tab="guide"/);
  assert.match(appSource, /const guides=currentHostGuideItems\(\)/);
  assert.match(appSource, /currentAboutIntroduction\(\)/);
});
