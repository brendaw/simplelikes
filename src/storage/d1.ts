import type { IStorage } from "./types";

interface LikeRow {
  count: number;
}

export class D1Storage implements IStorage {
  constructor(private db: D1Database) {}

  async getCount(slug: string): Promise<number> {
    const row = await this.db.prepare("SELECT count FROM likes WHERE slug = ?")
      .bind(slug)
      .first<LikeRow>();
    return row?.count ?? 0;
  }

  async hasVisitor(slug: string, visitorId: string): Promise<boolean> {
    const row = await this.db.prepare(
      "SELECT 1 FROM likes_visitors WHERE slug = ? AND visitor_id = ?",
    )
      .bind(slug, visitorId)
      .first();
    return row !== null;
  }

  async increment(slug: string, visitorId: string): Promise<void> {
    await this.db.batch([
      this.db.prepare(
        "INSERT INTO likes (slug, count) VALUES (?, 1) ON CONFLICT(slug) DO UPDATE SET count = count + 1",
      ).bind(slug),
      this.db.prepare(
        "INSERT INTO likes_visitors (slug, visitor_id, created_at) VALUES (?, ?, datetime('now'))",
      ).bind(slug, visitorId),
    ]);
  }

  async decrement(slug: string, visitorId: string): Promise<void> {
    await this.db.batch([
      this.db.prepare("UPDATE likes SET count = count - 1 WHERE slug = ? AND count > 0").bind(slug),
      this.db.prepare("DELETE FROM likes_visitors WHERE slug = ? AND visitor_id = ?").bind(slug, visitorId),
    ]);
  }

  async batchGet(slugs: string[]): Promise<Record<string, number>> {
    const placeholders = slugs.map(() => "?");
    const { results } = await this.db.prepare(
      `SELECT slug, count FROM likes WHERE slug IN (${placeholders.join(",")})`,
    )
      .bind(...slugs)
      .all<{ slug: string; count: number }>();

    const result: Record<string, number> = {};
    for (const slug of slugs) {
      result[slug] = 0;
    }
    for (const row of results) {
      result[row.slug] = row.count;
    }
    return result;
  }
}
