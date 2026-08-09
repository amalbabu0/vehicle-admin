"use client";

import { Suspense, useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, ArrowRight } from "lucide-react";
import appIcon from "@/app/icon.png";
import { login, verifyLoginOtp } from "@/app/actions/auth";
import { useSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileWidget, type TurnstileWidgetHandle } from "@/components/turnstile-widget";
import { cn } from "@/lib/utils";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "Sign-in link was invalid or expired.",
  link_failed: "Sign-in link was invalid or expired.",
};

// Number of boxes drawn for the code. verifyOtpSchema accepts 4-10 digits
// server-side regardless of this value, so it's purely a display choice —
// keep it in sync with whatever length Supabase's Auth settings actually
// send (config.toml currently says 6).
const OTP_LENGTH = 6;

function formatTimer(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

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

/** Segmented one-time-code entry: `length` single-digit boxes that feed a
 * single hidden `name`-d input, so the surrounding <form action> sees one
 * plain string via FormData exactly like a normal text input would.
 * Uncontrolled by design — box values live on the DOM nodes themselves so
 * typing/pasting doesn't round-trip through React state on every keystroke. */
function OtpBoxes({ length, name, hasError, disabled }: { length: number; name: string; hasError?: boolean; disabled?: boolean }) {
  const boxesRef = useRef<(HTMLInputElement | null)[]>([]);
  const hiddenRef = useRef<HTMLInputElement>(null);

  const syncHidden = () => {
    if (hiddenRef.current) {
      hiddenRef.current.value = boxesRef.current.map((el) => el?.value ?? "").join("");
    }
  };

  const focusBox = (index: number) => {
    const box = boxesRef.current[Math.max(0, Math.min(index, length - 1))];
    box?.focus();
    box?.select();
  };

  const distribute = (startIndex: number, digits: string) => {
    let i = startIndex;
    for (const ch of digits) {
      if (i >= length) break;
      const box = boxesRef.current[i];
      if (box) box.value = ch;
      i++;
    }
    syncHidden();
    focusBox(i);
  };

  return (
    <div className="flex justify-between gap-1.5 sm:gap-2">
      <input ref={hiddenRef} type="hidden" name={name} />
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            boxesRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          autoFocus={index === 0}
          disabled={disabled}
          aria-label={`Digit ${index + 1}`}
          aria-invalid={hasError || undefined}
          className={cn(
            "h-11 w-full min-w-0 rounded-lg border border-input bg-transparent text-center text-lg font-semibold text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30 sm:h-12",
            hasError && "border-destructive focus-visible:ring-destructive/20"
          )}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(-1);
            e.target.value = digits;
            syncHidden();
            if (digits) focusBox(index + 1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              if (e.currentTarget.value) {
                e.currentTarget.value = "";
                syncHidden();
              } else if (index > 0) {
                e.preventDefault();
                const prev = boxesRef.current[index - 1];
                if (prev) prev.value = "";
                syncHidden();
                focusBox(index - 1);
              }
            } else if (e.key === "ArrowLeft" && index > 0) {
              e.preventDefault();
              focusBox(index - 1);
            } else if (e.key === "ArrowRight" && index < length - 1) {
              e.preventDefault();
              focusBox(index + 1);
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const digits = e.clipboardData.getData("text").replace(/\D/g, "");
            if (digits) distribute(index, digits);
          }}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useSupabaseBrowserClient();
  const [state, formAction, pending] = useActionState(login, undefined);
  const [otpState, otpFormAction, otpPending] = useActionState(verifyLoginOtp, undefined);
  const [token, setToken] = useState("");
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const [prevState, setPrevState] = useState(state);
  const [resendSeconds, setResendSeconds] = useState(59);
  const [otpResetKey, setOtpResetKey] = useState(0);
  const [prevOtpState, setPrevOtpState] = useState(otpState);

  // Same reasoning as forgot-password/page.tsx: clear the (now-consumed)
  // token during render rather than an effect; the widget reset itself is
  // a real external-system call, so that stays in the effect below.
  if (state !== prevState) {
    setPrevState(state);
    if (state?.message) setToken("");
    if (state?.otpRequired) setResendSeconds(59);
  }

  // Force a fresh mount of the OTP boxes (clearing every digit and
  // refocusing the first one) whenever a verify attempt just failed, so
  // the user isn't left retyping over a stale wrong code.
  if (otpState !== prevOtpState) {
    setPrevOtpState(otpState);
    if (otpState?.message) setOtpResetKey((k) => k + 1);
  }

  useEffect(() => {
    if (state?.message) {
      turnstileRef.current?.reset();
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

  useEffect(() => {
    if (!state?.otpRequired || resendSeconds <= 0) return;
    const id = setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [state?.otpRequired, resendSeconds]);

  return (
    <>
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <Image src={appIcon} alt="" width={40} height={40} className="size-10" priority />
        <h1 className="text-xl font-semibold">Sign in</h1>
      </div>

      <Suspense fallback={null}>
        <AuthErrorBanner />
      </Suspense>

      {state?.otpRequired ? (
        <form action={otpFormAction} className="mt-6 space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">We sent a sign-in code to</p>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm font-semibold">{state.email}</span>
            </div>
            <p className="text-sm text-muted-foreground">Enter it below to finish signing in.</p>
          </div>

          <input type="hidden" name="email" value={state.email} />

          <div className="space-y-2">
            <Label className="text-xs font-medium tracking-wider uppercase">Sign-in code</Label>
            <OtpBoxes length={OTP_LENGTH} name="otp" key={otpResetKey} hasError={!!otpState?.errors?.otp} disabled={otpPending} />
            {otpState?.errors?.otp && <p className="text-sm text-destructive">{otpState.errors.otp[0]}</p>}
          </div>

          {otpState?.message && (
            <p className="text-sm text-destructive" role="alert">
              {otpState.message}
            </p>
          )}

          <Button type="submit" size="lg" className="group w-full rounded-full" disabled={otpPending}>
            {otpPending ? "Verifying…" : "Verify and sign in"}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Button>

          <div className="space-y-2 border-t border-border pt-4 text-center">
            <p className="text-xs text-muted-foreground">
              {resendSeconds > 0 ? (
                <>
                  Resend code in <span className="font-semibold text-foreground">{formatTimer(resendSeconds)}</span>
                </>
              ) : (
                <Link href="/login" className="font-medium text-foreground hover:underline">
                  Resend code
                </Link>
              )}
            </p>
            <Link href="/login" className="block text-xs text-muted-foreground hover:text-foreground hover:underline">
              Wrong account? Start over
            </Link>
          </div>
        </form>
      ) : (
        <form action={formAction} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" name="email" type="email" autoComplete="email" className="pl-9" required />
            </div>
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
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="password" name="password" type="password" autoComplete="current-password" className="pl-9" required />
            </div>
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

          <Button type="submit" size="lg" className="group w-full rounded-full" disabled={pending || !token}>
            {pending ? "Signing in…" : "Sign in"}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </form>
      )}

      <p className="text-muted-foreground mt-6 text-center text-sm">
        Need access? Contact your administrator to create an account.
      </p>
    </>
  );
}
