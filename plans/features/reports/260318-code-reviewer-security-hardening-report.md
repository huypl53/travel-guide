# Security Hardening — Code Review Report

**Date:** 2026-03-18
**Reviewer:** code-reviewer
**Branch:** feature-security-hardening

---

## Code Review Summary

### Scope
- Files reviewed: 15 (all changed files in the branch)
- Lines of code analyzed: ~600 net additions
- Review focus: security hardening implementation

### Overall Assessment

The implementation is solid and correct. All API routes are wrapped with `withApiSecurity`, the old inline rate limiter in `collab/route.ts` is fully removed, auth routes properly use `AuthenticatedContext`, and there are no duplicate auth checks. TypeScript passes clean (`tsc --noEmit` exit 0). Several bugs and plan deviations are noted below.

---

### Critical Issues

None.

---

### High Priority Findings

#### H1: Error response body includes redundant `status` field — misleading contract

In `src/lib/api-security.ts` lines 168, 181, 196, 214, the JSON body includes `status: 429` etc. alongside the HTTP status code:

```ts
NextResponse.json(
  { error: "Too many requests. Try again later.", status: 429 },  // <-- bug
  { status: 429 },
)
```

This means clients get `{ error: "...", status: 429 }` in the body which is non-standard and can cause client-side bugs (e.g. a client reading `body.status` instead of the HTTP status code). The body should only contain `error`:

```ts
NextResponse.json(
  { error: "Too many requests. Try again later." },
  { status: 429, headers: { "Retry-After": ... } },
)
```

Affects all 4 error cases in the wrapper (429, 413, 401, 500).

#### H2: `/api/nearby` and `/api/resolve-url` use wrong rate limiter

Plan specifies:
- `/api/nearby` — 20 req/min
- `/api/resolve-url` — 20 req/min

Both use `publicProxyLimiter` which is 30/min. Either create a dedicated `nearbyLimiter = new RateLimiter(20, 60_000)` and `resolveUrlLimiter = new RateLimiter(20, 60_000)`, or note this as a deliberate simplification in the plan. This is a functional deviation from the spec.

#### H3: `/api/resolve-url` has no SSRF protection

`src/app/api/resolve-url/route.ts` fetches an arbitrary user-supplied URL with no host validation:

```ts
const res = await fetch(url, { redirect: "follow" });
```

An attacker can use this to probe internal services (`http://169.254.169.254/`, `http://localhost:3000/internal`, etc.). At minimum, add a URL allowlist (only `maps.app.goo.gl`, `goo.gl`, `maps.google.com`) before fetching. This was out of scope in the original YAGNI list but is a genuine open proxy vulnerability.

---

### Medium Priority Improvements

#### M1: `connect-src` CSP missing external API hosts

`next.config.ts` `connect-src` only allows Supabase:
```
connect-src 'self' https://*.supabase.co wss://*.supabase.co
```

But Next.js server components/API routes connect to external services server-side so `connect-src` isn't relevant there. However if the frontend ever calls these hosts directly (e.g. Open-Meteo, Nominatim, OSRM), browsers will block it. Current code routes everything through Next.js API routes, so this is acceptable — but worth a comment in the config to explain why external hosts are omitted.

#### M2: `script-src 'unsafe-eval'` is broad

CSP has `'unsafe-eval'` in `script-src`. This is required by some Next.js dev tooling but should be removed in production. Consider:
```ts
"script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "")
```

#### M3: `authLimiter` rate-limits per IP, not per user

Plan says "Per-user limits for authenticated routes." `authLimiter` uses `getClientIp()` which is per-IP. The `user.id` is available in `AuthenticatedHandlerFn` but the `rateLimiter.check()` call happens before auth resolves in the wrapper. True per-user limiting would require the handler to call the limiter itself, or the wrapper to key on user ID when `requireAuth: true`. Low risk since RLS still protects data, but mismatches the plan spec.

#### M4: `cleanupTimer` type assertion is fragile

In `api-security.ts`:
```ts
if (typeof this.cleanupTimer === "object" && "unref" in this.cleanupTimer) {
```
`ReturnType<typeof setInterval>` in Node is `NodeJS.Timeout` (has `.unref()`), in browser it's a number. The check is correct but indirect. A simpler pattern:
```ts
(this.cleanupTimer as NodeJS.Timeout).unref?.();
```

#### M5: CORS preflight does not send `Access-Control-Allow-Credentials`

If any API route is called with `credentials: 'include'` from the frontend (required for cookie-based Supabase auth), the preflight must include `Access-Control-Allow-Credentials: true`. Currently missing. May cause CORS failures for authenticated API calls from the browser in production.

---

### Low Priority Suggestions

#### L1: `/api/auth/callback` has no rate limiting

The plan mentions `authLimiter` but `auth/callback/route.ts` does not use `withApiSecurity`. This endpoint calls `exchangeCodeForSession` and could be hammered. Wrapping it is a minor hardening improvement, though Supabase's own token exchange limits mitigate this somewhat.

#### L2: `trips/[slug]` GET is public with no rate limit

The public trip-sharing GET (`export async function GET`) is not wrapped. Per the plan only `/api/trips` POST needs 30/min, so this is in-spec, but a bare GET to a database with no rate limit is worth noting.

#### L3: Error body in 500 response leaks internal error message

```ts
const message = err instanceof Error ? err.message : "Internal server error";
return NextResponse.json({ error: message, status: 500 }, { status: 500 });
```

In production, `err.message` can leak stack traces or internal details. Consider returning a generic message in production:
```ts
const message = process.env.NODE_ENV === "production" ? "Internal server error" : (err instanceof Error ? err.message : "Internal server error");
```

---

### Positive Observations

- Old in-memory rate limiter fully removed from `collab/route.ts` — clean diff, no dead code
- `withApiSecurity` overload signatures are correct and type-safe; TypeScript passes with 0 errors
- `AuthenticatedContext` injection pattern is clean — no duplicate `getUser()` calls in any auth-protected handler
- `RateLimiter` cleanup timer with `.unref()` prevents process hang — good practice
- Slug validation regex in `collab/[slug]/route.ts` is strict (1-21 chars, alphanumeric + `-_`)
- Body size limits are applied per-route matching the plan (524288 for collab, 102400 for extract-locations, default 1MB elsewhere)
- CORS middleware correctly allows null/missing origin (same-origin requests) to pass through
- `maxDuration` export is present on all routes that needed it

---

### Recommended Actions

1. **Fix error response bodies** — remove `status` field from JSON bodies (H1)
2. **Create `nearbyLimiter` and `resolveUrlLimiter`** at 20/min or document deviation (H2)
3. **Add SSRF guard to `/api/resolve-url`** — allowlist known Google Maps short URL hosts (H3)
4. **Add `Access-Control-Allow-Credentials: true` to preflight response** in `middleware.ts` if cookie auth is required cross-origin (M5)
5. Scope `'unsafe-eval'` to dev only in CSP (M2)
6. Consider `process.env.NODE_ENV` guard on 500 error messages (L3)

---

### Metrics
- TypeScript errors: 0
- Plan tasks completed: 5/6 (rate limiter values for nearby/resolve-url deviate from plan)
- Routes wrapped with `withApiSecurity`: 13/14 (`auth/callback` intentionally excluded)
- Old in-memory rate limiter removed: yes
- Duplicate auth checks: none found
