# VIỄN DU 07 — vuvietdung.com

Trang chủ là một tàu khảo sát nhỏ trước hành tinh có vành đai. Giao diện tiếng Việt, dẫn trực tiếp đến OXYTOCIN.

- Kéo để xoay tàu; cuộn hoặc chụm hai ngón để thay đổi khoảng cách.
- Nhấn **C** hoặc chọn **Khoang lái** để đổi góc nhìn. Một mô hình duy nhất chứa cả vỏ tàu, kính, nội thất và điểm đặt mắt phi công.
- Trong khoang, kéo để nhìn quanh; cần ga điều khiển luồng phụt, màn hình và âm thanh động cơ. Âm thanh mặc định tắt.
- Khi thiết bị không có WebGL, bộ vẽ Canvas dùng chính hình học đó. Liên kết truyện và hộp liên lạc được khởi tạo độc lập với cảnh 3D.
- Tôn trọng cài đặt giảm chuyển động; tạm dừng khi trang ở nền.

## Phát triển

```sh
npm ci
npm run check
npm test
python3 -m http.server 8000
```

`js/vessel.js` chứa mô hình và kích thước khoang. `js/scene.js` quản lý camera và tương tác. `js/space.js` dựng hành tinh và sao. `js/app.js` quản lý giao diện độc lập.

## Triển khai

Workflow hiện có triển khai lên cPanel, gắn mã commit vào CSS và mọi cạnh nhập module. `app.js` chuyển tiếp mã phiên bản sang module tải động. Dữ liệu SQLite đang chạy được loại khỏi gói triển khai.

Thư mục `oxytocin/` là ứng dụng truyện riêng. Thiết kế lại trang chủ không chỉnh sửa thư mục này và không ghi đè cơ sở dữ liệu đang chạy.
