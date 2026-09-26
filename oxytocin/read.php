<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once 'db.php';

$arc_slug = $_GET['arc'] ?? '';
$ep_num   = isset($_GET['ep']) ? (int)$_GET['ep'] : 0;

// Truy vấn thông tin tập đọc
$stmt = $db->prepare("
    SELECT e.*, a.title_en AS arc_en, a.title_vi AS arc_vi, a.slug AS arc_slug, a.arc_code, 
           p.part_num, p.badge AS part_badge, p.title_vi AS part_vi, p.title_en AS part_en
    FROM episodes e 
    JOIN arcs a ON e.arc_id = a.id 
    JOIN parts p ON a.part_id = p.id 
    WHERE a.slug = ? AND e.ep_num = ? 
    LIMIT 1
");
$stmt->execute([$arc_slug, $ep_num]);
$curr = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$curr) {
    die("<h2 style='color:#fff; text-align:center; margin-top:50px;'>Tập truyện không tồn tại.</h2>");
}

// Tìm tập trước và sau
$prev = $db->query("SELECT ep_num, title_en FROM episodes WHERE arc_id = {$curr['arc_id']} AND ep_num < {$curr['ep_num']} ORDER BY ep_num DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$next = $db->query("SELECT ep_num, title_en, title_vi FROM episodes WHERE arc_id = {$curr['arc_id']} AND ep_num > {$curr['ep_num']} ORDER BY ep_num ASC LIMIT 1")->fetch(PDO::FETCH_ASSOC);

// Xử lý từ nhấn mạnh trong dòng
function parse_inline($text) {
    $text = htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
    // **in đậm** -> chữ sáng màu
    $text = preg_replace('/\*\*(.+?)\*\*/s', '<strong class="highlight-bright">$1</strong>', $text);
    // *chữ này* -> chữ đỏ nổi bật, đứng thẳng
    $text = preg_replace('/\*([^\*]+)\*/s', '<span class="highlight-red">$1</span>', $text);
    return $text;
}

// Xử lý bố cục đoạn văn
function parse_noir($text) {
    $text = trim($text);
    if ($text === '') return '';

    // Tách đoạn (bắt cả Enter 1 lần lẫn Enter 2 lần)
    $pattern = preg_match('/\R\s*\R/u', $text) ? '/(?:\R\s*){2,}/u' : '/\R+/u';
    $blocks = preg_split($pattern, $text);
    $html = '';

    foreach ($blocks as $b) {
        $clean = trim($b);
        if ($clean === '') continue;

        // 1. Dấu phân cảnh (gõ --- hoặc *** hoặc ✦)
        if (preg_match('/^[\*\-✦_\.]{3,}$/u', str_replace(' ', '', $clean))) {
            $html .= "<p class='scene-break'>✦ ✦ ✦</p>";
        }
        // 2. CẢ CÂU được bọc trong đúng 1 cặp *...* -> Canh giữa + MÀU ĐỎ
        elseif (preg_match('/^\*([^\*]+)\*$/u', $clean, $m)) {
            $inner = trim($m[1]);
            $html .= "<p class='center-red'>" . parse_inline($inner) . "</p>";
        }
        // 3. Đúng 1 từ có dấu chấm ở cuối (Keng., Tách.) -> Canh giữa + MÀU VÀNG GOLD
        elseif (preg_match('/^[^\s\.]+\.$/u', $clean)) {
            $html .= "<p class='beat'>" . htmlspecialchars($clean, ENT_QUOTES, 'UTF-8') . "</p>";
        }
        // 4. Đoạn văn tự sự bình thường (thụt lề 2em)
        else {
            $html .= "<p>" . parse_inline($clean) . "</p>";
        }
    }
    return $html;
}

$page_title = "Ep. " . str_pad($curr['ep_num'], 2, '0', STR_PAD_LEFT) . " · {$curr['title_en']} — OXYTOCIN";
include 'header.php';
?>

        <!-- BREADCRUMB -->
        <nav class="breadcrumb">
            <a href="index.php" class="breadcrumb-home">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                Trang chủ
            </a>
            <span class="breadcrumb-sep">›</span>
            <a class="breadcrumb-link" href="part.php?num=<?= $curr['part_num'] ?>"><?= htmlspecialchars($curr['part_badge']) ?></a>
            <span class="breadcrumb-sep">›</span>
            <span class="breadcrumb-current">Ep. <?= str_pad($curr['ep_num'], 2, '0', STR_PAD_LEFT) ?> · <?= htmlspecialchars($curr['title_en']) ?></span>
        </nav>

        <header class="episode-header-page">
            <div class="brand">VVD · Novel</div>
            <div class="ep-label-row">
                <span class="ep-label-badge"><?= htmlspecialchars($curr['badge'] ?? $curr['arc_code']) ?></span>
                <span class="ep-label-number">Tập <?= str_pad($curr['ep_num'], 2, '0', STR_PAD_LEFT) ?></span>
            </div>
            <h1 class="ep-title-en"><?= htmlspecialchars($curr['title_en']) ?></h1>
            <div class="ep-title-vi"><?= htmlspecialchars($curr['title_vi']) ?></div>
            <div class="page-divider ep-divider"><span></span>✦<span></span></div>
            <?php if (!empty($curr['intro'])): ?>
                <p class="ep-intro"><?= htmlspecialchars($curr['intro']) ?></p>
            <?php endif; ?>
        </header>

        <article class="episode-body">
            <?= parse_noir($curr['content']) ?>
        </article>

        <!-- ĐIỀU HƯỚNG TẬP -->
        <nav class="bottom-nav">
            <?php if ($prev): ?>
                <a class="bottom-nav-btn" href="read.php?arc=<?= urlencode($curr['arc_slug']) ?>&ep=<?= $prev['ep_num'] ?>">
                    <span class="nav-dir">← Tập trước</span>
                    <span class="nav-name">Ep. <?= str_pad($prev['ep_num'], 2, '0', STR_PAD_LEFT) ?> · <?= htmlspecialchars($prev['title_en']) ?></span>
                </a>
            <?php else: ?>
                <a class="bottom-nav-btn disabled" href="#" aria-disabled="true">
                    <span class="nav-dir">← Tập trước</span>
                    <span class="nav-name">&mdash;</span>
                </a>
            <?php endif; ?>

            <?php if ($next): ?>
                <a class="bottom-nav-btn" href="read.php?arc=<?= urlencode($curr['arc_slug']) ?>&ep=<?= $next['ep_num'] ?>">
                    <span class="nav-dir">Tập sau →</span>
                    <span class="nav-name">Ep. <?= str_pad($next['ep_num'], 2, '0', STR_PAD_LEFT) ?> · <?= htmlspecialchars($next['title_en']) ?></span>
                </a>
            <?php else: ?>
                <a class="bottom-nav-btn disabled" href="#" aria-disabled="true">
                    <span class="nav-dir">Tập sau →</span>
                    <span class="nav-name">Hết hồi</span>
                </a>
            <?php endif; ?>
        </nav>

        <!-- VỀ MỤC LỤC PHẦN HOẶC TRANG CHỦ -->
        <nav class="bottom-nav back-arc">
            <a class="bottom-nav-btn arc-btn" href="part.php?num=<?= $curr['part_num'] ?>">
                <span class="nav-dir">← Về mục lục phần</span>
                <span class="nav-name"><?= htmlspecialchars($curr['part_badge']) ?>: <?= htmlspecialchars($curr['part_vi']) ?></span>
            </a>
            <a class="bottom-nav-btn arc-btn" href="index.php">
                <span class="nav-dir">🏠 Trang chủ</span>
                <span class="nav-name">Mục lục chung</span>
            </a>
        </nav>

<?php include 'footer.php'; ?>