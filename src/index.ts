import { createCache } from "./utils/cache";
import { cors } from "./utils/cors";
import { rateLimit } from "./utils/rate-limit";
import { validateSlug } from "./utils/validate";
import type { IStorage } from "./storage/types";
import { D1Storage } from "./storage/d1";

interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS?: string;
  INTEGRATION_TEST_SECRET?: string;
}

interface HandlerOptions {
  allowedOrigins?: string;
  integrationTestSecret?: string;
  ctx?: ExecutionContext;
}

export async function handleRequest(
  request: Request,
  storage: IStorage,
  options: HandlerOptions = {},
): Promise<Response> {
  const cache = createCache(options.ctx);
  const c = cors.create(options.allowedOrigins);

  if (request.method === "OPTIONS") {
    return c.handlePreflight(request);
  }

  const url = new URL(request.url);

  // Route: POST /likes/batch
  if (request.method === "POST" && url.pathname === "/likes/batch") {
    return handleBatch(request, storage, options.integrationTestSecret, c, cache);
  }

  const { reject, isTest } = checkIntegrationTest(request, options.integrationTestSecret);
  if (reject) return c.wrap(reject, request);

  // Route: GET|POST /likes/:slug
  const slug = url.pathname.replace("/likes/", "");

  const slugError = validateSlug(slug);
  if (slugError) {
    return c.wrap(new Response(slugError, { status: 400 }), request);
  }

  if (!isTest && (request.method === "GET" || request.method === "POST")) {
    if (!rateLimit.checkGlobal(request.method)) {
      const retryAfter = rateLimit.retryAfter(request.method);
      const res = new Response("Global rate limit exceeded", { status: 429, headers: { "Retry-After": String(retryAfter) } });
      return c.wrap(res, request);
    }
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (!rateLimit.check(ip) && !isTest) {
    return c.wrap(new Response("Rate limit exceeded", { status: 429 }), request);
  }

  switch (request.method) {
    case "GET":
      return c.wrap(await handleGet(request, storage, slug, cache), request);
    case "POST":
      return handlePost(request, storage, slug, c);
    default:
      return c.wrap(new Response("Method not allowed", { status: 405 }), request);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const storage = new D1Storage(env.DB);
    return handleRequest(request, storage, {
      allowedOrigins: env.ALLOWED_ORIGINS,
      integrationTestSecret: env.INTEGRATION_TEST_SECRET,
      ctx,
    });
  },
};

function checkIntegrationTest(request: Request, secret?: string): { reject?: Response; isTest: boolean } {
  if (!secret) return { isTest: false };

  const header = request.headers.get("X-Integration-Test");
  if (header === secret) return { isTest: true };
  if (header) return { reject: new Response("Invalid integration test secret", { status: 401 }), isTest: false };

  return { isTest: false };
}

async function handleGet(
  request: Request,
  storage: IStorage,
  slug: string,
  cache: ReturnType<typeof createCache>,
): Promise<Response> {
  return cache.wrap(request, 60, async () => {
    const count = await storage.getCount(slug);
    return Response.json({ slug, count });
  });
}

async function handlePost(
  request: Request,
  storage: IStorage,
  slug: string,
  c: ReturnType<typeof cors.create>,
): Promise<Response> {
  const visitorId = request.headers.get("X-Visitor-Id");
  if (!visitorId) {
    return c.wrap(new Response("X-Visitor-Id header required", { status: 400 }), request);
  }

  const existing = await storage.hasVisitor(slug, visitorId);

  if (existing) {
    const count = await storage.getCount(slug);
    return c.wrap(
      Response.json({ slug, count, alreadyLiked: true }),
      request,
    );
  }

  await storage.increment(slug, visitorId);

  const count = await storage.getCount(slug);
  return c.wrap(
    Response.json({ slug, count: count || 1, alreadyLiked: false }),
    request,
  );
}

async function handleBatch(
  request: Request,
  storage: IStorage,
  integrationTestSecret: string | undefined,
  c: ReturnType<typeof cors.create>,
  cache: ReturnType<typeof createCache>,
): Promise<Response> {
  const { reject, isTest } = checkIntegrationTest(request, integrationTestSecret);
  if (reject) return c.wrap(reject, request);

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

  // Global rate limit — batch is a read operation, counts against GET limit
  if (!isTest && !rateLimit.checkGlobal("GET")) {
    const retryAfter = rateLimit.retryAfter("GET");
    const res = new Response("Global rate limit exceeded", { status: 429, headers: { "Retry-After": String(retryAfter) } });
    return c.wrap(res, request);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (!rateLimit.check(ip) && !isTest) {
    return c.wrap(new Response("Rate limit exceeded", { status: 429 }), request);
  }

  const key = await cache.batchKey(slugs);

  return c.wrap(
    await cache.wrap(request, 30, async () => {
      const result = await storage.batchGet(slugs);
      return Response.json({ slugs: result });
    }, key),
    request,
  );
}
