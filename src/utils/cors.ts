function create(allowedOrigins?: string) {
  const origins = new Set(
    (allowedOrigins || "http://localhost:8787,http://localhost:3000,http://localhost:5173,http://localhost:8080")
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
    const headers = new Headers(response.headers);
    if (origin) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Vary", "Origin");
    }
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return { handlePreflight, wrap };
}

export const cors = { create };
