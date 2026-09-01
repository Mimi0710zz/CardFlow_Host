# Cập nhật Giới thiệu & Hướng dẫn sử dụng CardFlow HOST

## Nội dung cũ/không còn phù hợp đã loại khỏi giao diện

- Hướng dẫn chỉ tập trung vào Customer/Card master và thiếu MCC, cashback, giao dịch, Điều phối đơn.
- Thuật ngữ `Tổ chức thẻ Quốc tế`, mô tả ngày sao kê ở Card Product và mô hình mục tiêu cashback cũ.
- Nội dung không giải thích dữ liệu khởi tạo rỗng, MCC `Tất cả`, chương trình loại trừ và hai điều kiện chi tiêu.

## Phần đã cập nhật

- Giới thiệu đúng vai trò HOST, nguyên tắc user-built-data-first, nền tảng local-first/Google Drive và tác giả.
- Quy trình thiết lập khuyến nghị từ Mã ngân hàng đến Điều phối đơn.
- Thẻ ngân hàng, Customer Card, ngày sao kê riêng, Hạn thanh toán và ảnh tham khảo hình thức hoàn.
- MCC, Cashback Program, Chi tiêu nhóm/Chi tiêu tổng, chương trình loại trừ và first-reached-wins.
- Giao dịch, chu kỳ cashback, Dashboard sáu KPI, Điều phối hai tab, Gợi ý đơn mới và an toàn đồng bộ.

## File thay đổi

- `app.js`
- `index.html`
- `services/about-guide-content.js`
- `tests/about-guide-content.test.mjs`
- `Docs/CARDFLOW_HOST_ABOUT_GUIDE_LATEST_UPDATE.md`

## Responsive

Giữ nguyên hệ thống hai tab con và accordion hiện tại. Nội dung mới dùng các card/accordion có sẵn, không bổ sung chiều rộng cố định hay thành phần gây tràn ngang.

## Kiểm thử

- `node --check app.js`: đạt.
- `node --check services/about-guide-content.js`: đạt.
- `node --test tests/*.test.mjs`: 82/82 test đạt.
- HTTP smoke: ứng dụng tải được tại máy cục bộ, title `QUẢN LÝ THẺ - HOST`.
- Hai tab, console và responsive trong giao diện chính: [Chưa xác minh] vì ứng dụng dừng tại cổng đăng nhập Google Drive; không vượt xác thực và không tác động dữ liệu người dùng.
