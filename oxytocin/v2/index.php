<?php
declare(strict_types=1);
require_once __DIR__ . '/public.php';
$db = v2_reader_database();
$outline = v2_public_outline($db);
$site = v2_site_settings($db);
v2_reader_open($site['site_title'] ?: 'OXYTOCIN', 'home');
?>
<header class="home-hero v2-hero">
    <div class="brand">Light Novel</div>
    <h1><?= v2_h($site['site_title']) ?></h1>
    <?php if ($site['site_subtitle'] !== ''): ?>
        <div class="subtitle"><?= v2_h($site['site_subtitle']) ?></div>
    <?php endif; ?>
    <div class="meta">
        <?php if ($site['site_author'] !== ''): ?><p><strong>Tác giả:</strong> <?= v2_h($site['site_author']) ?></p><?php endif; ?>
        <?php if ($site['site_genre'] !== ''): ?><p><strong>Thể loại:</strong> <?= v2_h($site['site_genre']) ?></p><?php endif; ?>
        <?php if ($site['site_status'] !== ''): ?><p><strong>Trạng thái:</strong> <?= v2_h($site['site_status']) ?></p><?php endif; ?>
    </div>
</header>
<?php if ($site['synopsis'] !== ''): ?>
<section class="synopsis v2-synopsis" aria-label="Giới thiệu truyện">
    <?= v2_noir_html($site['synopsis']) ?>
</section>
<?php endif; ?>
<nav class="arc-nav v2-library" aria-labelledby="toc-title">
    <div class="v2-library-heading">
        <span class="v2-library-eyebrow">OXYTOCIN · DANH SÁCH PHẦN</span>
        <h2 class="v2-library-title" id="toc-title">Mục lục</h2>
        <div class="v2-library-rule" aria-hidden="true"></div>
    </div>
    <?php if (!$outline['parts']): ?>
        <p class="reader-empty">Chưa có chương nào được xuất bản.</p>
    <?php else: ?>
    <div class="home-grid v2-parts-grid">
        <?php foreach ($outline['parts'] as $part): ?>
        <a class="arc-card v2-part-card" href="part.php?id=<?= $part['id'] ?>">
            <div class="arc-card-top">
                <span class="arc-card-index"><?= str_pad((string)$part['num'], 2, '0', STR_PAD_LEFT) ?></span>
                <span class="arc-card-badge<?= $part['num'] === 0 ? ' prologue' : '' ?>"><?= v2_h($part['badge'] ?: 'Phần ' . $part['num']) ?></span>
            </div>
            <h3 class="arc-card-title"><?= v2_h($part['en'] ?: $part['vi']) ?></h3>
            <?php if ($part['en'] && $part['vi']): ?><div class="arc-card-subtitle"><?= v2_h($part['vi']) ?></div><?php endif; ?>
            <?php if ($part['description']): ?><p class="arc-card-desc"><?= nl2br(v2_h($part['description'])) ?></p><?php endif; ?>
            <div class="arc-card-meta">
                <span class="arc-card-count"><?= count($part['arcs']) ?> Arc · <?= array_sum(array_map(static fn($arc) => count($arc['episodes']), $part['arcs'])) ?> tập</span>
                <span class="v2-card-open">Khám phá</span>
            </div>
        </a>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>
</nav>
<?php v2_reader_close(); ?>
