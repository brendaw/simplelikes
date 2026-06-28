import Database from "better-sqlite3";
import type { IStorage } from "./types";

export class Sqlite3Storage implements IStorage {
  private db: Database.Database;
  private getCountStmt: Database.Statement<[string]>;
  private hasVisitorStmt: Database.Statement<[string, string]>;
  private insertLikeStmt: Database.Statement<[string]>;
  private insertVisitorStmt: Database.Statement<[string, string]>;
  private decrementLikeStmt: Database.Statement<[string]>;
  private deleteVisitorStmt: Database.Statement<[string, string]>;

  constructor(dbPath: string = "./data/likes.db") {
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS likes (
        slug TEXT PRIMARY KEY,
        count INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS likes_visitors (
        slug TEXT,
        visitor_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (slug, visitor_id)
      );
    `);

    this.getCountStmt = this.db.prepare(
      "SELECT count FROM likes WHERE slug = ?",
    );
    this.hasVisitorStmt = this.db.prepare(
      "SELECT 1 FROM likes_visitors WHERE slug = ? AND visitor_id = ?",
    );
    this.insertLikeStmt = this.db.prepare(
      "INSERT INTO likes (slug, count) VALUES (?, 1) ON CONFLICT(slug) DO UPDATE SET count = count + 1, updated_at = datetime('now')",
    );
    this.insertVisitorStmt = this.db.prepare(
      "INSERT INTO likes_visitors (slug, visitor_id, created_at) VALUES (?, ?, datetime('now'))",
    );
    this.decrementLikeStmt = this.db.prepare(
      "UPDATE likes SET count = count - 1, updated_at = datetime('now') WHERE slug = ? AND count > 0",
    );
    this.deleteVisitorStmt = this.db.prepare(
      "DELETE FROM likes_visitors WHERE slug = ? AND visitor_id = ?",
    );
  }

  getCount(slug: string): Promise<number> {
    const row = this.getCountStmt.get(slug) as { count: number } | undefined;
    return Promise.resolve(row?.count ?? 0);
  }

  hasVisitor(slug: string, visitorId: string): Promise<boolean> {
    const row = this.hasVisitorStmt.get(slug, visitorId);
    return Promise.resolve(row !== undefined);
  }

  async increment(slug: string, visitorId: string): Promise<void> {
    this.insertLikeStmt.run(slug);
    this.insertVisitorStmt.run(slug, visitorId);
  }

  async decrement(slug: string, visitorId: string): Promise<void> {
    this.decrementLikeStmt.run(slug);
    this.deleteVisitorStmt.run(slug, visitorId);
  }

  batchGet(slugs: string[]): Promise<Record<string, number>> {
    const placeholders = slugs.map(() => "?").join(",");
    const rows = this.db
      .prepare(`SELECT slug, count FROM likes WHERE slug IN (${placeholders})`)
      .all(...slugs) as { slug: string; count: number }[];

    const result: Record<string, number> = {};
    for (const slug of slugs) {
      result[slug] = 0;
    }
    for (const row of rows) {
      result[row.slug] = row.count;
    }
    return Promise.resolve(result);
  }
}
