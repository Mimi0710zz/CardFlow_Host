# Báo cáo tách Chi tiêu nhóm và Chi tiêu tổng

## Vấn đề cũ

Form cũ dùng `Max Cashback / % Cashback` để ghi vào `totalTarget`, khiến điều kiện tổng chi tiêu bị đồng nhất sai với mức chi nhóm MCC cần để đạt max cashback.

## Mô hình mới

- `eligibleTarget` — **Chi tiêu nhóm**: readonly, tự tính `round(maxCashback / (rate / 100))` cho chương trình capped; unlimited dùng `null`/Không áp dụng.
- `totalTarget` — **Chi tiêu tổng**: điều kiện độc lập, nullable và chỉ nhập thủ công khi bật checkbox.
- Không thêm boolean persistent; checkbox được dẫn xuất từ `totalTarget != null`.
- Migration bảo toàn cả hai giá trị cũ, idempotent, không xóa dữ liệu không phân biệt được nguồn gốc.

## Progress và cashback

- Progress trả riêng `eligibleSpend`, `eligibleTarget`, `remainingEligibleSpend`, `eligibleTargetReached`.
- Progress trả riêng `totalCardSpend`, `totalTarget`, `remainingTotalSpend`, `totalTargetReached`.
- `programConditionReached` chỉ đúng khi mọi điều kiện bắt buộc đều đạt.
- `cashbackEarnedRaw` là cashback toán học; `cashbackEstimated` là ước tính sau exclusive; `cashbackQualifiedAmount` chỉ có giá trị khi đủ mọi điều kiện.
- Điều phối và reminder nêu rõ còn thiếu chi nhóm, chi tổng hoặc cả hai.
- Gợi ý đơn tính mọi giao dịch vào tổng chi tiêu; chỉ giao dịch hợp lệ mới tăng chi tiêu nhóm/cashback.

## Exclusive first-reached

`reachedAt` là giao dịch đầu tiên mà cả `eligibleTarget` và `totalTarget` (nếu có) cùng đạt. Vì vậy chương trình không thắng sớm chỉ nhờ đạt chi tiêu nhóm.

## File

- Chỉnh: `services/cashback-progress.js`, `services/cashback-exclusive.js`, `services/order-coordination.js`, `services/cashback-feature-ui.js`, `services/coordination-ui.js`, `styles.css`, `app.js`, `index.html`.
- Tạo: `tests/cashback-spend-targets.test.mjs`, `Docs/CARDFLOW_HOST_GROUP_SPEND_TOTAL_SPEND_TARGETS.md`.

## Xác minh

- `node --check app.js` và toàn bộ `services/*.js`: pass.
- `node --test tests/*.test.mjs`: 64/64 pass.
- HTTP smoke: HTML, app.js, styles.css và các service cashback mới đều trả 200.
- Browser tải đúng `app.js?v=20260901-spend-targets-v1` và `styles.css?v=20260901-spend-targets-v1`; không có console warning/error.
- E2E tạo/reopen Cake và nhập giao dịch trên dữ liệu thật: [Chưa xác minh] do browser dừng tại Google Drive login gate; không bypass login và không seed/reset dữ liệu người dùng.
