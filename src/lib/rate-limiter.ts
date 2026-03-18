/**
 * In-memory sliding-window rate limiter.
 * Swap to @upstash/ratelimit for multi-instance deployments.
 */
export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly hits = new Map<string, number[]>();

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Periodically purge expired entries to prevent memory leaks
    const timer = setInterval(() => {
      const now = Date.now();
      for (const [key, timestamps] of this.hits) {
        const valid = timestamps.filter((t) => now - t < this.windowMs);
        if (valid.length === 0) {
          this.hits.delete(key);
        } else {
          this.hits.set(key, valid);
        }
      }
    }, this.windowMs);

    // Allow the process to exit without waiting for the timer
    if (typeof timer === "object" && "unref" in timer) {
      timer.unref();
    }
  }

  check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const timestamps = (this.hits.get(key) ?? []).filter(
      (t) => now - t < this.windowMs,
    );

    if (timestamps.length >= this.maxRequests) {
      this.hits.set(key, timestamps);
      const oldestInWindow = timestamps[0];
      return {
        allowed: false,
        remaining: 0,
        resetAt: oldestInWindow + this.windowMs,
      };
    }

    timestamps.push(now);
    this.hits.set(key, timestamps);

    return {
      allowed: true,
      remaining: this.maxRequests - timestamps.length,
      resetAt: timestamps[0] + this.windowMs,
    };
  }
}

// ---------------------------------------------------------------------------
// Pre-configured limiter instances
//
// In Next.js dev mode, modules are re-evaluated on every request due to HMR.
// We store instances on globalThis so they survive reloads and actually enforce
// rate limits during development.
// ---------------------------------------------------------------------------

interface RateLimiterCache {
  publicProxyLimiter: RateLimiter;
  extractLimiter: RateLimiter;
  collabCreateLimiter: RateLimiter;
  collabAccessLimiter: RateLimiter;
  nearbyLimiter: RateLimiter;
  resolveUrlLimiter: RateLimiter;
  authLimiter: RateLimiter;
}

const g = globalThis as typeof globalThis & { __rateLimiters?: RateLimiterCache };

if (!g.__rateLimiters) {
  g.__rateLimiters = {
    publicProxyLimiter: new RateLimiter(30, 60_000),
    extractLimiter: new RateLimiter(10, 60_000),
    collabCreateLimiter: new RateLimiter(10, 60_000),
    collabAccessLimiter: new RateLimiter(60, 60_000),
    nearbyLimiter: new RateLimiter(20, 60_000),
    resolveUrlLimiter: new RateLimiter(20, 60_000),
    authLimiter: new RateLimiter(30, 60_000),
  };
}

/** Geocode / public proxy routes — 30 req/min */
export const publicProxyLimiter = g.__rateLimiters.publicProxyLimiter;

/** Extract / import routes — 10 req/min */
export const extractLimiter = g.__rateLimiters.extractLimiter;

/** Collaborative session creation — 10 req/min */
export const collabCreateLimiter = g.__rateLimiters.collabCreateLimiter;

/** Collaborative session access — 60 req/min */
export const collabAccessLimiter = g.__rateLimiters.collabAccessLimiter;

/** Nearby POI route — 20 req/min */
export const nearbyLimiter = g.__rateLimiters.nearbyLimiter;

/** Resolve-url route — 20 req/min */
export const resolveUrlLimiter = g.__rateLimiters.resolveUrlLimiter;

/** Auth-related routes — 30 req/min */
export const authLimiter = g.__rateLimiters.authLimiter;
