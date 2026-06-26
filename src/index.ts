import { cors } from "./utils/cors";
import { rateLimit } from "./utils/rate-limit";
import { validateSlug } from "./utils/validate";

interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS?: string;
}

interface LikeRow {
  count: number;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const c = cors.create(env.ALLOWED_ORIGINS);

    if (request.method === "OPTIONS") {
      return c.handlePreflight(request);
    }

    const url = new URL(request.url);

    // Route: POST /likes/batch
    if (request.method === "POST" && url.pathname === "/likes/batch") {
      return handleBatch(request, env, c);
    }

    // Route: GET|POST /likes/:slug
    const slug = url.pathname.replace("/likes/", "");

    const slugError = validateSlug(slug);
    if (slugError) {
      return c.wrap(new Response(slugError, { status: 400 }), request);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (!rateLimit.check(ip)) {
      return c.wrap(new Response("Rate limit exceeded", { status: 429 }), request);
    }

    switch (request.method) {
      case "GET":
        return handleGet(request, env, slug, c);
      case "POST":
        return handlePost(request, env, slug, c);
      default:
        return c.wrap(new Response("Method not allowed", { status: 405 }), request);
    }
  },
};

async function handleGet(
  request: Request,
  env: Env,
  slug: string,
  c: ReturnType<typeof cors.create>,
): Promise<Response> {
  const row = await env.DB.prepare("SELECT count FROM likes WHERE slug = ?")
    .bind(slug)
    .first<LikeRow>();

  return c.wrap(
    Response.json({ slug, count: row?.count ?? 0 }),
    request,
  );
}

async function handlePost(
  request: Request,
  env: Env,
  slug: string,
  c: ReturnType<typeof cors.create>,
): Promise<Response> {
  const visitorId = request.headers.get("X-Visitor-Id");
  if (!visitorId) {
    return c.wrap(new Response("X-Visitor-Id header required", { status: 400 }), request);
  }

  const existing = await env.DB.prepare(
    "SELECT 1 FROM likes_visitors WHERE slug = ? AND visitor_id = ?",
  )
    .bind(slug, visitorId)
    .first();

  if (existing) {
    const row = await env.DB.prepare("SELECT count FROM likes WHERE slug = ?")
      .bind(slug)
      .first<LikeRow>();
    return c.wrap(
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

  return c.wrap(
    Response.json({ slug, count: row?.count ?? 1, alreadyLiked: false }),
    request,
  );
}

async function handleBatch(
  request: Request,
  env: Env,
  c: ReturnType<typeof cors.create>,
): Promise<Response> {
  let body: { slugs?: string[] };
  try {
    body = await request.json();
  } catch {
    return c.wrap(new Response("Invalid JSON body", { status: 400 }), request);
  }

  const slugs = body.slugs;
  if (!Array.isArray(slugs) || slugs.length === 0 || slugs.length > 50) {
    return c.wrap(
      new Response("slugs must be a non-empty array of up to 50 items", { status: 400 }),
      request,
    );
  }

  for (const slug of slugs) {
    const error = validateSlug(slug);
    if (error) {
      return c.wrap(new Response(`Invalid slug: ${slug}`, { status: 400 }), request);
    }
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (!rateLimit.check(ip)) {
    return c.wrap(new Response("Rate limit exceeded", { status: 429 }), request);
  }

  const placeholders = slugs.map(() => "?");
  const { results } = await env.DB.prepare(
    `SELECT slug, count FROM likes WHERE slug IN (${placeholders.join(",")})`,
  )
    .bind(...slugs)
    .all<{ slug: string; count: number }>();

  const result: Record<string, number> = {};
  for (const slug of slugs) {
    result[slug] = 0;
  }
  for (const row of results) {
    result[row.slug] = row.count;
  }

  return c.wrap(Response.json({ slugs: result }), request);
}
