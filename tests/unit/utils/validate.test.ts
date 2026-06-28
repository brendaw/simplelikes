import { describe, it, expect } from "vitest";

describe("validateSlug", () => {
  it("accepts simple slugs", async () => {
    const { validateSlug } = await import("../../../src/utils/validate");
    expect(validateSlug("hello-world")).toBeNull();
  });

  it("accepts nested slugs", async () => {
    const { validateSlug } = await import("../../../src/utils/validate");
    expect(validateSlug("2025/hello-world")).toBeNull();
  });

  it("rejects empty slug", async () => {
    const { validateSlug } = await import("../../../src/utils/validate");
    expect(validateSlug("")).not.toBeNull();
  });

  it("rejects slug with uppercase", async () => {
    const { validateSlug } = await import("../../../src/utils/validate");
    expect(validateSlug("Hello-World")).not.toBeNull();
  });

  it("rejects slug with special chars", async () => {
    const { validateSlug } = await import("../../../src/utils/validate");
    expect(validateSlug("hello world!")).not.toBeNull();
  });

  it("rejects overly long slug", async () => {
    const { validateSlug } = await import("../../../src/utils/validate");
    expect(validateSlug("a".repeat(201))).not.toBeNull();
  });

  it("accepts batch-style slugs", async () => {
    const { validateSlug } = await import("../../../src/utils/validate");
    expect(validateSlug("2026/my-article")).toBeNull();
    expect(validateSlug("category/sub-category/post")).toBeNull();
  });
});
