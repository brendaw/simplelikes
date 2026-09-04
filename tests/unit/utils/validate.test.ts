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

describe("validateType", () => {
  it("accepts simple type", async () => {
    const { validateType } = await import("../../../src/utils/validate");
    expect(validateType("artigos")).toBeNull();
  });

  it("accepts type with hyphens and numbers", async () => {
    const { validateType } = await import("../../../src/utils/validate");
    expect(validateType("tipo-2")).toBeNull();
  });

  it("rejects empty type", async () => {
    const { validateType } = await import("../../../src/utils/validate");
    expect(validateType("")).not.toBeNull();
  });

  it("rejects overly long type", async () => {
    const { validateType } = await import("../../../src/utils/validate");
    expect(validateType("a".repeat(51))).not.toBeNull();
  });

  it("accepts type at the max length boundary", async () => {
    const { validateType } = await import("../../../src/utils/validate");
    expect(validateType("a".repeat(50))).toBeNull();
  });

  it("rejects the reserved type 'untyped'", async () => {
    const { validateType } = await import("../../../src/utils/validate");
    expect(validateType("untyped")).not.toBeNull();
  });

  it("rejects type with uppercase or special chars", async () => {
    const { validateType } = await import("../../../src/utils/validate");
    expect(validateType("Artigos")).not.toBeNull();
    expect(validateType("tipo_com_underscore")).not.toBeNull();
    expect(validateType("tipo com espaco")).not.toBeNull();
  });
});
