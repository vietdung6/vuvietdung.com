<?php
declare(strict_types=1);
require_once __DIR__ . '/render.php';

/**
 * SQLite v2 is independent of oxytocin.db. On cPanel it starts empty on the
 * first request, without a MySQL/phpMyAdmin or PHP-FPM configuration step.
 * A custom absolute DB path is still supported for tests and advanced hosting.
 */
function v2_path(): string {
    $override = getenv('OXYTOCIN_V2_DB_PATH');
    $automatic = !is_string($override) || $override === '';
    $requested = $automatic ? __DIR__ . '/.data/oxytocin_v2.db' : $override;

    if ($requested[0] !== '/') {
        throw new RuntimeException('Đường dẫn SQLite tùy chỉnh phải là đường dẫn tuyệt đối.');
    }

    $directory = dirname($requested);
    if ($automatic && !is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new RuntimeException('Không tạo được thư mục SQLite v2.');
    }
    $parent = realpath($directory);
    if ($parent === false) {
        throw new RuntimeException('Thư mục SQLite không tồn tại.');
    }
    $path = realpath($requested) ?: $parent . DIRECTORY_SEPARATOR . basename($requested);

    $old = realpath(dirname(__DIR__) . '/oxytocin.db');
    if ($old !== false && $path === $old) {
        throw new RuntimeException('Không được sử dụng database cũ.');
    }

    if ($automatic) {
        $guard = $parent . '/.htaccess';
        // The in-site default is only permitted inside its own denied folder.
        if ($parent !== realpath(__DIR__ . '/.data') ||
            !is_file($guard) ||
            !str_contains((string)file_get_contents($guard), 'Require all denied')) {
            throw new RuntimeException('SQLite v2 chưa có bảo vệ truy cập web.');
        }
        @chmod($parent, 0700);
    } else {
        // Custom paths must stay outside the checked-out website.
        $publicRoot = realpath(dirname(__DIR__, 2));
        if ($publicRoot !== false &&
            ($path === $publicRoot || str_starts_with($path, $publicRoot . DIRECTORY_SEPARATOR))) {
            throw new RuntimeException('Đường dẫn tùy chỉnh phải ở ngoài website.');
        }
    }
    return $path;
}

function v2_connect(string $path): PDO {
    $db = new PDO('sqlite:' . $path, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    $db->exec('PRAGMA foreign_keys = ON');
    $db->exec('PRAGMA busy_timeout = 5000');
    return $db;
}

/**
 * Initialize only an EMPTY v2 database. A nonempty unknown schema is never
 * changed or overwritten. BEGIN IMMEDIATE serializes simultaneous first hits.
 */
function v2_initialize_schema(PDO $db): void {
    $db->exec('BEGIN IMMEDIATE');
    try {
        $version = (int)$db->query('PRAGMA user_version')->fetchColumn();
        if ($version === 0) {
            $hasTables = (int)$db->query(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )->fetchColumn();
            if ($hasTables !== 0) {
                throw new RuntimeException('File SQLite đã có dữ liệu hoặc cấu trúc khác; không tự ghi đè.');
            }
            $sql = file_get_contents(__DIR__ . '/schema.sql');
            if (!is_string($sql) || $sql === '') {
                throw new RuntimeException('Không tìm thấy schema SQLite v2.');
            }
            $db->exec($sql);
        } elseif ($version !== 2) {
            throw new RuntimeException('Phiên bản database v2 không tương thích.');
        }
        if ((int)$db->query('PRAGMA user_version')->fetchColumn() !== 2) {
            throw new RuntimeException('Không thể khởi tạo schema SQLite v2.');
        }
        $db->exec('COMMIT');
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->exec('ROLLBACK');
        throw $e;
    }
}

function v2_db(): PDO {
    $path = v2_path();
    if (!is_file($path)) {
        // Exclusive creation prevents clobbering an existing database.
        $created = @fopen($path, 'x');
        if ($created !== false) {
            @chmod($path, 0600);
            fclose($created);
        } elseif (!is_file($path)) {
            throw new RuntimeException('Không thể tạo database SQLite v2.');
        }
    }
    $db = v2_connect($path);
    $version = (int)$db->query('PRAGMA user_version')->fetchColumn();
    if ($version === 0) {
        v2_initialize_schema($db);
    } elseif ($version !== 2) {
        throw new RuntimeException('Phiên bản database v2 không tương thích.');
    }
    return $db;
}

/** Optional CLI helper; web requests do not need to run it. */
function v2_init(): string {
    if (PHP_SAPI !== 'cli') {
        throw new RuntimeException('Chỉ khởi tạo bằng PHP CLI.');
    }
    $path = v2_path();
    if (file_exists($path)) {
        throw new RuntimeException('Database đã tồn tại; không ghi đè.');
    }
    $db = v2_db();
    $db = null;
    return $path;
}

function v2_h(mixed $value): string {
    return htmlspecialchars((string) ($value ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function v2_num(mixed $value, int $minimum = 0): int {
    if (!is_scalar($value) || !preg_match('/^\d+$/D', (string) $value)) {
        throw new DomainException('Số thứ tự phải là số nguyên không âm.');
    }
    $value = (int) $value;
    if ($value < $minimum) {
        throw new DomainException('Số thứ tự nằm ngoài phạm vi cho phép.');
    }
    return $value;
}

function v2_text(array $post, string $key): string {
    return trim((string) ($post[$key] ?? ''));
}

function v2_titles(string $en, string $vi): void {
    if ($en === '' && $vi === '') {
        throw new DomainException('Cần nhập ít nhất một tên tiếng Anh hoặc tiếng Việt.');
    }
}

function v2_save(PDO $db, string $type, array $p): int {
    $id = v2_num($p['id'] ?? '0');
    if ($type === 'parts') {
        $fields = [
            'part_num' => v2_num($p['part_num'] ?? ''),
            'badge' => v2_text($p, 'badge'),
            'title_en' => v2_text($p, 'title_en'),
            'title_vi' => v2_text($p, 'title_vi'),
            'description' => v2_text($p, 'description'),
            'status' => v2_text($p, 'status')
        ];
        v2_titles($fields['title_en'], $fields['title_vi']);
        if (!in_array($fields['status'], ['active', 'coming_soon'], true)) {
            throw new DomainException('Trạng thái Phần không hợp lệ.');
        }
    } elseif ($type === 'arcs') {
        $fields = [
            'part_id' => v2_num($p['part_id'] ?? '', 1),
            'arc_num' => v2_num($p['arc_num'] ?? ''),
            'slug' => v2_text($p, 'slug'),
            'title_en' => v2_text($p, 'title_en'),
            'title_vi' => v2_text($p, 'title_vi'),
            'intro' => v2_text($p, 'intro')
        ];
        v2_titles($fields['title_en'], $fields['title_vi']);
        if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', $fields['slug'])) {
            throw new DomainException('Slug chỉ chứa chữ thường, số và dấu gạch nối.');
        }
    } elseif ($type === 'episodes') {
        $fields = [
            'arc_id' => v2_num($p['arc_id'] ?? '', 1),
            'ep_num' => v2_num($p['ep_num'] ?? ''),
            'title_en' => v2_text($p, 'title_en'),
            'title_vi' => v2_text($p, 'title_vi'),
            'summary' => v2_text($p, 'summary'),
            'intro' => v2_text($p, 'intro')
        ];
        v2_titles($fields['title_en'], $fields['title_vi']);
    } elseif ($type === 'chapters') {
        $episode = v2_num($p['episode_id'] ?? '', 1);
        $title = v2_text($p, 'title');
        // Do not trim story content: whitespace is part of the author's manuscript.
        $body = (string) ($p['content'] ?? '');
        $format = $p['content_format'] ?? 'html';
        $intent = (string) ($p['action'] ?? 'save');
        if (!in_array($format, ['noir_text','html'], true) || !in_array($intent, ['save','save_publish','update_published'], true)) {
            throw new DomainException('Định dạng hoặc thao tác nội dung không hợp lệ.');
        }
        if (strlen($body) > 2_000_000) {
            throw new DomainException('Chương vượt giới hạn 2 MB.');
        }
        // Treat HTML coming from any client as hostile; editor-side cleanup is not a security boundary.
        if ($format === 'html') $body = v2_sanitize_html($body);
        if (strlen($body) > 2_000_000) throw new DomainException('Chương vượt giới hạn 2 MB.');
        if ($intent === 'save_publish' && !v2_text_visible($body, $format)) {
            throw new DomainException('Không thể đăng chương trống.');
        }
        $fields = ['episode_id' => $episode, 'title' => $title, 'content' => $body];
    } else {
        throw new DomainException('Loại dữ liệu không hợp lệ.');
    }

    if ($type !== 'chapters') {
        if ($id > 0) {
            $pairs = implode(', ', array_map(fn($key) => $key . ' = :' . $key, array_keys($fields)));
            $stmt = $db->prepare("UPDATE $type SET $pairs WHERE id = :id");
            $stmt->execute($fields + ['id' => $id]);
            if ($stmt->rowCount() === 0 && !$db->query("SELECT id FROM $type WHERE id = $id")->fetchColumn()) {
                throw new DomainException('Không tìm thấy mục cần sửa.');
            }
            return $id;
        }
        $names = implode(',', array_keys($fields));
        $values = implode(',', array_map(fn($key) => ':' . $key, array_keys($fields)));
        $stmt = $db->prepare("INSERT INTO $type ($names) VALUES ($values)");
        $stmt->execute($fields);
        return (int) $db->lastInsertId();
    }

    $db->beginTransaction();
    try {
        if ($id === 0) {
            $order = $db->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM chapters WHERE episode_id = ?');
            $order->execute([$episode]);
            $stmt = $db->prepare("INSERT INTO chapters(episode_id,sort_order,title,content,content_format)
                VALUES(?,?,?,?,?)");
            $stmt->execute([$episode, (int) $order->fetchColumn(), $title, $body, $format]);
            $id = (int) $db->lastInsertId();
        } else {
            $old = $db->prepare('SELECT episode_id,status,sort_order,revision FROM chapters WHERE id=?');
            $old->execute([$id]);
            $row = $old->fetch();
            if (!$row) {
                throw new DomainException('Không tìm thấy chương.');
            }
            $revision = v2_num($p['revision'] ?? '', 1);
            if ($row['status'] === 'published' && $intent !== 'update_published') {
                throw new DomainException('Chương đã đăng: phải chọn Cập nhật chương đã đăng.');
            }
            if ($row['status'] === 'draft' && !in_array($intent, ['save','save_publish'], true)) {
                throw new DomainException('Chương nháp chỉ có thể được lưu hoặc đăng.');
            }
            if ($row['status'] === 'published' && !v2_text_visible($body, $format)) {
                throw new DomainException('Không được làm rỗng chương đã đăng.');
            }
            $position = (int) $row['sort_order'];
            if ((int) $row['episode_id'] !== $episode) {
                $order = $db->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM chapters WHERE episode_id = ?');
                $order->execute([$episode]);
                $position = (int) $order->fetchColumn();
            }
            $stmt = $db->prepare("UPDATE chapters SET episode_id=?, sort_order=?, title=?, content=?, content_format=?,
                updated_at=datetime('now'), revision=revision+1 WHERE id=? AND revision=?");
            $stmt->execute([$episode,$position,$title,$body,$format,$id,$revision]);
            if ($stmt->rowCount() !== 1) {
                throw new DomainException('Chương đã được chỉnh sửa ở nơi khác. Hãy tải lại trước khi lưu.');
            }
        }
        if ($intent === 'save_publish') {
            // Save + publish in the SAME transaction. A failed publish leaves no half-saved draft.
            $stmt = $db->prepare("UPDATE chapters SET status='published', published_at=datetime('now'),
                updated_at=datetime('now'), revision=revision+1 WHERE id=? AND status='draft'");
            $stmt->execute([$id]);
            if ($stmt->rowCount() !== 1) throw new DomainException('Chương không ở trạng thái nháp.');
        }
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }
    return $id;
}

function v2_publication(PDO $db, int $id, int $revision, string $action): void {
    if (!in_array($action, ['publish','unpublish'], true)) {
        throw new DomainException('Thao tác xuất bản không hợp lệ.');
    }
    $db->beginTransaction();
    try {
        $stmt = $db->prepare('SELECT * FROM chapters WHERE id=?');
        $stmt->execute([$id]);
        $chapter = $stmt->fetch();
        if (!$chapter || (int) $chapter['revision'] !== $revision) {
            throw new DomainException('Chương không tồn tại hoặc đã được chỉnh sửa. Hãy tải lại.');
        }
        if ($action === 'publish') {
            if ($chapter['status'] !== 'draft' || !v2_text_visible((string)$chapter['content'], (string)$chapter['content_format'])) {
                throw new DomainException('Chỉ được đăng chương nháp có nội dung.');
            }
            $stmt = $db->prepare("UPDATE chapters SET status='published', published_at=datetime('now'),
                updated_at=datetime('now'), revision=revision+1 WHERE id=? AND revision=?");
        } else {
            if ($chapter['status'] !== 'published') {
                throw new DomainException('Chương chưa được đăng.');
            }
            $stmt = $db->prepare("UPDATE chapters SET status='draft', published_at=NULL,
                updated_at=datetime('now'), revision=revision+1 WHERE id=? AND revision=?");
        }
        $stmt->execute([$id,$revision]);
        if ($stmt->rowCount() !== 1) {
            throw new DomainException('Xung đột khi cập nhật trạng thái.');
        }
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }
}

function v2_move(PDO $db, string $type, int $id, string $direction): void {
    $config = [
        'parts' => ['part_num', null],
        'arcs' => ['arc_num', 'part_id'],
        'episodes' => ['ep_num', 'arc_id'],
        'chapters' => ['sort_order', 'episode_id']
    ];
    if (!isset($config[$type]) || !in_array($direction, ['up','down'], true)) {
        throw new DomainException('Thao tác sắp xếp không hợp lệ.');
    }
    [$field,$parent] = $config[$type];
    $db->beginTransaction();
    try {
        $stmt = $db->prepare("SELECT * FROM $type WHERE id=?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            throw new DomainException('Không tìm thấy mục cần sắp xếp.');
        }
        $scope = $parent === null ? '1=1' : "$parent = :parent";
        $cmp = $direction === 'up' ? '<' : '>';
        $sort = $direction === 'up' ? 'DESC' : 'ASC';
        $stmt = $db->prepare("SELECT id,$field FROM $type WHERE $scope AND $field $cmp :position ORDER BY $field $sort LIMIT 1");
        $args = ['position' => $row[$field]];
        if ($parent !== null) {
            $args['parent'] = $row[$parent];
        }
        $stmt->execute($args);
        $neighbor = $stmt->fetch();
        if ($neighbor) {
            $stmt = $db->prepare("SELECT COALESCE(MAX($field),0)+1 FROM $type WHERE $scope");
            $stmt->execute($parent === null ? [] : ['parent' => $row[$parent]]);
            $temporary = (int) $stmt->fetchColumn();
            $update = $db->prepare("UPDATE $type SET $field=? WHERE id=?");
            $update->execute([$temporary, $id]);
            $update->execute([$row[$field], $neighbor['id']]);
            $update->execute([$neighbor[$field], $id]);
        }
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }
}

function v2_delete(PDO $db, string $type, int $id): void {
    if (!in_array($type, ['parts','arcs','episodes','chapters'], true)) {
        throw new DomainException('Loại dữ liệu không hợp lệ.');
    }
    if ($type === 'chapters') {
        $stmt = $db->prepare('SELECT status FROM chapters WHERE id=?');
        $stmt->execute([$id]);
        if ($stmt->fetchColumn() === 'published') {
            throw new DomainException('Hủy đăng chương trước khi xóa.');
        }
    }
    $stmt = $db->prepare("DELETE FROM $type WHERE id=?");
    $stmt->execute([$id]);
    if ($stmt->rowCount() !== 1) {
        throw new DomainException('Không tìm thấy mục cần xóa hoặc có dữ liệu con.');
    }
}

function v2_rows(PDO $db, string $type): array {
    return match ($type) {
        'parts' => $db->query('SELECT * FROM parts ORDER BY part_num,id')->fetchAll(),
        'arcs' => $db->query('SELECT a.*,p.part_num,p.badge FROM arcs a JOIN parts p ON p.id=a.part_id ORDER BY p.part_num,a.arc_num,a.id')->fetchAll(),
        'episodes' => $db->query('SELECT e.*,a.arc_num,a.part_id,p.part_num FROM episodes e JOIN arcs a ON a.id=e.arc_id JOIN parts p ON p.id=a.part_id ORDER BY p.part_num,a.arc_num,e.ep_num,e.id')->fetchAll(),
        'chapters' => $db->query("SELECT c.*,e.ep_num,a.arc_num,p.part_num,p.status AS part_status FROM chapters c
            JOIN episodes e ON e.id=c.episode_id JOIN arcs a ON a.id=e.arc_id
            JOIN parts p ON p.id=a.part_id ORDER BY p.part_num,a.arc_num,e.ep_num,c.sort_order,c.id")->fetchAll(),
        default => throw new DomainException('Danh sách không hợp lệ.')
    };
}

function v2_numbered_chapters(PDO $db): array {
    $chapters = v2_rows($db, 'chapters');
    $number = 0;
    foreach ($chapters as &$chapter) {
        // Match public outline: a published chapter in a coming-soon part has no public number.
        $chapter['public_number'] = $chapter['status'] === 'published' && $chapter['part_status'] === 'active'
            ? ++$number : null;
    }
    unset($chapter);
    return $chapters;
}


/**
 * Independent v2 homepage settings; the old oxytocin.db is never consulted.
 * Keep defaults readable on a brand-new, empty site.
 */
function v2_site_settings(PDO $db): array {
    $defaults = [
        'site_title' => 'OXYTOCIN',
        'site_subtitle' => 'Xúc Cảm',
        'site_author' => 'VVD',
        'site_genre' => 'Psychological Thriller',
        'site_status' => 'Đang viết',
        'synopsis' => ''
    ];
    $result = $defaults;
    $stmt = $db->query('SELECT key, value FROM settings');
    foreach ($stmt as $row) {
        if (array_key_exists((string)$row['key'], $result)) {
            $result[$row['key']] = (string)($row['value'] ?? '');
        }
    }
    return $result;
}

function v2_save_site_settings(PDO $db, array $post): void {
    $limits = [
        'site_title' => 120,
        'site_subtitle' => 120,
        'site_author' => 120,
        'site_genre' => 180,
        'site_status' => 120,
        'synopsis' => 40000
    ];
    $values = [];
    foreach ($limits as $key => $limit) {
        if (!array_key_exists($key, $post) || !is_string($post[$key])) {
            throw new DomainException('Thiếu dữ liệu cài đặt trang.');
        }
        $value = trim($post[$key]);
        if (strlen($value) > $limit * 4) {
            throw new DomainException('Trường ' . $key . ' vượt quá giới hạn ký tự.');
        }
        $values[$key] = $value;
    }
    if ($values['site_title'] === '') {
        throw new DomainException('Tiêu đề trang không được để trống.');
    }
    $db->beginTransaction();
    try {
        $stmt = $db->prepare(
            'INSERT INTO settings (key, value) VALUES (?, ?)
             ON CONFLICT(key) DO UPDATE SET value=excluded.value'
        );
        foreach ($values as $key => $value) $stmt->execute([$key,$value]);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
}
