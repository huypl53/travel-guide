import { createSupabaseServer } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Detect password recovery: check if recovery was sent recently (within 10 min)
      const recoverySentAt = data.session?.user?.recovery_sent_at;
      if (recoverySentAt) {
        const recoveryTime = new Date(recoverySentAt).getTime();
        const now = Date.now();
        if (now - recoveryTime < 10 * 60 * 1000) {
          return NextResponse.redirect(`${origin}/reset-password`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
