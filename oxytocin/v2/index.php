<?php
declare(strict_types=1);
require_once __DIR__ . '/public.php';
$db = v2_reader_database();
$outline = v2_public_outline($db);
$site = v2_site_settings($db);
v2_reader_open($site['site_title'] ?: 'OXYTOCIN');
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
<nav class="arc-nav v2-toc" aria-labelledby="toc-title">
<div class="arc-nav-label" id="toc-title">Mục lục · Cấu trúc truyện</div>
<?php if (!$outline['parts']): ?>
    <p class="reader-empty">Chưa có chương nào được xuất bản.</p>
<?php else: ?>
<?php foreach ($outline['parts'] as $part): ?>
<details class="outline-part">
    <summary>
        <span class="outline-marker"><?= v2_h($part['badge'] ?: 'Phần ' . $part['num']) ?></span>
        <strong><?= v2_h(v2_display_title($part['en'],$part['vi'])) ?></strong>
        <span class="outline-meta"><?= count($part['arcs']) ?> Arc</span>
    </summary>
    <div class="outline-interior">
        <a class="outline-open" href="part.php?id=<?= $part['id'] ?>">Xem phần này ↗</a>
        <?php foreach ($part['arcs'] as $arc): ?>
        <details class="outline-arc">
            <summary>
                <span class="outline-marker">Arc <?= $arc['num'] ?></span>
                <strong><?= v2_h(v2_display_title($arc['en'],$arc['vi'])) ?></strong>
                <span class="outline-meta"><?= count($arc['episodes']) ?> tập</span>
            </summary>
            <div class="outline-interior">
                <a class="outline-open" href="arc.php?id=<?= $arc['id'] ?>">Xem Arc này ↗</a>
                <?php foreach ($arc['episodes'] as $episode): ?>
                <div class="outline-episode">
                    <a class="episode-link" href="episode.php?id=<?= $episode['id'] ?>">
                        <span class="outline-marker">Tập <?= $episode['num'] ?></span>
                        <strong><?= v2_h(v2_display_title($episode['en'],$episode['vi']) ?: 'Danh sách chương') ?></strong>
                        <span class="outline-meta"><?= count($episode['chapters']) ?> chương</span>
                    </a>
                    <ol class="chapter-links">
                        <?php foreach ($episode['chapters'] as $chapter): ?>
                        <li><a href="chapter.php?id=<?= $chapter['id'] ?>">Chương <?= $chapter['number'] ?><?= $chapter['title'] ? ' — ' . v2_h($chapter['title']) : '' ?></a></li>
                        <?php endforeach; ?>
                    </ol>
                    <a class="outline-open" href="episode-read.php?id=<?= $episode['id'] ?>">Đọc toàn bộ tập →</a>
                </div>
                <?php endforeach; ?>
            </div>
        </details>
        <?php endforeach; ?>
    </div>
</details>
<?php endforeach; ?>
<?php endif; ?>
</nav>
<?php v2_reader_close(); ?>
