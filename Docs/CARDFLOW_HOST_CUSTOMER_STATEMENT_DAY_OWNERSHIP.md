# Báo cáo ownership Ngày sao kê

## Mô hình cũ và mới

- Trước đây progress fallback `customerCard.statementDay || cardProduct.defaultStatementDay`, khiến nhiều khách hàng dùng cùng một ngày sao kê master.
- Hiện tại Bank Card Product chỉ cung cấp `cashbackCycleMode`. Ngày sao kê dùng cho cashback thuộc duy nhất `customerCard.statementDay`.

## UI và validation

- Bỏ `Ngày sao kê mặc định` khỏi Add/Edit Thẻ ngân hàng; master Theo sao kê lưu được mà không cần ngày.
- Customer Card vẫn có `Ngày sao kê`; required động khi mode hiệu lực là statement, bao gồm override.
- Đổi toàn bộ nhãn Customer Card từ `Ngày đến hạn`/`Đến hạn` thành `Hạn thanh toán`. Backend tiếp tục dùng `paymentDueDay`.

## Engine và migration

- Monthly luôn dùng tháng dương lịch và bỏ qua statementDay.
- Statement chỉ dùng `customerCard.statementDay`; thiếu ngày trả `configuration-incomplete` với cảnh báo rõ ràng.
- `defaultStatementDay` cũ vẫn được canonicalize/roundtrip để không phá dữ liệu, nhưng không còn dùng trong business logic và không được copy sang Customer Card.

## File

- Chỉnh: `app.js`, `index.html`, `services/cashback-cycle.js`, `services/cashback-progress.js`, `services/order-coordination.js`, `services/cashback-feature-ui.js`, `services/coordination-ui.js`.
- Tạo: `tests/customer-statement-day-ownership.test.mjs`, `Docs/CARDFLOW_HOST_CUSTOMER_STATEMENT_DAY_OWNERSHIP.md`.

## Xác minh

- `node --check app.js` và toàn bộ `services/*.js`: pass.
- `node --test tests/*.test.mjs`: 75/75 pass.
- HTTP smoke: HTML, app.js, cashback-cycle.js và cashback-progress.js đều trả 200.
- Browser tải đúng `app.js?v=20260901-statement-day-owner-v1` và CSS cùng version; không có console warning/error.
- E2E Add/Edit master, Customer Card và Điều phối trên dữ liệu thật: [Chưa xác minh] do browser dừng tại Google Drive login gate; không bypass login và không seed/reset dữ liệu.
