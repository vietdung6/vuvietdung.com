<?php
declare(strict_types=1);
require_once __DIR__ . '/../oxytocin/v2/lib.php';

function check_settings(bool $passed, string $message): void {
    if (!$passed) throw new RuntimeException($message);
}

$path = sys_get_temp_dir() . '/oxy-v2-settings-' . bin2hex(random_bytes(8)) . '.db';
$legacy = __DIR__ . '/../oxytocin/oxytocin.db';
$legacyHash = is_file($legacy) ? hash_file('sha256', $legacy) : null;
putenv('OXYTOCIN_V2_DB_PATH=' . $path);
try {
    $db = v2_db();
    $settings = v2_site_settings($db);
    check_settings($settings['site_title']==='OXYTOCIN'
        && $settings['site_subtitle']==='Xúc Cảm'
        && $settings['synopsis']==='', 'Empty DB has familiar site defaults');
    check_settings((int)$db->query('SELECT COUNT(*) FROM settings')->fetchColumn()===0,
        'Rendering defaults does not insert content');

    $input = [
        'site_title'=>'OXYTOCIN', 'site_subtitle'=>'Xúc Cảm',
        'site_author'=>'VVD', 'site_genre'=>'Tâm lý',
        'site_status'=>'Đang viết',
        'synopsis'=>"Đây là lời giới thiệu riêng của bản mới.\n\n**Chữ sáng** và *chữ đỏ* <script>evil()</script>"
    ];
    v2_save_site_settings($db,$input);
    $db = null;
    $db = v2_db();
    $saved = v2_site_settings($db);
    check_settings($saved===$input, 'Settings persist across requests');
    check_settings((int)$db->query('SELECT COUNT(*) FROM settings')->fetchColumn()===6,
        'Only known, authorized site settings are stored');
    $html = v2_noir_html($saved['synopsis']);
    check_settings(str_contains($html,'class="highlight-bright"')
        && str_contains($html,'class="highlight-red"'),
        'Homepage can render original Noir syntax');
    check_settings(!str_contains($html,'<script>'), 'Synopsis HTML is escaped');
    check_settings((int)$db->query('SELECT COUNT(*) FROM chapters')->fetchColumn()===0,
        'Saving settings never creates or publishes a chapter');

    foreach ([
        array_replace($input,['site_title'=>'']),
        array_replace($input,['synopsis'=>str_repeat('X',50000)]),
        array_replace($input,['site_genre'=>['unexpected','array']])
    ] as $invalid) {
        try {
            v2_save_site_settings($db,$invalid);
            throw new RuntimeException('Invalid setting was accepted');
        } catch (DomainException $expected) {}
        check_settings(v2_site_settings($db)===$input,
            'Rejected settings do not overwrite existing ones');
    }
    check_settings($db->query('PRAGMA integrity_check')->fetchColumn()==='ok',
        'Settings database remains valid');
    check_settings($legacyHash===(is_file($legacy)?hash_file('sha256',$legacy):null),
        'Legacy SQLite is untouched');
    echo "PASS: default settings, independent synopsis, validated saves, Noir rendering, no auto-publish, legacy isolation\n";
} finally {
    $db = null;
    foreach ([$path,$path.'-wal',$path.'-shm'] as $file) if (is_file($file)) @unlink($file);
    putenv('OXYTOCIN_V2_DB_PATH');
}
