# Báo cáo UI chọn chương trình loại trừ

## UX

- UX cũ yêu cầu nhập thủ công `Nhóm loại trừ`/`exclusiveGroupId`.
- UX mới hiển thị checklist dropdown compact `Chương trình loại trừ cùng nhóm`, lấy tên chương trình cùng Card ID và không hiển thị chương trình đang sửa.
- Summary lần lượt là `Chưa chọn chương trình`, tên của một chương trình, hoặc số lượng chương trình đã chọn.

## Quan hệ nội bộ

- `exclusiveGroupId` tiếp tục là nguồn dữ liệu duy nhất; không thêm `exclusiveProgramIds`.
- Group mới dùng ID ổn định `EXG_<uuid>` và chỉ sinh khi lưu lần đầu.
- Chọn thành viên đã có group sẽ tham gia toàn bộ group đó. Chọn từ nhiều group sẽ merge về group ID có thứ tự ổn định.
- Khi sửa, các thành viên khác cùng group được chọn lại tự động.
- Bỏ chọn sẽ rebuild group của chương trình đang sửa. Group còn một thành viên được tự động chuyển về độc lập.
- Chuyển sang Độc lập sẽ xóa group của chương trình hiện tại và chuẩn hóa singleton còn lại.
- Submit lấy live state, tính toàn bộ `cashbackPrograms`, rồi save đúng một lần.

## File

- Chỉnh: `services/cashback-exclusive.js`, `services/cashback-feature-ui.js`, `styles.css`, `app.js`, `index.html`.
- Tạo: `tests/cashback-exclusive-program-selection.test.mjs`, `Docs/CARDFLOW_HOST_EXCLUSIVE_PROGRAM_MULTISELECT_UI.md`.

## Xác minh

- `node --test tests/*.test.mjs`: 55/55 pass.
- Syntax check `cashback-exclusive.js`, `cashback-feature-ui.js`, `app.js`: pass.
- Browser tải đúng `app.js?v=20260901-exclusive-multiselect-v1` và `styles.css?v=20260901-exclusive-multiselect-v1`; không có console warning/error.
- E2E thao tác tạo/sửa SACOM và reopen checklist: [Chưa xác minh] do browser dừng tại Google Drive login gate; không bypass đăng nhập, không seed/reset hoặc sửa dữ liệu người dùng.
