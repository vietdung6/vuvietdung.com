PRAGMA foreign_keys = ON;

CREATE TABLE parts (
  id INTEGER PRIMARY KEY,
  part_num INTEGER NOT NULL UNIQUE CHECK(part_num >= 0),
  badge TEXT NOT NULL DEFAULT '',
  title_en TEXT NOT NULL DEFAULT '',
  title_vi TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','coming_soon'))
);

CREATE TABLE arcs (
  id INTEGER PRIMARY KEY,
  part_id INTEGER NOT NULL REFERENCES parts(id) ON DELETE RESTRICT,
  arc_num INTEGER NOT NULL CHECK(arc_num >= 0),
  slug TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL DEFAULT '',
  title_vi TEXT NOT NULL DEFAULT '',
  intro TEXT NOT NULL DEFAULT '',
  UNIQUE(part_id, arc_num)
);

CREATE TABLE episodes (
  id INTEGER PRIMARY KEY,
  arc_id INTEGER NOT NULL REFERENCES arcs(id) ON DELETE RESTRICT,
  ep_num INTEGER NOT NULL CHECK(ep_num >= 0),
  title_en TEXT NOT NULL DEFAULT '',
  title_vi TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  intro TEXT NOT NULL DEFAULT '',
  UNIQUE(arc_id, ep_num)
);

CREATE TABLE chapters (
  id INTEGER PRIMARY KEY,
  episode_id INTEGER NOT NULL REFERENCES episodes(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL CHECK(sort_order >= 1),
  title TEXT,
  content TEXT NOT NULL DEFAULT '',
  content_format TEXT NOT NULL DEFAULT 'noir_text' CHECK(content_format IN ('noir_text','html')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT,
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1),
  UNIQUE(episode_id,sort_order),
  CHECK(status <> 'published' OR (published_at IS NOT NULL AND length(trim(content)) > 0))
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX chapter_status_order ON chapters(status,episode_id,sort_order);
PRAGMA user_version = 2;
