import { resolveApiUrl } from "./config.js";

export interface LikeResponse {
  slug: string;
  count: number;
  liked?: boolean;
}

export interface BatchResponse {
  slugs: Record<string, number>;
}

export async function getCount(slug: string): Promise<LikeResponse> {
  const res = await fetch(resolveApiUrl() + "/likes/" + slug);
  return res.json();
}

export async function batchGet(slugs: string[]): Promise<BatchResponse> {
  const res = await fetch(resolveApiUrl() + "/likes/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slugs }),
  });
  return res.json();
}

export async function toggleLike(
  slug: string,
  visitorId: string,
): Promise<LikeResponse> {
  const res = await fetch(resolveApiUrl() + "/likes/" + slug, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Visitor-Id": visitorId,
    },
  });
  return res.json();
}
