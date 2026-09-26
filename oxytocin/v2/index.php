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
    <div class="home-grid v2-parts-grid">
        <?php foreach ($outline['parts'] as $part): ?>
        <details class="outline-part v2-part-card">
            <summary class="arc-card v2-part-summary">
                <span class="arc-card-top">
                    <span class="arc-card-index"><?= str_pad((string)$part['num'], 2, '0', STR_PAD_LEFT) ?></span>
                    <span class="arc-card-badge<?= $part['num'] === 0 ? ' prologue' : '' ?>"><?= v2_h($part['badge'] ?: 'Phần ' . $part['num']) ?></span>
                </span>
                <strong class="arc-card-title"><?= v2_h($part['en'] ?: $part['vi']) ?></strong>
                <?php if ($part['en'] && $part['vi']): ?><span class="arc-card-subtitle"><?= v2_h($part['vi']) ?></span><?php endif; ?>
                <?php if ($part['description']): ?><span class="arc-card-desc"><?= nl2br(v2_h($part['description'])) ?></span><?php endif; ?>
                <span class="arc-card-meta">
                    <span class="arc-card-count"><?= count($part['arcs']) ?> Arc · <?= array_sum(array_map(static fn($arc) => count($arc['episodes']), $part['arcs'])) ?> tập</span>
                    <span class="arc-card-arrow" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </span>
                </span>
            </summary>
            <div class="outline-interior v2-part-interior">
                <div class="v2-shelf-head">
                    <span class="v2-shelf-label"><?= v2_h($part['badge'] ?: 'Phần ' . $part['num']) ?> · Danh sách Arc</span>
                    <a class="outline-open" href="part.php?id=<?= $part['id'] ?>">Trang riêng của phần <span aria-hidden="true">↗</span></a>
                </div>
                <?php foreach ($part['arcs'] as $arc): ?>
                <details class="outline-arc">
                    <summary>
                        <span class="outline-marker">Arc <?= $arc['num'] ?></span>
                        <strong><?= v2_h(v2_display_title($arc['en'],$arc['vi'])) ?></strong>
                        <span class="outline-meta"><?= count($arc['episodes']) ?> tập</span>
                    </summary>
                    <div class="outline-interior">
                        <a class="outline-open" href="arc.php?id=<?= $arc['id'] ?>">Trang riêng của Arc <span aria-hidden="true">↗</span></a>
                        <?php foreach ($arc['episodes'] as $episode): ?>
                        <div class="outline-episode">
                            <a class="episode-link" href="episode.php?id=<?= $episode['id'] ?>">
                                <span class="outline-marker">Tập <?= $episode['num'] ?></span>
                                <strong><?= v2_h(v2_display_title($episode['en'],$episode['vi']) ?: 'Danh sách chương') ?></strong>
                                <span class="outline-meta"><?= count($episode['chapters']) ?> chương <span aria-hidden="true">↗</span></span>
                            </a>
                            <ol class="chapter-links">
                                <?php foreach ($episode['chapters'] as $chapter): ?>
                                <li><a href="chapter.php?id=<?= $chapter['id'] ?>">Chương <?= $chapter['number'] ?><?= $chapter['title'] ? ' — ' . v2_h($chapter['title']) : '' ?></a></li>
                                <?php endforeach; ?>
                            </ol>
                            <a class="outline-open v2-read-episode" href="episode-read.php?id=<?= $episode['id'] ?>">Đọc toàn bộ tập <span aria-hidden="true">→</span></a>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </details>
                <?php endforeach; ?>
            </div>
        </details>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>
</nav>
<?php v2_reader_close(); ?>
