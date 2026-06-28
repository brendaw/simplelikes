interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  perIpLimit?: number;
  globalGetLimit?: number;
  globalPostLimit?: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000;
let PER_IP_LIMIT = 10;
let GLOBAL_GET_LIMIT = 500;
let GLOBAL_POST_LIMIT = 50;

function configure(options: RateLimitConfig): void {
  if (options.perIpLimit !== undefined) PER_IP_LIMIT = options.perIpLimit;
  if (options.globalGetLimit !== undefined) GLOBAL_GET_LIMIT = options.globalGetLimit;
  if (options.globalPostLimit !== undefined) GLOBAL_POST_LIMIT = options.globalPostLimit;
}

function check(key: string, limit: number = PER_IP_LIMIT): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

function checkGlobal(method: "GET" | "POST"): boolean {
  const limit = method === "POST" ? GLOBAL_POST_LIMIT : GLOBAL_GET_LIMIT;
  return check(`__global__${method}`, limit);
}

function retryAfter(method: "GET" | "POST"): number {
  const key = `__global__${method}`;
  const entry = store.get(key);
  if (!entry) return 0;
  return Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 1000));
}

export const rateLimit = { configure, check, checkGlobal, retryAfter };
