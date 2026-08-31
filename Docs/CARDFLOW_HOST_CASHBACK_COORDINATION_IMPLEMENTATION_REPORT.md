# BÁO CÁO TRIỂN KHAI CARDFLOW HOST CASHBACK COORDINATION

## 1. Kiến trúc gốc

- Entry: `index.html`, `app.js`, `styles.css`.
- ES modules trong `services/`; UI render trực tiếp theo view, dùng modal/table/toolbar chung.
- Schema cũ V2: `banks`, `customers`, `cardProducts`, `customerCards`, `settings`.
- Local-first: `cardflow-host-data-v1`; metadata: `cardflow-host-sync-meta-v1`.
- Google Drive riêng của HOST: `cardflow-host-data.json`, có revision, dirty state, hàng đợi sync và backup.
- Responsive gốc dùng breakpoint desktop/tablet/mobile và bảng accordion trên màn hình nhỏ.

Không tìm thấy `PROJECT_MEMORY.md` hoặc `PROJECT_MEMORY_BUTTON.md` trong repository HOST. Triển khai giữ nguyên helper, palette, modal, toolbar và breakpoint hiện có.

## 2. Client đã tham chiếu ở chế độ chỉ đọc

- `index.html`, `app.js`, `styles.css`.
- `services/default-data.js`, `services/local-repository.js`, `services/card-id.js`.
- `services/cashback.js`, `services/cashback-period.js`.
- Luồng MCC, transaction, Google Drive repository/sync và shared cashback cap.

Không có file nào trong `D:\1_Coding\05_WebApp\CardFlow` bị sửa.

## 3. File tạo mới

- `services/cashback-cycle.js`: tính chu kỳ tháng/sao kê.
- `services/cashback-progress.js`: matching và tiến độ cashback.
- `services/order-coordination.js`: sắp thứ tự vận hành và gợi ý đơn.
- `services/cashback-feature-ui.js`: UI/CRUD cho MCC, chương trình, giao dịch, điều phối.
- `tests/cashback-coordination.test.mjs`: test migration, cycle, progress, shared cap, recommendation và serialization.

## 4. File đã chỉnh sửa

- `index.html`: navigation/view mới, cache-busting V4.
- `app.js`: metadata view, tích hợp feature module, KPI/guide cashback, trường cycle cho Thẻ ngân hàng và thẻ khách hàng.
- `styles.css`: modal feature, ghi chú/nhắc việc, dashboard/coordination responsive.
- `services/default-data.js`: empty schema V3.
- `services/local-repository.js`: canonicalization/migration V3.
- `tests/host-v2.test.mjs`: kỳ vọng schema V3.

## 5. Schema và migration

Schema V3 bổ sung:

- `cardProducts.cashbackCycleMode`, `cardProducts.defaultStatementDay`.
- `customerCards.bankCardProductId`, `customerCards.cashbackCycleModeOverride` và giữ nguyên `cardProductId` để tương thích.
- `cashbackPrograms`, `mccCategories`, `transactions`.

Migration tự động, idempotent và không đổi Customer ID/Card ID/relationship ID. `revision`, `deviceId`, `settings`, dữ liệu cũ và namespace sync được giữ. Quan hệ cũ đã có `cardProductId` được ánh xạ trực tiếp, không đoán theo tên. Không seed khách hàng/thẻ demo.

## 6. Thẻ ngân hàng

`cardProducts` tiếp tục là master sản phẩm thẻ. UI dùng nhãn Thẻ ngân hàng, ngân hàng lấy từ master Mã ngân hàng. Form bổ sung Hình thức hoàn `monthly`/`statement` và ngày sao kê mặc định; `statement` bắt buộc có ngày hợp lệ 1..31. Thẻ khách hàng có override chu kỳ tùy chọn và ngày sao kê riêng.

## 7. Cashback, MCC và giao dịch

- Chương trình thuộc `bankCardProductId`, hỗ trợ ngày, nhiều MCC, phương thức, rate, capped/unlimited, auto eligible target, total target độc lập, shared group, priority, note và status.
- MCC có CRUD/search/sort, nhiều mã, mô tả/note và chặn xóa khi đang được tham chiếu.
- Giao dịch theo Customer → Customer Card, tự giới hạn Card ID theo khách, giới hạn chương trình theo sản phẩm và tự chọn khi chỉ có một rule khớp MCC/phương thức.
- Trạng thái: Hoàn tất, Chờ xử lý, Đã hủy; Đã hủy không tham gia tính cashback.

## 8. Chu kỳ, tiến độ và nhắc việc

- Theo tháng: ngày đầu đến ngày cuối tháng.
- Theo sao kê: ngày sau sao kê trước đến ngày sao kê hiện tại/kế tiếp; ngày 30/31 tự chặn theo ngày cuối tháng.
- Thiếu statement day trả về `configuration-incomplete`, hiển thị cảnh báo và loại khỏi gợi ý sai.
- Progress theo Customer + Customer Card + Program + Cycle, theo dõi eligible/total spend, cashback, target, remaining, percent, days và status.
- Capped dừng ở max; unlimited không tạo target/remaining giả; shared group không vượt shared cap.
- Ghi chú thủ công và nhắc việc hệ thống có style khác nhau; reminder được suy ra runtime.

## 9. Điều phối đơn và Dashboard

- Bảng Điều phối đơn ưu tiên mục chưa hoàn thành có kỳ kết thúc sớm, sau đó mới dùng priority cấu hình.
- Gợi ý đơn nhận số tiền, MCC, hình thức; trả eligible amount, cashback tăng và remaining trước/sau; loại rule không hợp lệ/đã max.
- Dashboard giữ KPI/bảng cũ, bổ sung Cần đánh đơn, Sắp hết kỳ, Cần ưu tiên và Đã hoàn thành.

## 10. Google Drive

Không thay auth/sync/revision/backup. Canonical serialization V3 đi qua cùng `LocalRepository` và `SyncService`. HOST vẫn dùng `cardflow-host-data-v1`, `cardflow-host-sync-meta-v1`, `cardflow-host-data.json`; không dùng namespace/file của Client.

## 11. Kiểm thử đã chạy

- `node --check` cho `app.js` và toàn bộ `services/*.js`: PASS.
- `node --test tests/*.test.mjs`: 8/8 PASS, 0 fail.
- Migration đại diện + chạy hai lần + giữ ID/revision/settings: PASS.
- Chu kỳ tháng, statement day 1/20/28/30/31, leap year, Dec/Jan: PASS.
- Capped, unlimited, eligible + total target, shared cap, cancelled exclusion: PASS.
- Program/MCC matching và recommendation: PASS.
- LocalStorage serialization roundtrip cho product/program/MCC/transaction/override: PASS.
- HTTP smoke `http://127.0.0.1:8765/`: HTTP 200.
- Browser smoke: module/render navigation, Dashboard và Điều phối đơn render thành công sau sửa lỗi cache; console không phát sinh lỗi mới ở runtime V4.
- Responsive browser metrics: 1440×900, 1180×820, 820×1180, 390×844 đều có `bodyScrollWidth == viewportWidth`, không xuất hiện khoảng trống/overflow ngang toàn trang.

## 12. Còn [Chưa xác minh]

- [Chưa xác minh] CRUD end-to-end trong browser khi login gate yêu cầu tài khoản Google được cấp quyền; test browser không đăng nhập OAuth thật.
- [Chưa xác minh] Google Drive upload/download/backup với tài khoản authorized thực tế.
- [Chưa xác minh] Đối chiếu hình ảnh thủ công từng modal/table trên thiết bị vật lý; browser đã kiểm tra breakpoint và không overflow toàn trang.

Không git commit và không git push.
