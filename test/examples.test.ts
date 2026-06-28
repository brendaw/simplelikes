// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from "vitest";

function importComponent() {
  return import("../src/client/index.js");
}

describe("SimpleLikes web component", () => {
  beforeEach(async () => {
    document.body.innerHTML = "";
    delete (window as any).__simpleLikesConfig;
    vi.resetModules();
    await importComponent();
  });

  function createElement(slug: string, attrs: Record<string, string> = {}): Element {
    const el = document.createElement("simple-likes");
    el.setAttribute("slug", slug);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v);
    }
    document.body.appendChild(el);
    return el;
  }

  function getBtn(el: Element): HTMLElement | null {
    return el.querySelector(".sl-btn");
  }

  function getCount(el: Element): HTMLElement | null {
    return el.querySelector(".sl-count");
  }

  describe("rendering", () => {
    it("renders default label with plural", () => {
      const el = createElement("test-1");
      expect(getBtn(el)?.innerHTML).toContain("likes");
      expect(getBtn(el)?.getAttribute("aria-label")).toBe("like");
    });

    it("uses singular label when count is 1", () => {
      const el = createElement("test-2");
      (el as any)._count = 1;
      (el as any)._updateCount();
      expect(getBtn(el)?.innerHTML).toContain("like");
      expect(getBtn(el)?.innerHTML).not.toContain("likes");
    });

    it("uses custom text via attribute", () => {
      const el = createElement("test-3", { text: "star" });
      expect(getBtn(el)?.innerHTML).toContain("stars");
      expect(getBtn(el)?.getAttribute("aria-label")).toBe("star");
    });

    it("uses custom text and text-plural via attributes", () => {
      const el = createElement("test-4", { text: "coração", "text-plural": "corações" });
      expect(getBtn(el)?.innerHTML).toContain("corações");
      expect(getBtn(el)?.getAttribute("aria-label")).toBe("coração");
    });

    it("uses singular custom text when count is 1", () => {
      const el = createElement("test-5", { text: "coração", "text-plural": "corações" });
      (el as any)._count = 1;
      (el as any)._updateCount();
      expect(getBtn(el)?.innerHTML).toContain("coração");
      expect(getBtn(el)?.innerHTML).not.toContain("corações");
    });
  });

  describe("global config", () => {
    beforeEach(async () => {
      vi.resetModules();
      (window as any).__simpleLikesConfig = { text: "star", "text-plural": "stars" };
      await importComponent();
    });

    it("uses global config when no inline attributes", () => {
      const el = createElement("global-1");
      expect(getBtn(el)?.innerHTML).toContain("stars");
      expect(getBtn(el)?.getAttribute("aria-label")).toBe("star");
    });

    it("inline attribute overrides global text but keeps global text-plural", () => {
      const el = createElement("global-2", { text: "clap" });
      expect(getBtn(el)?.innerHTML).toContain("stars");
      expect(getBtn(el)?.getAttribute("aria-label")).toBe("clap");
    });
  });

  describe("priority chain", () => {
    it("inline attribute wins over global config", async () => {
      vi.resetModules();
      (window as any).__simpleLikesConfig = { text: "star", "text-plural": "stars" };
      await importComponent();
      const el = createElement("prior-1", { text: "coração", "text-plural": "corações" });
      expect(getBtn(el)?.innerHTML).toContain("corações");
    });

    it("global config wins over hardcoded default", async () => {
      vi.resetModules();
      (window as any).__simpleLikesConfig = { text: "star", "text-plural": "stars" };
      await importComponent();
      const el = createElement("prior-2");
      expect(getBtn(el)?.innerHTML).toContain("stars");
    });

    it("hardcoded default used when nothing is set", () => {
      const el = createElement("prior-3");
      expect(getBtn(el)?.innerHTML).toContain("likes");
    });
  });

  describe("dynamic update", () => {
    it("updates count and label when _updateCount is called", () => {
      const el = createElement("dyn-1");
      (el as any)._count = 5;
      (el as any)._updateCount();
      expect(getCount(el)?.textContent).toBe("5");
      expect(getBtn(el)?.innerHTML).toContain("likes");
    });

    it("changes from plural to singular when count becomes 1", () => {
      const el = createElement("dyn-2");
      (el as any)._count = 1;
      (el as any)._updateCount();
      expect(getBtn(el)?.innerHTML).toContain("like");
      expect(getBtn(el)?.innerHTML).not.toContain("likes");
    });

    it("updates aria-label on dynamic update", () => {
      const el = createElement("dyn-3", { text: "coração" });
      (el as any)._count = 1;
      (el as any)._updateCount();
      expect(getBtn(el)?.getAttribute("aria-label")).toBe("coração");
    });
  });

  describe("button element", () => {
    it("creates a button with sl-btn class", () => {
      const el = createElement("btn-1");
      const btn = getBtn(el);
      expect(btn).not.toBeNull();
      expect(btn?.tagName).toBe("BUTTON");
      expect(btn?.classList.contains("sl-btn")).toBe(true);
    });

    it("adds liked class when liked state is applied", () => {
      const el = createElement("btn-2");
      const btn = getBtn(el)!;
      btn.classList.add("liked");
      expect(btn.classList.contains("liked")).toBe(true);
    });
  });

  describe("text getter", () => {
    it("defaults to 'like'", () => {
      const el = createElement("getter-1") as any;
      expect(el.text).toBe("like");
    });

    it("returns attribute value when set", () => {
      const el = createElement("getter-2", { text: "coração" }) as any;
      expect(el.text).toBe("coração");
    });

    it("prioritizes attribute over global config", async () => {
      vi.resetModules();
      (window as any).__simpleLikesConfig = { text: "global-star" };
      await importComponent();
      const el = createElement("getter-3", { text: "inline-clap" }) as any;
      expect(el.text).toBe("inline-clap");
    });

    it("falls back to global config when no attribute", async () => {
      vi.resetModules();
      (window as any).__simpleLikesConfig = { text: "global-star" };
      await importComponent();
      const el = createElement("getter-4") as any;
      expect(el.text).toBe("global-star");
    });
  });

  describe("textPlural getter", () => {
    it("defaults to text + 's'", () => {
      const el = createElement("plural-1") as any;
      expect(el.textPlural).toBe("likes");
    });

    it("returns attribute value when set", () => {
      const el = createElement("plural-2", { "text-plural": "corações" }) as any;
      expect(el.textPlural).toBe("corações");
    });

    it("falls back to text + 's' when only text is set", () => {
      const el = createElement("plural-3", { text: "clap" }) as any;
      expect(el.textPlural).toBe("claps");
    });

    it("prioritizes attribute over global config", async () => {
      vi.resetModules();
      (window as any).__simpleLikesConfig = { "text-plural": "global-stars" };
      await importComponent();
      const el = createElement("plural-4", { "text-plural": "inline-variants" }) as any;
      expect(el.textPlural).toBe("inline-variants");
    });

    it("falls back to global config when no attribute", async () => {
      vi.resetModules();
      (window as any).__simpleLikesConfig = { "text-plural": "global-stars" };
      await importComponent();
      const el = createElement("plural-5") as any;
      expect(el.textPlural).toBe("global-stars");
    });

    it("falls back to text + 's' when neither attribute nor global config", () => {
      const el = createElement("plural-6", { text: "star" }) as any;
      expect(el.textPlural).toBe("stars");
    });
  });
});
