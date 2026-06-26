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
    const { rateLimit } = await import("../src/utils/rate-limit");
    expect(rateLimit.check("ip-1")).toBe(true);
  });

  it("allows up to 10 requests", async () => {
    const { rateLimit } = await import("../src/utils/rate-limit");
    for (let i = 0; i < 10; i++) {
      expect(rateLimit.check("ip-2")).toBe(true);
    }
  });

  it("blocks the 11th request", async () => {
    const { rateLimit } = await import("../src/utils/rate-limit");
    for (let i = 0; i < 10; i++) {
      rateLimit.check("ip-3");
    }
    expect(rateLimit.check("ip-3")).toBe(false);
  });

  it("resets after window expires", async () => {
    const { rateLimit } = await import("../src/utils/rate-limit");
    for (let i = 0; i < 10; i++) {
      rateLimit.check("ip-4");
    }
    expect(rateLimit.check("ip-4")).toBe(false);

    vi.advanceTimersByTime(60001);

    expect(rateLimit.check("ip-4")).toBe(true);
  });

  it("tracks different keys independently", async () => {
    const { rateLimit } = await import("../src/utils/rate-limit");
    for (let i = 0; i < 10; i++) {
      rateLimit.check("busy-ip");
    }
    expect(rateLimit.check("busy-ip")).toBe(false);
    expect(rateLimit.check("other-ip")).toBe(true);
  });
});
