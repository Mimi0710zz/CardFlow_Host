# CardFlow HOST — Cashback Program CRUD Fix V6

## Nguyên nhân

Tab `Chương trình hoàn tiền` vẫn dùng cơ chế CRUD cũ: hàm `renderCashbackFeatures()` giữ `state` theo snapshot của lần render, và submit chương trình gọi `upsert("cashbackPrograms", item)` trực tiếp lên snapshot đó rồi mới `save()`.

Sau local-first/auto-sync, object state toàn cục có thể đã được thay bằng object mới. Khi mở form và lưu lần tiếp theo, đường submit cũ có thể thêm chương trình vào snapshot cũ thay vì state mới nhất, gây hiện tượng lần thêm sau không tích lũy đúng trong bảng.

Đây là cùng nhóm lỗi stale-state đã xử lý thành công ở CRUD Mã MCC.

## Thay đổi

- Thêm `upsertCashbackProgram()` tạo mảng chương trình mới, giữ toàn bộ record cũ và thêm/sửa đúng record.
- Thêm `buildNextProgramState()` tạo state mới bất biến từ state mới nhất.
- Submit chương trình gọi `getState()` ngay tại thời điểm bấm Lưu.
- `save("Đã lưu chương trình hoàn tiền", nextState)` nhận state mới hoàn chỉnh thay vì mutate snapshot cũ.
- Sau save kiểm tra record vừa lưu thực sự tồn tại trong `saved.cashbackPrograms`.
- Edit chương trình lookup từ `latestState.cashbackPrograms`, không lookup từ closure state cũ.
- Form Card ID/MCC khi mở cũng dùng dữ liệu live mới nhất.
- Không đổi schema, ID cũ, Drive namespace hoặc dữ liệu người dùng.
- Cache bust mới: `20260901-cashback-rate-decimal-v7`.

## Kiểm thử

Đã thêm `tests/cashback-program-crud.test.mjs`:

- Add liên tiếp 3 chương trình → đủ 3 record, ID duy nhất.
- Add lần 1 → state bị thay object mô phỏng sync → Add lần 2 → vẫn đủ toàn bộ 3 record.
- Edit 1 chương trình → không làm mất các chương trình cùng bảng.

Kết quả toàn bộ suite: **33/33 PASS, 0 fail**.

`node --check` cho `app.js` và toàn bộ `services/*.js`: PASS.

## Chưa xác minh

- [Chưa xác minh] Google OAuth/Drive thật trên tài khoản người dùng trong môi trường kiểm thử này.
- [Chưa xác minh] Click-through browser trên deployment GitHub Pages thật. Cache-busting đã được tăng để tránh runtime cũ.
