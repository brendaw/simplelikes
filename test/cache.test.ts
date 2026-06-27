import { describe, it, expect, vi, beforeEach } from "vitest";

function createMockCaches() {
  const store = new Map<string, Response>();
  return {
    default: {
      match: vi.fn(async (req: Request) => store.get(req.url) ?? undefined),
      put: vi.fn(async (req: Request, res: Response) => {
        store.set(req.url, res);
      }),
    },
  };
}

describe("cache", () => {
  let mockCaches: ReturnType<typeof createMockCaches>;
  let mockCtx: ExecutionContext;

  beforeEach(async () => {
    mockCaches = createMockCaches();
    vi.stubGlobal("caches", mockCaches);
    vi.resetModules();

    mockCtx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    };
  });

  describe("wrap", () => {
    it("returns cached response on cache hit", async () => {
      const { createCache } = await import("../src/utils/cache");
      const cache = createCache(mockCtx);

      const expected = new Response(JSON.stringify({ cached: true }));
      mockCaches.default.put(new Request("http://test/key"), expected.clone());

      const req = new Request("http://test/key");
      const res = await cache.wrap(req, 60, async () => new Response(JSON.stringify({ fresh: true })));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({ cached: true });
    });

    it("calls fetchFn on cache miss and stores response", async () => {
      const { createCache } = await import("../src/utils/cache");
      const cache = createCache(mockCtx);

      const req = new Request("http://test/miss");
      const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ fresh: true })));

      const res = await cache.wrap(req, 60, fetchFn);

      expect(fetchFn).toHaveBeenCalledOnce();
      expect(res.status).toBe(200);

      expect(mockCaches.default.put).toHaveBeenCalledOnce();
      const putCall = mockCaches.default.put.mock.calls[0];
      expect(putCall[0].url).toBe("http://test/miss");
      expect(putCall[1].headers.get("Cache-Control")).toBe("public, max-age=60");
    });

    it("does not cache non-200 responses", async () => {
      const { createCache } = await import("../src/utils/cache");
      const cache = createCache(mockCtx);

      const req = new Request("http://test/error");
      const res = await cache.wrap(req, 60, async () => new Response("Not Found", { status: 404 }));

      expect(res.status).toBe(404);
      expect(mockCaches.default.put).not.toHaveBeenCalled();
    });

    it("uses custom key when provided", async () => {
      const { createCache } = await import("../src/utils/cache");
      const cache = createCache(mockCtx);

      const req = new Request("http://test/any");
      const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: true })));

      await cache.wrap(req, 60, fetchFn, "custom:key");

      expect(mockCaches.default.put).toHaveBeenCalledOnce();
      const putCall = mockCaches.default.put.mock.calls[0];
      expect(putCall[0].url).toContain("custom:key");
    });

    it("skips cache when caches is unavailable", async () => {
      vi.stubGlobal("caches", undefined);
      vi.resetModules();

      const { createCache } = await import("../src/utils/cache");
      const cache = createCache(mockCtx);

      const req = new Request("http://test/skip");
      const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));

      const res = await cache.wrap(req, 60, fetchFn);

      expect(fetchFn).toHaveBeenCalledOnce();
      expect(mockCaches.default.match).not.toHaveBeenCalled();
      expect(mockCaches.default.put).not.toHaveBeenCalled();
    });
  });

  describe("batchKey", () => {
    it("generates deterministic key from sorted slugs", async () => {
      const { createCache } = await import("../src/utils/cache");
      const cache = createCache(mockCtx);

      const key1 = await cache.batchKey(["z", "a", "m"]);
      const key2 = await cache.batchKey(["a", "m", "z"]);

      expect(key1).toBe(key2);
      expect(key1.startsWith("batch:")).toBe(true);
      expect(key1.length).toBe(70);
    });

    it("generates different keys for different slug sets", async () => {
      const { createCache } = await import("../src/utils/cache");
      const cache = createCache(mockCtx);

      const keyA = await cache.batchKey(["a", "b"]);
      const keyB = await cache.batchKey(["a", "c"]);

      expect(keyA).not.toBe(keyB);
    });
  });
});
