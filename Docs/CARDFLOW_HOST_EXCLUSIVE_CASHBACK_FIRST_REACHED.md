# Báo cáo Cashback loại trừ — đạt trước thắng

## Kiến trúc đã kiểm tra

- `cashback-progress.js` dẫn xuất tiến độ theo Customer Card và chu kỳ.
- `cashback-cycle.js` xác định kỳ tháng/sao kê.
- `order-coordination.js` và `coordination-ui.js` dùng chung tiến độ dẫn xuất.
- `local-repository.js` canonicalize dữ liệu local/Drive; shared cashback cap vẫn là khái niệm riêng.

## Thay đổi

- Schema chương trình thêm `exclusiveMode` (`none`, `first_reached`) và `exclusiveGroupId`.
- Migration cũ tự động, idempotent: `none` và `null`; giữ nguyên ID và dữ liệu người dùng.
- `cashback-exclusive.js` gom validation và resolver. Winner được tính theo Customer Card + cycle + group, không persist.
- Dùng timestamp/datetime rõ ràng nếu có; nếu chỉ cùng ngày và không phân biệt được thứ tự thì trả `needs-confirmation`, không cộng cashback. Không dùng `createdAt` do migration có thể tự sinh trường này.
- Winner có `completed`, `isExclusiveWinner`; loser có `locked`, `lockedByProgramId`, cashback đóng góp bằng 0.
- Shared cap chạy riêng; giao dịch loser không tiêu hao shared cap. Thứ tự: giải quyết exclusive winner trước khi tổng hợp phần đóng góp shared cap.
- Gợi ý đơn bỏ qua loser/group đã chốt, ưu tiên đơn có thể chốt nhóm rồi đến phần chi còn thiếu nhỏ hơn.

## File tạo/chỉnh sửa

- Tạo `services/cashback-exclusive.js`, `tests/cashback-exclusive.test.mjs`.
- Chỉnh `services/local-repository.js`, `services/cashback-progress.js`, `services/order-coordination.js`, `services/cashback-feature-ui.js`, `services/coordination-ui.js`.

## Xác minh

- Unit test: `node --test tests/*.test.mjs` — 47/47 pass.
- Syntax check UI: `node --check services/cashback-feature-ui.js` và `node --check services/coordination-ui.js` — pass.
- Browser end-to-end với Google Drive/session thật: [Chưa xác minh].
