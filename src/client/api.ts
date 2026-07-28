import { resolveApiUrl } from "./config.js";

export interface LikeResponse {
  slug: string;
  count: number;
  liked?: boolean;
  type?: string;
}

export interface BatchResponse {
  types: Record<string, Record<string, number>>;
}

export async function getCount(slug: string, type?: string): Promise<LikeResponse> {
  const params = type ? `?type=${encodeURIComponent(type)}` : "";
  const res = await fetch(resolveApiUrl() + "/likes/" + slug + params);
  return res.json();
}

export async function batchGet(slugs: string[], type?: string): Promise<BatchResponse> {
  const body: Record<string, unknown> = { slugs };
  if (type) body.type = type;

  const res = await fetch(resolveApiUrl() + "/likes/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function toggleLike(
  slug: string,
  visitorId: string,
  type?: string,
): Promise<LikeResponse> {
  const body: Record<string, unknown> = {};
  if (type) body.type = type;

  const res = await fetch(resolveApiUrl() + "/likes/" + slug, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Visitor-Id": visitorId,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}
