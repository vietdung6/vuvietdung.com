<?php
declare(strict_types=1);
require_once __DIR__ . '/../oxytocin/v2/lib.php';

/** No cli init.php call: this emulates the very first web request. */
function confirm(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}
$path = sys_get_temp_dir() . '/oxy-v2-auto-' . bin2hex(random_bytes(8)) . '.db';
$other = sys_get_temp_dir() . '/oxy-v2-foreign-' . bin2hex(random_bytes(8)) . '.db';
$old = realpath(__DIR__ . '/../oxytocin/oxytocin.db');
$oldHash = $old ? hash_file('sha256', $old) : null;
try {
    putenv('OXYTOCIN_V2_DB_PATH=' . $path);
    confirm(!file_exists($path), 'Test DB starts absent');
    $db = v2_db();
    confirm(is_file($path), 'First HTTP-style call creates SQLite');
    confirm((int)$db->query('PRAGMA user_version')->fetchColumn() === 2, 'Schema is v2');
    foreach (['parts','arcs','episodes','chapters','settings'] as $table) {
        confirm((int)$db->query("SELECT COUNT(*) FROM $table")->fetchColumn() === 0,
            $table . ' must be empty after automatic creation');
    }
    confirm($db->query('PRAGMA integrity_check')->fetchColumn() === 'ok', 'Integrity');
    $db->exec("INSERT INTO parts(part_num,title_vi) VALUES(0,'Tự thêm về sau')");
    $db = null;
    $db = v2_db();
    confirm((int)$db->query('SELECT COUNT(*) FROM parts')->fetchColumn() === 1,
        'Next request preserves data; no reinitialization');
    $db = null;
    try {
        v2_init();
        throw new RuntimeException('init.php unexpectedly overwrote existing database');
    } catch (RuntimeException $e) {
        confirm(str_contains($e->getMessage(), 'đã tồn tại'), 'CLI refuses overwrite');
    }

    $foreign = new SQLite3($other);
    $foreign->exec('CREATE TABLE unrelated(value TEXT)');
    $foreign->close();
    $hash = hash_file('sha256',$other);
    putenv('OXYTOCIN_V2_DB_PATH=' . $other);
    try {
        v2_db();
        throw new RuntimeException('Unexpectedly reinitialized a different SQLite schema');
    } catch (RuntimeException $e) {
        confirm(str_contains($e->getMessage(), 'không tự ghi đè'), 'Unknown schema refused');
    }
    confirm($hash === hash_file('sha256',$other), 'Unknown database bytes unchanged');

    putenv('OXYTOCIN_V2_DB_PATH');
    $automatic = v2_path();
    confirm(str_ends_with($automatic,'/oxytocin/v2/.data/oxytocin_v2.db'),
        'Default path is dedicated to v2, not legacy');
    confirm(is_file(dirname($automatic) . '/.htaccess'), 'Protected directory ships with code');
    confirm(!($old && $automatic === $old), 'Never target legacy database');
    confirm($oldHash === ($old ? hash_file('sha256', $old) : null),
        'Legacy content unmodified');
    echo "PASS: zero-config blank SQLite, repeated visits preserve chapters, unknown schemas rejected, old DB unchanged\n";
} finally {
    putenv('OXYTOCIN_V2_DB_PATH');
    $db = null;
    foreach ([$path,$path.'-wal',$path.'-shm',$other,$other.'-wal',$other.'-shm'] as $file) {
        if (is_file($file)) @unlink($file);
    }
}
