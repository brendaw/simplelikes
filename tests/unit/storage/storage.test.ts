import { describe, it, expect, vi } from "vitest";
import { D1Storage } from "../../../src/storage/d1";
import { Sqlite3Storage } from "../../../src/storage/sqlite";

function mockDB() {
  const stmt = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    all: vi.fn(),
  };
  return {
    prepare: vi.fn().mockReturnValue(stmt),
    batch: vi.fn().mockResolvedValue([]),
    stmt,
  };
}

describe("D1Storage", () => {
  it("getCount returns count for existing slug and type", async () => {
    const db = mockDB();
    db.stmt.first.mockResolvedValue({ count: 42 });
    const storage = new D1Storage(db as any);

    const count = await storage.getCount("hello", "artigos");

    expect(count).toBe(42);
    expect(db.prepare).toHaveBeenCalledWith(
      "SELECT count FROM likes WHERE slug = ? AND type = ?",
    );
    expect(db.stmt.bind).toHaveBeenCalledWith("hello", "artigos");
  });

  it("getCount returns 0 for missing slug and type", async () => {
    const db = mockDB();
    db.stmt.first.mockResolvedValue(null);
    const storage = new D1Storage(db as any);

    const count = await storage.getCount("unknown", "artigos");

    expect(count).toBe(0);
  });

  it("getTypeCounts returns all types for a slug", async () => {
    const db = mockDB();
    db.stmt.all.mockResolvedValue({
      results: [
        { type: "artigos", count: 3 },
        { type: "notas", count: 7 },
      ],
    });
    const storage = new D1Storage(db as any);

    const result = await storage.getTypeCounts("slug");

    expect(result).toEqual({ artigos: 3, notas: 7 });
    expect(db.prepare).toHaveBeenCalledWith(
      "SELECT type, count FROM likes WHERE slug = ?",
    );
  });

  it("getTypeCounts returns empty object for missing slug", async () => {
    const db = mockDB();
    db.stmt.all.mockResolvedValue({ results: [] });
    const storage = new D1Storage(db as any);

    const result = await storage.getTypeCounts("unknown");

    expect(result).toEqual({});
  });

  it("hasVisitor returns true when visitor exists with type", async () => {
    const db = mockDB();
    db.stmt.first.mockResolvedValue({ "1": 1 });
    const storage = new D1Storage(db as any);

    const result = await storage.hasVisitor("slug", "visitor-1", "artigos");

    expect(result).toBe(true);
    expect(db.prepare).toHaveBeenCalledWith(
      "SELECT 1 FROM likes_visitors WHERE slug = ? AND type = ? AND visitor_id = ?",
    );
  });

  it("hasVisitor returns false when visitor does not exist", async () => {
    const db = mockDB();
    db.stmt.first.mockResolvedValue(null);
    const storage = new D1Storage(db as any);

    const result = await storage.hasVisitor("slug", "visitor-1", "artigos");

    expect(result).toBe(false);
  });

  it("decrement updates count and deletes visitor with type", async () => {
    const db = mockDB();
    db.batch.mockResolvedValue([]);
    const storage = new D1Storage(db as any);

    await storage.decrement("slug", "visitor-1", "artigos");

    expect(db.batch).toHaveBeenCalledOnce();
    const calls = (db.prepare as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.some((c: string[]) => c[0].includes("slug = ? AND type = ?"))).toBe(true);
  });

  it("increment calls batch with type in statements", async () => {
    const db = mockDB();
    db.batch.mockResolvedValue([]);
    const storage = new D1Storage(db as any);

    await storage.increment("slug", "visitor-1", "artigos");

    expect(db.prepare).toHaveBeenCalledTimes(2);
    expect(db.batch).toHaveBeenCalledOnce();
  });

  it("batchGet without type returns all entries", async () => {
    const db = mockDB();
    db.stmt.all.mockResolvedValue({
      results: [
        { slug: "a", count: 3, type: "artigos" },
        { slug: "b", count: 7, type: "notas" },
      ],
    });
    const storage = new D1Storage(db as any);

    const result = await storage.batchGet(["a", "b"]);

    expect(result).toEqual([
      { slug: "a", count: 3, type: "artigos" },
      { slug: "b", count: 7, type: "notas" },
    ]);
  });

  it("batchGet with type filters by type", async () => {
    const db = mockDB();
    db.stmt.all.mockResolvedValue({ results: [] });
    const storage = new D1Storage(db as any);

    await storage.batchGet(["a", "b"], "artigos");

    const calls = (db.prepare as ReturnType<typeof vi.fn>).mock.calls;
    const query = calls[0][0] as string;
    expect(query).toContain("AND type = ?");
  });

  it("getTypes returns grouped type data", async () => {
    const db = mockDB();
    db.stmt.all.mockResolvedValue({
      results: [
        { type: "artigos", slug_count: 3, total_likes: 42 },
        { type: "notas", slug_count: 1, total_likes: 7 },
      ],
    });
    const storage = new D1Storage(db as any);

    const result = await storage.getTypes();

    expect(result).toEqual([
      { type: "artigos", slug_count: 3, total_likes: 42 },
      { type: "notas", slug_count: 1, total_likes: 7 },
    ]);
  });

  it("getTypeSlugs returns slugs with pagination", async () => {
    const db = mockDB();
    db.stmt.first.mockResolvedValue({ total: 5 });
    db.stmt.all.mockResolvedValue({
      results: [
        { slug: "b", count: 7 },
        { slug: "a", count: 3 },
      ],
    });
    const storage = new D1Storage(db as any);

    const result = await storage.getTypeSlugs("artigos", 10, 0);

    expect(result.total).toBe(5);
    expect(result.slugs).toHaveLength(2);
    expect(result.slugs[0].slug).toBe("b");
  });

  it("getTypeSlugs defaults total to 0 when count row is missing", async () => {
    const db = mockDB();
    db.stmt.first.mockResolvedValue(null);
    db.stmt.all.mockResolvedValue({ results: [] });
    const storage = new D1Storage(db as any);

    const result = await storage.getTypeSlugs("empty-type", 10, 0);

    expect(result.total).toBe(0);
    expect(result.slugs).toHaveLength(0);
  });
});

describe("Sqlite3Storage", () => {
  const storage = new Sqlite3Storage(":memory:");

  it("getCount returns 0 for missing slug and type", async () => {
    expect(await storage.getCount("nonexistent", "artigos")).toBe(0);
  });

  it("getCount returns count for existing slug and type", async () => {
    await storage.increment("hello", "visitor-1", "artigos");
    expect(await storage.getCount("hello", "artigos")).toBe(1);
    expect(await storage.getCount("hello", "notas")).toBe(0);
  });

  it("getTypeCounts returns all types for a slug", async () => {
    await storage.increment("multi", "v1", "artigos");
    await storage.increment("multi", "v2", "notas");
    const counts = await storage.getTypeCounts("multi");
    expect(counts).toEqual({ artigos: 1, notas: 1 });
  });

  it("increment stores type and visitor", async () => {
    await storage.increment("slug2", "v-99", "artigos");
    expect(await storage.getCount("slug2", "artigos")).toBe(1);
    expect(await storage.hasVisitor("slug2", "v-99", "artigos")).toBe(true);
  });

  it("hasVisitor returns false for missing type", async () => {
    await storage.increment("slug3", "v1", "artigos");
    expect(await storage.hasVisitor("slug3", "v1", "notas")).toBe(false);
  });

  it("decrement removes visitor and decreases count", async () => {
    await storage.increment("dec-test", "v1", "artigos");
    await storage.decrement("dec-test", "v1", "artigos");
    expect(await storage.getCount("dec-test", "artigos")).toBe(0);
    expect(await storage.hasVisitor("dec-test", "v1", "artigos")).toBe(false);
  });

  it("decrement does not go below 0", async () => {
    await storage.decrement("neg-test", "v1", "artigos");
    expect(await storage.getCount("neg-test", "artigos")).toBe(0);
  });

  it("batchGet returns entries with type", async () => {
    await storage.increment("x", "v1", "artigos");
    await storage.increment("y", "v1", "notas");
    const result = await storage.batchGet(["x", "y", "z"]);
    expect(result).toEqual([
      { slug: "x", count: 1, type: "artigos" },
      { slug: "y", count: 1, type: "notas" },
    ]);
  });

  it("batchGet with type filters results", async () => {
    await storage.increment("f1", "v1", "artigos");
    await storage.increment("f2", "v1", "notas");
    const result = await storage.batchGet(["f1", "f2"], "artigos");
    expect(result).toEqual([
      { slug: "f1", count: 1, type: "artigos" },
    ]);
  });

  describe("isolated queries", () => {
    it("getTypes returns aggregated type data", async () => {
      const fresh = new Sqlite3Storage(":memory:");
      await fresh.increment("t1", "v1", "artigos");
      await fresh.increment("t2", "v1", "artigos");
      await fresh.increment("t3", "v1", "notas");
      const types = await fresh.getTypes();
      expect(types).toEqual([
        { type: "artigos", slug_count: 2, total_likes: 2 },
        { type: "notas", slug_count: 1, total_likes: 1 },
      ]);
    });

    it("getTypeSlugs returns paginated slugs", async () => {
      const fresh = new Sqlite3Storage(":memory:");
      await fresh.increment("p1", "v1", "artigos");
      await fresh.increment("p2", "v1", "artigos");
      const result = await fresh.getTypeSlugs("artigos", 10, 0);
      expect(result.total).toBe(2);
      expect(result.slugs).toHaveLength(2);
    });
  });

  it("reuses same database file across calls", async () => {
    const s2 = new Sqlite3Storage(":memory:");
    await s2.increment("shared", "v1", "artigos");
    expect(await s2.getCount("shared", "artigos")).toBe(1);
  });
});
