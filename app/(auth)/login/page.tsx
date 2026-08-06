"use client";

import { Suspense, useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login, signInWithGoogle } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileWidget, type TurnstileWidgetHandle } from "@/components/turnstile-widget";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: "Google sign-in failed. Please try again.",
  no_admin_access: "That account doesn't have access to the admin portal.",
  missing_code: "Sign-in link was invalid or expired.",
  profile_missing: "Something went wrong setting up your account. Please try again.",
};

// useSearchParams() opts a component out of static prerendering unless
// wrapped in Suspense — isolated here so the rest of the page stays static.
function OAuthErrorBanner() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");
  if (!oauthError) return null;
  return (
    <p className="mt-4 text-sm text-destructive" role="alert">
      {OAUTH_ERROR_MESSAGES[oauthError] ?? "Something went wrong. Please try again."}
    </p>
  );
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);
  const [token, setToken] = useState("");
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);

  useEffect(() => {
    if (state?.message) {
      turnstileRef.current?.reset();
      setToken("");
    }
  }, [state]);

  return (
    <>
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="text-muted-foreground mt-1 text-sm">Admin &amp; Lister Portal</p>

      <Suspense fallback={null}>
        <OAuthErrorBanner />
      </Suspense>

      <form action={formAction} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
          {state?.errors?.email && (
            <p className="text-sm text-destructive">{state.errors.email[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-muted-foreground text-xs hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
          {state?.errors?.password && (
            <p className="text-sm text-destructive">{state.errors.password[0]}</p>
          )}
        </div>

        <input type="hidden" name="turnstileToken" value={token} />
        <TurnstileWidget ref={turnstileRef} action="login" onVerify={setToken} />

        {state?.message && (
          <p className="text-sm text-destructive" role="alert">
            {state.message}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending || !token}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs">or</span>
        <div className="bg-border h-px flex-1" />
      </div>

      <form action={signInWithGoogle}>
        <Button type="submit" variant="outline" className="w-full">
          Continue with Google
        </Button>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        Need access? Contact your administrator to create an account.
      </p>
    </>
  );
}
