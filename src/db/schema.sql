-- Run this against your D1 database to set up the schema:
--   npx wrangler d1 execute simplelikes --file=src/db/schema.sql
--
-- To migrate existing data from v1.x to v2.0:
--   1. Read CHANGELOG.md → Migration Guide
--   2. Use scripts/migration-v1-to-v2.sql
-- See CHANGELOG for breaking changes.

CREATE TABLE IF NOT EXISTS likes (
  slug TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'untyped',
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (slug, type)
);

CREATE TABLE IF NOT EXISTS likes_visitors (
  slug TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'untyped',
  visitor_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (slug, type, visitor_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_type ON likes(type);
CREATE INDEX IF NOT EXISTS idx_likes_updated ON likes(updated_at);
CREATE INDEX IF NOT EXISTS idx_likes_visitors_slug_type ON likes_visitors(slug, type);
CREATE INDEX IF NOT EXISTS idx_likes_visitors_visitor ON likes_visitors(visitor_id);
