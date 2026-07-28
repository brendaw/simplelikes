import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = process.env.INTEGRATION_TEST_URL || "https://staging.likes.yourdomain.com";
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
  const testType = "e2e";

  it("GET /likes/:slug?type=e2e returns 0 for new slug", async () => {
    const res = await fetch(`${BASE_URL}/likes/${slug}?type=${testType}`, { headers: headers() });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ slug, count: 0, type: testType });
  });

  it("GET /likes/:slug without type returns grouped response", async () => {
    const res = await fetch(`${BASE_URL}/likes/${slug}`, { headers: headers() });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ slug, types: {} });
  });

  it("POST /likes/:slug with type increments and returns new count", async () => {
    const res = await fetch(`${BASE_URL}/likes/${slug}`, {
      method: "POST",
      headers: { ...headers(), "X-Visitor-Id": visitorId },
      body: JSON.stringify({ type: testType }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ slug, count: 1, liked: true, type: testType });
  });

  it("POST /likes/:slug with same visitor and type toggles unlike", async () => {
    const res = await fetch(`${BASE_URL}/likes/${slug}`, {
      method: "POST",
      headers: { ...headers(), "X-Visitor-Id": visitorId },
      body: JSON.stringify({ type: testType }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ slug, count: 0, liked: false, type: testType });
  });

  it("POST /likes/batch returns grouped response", async () => {
    const slugs = [slug, `${slug}-2`, `${slug}-3`];
    const res = await fetch(`${BASE_URL}/likes/batch`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ slugs }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.types).toBeDefined();
  });

  it("POST /likes/batch with type filter returns matching slugs", async () => {
    const slugs = [slug, `${slug}-2`];
    const res = await fetch(`${BASE_URL}/likes/batch`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ slugs, type: testType }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.types[testType]).toBeDefined();
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
      body: JSON.stringify({ type: testType }),
    });
    expect(res.status).toBe(400);
  });

  it("GET /likes/:slug with invalid slug returns 400", async () => {
    const res = await fetch(`${BASE_URL}/likes/Hello World!`, {
      headers: headers(),
    });
    expect(res.status).toBe(400);
  });

  it("GET /likes/types returns list of types", async () => {
    const res = await fetch(`${BASE_URL}/likes/types`, {
      headers: headers(),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(body.types)).toBe(true);
  });

  it("GET /likes/types/:type returns slugs for type", async () => {
    const res = await fetch(`${BASE_URL}/likes/types/${testType}`, {
      headers: headers(),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.type).toBe(testType);
  });

  it("GET /likes/types/untyped returns 400", async () => {
    const res = await fetch(`${BASE_URL}/likes/types/untyped`, {
      headers: headers(),
    });
    expect(res.status).toBe(400);
  });

  it("CORS headers are present on responses", async () => {
    if (!EXPECTED_ORIGIN) {
      throw new Error("EXPECTED_ORIGIN environment variable must be set to run CORS tests");
    }
    const res = await fetch(`${BASE_URL}/likes/${slug}?type=${testType}`, {
      headers: { ...headers(), Origin: EXPECTED_ORIGIN },
    });
    expect(res.headers.get("access-control-allow-origin")).toBe(EXPECTED_ORIGIN);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("x-version")).toBeTruthy();
  });
});
