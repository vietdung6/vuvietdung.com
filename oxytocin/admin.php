<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

session_start();
require_once 'db.php';
$ADMIN_PASS = 'dung2026';

// Xử lý Đăng xuất
if (isset($_GET['action']) && $_GET['action'] === 'logout') {
    unset($_SESSION['admin']);
    header('Location: admin.php');
    exit;
}

// Xử lý Đăng nhập
if (isset($_POST['login_pass'])) {
    if ($_POST['login_pass'] === $ADMIN_PASS) {
        $_SESSION['admin'] = true;
    } else {
        $err = "Sai mật khẩu!";
    }
}

if (empty($_SESSION['admin'])):
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Admin Login — OXYTOCIN</title>
    <style>
        body { background: #0c0c0c; color: #ccc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        form { background: #161616; padding: 32px; border: 1px solid #282828; border-radius: 8px; width: 320px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        input { width: 100%; padding: 11px; margin: 12px 0; background: #080808; border: 1px solid #383838; color: #fff; border-radius: 4px; box-sizing: border-box; }
        button { width: 100%; padding: 11px; background: #7a1515; color: #fff; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        button:hover { background: #961b1b; }
    </style>
</head>
<body>
<form method="POST">
    <h3 style="margin-top:0; letter-spacing: 2px;">OXYTOCIN CMS</h3>
    <?php if (!empty($err)) echo "<p style='color:#e57373; font-size: 0.9em;'>$err</p>"; ?>
    <input type="password" name="login_pass" placeholder="Nhập mật khẩu quản trị..." required autofocus>
    <button type="submit">ĐĂNG NHẬP</button>
</form>
</body>
</html>
<?php exit; endif;

// ===================== XỬ LÝ DỮ LIỆU (POST / GET) =====================

// 1. Lưu Giới thiệu truyện
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['save_synopsis'])) {
    $stmt = $db->prepare("INSERT OR REPLACE INTO settings (`key`, `value`) VALUES ('synopsis', ?)");
    $stmt->execute([trim($_POST['synopsis'])]);
    header('Location: admin.php?tab=synopsis&status=synopsis_saved');
    exit;
}

// 2. Lưu / Sửa Part
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['save_part'])) {
    $pid = $_POST['part_id'] ?? '';
    if ($pid) {
        $stmt = $db->prepare("UPDATE parts SET part_num=?, badge=?, title_en=?, title_vi=?, description=?, status=? WHERE id=?");
        $stmt->execute([(int)$_POST['part_num'], trim($_POST['badge']), trim($_POST['title_en']), trim($_POST['title_vi']), trim($_POST['description']), $_POST['status'], $pid]);
    } else {
        $stmt = $db->prepare("INSERT INTO parts (part_num, badge, title_en, title_vi, description, status) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([(int)$_POST['part_num'], trim($_POST['badge']), trim($_POST['title_en']), trim($_POST['title_vi']), trim($_POST['description']), $_POST['status']]);
    }
    header('Location: admin.php?tab=parts&status=saved');
    exit;
}

// 3. Lưu / Sửa Arc
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['save_arc'])) {
    $aid = $_POST['arc_id'] ?? '';
    if ($aid) {
        $stmt = $db->prepare("UPDATE arcs SET part_id=?, slug=?, arc_code=?, title_en=?, title_vi=?, intro=?, sort_order=? WHERE id=?");
        $stmt->execute([(int)$_POST['part_id'], trim($_POST['slug']), trim($_POST['arc_code']), trim($_POST['title_en']), trim($_POST['title_vi']), trim($_POST['intro']), (int)$_POST['sort_order'], $aid]);
    } else {
        $stmt = $db->prepare("INSERT INTO arcs (part_id, slug, arc_code, title_en, title_vi, intro, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([(int)$_POST['part_id'], trim($_POST['slug']), trim($_POST['arc_code']), trim($_POST['title_en']), trim($_POST['title_vi']), trim($_POST['intro']), (int)$_POST['sort_order']]);
    }
    header('Location: admin.php?tab=arcs&status=saved');
    exit;
}

// 4. Lưu / Sửa Episode
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['save_ep'])) {
    $eid = $_POST['ep_id'] ?? '';
    if ($eid) {
        $stmt = $db->prepare("UPDATE episodes SET arc_id=?, ep_num=?, badge=?, title_en=?, title_vi=?, summary=?, intro=?, content=? WHERE id=?");
        $stmt->execute([(int)$_POST['arc_id'], (int)$_POST['ep_num'], trim($_POST['badge']), trim($_POST['title_en']), trim($_POST['title_vi']), trim($_POST['summary']), trim($_POST['intro']), trim($_POST['content']), $eid]);
    } else {
        $stmt = $db->prepare("INSERT INTO episodes (arc_id, ep_num, badge, title_en, title_vi, summary, intro, content) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([(int)$_POST['arc_id'], (int)$_POST['ep_num'], trim($_POST['badge']), trim($_POST['title_en']), trim($_POST['title_vi']), trim($_POST['summary']), trim($_POST['intro']), trim($_POST['content'])]);
    }
    header('Location: admin.php?tab=episodes&status=saved');
    exit;
}

// Xử lý Xóa
if (isset($_GET['del_ep'])) { $db->prepare("DELETE FROM episodes WHERE id=?")->execute([(int)$_GET['del_ep']]); header('Location: admin.php?tab=episodes'); exit; }
if (isset($_GET['del_arc'])) { $db->prepare("DELETE FROM arcs WHERE id=?")->execute([(int)$_GET['del_arc']]); header('Location: admin.php?tab=arcs'); exit; }
if (isset($_GET['del_part'])) { $db->prepare("DELETE FROM parts WHERE id=?")->execute([(int)$_GET['del_part']]); header('Location: admin.php?tab=parts'); exit; }

// Nhận diện dữ liệu đang sửa
$edit_ep = null;
if (isset($_GET['edit_ep'])) {
    $stmt = $db->prepare("SELECT * FROM episodes WHERE id = ?");
    $stmt->execute([(int)$_GET['edit_ep']]);
    $edit_ep = $stmt->fetch(PDO::FETCH_ASSOC);
}

$edit_arc = null;
if (isset($_GET['edit_arc'])) {
    $stmt = $db->prepare("SELECT * FROM arcs WHERE id = ?");
    $stmt->execute([(int)$_GET['edit_arc']]);
    $edit_arc = $stmt->fetch(PDO::FETCH_ASSOC);
}

$edit_part = null;
if (isset($_GET['edit_part'])) {
    $stmt = $db->prepare("SELECT * FROM parts WHERE id = ?");
    $stmt->execute([(int)$_GET['edit_part']]);
    $edit_part = $stmt->fetch(PDO::FETCH_ASSOC);
}

// Xác định Tab đang kích hoạt thông minh
$current_tab = $_GET['tab'] ?? 'episodes';
if ($edit_part) $current_tab = 'parts';
if ($edit_arc)  $current_tab = 'arcs';
if ($edit_ep)   $current_tab = 'episodes';

// ===================== TRUY VẤN DỮ LIỆU HIỂN THỊ =====================

// Danh sách Parts kèm số lượng Arc bên trong
$parts = $db->query("
    SELECT p.*, COUNT(a.id) AS arc_count 
    FROM parts p 
    LEFT JOIN arcs a ON a.part_id = p.id 
    GROUP BY p.id 
    ORDER BY p.part_num ASC
")->fetchAll(PDO::FETCH_ASSOC);

// Danh sách Arcs kèm tên Phần và số lượng Tập bên trong
$arcs = $db->query("
    SELECT a.*, p.title_vi AS part_name, p.badge AS part_badge, COUNT(e.id) AS ep_count 
    FROM arcs a 
    JOIN parts p ON a.part_id = p.id 
    LEFT JOIN episodes e ON e.arc_id = a.id 
    GROUP BY a.id 
    ORDER BY p.part_num ASC, a.sort_order ASC
")->fetchAll(PDO::FETCH_ASSOC);

// Danh sách Tập truyện đầy đủ
$episodes = $db->query("
    SELECT e.*, a.slug AS arc_slug, a.title_vi AS arc_name, a.arc_code, p.title_vi AS part_name 
    FROM episodes e 
    JOIN arcs a ON e.arc_id = a.id 
    JOIN parts p ON a.part_id = p.id 
    ORDER BY p.part_num ASC, a.sort_order ASC, e.ep_num ASC
")->fetchAll(PDO::FETCH_ASSOC);

$synopsis = $db->query("SELECT value FROM settings WHERE `key`='synopsis'")->fetchColumn() ?: '';
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CMS Dashboard — OXYTOCIN</title>
    <style>
        :root {
            --bg-base: #0d0d0d;
            --bg-card: #151515;
            --border: #282828;
            --crimson: #841818;
            --crimson-hover: #a12020;
            --gold: #c9a96e;
            --text-dim: #888;
            --text-light: #ddd;
        }
        * { box-sizing: border-box; }
        body { background: var(--bg-base); color: var(--text-light); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 1060px; margin: 0 auto; padding: 24px 20px; line-height: 1.5; }
        
        /* HEADER */
        .top-bar { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 1px solid var(--border); margin-bottom: 20px; }
        .stats-bar { display: flex; gap: 20px; font-size: 0.88em; color: var(--text-dim); }
        .stats-item strong { color: var(--gold); }
        
        /* TABS */
        .tab-nav { display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
        .tab-btn { background: #1c1c1c; color: #aaa; padding: 9px 18px; border-radius: 6px; text-decoration: none; font-size: 0.9em; font-weight: 500; transition: 0.2s; }
        .tab-btn:hover { background: #282828; color: #fff; }
        .tab-btn.active { background: var(--crimson); color: #fff; }
        
        /* CARDS & FORMS */
        .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 22px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
        .card-header { margin-top: 0; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #222; padding-bottom: 10px; font-size: 1.15em; }
        .row { display: flex; gap: 14px; }
        label { display: block; font-size: 0.82em; color: var(--text-dim); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        input, select, textarea { width: 100%; padding: 10px 12px; background: #0c0c0c; border: 1px solid var(--border); color: #fff; border-radius: 4px; margin-bottom: 14px; font-size: 0.95em; }
        input:focus, select:focus, textarea:focus { border-color: var(--gold); outline: none; }
        
        /* BUTTONS */
        button, .btn { padding: 9px 18px; background: var(--crimson); color: #fff; border: none; border-radius: 4px; font-weight: 500; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; font-size: 0.9em; transition: 0.15s; }
        button:hover, .btn:hover { background: var(--crimson-hover); }
        .btn-gray { background: #262626; color: #bbb; }
        .btn-gray:hover { background: #333; color: #fff; }
        .btn-sm { padding: 4px 10px; font-size: 0.82em; }
        
        /* TABLES */
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.92em; }
        th, td { padding: 11px 12px; border: 1px solid var(--border); text-align: left; }
        th { background: #1a1a1a; color: #aaa; font-weight: 600; font-size: 0.85em; text-transform: uppercase; }
        tr:hover { background: #181818; }
        
        /* BADGES */
        .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 0.8em; background: #262626; color: #ccc; }
        .badge-active { background: #132a13; color: #72cf72; }
        .badge-soon { background: #332211; color: #e6a05e; }
        .badge-gold { background: #262012; color: var(--gold); border: 1px solid #4a3d24; }
        
        .alert-success { background: #132616; border: 1px solid #234d28; color: #81c784; padding: 10px 14px; border-radius: 4px; margin-bottom: 20px; font-size: 0.9em; }
    </style>
</head>
<body>

    <!-- TOP HEADER -->
    <div class="top-bar">
        <div>
            <h2 style="margin:0; letter-spacing: 1.5px; font-size: 1.35em;">OXYTOCIN CMS</h2>
            <div class="stats-bar" style="margin-top: 5px;">
                <span class="stats-item">Phần lớn: <strong><?= count($parts) ?></strong></span>
                <span class="stats-item">Hồi (Arc): <strong><?= count($arcs) ?></strong></span>
                <span class="stats-item">Tập (Ep): <strong><?= count($episodes) ?></strong></span>
            </div>
        </div>
        <div style="display: flex; gap: 8px;">
            <a href="./index.php" target="_blank" class="btn btn-gray">Trang chủ ↗</a>
            <a href="admin.php?action=logout" class="btn btn-gray">Thoát</a>
        </div>
    </div>

    <?php if (isset($_GET['status'])): ?>
        <div class="alert-success">✓ Dữ liệu đã được cập nhật thành công vào hệ thống!</div>
    <?php endif; ?>

    <!-- NAVIGATION TABS -->
    <nav class="tab-nav">
        <a href="admin.php?tab=episodes" class="tab-btn <?= $current_tab === 'episodes' ? 'active' : '' ?>">📑 Tập Truyện (<?= count($episodes) ?>)</a>
        <a href="admin.php?tab=arcs" class="tab-btn <?= $current_tab === 'arcs' ? 'active' : '' ?>">📂 Hồi - Arc (<?= count($arcs) ?>)</a>
        <a href="admin.php?tab=parts" class="tab-btn <?= $current_tab === 'parts' ? 'active' : '' ?>">🏛️ Phần - Part (<?= count($parts) ?>)</a>
        <a href="admin.php?tab=synopsis" class="tab-btn <?= $current_tab === 'synopsis' ? 'active' : '' ?>">📝 Giới Thiệu Truyện</a>
    </nav>

    <!-- ================================= TAB 1: TẬP TRUYỆN ================================= -->
    <?php if ($current_tab === 'episodes'): ?>
        <div class="card">
            <div class="card-header">
                <span style="color: <?= $edit_ep ? '#64b5f6' : '#fff' ?>;">
                    <?= $edit_ep ? '✏️ Đang sửa: Ep. ' . str_pad($edit_ep['ep_num'], 2, '0', STR_PAD_LEFT) . ' — ' . htmlspecialchars($edit_ep['title_en']) : '+ Đăng Tập Mới' ?>
                </span>
                <?php if ($edit_ep): ?><a href="admin.php?tab=episodes" class="btn btn-gray btn-sm">✕ Hủy sửa</a><?php endif; ?>
            </div>
            <form method="POST">
                <input type="hidden" name="save_ep" value="1">
                <input type="hidden" name="ep_id" value="<?= $edit_ep['id'] ?? '' ?>">
                
                <div class="row">
                    <div style="flex: 2;">
                        <label>Thuộc Hồi (Arc):</label>
                        <select name="arc_id" required>
                            <?php foreach ($arcs as $a): ?>
                                <option value="<?= $a['id'] ?>" <?= (isset($edit_ep['arc_id']) && $edit_ep['arc_id'] == $a['id']) ? 'selected' : '' ?>>
                                    [<?= htmlspecialchars($a['part_badge']) ?>] <?= htmlspecialchars($a['arc_code']) ?>: <?= htmlspecialchars($a['title_vi']) ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div style="flex: 1;">
                        <label>Số tập (Ep):</label>
                        <input type="number" name="ep_num" value="<?= $edit_ep['ep_num'] ?? 0 ?>" required>
                    </div>
                    <div style="flex: 1;">
                        <label>Badge hiển thị:</label>
                        <input type="text" name="badge" value="<?= htmlspecialchars($edit_ep['badge'] ?? 'Prologue') ?>">
                    </div>
                </div>

                <div class="row">
                    <div style="flex: 1;">
                        <label>Tiêu đề Tiếng Anh:</label>
                        <input type="text" name="title_en" value="<?= htmlspecialchars($edit_ep['title_en'] ?? '') ?>" placeholder="VD: Constant" required>
                    </div>
                    <div style="flex: 1;">
                        <label>Tiêu đề Tiếng Việt:</label>
                        <input type="text" name="title_vi" value="<?= htmlspecialchars($edit_ep['title_vi'] ?? '') ?>" placeholder="VD: Hằng số" required>
                    </div>
                </div>

                <label>Tóm tắt ngắn (Hiện ở Card danh sách):</label>
                <input type="text" name="summary" value="<?= htmlspecialchars($edit_ep['summary'] ?? '') ?>" placeholder="Tóm lược 1 dòng về nội dung tập...">

                <label>Intro / Quote đầu trang đọc:</label>
                <input type="text" name="intro" value="<?= htmlspecialchars($edit_ep['intro'] ?? '') ?>" placeholder="Trích dẫn đầu tập (tùy chọn)...">

                <label>Nội dung chi tiết (Dán văn bản thô — hệ thống tự ngắt dòng và style Noir):</label>
                <textarea name="content" style="height: 300px; font-family: monospace; font-size: 0.9em;" required placeholder="Dán nội dung truyện vào đây..."><?= htmlspecialchars($edit_ep['content'] ?? '') ?></textarea>

                <button type="submit"><?= $edit_ep ? 'CẬP NHẬT TẬP' : 'LƯU VÀ ĐĂNG TẬP' ?></button>
            </form>
        </div>

        <div class="card">
            <div class="card-header">Danh Sách Toàn Bộ Tập Truyện</div>
            <?php if (empty($episodes)): ?>
                <p style="color:var(--text-dim); font-style:italic;">Chưa có tập truyện nào được đăng.</p>
            <?php else: ?>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 130px;">Phần</th>
                            <th style="width: 140px;">Hồi</th>
                            <th style="width: 70px;">Tập</th>
                            <th>Tiêu đề (Anh — Việt)</th>
                            <th style="width: 180px; text-align: right;">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($episodes as $row): ?>
                        <tr>
                            <td><span class="badge"><?= htmlspecialchars($row['part_name']) ?></span></td>
                            <td><?= htmlspecialchars($row['arc_code']) ?>: <?= htmlspecialchars($row['arc_name']) ?></td>
                            <td><strong>Ep. <?= str_pad($row['ep_num'], 2, '0', STR_PAD_LEFT) ?></strong></td>
                            <td><strong><?= htmlspecialchars($row['title_en']) ?></strong> — <?= htmlspecialchars($row['title_vi']) ?></td>
                            <td style="text-align: right;">
                                <a href="read.php?arc=<?= urlencode($row['arc_slug']) ?>&ep=<?= $row['ep_num'] ?>" target="_blank" style="color:var(--gold); text-decoration:none; margin-right:8px;">Xem ↗</a>
                                <a href="admin.php?tab=episodes&edit_ep=<?= $row['id'] ?>" style="color:#64b5f6; text-decoration:none; margin-right:8px;">Sửa</a>
                                <a href="admin.php?tab=episodes&del_ep=<?= $row['id'] ?>" onclick="return confirm('Chắc chắn muốn xóa tập này?')" style="color:#e57373; text-decoration:none;">Xóa</a>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
    <?php endif; ?>

    <!-- ================================= TAB 2: HỒI (ARC) ================================= -->
    <?php if ($current_tab === 'arcs'): ?>
        <div class="card">
            <div class="card-header">
                <span style="color: <?= $edit_arc ? '#64b5f6' : '#fff' ?>;">
                    <?= $edit_arc ? '✏️ Đang sửa Hồi: ' . htmlspecialchars($edit_arc['arc_code']) . ' — ' . htmlspecialchars($edit_arc['title_en']) : '+ Thêm Hồi (Arc) Mới' ?>
                </span>
                <?php if ($edit_arc): ?><a href="admin.php?tab=arcs" class="btn btn-gray btn-sm">✕ Hủy sửa</a><?php endif; ?>
            </div>
            <form method="POST">
                <input type="hidden" name="save_arc" value="1">
                <input type="hidden" name="arc_id" value="<?= $edit_arc['id'] ?? '' ?>">
                
                <div class="row">
                    <div style="flex: 2;">
                        <label>Thuộc Phần lớn (Part):</label>
                        <select name="part_id" required>
                            <?php foreach ($parts as $p): ?>
                                <option value="<?= $p['id'] ?>" <?= (isset($edit_arc['part_id']) && $edit_arc['part_id'] == $p['id']) ? 'selected' : '' ?>>
                                    [<?= htmlspecialchars($p['badge']) ?>] <?= htmlspecialchars($p['title_vi']) ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div style="flex: 1;">
                        <label>Mã Arc (Arc 0, Arc 1.1...):</label>
                        <input type="text" name="arc_code" value="<?= htmlspecialchars($edit_arc['arc_code'] ?? '') ?>" placeholder="VD: Arc 1.1" required>
                    </div>
                    <div style="flex: 2;">
                        <label>Slug URL (không dấu, cách bằng gạch nối):</label>
                        <input type="text" name="slug" value="<?= htmlspecialchars($edit_arc['slug'] ?? '') ?>" placeholder="VD: sixteen-arc1" required>
                    </div>
                    <div style="width: 90px;">
                        <label>Thứ tự:</label>
                        <input type="number" name="sort_order" value="<?= $edit_arc['sort_order'] ?? 1 ?>">
                    </div>
                </div>

                <div class="row">
                    <div style="flex: 1;">
                        <label>Tiêu đề Tiếng Anh:</label>
                        <input type="text" name="title_en" value="<?= htmlspecialchars($edit_arc['title_en'] ?? '') ?>" placeholder="VD: THE ZEROTH AXIOM" required>
                    </div>
                    <div style="flex: 1;">
                        <label>Tiêu đề Tiếng Việt:</label>
                        <input type="text" name="title_vi" value="<?= htmlspecialchars($edit_arc['title_vi'] ?? '') ?>" placeholder="VD: Tiên đề 0" required>
                    </div>
                </div>

                <label>Giới thiệu mở đầu của Arc:</label>
                <textarea name="intro" style="height: 90px;" placeholder="Tóm tắt ngắn xuất hiện ở đầu trang Arc..."><?= htmlspecialchars($edit_arc['intro'] ?? '') ?></textarea>

                <button type="submit"><?= $edit_arc ? 'CẬP NHẬT HỒI' : 'TẠO HỒI MỚI' ?></button>
            </form>
        </div>

        <div class="card">
            <div class="card-header">Danh Sách Các Hồi (Arcs)</div>
            <?php if (empty($arcs)): ?>
                <p style="color:var(--text-dim); font-style:italic;">Chưa có Arc nào được tạo.</p>
            <?php else: ?>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 140px;">Thuộc Phần</th>
                            <th style="width: 100px;">Mã Arc</th>
                            <th>Tên Hồi (Anh — Việt)</th>
                            <th style="width: 180px;">Slug URL</th>
                            <th style="width: 80px; text-align: center;">Số tập</th>
                            <th style="width: 160px; text-align: right;">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($arcs as $a): ?>
                        <tr>
                            <td><span class="badge"><?= htmlspecialchars($a['part_badge']) ?></span></td>
                            <td><strong><?= htmlspecialchars($a['arc_code']) ?></strong></td>
                            <td><strong><?= htmlspecialchars($a['title_en']) ?></strong> — <?= htmlspecialchars($a['title_vi']) ?></td>
                            <td><code style="color:var(--gold);"><?= htmlspecialchars($a['slug']) ?></code></td>
                            <td style="text-align: center;"><span class="badge badge-gold"><?= $a['ep_count'] ?> tập</span></td>
                            <td style="text-align: right;">
                                <a href="arc.php?slug=<?= urlencode($a['slug']) ?>" target="_blank" style="color:var(--gold); text-decoration:none; margin-right:8px;">Xem ↗</a>
                                <a href="admin.php?tab=arcs&edit_arc=<?= $a['id'] ?>" style="color:#64b5f6; text-decoration:none; margin-right:8px;">Sửa</a>
                                <a href="admin.php?tab=arcs&del_arc=<?= $a['id'] ?>" onclick="return confirm('CẢNH BÁO: Xóa Arc này sẽ xóa toàn bộ tập thuộc về nó?')" style="color:#e57373; text-decoration:none;">Xóa</a>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
    <?php endif; ?>

    <!-- ================================= TAB 3: PHẦN LỚN (PART) ================================= -->
    <?php if ($current_tab === 'parts'): ?>
        <div class="card">
            <div class="card-header">
                <span style="color: <?= $edit_part ? '#64b5f6' : '#fff' ?>;">
                    <?= $edit_part ? '✏️ Đang sửa Phần: [' . htmlspecialchars($edit_part['badge']) . '] ' . htmlspecialchars($edit_part['title_en']) : '+ Thêm Phần Lớn (Part) Mới' ?>
                </span>
                <?php if ($edit_part): ?><a href="admin.php?tab=parts" class="btn btn-gray btn-sm">✕ Hủy sửa</a><?php endif; ?>
            </div>
            <form method="POST">
                <input type="hidden" name="save_part" value="1">
                <input type="hidden" name="part_id" value="<?= $edit_part['id'] ?? '' ?>">
                
                <div class="row">
                    <div style="flex: 1;">
                        <label>Số thứ tự Phần (0, 1, 2...):</label>
                        <input type="number" name="part_num" value="<?= $edit_part['part_num'] ?? 0 ?>" required>
                    </div>
                    <div style="flex: 1;">
                        <label>Badge hiển thị (Prologue, Phần 1...):</label>
                        <input type="text" name="badge" value="<?= htmlspecialchars($edit_part['badge'] ?? '') ?>" placeholder="VD: Phần 1" required>
                    </div>
                    <div style="flex: 1;">
                        <label>Trạng thái phát hành:</label>
                        <select name="status">
                            <option value="active" <?= (isset($edit_part['status']) && $edit_part['status'] === 'active') ? 'selected' : '' ?>>Hiển thị (Đang mở)</option>
                            <option value="coming_soon" <?= (isset($edit_part['status']) && $edit_part['status'] === 'coming_soon') ? 'selected' : '' ?>>Sắp ra mắt (Khóa link)</option>
                        </select>
                    </div>
                </div>

                <div class="row">
                    <div style="flex: 1;">
                        <label>Tiêu đề Tiếng Anh:</label>
                        <input type="text" name="title_en" value="<?= htmlspecialchars($edit_part['title_en'] ?? '') ?>" placeholder="VD: SIXTEEN" required>
                    </div>
                    <div style="flex: 1;">
                        <label>Tiêu đề Tiếng Việt:</label>
                        <input type="text" name="title_vi" value="<?= htmlspecialchars($edit_part['title_vi'] ?? '') ?>" placeholder="VD: Mười sáu" required>
                    </div>
                </div>

                <label>Mô tả ngắn (Hiển thị ở Card ngoài trang chủ):</label>
                <input type="text" name="description" value="<?= htmlspecialchars($edit_part['description'] ?? '') ?>" placeholder="Mô tả 1-2 câu về phần này...">

                <button type="submit"><?= $edit_part ? 'CẬP NHẬT PHẦN' : 'TẠO PHẦN MỚI' ?></button>
            </form>
        </div>

        <div class="card">
            <div class="card-header">Danh Sách Các Phần Lớn (Parts)</div>
            <?php if (empty($parts)): ?>
                <p style="color:var(--text-dim); font-style:italic;">Chưa có phần nào được thiết lập.</p>
            <?php else: ?>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 60px;">STT</th>
                            <th style="width: 110px;">Badge</th>
                            <th>Tên Phần (Anh — Việt)</th>
                            <th style="width: 120px;">Trạng thái</th>
                            <th style="width: 80px; text-align: center;">Số Arc</th>
                            <th style="width: 140px; text-align: right;">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($parts as $p): ?>
                        <tr>
                            <td><strong><?= str_pad($p['part_num'], 2, '0', STR_PAD_LEFT) ?></strong></td>
                            <td><span class="badge"><?= htmlspecialchars($p['badge']) ?></span></td>
                            <td>
                                <strong><?= htmlspecialchars($p['title_en']) ?></strong> — <?= htmlspecialchars($p['title_vi']) ?>
                                <?php if (!empty($p['description'])): ?>
                                    <div style="font-size:0.83em; color:var(--text-dim); margin-top:3px;"><?= htmlspecialchars($p['description']) ?></div>
                                <?php endif; ?>
                            </td>
                            <td>
                                <?php if ($p['status'] === 'active'): ?>
                                    <span class="badge badge-active">Hoạt động</span>
                                <?php else: ?>
                                    <span class="badge badge-soon">Sắp ra mắt</span>
                                <?php endif; ?>
                            </td>
                            <td style="text-align: center;"><span class="badge badge-gold"><?= $p['arc_count'] ?></span></td>
                            <td style="text-align: right;">
                                <a href="admin.php?tab=parts&edit_part=<?= $p['id'] ?>" style="color:#64b5f6; text-decoration:none; margin-right:8px;">Sửa</a>
                                <a href="admin.php?tab=parts&del_part=<?= $p['id'] ?>" onclick="return confirm('CẢNH BÁO: Xóa phần này sẽ xóa sạch các Arc và Tập thuộc về nó?')" style="color:#e57373; text-decoration:none;">Xóa</a>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
    <?php endif; ?>

    <!-- ================================= TAB 4: GIỚI THIỆU TRUYỆN ================================= -->
    <?php if ($current_tab === 'synopsis'): ?>
        <div class="card">
            <div class="card-header">Chỉnh Sửa Giới Thiệu Truyện (Trang Chủ)</div>
            <form method="POST">
                <input type="hidden" name="save_synopsis" value="1">
                <label>Nội dung hoàn chỉnh :</label>
                <textarea name="synopsis" style="height: 380px; font-family: monospace; font-size: 0.9em; line-height: 1.6;" placeholder="Nhập mã HTML giới thiệu..."><?= htmlspecialchars($synopsis) ?></textarea>
                <button type="submit">LƯU NỘI DUNG GIỚI THIỆU</button>
            </form>
        </div>
    <?php endif; ?>

</body>
</html>