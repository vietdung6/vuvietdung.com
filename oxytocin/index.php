<?php
require_once 'db.php';

$synopsis = $db->query("SELECT value FROM settings WHERE `key` = 'synopsis'")->fetchColumn() ?: '';
$parts = $db->query("SELECT * FROM parts ORDER BY part_num ASC")->fetchAll(PDO::FETCH_ASSOC);

$page_title = "OXYTOCIN: Xúc Cảm — VVD";
include 'header.php';
?>

        <header class="home-hero">
            <div class="brand">Light Novel</div>
            <h1>OXYTOCIN</h1>
            <div class="subtitle">Xúc Cảm</div>
            <div class="meta">
                <p><strong>Tác giả:</strong> VVD</p>
                <p><strong>Thể loại:</strong> Psychological Thriller</p>
                <p><strong>Trạng thái:</strong> Đang viết</p>
            </div>
        </header>

    <?php if (!empty($synopsis)): ?>
        <section class="synopsis">
            <?= parse_noir($synopsis) ?>
        </section>
        <?php endif; ?>

        <nav class="arc-nav" aria-label="Mục lục cấu trúc truyện">
            <div class="arc-nav-label">Mục lục · Cấu trúc truyện</div>
            <div class="arc-nav-tabs home-grid">

                <?php if (empty($parts)): ?>
                    <p style="color:#666; font-style:italic; padding:20px;">Chưa có phần nào được tạo. Hãy vào admin.php để thiết lập.</p>
                <?php else: ?>
                    <?php foreach ($parts as $p): 
                        $isInactive = ($p['status'] !== 'active');
                        $targetLink = $isInactive ? '#' : "part.php?num=" . $p['part_num'];
                    ?>
                    <a class="arc-card" href="<?= $targetLink ?>" <?= $isInactive ? 'style="opacity:0.5; pointer-events:none;"' : '' ?>>
                        <div class="arc-card-top">
                            <span class="arc-card-index"><?= str_pad($p['part_num'], 2, '0', STR_PAD_LEFT) ?></span>
                            <div class="arc-card-badge <?= $p['part_num'] == 0 ? 'prologue' : '' ?>"><?= htmlspecialchars($p['badge']) ?></div>
                        </div>
                        <h3 class="arc-card-title"><?= htmlspecialchars($p['title_en']) ?></h3>
                        <div class="arc-card-subtitle"><?= htmlspecialchars($p['title_vi']) ?></div>
                        <p class="arc-card-desc"><?= htmlspecialchars($p['description'] ?? '') ?></p>
                        <div class="arc-card-meta">
                            <span class="arc-card-count"><?= $isInactive ? 'Sắp ra mắt' : 'Khám phá' ?></span>
                            <span class="arc-card-arrow">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                            </span>
                        </div>
                    </a>
                    <?php endforeach; ?>
                <?php endif; ?>

            </div>
        </nav>

<?php include 'footer.php'; ?>