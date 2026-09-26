<?php
declare(strict_types=1);
require_once __DIR__ . '/../oxytocin/v2/lib.php';

function editor_assert(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}
function editor_fails(callable $run, string $message): void {
    try { $run(); } catch (DomainException|PDOException $e) { return; }
    throw new RuntimeException('Expected rejection: ' . $message);
}
function editor_save(PDO $db, string $type, array $data): int {
    return v2_save($db,$type,['id'=>'0']+$data);
}
$path = sys_get_temp_dir() . '/oxytocin-editor-test-' . bin2hex(random_bytes(8)) . '.db';
putenv('OXYTOCIN_V2_DB_PATH=' . $path);
$oldDb = __DIR__ . '/../oxytocin/oxytocin.db';
$oldSha = is_file($oldDb) ? hash_file('sha256',$oldDb) : null;
try {
    v2_init();
    $db = v2_db();
    $part = editor_save($db,'parts',['part_num'=>'0','badge'=>'P0','title_en'=>'Prologue',
        'title_vi'=>'','description'=>'','status'=>'active']);
    $arc = editor_save($db,'arcs',['part_id'=>(string)$part,'arc_num'=>'0',
        'slug'=>'prologue','title_en'=>'Arc','title_vi'=>'','intro'=>'']);
    $episode = editor_save($db,'episodes',['arc_id'=>(string)$arc,'ep_num'=>'0',
        'title_en'=>'Episode','title_vi'=>'','summary'=>'','intro'=>'']);

    $unsafe = '<p onclick="evil()">Nội dung <strong>đậm</strong> <span style="color:rgb(229, 57, 53)">đỏ</span>'
        . '<img src=x onerror="evil()"><script>alert("evil")</script></p>'
        . '<p class="scene-break" contenteditable="false">✦ ✦ ✦</p>'
        . '<p><span style="font-weight:bold;font-style:italic">Nhấn</span></p>';
    $safe = v2_sanitize_html($unsafe);
    editor_assert(str_contains($safe,'<strong>đậm</strong>'), 'Keep bold');
    editor_assert(str_contains($safe,'class="highlight-red"'), 'Keep red');
    $font = v2_sanitize_html('<p><font color="#e53935">Đỏ</font> và <font color="#f5f2eb">Sáng</font></p>');
    editor_assert(str_contains($font,'class="highlight-red"'), 'Keep native editor red');
    editor_assert(str_contains($font,'class="highlight-bright"'), 'Keep native editor bright');
    editor_assert(str_contains($safe,'class="scene-break"'), 'Keep scene separator');
    editor_assert(str_contains($safe,'<strong><em>Nhấn</em></strong>') ||
        str_contains($safe,'<em><strong>Nhấn</strong></em>'), 'Keep Word bold and italic');
    foreach (['onclick','onerror','<img','<script','alert(', 'contenteditable', 'style='] as $bad) {
        editor_assert(!str_contains($safe,$bad), 'Strip ' . $bad);
    }
    editor_assert(v2_sanitize_html($safe) === $safe, 'Sanitizer idempotence');
    editor_assert(!v2_text_visible('<p><br></p>','html'), 'Cannot publish empty editor');
    editor_assert(!v2_text_visible('<p>&nbsp;</p>','html'), 'Whitespace-only editor is empty');
    editor_assert(!v2_text_visible('<p class="scene-break">✦ ✦ ✦</p>','html'),
        'Separator alone is empty');
    editor_assert(v2_text_visible('<p>Truyện thật</p>','html'), 'Prose can publish');
    $legacy = v2_read_html("Văn bản\n\n---\n\n**Sáng** và *đỏ*", 'noir_text');
    editor_assert(str_contains($legacy,'class="scene-break"'), 'Legacy scene format');
    editor_assert(str_contains($legacy,'class="highlight-bright"'), 'Legacy bright');
    editor_assert(str_contains($legacy,'class="highlight-red"'), 'Legacy red');
    editor_assert(!str_contains($legacy,'<script>'), 'Legacy HTML escaped');

    $draft = editor_save($db,'chapters',['episode_id'=>(string)$episode,'title'=>'',
        'content'=>$unsafe,'content_format'=>'html','action'=>'save']);
    $row = $db->query("SELECT * FROM chapters WHERE id=$draft")->fetch();
    editor_assert($row['status'] === 'draft' && $row['published_at'] === null,
        'Save draft never publishes');
    editor_assert($row['content_format'] === 'html' && $row['content'] === $safe,
        'Persist only clean HTML');
    editor_assert($row['revision'] === 1 || (int)$row['revision'] === 1,'New draft revision');
    editor_assert(count(array_filter(array_column(v2_numbered_chapters($db),'public_number'),
        fn($n)=>$n!==null)) === 0, 'Draft invisible to global numbering');

    editor_fails(fn()=>editor_save($db,'chapters',['episode_id'=>(string)$episode,
        'title'=>'','content'=>'<p><br></p>','content_format'=>'html','action'=>'save_publish']),
        'Reject empty publish');
    editor_assert(count(v2_rows($db,'chapters'))===1,'Atomic rejection leaves no draft');
    $published = editor_save($db,'chapters',['episode_id'=>(string)$episode,'title'=>'',
        'content'=>'<p>Công khai</p>','content_format'=>'html','action'=>'save_publish']);
    $pub = $db->query("SELECT * FROM chapters WHERE id=$published")->fetch();
    editor_assert($pub['status'] === 'published' && $pub['published_at'] !== null,
        'Explicit save_publish atomic');
    editor_assert((int)$pub['revision'] >= 2, 'Revision increments on publish');

    editor_fails(fn()=>v2_save($db,'chapters',['id'=>(string)$published,
        'episode_id'=>(string)$episode,'title'=>'','content'=>'<p>Unapproved update</p>',
        'content_format'=>'html','revision'=>(string)$pub['revision'],'action'=>'save']),
        'Published change cannot silently save');
    v2_save($db,'chapters',['id'=>(string)$published,'episode_id'=>(string)$episode,
        'title'=>'','content'=>'<p>Updated <img src=x onerror=evil()></p>',
        'content_format'=>'html','revision'=>(string)$pub['revision'],
        'action'=>'update_published']);
    $updated = $db->query("SELECT * FROM chapters WHERE id=$published")->fetch();
    editor_assert(str_contains($updated['content'],'Updated'), 'Update published');
    editor_assert(!str_contains($updated['content'],'onerror'), 'Update published sanitizes HTML');
    editor_assert($updated['published_at'] === $pub['published_at'], 'Original publish date retained');
    editor_fails(fn()=>v2_save($db,'chapters',['id'=>(string)$published,
        'episode_id'=>(string)$episode,'title'=>'','content'=>'<p>Stale</p>',
        'content_format'=>'html','revision'=>(string)$pub['revision'],
        'action'=>'update_published']), 'Stale edit rejected');

    editor_assert($db->query('PRAGMA integrity_check')->fetchColumn() === 'ok','Integrity');
    editor_assert($db->query('PRAGMA foreign_key_check')->fetch() === false,'Foreign keys');
    editor_assert($oldSha === (is_file($oldDb) ? hash_file('sha256',$oldDb) : null),
        'Never modify old database');
    echo "PASS: rich HTML sanitization, Noir display, drafts, atomic publish, published updates, stale edit protection, old DB isolation\n";
} finally {
    $db = null;
    foreach ([$path,$path.'-wal',$path.'-shm'] as $file) if (is_file($file)) @unlink($file);
}
