-- Migration: v1 -> v2 (composite PK with type)
-- See CHANGELOG.md for the full migration guide.
-- Table recreation pattern (only safe approach for D1/SQLite).

-- Clean up from any previous partial run (idempotency)
DROP TABLE IF EXISTS likes_new;
DROP TABLE IF EXISTS likes_visitors_new;

-- ============================================================
-- 1. likes
-- ============================================================
CREATE TABLE IF NOT EXISTS likes_new (
  slug TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'untyped',
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (slug, type)
);

INSERT INTO likes_new (slug, type, count, updated_at)
SELECT slug, 'untyped', count, updated_at FROM likes;

DROP TABLE IF EXISTS likes;
ALTER TABLE likes_new RENAME TO likes;

-- ============================================================
-- 2. likes_visitors
-- ============================================================
CREATE TABLE likes_visitors_new (
  slug TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'untyped',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (slug, visitor_id, type)
);

INSERT INTO likes_visitors_new (slug, visitor_id, type, created_at)
SELECT slug, visitor_id, 'untyped', created_at FROM likes_visitors;

DROP TABLE IF EXISTS likes_visitors;
ALTER TABLE likes_visitors_new RENAME TO likes_visitors;

-- Recreate indexes lost during DROP TABLE
CREATE INDEX IF NOT EXISTS idx_likes_type ON likes(type);
CREATE INDEX IF NOT EXISTS idx_likes_updated ON likes(updated_at);
CREATE INDEX IF NOT EXISTS idx_likes_visitors_slug_type ON likes_visitors(slug, type);
CREATE INDEX IF NOT EXISTS idx_likes_visitors_visitor ON likes_visitors(visitor_id);
