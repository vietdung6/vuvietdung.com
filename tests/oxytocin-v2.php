<?php
declare(strict_types=1);
require_once __DIR__ . '/../oxytocin/v2/lib.php';

function verify(bool $ok, string $message): void {
    if (!$ok) throw new RuntimeException($message);
}
function expectFailure(callable $work, string $reason): void {
    try { $work(); }
    catch (DomainException|PDOException|RuntimeException $e) { return; }
    throw new RuntimeException('Expected failure: ' . $reason);
}
function save(PDO $db, string $type, array $p): int {
    return v2_save($db, $type, ['id' => '0'] + $p);
}
$path = sys_get_temp_dir() . '/oxy-v2-test-' . bin2hex(random_bytes(8)) . '.db';
putenv('OXYTOCIN_V2_DB_PATH=' . $path);
$old = __DIR__ . '/../oxytocin/oxytocin.db';
$oldHash = is_file($old) ? hash_file('sha256', $old) : null;

try {
    verify(v2_init() === $path, 'Created file path');
    expectFailure(fn() => v2_init(), 'Never overwrite');
    $db = v2_db();
    verify((int)$db->query('PRAGMA foreign_keys')->fetchColumn() === 1, 'Foreign keys on');
    verify((int)$db->query('PRAGMA user_version')->fetchColumn() === 2, 'Schema version');
    verify(count(v2_rows($db, 'chapters')) === 0, 'No auto-import');
    $part0 = save($db,'parts',['part_num'=>'0','badge'=>'Prologue','title_en'=>'ZEROTH',
        'title_vi'=>'Tiên đề 0','description'=>'','status'=>'active']);
    $part1 = save($db,'parts',['part_num'=>'1','badge'=>'Part I','title_en'=>'SIXTEEN',
        'title_vi'=>'Mười sáu','description'=>'','status'=>'active']);
    $arc0 = save($db,'arcs',['part_id'=>(string)$part0,'arc_num'=>'0','slug'=>'zeroth',
        'title_en'=>'Zeroth','title_vi'=>'Tiên đề','intro'=>'']);
    $arc1 = save($db,'arcs',['part_id'=>(string)$part1,'arc_num'=>'0','slug'=>'school',
        'title_en'=>'School','title_vi'=>'Trường','intro'=>'']);
    $ep0 = save($db,'episodes',['arc_id'=>(string)$arc0,'ep_num'=>'0','title_en'=>'Zero',
        'title_vi'=>'Khởi đầu','summary'=>'','intro'=>'']);
    $ep1 = save($db,'episodes',['arc_id'=>(string)$arc1,'ep_num'=>'1','title_en'=>'One',
        'title_vi'=>'Tập một','summary'=>'','intro'=>'']);

    expectFailure(fn() => save($db,'arcs',['part_id'=>(string)$part0,'arc_num'=>'0',
        'slug'=>'duplicate','title_en'=>'Dupe','title_vi'=>'','intro'=>'']), 'Unique arc per part');
    $draft = save($db,'chapters',['episode_id'=>(string)$ep0,'title'=>'','content'=>'Nháp ---',
        'content_format'=>'noir_text']);
    $first = save($db,'chapters',['episode_id'=>(string)$ep0,'title'=>'','content'=>"A\n---\nB",
        'content_format'=>'noir_text']);
    $later = save($db,'chapters',['episode_id'=>(string)$ep1,'title'=>'','content'=>'C',
        'content_format'=>'noir_text']);
    verify(count(v2_numbered_chapters($db)) === 3, 'Three chapters including draft');
    verify(array_column(v2_numbered_chapters($db),'public_number') === [null,null,null],
        'New chapters never publish');

    expectFailure(fn() => v2_publication($db,$first,99,'publish'),'Reject stale revision');
    v2_publication($db,$first,1,'publish');
    v2_publication($db,$later,1,'publish');
    verify(array_column(v2_numbered_chapters($db),'public_number') === [null,1,2],
        'Global published numbering skips draft');
    $check = $db->query("SELECT content FROM chapters WHERE id=$first")->fetchColumn();
    verify($check === "A\n---\nB", 'Scene-break text preserved');
    expectFailure(fn() => v2_save($db,'chapters',['id'=>(string)$first,'episode_id'=>(string)$ep0,
        'title'=>'','content'=>'changed','revision'=>'2','action'=>'save']), 'Published cannot be silently saved');
    v2_save($db,'chapters',['id'=>(string)$first,'episode_id'=>(string)$ep0,
        'title'=>'','content'=>"A\n---\nB",'revision'=>'2','action'=>'update_published']);
    expectFailure(fn() => v2_save($db,'chapters',['id'=>(string)$first,'episode_id'=>(string)$ep0,
        'title'=>'','content'=>'stale','revision'=>'2','action'=>'update_published']), 'Optimistic locking');

    v2_move($db,'chapters',$first,'up');
    verify((int)$db->query("SELECT sort_order FROM chapters WHERE id=$first")->fetchColumn() === 1,
        'Move chapter within episode');
    verify(array_column(v2_numbered_chapters($db),'public_number') === [1,null,2],
        'Reorder does not count draft');
    $db->exec("UPDATE chapters SET content=' ' WHERE id=$draft");
    expectFailure(fn() => v2_publication($db,$draft,1,'publish'), 'Cannot publish empty');
    v2_publication($db,$later,2,'unpublish');
    verify(array_column(v2_numbered_chapters($db),'public_number') === [1,null,null],
        'Unpublish removes global number');
    expectFailure(fn() => v2_delete($db,'episodes',$ep0),'Reject deleting parent');
    expectFailure(fn() => v2_delete($db,'chapters',$first),'Published delete blocked');
    v2_delete($db,'chapters',$draft);
    verify(count(v2_rows($db,'chapters')) === 2,'Delete draft');

    $db->exec("UPDATE parts SET part_num=5 WHERE id=$part1");
    v2_move($db,'parts',$part1,'up');
    verify((int)$db->query("SELECT part_num FROM parts WHERE id=$part1")->fetchColumn() === 0,
        'Reorder part with temporary unique position');
    verify($db->query('PRAGMA integrity_check')->fetchColumn() === 'ok', 'Integrity check');
    verify($db->query('PRAGMA foreign_key_check')->fetch() === false, 'Foreign key check');
    verify($oldHash === (is_file($old) ? hash_file('sha256',$old) : null), 'Old database unchanged');
    echo "PASS: empty v2 schema, isolation, CRUD, draft/publication, numbering, ordering, concurrency, data safety\n";
} finally {
    $db = null;
    foreach ([$path, $path.'-wal', $path.'-shm'] as $file) if (is_file($file)) @unlink($file);
}
