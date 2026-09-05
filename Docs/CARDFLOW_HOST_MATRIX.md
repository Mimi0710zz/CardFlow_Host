# Ma trận điều phối đơn

## Phạm vi và dữ liệu

- Thêm `Ma trận` cạnh `Nhắc nhở` và `Chi tiết`; giữ các luồng hiện có.
- Dùng `customers`, `customerCards`, `cardProducts`, `cashbackPrograms`, `transactions`, `banks`, `mccCategories` hiện có. Giao dịch nối với thẻ sở hữu qua `customerCardId`, chương trình qua `cashbackProgramId`.
- Không thêm trường dữ liệu, không đổi schema hoặc khóa `cardflow-host-data-v1`, không lưu trạng thái/màu Ma trận. Bộ lọc chỉ tồn tại trong bộ nhớ giao diện.
- `matrix-engine.js` lập chỉ mục giao dịch theo thẻ sở hữu, rồi gọi `calculateProgress` trên tập giao dịch của thẻ; không quét toàn bộ giao dịch cho từng ô. Mô hình được dùng lại khi lọc trong cùng lần dựng giao diện.

## Bộ tính kỳ và trạng thái

- `getMonthlyCycle`: từ ngày đầu đến ngày cuối tháng hiện tại; khóa `YYYY-MM`.
- `getStatementCycle`, `getCustomerCardCycle`: tái sử dụng `calculateCashbackCycle` và `customerCardCycleConfig`. Ngày sao kê lấy riêng từ `CustomerCard.statementDay`; không lấy từ Card ID. Ngày chốt vẫn thuộc kỳ cũ, ngày tiếp theo mở kỳ mới. Ngày 29/30/31 được giới hạn bởi ngày cuối tháng tương ứng, kể cả tháng 2 năm nhuận.
- `getCycleKey`, `getTransactionsInCycle`, `getMatrixCellState` tách khỏi giao diện. Kiểm tra đổi ngày mỗi 30 giây khi sub-tab Ma trận đang được dựng; thao tác mở ô tính lại dữ liệu hiện tại.
- Xám `NOT_APPLICABLE`: không có thẻ sở hữu đang hoạt động; dấu `—`, không bấm được.
- Xanh `AVAILABLE`: có thẻ, chi tiêu hợp lệ bằng 0.
- Vàng `IN_PROGRESS`: đã có chi tiêu nhưng chưa đạt điều kiện chương trình.
- Đỏ `COMPLETED`: đã đạt điều kiện chương trình trong kỳ. Với chương trình một điều kiện thông thường, tương đương chi tiêu hợp lệ >= chỉ tiêu.
- Tái sử dụng chỉ tiêu, cashback dự kiến, điều kiện MCC/hình thức giao dịch, AND/OR, chi tiêu tổng, nhóm cashback chung và loại trừ của `calculateProgress`. Không tạo công thức cashback mới.
- Giao dịch phải khớp khách hàng, thẻ sở hữu, chương trình, kỳ, MCC/hình thức và thời gian hiệu lực chương trình. Giao dịch `cancelled` bị loại theo quy tắc hiện có. Chi tiêu ngoài thời gian hiệu lực chương trình vẫn có thể thuộc chi tiêu tổng của thẻ, nhưng không tính vào cashback của chương trình đó.

## Luồng thao tác

- Xanh: hộp thông tin → `Đánh đơn` → chuyển Giao Dịch / Đánh đơn và mở `Thêm đơn mới`.
- Vàng: hộp tiến độ, thanh tiến độ, còn thiếu → `Đánh thêm đơn` → cùng form hiện có.
- Điền khách hàng, thẻ sở hữu, chương trình; chỉ chọn MCC khi suy ra duy nhất. Hiển thị tỷ lệ cashback và kỳ trong phần ngữ cảnh. Hình thức giao dịch được truyền khi không mơ hồ; tiền đơn và loại đơn vẫn do người dùng nhập/chọn.
- Đỏ: hộp chi tiết liệt kê toàn bộ giao dịch hợp lệ và tổng → `Xem giao dịch` mở danh sách lọc khách/thẻ/chương trình/kỳ, kể cả kỳ đi qua hai tháng. Có nút xóa lọc Ma trận; đổi tháng/năm cũng thoát phạm vi này. Phạm vi là bộ lọc động, không lưu danh sách ID giao dịch cố định.
- Dùng các lớp modal/nút hiện có. Modal Ma trận hỗ trợ Escape, đóng khi bấm nền, giữ focus trong hộp và trả focus khi đóng.

## Bộ lọc và bố cục

- Tìm ngân hàng/Card ID/phôi/chương trình; lọc ngân hàng, Card ID, chương trình, trạng thái, `Chỉ hiện cần xử lý`.
- Dropdown khách hàng có tìm tên, chọn tất cả, bỏ chọn tất cả, chọn nhiều; tên đầy đủ vẫn giữ nguyên trong dữ liệu. `formatMatrixCustomerName` rút gọn các từ trước từ cuối, ví dụ `N.Q.Minh`.
- Sắp xếp theo ngân hàng → Card ID → chương trình; khách hàng theo tên đầy đủ với locale `vi` và ID phá hòa để thứ tự ổn định.
- Desktop/tablet ngang: đúng bốn cột cố định Ngân hàng / Card ID / Phôi / Chương trình hoàn tiền; cột khách khoảng 82px; cuộn riêng bảng và header sticky. Các chương trình cùng thẻ được phân nhóm bằng đường phân cách.
- Điện thoại và tablet dọc đến 1024px: danh sách chương trình có thể thu/mở và các khách hàng xếp dọc, không ép bảng lớn vào màn hình nhỏ.

## Những giới hạn/quy tắc cần biết

- Mô hình hiện tại đặt loại kỳ ở Card Product và cho phép CustomerCard ghi đè; không có loại kỳ riêng độc lập ở mỗi chương trình. Ma trận kế thừa đúng mô hình này.
- Với chương trình nhiều điều kiện hoặc có chi tiêu tổng, màu đỏ tuân theo điều kiện AND/OR hiện có. Đạt một số tiền nhóm hiển thị chưa chắc đã đạt toàn bộ chương trình; modal thể hiện các điều kiện và chi tiêu tổng.
- Không giới hạn và không có mục tiêu hữu hạn bổ sung: không đặt chỉ tiêu giả; xanh khi chưa chi, vàng khi đã chi, vẫn có thể đánh tiếp. Nếu có điều kiện chi tiêu tổng thì áp dụng kết quả bộ tính hiện có.
- Thiếu ngày sao kê, nhóm loại trừ bị khóa/cần xác nhận, chương trình ngoài hiệu lực hoặc nhiều bản ghi sở hữu cùng Card ID: hiện `⚠` trung tính kèm lý do, không suy đoán một thẻ/kỳ và không mời đánh đơn sai. Đây là cảnh báo cấu hình, không phải trạng thái màu lưu trong dữ liệu.
- Form giao dịch hiện tại không có trường tỷ lệ cashback/kỳ độc lập để sửa; chương trình được chọn là nguồn xác định tỷ lệ, ngày đơn và thẻ sở hữu là nguồn xác định kỳ. Không bổ sung dữ liệu tài chính giả.
- Không thay đổi dịch vụ Google Drive. [Chưa xác minh] Đồng bộ với tài khoản Drive thật; kiểm thử đã xác minh việc thay thế dữ liệu đầu vào và dựng lại Ma trận.
- Không tìm thấy `PROJECT_MEMORY.md` / `PROJECT_MEMORY_BUTTON.md` trong dự án; sử dụng lớp nút hiện có.

## Kiểm tra

- `node --test tests/matrix.test.mjs`: 8 kiểm thử đạt, bao phủ A–J, ngữ cảnh K/L, thứ tự, dữ liệu sau đồng bộ và sửa chương trình/giao dịch.
- Kiểm thử Chrome headless riêng: K/L/M, lưu đơn và đổi sang vàng, bốn cột cố định khi thực sự cuộn ngang, không tràn trang, bộ lọc và các kích thước 1440×1000, 1024×768, 768×1024, 390×844 đều đạt. Đã xem ảnh desktop/mobile.
- Chạy kiểm thử trình duyệt bằng PowerShell: `$env:MATRIX_BROWSER_TEST='1'; node --test tests/matrix-browser.test.mjs`. Có thể đặt `CHROME_PATH` nếu Chrome nằm ở đường dẫn khác. Hồ sơ Chrome và dữ liệu kiểm thử riêng, không dùng tài khoản/dữ liệu thật. Mặc định kiểm thử này bỏ qua trong bộ unit test.
- Toàn bộ `node --test tests/*.test.mjs`: 121 kiểm thử, 117 đạt, 3 lỗi có sẵn, 1 bỏ qua (Chrome chạy riêng và đạt).
- Ba lỗi có sẵn: `cashflow modal uses compact unequal fee columns`, `cashflow compact fee stylesheet cache is bumped`, `cashflow modal CSS cache version matches latest compact-fee layout release`. Đã đối chiếu HEAD: CSS không còn kích thước mà test yêu cầu; HTML gốc dùng phiên bản CSS `20260905-cashback-conditions-v1`, còn test yêu cầu `20260903-cashflow-compact-fee-v1`. Không sửa giao diện Dòng tiền ngoài phạm vi.
- Kiểm tra cú pháp các mô-đun sửa/tạo và `git diff --check` đạt. Dự án HTML/CSS/JS thuần, không có `package.json` hoặc lệnh build/lint riêng.
