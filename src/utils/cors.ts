function create(allowedOrigins?: string) {
  const origins = new Set(
    (allowedOrigins || "https://williambrendaw.com")
      .split(",")
      .map((o) => o.trim()),
  );

  function getOrigin(request: Request): string | null {
    const origin = request.headers.get("Origin");
    if (origin && origins.has(origin)) {
      return origin;
    }
    return null;
  }

  function handlePreflight(request: Request): Response {
    const origin = getOrigin(request);
    if (!origin) {
      return new Response(null, { status: 204 });
    }

    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Visitor-Id",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  function wrap(response: Response, request: Request): Response {
    const origin = getOrigin(request);
    if (origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Vary", "Origin");
    }
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    return response;
  }

  return { handlePreflight, wrap };
}

export const cors = { create };
