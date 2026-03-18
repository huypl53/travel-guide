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

// Pre-configured limiter instances

/** Geocode / public proxy routes — 30 req/min */
export const publicProxyLimiter = new RateLimiter(30, 60_000);

/** Extract / import routes — 10 req/min */
export const extractLimiter = new RateLimiter(10, 60_000);

/** Collaborative session creation — 10 req/min */
export const collabCreateLimiter = new RateLimiter(10, 60_000);

/** Collaborative session access — 60 req/min */
export const collabAccessLimiter = new RateLimiter(60, 60_000);

/** Nearby POI route — 20 req/min */
export const nearbyLimiter = new RateLimiter(20, 60_000);

/** Resolve-url route — 20 req/min */
export const resolveUrlLimiter = new RateLimiter(20, 60_000);

/** Auth-related routes — 30 req/min */
export const authLimiter = new RateLimiter(30, 60_000);
