# Báo cáo Điều phối đơn UI V2

## 1. Kiến trúc nguồn đã kiểm tra

- `app.js`: state chính, local-first save, render các view, metadata tiêu đề và responsive table chung.
- `services/cashback-feature-ui.js`: CRUD MCC/chương trình/giao dịch và UI Điều phối đơn cũ.
- `services/cashback-cycle.js`: kỳ theo tháng/theo sao kê và số ngày còn lại.
- `services/cashback-progress.js`: giao dịch hợp lệ, tiến độ, target, cashback, cap riêng/cap chung và trạng thái engine.
- `services/order-coordination.js`: dựng dòng điều phối và `recommendOrders()`.
- `services/local-repository.js`: chuẩn hóa schema `cashbackPrograms`, `cardProducts`, `customerCards`, `transactions`.
- `index.html`, `styles.css`: shell, view, cache busting và responsive hiện có.

## 2. Hành vi cũ

Điều phối đơn hiển thị form gợi ý thường trực và một bảng lớn chứa đồng thời mọi khách hàng, Card ID và chương trình. Bộ lọc dùng chung với feature UI; không có workspace theo Card ID/chương trình và không có luồng nhắc nhở → chi tiết.

## 3. Kiến trúc mới

- Module UI mới: `services/coordination-ui.js`.
- State `coordinationUi` chỉ tồn tại trong bộ nhớ module, không gọi `save()` và không đi vào state chuẩn/Google Drive.
- Hai tab con đúng thiết kế: `Nhắc nhở` mặc định và `Chi tiết`.
- `Gợi ý đơn mới` mở modal gọn và tiếp tục gọi `recommendOrders()` hiện có.

## 4. Nhắc nhở và điều hướng

- KPI: Cần đánh, Sắp hết kỳ, Thiếu cấu hình.
- Nhóm: Cần đánh gấp, Cần đánh, Gần hoàn thành, Thiếu cấu hình.
- Dòng hoàn thành không xuất hiện trong danh sách nhắc nhở thường.
- Bấm nhắc nhở chuyển sang Chi tiết, chọn Card ID/chương trình, tìm đúng `customerCard`, cuộn giữa màn hình và highlight 1,8 giây.

## 5. Card ID và chương trình

- Card ID dùng input + `datalist`, tìm được theo Card ID, ngân hàng, tên thẻ và phôi.
- Card ID hợp lệ được sắp xếp theo Card ID.
- Dropdown chương trình chỉ lấy chương trình active có `bankCardProductId` đúng Card ID; đổi Card ID sẽ dựng lại danh sách.
- Chương trình hiện tại được giữ nếu còn hợp lệ; nếu không, chọn theo `priority` rồi tên.
- Không có chương trình sẽ hiển thị trạng thái trống và không tính tiến độ giả.

## 6. Bằng chứng nguồn dữ liệu duy nhất

- Tóm tắt readonly đọc trực tiếp `rate`, `maxCashback`, `maxCashbackUnlimited`, `eligibleTarget`, MCC và `transactionMethod` từ bản ghi `cashbackPrograms`.
- Bảng gọi `buildCoordinationRowsForSelection()` → `calculateProgress()`; không lưu bản sao rate/max/target/rule vào dòng điều phối.
- `services/coordination-ui.js` không gọi `save()` và không gán vào `state.cashbackPrograms`, `state.customerCards` hay schema chuẩn.
- Không thay `schemaVersion`.

## 7. Bảng tiến độ, trạng thái và sắp xếp

- Chỉ tính customer card thuộc Card ID và chương trình đang chọn.
- Cột: Khách hàng, Kỳ hiện tại, Đã đánh, Mục tiêu, Còn thiếu, Cashback dự kiến, Còn ngày, Trạng thái, Ghi chú.
- Tiền trong workspace dùng `formatMoney(value, true)` để luôn có `đ`.
- Unlimited hiển thị Mục tiêu = Không giới hạn, Còn thiếu = —.
- Mapping UI không sửa enum engine: Thiếu cấu hình, Cần đánh gấp (≤ 3 ngày), Gần đạt (≥ 80%), Cần đánh, Đã max.
- Threshold tập trung tại `COORDINATION_THRESHOLDS`.
- Sort mặc định: lỗi cấu hình → gấp → gần đạt → cần đánh → hoàn thành; sau đó số ngày, priority chương trình và tên khách hàng.
- Có đủ sort còn thiếu nhiều/ít, còn ngày ít và khách hàng A → Z.

## 8. Responsive

- Desktop/tablet dùng bảng toàn chiều rộng; bảng chỉ cuộn trong vùng bảng khi thật sự cần.
- Smartphone hiển thị hàng dạng accordion: trạng thái thu gọn có khách hàng, còn thiếu, còn ngày, trạng thái; Enter/Space hoặc chạm để mở đủ trường.
- Selector, toolbar và tab chuyển về một cột ở viewport hẹp; không tạo overflow cấp trang.

## 9. File tạo mới

- `services/coordination-ui.js`
- `Docs/CARDFLOW_HOST_ORDER_COORDINATION_UI_V2_REPORT.md`

## 10. File chỉnh sửa

- `services/order-coordination.js`
- `services/cashback-feature-ui.js`
- `tests/cashback-coordination.test.mjs`
- `styles.css`
- `app.js`
- `index.html`

## 11. Kiểm thử đã chạy

- `node --check`: đạt cho `services/coordination-ui.js`, `services/order-coordination.js`, `services/cashback-feature-ui.js`, `app.js`.
- `node --test tests/cashback-coordination.test.mjs tests/credit-limit.test.mjs tests/host-v2.test.mjs`: 10 test, 10 pass, 0 fail.
- HTTP smoke `http://127.0.0.1:8765/`: HTTP 200; có `view-coordination`; cache version mới được tải.
- Browser runtime: module render thành công, có đúng hai tab con, mặc định Nhắc nhở, đủ ba KPI, có nút Gợi ý đơn mới, không có console error.
- `git diff --check`: đạt.

## 12. Còn [Chưa xác minh]

- [Chưa xác minh] Thao tác trực quan với dữ liệu thật và Google Drive vì phiên kiểm tra bị cổng đăng nhập che; không dùng tài khoản/dữ liệu cá nhân để vượt cổng.
- [Chưa xác minh] Ma trận viewport tablet portrait/smartphone bằng ảnh chụp thực tế.
- [Chưa xác minh] Luồng reminder → scroll/highlight và đổi chương trình với tập dữ liệu thật trong trình duyệt.

