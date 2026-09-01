# CardFlow HOST — Tự tính Chỉ tiêu tổng V8

## Thay đổi
- `Chỉ tiêu tổng` trong form Thêm/Chỉnh sửa Chương trình hoàn tiền chuyển sang readonly.
- Giá trị được tự tính theo công thức: `Max Cashback / (% Cashback / 100)`.
- Khi thay đổi `% Cashback`, `Max Cashback` hoặc `Max CB mode`, ô Chỉ tiêu tổng cập nhật ngay.
- Chế độ `Không giới hạn`: Chỉ tiêu tổng để trống và lưu `null`.
- Khi lưu chương trình có giới hạn, `eligibleTarget` và `totalTarget` đều lấy từ cùng kết quả tính tự động.
- Cache-busting: `20260901-cashback-target-auto-v8`.

## Ví dụ
- 5,0% + Max Cashback 500.000 đ → Chỉ tiêu tổng 10.000.000 đ.
- 16,8% + Max Cashback 680.000 đ → Chỉ tiêu tổng 4.047.619 đ.
