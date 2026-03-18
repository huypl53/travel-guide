import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_ORIGINS: string[] = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");

  // CORS protection for API routes
  if (pathname.startsWith("/api/")) {
    // Block requests with a disallowed origin
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Handle preflight OPTIONS requests
    if (request.method === "OPTIONS") {
      const preflightHeaders: Record<string, string> = {
        "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      };
      if (origin) {
        preflightHeaders["Access-Control-Allow-Origin"] = origin;
      }
      return new NextResponse(null, { status: 204, headers: preflightHeaders });
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  // If the request has a `code` query param, redirect to the auth callback
  // This handles cases where Supabase redirects to the site URL instead of /api/auth/callback
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  if (code && !request.nextUrl.pathname.startsWith("/api/auth/callback")) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/api/auth/callback";
    return NextResponse.redirect(callbackUrl);
  }

  // Add CORS header for allowed origins on API responses
  if (pathname.startsWith("/api/") && origin && ALLOWED_ORIGINS.includes(origin)) {
    supabaseResponse.headers.set("Access-Control-Allow-Origin", origin);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
