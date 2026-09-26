<?php
require_once 'db.php';

$slug = $_GET['slug'] ?? '';
$stmt = $db->prepare("
    SELECT a.*, p.title_vi AS part_name, p.badge AS part_badge 
    FROM arcs a 
    JOIN parts p ON a.part_id = p.id 
    WHERE a.slug = ? 
    LIMIT 1
");
$stmt->execute([$slug]);
$arc = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$arc) {
    die("<h2 style='color:#fff; text-align:center; margin-top:50px;'>Arc không tồn tại.</h2>");
}

$stmt = $db->prepare("SELECT * FROM episodes WHERE arc_id = ? ORDER BY ep_num ASC");
$stmt->execute([$arc['id']]);
$episodes = $stmt->fetchAll(PDO::FETCH_ASSOC);

$page_title = "{$arc['title_en']} — OXYTOCIN";
include 'header.php';
?>

        <nav class="breadcrumb">
            <a href="index.php" class="breadcrumb-home">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                Trang chủ
            </a>
            <span class="breadcrumb-sep">›</span>
            <span class="breadcrumb-current"><?= htmlspecialchars($arc['title_vi']) ?></span>
        </nav>

        <header class="page-header page-<?= htmlspecialchars($arc['slug']) ?>">
            <div class="brand">VVD · Novel</div>
            <div class="page-label"><?= htmlspecialchars($arc['part_badge']) ?> · <?= htmlspecialchars($arc['arc_code']) ?></div>
            <h1 class="page-title"><?= htmlspecialchars($arc['title_en']) ?></h1>
            <div class="page-subtitle"><?= htmlspecialchars($arc['title_vi']) ?></div>
            <div class="page-divider"><span></span>✦<span></span></div>
            <?php if (!empty($arc['intro'])): ?>
                <p class="page-intro"><?= nl2br(htmlspecialchars($arc['intro'])) ?></p>
            <?php endif; ?>
        </header>

        <nav class="mini-toc" aria-label="Danh sách tập">
            <div class="mini-toc-label">Danh sách tập · <?= htmlspecialchars($arc['title_vi']) ?></div>
            <div class="episode-cards">

                <?php if (empty($episodes)): ?>
                    <p style="color:#666; font-style:italic; padding:15px;">Chưa có tập nào trong Arc này.</p>
                <?php else: ?>
                    <?php foreach ($episodes as $ep): ?>
                    <a class="episode-card" href="read.php?arc=<?= urlencode($arc['slug']) ?>&ep=<?= $ep['ep_num'] ?>">
                        <div class="ep-card-top">
                            <span class="ep-card-idx"><?= str_pad($ep['ep_num'], 2, '0', STR_PAD_LEFT) ?></span>
                            <span class="ep-card-badge"><?= htmlspecialchars($ep['badge'] ?? $arc['arc_code']) ?></span>
                        </div>
                        <div class="ep-card-titles">
                            <h3 class="ep-card-title"><?= htmlspecialchars($ep['title_en']) ?></h3>
                            <div class="ep-card-sub"><?= htmlspecialchars($ep['title_vi']) ?></div>
                        </div>
                        <p class="ep-card-desc"><?= htmlspecialchars($ep['summary'] ?? '') ?></p>
                        <div class="ep-card-foot">
                            <span class="ep-card-meta">— trang</span>
                            <span class="ep-card-arrow">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                            </span>
                        </div>
                    </a>
                    <?php endforeach; ?>
                <?php endif; ?>

            </div>
        </nav>

<?php include 'footer.php'; ?>