<?php
declare(strict_types=1);
require_once __DIR__ . '/public.php';
$db = v2_reader_database();
$outline = v2_public_outline($db);
v2_reader_open('Mục lục');
?>
<header class="home-hero v2-hero">
    <div class="brand">VVD · Novel</div>
    <h1>OXYTOCIN</h1>
    <div class="subtitle">Xúc Cảm</div>
</header>
<section class="v2-toc" aria-labelledby="toc-title">
<h2 id="toc-title">Mục lục</h2>
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
</section>
<?php v2_reader_close(); ?>
