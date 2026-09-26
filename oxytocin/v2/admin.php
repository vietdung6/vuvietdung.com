<?php
declare(strict_types=1);
require_once __DIR__ . '/lib.php';

header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; style-src 'self'; script-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
ini_set('session.use_strict_mode', '1');
session_name('oxy_v2_admin');
session_set_cookie_params([
    'lifetime' => 0, 'path' => '/oxytocin/v2/', 'httponly' => true,
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'samesite' => 'Strict'
]);
session_start();

function v2_token(): string {
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}
function v2_redirect(string $tab = 'chapters', int $edit = 0, bool $saved = false): never {
    header('Location: admin.php?tab=' . rawurlencode($tab)
        . ($edit > 0 ? '&edit=' . $edit : '') . ($saved ? '&saved=1' : ''), true, 303);
    exit;
}
function v2_flash(string $text, string $kind = 'ok'): void {
    $_SESSION['flash'] = ['text' => $text, 'kind' => $kind];
}
function v2_hidden(string $entity, string $action, int $id = 0): void {
    echo '<input type="hidden" name="csrf" value="' . v2_h(v2_token()) . '">';
    echo '<input type="hidden" name="entity" value="' . v2_h($entity) . '">';
    echo '<input type="hidden" name="action" value="' . v2_h($action) . '">';
    echo '<input type="hidden" name="id" value="' . $id . '">';
}
function v2_field(string $name, string $label, mixed $value, string $kind = 'text', bool $required = false): void {
    echo '<label class="field">' . v2_h($label);
    if ($kind === 'textarea') {
        echo '<textarea name="' . v2_h($name) . '" rows="' . ($name === 'content' ? 17 : 3) . '"'
            . ($required ? ' required' : '') . '>' . v2_h($value) . '</textarea>';
    } else {
        echo '<input type="' . ($kind === 'number' ? 'number' : 'text') . '" name="' . v2_h($name)
            . '" value="' . v2_h($value) . '"' . ($required ? ' required' : '')
            . ($kind === 'number' ? ' min="0" step="1"' : '') . '>';
    }
    echo '</label>';
}
function v2_select(string $name, string $label, array $options, mixed $value): void {
    echo '<label class="field">' . v2_h($label) . '<select name="' . v2_h($name) . '" required>';
    foreach ($options as $id => $text) {
        echo '<option value="' . v2_h($id) . '"' . ((string)$id === (string)$value ? ' selected' : '') . '>'
            . v2_h($text) . '</option>';
    }
    echo '</select></label>';
}
function v2_commands(string $type, array $row): void {
    $id = (int) $row['id'];
    echo '<div class="row-actions"><a href="?tab=' . $type . '&edit=' . $id . '">Sửa</a>';
    foreach (['up'=>'↑','down'=>'↓'] as $dir => $label) {
        echo '<form method="post">';
        v2_hidden($type, 'move_' . $dir, $id);
        echo '<button type="submit" aria-label="Chuyển ' . ($dir === 'up' ? 'lên' : 'xuống') . '">' . $label . '</button></form>';
    }
    if ($type === 'chapters') {
        $action = $row['status'] === 'draft' ? 'publish' : 'unpublish';
        $label = $action === 'publish' ? 'Đăng' : 'Hủy đăng';
        echo '<form method="post">';
        v2_hidden('chapters', $action, $id);
        echo '<input type="hidden" name="revision" value="' . (int)$row['revision'] . '">';
        echo '<button type="submit">' . $label . '</button></form>';
    }
    echo '<a class="danger" href="?tab=' . $type . '&confirm_delete=' . $id . '">Xóa</a></div>';
}

$hash = getenv('OXYTOCIN_V2_ADMIN_PASSWORD_HASH');
if (!is_string($hash) || password_get_info($hash)['algoName'] === 'unknown') {
    http_response_code(503);
    exit('Trang quản trị v2 chưa được cấu hình. Hãy thiết lập biến môi trường cho mật khẩu băm.');
}
try {
    $db = v2_db();
} catch (Throwable $e) {
    error_log('OXYTOCIN v2 database: ' . $e->getMessage());
    http_response_code(503);
    exit('Database v2 chưa sẵn sàng. Nội dung cũ không bị ảnh hưởng.');
}

$validTabs = ['parts','arcs','episodes','chapters'];
$tab = (string)($_GET['tab'] ?? 'chapters');
if (!in_array($tab, $validTabs, true)) $tab = 'chapters';
$authenticated = !empty($_SESSION['v2_authenticated']);
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrf = (string)($_POST['csrf'] ?? '');
    if (!hash_equals(v2_token(), $csrf)) {
        http_response_code(403);
        exit('Biểu mẫu đã hết hạn. Tải lại trang và thử lại.');
    }
    $action = (string) ($_POST['action'] ?? '');
    if ($action === 'login') {
        $until = (int)($_SESSION['lock_until'] ?? 0);
        $valid = time() >= $until && password_verify((string)($_POST['password'] ?? ''), $hash);
        if ($valid) {
            session_regenerate_id(true);
            $_SESSION['v2_authenticated'] = true;
            $_SESSION['attempts'] = 0;
            $_SESSION['lock_until'] = 0;
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
            v2_redirect();
        }
        $_SESSION['attempts'] = (int)($_SESSION['attempts'] ?? 0) + 1;
        if ($_SESSION['attempts'] >= 5) {
            $_SESSION['lock_until'] = time() + 120;
            $_SESSION['attempts'] = 0;
        }
        v2_flash('Mật khẩu không đúng hoặc đăng nhập đang bị tạm khóa.', 'error');
        v2_redirect();
    }
    if (!$authenticated) {
        http_response_code(403);
        exit('Cần đăng nhập.');
    }
    if ($action === 'logout') {
        $_SESSION = [];
        session_regenerate_id(true);
        v2_redirect();
    }
    $type = (string)($_POST['entity'] ?? '');
    if (!in_array($type, $validTabs, true)) {
        http_response_code(400);
        exit('Loại dữ liệu không hợp lệ.');
    }
    $id = v2_num($_POST['id'] ?? '0');
    $edit = $type === 'chapters' ? $id : 0;
    $saved = false;
    try {
        if ($type === 'chapters' && isset($_POST['chapter_intent'])) {
            $action = (string) $_POST['chapter_intent'];
            if (!in_array($action, ['save','save_publish','update_published'], true)) {
                throw new DomainException('Thao tác chương không hợp lệ.');
            }
        }
        if (in_array($action, ['save','save_publish','update_published'], true)) {
            if ($type !== 'chapters' && $action !== 'save') {
                throw new DomainException('Thao tác không hợp lệ.');
            }
            $payload = $_POST;
            $payload['action'] = $action;
            $edit = v2_save($db, $type, $payload);
            $saved = $type === 'chapters';
            v2_flash(match ($action) {
                'save_publish' => 'Đã lưu và đăng chương.',
                'update_published' => 'Đã cập nhật chương đã đăng.',
                default => $type === 'chapters' ? 'Đã lưu nháp. Chưa đăng.' : 'Đã lưu thông tin.'
            });
        } elseif ($action === 'publish' || $action === 'unpublish') {
            if ($type !== 'chapters') throw new DomainException('Thao tác xuất bản không hợp lệ.');
            v2_publication($db, $id, v2_num($_POST['revision'] ?? '', 1), $action);
            v2_flash($action === 'publish' ? 'Đã đăng chương.' : 'Đã chuyển chương về nháp.');
        } elseif ($action === 'move_up' || $action === 'move_down') {
            v2_move($db, $type, $id, $action === 'move_up' ? 'up' : 'down');
            v2_flash('Đã thay đổi thứ tự. Số chương công khai được tính lại tự động.');
        } elseif ($action === 'delete') {
            if (($_POST['confirm'] ?? '') !== 'yes') throw new DomainException('Cần xác nhận xóa.');
            v2_delete($db, $type, $id);
            v2_flash('Đã xóa mục được xác nhận.');
        } else {
            throw new DomainException('Thao tác không hợp lệ.');
        }
    } catch (DomainException $e) {
        v2_flash($e->getMessage(), 'error');
    } catch (PDOException $e) {
        // Never leak a database path, SQL statement or sensitive data to the browser.
        error_log('OXYTOCIN v2 write error [' . $e->getCode() . ']');
        v2_flash('Không thể lưu: trùng số, trùng slug, dữ liệu cha không tồn tại hoặc còn dữ liệu con.', 'error');
    } catch (Throwable $e) {
        error_log('OXYTOCIN v2 error: ' . get_class($e));
        v2_flash('Thao tác không thành công. Kiểm tra lại dữ liệu.', 'error');
    }
    v2_redirect($type, $edit, $saved);
}
$flash = $_SESSION['flash'] ?? null;
unset($_SESSION['flash']);
?>
<!doctype html><html lang="vi"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Quản trị OXYTOCIN v2</title><link rel="stylesheet" href="admin.css"><link rel="stylesheet" href="editor.css"><script src="editor.js" defer></script>
</head><body>
<?php if (!$authenticated): ?>
<main class="login card">
    <h1>OXYTOCIN / Quản trị v2</h1>
    <p>Hệ thống riêng, không truy cập database truyện cũ.</p>
    <?php if ($flash): ?><p class="notice <?= v2_h($flash['kind']) ?>"><?= v2_h($flash['text']) ?></p><?php endif; ?>
    <form method="post"><?php v2_hidden('', 'login'); ?>
        <label class="field">Mật khẩu quản trị<input type="password" name="password" autocomplete="current-password" required autofocus></label>
        <button class="primary" type="submit">Đăng nhập</button>
    </form>
</main>
<?php else:
    $parts = v2_rows($db, 'parts');
    $arcs = v2_rows($db, 'arcs');
    $episodes = v2_rows($db, 'episodes');
    $chapters = v2_numbered_chapters($db);
    $rows = ['parts'=>$parts,'arcs'=>$arcs,'episodes'=>$episodes,'chapters'=>$chapters][$tab];
    $editId = v2_num($_GET['edit'] ?? '0');
    $edit = null;
    foreach ($rows as $row) if ((int)$row['id'] === $editId) $edit = $row;
    $delId = v2_num($_GET['confirm_delete'] ?? '0');
    $del = null;
    foreach ($rows as $row) if ((int)$row['id'] === $delId) $del = $row;
    $partOptions = [];
    foreach ($parts as $p) $partOptions[$p['id']] = 'Phần ' . $p['part_num'] . ' · ' . ($p['title_vi'] ?: $p['title_en']);
    $arcOptions = [];
    foreach ($arcs as $a) $arcOptions[$a['id']] = 'Phần ' . $a['part_num'] . ' / Arc ' . $a['arc_num'] . ' · ' . ($a['title_vi'] ?: $a['title_en']);
    $episodeOptions = [];
    foreach ($episodes as $e) $episodeOptions[$e['id']] = 'Phần ' . $e['part_num'] . ' / Arc ' . $e['arc_num'] . ' / Tập ' . $e['ep_num'];
?>
<header class="topbar"><div><span class="eyebrow">HỆ THỐNG THỬ NGHIỆM / V2</span><h1>OXYTOCIN CMS</h1></div>
<div class="top-links"><a href="../index.php" target="_blank" rel="noopener noreferrer">Trang truyện cũ ↗</a>
<form method="post"><?php v2_hidden('', 'logout'); ?><button type="submit">Đăng xuất</button></form></div></header>
<main class="workspace">
    <aside class="sidebar"><nav aria-label="Quản lý cấu trúc">
        <a class="<?= $tab==='parts'?'active':'' ?>" href="?tab=parts">Phần <span><?= count($parts) ?></span></a>
        <a class="<?= $tab==='arcs'?'active':'' ?>" href="?tab=arcs">Arc <span><?= count($arcs) ?></span></a>
        <a class="<?= $tab==='episodes'?'active':'' ?>" href="?tab=episodes">Tập <span><?= count($episodes) ?></span></a>
        <a class="<?= $tab==='chapters'?'active':'' ?>" href="?tab=chapters">Chương <span><?= count($chapters) ?></span></a>
    </nav><p>Database v2 độc lập. Chương mới luôn là nháp; không tự động xuất bản.</p></aside>
    <section class="main-content">
        <?php if ($flash): ?><p class="notice <?= v2_h($flash['kind']) ?>" role="status"><?= v2_h($flash['text']) ?></p><?php endif; ?>
        <?php if ($del): ?>
        <div class="card danger-zone"><h2>Xác nhận xóa</h2>
            <p>Đối tượng <strong><?= v2_h($tab) ?> #<?= (int)$del['id'] ?></strong>. Không thể xóa phần, Arc hay tập còn dữ liệu con. Chương đã đăng phải hủy đăng trước.</p>
            <form method="post"><?php v2_hidden($tab, 'delete', (int)$del['id']); ?><input type="hidden" name="confirm" value="yes"><button class="danger-button" type="submit">Xác nhận xóa</button> <a href="?tab=<?= $tab ?>">Hủy</a></form>
        </div>
        <?php endif; ?>
        <div class="card">
        <h2><?= $edit ? 'Sửa' : 'Tạo' ?> <?= ['parts'=>'phần','arcs'=>'Arc','episodes'=>'tập','chapters'=>'chương'][$tab] ?></h2>
        <?php if (($tab==='arcs' && !$parts) || ($tab==='episodes' && !$arcs) || ($tab==='chapters' && !$episodes)): ?>
            <p>Hãy tạo <?= $tab==='arcs'?'Phần':($tab==='episodes'?'Arc':'Tập') ?> trước khi tạo mục này.</p>
        <?php else: ?>
        <form method="post" <?= $tab==='chapters' ? 'id="chapterForm"' : '' ?>><?php v2_hidden($tab, $tab==='chapters' && $edit && $edit['status']==='published' ? 'update_published' : 'save', (int)($edit['id'] ?? 0)); ?>
            <?php if ($tab === 'parts'):
                v2_field('part_num','Số phần (0 = Prologue)', $edit['part_num'] ?? (count($parts)?max(array_column($parts,'part_num'))+1:0),'number',true);
                v2_field('badge','Nhãn phần', $edit['badge'] ?? '');
                v2_field('title_en','Tên tiếng Anh', $edit['title_en'] ?? '');
                v2_field('title_vi','Tên tiếng Việt', $edit['title_vi'] ?? '');
                v2_field('description','Mô tả', $edit['description'] ?? '','textarea');
                v2_select('status','Trạng thái',['active'=>'Đang mở','coming_soon'=>'Sắp ra mắt'],$edit['status'] ?? 'active');
            elseif ($tab === 'arcs'):
                v2_select('part_id','Thuộc phần',$partOptions,$edit['part_id'] ?? array_key_first($partOptions));
                v2_field('arc_num','Số Arc trong phần',$edit['arc_num'] ?? 0,'number',true);
                v2_field('slug','Slug đường dẫn',$edit['slug'] ?? '','text',true);
                v2_field('title_en','Tên tiếng Anh',$edit['title_en'] ?? '');
                v2_field('title_vi','Tên tiếng Việt',$edit['title_vi'] ?? '');
                v2_field('intro','Giới thiệu Arc',$edit['intro'] ?? '','textarea');
            elseif ($tab === 'episodes'):
                v2_select('arc_id','Thuộc Arc',$arcOptions,$edit['arc_id'] ?? array_key_first($arcOptions));
                v2_field('ep_num','Số tập trong Arc',$edit['ep_num'] ?? 1,'number',true);
                v2_field('title_en','Tên tiếng Anh',$edit['title_en'] ?? '');
                v2_field('title_vi','Tên tiếng Việt',$edit['title_vi'] ?? '');
                v2_field('summary','Tóm tắt',$edit['summary'] ?? '','textarea');
                v2_field('intro','Đầu tập',$edit['intro'] ?? '','textarea');
            else:
                v2_select('episode_id','Thuộc tập',$episodeOptions,$edit['episode_id'] ?? array_key_first($episodeOptions));
                v2_field('title','Tên chương (không bắt buộc)',$edit['title'] ?? '');
                $format = $edit['content_format'] ?? 'html';
                $body = (string)($edit['content'] ?? '');
                echo '<input type="hidden" name="content_format" value="' . v2_h($format) . '">';
                if ($edit) {
                    echo '<input type="hidden" name="revision" value="' . (int)$edit['revision'] . '">';
                }
                echo '<p id="recoveryBanner" class="recovery" hidden>Bản khôi phục trên thiết bị chưa được lưu lên máy chủ. '
                    . '<button type="button" id="recoverDraft">Khôi phục</button>'
                    . '<button type="button" id="discardDraft">Bỏ bản khôi phục</button></p>';
                if ($format === 'html') {
                    echo '<label class="field" for="chapterEditor">Nội dung chương</label>';
                    echo '<div id="editorShell" class="editor-shell">'
                        . '<div id="editorToolbar" class="editor-toolbar" role="toolbar" aria-label="Định dạng văn bản">'
                        . '<button type="button" data-command="bold" title="In đậm (Ctrl+B)"><strong>B</strong></button>'
                        . '<button type="button" data-command="italic" title="In nghiêng (Ctrl+I)"><em>I</em></button>'
                        . '<button type="button" data-command="underline" title="Gạch dưới (Ctrl+U)"><u>U</u></button>'
                        . '<span class="toolbar-divider"></span>'
                        . '<button type="button" data-command="red" class="is-red" title="Nhấn mạnh đỏ">Đỏ</button>'
                        . '<button type="button" data-command="bright" title="Nhấn mạnh sáng">Sáng</button>'
                        . '<button type="button" data-command="center-red" class="is-red" title="Căn giữa, chữ đỏ">Câu đỏ</button>'
                        . '<button type="button" data-command="beat" class="is-gold" title="Căn giữa, chữ vàng">Nhịp vàng</button>'
                        . '<button type="button" data-command="scene" title="Ngắt cảnh trong chương">✦ ✦ ✦</button>'
                        . '<span class="toolbar-divider"></span>'
                        . '<button type="button" data-command="undo" title="Hoàn tác">↶</button>'
                        . '<button type="button" data-command="redo" title="Làm lại">↷</button>'
                        . '<button type="button" data-command="fullscreen" aria-pressed="false" title="Toàn màn hình">⛶</button>'
                        . '</div>'
                        . '<div id="chapterEditor" class="editor-area" contenteditable="true" role="textbox"'
                        . ' aria-label="Nội dung chương" aria-multiline="true" spellcheck="true">'
                        . v2_sanitize_html($body) . '</div></div>';
                    echo '<textarea class="editor-fallback field" id="chapterContent" name="content" rows="17">'
                        . v2_h($body) . '</textarea>';
                } else {
                    v2_field('content','Nội dung chương (định dạng Noir cũ)',$body,'textarea');
                    echo '<p class="hint">Giữ nguyên cú pháp cũ: **chữ sáng**, *chữ đỏ*; không tự chuyển đổi nội dung.</p>';
                }
                echo '<p id="autosaveStatus" class="autosave-status" role="status">Bản khôi phục chỉ nằm trên thiết bị; chưa đăng.</p>';
                echo '<p class="hint">Dấu --- hoặc ✦ ✦ ✦ chỉ ngắt cảnh. Dán từ Word/Google Docs sẽ loại bỏ định dạng không cần thiết.</p>';
            endif; ?>
            <div class="form-actions">
                <?php if ($tab === 'chapters'): ?>
                    <?php if ($edit && $edit['status'] === 'published'): ?>
                        <button class="primary" type="submit" name="chapter_intent" value="update_published">Cập nhật chương đã đăng</button>
                    <?php else: ?>
                        <button class="primary" type="submit" name="chapter_intent" value="save">Lưu nháp</button>
                        <button type="submit" name="chapter_intent" value="save_publish">Đăng chương</button>
                    <?php endif; ?>
                    <button type="submit" name="chapter_intent" value="preview"
                        formaction="preview.php" formtarget="_blank">Xem trước ↗</button>
                <?php else: ?>
                    <button class="primary" type="submit">Lưu thông tin</button>
                <?php endif; ?>
                <?php if ($edit): ?><a href="?tab=<?= $tab ?>">Hủy sửa</a><?php endif; ?>
            </div>
        </form>
        <?php endif; ?>
        </div>
        <div class="card"><h2>Danh sách <?= ['parts'=>'phần','arcs'=>'Arc','episodes'=>'tập','chapters'=>'chương'][$tab] ?></h2>
        <?php if (!$rows): ?><p class="muted">Chưa có dữ liệu. Database v2 khởi tạo trống.</p><?php else: ?>
            <div class="table-scroll"><table><thead><tr><th>Thứ tự</th><th>Thông tin</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
            <?php foreach ($rows as $row): ?>
            <tr><td class="order">
                <?php if ($tab==='parts'): ?><?= (int)$row['part_num'] ?>
                <?php elseif ($tab==='arcs'): ?><?= (int)$row['part_num'] ?> / <?= (int)$row['arc_num'] ?>
                <?php elseif ($tab==='episodes'): ?><?= (int)$row['part_num'] ?> / <?= (int)$row['arc_num'] ?> / <?= (int)$row['ep_num'] ?>
                <?php else: ?><?= $row['public_number'] === null ? ($row['status'] === 'published' ? 'Ẩn theo phần' : 'Nháp') : 'Chương ' . $row['public_number'] ?>
                    <small>Vị trí <?= (int)$row['sort_order'] ?></small>
                <?php endif; ?>
            </td><td><strong><?= v2_h($tab==='chapters' ? ($row['title'] ?: 'Chương không tên') : (($row['title_vi'] ?: $row['title_en']))) ?></strong>
                <?php if ($tab==='arcs'): ?><small><?= v2_h($row['slug']) ?></small><?php endif; ?>
                <?php if ($tab==='chapters'): ?><small>Phần <?= (int)$row['part_num'] ?> · Arc <?= (int)$row['arc_num'] ?> · Tập <?= (int)$row['ep_num'] ?> · ID <?= (int)$row['id'] ?></small><?php endif; ?>
            </td><td><?php if ($tab==='chapters'): ?><span class="pill <?= $row['status']==='published'?'published':'' ?>"><?= $row['status']==='published'?'Đã đăng':'Nháp' ?></span>
                <?php elseif ($tab==='parts'): ?><span class="pill"><?= $row['status']==='active'?'Đang mở':'Sắp ra mắt' ?></span>
                <?php else: ?><span class="muted">—</span><?php endif; ?></td>
                <td><?php v2_commands($tab,$row); ?></td></tr>
            <?php endforeach; ?></tbody></table></div>
        <?php endif; ?></div>
        <p class="hint">Số chương hiển thị tính theo thứ tự Phần → Arc → Tập → vị trí chương. Thao tác ↑ ↓ thay đổi thứ tự trong cấp tương ứng.</p>
    </section>
</main>
<?php endif; ?></body></html>
