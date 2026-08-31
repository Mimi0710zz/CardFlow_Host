# CardFlow HOST — MCC Definitive Fix V4

## Đã sửa

- MCC Add/Edit không còn dựa vào `state` snapshot đã bị đóng trong closure của lần render cũ.
- Khi bấm Lưu, handler MCC gọi `getState()` để lấy state hiện tại của app rồi mới tạo `nextState`.
- MCC chỉ còn **một** submit path chuyên dụng; generic submit handler không còn được gắn cho MCC.
- Edit MCC tra record từ state hiện tại thay vì snapshot cũ.
- Bổ sung `buildNextMccState()` để tạo snapshot bất biến giữ toàn bộ MCC cũ + record mới.
- Cache bust đổi sang `20260901-mcc-definitive-fix-v4`.

## Vì sao cần sửa theo hướng này

`SyncService` có thể thay object state toàn cục sau auto-sync mà không render lại ngay. Event handler được bind từ lần render trước có thể giữ một object state cũ. MCC CRUD phải luôn đọc state hiện tại tại thời điểm submit thay vì tin vào closure.

Ngoài ra source cũ có đồng thời:
1. `bindMccSubmit(...).addEventListener("submit", ...)`
2. generic `form.onsubmit = ...`

cho cùng form MCC. V4 loại bỏ hoàn toàn đường submit thứ hai cho MCC.

## Test

Xem kết quả chạy test trong terminal/report thực thi.
