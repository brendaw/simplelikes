import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join } from "path";

const LIKES_JSON = "/tmp/likes-prod.json";
const VISITORS_JSON = "/tmp/likes-visitors-prod.json";
const DB_PATH = join(import.meta.dirname, "..", "prod-v1.db");

interface LikesRow {
  slug: string;
  count: number;
  updated_at: string;
}

interface VisitorsRow {
  slug: string;
  visitor_id: string;
  created_at: string;
}

const likesData = JSON.parse(readFileSync(LIKES_JSON, "utf-8"));
const visitorsData = JSON.parse(readFileSync(VISITORS_JSON, "utf-8"));

const likes: LikesRow[] = likesData[0].results;
const visitors: VisitorsRow[] = visitorsData[0].results;

console.log(`Loaded ${likes.length} likes, ${visitors.length} visitors from prod dump`);

const db = new Database(DB_PATH);

db.exec(`
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
`);

const insertLike = db.prepare(
  "INSERT OR REPLACE INTO likes (slug, count, updated_at) VALUES (?, ?, ?)",
);
const insertVisitor = db.prepare(
  "INSERT OR REPLACE INTO likes_visitors (slug, visitor_id, created_at) VALUES (?, ?, ?)",
);

const tx = db.transaction(() => {
  for (const row of likes) {
    insertLike.run(row.slug, row.count, row.updated_at);
  }
  for (const row of visitors) {
    insertVisitor.run(row.slug, row.visitor_id, row.created_at);
  }
});

tx();

console.log(`Imported ${likes.length} likes, ${visitors.length} visitors to ${DB_PATH}`);

const verifyLikes = db.prepare("SELECT count(*) as count FROM likes").get() as { count: number };
const verifyVisitors = db.prepare("SELECT count(*) as count FROM likes_visitors").get() as { count: number };
console.log(`Verified: ${verifyLikes.count} likes, ${verifyVisitors.count} visitors`);

db.close();
