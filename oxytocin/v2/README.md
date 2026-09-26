# OXYTOCIN v2 — Bước 3 (quản trị dữ liệu)

**Chưa phải hệ thống đọc mới.** Đây là nhánh thử nghiệm cho trang quản trị Phần → Arc → Tập → Chương. Không tự nhập lại truyện và không mở nội dung mới cho độc giả. Không thay đổi `oxytocin.db`, `db.php`, `read.php` hoặc admin cũ.

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

**Lưu ý:** Chèn hoặc sắp xếp lại chương đã công khai có thể làm thay đổi số chương hiển thị. ID ổn định để sau này dùng trong URL; trang đọc và tương thích URL cũ thuộc bước sau. Trình soạn thảo trực quan, tự lưu, bản khôi phục và preview thuộc bước 4.

## Kiểm thử

```sh
php -l oxytocin/v2/lib.php
php -l oxytocin/v2/admin.php
php -l oxytocin/v2/init.php
php tests/oxytocin-v2.php
```

Database thử nghiệm nằm trong thư mục tạm bên ngoài website và được xóa sau test. Không chạy các lệnh này trên database production. Trước khi triển khai thật, sao lưu SQLite đang chạy bằng SQLite backup API hoặc `VACUUM INTO` và kiểm tra bản sao. Không chép database trống đè lên database hiện tại.

**Bảo mật cần làm riêng:** admin cũ đang có mật khẩu trực tiếp trong mã nguồn công khai. Cần đổi mật khẩu cũ và đưa bí mật ra khỏi repo trước khi tiếp tục sử dụng trang admin cũ.
