#!/usr/bin/env bash
set -euo pipefail
test_dir="$(mktemp -d)"
server_pid=""
cleanup() {
  if [[ -n "$server_pid" ]]; then kill "$server_pid" 2>/dev/null || true; fi
  rm -rf "$test_dir"
}
trap cleanup EXIT

export OXYTOCIN_V2_DB_PATH="$test_dir/oxytocin_v2.db"
test ! -e "$OXYTOCIN_V2_DB_PATH"
php -S 127.0.0.1:18176 -t . >"$test_dir/server.log" 2>&1 &
server_pid="$!"
base="http://127.0.0.1:18176/oxytocin/v2"
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf "$base/index.php" -o "$test_dir/index.html"; then break; fi
  sleep 1
done
test -s "$test_dir/index.html"
grep -q 'Chưa có chương nào được xuất bản' "$test_dir/index.html"
test -f "$OXYTOCIN_V2_DB_PATH"
php -r '
  $db = new PDO("sqlite:" . getenv("OXYTOCIN_V2_DB_PATH"));
  if ((int)$db->query("PRAGMA user_version")->fetchColumn() !== 2) exit(1);
  if ((int)$db->query("SELECT COUNT(*) FROM chapters")->fetchColumn() !== 0) exit(2);
'
php tests/oxytocin-v2-reader-fixture.php >/dev/null
curl -fsS "$base/index.php" >"$test_dir/index.html"

curl -fsS "$base/part.php?id=1" >"$test_dir/part.html"
curl -fsS "$base/arc.php?id=1" >"$test_dir/arc.html"
curl -fsS "$base/episode.php?id=1" >"$test_dir/episode.html"
curl -fsS "$base/chapter.php?id=1" >"$test_dir/chapter1.html"
curl -fsS "$base/chapter.php?id=3" >"$test_dir/chapter3.html"
curl -fsS "$base/episode-read.php?id=1" >"$test_dir/full.html"
curl -fsS "$base/chapter.php?id=4" >"$test_dir/chapter4.html"

grep -q 'class="arc-card v2-part-card" href="part.php?id=1"' "$test_dir/index.html"
grep -q 'id="toc-title">Mục lục</h2>' "$test_dir/index.html"
! grep -q '<details' "$test_dir/index.html"
! grep -q 'Trang riêng của phần' "$test_dir/index.html"
! grep -q 'chapter.php?id=' "$test_dir/index.html"
grep -q 'href="arc.php?id=1"' "$test_dir/part.html"
grep -q 'class="episode-card" href="episode.php?id=1"' "$test_dir/part.html"
grep -q 'Tập 0' "$test_dir/part.html"
grep -q 'Chương 1' "$test_dir/episode.html"
grep -q 'Chương 2' "$test_dir/episode.html"
grep -q 'Chương 3' "$test_dir/chapter4.html"
# Icons are allowed only inside the reading toolbar, not the contents or headers.
for reader in "$test_dir/index.html" "$test_dir/part.html" "$test_dir/arc.html" "$test_dir/episode.html"; do
  ! grep -q '<svg' "$reader"
done
for reader in "$test_dir/chapter1.html" "$test_dir/full.html"; do
  grep -q 'id="readerTheme"' "$reader"
  grep -q 'id="readerFont"' "$reader"
  grep -q 'id="readerFullscreen"' "$reader"
  test "$(grep -o '<svg' "$reader" | wc -l)" -eq 6
done
grep -q 'Đọc toàn bộ tập' "$test_dir/episode.html"
grep -q 'episode-read.php?id=1' "$test_dir/episode.html"
grep -q 'chapter.php?id=1' "$test_dir/episode.html"
grep -q 'chapter.php?id=3' "$test_dir/episode.html"
grep -q 'PUBLIC_ONE_UNIQUE' "$test_dir/chapter1.html"
grep -q 'PUBLIC_TWO_UNIQUE' "$test_dir/chapter3.html"
grep -q 'PUBLIC_ONE_UNIQUE' "$test_dir/full.html"
grep -q 'PUBLIC_TWO_UNIQUE' "$test_dir/full.html"
! grep -q 'PUBLIC_THREE_UNIQUE' "$test_dir/full.html"
grep -q 'rel="next" href="chapter.php?id=3"' "$test_dir/chapter1.html"
grep -q 'rel="prev" href="chapter.php?id=1"' "$test_dir/chapter3.html"
grep -q 'rel="next" href="chapter.php?id=4"' "$test_dir/chapter3.html"
grep -q 'data-reader-mode="episode"' "$test_dir/full.html"
grep -q 'id="continueReading"' "$test_dir/full.html"

# All public routes, including the entire-episode view, must not leak unpublished text.
for path in "$test_dir"/*.html; do
  if grep -q 'SECRET_DRAFT_SHOULD_NOT_LEAK\|SECRET_HIDDEN_SHOULD_NOT_LEAK\|CHAPTER_DRAFT_TITLE' "$path"; then
    echo "PRIVATE DATA LEAK: $path" >&2; exit 1
  fi
done

expect_code() {
  local desired="$1" endpoint="$2"
  local received
  received="$(curl -sS -o "$test_dir/error.html" -w '%{http_code}' "$base/$endpoint")"
  if [[ "$received" != "$desired" ]]; then
    echo "Expected HTTP $desired for $endpoint, got $received" >&2
    cat "$test_dir/error.html" >&2
    exit 1
  fi
}
expect_code 404 'chapter.php?id=2'
expect_code 404 'chapter.php?id=5'
expect_code 404 'episode.php?id=3'
expect_code 404 'episode-read.php?id=3'
expect_code 404 'part.php?id=2'
expect_code 404 'arc.php?id=2'
expect_code 404 'chapter.php?id=0'
expect_code 404 'chapter.php?id=999999999999999999999'
expect_code 403 'preview.php'
echo 'PASS: original Part-to-page navigation, toolbar-only icons, fullscreen control, chapter/full-episode rendering, cross-episode navigation, privacy and HTTP access'
