<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require_once __DIR__ . '/lib.php';

try {
    $path = v2_init();
    echo "Đã tạo database v2 TRỐNG: $path\n";
    echo "Không nhập nội dung truyện. Database cũ không thay đổi.\n";
} catch (Throwable $e) {
    fwrite(STDERR, "Không khởi tạo database: " . $e->getMessage() . "\n");
    exit(1);
}
