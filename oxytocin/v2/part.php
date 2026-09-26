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
    <h1 class="page-title"><?= v2_h($part['en'] ?: $part['vi']) ?></h1>
    <?php if ($part['en'] && $part['vi']): ?><div class="page-subtitle"><?= v2_h($part['vi']) ?></div><?php endif; ?>
    <div class="v2-rule" aria-hidden="true"></div>
    <?php if ($part['description']): ?><p class="page-intro"><?= nl2br(v2_h($part['description'])) ?></p><?php endif; ?>
</header>
<section class="v2-part-shelves" aria-label="Danh sách Arc">
    <?php foreach ($part['arcs'] as $arc): ?>
    <section class="mini-toc v2-arc-shelf">
        <div class="mini-toc-label v2-arc-heading"><span class="v2-arc-index">Arc <?= $arc['num'] ?></span><a href="arc.php?id=<?= $arc['id'] ?>"><?= v2_h(v2_display_title($arc['en'],$arc['vi'])) ?></a></div>
        <?php if ($arc['intro']): ?><p class="v2-arc-intro"><?= v2_h($arc['intro']) ?></p><?php endif; ?>
        <div class="episode-cards">
            <?php foreach ($arc['episodes'] as $episode): ?>
            <a class="episode-card" href="episode.php?id=<?= $episode['id'] ?>">
                <div class="ep-card-top">
                    <span class="ep-card-idx"><?= str_pad((string)$episode['num'], 2, '0', STR_PAD_LEFT) ?></span>
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
    </section>
    <?php endforeach; ?>
</section>
<?php v2_reader_close(); ?>
