# Báo cáo sửa CRUD/render Mã MCC

## 1. Kết quả truy nguyên

### Double-click mở form trống — đã tái hiện và xác định chính xác

- `renderCashbackFeatures()` sinh bảng MCC bằng `data-feature-table="mcc"`, không có `data-entity`.
- Sau khi module MCC bind sự kiện, `app.js/bindTables()` lại bind mọi `tr[data-id]` trong toàn tài liệu.
- Double-click MCC vì thế gọi `openDetail(undefined, mccId)`, rồi rơi vào form CRUD chung `openForm(undefined, mccId)`. Form này không tra được MCC nên phần nhập trống.
- Sửa bằng cách giới hạn binder chung vào `table[data-entity] tr[data-id]`. Binder riêng của cashback gắn click và double-click, cả nút **Chỉnh sửa** lẫn double-click đều gọi cùng `open(entity, id)` với đúng `row.dataset.id`.

### Bảng chỉ hiện một dòng và Add không hiện — không tái hiện được trên checkout hiện tại

- Đã kiểm tra toàn bộ đường render/save hiện tại: không có `.find()`, `slice(0, 1)`, early return, Set/Map gộp theo tên/mã, hay phép gán mảng chỉ chứa bản ghi mới.
- Fixture 3 MCC tạo đúng 3 `<tr>`; Add nối mảng 3 thành 4 và render ngay; reload vẫn còn 4.
- Vì không có bản JSON Drive gây lỗi ban đầu và hai triệu chứng này không tái hiện trên mã hiện tại, chưa đủ bằng chứng để quy cho một nguyên nhân lịch sử cụ thể. **[Chưa xác minh]** nguyên nhân chính xác của hai triệu chứng người dùng đã thấy trước bản sửa.
- Phần gia cố đã thực hiện: CRUD MCC có helper append/update bất biến, bảo đảm ID mới không trùng; selection MCC được giữ qua render và tự xóa nếu ID không còn; sort theo Nhóm MCC rồi mã đầu tiên; cache runtime được đổi phiên bản.

## 2. Luồng MCC đã kiểm tra

- A. Render: `renderCashbackFeatures()` → `sortMccCategories()` → `mccRows` → `table("mcc", ...)`.
- B. Mở Add: `[data-feature-add="mcc"]` → `open("mcc")`.
- C. Lưu Add: submit form → tạo MCC/ID → `upsertMccCategory()` → `save()` → canonicalize → render.
- D. Mở Edit: nút Edit hoặc double-click → cùng `open("mcc", row.dataset.id)`.
- E. Lưu Edit: `upsertMccCategory()` thay đúng phần tử có cùng ID.
- F. Delete: `remove("mcc")`; vẫn chặn nếu Cashback Program hoặc Transaction tham chiếu.
- G. Selection: binder riêng đánh dấu `.selected`, lưu `selectedMccId`, kiểm tra lại sau render.
- H. Double-click: binder riêng đọc `data-feature-table` và `data-id`.
- I. Canonicalize: `canonicalize()` giữ array, tên, nhiều mã, mô tả, ghi chú và ID hợp lệ.

## 3. ID và canonicalization

- ID hợp lệ cũ được giữ nguyên.
- ID thiếu/rỗng hoặc trùng là dữ liệu tham chiếu không an toàn; canonicalization chỉ tạo ID mới cho các trường hợp này.
- Không dùng MCC code, index hay số dòng làm ID.
- Nhiều mã MCC vẫn lưu bằng `codes: string[]`; form/render roundtrip bằng danh sách phân cách dấu phẩy.
- Canonicalization 3 bản ghi chạy hai lần cho kết quả giống nhau.

## 4. Local/Google Drive roundtrip

- JSON serialization → parse → canonicalize giữ đủ 3 MCC và toàn bộ trường.
- Không đổi tên file Drive, auth, revision, namespace hay kiến trúc sync.
- Không reset/seed dữ liệu production.
- Việc roundtrip với tài khoản Google Drive thật: **[Chưa xác minh]**; test xác minh đúng payload local/canonical JSON mà sync sử dụng.

## 5. File/hàm thay đổi

- `services/cashback-feature-ui.js`: sort/search/upsert MCC, selection bền qua render, double-click dùng chung `open()`.
- `services/local-repository.js`: bảo đảm ID MCC duy nhất, giữ ID hợp lệ.
- `app.js`: giới hạn binder CRUD chung; cập nhật cache version.
- `index.html`: cập nhật cache version.
- `tests/mcc-crud.test.mjs`: regression CRUD/search/canonicalization/roundtrip.
- `tests/fixtures/mcc-crud.html`: browser fixture dùng trực tiếp module production.

## 6. Kết quả test

- Node test: **24/24 đạt**.
- Bao phủ: empty/1/3 dòng, Add 1→2→3, ID duy nhất, edit độc lập, delete giữ A/C, search/clear, canonicalization 3 dòng, idempotency, JSON roundtrip.
- Browser fixture dùng module UI production:
  - 3 MCC hiển thị đồng thời.
  - Add `Du lịch / 4722` → 4 dòng ngay.
  - Double-click `Ăn uống / 5812` → form có đúng nhóm, mã, mô tả, ghi chú.
  - Sửa mô tả chỉ đổi dòng Ăn uống.
  - Reload vẫn đủ 4 dòng.
  - Search `5812` chỉ còn đúng dòng; clear search bỏ `hidden` khỏi cả 4 dòng.
  - Console error: 0.
- Browser trên app shell với phiên Google Drive đăng nhập thật: **[Chưa xác minh]** vì test không bypass cổng OAuth; fixture chạy trực tiếp đúng module production và repository canonicalization.
