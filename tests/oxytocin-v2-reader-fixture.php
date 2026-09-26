<?php
declare(strict_types=1);
require_once __DIR__ . '/../oxytocin/v2/lib.php';
if (PHP_SAPI !== 'cli') exit(1);
$db = v2_db();
function fixture_insert(PDO $db, string $type, array $data): int {
    return v2_save($db,$type,['id'=>'0']+$data);
}
$p0=fixture_insert($db,'parts',['part_num'=>'0','badge'=>'Mở đầu',
    'title_en'=>'Prologue','title_vi'=>'Tiên đề','description'=>'','status'=>'active']);
$a0=fixture_insert($db,'arcs',['part_id'=>(string)$p0,'arc_num'=>'0','slug'=>'start',
    'title_en'=>'Zeroth','title_vi'=>'Khởi đầu','intro'=>'']);
$e0=fixture_insert($db,'episodes',['arc_id'=>(string)$a0,'ep_num'=>'0',
    'title_en'=>'Variable','title_vi'=>'Biến số','summary'=>'','intro'=>'']);
fixture_insert($db,'chapters',['episode_id'=>(string)$e0,'title'=>'Chương đầu',
    'content'=>'<p>PUBLIC_ONE_UNIQUE</p>' . str_repeat('<p>Đoạn văn kiểm thử vị trí đọc trên thiết bị và chuyển cảnh.</p>', 65),
    'content_format'=>'html','action'=>'save_publish']);
fixture_insert($db,'chapters',['episode_id'=>(string)$e0,'title'=>'CHAPTER_DRAFT_TITLE',
    'content'=>'SECRET_DRAFT_SHOULD_NOT_LEAK','content_format'=>'noir_text','action'=>'save']);
fixture_insert($db,'chapters',['episode_id'=>(string)$e0,'title'=>'Chương hai',
    'content'=>'<p>PUBLIC_TWO_UNIQUE</p>','content_format'=>'html','action'=>'save_publish']);
$e1=fixture_insert($db,'episodes',['arc_id'=>(string)$a0,'ep_num'=>'1',
    'title_en'=>'Next','title_vi'=>'Tập tiếp','summary'=>'','intro'=>'']);
fixture_insert($db,'chapters',['episode_id'=>(string)$e1,'title'=>'Chương ba',
    'content'=>'<p>PUBLIC_THREE_UNIQUE</p>','content_format'=>'html','action'=>'save_publish']);
$hidden=fixture_insert($db,'parts',['part_num'=>'1','badge'=>'Phần kín',
    'title_en'=>'Hidden','title_vi'=>'Đóng','description'=>'','status'=>'coming_soon']);
$hiddenArc=fixture_insert($db,'arcs',['part_id'=>(string)$hidden,'arc_num'=>'0',
    'slug'=>'closed','title_en'=>'Locked','title_vi'=>'Đóng','intro'=>'']);
$hiddenEp=fixture_insert($db,'episodes',['arc_id'=>(string)$hiddenArc,'ep_num'=>'1',
    'title_en'=>'Locked','title_vi'=>'Đóng','summary'=>'','intro'=>'']);
fixture_insert($db,'chapters',['episode_id'=>(string)$hiddenEp,'title'=>'Ẩn',
    'content'=>'SECRET_HIDDEN_SHOULD_NOT_LEAK','content_format'=>'html','action'=>'save_publish']);
echo "Seeded disposable HTTP fixture (three published chapters, one draft, one hidden).\n";
