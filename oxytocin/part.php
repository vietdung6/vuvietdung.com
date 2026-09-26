<?php
require_once 'db.php';

$part_num = isset($_GET['num']) ? (int)$_GET['num'] : 0;

// 1. Lấy thông tin Phần (Part)
$stmt = $db->prepare("SELECT * FROM parts WHERE part_num = ? LIMIT 1");
$stmt->execute([$part_num]);
$part = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$part) {
    die("<h2 style='color:#fff; text-align:center; margin-top:50px;'>Phần truyện không tồn tại.</h2>");
}

// 2. Tìm Phần trước và Phần sau để làm nút điều hướng
$prev_part = $db->query("SELECT part_num, badge, title_vi FROM parts WHERE part_num < {$part['part_num']} AND status = 'active' ORDER BY part_num DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$next_part = $db->query("SELECT part_num, badge, title_vi FROM parts WHERE part_num > {$part['part_num']} AND status = 'active' ORDER BY part_num ASC LIMIT 1")->fetch(PDO::FETCH_ASSOC);

// 3. Lấy toàn bộ các Hồi (Arcs) thuộc Phần này
$stmt = $db->prepare("SELECT * FROM arcs WHERE part_id = ? ORDER BY sort_order ASC");
$stmt->execute([$part['id']]);
$arcs = $stmt->fetchAll(PDO::FETCH_ASSOC);

$page_title = "{$part['badge']} · {$part['title_en']} — OXYTOCIN";
include 'header.php';
?>

        <!-- BREADCRUMB -->
        <nav class="breadcrumb">
            <a href="index.php" class="breadcrumb-home">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                Trang chủ
            </a>
            <span class="breadcrumb-sep">›</span>
            <span class="breadcrumb-current"><?= htmlspecialchars($part['badge']) ?>: <?= htmlspecialchars($part['title_vi']) ?></span>
        </nav>

        <!-- PART HEADER -->
        <header class="page-header page-part<?= $part['part_num'] ?>">
            <div class="brand">VVD · Novel</div>
            <div class="page-label"><?= htmlspecialchars($part['badge']) ?></div>
            <h1 class="page-title"><?= htmlspecialchars($part['title_en']) ?></h1>
            <div class="page-subtitle"><?= htmlspecialchars($part['title_vi']) ?></div>
            <div class="page-divider"><span></span>✦<span></span></div>
            <?php if (!empty($part['description'])): ?>
                <p class="page-intro"><?= nl2br(htmlspecialchars($part['description'])) ?></p>
            <?php endif; ?>

            <div class="page-nav-arrows">
                <?php if ($prev_part): ?>
                    <a class="nav-arrow" href="part.php?num=<?= $prev_part['part_num'] ?>" title="Phần trước">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        <?= htmlspecialchars($prev_part['badge']) ?>
                    </a>
                <?php else: ?>
                    <a class="nav-arrow disabled" href="#" aria-disabled="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        Phần trước
                    </a>
                <?php endif; ?>

                <?php if ($next_part): ?>
                    <a class="nav-arrow" href="part.php?num=<?= $next_part['part_num'] ?>" title="Phần sau">
                        <?= htmlspecialchars($next_part['badge']) ?>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </a>
                <?php else: ?>
                    <a class="nav-arrow disabled" href="#" aria-disabled="true">
                        Phần sau
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </a>
                <?php endif; ?>
            </div>
        </header>

        <!-- DUYỆT QUA CÁC HỒI (ARCS) VÀ IN DANH SÁCH TẬP -->
        <?php if (empty($arcs)): ?>
            <p style="color:#666; text-align:center; font-style:italic; padding:40px 0;">Phần này chưa có hồi nào được thiết lập.</p>
        <?php else: ?>
            <?php foreach ($arcs as $arc): 
                // Lấy toàn bộ tập thuộc Arc này
                $stmt = $db->prepare("SELECT * FROM episodes WHERE arc_id = ? ORDER BY ep_num ASC");
                $stmt->execute([$arc['id']]);
                $episodes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            ?>
            <nav class="mini-toc" aria-label="Danh sách tập <?= htmlspecialchars($arc['arc_code']) ?>" style="margin-bottom: 40px;">
                <div class="mini-toc-label">
                    <?= htmlspecialchars($arc['arc_code']) ?> · <?= htmlspecialchars($arc['title_vi']) ?> (<?= htmlspecialchars($arc['title_en']) ?>)
                </div>
                
                <?php if (!empty($arc['intro'])): ?>
                    <p style="color:#888; font-size:0.9em; margin:-5px 0 15px 0; font-style:italic;"><?= htmlspecialchars($arc['intro']) ?></p>
                <?php endif; ?>

                <div class="episode-cards">
                    <?php if (empty($episodes)): ?>
                        <p style="color:#555; font-style:italic; padding:10px 0;">Chưa có tập nào trong hồi này.</p>
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
            <?php endforeach; ?>
        <?php endif; ?>

        <!-- ĐIỀU HƯỚNG CUỐI TRANG -->
        <nav class="bottom-nav">
            <?php if ($prev_part): ?>
                <a class="bottom-nav-btn" href="part.php?num=<?= $prev_part['part_num'] ?>">
                    <span class="nav-dir">← Phần trước</span>
                    <span class="nav-name"><?= htmlspecialchars($prev_part['badge']) ?>: <?= htmlspecialchars($prev_part['title_vi']) ?></span>
                </a>
            <?php else: ?>
                <a class="bottom-nav-btn disabled" href="#" aria-disabled="true">
                    <span class="nav-dir">← Phần trước</span>
                    <span class="nav-name">&mdash;</span>
                </a>
            <?php endif; ?>

            <?php if ($next_part): ?>
                <a class="bottom-nav-btn" href="part.php?num=<?= $next_part['part_num'] ?>">
                    <span class="nav-dir">Phần sau →</span>
                    <span class="nav-name"><?= htmlspecialchars($next_part['badge']) ?>: <?= htmlspecialchars($next_part['title_vi']) ?></span>
                </a>
            <?php else: ?>
                <a class="bottom-nav-btn disabled" href="#" aria-disabled="true">
                    <span class="nav-dir">Phần sau →</span>
                    <span class="nav-name">Hết nội dung</span>
                </a>
            <?php endif; ?>
        </nav>

<?php include 'footer.php'; ?>