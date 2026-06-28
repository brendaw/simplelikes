// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import {
  getConfig,
  resolveApiUrl,
  resolveText,
  resolveTextPlural,
} from "../../../src/client/config.js";

describe("getConfig", () => {
  beforeEach(() => {
    delete (window as any).__simpleLikesConfig;
  });

  it("returns empty object when no config is set", () => {
    expect(getConfig()).toEqual({});
  });

  it("returns the config object when set", () => {
    (window as any).__simpleLikesConfig = { text: "star" };
    expect(getConfig()).toEqual({ text: "star" });
  });
});

describe("resolveApiUrl", () => {
  beforeEach(() => {
    delete (window as any).__simpleLikesConfig;
    delete (window as any).__simpleLikesApiUrl;
  });

  it("defaults to '/likes'", () => {
    expect(resolveApiUrl()).toBe("/likes");
  });

  it("uses config.apiUrl when set", () => {
    (window as any).__simpleLikesConfig = {
      apiUrl: "https://api.example.com",
    };
    expect(resolveApiUrl()).toBe("https://api.example.com");
  });

  it("falls back to legacy __simpleLikesApiUrl", () => {
    (window as any).__simpleLikesApiUrl = "https://legacy.example.com";
    expect(resolveApiUrl()).toBe("https://legacy.example.com");
  });

  it("config.apiUrl overrides legacy __simpleLikesApiUrl", () => {
    (window as any).__simpleLikesConfig = {
      apiUrl: "https://config.example.com",
    };
    (window as any).__simpleLikesApiUrl = "https://legacy.example.com";
    expect(resolveApiUrl()).toBe("https://config.example.com");
  });
});

describe("resolveText", () => {
  beforeEach(() => {
    delete (window as any).__simpleLikesConfig;
  });

  it("defaults to 'like'", () => {
    const el = document.createElement("div");
    expect(resolveText(el)).toBe("like");
  });

  it("uses inline text attribute when set", () => {
    const el = document.createElement("div");
    el.setAttribute("text", "star");
    expect(resolveText(el)).toBe("star");
  });

  it("uses config.text when no attribute", () => {
    (window as any).__simpleLikesConfig = { text: "clap" };
    const el = document.createElement("div");
    expect(resolveText(el)).toBe("clap");
  });

  it("inline attribute overrides config.text", () => {
    (window as any).__simpleLikesConfig = { text: "clap" };
    const el = document.createElement("div");
    el.setAttribute("text", "star");
    expect(resolveText(el)).toBe("star");
  });
});

describe("resolveTextPlural", () => {
  beforeEach(() => {
    delete (window as any).__simpleLikesConfig;
  });

  it("defaults to resolveText() + 's'", () => {
    const el = document.createElement("div");
    expect(resolveTextPlural(el)).toBe("likes");
  });

  it("uses inline text-plural attribute when set", () => {
    const el = document.createElement("div");
    el.setAttribute("text-plural", "corações");
    expect(resolveTextPlural(el)).toBe("corações");
  });

  it("falls back to config.text-plural", () => {
    (window as any).__simpleLikesConfig = { "text-plural": "stars" };
    const el = document.createElement("div");
    expect(resolveTextPlural(el)).toBe("stars");
  });

  it("falls back to resolveText() + 's' when only text is set", () => {
    const el = document.createElement("div");
    el.setAttribute("text", "clap");
    expect(resolveTextPlural(el)).toBe("claps");
  });
});
