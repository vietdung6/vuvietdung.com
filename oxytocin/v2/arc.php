<?php
declare(strict_types=1);
require_once __DIR__ . '/public.php';
$db = v2_reader_database();
$outline = v2_public_outline($db);
$id = v2_public_id($_GET['id'] ?? null);
$arc = $outline['byArc'][$id] ?? null;
if (!$arc) v2_reader_not_found();
$part = $arc['part'];
v2_reader_open(v2_display_title($arc['en'],$arc['vi']));
v2_reader_breadcrumb([
    ['label'=>$part['badge'] ?: 'Phần ' . $part['num'], 'href'=>'part.php?id=' . $part['id']],
    ['label'=>'Arc ' . $arc['num']]
]);
?>
<header class="page-header v2-page-header">
    <div class="brand">VVD · Novel</div>
    <div class="page-label"><?= v2_h($part['badge']) ?> · Arc <?= $arc['num'] ?></div>
    <h1 class="page-title"><?= v2_h($arc['en'] ?: $arc['vi']) ?></h1>
    <?php if ($arc['en'] && $arc['vi']): ?><div class="page-subtitle"><?= v2_h($arc['vi']) ?></div><?php endif; ?>
    <?php if ($arc['intro']): ?><p class="page-intro"><?= nl2br(v2_h($arc['intro'])) ?></p><?php endif; ?>
</header>
<section class="v2-toc">
    <h2>Danh sách tập</h2>
    <div class="episode-list">
    <?php foreach ($arc['episodes'] as $episode): ?>
    <article class="reader-collection">
        <div class="outline-marker">Tập <?= $episode['num'] ?></div>
        <h3><a href="episode.php?id=<?= $episode['id'] ?>"><?= v2_h(v2_display_title($episode['en'],$episode['vi']) ?: 'Danh sách chương') ?></a></h3>
        <?php if ($episode['summary']): ?><p><?= v2_h($episode['summary']) ?></p><?php endif; ?>
        <p><?= count($episode['chapters']) ?> chương · <a href="episode-read.php?id=<?= $episode['id'] ?>">Đọc toàn bộ tập ↗</a></p>
    </article>
    <?php endforeach; ?>
    </div>
</section>
<?php v2_reader_close(); ?>
