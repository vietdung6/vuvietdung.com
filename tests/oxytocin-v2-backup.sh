#!/usr/bin/env bash
set -euo pipefail
workspace="$(mktemp -d)"
trap 'rm -rf "$workspace"' EXIT

mkdir -p "$workspace/public_html/oxytocin/v2" "$workspace/backup-private"
cp oxytocin/v2/backup-legacy.php "$workspace/public_html/oxytocin/v2/backup-legacy.php"
original="$workspace/public_html/oxytocin/oxytocin.db"

php -r '
  $db = new SQLite3($argv[1]);
  $db->exec("CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);
    CREATE TABLE parts(id INTEGER PRIMARY KEY,part_num INTEGER);
    CREATE TABLE arcs(id INTEGER PRIMARY KEY,part_id INTEGER REFERENCES parts(id));
    CREATE TABLE episodes(id INTEGER PRIMARY KEY,arc_id INTEGER REFERENCES arcs(id),content TEXT);
    INSERT INTO settings(key,value) VALUES(\"synopsis\",\"TEST\");
    INSERT INTO parts(id,part_num) VALUES(1,0);
    INSERT INTO arcs(id,part_id) VALUES(1,1);
    INSERT INTO episodes(id,arc_id,content) VALUES(1,1,\"NEVER_UPLOAD_FIXTURE\");");
  $db->close();
' "$original"
before="$(sha256sum "$original" | awk '{print $1}')"

# A backup path inside the document root must always be rejected.
if OXYTOCIN_LEGACY_BACKUP_DIR="$workspace/public_html" php "$workspace/public_html/oxytocin/v2/backup-legacy.php" >"$workspace/denied.log" 2>&1; then
  echo 'FAIL: accepted backup directory under document root' >&2
  exit 1
fi
test "$(find "$workspace/public_html" -name 'oxytocin-legacy-*.db' | wc -l)" -eq 0

OXYTOCIN_LEGACY_BACKUP_DIR="$workspace/backup-private" php "$workspace/public_html/oxytocin/v2/backup-legacy.php" >"$workspace/backup.log"
backed="$(find "$workspace/backup-private" -name 'oxytocin-legacy-*.db' -type f -print -quit)"
test -n "$backed"
test "$(find "$workspace/backup-private" -name 'oxytocin-legacy-*.db' | wc -l)" -eq 1
after="$(sha256sum "$original" | awk '{print $1}')"
test "$before" = "$after"
php -r '
  $db = new SQLite3($argv[1], SQLITE3_OPEN_READONLY);
  if ($db->querySingle("PRAGMA integrity_check") !== "ok") exit(1);
  if ($db->querySingle("SELECT content FROM episodes WHERE id=1") !== "NEVER_UPLOAD_FIXTURE") exit(2);
  $db->close();
' "$backed"
test "$(stat -c %a "$backed")" = '600'

echo 'PASS: consistent SQLite backup, private destination, original unchanged, permissions 0600'
