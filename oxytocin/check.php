<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "<h3>KIỂM TRA MÔI TRƯỜNG HOSTING</h3>";
echo "1. PHP Version: " . PHP_VERSION . "<br>";
echo "2. Extension pdo_sqlite: " . (extension_loaded('pdo_sqlite') ? '<b style="color:green">ĐÃ BẬT</b>' : '<b style="color:red">CHƯA BẬT (LỖI)</b>') . "<br>";
echo "3. Quyền ghi thư mục: " . (is_writable(__DIR__) ? '<b style="color:green">GHI ĐƯỢC</b>' : '<b style="color:red">BỊ CHẶN (LỖI)</b>') . "<br>";

try {
    $test = new PDO('sqlite:' . __DIR__ . '/test_write.db');
    echo "4. Khởi tạo file SQLite: <b style='color:green'>THÀNH CÔNG</b><br>";
    @unlink(__DIR__ . '/test_write.db');
} catch (Exception $e) {
    echo "4. Khởi tạo file SQLite: <b style='color:red'>THẤT BẠI</b> — " . $e->getMessage() . "<br>";
}