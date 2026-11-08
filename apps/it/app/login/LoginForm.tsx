"use client";

import * as React from "react";
import { Button, Card, Input } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { signInAction, type SignInState } from "../actions";
import { useCopy } from "../../components/CopyProvider";

export function LoginForm() {
  const { copy } = useCopy();
  const c = copy.login;
  const [state, action, pending] = React.useActionState<SignInState, FormData>(
    signInAction,
    { step: "password" },
  );
  // The password stays in the form for the code step: identity checks both together.
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const otpStep = state.step === "otp";

  return (
    <Card className="w-full max-w-md p-8 rounded-3xl bg-surface border border-outline-variant space-y-6">
      <div className="space-y-2 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-container text-on-primary-container">
          <ShieldCheck className="size-6" aria-hidden />
        </span>
        <h1 className="text-2xl font-bold text-ink">{c.title}</h1>
        <p className="text-sm text-ink-muted">{c.subtitle}</p>
      </div>
      <form action={action} className="space-y-4" noValidate>
        {state.error && (
          <p
            role="alert"
            className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-sm"
          >
            {state.error === "invalid" ? c.invalid : c.unavailable}
          </p>
        )}
        <div className={otpStep ? "hidden" : "space-y-4"}>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-ink">
              {c.username || "Username"}
            </span>
            <Input
              name="username"
              type="text"
              autoComplete="username"
              placeholder="e.g. BA0001"
              dir="ltr"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-ink">{c.password}</span>
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              dir="ltr"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </div>
        {otpStep && (
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-ink">{c.otp}</span>
            <Input
              name="otp"
              inputMode="text"
              autoComplete="one-time-code"
              dir="ltr"
              autoFocus
              required
              maxLength={64}
            />
            <span className="block text-[11px] text-ink-muted">
              {formatMessage(c.otpHint, { digits: 6 })}
            </span>
          </label>
        )}
        <Button
          type="submit"
          variant="primary"
          className="w-full gap-2"
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <KeyRound className="size-4" />
          )}
          {pending ? c.verifying : otpStep ? c.verify : c.submit}
        </Button>
        {otpStep && (
          <button
            type="button"
            className="w-full text-xs text-ink-muted hover:text-ink"
            onClick={() => window.location.reload()}
          >
            {c.back}
          </button>
        )}
      </form>
    </Card>
  );
}
