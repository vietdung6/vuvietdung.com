<?php
declare(strict_types=1);
require_once __DIR__ . '/public.php';
$db = v2_reader_database();
$outline = v2_public_outline($db);
$id = v2_public_id($_GET['id'] ?? null);
$episode = $outline['byEpisode'][$id] ?? null;
if (!$episode) v2_reader_not_found();
v2_reader_open('Tập ' . $episode['num'] . ' · ' . v2_display_title($episode['en'],$episode['vi']));
v2_reader_breadcrumb([
    ['label'=>$episode['part_badge'], 'href'=>'part.php?id=' . $episode['part_id']],
    ['label'=>'Arc ' . $episode['arc_num'], 'href'=>'arc.php?id=' . $episode['arc_id']],
    ['label'=>'Tập ' . $episode['num']]
]);
?>
<header class="episode-header-page v2-episode-header">
    <div class="brand">VVD · Novel</div>
    <div class="ep-label-row"><span class="ep-label-badge"><?= v2_h($episode['part_badge']) ?></span>
        <span class="ep-label-number">Tập <?= $episode['num'] ?></span></div>
    <h1 class="ep-title-en"><?= v2_h($episode['en'] ?: $episode['vi'] ?: 'Tập ' . $episode['num']) ?></h1>
    <?php if ($episode['en'] && $episode['vi']): ?><div class="ep-title-vi"><?= v2_h($episode['vi']) ?></div><?php endif; ?>
    <div class="v2-rule" aria-hidden="true"></div>
    <?php if ($episode['intro']): ?><p class="ep-intro"><?= nl2br(v2_h($episode['intro'])) ?></p><?php endif; ?>
</header>
<section class="v2-toc v2-episode-chapters" aria-labelledby="episode-chapter-title">
    <h2 id="episode-chapter-title">Các chương trong tập</h2>
    <ol class="chapter-list">
    <?php foreach ($episode['chapters'] as $chapter): ?>
        <li><a href="chapter.php?id=<?= $chapter['id'] ?>">
            <span class="outline-marker">Chương <?= $chapter['number'] ?></span>
            <?php if ($chapter['title']): ?><strong><?= v2_h($chapter['title']) ?></strong><?php endif; ?>
            
        </a></li>
    <?php endforeach; ?>
    </ol>
    <a class="reader-primary" href="episode-read.php?id=<?= $episode['id'] ?>">Đọc toàn bộ tập</a>
    <p class="reader-hint">Đọc liền các chương đã đăng, không có bản nội dung riêng.</p>
</section>
<?php v2_reader_close(); ?>
