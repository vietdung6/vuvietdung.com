<?php
declare(strict_types=1);
require_once __DIR__ . '/../oxytocin/v2/lib.php';

$path = sys_get_temp_dir() . '/oxytocin-preview-test-' . bin2hex(random_bytes(8)) . '.db';
putenv('OXYTOCIN_V2_DB_PATH=' . $path);
try {
    v2_init();
    $db = v2_db();
    $db->exec("INSERT INTO parts(part_num,badge,title_vi) VALUES(0,'Prologue','Mở đầu')");
    $db->exec("INSERT INTO arcs(part_id,arc_num,slug,title_vi) VALUES(1,0,'prologue','Khởi đầu')");
    $db->exec("INSERT INTO episodes(arc_id,ep_num,title_vi) VALUES(1,0,'Tập không')");
    $db = null;
    $before = hash_file('sha256',$path);
    $_SERVER['REQUEST_METHOD'] = 'POST';
    session_name('oxy_v2_admin');
    session_start();
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    $_SESSION['v2_authenticated'] = true;
    $token = $_SESSION['csrf'];
    session_write_close();
    $_POST = [
        'csrf' => $token, 'entity' => 'chapters', 'chapter_intent' => 'preview',
        'episode_id' => '1', 'id' => '0', 'title' => 'Chương thử',
        'content_format' => 'html',
        'content' => '<p>Nội dung chưa lưu <strong>đậm</strong><img src=x onerror="evil()"></p>'
    ];
    ob_start();
    include __DIR__ . '/../oxytocin/v2/preview.php';
    $html = ob_get_clean();
    foreach (['Nội dung chưa lưu','Chương thử','episode-body','BẢN XEM TRƯỚC'] as $fragment) {
        if (!str_contains($html,$fragment)) throw new RuntimeException('Missing preview: ' . $fragment);
    }
    foreach (['onerror=','<img src=','<script>'] as $fragment) {
        if (str_contains($html,$fragment)) throw new RuntimeException('Unsafe preview: ' . $fragment);
    }
    if ($before !== hash_file('sha256',$path)) {
        throw new RuntimeException('Preview modified database bytes');
    }
    $db = v2_db();
    if ((int)$db->query('SELECT COUNT(*) FROM chapters')->fetchColumn() !== 0) {
        throw new RuntimeException('Preview inserted an unpublished chapter');
    }
    echo "PASS: authenticated unsaved preview renders reader CSS markup safely and writes no database content\n";
} finally {
    $db = null;
    foreach ([$path,$path.'-wal',$path.'-shm'] as $file) if (is_file($file)) @unlink($file);
}
