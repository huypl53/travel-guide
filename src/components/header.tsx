"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_IN") {
        router.push("/trips");
      }
      router.refresh();
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background px-3 py-2 sm:px-4 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2 font-semibold text-base sm:text-lg">
        <MapPin className="h-5 w-5" />
        Homestay Locator
      </Link>

      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="gap-2" />}>
            <UserIcon className="h-4 w-4" />
            <span className="max-w-[100px] sm:max-w-[150px] truncate text-sm">
              {user.email}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push("/trips")}>
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
