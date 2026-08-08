"use client";

import { Suspense, useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { login, verifyAdminOtp } from "@/app/actions/auth";
import { useSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileWidget, type TurnstileWidgetHandle } from "@/components/turnstile-widget";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "Sign-in link was invalid or expired.",
  link_failed: "Sign-in link was invalid or expired.",
};

// useSearchParams() opts a component out of static prerendering unless
// wrapped in Suspense — isolated here so the rest of the page stays static.
function AuthErrorBanner() {
  const searchParams = useSearchParams();
  const errorKey = searchParams.get("error");
  if (!errorKey) return null;
  return (
    <p className="mt-4 text-sm text-destructive" role="alert">
      {ERROR_MESSAGES[errorKey] ?? "Something went wrong. Please try again."}
    </p>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useSupabaseBrowserClient();
  const [state, formAction, pending] = useActionState(login, undefined);
  const [otpState, otpFormAction, otpPending] = useActionState(verifyAdminOtp, undefined);
  const [token, setToken] = useState("");
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);

  useEffect(() => {
    if (state?.message) {
      turnstileRef.current?.reset();
      setToken("");
    }
  }, [state]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/");
      }
    });
  }, [supabase, router]);

  return (
    <>
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="text-muted-foreground mt-1 text-sm">Admin &amp; Lister Portal</p>

      <Suspense fallback={null}>
        <AuthErrorBanner />
      </Suspense>

      {state?.otpRequired ? (
        <form action={otpFormAction} className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            We sent a sign-in code to <span className="font-medium text-foreground">{state.email}</span>. Enter it below to finish signing in.
          </p>

          <input type="hidden" name="email" value={state.email} />

          <div className="space-y-2">
            <Label htmlFor="otp">Sign-in code</Label>
            <Input
              id="otp"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              placeholder="Enter the code from your email"
              className="text-center text-lg tracking-[0.3em]"
              required
            />
            {otpState?.errors?.otp && <p className="text-sm text-destructive">{otpState.errors.otp[0]}</p>}
          </div>

          {otpState?.message && (
            <p className="text-sm text-destructive" role="alert">
              {otpState.message}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={otpPending}>
            {otpPending ? "Verifying…" : "Verify and sign in"}
          </Button>

          <Link href="/login" className="block text-center text-xs text-muted-foreground hover:underline">
            Wrong account? Start over
          </Link>
        </form>
      ) : (
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
      )}

      <p className="text-muted-foreground mt-6 text-center text-sm">
        Need access? Contact your administrator to create an account.
      </p>
    </>
  );
}
