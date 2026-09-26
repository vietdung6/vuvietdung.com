#!/usr/bin/env bash
set -euo pipefail
site="${1:?Usage: bash tests/oxytocin-v2-archive.sh /path/to/staged-site}"
test -d "$site"

for required in   'oxytocin/.htaccess'   'oxytocin/v2/.htaccess'   'oxytocin/v2/.data/.htaccess'   'oxytocin/v2/index.php'   'oxytocin/v2/admin.php'   'oxytocin/v2/chapter.php'   'oxytocin/v2/episode.php'   'oxytocin/v2/episode-read.php'   'oxytocin/v2/reader.js'   'oxytocin/v2/reader.css'   'oxytocin/index.php'   'oxytocin/read.php'   'index.html'; do
  if [[ ! -f "$site/$required" ]]; then
    echo "FAIL: missing deployment file: $required" >&2
    exit 1
  fi
done

# The deploy archive may contain PUBLIC PHP and templates, but NEVER raw story DBs.
if find "$site/oxytocin" -type f \(   -iname '*.db' -o -iname '*.db-wal' -o -iname '*.db-shm' -o -iname '*.db-journal'   -o -iname '*.sqlite' -o -iname '*.sqlite3' -o -iname '*.sqlite-wal'   -o -iname '*.sqlite3-wal' -o -iname '*.env' -o -iname '.env*' -o -iname 'error_log'   \) -print | grep -q .; then
  echo 'FAIL: archive contains private OXYTOCIN database, env or logs' >&2
  find "$site/oxytocin" -type f \( -iname '*.db' -o -iname '*.db-*' -o -iname '*.sqlite*' -o -iname '.env*' -o -iname 'error_log' \) -print >&2
  exit 1
fi

# Existing URLs must still be present in the archive; v2 is additive.
if [[ -e "$site/oxytocin/oxytocin.db" ]] || [[ -e "$site/oxytocin/v2/.data/oxytocin_v2.db" ]]; then
  echo 'FAIL: legacy SQLite appears in site archive' >&2
  exit 1
fi

echo 'PASS: archive preserves legacy PHP and v2 entrypoints, denies HTTP DB access, includes no story DB/secrets'
