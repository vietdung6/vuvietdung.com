<?php
declare(strict_types=1);
require_once __DIR__ . '/public.php';
$db = v2_reader_database();
$outline = v2_public_outline($db);
$id = v2_public_id($_GET['id'] ?? null);
$part = $outline['byPart'][$id] ?? null;
if (!$part) v2_reader_not_found();
v2_reader_open(v2_display_title($part['en'],$part['vi']));
v2_reader_breadcrumb([['label'=>$part['badge'] ?: 'Phần ' . $part['num']]]);
?>
<header class="page-header v2-page-header">
    <div class="brand">VVD · Novel</div>
    <div class="page-label"><?= v2_h($part['badge'] ?: 'Phần ' . $part['num']) ?></div>
    <h1 class="page-title"><?= v2_h($part['en'] ?: $part['vi']) ?></h1>
    <?php if ($part['en'] && $part['vi']): ?><div class="page-subtitle"><?= v2_h($part['vi']) ?></div><?php endif; ?>
    <?php if ($part['description']): ?><p class="page-intro"><?= nl2br(v2_h($part['description'])) ?></p><?php endif; ?>
</header>
<section class="v2-toc">
    <h2>Danh sách Arc</h2>
    <?php foreach ($part['arcs'] as $arc): ?>
        <article class="reader-collection">
            <div class="outline-marker">Arc <?= $arc['num'] ?></div>
            <h3><a href="arc.php?id=<?= $arc['id'] ?>"><?= v2_h(v2_display_title($arc['en'],$arc['vi'])) ?></a></h3>
            <p><?= count($arc['episodes']) ?> tập đã có chương được đăng</p>
            <ol class="episode-list">
                <?php foreach ($arc['episodes'] as $episode): ?>
                <li><a href="episode.php?id=<?= $episode['id'] ?>">Tập <?= $episode['num'] ?><?= v2_display_title($episode['en'],$episode['vi']) !== '' ? ' — ' . v2_h(v2_display_title($episode['en'],$episode['vi'])) : '' ?></a></li>
                <?php endforeach; ?>
            </ol>
        </article>
    <?php endforeach; ?>
</section>
<?php v2_reader_close(); ?>
