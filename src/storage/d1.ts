import type { IStorage, BatchEntry, TypeInfo, TypeSlugsResult } from "./types";

export class D1Storage implements IStorage {
  constructor(private db: D1Database) {}

  async getCount(slug: string, type: string): Promise<number> {
    const row = await this.db.prepare(
      "SELECT count FROM likes WHERE slug = ? AND type = ?",
    )
      .bind(slug, type)
      .first<{ count: number }>();
    return row?.count ?? 0;
  }

  async getTypeCounts(slug: string): Promise<Record<string, number>> {
    const { results } = await this.db.prepare(
      "SELECT type, count FROM likes WHERE slug = ?",
    )
      .bind(slug)
      .all<{ type: string; count: number }>();

    const counts: Record<string, number> = {};
    for (const row of results) {
      counts[row.type] = row.count;
    }
    return counts;
  }

  async hasVisitor(slug: string, visitorId: string, type: string): Promise<boolean> {
    const row = await this.db.prepare(
      "SELECT 1 FROM likes_visitors WHERE slug = ? AND type = ? AND visitor_id = ?",
    )
      .bind(slug, type, visitorId)
      .first();
    return row !== null;
  }

  async increment(slug: string, visitorId: string, type: string): Promise<void> {
    await this.db.batch([
      this.db.prepare(
        "INSERT INTO likes (slug, type, count) VALUES (?, ?, 1) ON CONFLICT(slug, type) DO UPDATE SET count = count + 1, updated_at = datetime('now')",
      ).bind(slug, type),
      this.db.prepare(
        "INSERT INTO likes_visitors (slug, type, visitor_id, created_at) VALUES (?, ?, ?, datetime('now'))",
      ).bind(slug, type, visitorId),
    ]);
  }

  async decrement(slug: string, visitorId: string, type: string): Promise<void> {
    await this.db.batch([
      this.db.prepare(
        "UPDATE likes SET count = count - 1, updated_at = datetime('now') WHERE slug = ? AND type = ? AND count > 0",
      ).bind(slug, type),
      this.db.prepare(
        "DELETE FROM likes_visitors WHERE slug = ? AND type = ? AND visitor_id = ?",
      ).bind(slug, type, visitorId),
    ]);
  }

  async batchGet(slugs: string[], type?: string): Promise<BatchEntry[]> {
    const placeholders = slugs.map(() => "?").join(",");

    let query: string;
    let params: string[];

    if (type) {
      query = `SELECT slug, count, type FROM likes WHERE slug IN (${placeholders}) AND type = ?`;
      params = [...slugs, type];
    } else {
      query = `SELECT slug, count, type FROM likes WHERE slug IN (${placeholders})`;
      params = slugs;
    }

    const { results } = await this.db.prepare(query)
      .bind(...params)
      .all<BatchEntry>();

    return results;
  }

  async getTypes(): Promise<TypeInfo[]> {
    const { results } = await this.db.prepare(
      "SELECT type, COUNT(*) as slug_count, COALESCE(SUM(count), 0) as total_likes FROM likes GROUP BY type ORDER BY type",
    )
      .all<TypeInfo>();

    return results;
  }

  async getTypeSlugs(type: string, limit = 25, offset = 0): Promise<TypeSlugsResult> {
    const totalRow = await this.db.prepare(
      "SELECT COUNT(*) as total FROM likes WHERE type = ?",
    )
      .bind(type)
      .first<{ total: number }>();

    const total = totalRow?.total ?? 0;

    const { results } = await this.db.prepare(
      "SELECT slug, count FROM likes WHERE type = ? ORDER BY count DESC, slug ASC LIMIT ? OFFSET ?",
    )
      .bind(type, limit, offset)
      .all<{ slug: string; count: number }>();

    return { slugs: results, total };
  }
}
