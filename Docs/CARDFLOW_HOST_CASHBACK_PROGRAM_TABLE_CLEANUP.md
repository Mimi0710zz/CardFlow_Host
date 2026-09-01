# Báo cáo cleanup bảng Chương trình hoàn tiền

## Thay đổi UI

- Card ID trong bảng chỉ hiển thị `cardId`, không nối tên sản phẩm/ngân hàng/phôi.
- Thêm cột `MCC`, dẫn xuất code từ `mccCategories`; chương trình Tất cả hiển thị `Tất cả`.
- `Nhóm MCC` dùng helper chung và wrap trong khoảng rộng hợp lý; exclusions hiển thị bằng tên nhóm.
- Bỏ cột `Trạng thái`; bỏ control Trạng thái khỏi Add/Edit.
- Bỏ control `Shared Cashback Group` khỏi Add/Edit.
- Thêm cột `Ghi chú`, rỗng hiển thị `—`, nội dung dài clamp hai dòng và có tooltip.

## Backend compatibility

`status` vẫn được engine dùng để lọc chương trình active và `sharedCashbackGroup` vẫn được progress dùng cho shared cap. Vì vậy hai field tiếp tục canonicalize/roundtrip. Form giữ giá trị cũ nội bộ; chương trình mới mặc định `active` và shared group rỗng. Không xóa dữ liệu hiện có.

## File

- Chỉnh: `services/cashback-feature-ui.js`, `styles.css`, `app.js`, `index.html`.
- Tạo: `tests/cashback-program-table-cleanup.test.mjs`, `Docs/CARDFLOW_HOST_CASHBACK_PROGRAM_TABLE_CLEANUP.md`.

## Xác minh

- `node --check app.js` và `services/cashback-feature-ui.js`: pass.
- `node --test tests/*.test.mjs`: 69/69 pass.
- HTTP smoke: HTML, app.js, styles.css và cashback-feature-ui.js đều trả 200.
- Browser tải đúng `app.js?v=20260901-program-table-cleanup-v1` và `styles.css?v=20260901-program-table-cleanup-v1`; không có console warning/error.
- Kiểm tra trực quan table/Add/Edit trên dữ liệu thật: [Chưa xác minh] do browser dừng tại Google Drive login gate; không bypass login và không seed/reset dữ liệu.
