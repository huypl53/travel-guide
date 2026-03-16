# User Auth & Saved Trips Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Supabase Auth (Google OAuth + magic link) with a "My Trips" dashboard on the landing page for logged-in users, while preserving full anonymous access.

**Architecture:** Supabase Auth + RLS + `@supabase/ssr` for cookie-based server-side sessions. A Next.js middleware refreshes sessions. The landing page is a Server Component that conditionally renders My Trips (logged in) or the current anonymous landing (logged out). A `saved_trips` join table lets users bookmark shared trips.

**Tech Stack:** Next.js 16 App Router, Supabase Auth, `@supabase/ssr`, Zustand (unchanged), shadcn/ui, Tailwind CSS

---

### Task 1: Install `@supabase/ssr` dependency

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

Run: `npm install @supabase/ssr`

**Step 2: Verify installation**

Run: `npm ls @supabase/ssr`
Expected: `@supabase/ssr@x.x.x`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @supabase/ssr for server-side auth"
```

---

### Task 2: Database migration — add user_id, saved_trips, RLS

**Files:**
- Create: `supabase/migrations/002_auth_and_saved_trips.sql`

**Step 1: Write the migration**

```sql
-- Add user_id to trips (nullable for anonymous trips)
ALTER TABLE trips ADD COLUMN user_id uuid REFERENCES auth.users;
CREATE INDEX idx_trips_user_id ON trips(user_id);

-- Saved trips join table
CREATE TABLE saved_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES trips ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, trip_id)
);

-- Enable RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE distance_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_trips ENABLE ROW LEVEL SECURITY;

-- trips policies
CREATE POLICY "trips_select" ON trips FOR SELECT USING (
  user_id = auth.uid()
  OR user_id IS NULL
  OR share_slug IS NOT NULL
);

CREATE POLICY "trips_insert" ON trips FOR INSERT WITH CHECK (true);

CREATE POLICY "trips_update" ON trips FOR UPDATE USING (
  user_id = auth.uid() OR user_id IS NULL
);

CREATE POLICY "trips_delete" ON trips FOR DELETE USING (
  user_id = auth.uid() OR user_id IS NULL
);

-- locations policies (inherit from trip)
CREATE POLICY "locations_select" ON locations FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = locations.trip_id)
);

CREATE POLICY "locations_insert" ON locations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = locations.trip_id)
);

CREATE POLICY "locations_update" ON locations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = locations.trip_id)
);

CREATE POLICY "locations_delete" ON locations FOR DELETE USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = locations.trip_id)
);

-- distance_cache policies (inherit from trip)
CREATE POLICY "distance_cache_select" ON distance_cache FOR SELECT USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = distance_cache.trip_id)
);

CREATE POLICY "distance_cache_insert" ON distance_cache FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = distance_cache.trip_id)
);

CREATE POLICY "distance_cache_update" ON distance_cache FOR UPDATE USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = distance_cache.trip_id)
);

CREATE POLICY "distance_cache_delete" ON distance_cache FOR DELETE USING (
  EXISTS (SELECT 1 FROM trips WHERE trips.id = distance_cache.trip_id)
);

-- saved_trips policies
CREATE POLICY "saved_trips_select" ON saved_trips FOR SELECT USING (
  user_id = auth.uid()
);

CREATE POLICY "saved_trips_insert" ON saved_trips FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "saved_trips_delete" ON saved_trips FOR DELETE USING (
  user_id = auth.uid()
);
```

**Step 2: Apply migration to remote Supabase**

Run: `npx supabase db push`
Expected: Migration applied successfully. Verify in Supabase dashboard that `trips` has `user_id` column and `saved_trips` table exists.

**Step 3: Commit**

```bash
git add supabase/migrations/002_auth_and_saved_trips.sql
git commit -m "feat: add auth migration with user_id, saved_trips, and RLS policies"
```

---

### Task 3: Create Supabase server and browser client utilities

**Files:**
- Create: `src/lib/supabase-server.ts`
- Create: `src/lib/supabase-browser.ts`
- Modify: `src/lib/supabase.ts` (will be replaced by browser client)

**Step 1: Create the server client**

Create `src/lib/supabase-server.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from Server Component — ignore.
            // Middleware will handle the refresh.
          }
        },
      },
    }
  );
}
```

**Step 2: Create the browser client**

Create `src/lib/supabase-browser.ts`:

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Step 3: Update existing imports**

The existing `src/lib/supabase.ts` is used by:
- `src/app/api/trips/route.ts`
- `src/app/api/trips/[slug]/route.ts`
- `src/app/trip/[slug]/share/page.tsx`
- `src/components/share-export.tsx` (indirectly via fetch)

Replace the contents of `src/lib/supabase.ts` to re-export the server client for API routes and Server Components that already import from it:

```typescript
import { createClient } from "@supabase/supabase-js";

// Service-role-like client for API routes (no RLS — uses anon key directly).
// For auth-aware server operations, use createSupabaseServer() from supabase-server.ts instead.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

Keep `supabase.ts` unchanged for now — API routes will be migrated to use the server client in Task 7. This avoids breaking things before the middleware is in place.

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds (new files aren't imported yet, no breakage).

**Step 5: Commit**

```bash
git add src/lib/supabase-server.ts src/lib/supabase-browser.ts
git commit -m "feat: add Supabase server and browser client utilities"
```

---

### Task 4: Add Next.js middleware for session refresh

**Files:**
- Create: `src/middleware.ts`

**Step 1: Create the middleware**

Create `src/middleware.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
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

  // Refresh the session — this is the whole point of the middleware.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**Step 2: Verify dev server still works**

Run: `npm run dev` (manual check — pages load without errors)

**Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add Next.js middleware for Supabase session refresh"
```

---

### Task 5: Add auth callback route

**Files:**
- Create: `src/app/api/auth/callback/route.ts`

**Step 1: Create the callback route**

Create `src/app/api/auth/callback/route.ts`:

```typescript
import { createSupabaseServer } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If no code or exchange failed, redirect to home
  return NextResponse.redirect(`${origin}/`);
}
```

**Step 2: Commit**

```bash
git add src/app/api/auth/callback/route.ts
git commit -m "feat: add auth callback route for OAuth and magic link"
```

---

### Task 6: Update types

**Files:**
- Modify: `src/lib/types.ts`

**Step 1: Add new types**

Add to the end of `src/lib/types.ts`:

```typescript
export interface Trip {
  id: string;
  name: string;
  shareSlug: string;
  userId: string | null;
  createdAt: string;
  locations: Location[];
}

export interface SavedTrip {
  id: string;
  userId: string;
  tripId: string;
  savedAt: string;
}

export interface TripCardData {
  id: string;
  name: string;
  shareSlug: string;
  createdAt: string;
  homestayCount: number;
  destinationCount: number;
  topHomestay: string | null;
  isSaved: boolean; // true if from saved_trips table
}
```

**Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add Trip, SavedTrip, and TripCardData types"
```

---

### Task 7: Migrate API routes to use server client with auth

**Files:**
- Modify: `src/app/api/trips/route.ts`
- Modify: `src/app/api/trips/[slug]/route.ts`

**Step 1: Update POST /api/trips to attach user_id**

Replace contents of `src/app/api/trips/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const body = await request.json();
  const { name, locations } = body;

  if (!name) {
    return NextResponse.json({ error: "Missing trip name" }, { status: 400 });
  }

  // Get current user (null if anonymous)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const slug = nanoid(10);

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .insert({ name, share_slug: slug, user_id: user?.id ?? null })
    .select()
    .single();

  if (tripError) {
    return NextResponse.json({ error: tripError.message }, { status: 500 });
  }

  if (locations?.length > 0) {
    const rows = locations.map(
      (loc: {
        type: string;
        name: string;
        address?: string;
        lat: number;
        lon: number;
        priority?: number;
        source?: string;
      }) => ({
        trip_id: trip.id,
        type: loc.type,
        name: loc.name,
        address: loc.address ?? null,
        lat: loc.lat,
        lon: loc.lon,
        priority: loc.priority ?? 3,
        source: loc.source ?? "manual",
      })
    );

    const { error: locError } = await supabase.from("locations").insert(rows);
    if (locError) {
      return NextResponse.json({ error: locError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ slug: trip.share_slug, id: trip.id });
}
```

**Step 2: Add DELETE handler to /api/trips/[slug]**

Replace contents of `src/app/api/trips/[slug]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createSupabaseServer();

  const { data: trip, error } = await supabase
    .from("trips")
    .select("*, locations(*)")
    .eq("share_slug", slug)
    .single();

  if (error || !trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  return NextResponse.json(trip);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // First check if it's a saved trip (bookmark) — if so, just remove the bookmark
  const { data: trip } = await supabase
    .from("trips")
    .select("id, user_id")
    .eq("share_slug", slug)
    .single();

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  if (trip.user_id === user.id) {
    // User owns this trip — delete it
    const { error } = await supabase.from("trips").delete().eq("id", trip.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // User saved this trip — remove the bookmark
    const { error } = await supabase
      .from("saved_trips")
      .delete()
      .eq("user_id", user.id)
      .eq("trip_id", trip.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/app/api/trips/route.ts src/app/api/trips/[slug]/route.ts
git commit -m "feat: migrate trip API routes to server client with auth support"
```

---

### Task 8: Add saved trips API route

**Files:**
- Create: `src/app/api/saved-trips/route.ts`

**Step 1: Create the route**

Create `src/app/api/saved-trips/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = await request.json();

  const { error } = await supabase
    .from("saved_trips")
    .insert({ user_id: user.id, trip_id: tripId });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = await request.json();

  const { error } = await supabase
    .from("saved_trips")
    .delete()
    .eq("user_id", user.id)
    .eq("trip_id", tripId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

**Step 2: Commit**

```bash
git add src/app/api/saved-trips/route.ts
git commit -m "feat: add saved-trips API route for bookmarking shared trips"
```

---

### Task 9: Build the auth dialog component

**Files:**
- Create: `src/components/auth-dialog.tsx`

**Step 1: Create the component**

Create `src/components/auth-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthDialog() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createSupabaseBrowser();

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  }

  async function handleMagicLink() {
    if (!email) return;
    setLoading(true);
    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Sign in
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Button variant="outline" onClick={handleGoogle}>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {sent ? (
            <p className="text-sm text-center text-muted-foreground">
              Check your email for a login link.
            </p>
          ) : (
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
              />
              <Button onClick={handleMagicLink} disabled={loading || !email}>
                {loading ? "Sending..." : "Send link"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/auth-dialog.tsx
git commit -m "feat: add auth dialog with Google OAuth and magic link"
```

---

### Task 10: Build the header component

**Files:**
- Create: `src/components/header.tsx`

**Step 1: Create the component**

Create `src/components/header.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, MapPin, User as UserIcon } from "lucide-react";

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      router.refresh();
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <header className="border-b px-4 py-2 flex items-center justify-between">
      <a href="/" className="flex items-center gap-2 font-semibold text-lg">
        <MapPin className="h-5 w-5" />
        Homestay Locator
      </a>

      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <UserIcon className="h-4 w-4" />
              <span className="max-w-[150px] truncate text-sm">
                {user.email}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push("/")}>
              My Trips
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <AuthDialog />
      )}
    </header>
  );
}
```

**Step 2: Add Header to root layout**

Modify `src/app/layout.tsx` — add the Header import and render it above `{children}`:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Homestay Locator",
  description:
    "Find the best homestay based on proximity to the places you want to visit",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Header />
        {children}
      </body>
    </html>
  );
}
```

**Step 3: Verify dev server**

Run: `npm run dev`
Expected: Header renders with "Sign in" button on all pages. Existing pages still work.

**Step 4: Commit**

```bash
git add src/components/header.tsx src/app/layout.tsx
git commit -m "feat: add persistent header with auth state to root layout"
```

---

### Task 11: Build the trip card component

**Files:**
- Create: `src/components/trip-card.tsx`
- Test: `src/components/__tests__/trip-card.test.tsx`

**Step 1: Write the failing test**

Create `src/components/__tests__/trip-card.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TripCard } from "../trip-card";
import type { TripCardData } from "@/lib/types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const baseTripCard: TripCardData = {
  id: "trip-1",
  name: "Da Lat Trip",
  shareSlug: "abc123",
  createdAt: new Date().toISOString(),
  homestayCount: 3,
  destinationCount: 5,
  topHomestay: "Mountain View Lodge",
  isSaved: false,
};

describe("TripCard", () => {
  it("renders trip name and counts", () => {
    render(<TripCard trip={baseTripCard} onDelete={vi.fn()} />);
    expect(screen.getByText("Da Lat Trip")).toBeDefined();
    expect(screen.getByText(/3 homestays/)).toBeDefined();
    expect(screen.getByText(/5 destinations/)).toBeDefined();
  });

  it("renders top homestay name", () => {
    render(<TripCard trip={baseTripCard} onDelete={vi.fn()} />);
    expect(screen.getByText(/Mountain View Lodge/)).toBeDefined();
  });

  it("shows Saved badge when isSaved is true", () => {
    const saved = { ...baseTripCard, isSaved: true };
    render(<TripCard trip={saved} onDelete={vi.fn()} />);
    expect(screen.getByText("Saved")).toBeDefined();
  });

  it("does not show Saved badge when isSaved is false", () => {
    render(<TripCard trip={baseTripCard} onDelete={vi.fn()} />);
    expect(screen.queryByText("Saved")).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/trip-card.test.tsx`
Expected: FAIL — module not found

**Step 3: Create the component**

Create `src/components/trip-card.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TripCardData } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Trash2 } from "lucide-react";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface TripCardProps {
  trip: TripCardData;
  onDelete: (trip: TripCardData) => void;
}

export function TripCard({ trip, onDelete }: TripCardProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/trip/${trip.shareSlug}/share`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    onDelete(trip);
  }

  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => router.push(`/trip/${trip.shareSlug}`)}
    >
      <CardContent className="p-4 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{trip.name}</h3>
            {trip.isSaved && (
              <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                Saved
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {trip.homestayCount} homestays, {trip.destinationCount} destinations
            &middot; {timeAgo(trip.createdAt)}
          </p>
          {trip.topHomestay && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Top: {trip.topHomestay}
            </p>
          )}
        </div>
        <div className="flex gap-1 ml-2 shrink-0">
          <Button variant="ghost" size="icon" onClick={handleShare} title="Copy share link">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 4: Run tests**

Run: `npx vitest run src/components/__tests__/trip-card.test.tsx`
Expected: All 4 tests PASS.

**Step 5: Commit**

```bash
git add src/components/trip-card.tsx src/components/__tests__/trip-card.test.tsx
git commit -m "feat: add TripCard component with tests"
```

---

### Task 12: Build the My Trips list component

**Files:**
- Create: `src/components/my-trips-list.tsx`

**Step 1: Create the component**

Create `src/components/my-trips-list.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import type { TripCardData } from "@/lib/types";
import { TripCard } from "@/components/trip-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface MyTripsListProps {
  initialTrips: TripCardData[];
}

export function MyTripsList({ initialTrips }: MyTripsListProps) {
  const [trips, setTrips] = useState(initialTrips);
  const [deleteTarget, setDeleteTarget] = useState<TripCardData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  function handleNewTrip() {
    const slug = nanoid(10);
    router.push(`/trip/${slug}`);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    await fetch(`/api/trips/${deleteTarget.shareSlug}`, { method: "DELETE" });

    setTrips((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleting(false);
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Trips</h1>
        <Button onClick={handleNewTrip}>New Trip</Button>
      </div>

      {trips.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No trips yet. Create your first one!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete trip?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteTarget?.isSaved
              ? `Remove "${deleteTarget.name}" from your saved trips?`
              : `Permanently delete "${deleteTarget?.name}" and all its locations?`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/my-trips-list.tsx
git commit -m "feat: add MyTripsList component with delete confirmation"
```

---

### Task 13: Update landing page for conditional rendering

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Rewrite page.tsx as a Server Component**

Replace contents of `src/app/page.tsx`:

```tsx
import { createSupabaseServer } from "@/lib/supabase-server";
import { MyTripsList } from "@/components/my-trips-list";
import { AnonLanding } from "@/components/anon-landing";
import type { TripCardData } from "@/lib/types";
import { rankHomestays } from "@/lib/ranking";

export default async function HomePage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <AnonLanding />;
  }

  // Fetch user's own trips
  const { data: ownTrips } = await supabase
    .from("trips")
    .select("id, name, share_slug, created_at, locations(type, name, lat, lon, priority)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch saved trips
  const { data: savedRows } = await supabase
    .from("saved_trips")
    .select("trip_id, trips(id, name, share_slug, created_at, locations(type, name, lat, lon, priority))")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });

  function toCardData(
    trip: {
      id: string;
      name: string;
      share_slug: string;
      created_at: string;
      locations: { type: string; name: string; lat: number; lon: number; priority: number }[];
    },
    isSaved: boolean
  ): TripCardData {
    const homestays = trip.locations?.filter((l) => l.type === "homestay") ?? [];
    const destinations = trip.locations?.filter((l) => l.type === "destination") ?? [];

    let topHomestay: string | null = null;
    if (homestays.length > 0 && destinations.length > 0) {
      const ranked = rankHomestays(
        homestays.map((h, i) => ({
          id: `h${i}`, tripId: "", type: "homestay" as const,
          name: h.name, address: null, lat: h.lat, lon: h.lon,
          priority: 3, source: "manual" as const,
        })),
        destinations.map((d, i) => ({
          id: `d${i}`, tripId: "", type: "destination" as const,
          name: d.name, address: null, lat: d.lat, lon: d.lon,
          priority: d.priority, source: "manual" as const,
        }))
      );
      topHomestay = ranked[0]?.homestay.name ?? null;
    }

    return {
      id: trip.id,
      name: trip.name || "Untitled Trip",
      shareSlug: trip.share_slug,
      createdAt: trip.created_at,
      homestayCount: homestays.length,
      destinationCount: destinations.length,
      topHomestay,
      isSaved,
    };
  }

  const tripCards: TripCardData[] = [
    ...(ownTrips ?? []).map((t) => toCardData(t, false)),
    ...(savedRows ?? [])
      .filter((r) => r.trips)
      .map((r) => toCardData(r.trips as unknown as {
        id: string; name: string; share_slug: string; created_at: string;
        locations: { type: string; name: string; lat: number; lon: number; priority: number }[];
      }, true)),
  ];

  return <MyTripsList initialTrips={tripCards} />;
}
```

**Step 2: Extract anonymous landing into its own component**

Create `src/components/anon-landing.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { nanoid } from "nanoid";

export function AnonLanding() {
  const router = useRouter();

  function handleNewTrip() {
    const slug = nanoid(10);
    router.push(`/trip/${slug}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-4xl font-bold text-center">Homestay Locator</h1>
      <p className="text-muted-foreground text-center max-w-md">
        Find the best homestay based on proximity to the places you want to
        visit. Add homestays and destinations, and we&apos;ll rank them for you.
      </p>
      <Button size="lg" onClick={handleNewTrip}>
        New Trip
      </Button>
    </div>
  );
}
```

**Step 3: Verify dev server**

Run: `npm run dev`
Expected: Anonymous users see the original landing page. (Logged-in tested after Google OAuth is configured in Supabase dashboard.)

**Step 4: Commit**

```bash
git add src/app/page.tsx src/components/anon-landing.tsx
git commit -m "feat: conditional landing page — My Trips for logged-in, anon landing for guests"
```

---

### Task 14: Update share page with "Save to My Trips" button

**Files:**
- Modify: `src/app/trip/[slug]/share/page.tsx`

**Step 1: Update the share page**

Replace contents of `src/app/trip/[slug]/share/page.tsx`:

```tsx
import { createSupabaseServer } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { SaveTripButton } from "@/components/save-trip-button";

export default async function SharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServer();

  const { data: trip } = await supabase
    .from("trips")
    .select("*, locations(*)")
    .eq("share_slug", slug)
    .single();

  if (!trip) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if already saved
  let alreadySaved = false;
  if (user) {
    const { data } = await supabase
      .from("saved_trips")
      .select("id")
      .eq("user_id", user.id)
      .eq("trip_id", trip.id)
      .maybeSingle();
    alreadySaved = !!data;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">{trip.name}</h1>
          <p className="text-sm text-muted-foreground">
            Shared trip — read only
          </p>
        </div>
        {user && trip.user_id !== user.id && (
          <SaveTripButton tripId={trip.id} initialSaved={alreadySaved} />
        )}
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h2 className="font-semibold mb-2">Homestays</h2>
          <ul className="space-y-1">
            {trip.locations
              ?.filter((l: { type: string }) => l.type === "homestay")
              .map((l: { id: string; name: string }) => (
                <li key={l.id} className="text-sm">
                  {l.name}
                </li>
              ))}
          </ul>
        </div>
        <div>
          <h2 className="font-semibold mb-2">Destinations</h2>
          <ul className="space-y-1">
            {trip.locations
              ?.filter((l: { type: string }) => l.type === "destination")
              .map(
                (l: { id: string; name: string; priority: number }) => (
                  <li key={l.id} className="text-sm">
                    {l.name} (priority: {l.priority})
                  </li>
                )
              )}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create SaveTripButton component**

Create `src/components/save-trip-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck } from "lucide-react";

interface SaveTripButtonProps {
  tripId: string;
  initialSaved: boolean;
}

export function SaveTripButton({ tripId, initialSaved }: SaveTripButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const method = saved ? "DELETE" : "POST";
    await fetch("/api/saved-trips", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId }),
    });
    setSaved(!saved);
    setLoading(false);
  }

  return (
    <Button variant="outline" size="sm" onClick={toggle} disabled={loading}>
      {saved ? (
        <>
          <BookmarkCheck className="h-4 w-4 mr-1" /> Saved
        </>
      ) : (
        <>
          <Bookmark className="h-4 w-4 mr-1" /> Save to My Trips
        </>
      )}
    </Button>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/trip/[slug]/share/page.tsx src/components/save-trip-button.tsx
git commit -m "feat: add Save to My Trips button on shared trip page"
```

---

### Task 15: Update share-export to use auth-aware trip creation

**Files:**
- Modify: `src/components/share-export.tsx`

**Step 1: No code changes needed**

`share-export.tsx` already calls `POST /api/trips` via `fetch`. Since Task 7 updated that route to read the user from cookies and attach `user_id`, this component automatically works with auth — the browser sends cookies with the fetch request.

Verify: read the component to confirm it uses a relative URL (`/api/trips`) — it does. No changes needed.

**Step 2: Skip — nothing to commit**

---

### Task 16: Configure Supabase Auth providers

**Files:**
- No code files — Supabase dashboard configuration

**Step 1: Enable Google OAuth in Supabase**

1. Go to Supabase dashboard → Authentication → Providers
2. Enable Google provider
3. Create OAuth credentials in Google Cloud Console:
   - Authorized redirect URI: `https://thvdhnyxzkfbldvyxliy.supabase.co/auth/v1/callback`
4. Paste Client ID and Client Secret into Supabase dashboard
5. Save

**Step 2: Verify email templates**

1. Go to Authentication → Email Templates
2. Check that the magic link template has correct redirect URL
3. The default template works — no changes needed unless you want custom branding

**Step 3: Add Site URL**

1. Go to Authentication → URL Configuration
2. Set Site URL to your deployed URL (or `http://localhost:3000` for dev)
3. Add `http://localhost:3000/api/auth/callback` to Redirect URLs

**Step 4: No commit — dashboard config only**

---

### Task 17: Run full test suite and verify build

**Files:**
- No new files

**Step 1: Run existing tests**

Run: `npx vitest run`
Expected: All existing tests pass. New trip-card tests pass.

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no type errors.

**Step 3: Manual smoke test**

1. Start dev server: `npm run dev`
2. Visit `/` — see anonymous landing page
3. Click "Sign in" — auth dialog opens
4. Sign in with Google (if configured) or magic link
5. After sign in, `/` shows "My Trips" (empty)
6. Click "New Trip" — creates trip, workspace loads
7. Add locations, click "Share" — trip saves with user_id
8. Return to `/` — trip appears in My Trips list
9. Open share link in incognito — read-only view works
10. Sign in in incognito — "Save to My Trips" button appears
11. Delete trip from My Trips list — confirmation dialog, then removed

**Step 4: Commit if any fixes were needed**

---

### Task 18: Update README and architecture docs

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`

**Step 1: Update README**

Add an "Authentication" section describing:
- Google OAuth and magic link sign-in
- My Trips dashboard for logged-in users
- Save shared trips feature
- Anonymous users retain full access

**Step 2: Update architecture docs**

Add sections for:
- Authentication architecture (Supabase Auth + RLS + SSR)
- New components (Header, AuthDialog, TripCard, MyTripsList, SaveTripButton)
- Database schema changes (user_id on trips, saved_trips table, RLS policies)
- Auth callback route
- Middleware

**Step 3: Commit**

```bash
git add README.md docs/architecture.md
git commit -m "docs: update README and architecture for auth and saved trips"
```
