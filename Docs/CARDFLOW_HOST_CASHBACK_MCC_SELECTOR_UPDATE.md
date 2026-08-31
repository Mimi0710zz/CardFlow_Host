# CardFlow HOST — Cập nhật form Chương trình hoàn tiền / MCC selector

## ✅ Đã thực hiện

- Đổi nhãn chọn sản phẩm thẻ trong form `Thêm/Tùy chỉnh chương trình` từ **Thẻ ngân hàng** thành **Card ID**.
- Danh sách Card ID hiển thị theo dạng `CARD-ID — Tên thẻ` và sắp xếp theo Card ID.
- Đổi `Nhóm MCC hợp lệ` từ native multi-select lớn sang dropdown checklist gọn.
- Thêm chế độ **Tất cả** có ý nghĩa động: chương trình áp dụng cho mọi MCC hiện tại và MCC tạo mới sau này.
- Khi chọn `Tất cả`, người dùng có thể bỏ chọn từng nhóm MCC để tạo danh sách loại trừ.
- MCC trong dropdown sắp xếp A → Z theo tên nhóm bằng locale tiếng Việt; `Tất cả` luôn đứng đầu.
- Bổ sung semantic fields:
  - `mccSelectionMode: "all" | "selected"`
  - `mccCategoryIds`
  - `excludedMccCategoryIds`
  - giữ `allMcc` làm field tương thích ngược.
- Matching giao dịch/cashback/điều phối dùng chung helper `isMccCategoryEligible()`; không còn tự diễn giải MCC riêng ở từng màn hình.
- Chương trình cũ có danh sách MCC được giữ là `selected`; chương trình cũ không có MCC tiếp tục giữ hành vi cũ là áp dụng tất cả.
- Cache bust runtime: `20260901-cashback-mcc-selector-v5`.

## 📁 File chính đã chỉnh sửa

- `services/cashback-feature-ui.js`
- `services/cashback-program.js`
- `services/cashback-progress.js`
- `services/local-repository.js`
- `services/order-coordination.js`
- `services/coordination-ui.js`
- `services/sync-service.js`
- `services/host-bootstrap.js`
- `app.js`
- `styles.css`
- `index.html`
- `tests/cashback-mcc-selector.test.mjs`

## 🧪 Kiểm thử

- `node --check app.js` và toàn bộ `services/*.js`: PASS.
- `node --test tests/*.test.mjs`: **30/30 PASS**, 0 fail.
- Test mới xác nhận:
  - legacy selected MCC → selected mode;
  - `Tất cả` + exclusion;
  - MCC tạo mới sau này tự eligible trong all mode;
  - transaction eligibility tôn trọng exclusion;
  - canonicalization/JSON roundtrip giữ đúng cấu hình.
- HTTP smoke: PASS, runtime phục vụ đúng cache version `20260901-cashback-mcc-selector-v5`.

## ⚠ Lưu ý

[Chưa xác minh] Browser automation trong môi trường hiện tại bị chặn bởi chính sách Chromium (`ERR_BLOCKED_BY_ADMINISTRATOR`), nên chưa chạy được click-through UI tự động. Source đã qua syntax test, unit/regression test và HTTP smoke.
