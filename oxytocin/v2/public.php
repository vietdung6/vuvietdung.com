<?php
declare(strict_types=1);
require_once __DIR__ . '/lib.php';

/**
 * A public outline is based exclusively on published chapters in active parts.
 * Do not load chapter bodies here: even the full table of contents stays lightweight.
 * Stable IDs are used in URLs; public chapter numbers derive from story order.
 */
function v2_public_outline(PDO $db): array {
    $query = "SELECT
        p.id AS part_id, p.part_num, p.badge AS part_badge,
        p.title_en AS part_en, p.title_vi AS part_vi, p.description AS part_description,
        a.id AS arc_id, a.arc_num, a.slug AS arc_slug,
        a.title_en AS arc_en, a.title_vi AS arc_vi, a.intro AS arc_intro,
        e.id AS episode_id, e.ep_num, e.title_en AS episode_en,
        e.title_vi AS episode_vi, e.summary AS episode_summary, e.intro AS episode_intro,
        c.id AS chapter_id, c.title AS chapter_title, c.sort_order
        FROM chapters c
        INNER JOIN episodes e ON e.id=c.episode_id
        INNER JOIN arcs a ON a.id=e.arc_id
        INNER JOIN parts p ON p.id=a.part_id
        WHERE c.status='published' AND p.status='active'
        ORDER BY p.part_num, p.id, a.arc_num, a.id, e.ep_num, e.id, c.sort_order, c.id";
    $rows = $db->query($query)->fetchAll(PDO::FETCH_ASSOC);
    $parts = [];
    $byPart = [];
    $byArc = [];
    $byEpisode = [];
    $byChapter = [];
    $ordered = [];
    $num = 0;
    foreach ($rows as $row) {
        $partId = (int)$row['part_id'];
        $arcId = (int)$row['arc_id'];
        $episodeId = (int)$row['episode_id'];
        $chapterId = (int)$row['chapter_id'];
        if (!isset($parts[$partId])) {
            $parts[$partId] = [
                'id' => $partId, 'num' => (int)$row['part_num'], 'badge' => $row['part_badge'],
                'en' => $row['part_en'], 'vi' => $row['part_vi'],
                'description' => $row['part_description'], 'arcs' => []
            ];
        }
        if (!isset($parts[$partId]['arcs'][$arcId])) {
            $parts[$partId]['arcs'][$arcId] = [
                'id' => $arcId, 'num' => (int)$row['arc_num'], 'slug' => $row['arc_slug'],
                'en' => $row['arc_en'], 'vi' => $row['arc_vi'],
                'intro' => $row['arc_intro'], 'episodes' => []
            ];
        }
        if (!isset($parts[$partId]['arcs'][$arcId]['episodes'][$episodeId])) {
            $parts[$partId]['arcs'][$arcId]['episodes'][$episodeId] = [
                'id' => $episodeId, 'num' => (int)$row['ep_num'],
                'en' => $row['episode_en'], 'vi' => $row['episode_vi'],
                'summary' => $row['episode_summary'], 'intro' => $row['episode_intro'],
                'chapters' => []
            ];
        }
        $chapter = ['id'=>$chapterId,'number'=>++$num,'title'=>$row['chapter_title'],
            'episode_id'=>$episodeId,'episode_num'=>(int)$row['ep_num'],
            'episode_en'=>$row['episode_en'],'episode_vi'=>$row['episode_vi'],
            'arc_id'=>$arcId,'arc_num'=>(int)$row['arc_num'],'arc_vi'=>$row['arc_vi'],
            'part_id'=>$partId,'part_num'=>(int)$row['part_num'],'part_badge'=>$row['part_badge']];
        $parts[$partId]['arcs'][$arcId]['episodes'][$episodeId]['chapters'][] = $chapter;
        $byChapter[$chapterId] = $chapter;
        $ordered[] = $chapter;
    }
    foreach ($parts as $part) {
        $byPart[$part['id']] = $part;
        foreach ($part['arcs'] as $arc) {
            $byArc[$arc['id']] = $arc + ['part'=>$part];
            foreach ($arc['episodes'] as $episode) {
                $byEpisode[$episode['id']] = $episode + [
                    'part_id'=>$part['id'], 'part_num'=>$part['num'], 'part_badge'=>$part['badge'],
                    'part_en'=>$part['en'],'part_vi'=>$part['vi'],
                    'arc_id'=>$arc['id'],'arc_num'=>$arc['num'],
                    'arc_en'=>$arc['en'],'arc_vi'=>$arc['vi']
                ];
            }
        }
    }
    return [
        'parts'=>$parts,'byPart'=>$byPart,'byArc'=>$byArc,
        'byEpisode'=>$byEpisode,'byChapter'=>$byChapter,'ordered'=>$ordered
    ];
}

function v2_public_id(mixed $value): int {
    if (!is_string($value) && !is_int($value)) return 0;
    if (!preg_match('/^[1-9][0-9]*$/D',(string)$value)) return 0;
    // Reject oversized IDs instead of casting them to PHP_INT_MAX.
    if (strlen((string)$value) > strlen((string)PHP_INT_MAX) ||
        (strlen((string)$value) === strlen((string)PHP_INT_MAX)
         && strcmp((string)$value,(string)PHP_INT_MAX) > 0)) return 0;
    return (int)$value;
}

function v2_public_chapter(PDO $db, int $id): ?array {
    if ($id <= 0) return null;
    $stmt = $db->prepare("SELECT c.id,c.episode_id,c.title,c.content,c.content_format
        FROM chapters c INNER JOIN episodes e ON e.id=c.episode_id
        INNER JOIN arcs a ON a.id=e.arc_id INNER JOIN parts p ON p.id=a.part_id
        WHERE c.id=? AND c.status='published' AND p.status='active' LIMIT 1");
    $stmt->execute([$id]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

function v2_public_episode_chapters(PDO $db, int $id): array {
    $stmt = $db->prepare("SELECT c.id,c.title,c.content,c.content_format
        FROM chapters c INNER JOIN episodes e ON e.id=c.episode_id
        INNER JOIN arcs a ON a.id=e.arc_id INNER JOIN parts p ON p.id=a.part_id
        WHERE c.episode_id=? AND c.status='published' AND p.status='active'
        ORDER BY c.sort_order,c.id");
    $stmt->execute([$id]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function v2_public_stored_chapter(array $chapter): string {
    return v2_read_html((string)$chapter['content'],(string)$chapter['content_format']);
}

function v2_reader_open(string $title, string $mode = '', int $chapterId = 0, int $episodeId = 0): void {
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store, private');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header("Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    echo '<!doctype html><html lang="vi"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<title>' . v2_h($title) . ' — OXYTOCIN</title>'
        . '<link rel="stylesheet" href="../styles.css?v=' . filemtime(dirname(__DIR__) . '/styles.css') . '">'
        . '<link rel="stylesheet" href="preview.css?v=' . filemtime(__DIR__ . '/preview.css') . '">'
        . '<link rel="stylesheet" href="reader.css?v=' . filemtime(__DIR__ . '/reader.css') . '">'
        . '<script src="reader.js?v=' . filemtime(__DIR__ . '/reader.js') . '" defer></script>'
        . '</head><body data-reader-mode="' . v2_h($mode) . '"'
        . ' data-reader-chapter="' . $chapterId . '" data-reader-episode="' . $episodeId . '">';
    if ($mode !== 'home') {
        echo '<nav class="reader-topbar" aria-label="Điều hướng chính">'
            . '<a class="reader-logo" href="index.php">OXYTOCIN</a>'
            . '<span class="reader-topbar-links"><a href="index.php">Mục lục</a>'
            . '<a href="index.php" id="continueReading" hidden>Đọc tiếp</a></span></nav>';
    }
    echo '<main class="container v2-main">';
}

function v2_reader_close(): void {
    echo '<footer class="v2-footer"><div class="signature">VVD WORKS</div>'
        . '<p>© OXYTOCIN</p></footer></main>'
        . '<nav class="reader-tools" aria-label="Điều khiển đọc">'
        . '<button type="button" id="readerTheme" title="Đổi nền sáng / tối" aria-label="Đổi nền sáng / tối" aria-pressed="false">'
        . '<svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>'
        . '<svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 14.1A9 9 0 0 1 9.9 3.2a9 9 0 1 0 10.9 10.9Z"/></svg></button>'
        . '<button type="button" id="readerFont" title="Đổi cỡ chữ" aria-label="Đổi cỡ chữ">'
        . '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 19 5.5-14 5.5 14m-9.7-4h8.4M16 9h5m-2.5-2.5v5"/></svg></button>'
        . '<a href="index.php" title="Về mục lục" aria-label="Về mục lục">'
        . '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M4 10h16M4 15h16M4 20h11"/></svg></a>'
        . '<button type="button" id="readerFullscreen" title="Bật chế độ đọc toàn màn hình" aria-label="Bật chế độ đọc toàn màn hình" aria-pressed="false">'
        . '<svg class="icon-expand" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg>'
        . '<svg class="icon-collapse" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8h5V3m13 5h-5V3M3 16h5v5m13-5h5v5"/></svg></button></nav>'
        . '<div class="reader-progress" aria-hidden="true"><span id="readerProgressBar"></span></div>'
        . '</body></html>';
}

function v2_reader_breadcrumb(array $segments): void {
    echo '<nav class="breadcrumb v2-breadcrumb" aria-label="Vị trí trong truyện">'
        . '<a href="index.php">Mục lục</a>';
    foreach ($segments as $segment) {
        echo '<span class="breadcrumb-sep" aria-hidden="true">/</span>';
        if (isset($segment['href'])) {
            echo '<a class="breadcrumb-link" href="' . v2_h($segment['href']) . '">'
                . v2_h($segment['label']) . '</a>';
        } else {
            echo '<span class="breadcrumb-current">' . v2_h($segment['label']) . '</span>';
        }
    }
    echo '</nav>';
}

function v2_reader_not_found(): never {
    http_response_code(404);
    v2_reader_open('Không tìm thấy nội dung');
    echo '<section class="reader-empty"><h1>Không tìm thấy nội dung</h1>'
        . '<p>Trang này không tồn tại hoặc chưa được xuất bản.</p>'
        . '<p><a href="index.php">Về mục lục</a></p></section>';
    v2_reader_close();
    exit;
}

function v2_reader_database(): PDO {
    try {
        return v2_db();
    } catch (Throwable $e) {
        error_log('OXYTOCIN v2 public database: ' . get_class($e));
        http_response_code(503);
        header('Content-Type: text/plain; charset=utf-8');
        header('Cache-Control: no-store');
        exit('Hệ thống đọc chưa sẵn sàng. Vui lòng thử lại sau.');
    }
}

function v2_display_title(?string $en, ?string $vi): string {
    return trim((string)$vi) !== '' ? (string)$vi : (string)$en;
}
