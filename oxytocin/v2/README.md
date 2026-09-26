# OXYTOCIN v2 — Bước 5 (quản trị + trình soạn thảo + trang đọc)

**Đã có mã nguồn trang đọc mới, nhưng chưa triển khai production.** Nhánh thử nghiệm bao gồm trang quản trị, trình soạn thảo và các trang đọc mới Phần → Arc → Tập → Chương. Không tự nhập lại truyện; không thay đổi `oxytocin.db`, `db.php`, `read.php` hoặc admin cũ.

## Dùng ngay trên cPanel (không cần cấu hình)

1. Merge nhánh vào `main` để workflow hiện có triển khai code.
2. Mở `/oxytocin/v2/index.php`. Lần đầu PHP tạo **một file SQLite trống**, tự áp dụng `schema.sql`, không nhập chương hoặc thay đổi `oxytocin.db`.
3. Đăng nhập ở `/oxytocin/admin.php` như trước, rồi vào `/oxytocin/v2/admin.php`. Hai admin dùng chung phiên đăng nhập PHP; không có mật khẩu hoặc biến môi trường v2 thứ hai.
4. Trong admin v2, tạo lần lượt Phần → Arc → Tập → Chương. Chương mới mặc định nháp. Chỉ nút **Đăng chương** mới làm nội dung xuất hiện trên v2.

**Dữ liệu lưu tại `oxytocin/v2/.data/oxytocin_v2.db`.** Thư mục `.data` có `.htaccess` chặn tất cả truy cập HTTP; file SQLite và journal được loại khỏi Git và gói deploy. Kiểm tra URL `/oxytocin/v2/.data/oxytocin_v2.db` phải trả 403/404, **không được tải được file**. Hosting phải dùng Apache/LiteSpeed hoặc áp dụng quy tắc chặn tương đương trên proxy.

Không cần phpMyAdmin, MySQL, Terminal hay PHP-FPM environment. Tùy chọn `OXYTOCIN_V2_DB_PATH` vẫn dùng được cho bản thử nghiệm hoặc khi muốn chuyển database ra ngoài web root. Khi file đã tồn tại, PHP đọc lại và **không tự tạo mới / ghi đè dữ liệu**. Nếu đường dẫn có SQLite không tương thích, hệ thống báo lỗi thay vì sửa file đó.

**Hệ thống cũ vẫn chạy:** `/oxytocin/` và các URL `read.php?arc=...&ep=...` chưa được chuyển sang v2. v2 bắt đầu bằng một mục lục rỗng và chỉ hiển thị nội dung do chính mày bổ sung/đăng sau này.

**Lưu ý bảo mật:** admin cũ có mật khẩu trực tiếp trong mã nguồn GitHub công khai. Phiên quản trị v2 kế thừa cách đăng nhập này. Đổi mật khẩu cũ và đưa bí mật ra khỏi repository khi muốn bảo vệ bản thảo thật.

## Đánh số và xuất bản

Số phần toàn series; số Arc trong mỗi phần; số tập trong mỗi Arc. Số chương hiển thị được tính theo thứ tự công khai của các chương đã đăng trên toàn series, không sử dụng ID. Chương mới mặc định nháp. Có nút đăng/hủy đăng tách biệt. Thao tác ↑ ↓ sắp xếp trong cấp tương ứng. Di chuyển chương sang tập khác bằng biểu mẫu sửa sẽ đặt ở cuối tập mới, không sinh trùng vị trí.

**Lưu ý:** Chèn hoặc sắp xếp lại chương đã công khai có thể làm thay đổi số chương hiển thị. ID trong URL ổn định. Trình soạn thảo thuộc bước 4, trang đọc thuộc bước 5.

## Trình soạn thảo (bước 4)

- Chương mới dùng `content_format=html`, hỗ trợ in đậm, nghiêng, gạch dưới, nhấn mạnh đỏ/sáng, câu đỏ, nhịp vàng, ngắt cảnh, hoàn tác/làm lại và toàn màn hình. Chương `noir_text` tạo ở phiên bản trước vẫn dùng ô văn bản thô, không chuyển định dạng ngầm. Dấu `---` / `✦ ✦ ✦` luôn thuộc nội dung một chương.
- Dán từ Word hoặc Google Docs: loại bỏ mã/thuộc tính không liên quan, giữ đoạn và các nhấn mạnh được hỗ trợ. PHP `render.php` **luôn lọc HTML lại trên server**, bất kể JavaScript có bật hay không. Hosting phải có extension PHP DOM.
- Trạng thái: **Lưu nháp** không đăng; **Đăng chương** lưu và xuất bản trong cùng giao dịch SQLite; **Cập nhật chương đã đăng** là thao tác riêng, kiểm tra phiên bản trước khi ghi. Danh sách chương có nút đăng/hủy đăng cho nội dung đã lưu.
- `preview.php` dùng session + CSRF, nhận nội dung từ biểu mẫu qua POST, hiển thị kiểu trang đọc hiện tại mà **không ghi dữ liệu**. Trình duyệt phải cho phép mở tab mới cho bản xem trước.
- Editor tạo bản khôi phục bằng `localStorage` của chính thiết bị/trình duyệt. Mỗi lần mở lại, có lựa chọn **Khôi phục** hoặc **Bỏ bản khôi phục**. Tự lưu không gửi nội dung lên server, không đăng chương. Cảnh báo trước khi rời trang nếu còn thay đổi chưa lưu. Nếu trình duyệt chặn hoặc xóa localStorage, bản khôi phục không được bảo đảm; vẫn nên chọn Lưu nháp định kỳ. Mỗi thiết bị hiện có một bản khôi phục cho biểu mẫu chương mới (`new`).
- Không tải thư viện hoặc font từ trình soạn thảo bên thứ ba. Toolbar dùng các lệnh chỉnh sửa sẵn có của trình duyệt; cần kiểm tra thao tác thật trên các trình duyệt dùng để viết (desktop/mobile) trước khi triển khai.

## Trang đọc công khai (bước 5)

- `index.php`: mục lục mới Phần → Arc → Tập → Chương, có thể thu gọn bằng `details`. Chỉ liệt kê chương `published` trong phần `active`; phần/tập chưa có chương công khai không được đưa vào mục lục.
- `part.php?id=...`, `arc.php?id=...`: trang cấp phần và Arc. `episode.php?id=...`: **trang tập**, liệt kê các chương đã đăng và nút **Đọc toàn bộ tập**.
- `chapter.php?id=...`: đọc một chương. Nút chương trước/sau duyệt liên tục toàn series (kể cả khi sang tập, Arc, phần khác). `episode-read.php?id=...`: đọc các chương đã đăng trong một tập, ghép từ cùng dữ liệu (không lưu bản sao). Nội dung nháp và các phần sắp ra mắt đều bị từ chối **ở phía PHP**, kể cả khi đoán đúng ID.
- ID chương/tập ổn định trong URL; số chương hiển thị được tính lại theo thứ tự Phần, Arc, Tập, chương công khai. Số chương trong CMS được đồng bộ với số trên trang đọc. Những chương đã đăng nằm trong phần `coming_soon` không được tính số công khai và chưa thể đọc cho tới khi mở phần.
- `reader.js` tái sử dụng lựa chọn nền/cỡ chữ ở trình duyệt (khóa localStorage cũ: `reading_theme`, `reading_fontsize`), lưu tiến độ v2 riêng bằng khóa `oxytocin:v2:reading-progress`. Trên các trang đọc, `Đọc tiếp` phục hồi đúng chế độ đọc chương/tập và vị trí gần nhất (trong phạm vi thiết bị/trình duyệt). Nếu chương được thu hồi, liên kết cũ dẫn đến 404 thay vì làm lộ nội dung. Vị trí không đồng bộ qua nhiều thiết bị.
- `read.php?arc=...&ep=...` **bản cũ chưa sửa**, vẫn sử dụng database gốc; chưa thay đổi liên kết từ trang chủ hiện hành sang hệ thống v2. Không gộp database production với database trống. Khi đến bước triển khai, cần quyết định cách chuyển mục lục công khai mà không phá các URL cũ.
- `---` và `✦ ✦ ✦` trong một chương là dấu ngắt cảnh, không tự tách chương. HTML đã đăng được lọc lại trên máy chủ khi hiển thị.
- Trang mới sử dụng bộ CSS Noir đang có, bổ sung `reader.css`; trang xem trước dùng chung CSS trình đọc. Không thiết kế lại UI gọn hơn trong bước này.

Đã có kiểm thử tự động Chromium desktop/mobile và HTTP, nhưng vẫn cần xác nhận trực tiếp trên hosting sau khi deploy: trang đọc v2 trả 200, admin sử dụng phiên đăng nhập cũ và URL SQLite bị chặn.

## Kiểm thử

```sh
php -l oxytocin/v2/lib.php
php -l oxytocin/v2/admin.php
php -l oxytocin/v2/init.php
php tests/oxytocin-v2.php
php tests/oxytocin-v2-autoinit.php
bash tests/oxytocin-v2-reader-http.sh
```

Database kiểm thử nằm trong thư mục tạm và được xóa sau test. Không chạy bộ test trên database production. Có sẵn `backup-legacy.php` để sao lưu SQLite gốc bằng PHP CLI khi cần; không bao giờ ghi đè `oxytocin.db`.

