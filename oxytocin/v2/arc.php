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
    <div class="v2-rule" aria-hidden="true"></div>
    <?php if ($arc['intro']): ?><p class="page-intro"><?= nl2br(v2_h($arc['intro'])) ?></p><?php endif; ?>
</header>
<nav class="mini-toc v2-arc-shelf" aria-label="Danh sách tập">
    <div class="mini-toc-label">Danh sách tập · <?= v2_h(v2_display_title($arc['en'],$arc['vi'])) ?></div>
    <div class="episode-cards">
        <?php foreach ($arc['episodes'] as $episode): ?>
        <a class="episode-card" href="episode.php?id=<?= $episode['id'] ?>">
            <div class="ep-card-top">
                <span class="ep-card-idx"><?= str_pad((string)$episode['num'], 2, '0', STR_PAD_LEFT) ?></span>
                <span class="ep-card-badge">Tập <?= $episode['num'] ?></span>
            </div>
            <div class="ep-card-titles">
                <h3 class="ep-card-title"><?= v2_h($episode['en'] ?: $episode['vi'] ?: 'Tập ' . $episode['num']) ?></h3>
                <?php if ($episode['en'] && $episode['vi']): ?><div class="ep-card-sub"><?= v2_h($episode['vi']) ?></div><?php endif; ?>
            </div>
            <?php if ($episode['summary']): ?><p class="ep-card-desc"><?= v2_h($episode['summary']) ?></p><?php endif; ?>
            <div class="ep-card-foot">
                <span class="ep-card-meta"><?= count($episode['chapters']) ?> chương</span>
                
            </div>
        </a>
        <?php endforeach; ?>
    </div>
</nav>
<?php v2_reader_close(); ?>
