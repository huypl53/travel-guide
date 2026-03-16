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

type Mode = "sign-in" | "sign-up" | "magic-link" | "forgot-password";

export function AuthDialog() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("sign-in");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseBrowser();

  function resetState() {
    setMessage(null);
    setError(null);
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  }

  async function handleEmailPassword() {
    if (!email || !password) return;
    setLoading(true);
    resetState();

    if (mode === "sign-up") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Check your email to confirm your account.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      }
      // On success, onAuthStateChange in Header will handle the redirect
    }

    setLoading(false);
  }

  async function handleMagicLink() {
    if (!email) return;
    setLoading(true);
    resetState();
    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    setMessage("Check your email for a login link.");
    setLoading(false);
  }

  async function handleForgotPassword() {
    if (!email) return;
    setLoading(true);
    resetState();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback`,
    });
    setMessage("Check your email for a password reset link.");
    setLoading(false);
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Sign in
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "sign-up" ? "Create account" : mode === "forgot-password" ? "Reset password" : "Sign in"}
          </DialogTitle>
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

          {message ? (
            <p className="text-sm text-center text-muted-foreground">
              {message}
            </p>
          ) : (
            <>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); resetState(); }}
              />

              {mode === "sign-in" || mode === "sign-up" ? (
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); resetState(); }}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailPassword()}
                />
              ) : null}

              {error && (
                <p className="text-sm text-center text-destructive">{error}</p>
              )}

              {mode === "magic-link" ? (
                <Button onClick={handleMagicLink} disabled={loading || !email}>
                  {loading ? "Sending..." : "Send magic link"}
                </Button>
              ) : mode === "forgot-password" ? (
                <Button onClick={handleForgotPassword} disabled={loading || !email}>
                  {loading ? "Sending..." : "Send reset link"}
                </Button>
              ) : (
                <Button onClick={handleEmailPassword} disabled={loading || !email || !password}>
                  {loading ? "Loading..." : mode === "sign-up" ? "Sign up" : "Sign in"}
                </Button>
              )}

              <div className="flex flex-col gap-1 text-center text-sm text-muted-foreground">
                {mode === "sign-in" && (
                  <>
                    <button className="underline hover:text-foreground" onClick={() => { setMode("forgot-password"); resetState(); }}>
                      Forgot password?
                    </button>
                    <button className="underline hover:text-foreground" onClick={() => { setMode("sign-up"); resetState(); }}>
                      Don&apos;t have an account? Sign up
                    </button>
                    <button className="underline hover:text-foreground" onClick={() => { setMode("magic-link"); resetState(); }}>
                      Sign in with magic link instead
                    </button>
                  </>
                )}
                {mode === "sign-up" && (
                  <button className="underline hover:text-foreground" onClick={() => { setMode("sign-in"); resetState(); }}>
                    Already have an account? Sign in
                  </button>
                )}
                {(mode === "magic-link" || mode === "forgot-password") && (
                  <button className="underline hover:text-foreground" onClick={() => { setMode("sign-in"); resetState(); }}>
                    Back to sign in
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
