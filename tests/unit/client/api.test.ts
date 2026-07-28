// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getCount, batchGet, toggleLike } from "../../../src/client/api.js";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});

describe("getCount", () => {
  it("calls fetch without type param by default", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ slug: "my-slug", types: { artigos: 5 } }),
    });
    const result = await getCount("my-slug");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/likes/my-slug"),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.not.stringContaining("?type="),
    );
    expect(result.types.artigos).toBe(5);
  });

  it("calls fetch with type query param when provided", async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ slug: "my-slug", count: 5, type: "artigos" }),
    });
    const result = await getCount("my-slug", "artigos");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/likes/my-slug?type=artigos"),
    );
    expect(result.count).toBe(5);
    expect(result.type).toBe("artigos");
  });
});

describe("batchGet", () => {
  it("sends POST with slugs only", async () => {
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          types: { artigos: { slugs: { a: 1 } } },
        }),
    });
    const result = await batchGet(["a"]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/likes/batch"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: ["a"] }),
      }),
    );
    expect(result.types.artigos.slugs.a).toBe(1);
  });

  it("sends POST with type when provided", async () => {
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          types: { artigos: { slugs: { a: 1 } } },
        }),
    });
    const result = await batchGet(["a"], "artigos");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/likes/batch"),
      expect.objectContaining({
        body: JSON.stringify({ slugs: ["a"], type: "artigos" }),
      }),
    );
  });
});

describe("toggleLike", () => {
  it("sends POST without type by default", async () => {
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({ slug: "my-slug", count: 1, liked: true, type: "untyped" }),
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
        body: JSON.stringify({}),
      }),
    );
    expect(result.liked).toBe(true);
    expect(result.type).toBe("untyped");
  });

  it("sends POST with type when provided", async () => {
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({ slug: "my-slug", count: 1, liked: true, type: "artigos" }),
    });
    const result = await toggleLike("my-slug", "v123abc", "artigos");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/likes/my-slug"),
      expect.objectContaining({
        body: JSON.stringify({ type: "artigos" }),
      }),
    );
    expect(result.type).toBe("artigos");
  });
});
