<?php
declare(strict_types=1);
require_once __DIR__ . '/public.php';
$db = v2_reader_database();
$outline = v2_public_outline($db);
$id = v2_public_id($_GET['id'] ?? null);
$chapter = $outline['byChapter'][$id] ?? null;
if (!$chapter) v2_reader_not_found();
$stored = v2_public_chapter($db,$id);
if (!$stored) v2_reader_not_found();
$episode = $outline['byEpisode'][$chapter['episode_id']];
$position = $chapter['number'] - 1;
$prev = $outline['ordered'][$position - 1] ?? null;
$next = $outline['ordered'][$position + 1] ?? null;
v2_reader_open('Chương ' . $chapter['number'] . ($chapter['title'] ? ' · ' . $chapter['title'] : ''),'chapter',$id,$episode['id']);
v2_reader_breadcrumb([
    ['label'=>$chapter['part_badge'], 'href'=>'part.php?id=' . $chapter['part_id']],
    ['label'=>'Arc ' . $chapter['arc_num'], 'href'=>'arc.php?id=' . $chapter['arc_id']],
    ['label'=>'Tập ' . $chapter['episode_num'], 'href'=>'episode.php?id=' . $chapter['episode_id']],
    ['label'=>'Chương ' . $chapter['number']]
]);
?>
<header class="episode-header-page v2-episode-header">
    <div class="brand">VVD · Novel</div>
    <div class="ep-label-row"><span class="ep-label-badge"><?= v2_h($chapter['part_badge']) ?></span>
        <span class="ep-label-number">Chương <?= $chapter['number'] ?></span></div>
    <h1 class="ep-title-en"><?= v2_h($chapter['title'] ?: 'Chương ' . $chapter['number']) ?></h1>
    <div class="v2-rule" aria-hidden="true"></div>
</header>
<article id="chapter-<?= $id ?>" class="episode-body v2-reading-body" data-chapter-id="<?= $id ?>">
    <?= v2_public_stored_chapter($stored) ?>
</article>
<nav class="bottom-nav v2-chapter-nav" aria-label="Điều hướng chương">
    <?php if ($prev): ?>
    <a class="bottom-nav-btn" rel="prev" href="chapter.php?id=<?= $prev['id'] ?>">
        <span class="nav-dir">Chương trước</span><span class="nav-name">Chương <?= $prev['number'] ?><?= $prev['title'] ? ' · ' . v2_h($prev['title']) : '' ?></span>
    </a>
    <?php else: ?><span class="bottom-nav-btn disabled"><span class="nav-dir">Chương trước</span><span class="nav-name">Đầu truyện</span></span><?php endif; ?>
    <?php if ($next): ?>
    <a class="bottom-nav-btn" rel="next" href="chapter.php?id=<?= $next['id'] ?>">
        <span class="nav-dir">Chương sau</span><span class="nav-name">Chương <?= $next['number'] ?><?= $next['title'] ? ' · ' . v2_h($next['title']) : '' ?></span>
    </a>
    <?php else: ?><span class="bottom-nav-btn disabled"><span class="nav-dir">Chương sau</span><span class="nav-name">Đã hết chương được đăng</span></span><?php endif; ?>
</nav>
<div class="v2-backlinks">
    <a href="episode.php?id=<?= $episode['id'] ?>">Trang tập <?= $episode['num'] ?></a>
    <a href="episode-read.php?id=<?= $episode['id'] ?>">Đọc toàn bộ tập</a>
</div>
<?php v2_reader_close(true); ?>
