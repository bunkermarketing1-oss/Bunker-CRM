/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * NOTE: state lives in the Node.js process. It is effective for a single Dokploy container;
 * if the app is scaled horizontally, replace the store with a shared one (Redis/Upstash).
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Returns whether the key is still under the limit WITHOUT consuming an attempt. */
export function peekRateLimit(key: string, limit: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) return { allowed: true, retryAfterSeconds: 0 };
  return {
    allowed: bucket.count < limit,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

/** Registers one attempt (e.g. a failed login) for the key. */
export function registerAttempt(key: string, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
  } else {
    bucket.count += 1;
  }
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/**
 * Client IP as seen by the trusted reverse proxy. The LAST entry of X-Forwarded-For is the
 * one appended by our own proxy (Traefik/Dokploy); earlier entries are client-controlled.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return headers.get("x-real-ip") || "unknown";
}
