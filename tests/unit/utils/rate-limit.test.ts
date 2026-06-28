import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows first request", async () => {
    const { rateLimit } = await import("../../../src/utils/rate-limit");
    expect(rateLimit.check("ip-1")).toBe(true);
  });

  it("allows up to 10 requests", async () => {
    const { rateLimit } = await import("../../../src/utils/rate-limit");
    for (let i = 0; i < 10; i++) {
      expect(rateLimit.check("ip-2")).toBe(true);
    }
  });

  it("blocks the 11th request", async () => {
    const { rateLimit } = await import("../../../src/utils/rate-limit");
    for (let i = 0; i < 10; i++) {
      rateLimit.check("ip-3");
    }
    expect(rateLimit.check("ip-3")).toBe(false);
  });

  it("resets after window expires", async () => {
    const { rateLimit } = await import("../../../src/utils/rate-limit");
    for (let i = 0; i < 10; i++) {
      rateLimit.check("ip-4");
    }
    expect(rateLimit.check("ip-4")).toBe(false);

    vi.advanceTimersByTime(60001);

    expect(rateLimit.check("ip-4")).toBe(true);
  });

  it("tracks different keys independently", async () => {
    const { rateLimit } = await import("../../../src/utils/rate-limit");
    for (let i = 0; i < 10; i++) {
      rateLimit.check("busy-ip");
    }
    expect(rateLimit.check("busy-ip")).toBe(false);
    expect(rateLimit.check("other-ip")).toBe(true);
  });

  // Global rate limit tests

  it("allows first global GET request", async () => {
    const { rateLimit } = await import("../../../src/utils/rate-limit");
    expect(rateLimit.checkGlobal("GET")).toBe(true);
  });

  it("allows first global POST request", async () => {
    const { rateLimit } = await import("../../../src/utils/rate-limit");
    expect(rateLimit.checkGlobal("POST")).toBe(true);
  });

  it("blocks at 501st global GET request", async () => {
    const { rateLimit } = await import("../../../src/utils/rate-limit");
    for (let i = 0; i < 500; i++) {
      rateLimit.checkGlobal("GET");
    }
    expect(rateLimit.checkGlobal("GET")).toBe(false);
  });

  it("blocks at 51st global POST request", async () => {
    const { rateLimit } = await import("../../../src/utils/rate-limit");
    for (let i = 0; i < 50; i++) {
      rateLimit.checkGlobal("POST");
    }
    expect(rateLimit.checkGlobal("POST")).toBe(false);
  });

  it("resets global limit after window expires", async () => {
    const { rateLimit } = await import("../../../src/utils/rate-limit");
    for (let i = 0; i < 500; i++) {
      rateLimit.checkGlobal("GET");
    }
    expect(rateLimit.checkGlobal("GET")).toBe(false);

    vi.advanceTimersByTime(60001);

    expect(rateLimit.checkGlobal("GET")).toBe(true);
  });

  it("tracks global GET and POST independently", async () => {
    const { rateLimit } = await import("../../../src/utils/rate-limit");
    for (let i = 0; i < 500; i++) {
      rateLimit.checkGlobal("GET");
    }
    expect(rateLimit.checkGlobal("GET")).toBe(false);
    expect(rateLimit.checkGlobal("POST")).toBe(true);
  });

  it("retryAfter returns positive value when limit exceeded", async () => {
    const { rateLimit } = await import("../../../src/utils/rate-limit");
    for (let i = 0; i < 50; i++) {
      rateLimit.checkGlobal("POST");
    }
    rateLimit.checkGlobal("POST");
    const retryAfter = rateLimit.retryAfter("POST");
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });

  it("retryAfter returns 0 when no limit is hit", async () => {
    const { rateLimit } = await import("../../../src/utils/rate-limit");
    expect(rateLimit.retryAfter("GET")).toBe(0);
  });

  it("global rate limit does not affect per-IP tracking", async () => {
    const { rateLimit } = await import("../../../src/utils/rate-limit");
    for (let i = 0; i < 500; i++) {
      rateLimit.checkGlobal("GET");
    }
    expect(rateLimit.check("fresh-ip")).toBe(true);
  });

  // configure() tests

  it("configure custom per-ip limit overrides default", async () => {
    const { rateLimit } = await import("../../../src/utils/rate-limit");
    rateLimit.configure({ perIpLimit: 3 });

    expect(rateLimit.check("ip")).toBe(true);
    expect(rateLimit.check("ip")).toBe(true);
    expect(rateLimit.check("ip")).toBe(true);
    expect(rateLimit.check("ip")).toBe(false);
  });

  it("configure custom global GET limit overrides default", async () => {
    const { rateLimit } = await import("../../../src/utils/rate-limit");
    rateLimit.configure({ globalGetLimit: 2 });

    expect(rateLimit.checkGlobal("GET")).toBe(true);
    expect(rateLimit.checkGlobal("GET")).toBe(true);
    expect(rateLimit.checkGlobal("GET")).toBe(false);
  });

  it("configure custom global POST limit overrides default", async () => {
    const { rateLimit } = await import("../../../src/utils/rate-limit");
    rateLimit.configure({ globalPostLimit: 2 });

    expect(rateLimit.checkGlobal("POST")).toBe(true);
    expect(rateLimit.checkGlobal("POST")).toBe(true);
    expect(rateLimit.checkGlobal("POST")).toBe(false);
  });
});
