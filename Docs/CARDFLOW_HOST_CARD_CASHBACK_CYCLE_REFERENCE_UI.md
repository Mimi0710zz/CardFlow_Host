# Báo cáo UI tham khảo hình thức hoàn

## Thay đổi

- Thêm nút phụ `Hướng dẫn hình thức hoàn` vào toolbar tab `Thẻ ngân hàng`, nằm sau Bộ lọc và trước các nút thao tác dữ liệu.
- Nút mở modal chi tiết dùng chung, không chuyển trang và không thay đổi dữ liệu.
- Modal hiển thị ảnh `./assets/reference/card-cashback-cycle-guide.png`, phụ đề và cảnh báo đây chỉ là thông tin tham khảo.
- Hỗ trợ đóng bằng nút X, Escape và click nền ngoài modal.
- Desktop dùng modal rộng; tablet/mobile co ảnh theo chiều rộng, giữ tỷ lệ và cuộn dọc trong modal.

## File

- Chỉnh: `app.js`, `index.html`, `styles.css`.
- Tạo báo cáo: `Docs/CARDFLOW_HOST_CARD_CASHBACK_CYCLE_REFERENCE_UI.md`.
- Asset: `assets/reference/card-cashback-cycle-guide.png`.

## Xác minh

- `node --check app.js`: pass.
- Bộ unit test hiện có: ghi kết quả thực tế trong phần bàn giao.
- Browser tải app thật tại `http://127.0.0.1:4173/`: không có console error.
- Ảnh trả HTTP thành công, trình duyệt đọc đúng kích thước tự nhiên 1284 × 1925 và `complete = true`.
- Click nút, X, Escape, click nền và kiểm tra viewport mobile trong luồng đăng nhập thật: [Chưa xác minh] do browser dừng tại Google Drive login gate; không bypass đăng nhập và không sửa session/dữ liệu người dùng.
