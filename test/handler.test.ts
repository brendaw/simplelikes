import { describe, it, expect, vi, beforeEach } from "vitest";

function createMockStmt() {
  return {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    all: vi.fn(),
  };
}

function createHandler() {
  return import("../src/index").then((m) => m.default);
}

describe("handler", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("GET /likes/:slug returns count for existing slug", async () => {
    const handler = await createHandler();
    const stmt = createMockStmt();
    stmt.first.mockResolvedValue({ count: 42 });

    const req = new Request("http://localhost/likes/hello");
    const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

    const res = await handler.fetch(req, env);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ slug: "hello", count: 42 });
    expect(stmt.bind).toHaveBeenCalledWith("hello");
  });

  it("GET /likes/:slug returns 0 for missing slug", async () => {
    const handler = await createHandler();
    const stmt = createMockStmt();
    stmt.first.mockResolvedValue(null);

    const req = new Request("http://localhost/likes/unknown");
    const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

    const res = await handler.fetch(req, env);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ slug: "unknown", count: 0 });
  });

  it("POST /likes/:slug increments and returns new count", async () => {
    const handler = await createHandler();
    const stmt = createMockStmt();
    stmt.first
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ count: 1 });

    const req = new Request("http://localhost/likes/hello", {
      method: "POST",
      headers: { "X-Visitor-Id": "visitor-1" },
    });
    const env = {
      DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn().mockResolvedValue([]) } as any,
    };

    const res = await handler.fetch(req, env);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ slug: "hello", count: 1, alreadyLiked: false });
  });

  it("POST /likes/:slug with existing visitor and null count uses fallback 0", async () => {
    const handler = await createHandler();
    const stmt = createMockStmt();
    stmt.first
      .mockResolvedValueOnce({ "1": 1 })
      .mockResolvedValueOnce(null);

    const req = new Request("http://localhost/likes/hello", {
      method: "POST",
      headers: { "X-Visitor-Id": "visitor-1" },
    });
    const env = {
      DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any,
    };

    const res = await handler.fetch(req, env);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ slug: "hello", count: 0, alreadyLiked: true });
  });

  it("POST /likes/:slug with new visitor and null count uses fallback 1", async () => {
    const handler = await createHandler();
    const stmt = createMockStmt();
    stmt.first
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const req = new Request("http://localhost/likes/hello", {
      method: "POST",
      headers: { "X-Visitor-Id": "visitor-2" },
    });
    const env = {
      DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn().mockResolvedValue([]) } as any,
    };

    const res = await handler.fetch(req, env);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ slug: "hello", count: 1, alreadyLiked: false });
  });

  it("POST /likes/:slug with existing visitor returns alreadyLiked: true", async () => {
    const handler = await createHandler();
    const stmt = createMockStmt();
    stmt.first
      .mockResolvedValueOnce({ "1": 1 })
      .mockResolvedValueOnce({ count: 5 });

    const req = new Request("http://localhost/likes/hello", {
      method: "POST",
      headers: { "X-Visitor-Id": "visitor-1" },
    });
    const env = {
      DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any,
    };

    const res = await handler.fetch(req, env);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ slug: "hello", count: 5, alreadyLiked: true });
  });

  it("POST /likes/:slug missing X-Visitor-Id returns 400", async () => {
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

  it("POST /likes/batch returns counts for multiple slugs", async () => {
    const handler = await createHandler();
    const stmt = createMockStmt();
    stmt.all.mockResolvedValue({
      results: [
        { slug: "a", count: 3 },
        { slug: "b", count: 7 },
      ],
    });

    const req = new Request("http://localhost/likes/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slugs: ["a", "b", "c"] }),
    });
    const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

    const res = await handler.fetch(req, env);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.slugs).toMatchObject({ a: 3, b: 7, c: 0 });
  });

  it("POST /likes/batch with empty slugs returns 400", async () => {
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

  it("POST /likes/batch with invalid JSON returns 400", async () => {
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

  it("POST /likes/batch with invalid slug returns 400", async () => {
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

  it("GET /likes/:slug with invalid slug returns 400", async () => {
    const handler = await createHandler();
    const stmt = createMockStmt();

    const req = new Request("http://localhost/likes/INVALID");
    const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

    const res = await handler.fetch(req, env);
    expect(res.status).toBe(400);
  });

  it("OPTIONS returns 204 with CORS headers", async () => {
    const handler = await createHandler();

    const req = new Request("http://localhost/likes/hello", {
      method: "OPTIONS",
      headers: { Origin: "https://williambrendaw.com" },
    });
    const env = { DB: { prepare: vi.fn(), batch: vi.fn() } as any };

    const res = await handler.fetch(req, env);
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://williambrendaw.com");
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

  it("Rate limit blocks excessive requests", async () => {
    const handler = await createHandler();
    const stmt = createMockStmt();
    stmt.first.mockResolvedValue({ count: 0 });

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

  it("Normal request works when secret is configured but no header present", async () => {
    const handler = await createHandler();
    const stmt = createMockStmt();
    stmt.first.mockResolvedValue({ count: 10 });

    const req = new Request("http://localhost/likes/normal");
    const env = {
      DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any,
      INTEGRATION_TEST_SECRET: "some-secret",
    };

    const res = await handler.fetch(req, env);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ slug: "normal", count: 10 });
  });

  it("X-Integration-Test bypasses rate limit", async () => {
    const handler = await createHandler();
    const stmt = createMockStmt();
    stmt.first.mockResolvedValue({ count: 0 });

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

  it("X-Integration-Test with wrong secret returns 401", async () => {
    const handler = await createHandler();
    const stmt = createMockStmt();

    const env = {
      DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any,
      INTEGRATION_TEST_SECRET: "real-secret",
    };

    const req = new Request("http://localhost/likes/hello", {
      headers: { "X-Integration-Test": "wrong-secret" },
    });
    const res = await handler.fetch(req, env);
    expect(res.status).toBe(401);
  });

  it("Batch with X-Integration-Test bypasses rate limit", async () => {
    const handler = await createHandler();
    const stmt = createMockStmt();
    stmt.all.mockResolvedValue({ results: [] });

    const env = {
      DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any,
      INTEGRATION_TEST_SECRET: "test-secret",
    };

    for (let i = 0; i < 20; i++) {
      const req = new Request("http://localhost/likes/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Integration-Test": "test-secret",
        },
        body: JSON.stringify({ slugs: ["a"] }),
      });
      const res = await handler.fetch(req, env);
      expect(res.status).toBe(200);
    }
  });

  it("Normal batch request works when secret is configured but no header present", async () => {
    const handler = await createHandler();
    const stmt = createMockStmt();
    stmt.all.mockResolvedValue({ results: [] });

    const req = new Request("http://localhost/likes/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slugs: ["a"] }),
    });
    const env = {
      DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any,
      INTEGRATION_TEST_SECRET: "some-secret",
    };

    const res = await handler.fetch(req, env);
    expect(res.status).toBe(200);
  });

  it("Batch with wrong integration test secret returns 401", async () => {
    const handler = await createHandler();
    const stmt = createMockStmt();

    const env = {
      DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any,
      INTEGRATION_TEST_SECRET: "real-secret",
    };

    const req = new Request("http://localhost/likes/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Integration-Test": "wrong-secret",
      },
      body: JSON.stringify({ slugs: ["a"] }),
    });
    const res = await handler.fetch(req, env);
    expect(res.status).toBe(401);
  });

  it("Batch rate limit blocks excessive requests without secret", async () => {
    const handler = await createHandler();
    const stmt = createMockStmt();
    stmt.all.mockResolvedValue({ results: [] });

    const env = { DB: { prepare: vi.fn().mockReturnValue(stmt), batch: vi.fn() } as any };

    for (let i = 0; i < 10; i++) {
      const req = new Request("http://localhost/likes/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: ["a"] }),
      });
      const res = await handler.fetch(req, env);
      expect(res.status).toBe(200);
    }

    const blockedReq = new Request("http://localhost/likes/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slugs: ["a"] }),
    });
    const blockedRes = await handler.fetch(blockedReq, env);
    expect(blockedRes.status).toBe(429);
  });
});
