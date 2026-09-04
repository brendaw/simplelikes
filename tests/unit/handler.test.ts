import { describe, it, expect, vi, beforeEach } from "vitest";

function createMockCache() {
  return {
    default: {
      match: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
    },
  };
}

function createMockStmt() {
  return {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    all: vi.fn(),
  };
}

function createHandler() {
  return import("../../src/index").then((m) => m.default);
}

describe("handler", () => {
  beforeEach(() => {
    vi.stubGlobal("caches", createMockCache());
    vi.resetModules();
  });

  describe("GET /likes/:slug (no type)", () => {
    it("returns types grouped for existing slug", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();
      stmt.all.mockResolvedValue({
        results: [{ type: "artigos", count: 42 }],
      });

      const req = new Request("http://localhost/likes/hello");
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      const res = await handler.fetch(req, env);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toMatchObject({ slug: "hello", types: { artigos: 42 } });
    });

    it("returns empty types for missing slug", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();
      stmt.all.mockResolvedValue({ results: [] });

      const req = new Request("http://localhost/likes/unknown");
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      const res = await handler.fetch(req, env);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toMatchObject({ slug: "unknown", types: {} });
    });
  });

  describe("GET /likes/:slug?type=", () => {
    it("returns count for specific type", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();
      stmt.first.mockResolvedValue({ count: 7 });

      const req = new Request("http://localhost/likes/hello?type=notas");
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      const res = await handler.fetch(req, env);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toMatchObject({ slug: "hello", count: 7, type: "notas" });
    });

    it("returns 0 for missing type", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();
      stmt.first.mockResolvedValue(null);

      const req = new Request("http://localhost/likes/hello?type=notas");
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      const res = await handler.fetch(req, env);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toMatchObject({ slug: "hello", count: 0, type: "notas" });
    });

    it("returns 400 for empty type param", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();

      const req = new Request("http://localhost/likes/hello?type=");
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      const res = await handler.fetch(req, env);
      expect(res.status).toBe(400);
    });

    it("returns 400 for reserved type 'untyped'", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();

      const req = new Request("http://localhost/likes/hello?type=untyped");
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      const res = await handler.fetch(req, env);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /likes/:slug", () => {
    it("increments and returns new count with untyped default", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();
      stmt.first
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ count: 1 });

      const req = new Request("http://localhost/likes/hello", {
        method: "POST",
        headers: { "X-Visitor-Id": "visitor-1" },
        body: JSON.stringify({}),
      });
      const env = {
        DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn().mockResolvedValue([]) } as any,
      };

      const res = await handler.fetch(req, env);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toMatchObject({ slug: "hello", count: 1, liked: true, type: "untyped" });
    });

    it("increments with custom type", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();
      stmt.first
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ count: 1 });

      const req = new Request("http://localhost/likes/hello", {
        method: "POST",
        headers: { "X-Visitor-Id": "visitor-1", "Content-Type": "application/json" },
        body: JSON.stringify({ type: "artigos" }),
      });
      const env = {
        DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn().mockResolvedValue([]) } as any,
      };

      const res = await handler.fetch(req, env);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toMatchObject({ slug: "hello", count: 1, liked: true, type: "artigos" });
    });

    it("toggles unlike for existing visitor", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();
      stmt.first
        .mockResolvedValueOnce({ "1": 1 })
        .mockResolvedValueOnce(null);

      const req = new Request("http://localhost/likes/hello", {
        method: "POST",
        headers: { "X-Visitor-Id": "visitor-1" },
        body: JSON.stringify({ type: "artigos" }),
      });
      const env = {
        DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn().mockResolvedValue([]) } as any,
      };

      const res = await handler.fetch(req, env);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toMatchObject({ slug: "hello", count: 0, liked: false, type: "artigos" });
    });

    it("missing X-Visitor-Id returns 400", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();

      const req = new Request("http://localhost/likes/hello", {
        method: "POST",
      });
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      const res = await handler.fetch(req, env);
      const body = await res.text();

      expect(res.status).toBe(400);
      expect(body).toContain("X-Visitor-Id");
    });

    it("returns 400 for invalid type", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();

      const req = new Request("http://localhost/likes/hello", {
        method: "POST",
        headers: { "X-Visitor-Id": "visitor-1" },
        body: JSON.stringify({ type: "" }),
      });
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      const res = await handler.fetch(req, env);
      expect(res.status).toBe(400);
    });

    it("returns 400 for reserved type", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();

      const req = new Request("http://localhost/likes/hello", {
        method: "POST",
        headers: { "X-Visitor-Id": "visitor-1" },
        body: JSON.stringify({ type: "untyped" }),
      });
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      const res = await handler.fetch(req, env);
      expect(res.status).toBe(400);
    });

    it("invalid JSON body falls back to untyped type", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();
      stmt.first
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ count: 1 });

      const req = new Request("http://localhost/likes/hello", {
        method: "POST",
        headers: { "X-Visitor-Id": "visitor-1" },
        body: "not json",
      });
      const env = {
        DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn().mockResolvedValue([]) } as any,
      };

      const res = await handler.fetch(req, env);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toMatchObject({ type: "untyped" });
    });

    it("falls back to count 1 when storage reports 0 after increment", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();
      stmt.first
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ count: 0 });

      const req = new Request("http://localhost/likes/hello", {
        method: "POST",
        headers: { "X-Visitor-Id": "visitor-1" },
        body: JSON.stringify({}),
      });
      const env = {
        DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn().mockResolvedValue([]) } as any,
      };

      const res = await handler.fetch(req, env);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toMatchObject({ count: 1, liked: true });
    });
  });

  describe("POST /likes/batch", () => {
    it("returns counts grouped by type", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();
      stmt.all.mockResolvedValue({
        results: [
          { slug: "a", count: 3, type: "artigos" },
          { slug: "b", count: 7, type: "notas" },
        ],
      });

      const req = new Request("http://localhost/likes/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: ["a", "b"] }),
      });
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      const res = await handler.fetch(req, env);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.types.artigos.a).toBe(3);
      expect(body.types.notas.b).toBe(7);
    });

    it("filters by type when provided", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();
      stmt.all.mockResolvedValue({
        results: [
          { slug: "a", count: 3, type: "artigos" },
        ],
      });

      const req = new Request("http://localhost/likes/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: ["a", "b"], type: "artigos" }),
      });
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      const res = await handler.fetch(req, env);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.types.artigos.a).toBe(3);
      expect(body.types.artigos.b).toBeUndefined();
    });

    it("returns 400 for empty slugs", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();

      const req = new Request("http://localhost/likes/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: [] }),
      });
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      const res = await handler.fetch(req, env);
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid JSON", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();

      const req = new Request("http://localhost/likes/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      });
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      const res = await handler.fetch(req, env);
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid slug", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();

      const req = new Request("http://localhost/likes/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: ["valid", "INVALID"] }),
      });
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      const res = await handler.fetch(req, env);
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid type in batch", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();

      const req = new Request("http://localhost/likes/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: ["a"], type: "" }),
      });
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      const res = await handler.fetch(req, env);
      expect(res.status).toBe(400);
    });

    it("returns 401 for batch request with wrong integration test secret", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();

      const req = new Request("http://localhost/likes/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Integration-Test": "wrong-secret",
        },
        body: JSON.stringify({ slugs: ["a"] }),
      });
      const env = {
        DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any,
        INTEGRATION_TEST_SECRET: "test-secret",
      };

      const res = await handler.fetch(req, env);
      expect(res.status).toBe(401);
    });

    it("returns 429 when per-IP rate limit is exceeded before a batch call", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();
      stmt.all.mockResolvedValue({ results: [] });
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      for (let i = 0; i < 10; i++) {
        const req = new Request(`http://localhost/likes/warmup-${i}`, {
          headers: { "CF-Connecting-IP": "batch-ip" },
        });
        const res = await handler.fetch(req, env);
        expect(res.status).toBe(200);
      }

      const batchReq = new Request("http://localhost/likes/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "batch-ip",
        },
        body: JSON.stringify({ slugs: ["a"] }),
      });
      const res = await handler.fetch(batchReq, env);
      expect(res.status).toBe(429);
    });

    it("returns 429 when the global GET rate limit is exceeded before a batch call", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();
      stmt.all.mockResolvedValue({ results: [] });
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      for (let i = 0; i < 500; i++) {
        const req = new Request(`http://localhost/likes/slug-${i}`, {
          headers: { "CF-Connecting-IP": `ip-${i}` },
        });
        const res = await handler.fetch(req, env);
        expect(res.status).toBe(200);
      }

      const batchReq = new Request("http://localhost/likes/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "unique-batch-ip",
        },
        body: JSON.stringify({ slugs: ["a"] }),
      });
      const res = await handler.fetch(batchReq, env);
      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBeTruthy();
    });
  });

  describe("GET /likes/types", () => {
    it("returns list of all types", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();
      stmt.all.mockResolvedValue({
        results: [
          { type: "artigos", slug_count: 3, total_likes: 42 },
          { type: "notas", slug_count: 1, total_likes: 7 },
        ],
      });

      const req = new Request("http://localhost/likes/types");
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      const res = await handler.fetch(req, env);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.types).toHaveLength(2);
      expect(body.types[0].type).toBe("artigos");
    });
  });

  describe("GET /likes/types/:type", () => {
    it("returns slugs for a type", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();
      stmt.first.mockResolvedValue({ total: 2 });
      stmt.all.mockResolvedValue({
        results: [
          { slug: "a", count: 5 },
          { slug: "b", count: 3 },
        ],
      });

      const req = new Request("http://localhost/likes/types/artigos");
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      const res = await handler.fetch(req, env);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.type).toBe("artigos");
      expect(body.total).toBe(2);
      expect(body.slugs).toHaveLength(2);
    });

    it("returns 400 for reserved type", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();

      const req = new Request("http://localhost/likes/types/untyped");
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      const res = await handler.fetch(req, env);
      expect(res.status).toBe(400);
    });

    it("returns 400 for empty type in path", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();

      const req = new Request("http://localhost/likes/types/");
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      const res = await handler.fetch(req, env);
      expect(res.status).toBe(404);
    });
  });

  describe("general behavior", () => {
    it("OPTIONS returns 204 with CORS headers", async () => {
      const handler = await createHandler();

      const req = new Request("http://localhost/likes/hello", {
        method: "OPTIONS",
        headers: { Origin: "https://mysite.com" },
      });
      const env = {
        DB: { prepare: vi.fn(), batch: vi.fn() } as any,
        ALLOWED_ORIGINS: "https://mysite.com",
      };

      const res = await handler.fetch(req, env);
      expect(res.status).toBe(204);
      expect(res.headers.get("access-control-allow-origin")).toBe("https://mysite.com");
    });

    it("Returns 405 for unsupported method", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();

      const req = new Request("http://localhost/likes/hello", {
        method: "PUT",
      });
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      const res = await handler.fetch(req, env);
      expect(res.status).toBe(405);
    });

    it("Returns 400 for invalid slug", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();

      const req = new Request("http://localhost/likes/INVALID");
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      const res = await handler.fetch(req, env);
      expect(res.status).toBe(400);
    });

    it("Returns 404 for unknown route under /likes/", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();

      const req = new Request("http://localhost/likes/types/artigos/sub");
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      const res = await handler.fetch(req, env);
      expect(res.status).toBe(404);
    });

    it("Returns 401 for wrong integration test secret on GET /likes/:slug", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();

      const req = new Request("http://localhost/likes/hello", {
        headers: { "X-Integration-Test": "wrong-secret" },
      });
      const env = {
        DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any,
        INTEGRATION_TEST_SECRET: "test-secret",
      };

      const res = await handler.fetch(req, env);
      expect(res.status).toBe(401);
    });

    it("Applies rate limit configuration from env vars", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();
      stmt.all.mockResolvedValue({ results: [] });

      const req = new Request("http://localhost/likes/hello");
      const env = {
        DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any,
        RATE_LIMIT_PER_IP: "5",
        RATE_LIMIT_GLOBAL_GET: "100",
        RATE_LIMIT_GLOBAL_POST: "20",
      };

      const res = await handler.fetch(req, env);
      expect(res.status).toBe(200);
    });
  });

  describe("rate limiting", () => {
    it("Rate limit blocks excessive requests", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();
      stmt.all.mockResolvedValue({ results: [] });

      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      for (let i = 0; i < 10; i++) {
        const req = new Request(`http://localhost/likes/test-${i}`);
        const res = await handler.fetch(req, env);
        expect(res.status).toBe(200);
      }

      const blockedReq = new Request("http://localhost/likes/blocked");
      const blockedRes = await handler.fetch(blockedReq, env);
      expect(blockedRes.status).toBe(429);
    });

    it("X-Integration-Test bypasses rate limit", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();
      stmt.all.mockResolvedValue({ results: [] });

      const env = {
        DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any,
        INTEGRATION_TEST_SECRET: "test-secret",
      };

      for (let i = 0; i < 20; i++) {
        const req = new Request(`http://localhost/likes/test-${i}`, {
          headers: { "X-Integration-Test": "test-secret" },
        });
        const res = await handler.fetch(req, env);
        expect(res.status).toBe(200);
      }
    });

    it("Global GET rate limit returns 429 with Retry-After header", async () => {
      const handler = await createHandler();
      const stmt = createMockStmt();
      stmt.all.mockResolvedValue({ results: [] });
      const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

      for (let i = 0; i < 500; i++) {
        const req = new Request(`http://localhost/likes/slug-${i}`, {
          headers: { "CF-Connecting-IP": `ip-${i}` },
        });
        const res = await handler.fetch(req, env);
        expect(res.status).toBe(200);
      }

      const blockedReq = new Request("http://localhost/likes/blocked", {
        headers: { "CF-Connecting-IP": "unique-ip" },
      });
      const blockedRes = await handler.fetch(blockedReq, env);
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.headers.get("Retry-After")).toBeTruthy();
    });
  });
});
