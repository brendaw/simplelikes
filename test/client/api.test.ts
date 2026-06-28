// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getCount, batchGet, toggleLike } from "../../src/client/api.js";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});

describe("getCount", () => {
  it("calls fetch with the correct URL", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ slug: "my-slug", count: 5 }),
    });
    const result = await getCount("my-slug");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/likes/my-slug"),
    );
    expect(result.count).toBe(5);
  });
});

describe("batchGet", () => {
  it("sends a POST request with JSON body", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ slugs: { a: 1, b: 2 } }),
    });
    const result = await batchGet(["a", "b"]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/likes/batch"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: ["a", "b"] }),
      }),
    );
    expect(result.slugs.a).toBe(1);
  });
});

describe("toggleLike", () => {
  it("sends POST with X-Visitor-Id and returns like response", async () => {
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({ slug: "my-slug", count: 1, liked: true }),
    });
    const result = await toggleLike("my-slug", "v123abc");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/likes/my-slug"),
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Visitor-Id": "v123abc",
        },
      }),
    );
    expect(result.liked).toBe(true);
  });
});
