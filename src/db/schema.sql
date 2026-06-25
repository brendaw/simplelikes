-- Run this against your D1 database to set up the schema:
--   npx wrangler d1 execute simplelikes --file=src/db/schema.sql

CREATE TABLE IF NOT EXISTS likes (
  slug TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS likes_visitors (
  slug TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (slug, visitor_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_visitors_slug ON likes_visitors(slug);
CREATE INDEX IF NOT EXISTS idx_likes_visitors_visitor ON likes_visitors(visitor_id);
