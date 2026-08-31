# CardFlow HOST — Cashback Rate Decimal V7

## Thay đổi
- Ô `% Cashback` cho phép bước `0.1`, vì vậy các giá trị như `16.8`, `5.5`, `10.0` hợp lệ.
- Khi lưu, tỷ lệ được chuẩn hóa tối đa 1 chữ số thập phân.
- Khi chỉnh sửa, giá trị hiển thị với 1 chữ số thập phân.
- Trong bảng Chương trình hoàn tiền, `% Cashback` hiển thị thống nhất dạng `x.x%`.
- Cache-busting cập nhật thành `20260901-cashback-rate-decimal-v7`.

## Kiểm tra
- `node --check services/cashback-feature-ui.js`: PASS.
- Test suite hiện có: 33 PASS / 1 FAIL.
- FAIL còn lại nằm ở test `cashback-program-mcc-selection.test.mjs` do test import `isProgramMccEligible` nhưng module hiện tại không export tên này; lỗi này không liên quan thay đổi `% Cashback` và đã tồn tại trong source hiện tại.
