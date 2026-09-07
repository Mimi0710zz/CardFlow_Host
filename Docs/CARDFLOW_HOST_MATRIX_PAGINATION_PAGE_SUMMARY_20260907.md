# CardFlow Host - Matrix pagination & page summary

## Đã thực hiện
- Phân trang cột khách hàng của ma trận Điều phối đơn: tối đa 25 khách/trang.
- Thêm dãy số trang phía trên ma trận để chuyển nhanh giữa các trang.
- Thêm ma trận thống kê nhỏ theo từng trang với 3 trạng thái: Đơn chưa đánh, Đơn đang đánh dở, Đơn đã đánh xong.
- Ô thống kê và header Trang n đều có thể bấm để chuyển ma trận lớn sang trang tương ứng.
- Màu thống kê tái sử dụng cùng CSS variables của trạng thái ma trận lớn.
- Trang hiện tại được highlight và được giữ lại khi ma trận render lại do cập nhật dữ liệu.
- Khi áp dụng/xóa bộ lọc, trang được đưa về Trang 1 và tổng số trang được tính lại theo tập khách hàng sau lọc.

## File thay đổi
- `services/matrix-ui.js`
- `styles.css`
- `services/coordination-ui.js` (cache bust)
- `services/cashback-feature-ui.js` (cache bust)
- `app.js` (cache bust)
- `index.html` (cache bust CSS)

## Kiểm tra
- `node --check` các file JS thay đổi: đạt.
- Nhóm test matrix/coordination/Host V2: 18/18 đạt.
- Full suite: 122/127 đạt, 1 skipped, 4 fail. Bốn fail này giống hệt baseline ZIP gốc và thuộc cashflow/order-type, không phát sinh từ thay đổi ma trận.
- Browser matrix test trong container không khởi tạo fixture được; baseline gốc cũng lỗi cùng điểm trong môi trường Chromium container.
