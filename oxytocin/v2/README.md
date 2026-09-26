# OXYTOCIN v2 — Bước 4 (quản trị + trình soạn thảo)

**Chưa phải hệ thống đọc mới.** Đây là nhánh thử nghiệm cho trang quản trị và trình soạn thảo Phần → Arc → Tập → Chương. Không tự nhập lại truyện và không mở nội dung mới cho độc giả. Không thay đổi `oxytocin.db`, `db.php`, `read.php` hoặc admin cũ.

## Database

Chạy PHP CLI trên máy chủ, tạo thư mục dữ liệu nằm **ngoài document root**, rồi đặt biến môi trường `OXYTOCIN_V2_DB_PATH` bằng đường dẫn tuyệt đối tới file CHƯA TỒN TẠI. Ví dụ: `/home/USER/oxy-private/oxytocin_v2.db`. Tạo bằng:

```sh
php oxytocin/v2/init.php
```

Lệnh chỉ tạo database trống khi chưa tồn tại. Trên web, `v2/lib.php` không tự khởi tạo file. Đường dẫn nằm trong repository/site hoặc trỏ vào database cũ sẽ bị từ chối. Biến môi trường phải được cấu hình cho PHP chạy qua web nữa; cấu hình shell tạm thời không tự áp dụng cho PHP-FPM/cPanel.

## Đăng nhập

Thiết lập biến môi trường **`OXYTOCIN_V2_ADMIN_PASSWORD_HASH`** bằng mã băm do `password_hash` tạo ra. Không lưu mật khẩu hoặc mã băm vào repository. Không tái sử dụng mật khẩu quản trị cũ đã xuất hiện trong code công khai. Nếu chưa có mã băm hoặc database chưa khởi tạo, `v2/admin.php` trả về lỗi 503 và không thể đăng nhập.

Admin ở `/oxytocin/v2/admin.php`. Nó dùng session riêng, CSRF cho mọi yêu cầu ghi, đăng nhập có giới hạn số lần thử, kiểm tra revision chương, các thao tác xóa là POST có bước xác nhận. Không cho xóa chương đang đăng hoặc mục còn dữ liệu con.

## Đánh số và xuất bản

Số phần toàn series; số Arc trong mỗi phần; số tập trong mỗi Arc. Số chương hiển thị được tính theo thứ tự công khai của các chương đã đăng trên toàn series, không sử dụng ID. Chương mới mặc định nháp. Có nút đăng/hủy đăng tách biệt. Thao tác ↑ ↓ sắp xếp trong cấp tương ứng. Di chuyển chương sang tập khác bằng biểu mẫu sửa sẽ đặt ở cuối tập mới, không sinh trùng vị trí.

**Lưu ý:** Chèn hoặc sắp xếp lại chương đã công khai có thể làm thay đổi số chương hiển thị. ID ổn định để sau này dùng trong URL; trang đọc và tương thích URL cũ thuộc bước sau. Trình soạn thảo trực quan, bản khôi phục và trang xem trước đã có trong bước 4; trang đọc công khai và mục lục thuộc bước 5.

## Trình soạn thảo (bước 4)

- Chương mới dùng `content_format=html`, hỗ trợ in đậm, nghiêng, gạch dưới, nhấn mạnh đỏ/sáng, câu đỏ, nhịp vàng, ngắt cảnh, hoàn tác/làm lại và toàn màn hình. Chương `noir_text` tạo ở phiên bản trước vẫn dùng ô văn bản thô, không chuyển định dạng ngầm. Dấu `---` / `✦ ✦ ✦` luôn thuộc nội dung một chương.
- Dán từ Word hoặc Google Docs: loại bỏ mã/thuộc tính không liên quan, giữ đoạn và các nhấn mạnh được hỗ trợ. PHP `render.php` **luôn lọc HTML lại trên server**, bất kể JavaScript có bật hay không. Hosting phải có extension PHP DOM.
- Trạng thái: **Lưu nháp** không đăng; **Đăng chương** lưu và xuất bản trong cùng giao dịch SQLite; **Cập nhật chương đã đăng** là thao tác riêng, kiểm tra phiên bản trước khi ghi. Danh sách chương có nút đăng/hủy đăng cho nội dung đã lưu.
- `preview.php` dùng session + CSRF, nhận nội dung từ biểu mẫu qua POST, hiển thị kiểu trang đọc hiện tại mà **không ghi dữ liệu**. Trình duyệt phải cho phép mở tab mới cho bản xem trước.
- Editor tạo bản khôi phục bằng `localStorage` của chính thiết bị/trình duyệt. Mỗi lần mở lại, có lựa chọn **Khôi phục** hoặc **Bỏ bản khôi phục**. Tự lưu không gửi nội dung lên server, không đăng chương. Cảnh báo trước khi rời trang nếu còn thay đổi chưa lưu. Nếu trình duyệt chặn hoặc xóa localStorage, bản khôi phục không được bảo đảm; vẫn nên chọn Lưu nháp định kỳ. Mỗi thiết bị hiện có một bản khôi phục cho biểu mẫu chương mới (`new`).
- Không tải thư viện hoặc font từ trình soạn thảo bên thứ ba. Toolbar dùng các lệnh chỉnh sửa sẵn có của trình duyệt; cần kiểm tra thao tác thật trên các trình duyệt dùng để viết (desktop/mobile) trước khi triển khai.

## Kiểm thử

```sh
php -l oxytocin/v2/lib.php
php -l oxytocin/v2/admin.php
php -l oxytocin/v2/init.php
php tests/oxytocin-v2.php
```

Database thử nghiệm nằm trong thư mục tạm bên ngoài website và được xóa sau test. Không chạy các lệnh này trên database production. Trước khi triển khai thật, sao lưu SQLite đang chạy bằng SQLite backup API hoặc `VACUUM INTO` và kiểm tra bản sao. Không chép database trống đè lên database hiện tại.

**Bảo mật cần làm riêng:** admin cũ đang có mật khẩu trực tiếp trong mã nguồn công khai. Cần đổi mật khẩu cũ và đưa bí mật ra khỏi repo trước khi tiếp tục sử dụng trang admin cũ.
