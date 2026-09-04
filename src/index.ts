import { createCache } from "./utils/cache";
import { cors } from "./utils/cors";
import { rateLimit } from "./utils/rate-limit";
import { validateSlug, validateType } from "./utils/validate";
import type { IStorage } from "./storage/types";
import { D1Storage } from "./storage/d1";

interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS?: string;
  INTEGRATION_TEST_SECRET?: string;
  RATE_LIMIT_PER_IP?: string;
  RATE_LIMIT_GLOBAL_GET?: string;
  RATE_LIMIT_GLOBAL_POST?: string;
  VERSION?: string;
}

interface HandlerOptions {
  allowedOrigins?: string;
  integrationTestSecret?: string;
  version?: string;
  ctx?: ExecutionContext;
}

export async function handleRequest(
  request: Request,
  storage: IStorage,
  options: HandlerOptions = {},
): Promise<Response> {
  const cache = createCache(options.ctx);
  const c = cors.create(options.allowedOrigins, options.version);

  if (request.method === "OPTIONS") {
    return c.handlePreflight(request);
  }

  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Route: POST /likes/batch
  if (method === "POST" && path === "/likes/batch") {
    return handleBatch(request, storage, options.integrationTestSecret, c, cache);
  }

  // Route: GET /likes/types/:type
  if (method === "GET" && path.startsWith("/likes/types/")) {
    const typeSlug = path.replace("/likes/types/", "");
    if (!typeSlug || typeSlug.includes("/")) {
      return c.wrap(new Response("Not found", { status: 404 }), request);
    }
    return c.wrap(await handleGetTypeSlugs(storage, typeSlug, url), request);
  }

  // Route: GET /likes/types
  if (method === "GET" && path === "/likes/types") {
    return c.wrap(await handleGetTypes(storage), request);
  }

  const { reject, isTest } = checkIntegrationTest(request, options.integrationTestSecret);
  if (reject) return c.wrap(reject, request);

  // Route: GET|POST /likes/:slug
  const slug = path.replace("/likes/", "");

  const slugError = validateSlug(slug);
  if (slugError) {
    return c.wrap(new Response(slugError, { status: 400 }), request);
  }

  if (!isTest && (method === "GET" || method === "POST")) {
    if (!rateLimit.checkGlobal(method)) {
      const retryAfter = rateLimit.retryAfter(method);
      const res = new Response("Global rate limit exceeded", { status: 429, headers: { "Retry-After": String(retryAfter) } });
      return c.wrap(res, request);
    }
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (!rateLimit.check(ip) && !isTest) {
    return c.wrap(new Response("Rate limit exceeded", { status: 429 }), request);
  }

  switch (method) {
    case "GET":
      return c.wrap(await handleGet(request, storage, slug, cache, url), request);
    case "POST":
      return handlePost(request, storage, slug, c);
    default:
      return c.wrap(new Response("Method not allowed", { status: 405 }), request);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const storage = new D1Storage(env.DB);
    rateLimit.configure({
      perIpLimit: env.RATE_LIMIT_PER_IP ? Number(env.RATE_LIMIT_PER_IP) : undefined,
      globalGetLimit: env.RATE_LIMIT_GLOBAL_GET ? Number(env.RATE_LIMIT_GLOBAL_GET) : undefined,
      globalPostLimit: env.RATE_LIMIT_GLOBAL_POST ? Number(env.RATE_LIMIT_GLOBAL_POST) : undefined,
    });
    return handleRequest(request, storage, {
      allowedOrigins: env.ALLOWED_ORIGINS,
      integrationTestSecret: env.INTEGRATION_TEST_SECRET,
      version: env.VERSION,
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
  url: URL,
): Promise<Response> {
  const typeParam = url.searchParams.get("type");

  if (typeParam !== null) {
    if (typeParam.length === 0) {
      return new Response("Invalid type: must be non-empty", { status: 400 });
    }

    const typeError = validateType(typeParam);
    if (typeError) {
      return new Response(typeError, { status: 400 });
    }

    return cache.wrap(request, 60, async () => {
      const count = await storage.getCount(slug, typeParam);
      return Response.json({ slug, count, type: typeParam });
    });
  }

  return cache.wrap(request, 60, async () => {
    const types = await storage.getTypeCounts(slug);
    return Response.json({ slug, types });
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

  let type = "untyped";
  try {
    const body = await request.json() as Record<string, unknown>;
    if (body && typeof body.type === "string") {
      const typeError = validateType(body.type);
      if (typeError) {
        return c.wrap(new Response(typeError, { status: 400 }), request);
      }
      type = body.type;
    }
  } catch {
    // No body or invalid JSON — use default type
  }

  const liked = await storage.hasVisitor(slug, visitorId, type);

  if (liked) {
    await storage.decrement(slug, visitorId, type);
    const count = await storage.getCount(slug, type);
    return c.wrap(
      Response.json({ slug, count, liked: false, type }),
      request,
    );
  }

  await storage.increment(slug, visitorId, type);

  const count = await storage.getCount(slug, type);
  return c.wrap(
    Response.json({ slug, count: count || 1, liked: true, type }),
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

  let body: { slugs?: string[]; type?: string };
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

  let type: string | undefined;
  if (body.type !== undefined) {
    if (typeof body.type !== "string") {
      return c.wrap(new Response("Invalid type: must be a string", { status: 400 }), request);
    }
    const typeError = validateType(body.type);
    if (typeError) {
      return c.wrap(new Response(typeError, { status: 400 }), request);
    }
    type = body.type;
  }

  if (!isTest && !rateLimit.checkGlobal("GET")) {
    const retryAfter = rateLimit.retryAfter("GET");
    const res = new Response("Global rate limit exceeded", { status: 429, headers: { "Retry-After": String(retryAfter) } });
    return c.wrap(res, request);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (!rateLimit.check(ip) && !isTest) {
    return c.wrap(new Response("Rate limit exceeded", { status: 429 }), request);
  }

  const key = await cache.batchKey(slugs, type);

  return c.wrap(
    await cache.wrap(request, 30, async () => {
      const entries = await storage.batchGet(slugs, type);
      const grouped: Record<string, Record<string, number>> = {};

      for (const entry of entries) {
        if (!grouped[entry.type]) {
          grouped[entry.type] = {};
        }
        grouped[entry.type][entry.slug] = entry.count;
      }

      return Response.json({ types: grouped });
    }, key),
    request,
  );
}

async function handleGetTypes(storage: IStorage): Promise<Response> {
  const types = await storage.getTypes();
  return Response.json({ types });
}

async function handleGetTypeSlugs(
  storage: IStorage,
  type: string,
  url: URL,
): Promise<Response> {
  /* v8 ignore next 3 -- unreachable: the /likes/types/:type route guard already
     rejects an empty typeSlug before this function is ever called */
  if (type.length === 0) {
    return new Response("Invalid type: must be non-empty", { status: 400 });
  }

  const typeError = validateType(type);
  if (typeError) {
    return new Response(typeError, { status: 400 });
  }

  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 25, 1), 100);
  const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

  const result = await storage.getTypeSlugs(type, limit, offset);

  return Response.json({
    type,
    count: result.slugs.length,
    total: result.total,
    slugs: result.slugs,
  });
}
