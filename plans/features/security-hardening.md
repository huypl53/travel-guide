# Proximap — Security Hardening Plan

## Current Security Posture

### Strengths
- Supabase RLS policies on all tables (trips, locations, distance_cache, saved_trips, collaborative_sessions)
- Server-side auth validation (`supabase.auth.getUser()`) on protected API routes
- Input validation on locations (type: `base` | `destination`) & collaborative sessions
- Rate limiting on collab session creation (10/min per IP) & external API calls (Nominatim, Overpass)
- JWT tokens via Supabase SSR with refresh rotation
- DB column `distance_cache.base_id` with CHECK constraint on `locations.type`

### Gaps

| Gap | Risk | Priority |
|-----|------|----------|
| No security headers (CSP, HSTS, X-Frame-Options) | Clickjacking, XSS, MIME sniffing | High |
| No rate limiting on most API endpoints | Abuse, cost amplification | High |
| In-memory rate limiting (lost on restart) | Ineffective in production/multi-instance | High |
| No CORS configuration | Cross-origin abuse of APIs | Medium |
| No request body size limits | Payload-based DoS | Medium |
| Public proxy endpoints (`/api/geocode`, `/api/directions`, etc.) | Free proxy for attackers to abuse third-party APIs | High |

## Recommended Approach: Middleware Security Layer

### 1. Security Headers (`next.config.ts`)
- Content-Security-Policy
- Strict-Transport-Security (HSTS)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy (disable camera, microphone, etc.)

### 2. CORS Whitelist (`middleware.ts`)
- Restrict API routes to allowed origins
- Block cross-origin requests from unknown domains

### 3. Persistent Rate Limiting (Upstash Redis)
- **Dependencies:** `@upstash/redis`, `@upstash/ratelimit`
- Per-IP limits for public proxy routes:
  - `/api/geocode` — 30 req/min
  - `/api/directions` — 30 req/min
  - `/api/nearby` — 20 req/min
  - `/api/weather` — 30 req/min
  - `/api/distances` — 30 req/min
  - `/api/routes` — 30 req/min
  - `/api/extract-locations` — 10 req/min
  - `/api/resolve-url` — 20 req/min
- Per-user limits for authenticated routes:
  - `/api/trips` — 30 req/min
  - `/api/saved-trips` — 30 req/min
- Per-IP limits for collab routes:
  - `/api/collab` POST — 10 req/min (already exists, migrate to Redis)
  - `/api/collab/[slug]` — 60 req/min

### 4. API Middleware Wrapper (`withApiSecurity()`)
A shared helper wrapping route handlers with:
- Auth check (optional or required per route)
- Rate limit enforcement
- Request body size validation
- Consistent error response format

### 5. Request Body Size Limits
- Via Next.js route segment config (`export const maxDuration`, body size)
- Default: 1MB for most routes
- `/api/extract-locations`: 100KB
- `/api/collab`: 500KB

## Implementation Order
1. [x] Security headers in `next.config.ts`
2. [x] CORS whitelist in `middleware.ts`
3. [x] Rate limiting (in-memory, Upstash Redis deferred — noted in implementation)
4. [x] Create `withApiSecurity()` wrapper
5. [x] Apply wrapper to all API routes
6. [x] Remove old in-memory rate limiting code from `collab/route.ts`

## Implementation Status
**Status:** Implemented — pending fixes from code review before merge.

### Issues to Fix Before Merge
- [ ] H1: Remove redundant `status` field from error response JSON bodies in `api-security.ts`
- [ ] H2: Create separate `nearbyLimiter` (20/min) and `resolveUrlLimiter` (20/min) — currently both use `publicProxyLimiter` (30/min)
- [ ] H3: Add SSRF host allowlist to `/api/resolve-url` (only allow known Google Maps short URL hosts)
- [ ] M5: Add `Access-Control-Allow-Credentials: true` to CORS preflight in `middleware.ts`

### Known Deviations from Plan
- Upstash Redis not implemented — using in-memory `RateLimiter` (acceptable for single-instance, revisit for multi-instance)
- `authLimiter` keys on IP, not user ID — per-user limiting not implemented
- `/api/auth/callback` not wrapped with `withApiSecurity` (intentional — Supabase handles token exchange limits)

### Review Report
See: `plans/features/reports/260318-code-reviewer-security-hardening-report.md`

## Not Included (YAGNI for now)
- Audit logging
- Abuse detection / IP blocking
- API key requirement for proxy endpoints
- Email confirmation enforcement
- WAF / DDoS protection (handled at hosting layer)
