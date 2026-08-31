# CardFlow HOST — Empty Data Boot / Priority Fix V2

## 1. Root cause chính xác

Lỗi nằm tại `services/coordination-ui.js`, hàm `sortCoordinationRows()`.

Trước khi sửa, comparator có biểu thức:

```js
Number(b.program.priority || 0) - Number(a.program.priority || 0)
```

`reminderRows()` chủ động tạo dòng cảnh báo thiếu cấu hình với `program: null` cho customer card có Card Product nhưng chưa có Cashback Program. Khi có ít nhất hai dòng như vậy, `Array.sort()` gọi comparator và truy cập `null.priority`.

Một dòng không gây lỗi vì engine JavaScript không cần gọi comparator. Đây là lý do trạng thái rỗng hoàn toàn hoặc chỉ một thẻ có thể chạy, còn dữ liệu partial từ Drive với từ hai customer card trở lên lại crash.

## 2. Stack trace thực tế trước khi sửa

Stack được tái hiện trên ứng dụng serve qua HTTP bằng fixture có hai customer card và `cashbackPrograms: []`:

```text
TypeError: Cannot read properties of null (reading 'priority')
    at http://127.0.0.1:8765/services/coordination-ui.js:27:193
    at Array.sort (<anonymous>)
    at sortCoordinationRows (http://127.0.0.1:8765/services/coordination-ui.js:22:19)
    at reminderRows (http://127.0.0.1:8765/services/coordination-ui.js:50:9)
    at renderReminders (http://127.0.0.1:8765/services/coordination-ui.js:54:13)
    at renderCoordinationWorkspace (http://127.0.0.1:8765/services/coordination-ui.js:81:601)
    at renderCashbackFeatures (http://127.0.0.1:8765/services/cashback-feature-ui.js?v=20260901-empty-state-v1:39:58)
    at render (http://127.0.0.1:8765/app.js?v=20260901-empty-state-v1:202:114)
    at http://127.0.0.1:8765/app.js?v=20260901-empty-state-v1:503:1
```

## 3. Vì sao lần sửa trước chưa hết

Lần sửa trước tập trung vào Google Identity `TokenClient`. Lỗi hiện tại không phát sinh từ GIS. Nó nằm trong UI Điều phối đơn sau khi state partial/empty được áp dụng và `render()` chạy.

## 4. Quan hệ với luồng Google Drive

Luồng cũ:

```text
click Kết nối Google Drive
→ sync.connect()
→ auth.connect()
→ syncNow()/performSync()
→ tìm/đọc/tạo file Drive
→ canonicalize()
→ setState(remote)
→ render()
→ Điều phối đơn
→ sortCoordinationRows()
→ null.priority
```

`setState` của `SyncService` trước đây gọi `render()` ngay bên trong `performSync()`. Vì vậy exception UI bị catch bởi `performSync()` và sau đó catch của nút kết nối hiển thị sai thành “Không thể kết nối Google Drive”.

Sau sửa:

- `SyncService.setState` chỉ áp dụng state, không render.
- Auth, Drive sync và application bootstrap có ba error boundary riêng.
- Lỗi render được ghi là `[HOST_BOOT] Lỗi khởi tạo ứng dụng sau khi tải dữ liệu`, không bị đổi nhãn thành lỗi Google Drive.
- `applyHostBootstrapData()` là đường state-apply/bootstrap dùng sau Drive và lúc startup.

Chưa có tài khoản Google thật trong phiên kiểm tra nên không khẳng định OAuth thực tế của người dùng đã hoàn tất. Tuy nhiên stack và code path chứng minh exception `priority` là exception render, không phải lỗi GIS.

## 5. Audit `.priority`

| File | Hàm/ngữ cảnh | Biểu thức | Có thể null? | Xử lý |
|---|---|---|---|---|
| `coordination-ui.js` | `sortCoordinationRows` | `a.program.priority`, `b.program.priority` cũ | Có | Thay bằng `getProgramPriority()` |
| `coordination-ui.js` | `selectDefaultProgram`, `programsFor` | priority trong comparator | Dữ liệu có thể thiếu/invalid | Dùng helper tập trung |
| `order-coordination.js` | `buildCoordinationRows` comparator | `row.program.priority` | Về thiết kế có program, nhưng cần chống orphan/null | Dùng helper tập trung |
| `cashback-feature-ui.js` | danh sách chương trình | `a.priority`, `b.priority` | Array có thể chứa malformed entry | Lọc null và dùng helper |
| `local-repository.js` | canonicalize program | priority persisted | Entry được lọc null; giá trị có thể thiếu/invalid | Chuẩn hóa bằng helper |
| `cashback-feature-ui.js` | form chương trình | `existing?.priority`, `v.priority` | `existing` có thể null nhưng đã optional; `v` là FormData | Không dereference null; canonicalization tiếp tục chuẩn hóa |

Helper duy nhất cho business/sort:

```js
getProgramPriority(program)
```

Default hiện tại là `0`.

## 6. Audit comparator/lookup

- Mọi comparator liên quan Cashback Program đã dùng `getProgramPriority()`.
- Program collection lọc malformed null entry trước khi render.
- `order-coordination.js` bỏ qua customer card thiếu product/customer và không tính progress nếu không có program.
- Stale selected program trả về chuỗi rỗng, không tự ánh xạ sang program khác.
- Transaction có orphan `cashbackProgramId` được giữ nguyên; UI lookup không dereference trực tiếp và progress không gán sang program khác.
- Các comparator Card/Customer hiện có đã lọc lookup null hoặc dùng optional/default string.

## 7. Canonicalization và empty data

- Null/missing collection → `[]`.
- Null/malformed entry trong business array được bỏ qua an toàn.
- Không seed bank/card/customer/MCC/program/transaction.
- Không đổi Customer ID hoặc Card ID.
- Orphan program ID trong transaction được giữ để có thể cảnh báo/đối soát, không tự map sang program khác.

## 8. Empty-data runtime

Browser smoke sử dụng chính `app.js` và `applyHostBootstrapData()`:

- All-empty: Dashboard, 10 mục navigation, mọi empty state và Điều phối đơn render thành công.
- Partial no-program: hai customer card, một Card Product, không Cashback Program; render hai cảnh báo “Thiếu cấu hình”, không có console error.
- Không tính cashback progress cho program không tồn tại.

## 9. Cache busting

Phiên bản runtime mới:

```text
20260901-priority-root-fix-v3
```

Đã cập nhật `index.html`, imports trong `app.js`, `sync-service.js`, `cashback-feature-ui.js`, `coordination-ui.js`, `order-coordination.js`, `host-bootstrap.js` và `local-repository.js`.

## 10. File tạo mới

- `services/cashback-program.js`
- `services/host-bootstrap.js`
- `tests/empty-data-bootstrap.test.mjs`
- `tests/fixtures/all-empty.html`
- `tests/fixtures/partial-no-programs.html`
- `Docs/CARDFLOW_HOST_EMPTY_DATA_BOOT_PRIORITY_FIX_V2.md`

## 11. File chỉnh sửa

- `app.js`
- `index.html`
- `services/cashback-feature-ui.js`
- `services/coordination-ui.js`
- `services/local-repository.js`
- `services/order-coordination.js`
- `services/sync-service.js`

## 12. Test result

- `node --check` các file JS sửa/tạo: đạt.
- `node --test tests/*.test.mjs`: 18 test, 18 pass, 0 fail.
- Browser pre-fix reproduction: tái hiện đúng stack `null.priority`.
- Browser post-fix partial no-program trên tab sạch: 0 console error, 2 cảnh báo thiếu cấu hình.
- Browser all-empty bootstrap: 0 console error, Dashboard + 10 navigation + toàn bộ empty state render.
- Served runtime trên tab browser sạch xác nhận tải `app.js?v=20260901-priority-root-fix-v3`, render 2 cảnh báo thiếu cấu hình và không có console error.

## 13. Real OAuth status

`[Chưa xác minh] Real Google OAuth runtime` — phiên kiểm tra không có quyền dùng tài khoản Google thật của người dùng.
