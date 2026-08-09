"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileWidget, type TurnstileWidgetHandle } from "@/components/turnstile-widget";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(forgotPassword, undefined);
  const [token, setToken] = useState("");
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const [prevState, setPrevState] = useState(state);

  const sent = Boolean(state?.message && !state.errors);

  // A failed submission means the token was already consumed server-side —
  // clear it immediately (during render, not an effect: see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  // so the submit button disables right away instead of staying enabled
  // with a stale token. The actual widget reset is a real external-system
  // call, so that part stays in the effect below.
  if (state !== prevState) {
    setPrevState(state);
    if (state?.message && !sent) setToken("");
  }

  useEffect(() => {
    if (state?.message && !sent) {
      turnstileRef.current?.reset();
    }
  }, [state, sent]);

  if (sent) {
    return (
      <>
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="text-muted-foreground mt-2 text-sm">{state?.message}</p>
        <Link href="/login" className="mt-6 block">
          <Button variant="outline" className="w-full">
            Back to sign in
          </Button>
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Reset your password</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        We&rsquo;ll email you a link to reset it.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
          {state?.errors?.email && (
            <p className="text-sm text-destructive">{state.errors.email[0]}</p>
          )}
        </div>

        <input type="hidden" name="turnstileToken" value={token} />
        <TurnstileWidget ref={turnstileRef} action="forgot_password" onVerify={setToken} />

        <Button type="submit" className="w-full" disabled={pending || !token}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        <Link href="/login" className="text-foreground hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
