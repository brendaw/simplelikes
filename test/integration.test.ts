import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = process.env.INTEGRATION_TEST_URL || "https://simplelikes-staging.william-brendaw.workers.dev";
const SECRET = process.env.INTEGRATION_TEST_SECRET;
const EXPECTED_ORIGIN = process.env.EXPECTED_ORIGIN;

const describeIf = SECRET ? describe : describe.skip;

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (SECRET) {
    h["X-Integration-Test"] = SECRET;
  }
  return h;
}

describeIf("integration tests", () => {
  const slug = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const visitorId = "00000000-0000-0000-0000-000000000001";

  it("GET /likes/:slug returns 0 for new slug", async () => {
    const res = await fetch(`${BASE_URL}/likes/${slug}`, { headers: headers() });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ slug, count: 0 });
  });

  it("POST /likes/:slug increments and returns new count", async () => {
    const res = await fetch(`${BASE_URL}/likes/${slug}`, {
      method: "POST",
      headers: { ...headers(), "X-Visitor-Id": visitorId },
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ slug, count: 1, alreadyLiked: false });
  });

  it("POST /likes/:slug with same visitor returns alreadyLiked: true", async () => {
    const res = await fetch(`${BASE_URL}/likes/${slug}`, {
      method: "POST",
      headers: { ...headers(), "X-Visitor-Id": visitorId },
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ slug, count: 1, alreadyLiked: true });
  });

  it("POST /likes/batch returns counts for multiple slugs", async () => {
    const slugs = [slug, `${slug}-2`, `${slug}-3`];
    const res = await fetch(`${BASE_URL}/likes/batch`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ slugs }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.slugs).toMatchObject({ [slug]: 1, [`${slug}-2`]: 0, [`${slug}-3`]: 0 });
  });

  it("POST /likes/batch with empty slugs returns 400", async () => {
    const res = await fetch(`${BASE_URL}/likes/batch`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ slugs: [] }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /likes/:slug without X-Visitor-Id returns 400", async () => {
    const res = await fetch(`${BASE_URL}/likes/${slug}`, {
      method: "POST",
      headers: headers(),
    });
    expect(res.status).toBe(400);
  });

  it("GET /likes/:slug with invalid slug returns 400", async () => {
    const res = await fetch(`${BASE_URL}/likes/Hello World!`, {
      headers: headers(),
    });
    expect(res.status).toBe(400);
  });

  it("CORS headers are present on responses", async () => {
    if (!EXPECTED_ORIGIN) {
      throw new Error("EXPECTED_ORIGIN environment variable must be set to run CORS tests");
    }
    const res = await fetch(`${BASE_URL}/likes/${slug}`, {
      headers: { ...headers(), Origin: EXPECTED_ORIGIN },
    });
    expect(res.headers.get("access-control-allow-origin")).toBe(EXPECTED_ORIGIN);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
  });
});
