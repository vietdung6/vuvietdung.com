<?php
declare(strict_types=1);
require_once __DIR__ . '/../oxytocin/v2/public.php';
function ensure(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}
function insert(PDO $db,string $type,array $data): int {
    return v2_save($db,$type,['id'=>'0']+$data);
}
$path = sys_get_temp_dir() . '/oxy-reader-test-' . bin2hex(random_bytes(8)) . '.db';
putenv('OXYTOCIN_V2_DB_PATH='.$path);
$legacy = __DIR__ . '/../oxytocin/oxytocin.db';
$legacySha = is_file($legacy) ? hash_file('sha256',$legacy) : null;
try {
    v2_init();
    $db = v2_db();
    $p0 = insert($db,'parts',['part_num'=>'0','badge'=>'Prologue',
        'title_en'=>'Zeroth','title_vi'=>'Mở đầu','description'=>'','status'=>'active']);
    $p1 = insert($db,'parts',['part_num'=>'1','badge'=>'Phần I',
        'title_en'=>'Sixteen','title_vi'=>'Mười sáu','description'=>'','status'=>'active']);
    $p2 = insert($db,'parts',['part_num'=>'2','badge'=>'Chưa phát hành',
        'title_en'=>'Secret','title_vi'=>'Ẩn','description'=>'','status'=>'coming_soon']);
    $a0 = insert($db,'arcs',['part_id'=>(string)$p0,'arc_num'=>'0',
        'slug'=>'zeroth','title_en'=>'Zero','title_vi'=>'Khởi đầu','intro'=>'']);
    $a1 = insert($db,'arcs',['part_id'=>(string)$p1,'arc_num'=>'1',
        'slug'=>'halo','title_en'=>'Halo','title_vi'=>'Hiệu ứng hào quang','intro'=>'']);
    $a2 = insert($db,'arcs',['part_id'=>(string)$p2,'arc_num'=>'0',
        'slug'=>'hidden','title_en'=>'Hidden','title_vi'=>'Ẩn','intro'=>'']);
    $e0 = insert($db,'episodes',['arc_id'=>(string)$a0,'ep_num'=>'0',
        'title_en'=>'Variable','title_vi'=>'Biến số','summary'=>'','intro'=>'']);
    $e1 = insert($db,'episodes',['arc_id'=>(string)$a1,'ep_num'=>'1',
        'title_en'=>'First','title_vi'=>'Tập đầu','summary'=>'','intro'=>'']);
    $e2 = insert($db,'episodes',['arc_id'=>(string)$a2,'ep_num'=>'0',
        'title_en'=>'Unknown','title_vi'=>'Ẩn','summary'=>'','intro'=>'']);
    $c1 = insert($db,'chapters',['episode_id'=>(string)$e0,'title'=>'Mở',
        'content'=>'<p>Mở truyện</p>','content_format'=>'html','action'=>'save_publish']);
    $draft = insert($db,'chapters',['episode_id'=>(string)$e0,'title'=>'Không được lộ',
        'content'=>'SECRET_DRAFT_SHOULD_NOT_LEAK','content_format'=>'noir_text','action'=>'save']);
    $c2 = insert($db,'chapters',['episode_id'=>(string)$e1,'title'=>'',
        'content'=>"Văn bản\n\n---\n\nLời kể", 'content_format'=>'noir_text',
        'action'=>'save_publish']);
    $c3 = insert($db,'chapters',['episode_id'=>(string)$e1,'title'=>'Tập khác',
        'content'=>'<p><strong>Một cảnh</strong></p><p class="scene-break">✦ ✦ ✦</p><p>Cảnh sau</p>',
        'content_format'=>'html','action'=>'save_publish']);
    $hidden = insert($db,'chapters',['episode_id'=>(string)$e2,'title'=>'Ẩn',
        'content'=>'SECRET_HIDDEN_SHOULD_NOT_LEAK','content_format'=>'noir_text',
        'action'=>'save_publish']);
    $outline=v2_public_outline($db);
    ensure(count($outline['parts'])===2,'Only active parts with published chapters');
    ensure(count($outline['byArc'])===2,'Hide arcs without public chapters');
    ensure(count($outline['byEpisode'])===2,'Hide empty/private episodes');
    ensure(count($outline['ordered'])===3,'Only three published public chapters');
    ensure(array_column($outline['ordered'],'id')===[$c1,$c2,$c3],'Public order across parts');
    ensure(array_column($outline['ordered'],'number')===[1,2,3],'Continuous chapter numbering');
    ensure(count($outline['byEpisode'][$e1]['chapters'])===2,'Episode chapter listing');
    ensure(!isset($outline['byChapter'][$draft]) && !isset($outline['byChapter'][$hidden]),
        'Unpublished/hidden chapter never appears in outline');
    ensure(!isset($outline['byPart'][$p2]) && !isset($outline['byEpisode'][$e2]),
        'Hidden part/episode unavailable');
    ensure(v2_public_chapter($db,$draft)===null && v2_public_chapter($db,$hidden)===null,
        'Direct ID access cannot read hidden content');
    ensure(count(v2_public_episode_chapters($db,$e0))===1,
        'Full-episode reader skips drafts');
    ensure(v2_public_episode_chapters($db,$e2)===[],
        'Full-episode reader blocks coming-soon parts');
    ensure(!str_contains(json_encode($outline),'SECRET_DRAFT_SHOULD_NOT_LEAK'),
        'Outline never includes draft text');
    ensure(v2_public_id('1')===1 && v2_public_id('0')===0
        && v2_public_id('1x')===0 && v2_public_id('99999999999999999999999')===0,
        'Validate route IDs');
    ensure(str_contains(v2_public_stored_chapter(v2_public_chapter($db,$c2)),'scene-break'),
        'Noir scene breaks preserved when displayed');
    ensure(v2_display_title('English','Việt')==='Việt','Prefer Vietnamese title');
    ensure($db->query('PRAGMA integrity_check')->fetchColumn()==='ok','Database integrity');
    ensure($legacySha===(is_file($legacy)?hash_file('sha256',$legacy):null),
        'Legacy DB remains untouched');
    echo "PASS: public-only hierarchy, stable IDs, global numbering, draft/privacy checks, full episodes, scene rendering, legacy isolation\n";
} finally {
    $db = null;
    foreach ([$path,$path.'-wal',$path.'-shm'] as $file) if (is_file($file)) @unlink($file);
}
