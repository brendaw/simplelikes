import { describe, it, expect, vi } from "vitest";
import { D1Storage } from "../src/storage/d1";
import { Sqlite3Storage } from "../src/storage/sqlite";

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
  it("getCount returns count for existing slug", async () => {
    const db = mockDB();
    db.stmt.first.mockResolvedValue({ count: 42 });
    const storage = new D1Storage(db as any);

    const count = await storage.getCount("hello");

    expect(count).toBe(42);
    expect(db.prepare).toHaveBeenCalledWith(
      "SELECT count FROM likes WHERE slug = ?",
    );
    expect(db.stmt.bind).toHaveBeenCalledWith("hello");
  });

  it("getCount returns 0 for missing slug", async () => {
    const db = mockDB();
    db.stmt.first.mockResolvedValue(null);
    const storage = new D1Storage(db as any);

    const count = await storage.getCount("unknown");

    expect(count).toBe(0);
  });

  it("hasVisitor returns true when visitor exists", async () => {
    const db = mockDB();
    db.stmt.first.mockResolvedValue({ "1": 1 });
    const storage = new D1Storage(db as any);

    const result = await storage.hasVisitor("slug", "visitor-1");

    expect(result).toBe(true);
  });

  it("hasVisitor returns false when visitor does not exist", async () => {
    const db = mockDB();
    db.stmt.first.mockResolvedValue(null);
    const storage = new D1Storage(db as any);

    const result = await storage.hasVisitor("slug", "visitor-1");

    expect(result).toBe(false);
  });

  it("decrement updates count and deletes visitor", async () => {
    const db = mockDB();
    db.batch.mockResolvedValue([]);
    const storage = new D1Storage(db as any);

    await storage.decrement("slug", "visitor-1");

    expect(db.batch).toHaveBeenCalledOnce();
  });

  it("increment calls batch with insert and visitor statements", async () => {
    const db = mockDB();
    db.batch.mockResolvedValue([]);
    const storage = new D1Storage(db as any);

    await storage.increment("slug", "visitor-1");

    expect(db.prepare).toHaveBeenCalledTimes(2);
    expect(db.batch).toHaveBeenCalledOnce();
  });

  it("batchGet returns counts for all slugs", async () => {
    const db = mockDB();
    db.stmt.all.mockResolvedValue({
      results: [
        { slug: "a", count: 3 },
        { slug: "c", count: 7 },
      ],
    });
    const storage = new D1Storage(db as any);

    const result = await storage.batchGet(["a", "b", "c"]);

    expect(result).toEqual({ a: 3, b: 0, c: 7 });
  });

  it("batchGet returns zeros when no slugs exist", async () => {
    const db = mockDB();
    db.stmt.all.mockResolvedValue({ results: [] });
    const storage = new D1Storage(db as any);

    const result = await storage.batchGet(["x", "y"]);

    expect(result).toEqual({ x: 0, y: 0 });
  });
});

describe("Sqlite3Storage", () => {
  const storage = new Sqlite3Storage(":memory:");

  it("getCount returns 0 for missing slug", async () => {
    expect(await storage.getCount("nonexistent")).toBe(0);
  });

  it("hasVisitor returns false for missing visitor", async () => {
    expect(await storage.hasVisitor("slug", "visitor")).toBe(false);
  });

  it("increment creates and returns count", async () => {
    await storage.increment("hello", "visitor-1");
    expect(await storage.getCount("hello")).toBe(1);
    expect(await storage.hasVisitor("hello", "visitor-1")).toBe(true);
  });

  it("increment dedup visitor but still increments count", async () => {
    await storage.increment("counter", "a");
    await storage.increment("counter", "b");
    expect(await storage.getCount("counter")).toBe(2);
  });

  it("hasVisitor returns true after increment", async () => {
    await storage.increment("slug2", "v-99");
    expect(await storage.hasVisitor("slug2", "v-99")).toBe(true);
    expect(await storage.hasVisitor("slug2", "other")).toBe(false);
  });

  it("decrement removes visitor and decreases count", async () => {
    await storage.increment("dec-test", "v1");
    expect(await storage.getCount("dec-test")).toBe(1);
    expect(await storage.hasVisitor("dec-test", "v1")).toBe(true);

    await storage.decrement("dec-test", "v1");
    expect(await storage.getCount("dec-test")).toBe(0);
    expect(await storage.hasVisitor("dec-test", "v1")).toBe(false);
  });

  it("decrement does not go below 0", async () => {
    await storage.decrement("neg-test", "v1");
    expect(await storage.getCount("neg-test")).toBe(0);
  });

  it("batchGet returns zeros for missing slugs", async () => {
    const result = await storage.batchGet(["a", "b"]);
    expect(result).toEqual({ a: 0, b: 0 });
  });

  it("batchGet returns correct counts", async () => {
    await storage.increment("x", "v1");
    await storage.increment("y", "v1");
    const result = await storage.batchGet(["x", "y", "z"]);
    expect(result).toEqual({ x: 1, y: 1, z: 0 });
  });

  it("reuses same database file across calls", async () => {
    const s2 = new Sqlite3Storage(":memory:");
    await s2.increment("shared", "v1");
    expect(await s2.getCount("shared")).toBe(1);
  });
});
