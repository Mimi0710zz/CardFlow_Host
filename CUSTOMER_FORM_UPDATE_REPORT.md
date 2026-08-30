# CUSTOMER FORM UPDATE - 2026-08-30

## Thay đổi
- Form Thêm/Tùy chỉnh khách hàng quản lý trực tiếp danh sách thẻ của khách hàng.
- Mỗi dòng gồm: Thẻ, Hạn mức, Ngày sao kê, Hạn thanh toán.
- Có nút + bên dưới để thêm không giới hạn số dòng theo nhu cầu; modal tăng chiều cao đến giới hạn viewport rồi cuộn.
- Có nút × ở mỗi dòng để bỏ thẻ khi tùy chỉnh.
- Bỏ Địa chỉ và Người phụ trách khỏi form và màn hình chi tiết khách hàng.
- Mã KH không nhập thủ công; app tự sinh KH-0001, KH-0002... và kiểm tra không trùng dữ liệu hiện có.
- Khi chỉnh sửa khách hàng, các quan hệ thẻ hiện có được nạp vào form; khi lưu, danh sách quan hệ được cập nhật theo form.
- Hạn mức dùng combobox (input + datalist) để có danh sách gợi ý từ hạn mức đã dùng nhưng vẫn cho phép nhập số bất kỳ.
- Ngày sao kê và Hạn thanh toán là dropdown 1-31.
- Dropdown Thẻ sắp xếp theo Ngân hàng/Tên thẻ/Card ID.
- Template Excel mới bỏ cột Địa chỉ và Người phụ trách ở sheet 01_KhachHang; phần import vẫn tương thích dữ liệu cũ.
