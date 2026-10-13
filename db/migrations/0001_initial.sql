-- Chunhyang Pansori Institute D1 schema v1
-- Run on a NEW D1 database; all tables share one database.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('community','business')),
  board_type TEXT NOT NULL DEFAULT 'list' CHECK (board_type IN ('list','gallery','resources')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_public INTEGER NOT NULL DEFAULT 1 CHECK (is_public IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
  content TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL DEFAULT '춘향관리자',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0,1)),
  cover_key TEXT,
  external_url TEXT,
  event_date TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS post_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  byte_size INTEGER NOT NULL DEFAULT 0 CHECK (byte_size >= 0),
  kind TEXT NOT NULL DEFAULT 'attachment' CHECK (kind IN ('image','attachment','video')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posts_board_status_date ON posts(board_id,status,is_pinned DESC,published_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_posts_status_date ON posts(status,published_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_post ON post_files(post_id,sort_order);

INSERT OR IGNORE INTO boards (slug,title,section,board_type,sort_order) VALUES
('notices','공지사항','community','list',10),
('press','언론보도','community','list',20),
('newsletters','소식지','community','list',30),
('gallery','갤러리','community','gallery',40),
('resources','자료실','community','resources',50),
('history','판소리 역사발굴','business','list',60),
('research','판소리 이론사업','business','resources',70),
('performances','연희사업','business','gallery',80),
('partnerships','대외협력사업','business','list',90);
