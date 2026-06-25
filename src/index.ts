import { cors } from "./utils/cors";
import { rateLimit } from "./utils/rate-limit";
import { validateSlug } from "./utils/validate";

interface Env {
  DB: D1Database;
}

interface LikeRow {
  count: number;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return cors.handlePreflight(request);
    }

    const url = new URL(request.url);
    const slug = url.pathname.replace("/likes/", "");

    const slugError = validateSlug(slug);
    if (slugError) {
      return cors.wrap(new Response(slugError, { status: 400 }), request);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (!rateLimit.check(ip)) {
      return cors.wrap(new Response("Rate limit exceeded", { status: 429 }), request);
    }

    switch (request.method) {
      case "GET":
        return handleGet(request, env, slug);
      case "POST":
        return handlePost(request, env, slug);
      default:
        return cors.wrap(new Response("Method not allowed", { status: 405 }), request);
    }
  },
};

async function handleGet(request: Request, env: Env, slug: string): Promise<Response> {
  const row = await env.DB.prepare("SELECT count FROM likes WHERE slug = ?")
    .bind(slug)
    .first<LikeRow>();

  return cors.wrap(
    Response.json({ slug, count: row?.count ?? 0 }),
    request,
  );
}

async function handlePost(request: Request, env: Env, slug: string): Promise<Response> {
  const visitorId = request.headers.get("X-Visitor-Id");
  if (!visitorId) {
    return cors.wrap(new Response("X-Visitor-Id header required", { status: 400 }), request);
  }

  // Check if this visitor already liked this slug
  const existing = await env.DB.prepare(
    "SELECT 1 FROM likes_visitors WHERE slug = ? AND visitor_id = ?",
  )
    .bind(slug, visitorId)
    .first();

  if (existing) {
    const row = await env.DB.prepare("SELECT count FROM likes WHERE slug = ?")
      .bind(slug)
      .first<LikeRow>();
    return cors.wrap(
      Response.json({ slug, count: row?.count ?? 0, alreadyLiked: true }),
      request,
    );
  }

  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO likes (slug, count) VALUES (?, 1) ON CONFLICT(slug) DO UPDATE SET count = count + 1",
    ).bind(slug),
    env.DB.prepare(
      "INSERT INTO likes_visitors (slug, visitor_id, created_at) VALUES (?, ?, datetime('now'))",
    ).bind(slug, visitorId),
  ]);

  const row = await env.DB.prepare("SELECT count FROM likes WHERE slug = ?")
    .bind(slug)
    .first<LikeRow>();

  return cors.wrap(
    Response.json({ slug, count: row?.count ?? 1, alreadyLiked: false }),
    request,
  );
}
