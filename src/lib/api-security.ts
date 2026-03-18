import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { type RateLimiter } from "@/lib/rate-limiter";

// Re-export all limiters for convenient single-import in route files
export {
  RateLimiter,
  publicProxyLimiter,
  extractLimiter,
  collabCreateLimiter,
  collabAccessLimiter,
  nearbyLimiter,
  resolveUrlLimiter,
  authLimiter,
} from "@/lib/rate-limiter";

// ---------------------------------------------------------------------------
// Client IP helper
// ---------------------------------------------------------------------------

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

// ---------------------------------------------------------------------------
// withApiSecurity() higher-order wrapper
// ---------------------------------------------------------------------------

const DEFAULT_MAX_BODY_SIZE = 1_048_576; // 1 MB

export interface SecurityOptions {
  /** Require an authenticated Supabase user (default false) */
  requireAuth?: boolean;
  /** Rate limiter instance to apply per client IP */
  rateLimiter?: RateLimiter;
  /** Maximum request body size in bytes (default 1 MB) */
  maxBodySize?: number;
}

export interface AuthenticatedContext {
  user: User;
  supabase: SupabaseClient;
}

type HandlerFn = (
  req: NextRequest,
  context?: unknown,
) => Promise<NextResponse>;

type AuthenticatedHandlerFn = (
  req: NextRequest,
  context: unknown | undefined,
  auth: AuthenticatedContext,
) => Promise<NextResponse>;

/**
 * Wraps a Next.js App Router handler with security checks.
 *
 * When `requireAuth` is true the wrapped handler receives an extra
 * `AuthenticatedContext` argument containing the verified `user` and the
 * server-side `supabase` client.
 */
export function withApiSecurity(
  options: SecurityOptions & { requireAuth: true },
  handler: AuthenticatedHandlerFn,
): HandlerFn;
export function withApiSecurity(
  options: SecurityOptions,
  handler: HandlerFn,
): HandlerFn;
export function withApiSecurity(
  options: SecurityOptions,
  handler: HandlerFn | AuthenticatedHandlerFn,
): HandlerFn {
  const {
    requireAuth = false,
    rateLimiter,
    maxBodySize = DEFAULT_MAX_BODY_SIZE,
  } = options;

  return async (req: NextRequest, context?: unknown): Promise<NextResponse> => {
    try {
      // 1. Rate limiting
      if (rateLimiter) {
        const ip = getClientIp(req);
        const result = rateLimiter.check(ip);

        if (!result.allowed) {
          const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
          return NextResponse.json(
            { error: "Too many requests. Try again later." },
            {
              status: 429,
              headers: { "Retry-After": String(Math.max(retryAfter, 1)) },
            },
          );
        }
      }

      // 2. Body size check
      const contentLength = req.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > maxBodySize) {
        return NextResponse.json(
          { error: "Request body too large." },
          { status: 413 },
        );
      }

      // 3. Authentication
      if (requireAuth) {
        const supabase = await createSupabaseServer();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          return NextResponse.json(
            { error: "Unauthorized." },
            { status: 401 },
          );
        }

        return (handler as AuthenticatedHandlerFn)(req, context, {
          user,
          supabase,
        });
      }

      // No auth required — call handler normally
      return (handler as HandlerFn)(req, context);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Internal server error";
      console.error("[api-security] Unhandled error:", err);
      return NextResponse.json(
        { error: process.env.NODE_ENV === "production" ? "Internal server error" : message },
        { status: 500 },
      );
    }
  };
}
