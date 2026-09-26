<?php
$db = new PDO('sqlite:' . __DIR__ . '/oxytocin.db');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->exec("PRAGMA foreign_keys = ON;");

// Bảng cài đặt chung (Giới thiệu, cấu hình)
$db->exec("CREATE TABLE IF NOT EXISTS settings (
    `key` TEXT PRIMARY KEY,
    `value` TEXT
)");

// Bảng Phần lớn (Part: Prologue, Part 1, Part 2...)
$db->exec("CREATE TABLE IF NOT EXISTS parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_num INTEGER NOT NULL,
    badge TEXT NOT NULL,
    title_en TEXT NOT NULL,
    title_vi TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active'
)");

// Bảng Hồi nhỏ (Arc) thuộc Phần
$db->exec("CREATE TABLE IF NOT EXISTS arcs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    arc_code TEXT NOT NULL,
    title_en TEXT NOT NULL,
    title_vi TEXT NOT NULL,
    intro TEXT,
    sort_order INTEGER DEFAULT 1,
    FOREIGN KEY(part_id) REFERENCES parts(id) ON DELETE CASCADE
)");

// Bảng Tập truyện (Episode) thuộc Arc
$db->exec("CREATE TABLE IF NOT EXISTS episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    arc_id INTEGER NOT NULL,
    ep_num INTEGER NOT NULL,
    badge TEXT,
    title_en TEXT NOT NULL,
    title_vi TEXT NOT NULL,
    summary TEXT,
    intro TEXT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(arc_id) REFERENCES arcs(id) ON DELETE CASCADE
)");

// HÀM DÙNG CHUNG CHO TOÀN TRANG: TỰ XUỐNG DÒNG, TỰ ĐỔI MÀU ĐỎ KHÔNG CẦN CSS
if (!function_exists('parse_inline')) {
    function parse_inline($text) {
        $text = htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
        // **in đậm** -> sáng màu
        $text = preg_replace('/\*\*(.+?)\*\*/s', '<strong style="color:var(--text-bright); font-weight:600;">$1</strong>', $text);
        // *chữ này* -> ĐỎ RỰC TRỰC TIẾP TRONG PHP, KHÔNG CẦN CSS
        $text = preg_replace('/\*([^\*]+)\*/s', '<span style="color:#e53935; font-weight:600;">$1</span>', $text);
        return nl2br($text);
    }
}

if (!function_exists('parse_noir')) {
    function parse_noir($text) {
        $text = trim($text);
        if ($text === '') return '';

        $pattern = preg_match('/\R\s*\R/u', $text) ? '/(?:\R\s*){2,}/u' : '/\R+/u';
        $blocks = preg_split($pattern, $text);
        $html = '';

        foreach ($blocks as $b) {
            $clean = trim($b);
            if ($clean === '') continue;

            // 1. Phân cảnh
            if (preg_match('/^[\*\-✦_\.]{3,}$/u', str_replace(' ', '', $clean))) {
                $html .= "<p class='scene-break'>✦ ✦ ✦</p>";
            }
            // 2. Cả câu trong *...* -> Canh giữa + Màu đỏ
            elseif (preg_match('/^\*([^\*]+)\*$/u', $clean, $m)) {
                $html .= "<p style='text-indent:0; text-align:center; color:#e53935; font-weight:600; margin:25px 0;'>" . parse_inline(trim($m[1])) . "</p>";
            }
            // 3. Đúng 1 từ có dấu chấm -> Canh giữa + Màu vàng
            elseif (preg_match('/^[^\s\.]+\.$/u', $clean)) {
                $html .= "<p style='text-indent:0; text-align:center; color:var(--gold); font-weight:600; margin:25px 0;'>" . htmlspecialchars($clean, ENT_QUOTES, 'UTF-8') . "</p>";
            }
            // 4. Đoạn văn thường (tự thụt dòng nếu trong bài đọc, tự xuống dòng nl2br)
            else {
                $html .= "<p>" . parse_inline($clean) . "</p>";
            }
        }
        return $html;
    }
}