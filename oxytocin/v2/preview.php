<?php
declare(strict_types=1);
require_once __DIR__ . '/lib.php';

// Preview is an authenticated, CSRF-protected POST. Never writes to SQLite.
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; form-action 'none'; base-uri 'none'; frame-ancestors 'none'");
ini_set('session.use_strict_mode', '1');
session_name('oxy_v2_admin');
session_start();
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_SESSION['v2_authenticated'])
    || !is_string($_POST['csrf'] ?? null)
    || !is_string($_SESSION['csrf'] ?? null)
    || !hash_equals($_SESSION['csrf'], $_POST['csrf'])) {
    http_response_code(403);
    exit('Không có quyền xem bản thảo. Hãy đăng nhập lại.');
}
if (($_POST['entity'] ?? null) !== 'chapters'
    || ($_POST['chapter_intent'] ?? null) !== 'preview') {
    http_response_code(400);
    exit('Yêu cầu xem trước không hợp lệ.');
}
try {
    $db = v2_db();
    $episodeId = v2_num($_POST['episode_id'] ?? '', 1);
    $stmt = $db->prepare("SELECT e.ep_num, e.title_vi AS episode_name,
        a.arc_num, a.title_vi AS arc_name, p.part_num, p.badge AS part_badge
        FROM episodes e JOIN arcs a ON a.id=e.arc_id JOIN parts p ON p.id=a.part_id
        WHERE e.id=?");
    $stmt->execute([$episodeId]);
    $episode = $stmt->fetch();
    if (!$episode) throw new DomainException('Không tìm thấy tập.');
    $format = (string)($_POST['content_format'] ?? '');
    if (!in_array($format,['html','noir_text'],true)) {
        throw new DomainException('Định dạng chương không hợp lệ.');
    }
    $body = (string) ($_POST['content'] ?? '');
    if (strlen($body) > 2_000_000) throw new DomainException('Chương quá dài.');
    $rendered = v2_read_html($body,$format);
    $title = trim((string)($_POST['title'] ?? ''));
    $chapterNumber = null;
    $chapterId = v2_num($_POST['id'] ?? '0');
    if ($chapterId > 0) {
        foreach (v2_numbered_chapters($db) as $chapter) {
            if ((int)$chapter['id'] === $chapterId) {
                $chapterNumber = $chapter['public_number'];
                break;
            }
        }
    }
} catch (DomainException|RuntimeException|PDOException $e) {
    http_response_code(400);
    exit('Không thể xem trước. Kiểm tra nội dung và tập đã chọn.');
}
?>
<!doctype html><html lang="vi"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title><?= v2_h($title ?: 'Chương không tên') ?> · Xem trước OXYTOCIN</title>
<link rel="stylesheet" href="../styles.css">
<link rel="stylesheet" href="preview.css">
<link rel="stylesheet" href="reader.css">
</head><body>
<div class="container">
    <div class="preview-notice" role="status">BẢN XEM TRƯỚC — Chưa đăng · Không được lưu lên máy chủ khi xem trước</div>
    <nav class="breadcrumb" aria-label="Vị trí trong truyện">
        <span class="breadcrumb-current"><?= v2_h($episode['part_badge']) ?></span>
        <span class="breadcrumb-sep">›</span>
        <span><?= v2_h($episode['arc_name']) ?> · Arc <?= (int)$episode['arc_num'] ?></span>
        <span class="breadcrumb-sep">›</span>
        <span>Tập <?= (int)$episode['ep_num'] ?></span>
    </nav>
    <header class="episode-header-page">
        <div class="brand">VVD · Novel</div>
        <div class="ep-label-row">
            <span class="ep-label-badge"><?= v2_h($episode['part_badge']) ?></span>
            <span class="ep-label-number"><?= $chapterNumber !== null ? 'Chương ' . (int)$chapterNumber : 'Chương · Bản thảo' ?></span>
        </div>
        <h1 class="ep-title-en"><?= v2_h($title ?: 'Chương không tên') ?></h1>
        <div class="page-divider ep-divider"><span></span>✦<span></span></div>
    </header>
    <article class="episode-body v2-reading-body"><?= $rendered ?></article>
    <footer><div class="signature">✦ VVD WORKS ✦</div><p>Bản xem trước chỉ hiển thị trong phiên quản trị.</p></footer>
</div>
</body></html>
