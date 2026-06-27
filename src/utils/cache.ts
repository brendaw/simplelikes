const cache =
  typeof caches !== "undefined" ? caches.default : undefined;

export function createCache(ctx?: ExecutionContext) {
  return {
    async wrap(
      request: Request,
      ttl: number,
      fetchFn: () => Promise<Response>,
      customKey?: string,
    ): Promise<Response> {
      if (!cache) return fetchFn();

      const url = customKey ?? request.url;
      const cached = await cache.match(new Request(url));
      if (cached) return cached;

      const response = await fetchFn();

      if (response.status === 200) {
        const headers = new Headers(response.headers);
        headers.set("Cache-Control", `public, max-age=${ttl}`);

        ctx?.waitUntil?.(
          cache.put(
            new Request(url),
            new Response(response.clone().body, {
              status: response.status,
              statusText: response.statusText,
              headers,
            }),
          ),
        );
      }

      return response;
    },

    async batchKey(slugs: string[]): Promise<string> {
      const sorted = [...slugs].sort();
      const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sorted.join("\0")));
      return "batch:" + Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
    },
  };
}
