<?php
declare(strict_types=1);

/**
 * Manual, non-destructive backup of the LEGACY OXYTOCIN SQLite database.
 * Run using PHP CLI on the hosting server, before enabling or deploying v2.
 *
 * OXYTOCIN_LEGACY_BACKUP_DIR must point to an existing PRIVATE directory
 * outside public_html/document root. Never check backup files into Git.
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$source = realpath(dirname(__DIR__) . '/oxytocin.db');
$siteRoot = realpath(dirname(__DIR__, 2));
$directory = getenv('OXYTOCIN_LEGACY_BACKUP_DIR');
$destinationDir = is_string($directory) && $directory !== '' ? realpath($directory) : false;

if ($source === false || !is_file($source) || $siteRoot === false
    || $destinationDir === false || !is_dir($destinationDir)
    || $destinationDir === $siteRoot
    || str_starts_with($destinationDir, $siteRoot . DIRECTORY_SEPARATOR)) {
    fwrite(STDERR, "Backup bị từ chối: kiểm tra database và thư mục sao lưu riêng ngoài website.\n");
    exit(1);
}

$destination = $destinationDir . DIRECTORY_SEPARATOR . 'oxytocin-legacy-'
    . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(6)) . '.db';
$handle = @fopen($destination, 'x');
if ($handle === false) {
    fwrite(STDERR, "Không thể tạo bản sao lưu mới.\n");
    exit(1);
}
fclose($handle);
@chmod($destination, 0600);
$sourceDb = null;
$copyDb = null;
try {
    if (!class_exists(SQLite3::class)) {
        throw new RuntimeException('PHP SQLite3 extension chưa được bật.');
    }
    $sourceDb = new SQLite3($source, SQLITE3_OPEN_READONLY);
    $sourceDb->busyTimeout(10000);
    $copyDb = new SQLite3($destination, SQLITE3_OPEN_READWRITE | SQLITE3_OPEN_CREATE);
    $copyDb->busyTimeout(10000);
    if (!$sourceDb->backup($copyDb)) {
        throw new RuntimeException('SQLite online backup thất bại.');
    }
    $integrity = $copyDb->querySingle('PRAGMA integrity_check');
    if ($integrity !== 'ok') {
        throw new RuntimeException('Bản sao lưu không vượt qua kiểm tra toàn vẹn.');
    }
    $expected = ['settings','parts','arcs','episodes'];
    $found = [];
    $result = $copyDb->query("SELECT name FROM sqlite_master WHERE type='table'");
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) $found[] = $row['name'];
    foreach ($expected as $name) {
        if (!in_array($name, $found, true)) {
            throw new RuntimeException('Bản sao lưu thiếu bảng nguồn: ' . $name);
        }
    }
    $check = $copyDb->query('PRAGMA foreign_key_check');
    if ($check->fetchArray(SQLITE3_NUM) !== false) {
        throw new RuntimeException('Bản sao lưu có khóa ngoại không hợp lệ.');
    }
    $copyDb->close();
    $copyDb = null;
    $sourceDb->close();
    $sourceDb = null;
    echo 'Đã tạo bản sao lưu SQLite: ' . $destination . PHP_EOL;
    echo 'SHA-256: ' . hash_file('sha256', $destination) . PHP_EOL;
    echo 'Kiểm tra: integrity_check=ok; đủ bảng; foreign_key_check=ok.' . PHP_EOL;
} catch (Throwable $e) {
    if ($copyDb !== null) $copyDb->close();
    if ($sourceDb !== null) $sourceDb->close();
    @unlink($destination);
    fwrite(STDERR, 'Sao lưu không hoàn tất: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
