# Cập nhật giao diện QUẢN LÝ THẺ - HOST — 30/08/2026

- Đồng bộ phong cách giao diện với app Client: palette, font, sidebar, panel, button, table, modal.
- Menu chuyển sang hamburger/collapsible như Client; desktop thu gọn thành icon rail, tablet/mobile dùng off-canvas.
- Menu dùng SVG icon cùng phong cách Client.
- Dùng `assets/app-logo.png` của Client làm logo sidebar, login gate và favicon.
- Đổi tên hiển thị thành `QUẢN LÝ THẺ - HOST`.
- Thêm login gate bắt buộc bấm `Kết nối Google Drive` trước khi vào app.
- Trạng thái Drive có màu: xanh = đồng bộ, nâu = chưa đồng bộ/đang xử lý, đỏ = xung đột/lỗi, xám = chưa kết nối.
- Dashboard KPI có màu nhận diện tương tự Client.
- Giữ nguyên namespace dữ liệu Host: `cardflow-host-data-v1`, `cardflow-host-sync-meta-v1`, `cardflow-host-data.json`.
- Thêm cache-busting version cho CSS/JS/logo để GitHub Pages tải giao diện mới ngay.
