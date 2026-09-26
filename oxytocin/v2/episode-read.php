<?php
declare(strict_types=1);
require_once __DIR__ . '/public.php';
$db = v2_reader_database();
$outline = v2_public_outline($db);
$id = v2_public_id($_GET['id'] ?? null);
$episode = $outline['byEpisode'][$id] ?? null;
if (!$episode) v2_reader_not_found();
$chapterBodies = v2_public_episode_chapters($db, $id);
$numbers = [];
foreach ($episode['chapters'] as $chapter) $numbers[$chapter['id']] = $chapter;
$chapterBodies = array_values(array_filter($chapterBodies,
    fn($item) => isset($numbers[(int)$item['id']])));
if (!$chapterBodies) v2_reader_not_found();
$first = $episode['chapters'][0];
$last = $episode['chapters'][count($episode['chapters']) - 1];
$prev = $outline['ordered'][$first['number'] - 2] ?? null;
$next = $outline['ordered'][$last['number']] ?? null;
v2_reader_open('Đọc toàn bộ tập ' . $episode['num'],'episode',0,$id);
v2_reader_breadcrumb([
    ['label'=>$episode['part_badge'], 'href'=>'part.php?id=' . $episode['part_id']],
    ['label'=>'Arc ' . $episode['arc_num'], 'href'=>'arc.php?id=' . $episode['arc_id']],
    ['label'=>'Tập ' . $episode['num'], 'href'=>'episode.php?id=' . $episode['id']],
    ['label'=>'Đọc toàn bộ']
]);
?>
<header class="episode-header-page v2-episode-header">
    <div class="brand">VVD · Novel</div>
    <div class="ep-label-row"><span class="ep-label-badge"><?= v2_h($episode['part_badge']) ?></span>
        <span class="ep-label-number">Đọc toàn bộ tập <?= $episode['num'] ?></span></div>
    <h1 class="ep-title-en"><?= v2_h($episode['en'] ?: $episode['vi'] ?: 'Tập ' . $episode['num']) ?></h1>
    <?php if ($episode['en'] && $episode['vi']): ?><div class="ep-title-vi"><?= v2_h($episode['vi']) ?></div><?php endif; ?>
    <div class="page-divider ep-divider"><span></span>✦<span></span></div>
</header>
<?php foreach ($chapterBodies as $i => $body):
    $chapter = $numbers[(int)$body['id']]; ?>
<section class="v2-full-chapter" id="chapter-<?= $chapter['id'] ?>" data-chapter-id="<?= $chapter['id'] ?>">
    <header class="v2-full-heading">
        <a href="chapter.php?id=<?= $chapter['id'] ?>">Chương <?= $chapter['number'] ?></a>
        <?php if ($chapter['title']): ?><h2><?= v2_h($chapter['title']) ?></h2><?php endif; ?>
    </header>
    <article class="episode-body v2-reading-body"><?= v2_public_stored_chapter($body) ?></article>
</section>
<?php endforeach; ?>
<nav class="bottom-nav v2-chapter-nav" aria-label="Điều hướng ngoài tập">
    <?php if ($prev): ?>
    <a class="bottom-nav-btn" href="chapter.php?id=<?= $prev['id'] ?>">
        <span class="nav-dir">← Chương trước tập</span><span class="nav-name">Chương <?= $prev['number'] ?></span>
    </a>
    <?php else: ?><span class="bottom-nav-btn disabled"><span class="nav-dir">← Chương trước tập</span><span class="nav-name">Đầu truyện</span></span><?php endif; ?>
    <?php if ($next): ?>
    <a class="bottom-nav-btn" href="chapter.php?id=<?= $next['id'] ?>">
        <span class="nav-dir">Chương sau tập →</span><span class="nav-name">Chương <?= $next['number'] ?></span>
    </a>
    <?php else: ?><span class="bottom-nav-btn disabled"><span class="nav-dir">Chương sau tập →</span><span class="nav-name">Đã hết chương được đăng</span></span><?php endif; ?>
</nav>
<div class="v2-backlinks"><a href="episode.php?id=<?= $id ?>">← Danh sách chương tập <?= $episode['num'] ?></a><a href="index.php">Mục lục</a></div>
<?php v2_reader_close(); ?>
