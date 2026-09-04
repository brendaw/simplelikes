import Database from "better-sqlite3";
import type { IStorage, BatchEntry, TypeInfo, TypeSlugsResult } from "./types";

export class Sqlite3Storage implements IStorage {
  private db: Database.Database;
  private getCountStmt: Database.Statement<[string, string]>;
  private getTypeCountsStmt: Database.Statement<[string]>;
  private hasVisitorStmt: Database.Statement<[string, string, string]>;
  private insertLikeStmt: Database.Statement<[string, string]>;
  private insertVisitorStmt: Database.Statement<[string, string, string]>;
  private decrementLikeStmt: Database.Statement<[string, string]>;
  private deleteVisitorStmt: Database.Statement<[string, string, string]>;
  private getTypesStmt: Database.Statement<[]>;
  private getTypeSlugsStmt: Database.Statement<[string, number, number]>;
  private getTypeSlugsCountStmt: Database.Statement<[string]>;

  constructor(dbPath: string = "./data/likes.db") {
    this.db = new Database(dbPath);
    this.db.exec(`
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
      CREATE INDEX IF NOT EXISTS idx_likes_visitors_slug_type ON likes_visitors(slug, type);
    `);

    this.getCountStmt = this.db.prepare(
      "SELECT count FROM likes WHERE slug = ? AND type = ?",
    );
    this.getTypeCountsStmt = this.db.prepare(
      "SELECT type, count FROM likes WHERE slug = ?",
    );
    this.hasVisitorStmt = this.db.prepare(
      "SELECT 1 FROM likes_visitors WHERE slug = ? AND type = ? AND visitor_id = ?",
    );
    this.insertLikeStmt = this.db.prepare(
      "INSERT INTO likes (slug, type, count) VALUES (?, ?, 1) ON CONFLICT(slug, type) DO UPDATE SET count = count + 1, updated_at = datetime('now')",
    );
    this.insertVisitorStmt = this.db.prepare(
      "INSERT INTO likes_visitors (slug, type, visitor_id, created_at) VALUES (?, ?, ?, datetime('now'))",
    );
    this.decrementLikeStmt = this.db.prepare(
      "UPDATE likes SET count = count - 1, updated_at = datetime('now') WHERE slug = ? AND type = ? AND count > 0",
    );
    this.deleteVisitorStmt = this.db.prepare(
      "DELETE FROM likes_visitors WHERE slug = ? AND type = ? AND visitor_id = ?",
    );
    this.getTypesStmt = this.db.prepare(
      "SELECT type, COUNT(*) as slug_count, COALESCE(SUM(count), 0) as total_likes FROM likes GROUP BY type ORDER BY type",
    );
    this.getTypeSlugsCountStmt = this.db.prepare(
      "SELECT COUNT(*) as total FROM likes WHERE type = ?",
    );
    this.getTypeSlugsStmt = this.db.prepare(
      "SELECT slug, count FROM likes WHERE type = ? ORDER BY count DESC, slug ASC LIMIT ? OFFSET ?",
    );
  }

  getCount(slug: string, type: string): Promise<number> {
    const row = this.getCountStmt.get(slug, type) as { count: number } | undefined;
    return Promise.resolve(row?.count ?? 0);
  }

  getTypeCounts(slug: string): Promise<Record<string, number>> {
    const rows = this.getTypeCountsStmt.all(slug) as { type: string; count: number }[];
    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.type] = row.count;
    }
    return Promise.resolve(counts);
  }

  hasVisitor(slug: string, visitorId: string, type: string): Promise<boolean> {
    const row = this.hasVisitorStmt.get(slug, type, visitorId);
    return Promise.resolve(row !== undefined);
  }

  async increment(slug: string, visitorId: string, type: string): Promise<void> {
    this.insertLikeStmt.run(slug, type);
    this.insertVisitorStmt.run(slug, type, visitorId);
  }

  async decrement(slug: string, visitorId: string, type: string): Promise<void> {
    this.decrementLikeStmt.run(slug, type);
    this.deleteVisitorStmt.run(slug, type, visitorId);
  }

  batchGet(slugs: string[], type?: string): Promise<BatchEntry[]> {
    const placeholders = slugs.map(() => "?").join(",");

    let query: string;
    let params: unknown[];

    if (type) {
      query = `SELECT slug, count, type FROM likes WHERE slug IN (${placeholders}) AND type = ?`;
      params = [...slugs, type];
    } else {
      query = `SELECT slug, count, type FROM likes WHERE slug IN (${placeholders})`;
      params = slugs;
    }

    const rows = this.db.prepare(query).all(...params) as BatchEntry[];
    return Promise.resolve(rows);
  }

  getTypes(): Promise<TypeInfo[]> {
    const rows = this.getTypesStmt.all() as TypeInfo[];
    return Promise.resolve(rows);
  }

  getTypeSlugs(type: string, limit = 25, offset = 0): Promise<TypeSlugsResult> {
    const totalRow = this.getTypeSlugsCountStmt.get(type) as { total: number } | undefined;
    /* v8 ignore next -- unreachable: a COUNT(*) aggregate always returns exactly one row */
    const total = totalRow?.total ?? 0;
    const rows = this.getTypeSlugsStmt.all(type, limit, offset) as { slug: string; count: number }[];
    return Promise.resolve({ slugs: rows, total });
  }
}
