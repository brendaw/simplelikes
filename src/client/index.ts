import { SimpleLikes } from "./component.js";

if (!customElements.get("simple-likes")) {
  customElements.define("simple-likes", SimpleLikes);
}

export { SimpleLikes } from "./component.js";
export { getCount, batchGet, toggleLike } from "./api.js";
export type { LikeResponse, BatchResponse } from "./api.js";
export { getConfig, resolveApiUrl, resolveText, resolveTextPlural } from "./config.js";
export type { SimpleLikesConfig } from "./config.js";
