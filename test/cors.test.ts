import { describe, it, expect } from "vitest";

describe("cors", () => {
  it("create defaults to common localhost ports", async () => {
    const { cors } = await import("../src/utils/cors");
    const c = cors.create();

    const req8787 = new Request("http://localhost/test", {
      headers: { Origin: "http://localhost:8787" },
    });
    expect(c.handlePreflight(req8787).headers.get("access-control-allow-origin")).toBe("http://localhost:8787");

    const req3000 = new Request("http://localhost/test", {
      headers: { Origin: "http://localhost:3000" },
    });
    expect(c.handlePreflight(req3000).headers.get("access-control-allow-origin")).toBe("http://localhost:3000");

    // Unknown port should be rejected
    const req9999 = new Request("http://localhost/test", {
      headers: { Origin: "http://localhost:9999" },
    });
    expect(c.handlePreflight(req9999).headers.get("access-control-allow-origin")).toBeNull();
  });

  it("create accepts a single origin", async () => {
    const { cors } = await import("../src/utils/cors");
    const c = cors.create("https://mysite.com");

    const req = new Request("http://localhost/test", {
      headers: { Origin: "https://mysite.com" },
    });
    const res = c.handlePreflight(req);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://mysite.com");
  });

  it("create accepts custom allowed origins", async () => {
    const { cors } = await import("../src/utils/cors");
    const c = cors.create("https://site1.com,https://site2.com");

    const req1 = new Request("http://localhost/test", {
      headers: { Origin: "https://site1.com" },
    });
    const res1 = c.handlePreflight(req1);
    expect(res1.headers.get("access-control-allow-origin")).toBe("https://site1.com");

    const req2 = new Request("http://localhost/test", {
      headers: { Origin: "https://site2.com" },
    });
    const res2 = c.handlePreflight(req2);
    expect(res2.headers.get("access-control-allow-origin")).toBe("https://site2.com");
  });

  it("handlePreflight returns 204 without CORS for unknown origin", async () => {
    const { cors } = await import("../src/utils/cors");
    const c = cors.create("https://allowed.com");

    const req = new Request("http://localhost/test", {
      headers: { Origin: "https://evil.com" },
    });
    const res = c.handlePreflight(req);
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("handlePreflight returns 204 without CORS for no origin", async () => {
    const { cors } = await import("../src/utils/cors");
    const c = cors.create();

    const req = new Request("http://localhost/test");
    const res = c.handlePreflight(req);
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("handlePreflight returns CORS headers for allowed origin", async () => {
    const { cors } = await import("../src/utils/cors");
    const c = cors.create("https://allowed.com");

    const req = new Request("http://localhost/test", {
      headers: { Origin: "https://allowed.com" },
    });
    const res = c.handlePreflight(req);
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://allowed.com");
    expect(res.headers.get("access-control-allow-methods")).toBe("GET, POST, OPTIONS");
    expect(res.headers.get("access-control-allow-headers")).toBe("Content-Type, X-Visitor-Id");
    expect(res.headers.get("access-control-max-age")).toBe("86400");
  });

  it("wrap adds security headers to any response", async () => {
    const { cors } = await import("../src/utils/cors");
    const c = cors.create();

    const req = new Request("http://localhost/test");
    const res = c.wrap(new Response("ok"), req);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });

  it("wrap adds CORS header when origin matches", async () => {
    const { cors } = await import("../src/utils/cors");
    const c = cors.create("https://allowed.com");

    const req = new Request("http://localhost/test", {
      headers: { Origin: "https://allowed.com" },
    });
    const res = c.wrap(new Response("ok"), req);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://allowed.com");
    expect(res.headers.get("vary")).toBe("Origin");
  });

  it("wrap does not add CORS header when origin does not match", async () => {
    const { cors } = await import("../src/utils/cors");
    const c = cors.create("https://allowed.com");

    const req = new Request("http://localhost/test", {
      headers: { Origin: "https://evil.com" },
    });
    const res = c.wrap(new Response("ok"), req);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
    expect(res.headers.get("vary")).toBeNull();
  });
});
