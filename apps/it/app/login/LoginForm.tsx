"use client";

import * as React from "react";
import Link from "next/link";
import { formatMessage } from "@platform/locales";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { signInAction, type SignInState } from "../actions";
import { useCopy } from "../../components/CopyProvider";

export function LoginForm({
  branding,
}: {
  branding?: {
    isSetup: boolean;
    name: string;
    iconUrl: string | null;
  };
}) {
  const { copy } = useCopy();
  const c = copy.login;
  const [state, action, pending] = React.useActionState<SignInState, FormData>(
    signInAction,
    { step: "password" },
  );
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const otpStep = state.step === "otp";

  return (
    <div className="w-full max-w-md bg-white dark:bg-[#141f32] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden font-sans">
      <div className="bg-[#1a2b49] text-white p-6 text-center border-b border-[#243756]">
        <div className="flex items-center justify-center gap-2 font-bold tracking-tight">
          {branding?.isSetup && branding.iconUrl ? (
            <img
              src={branding.iconUrl}
              alt={branding.name}
              className="size-5 rounded object-contain shrink-0"
            />
          ) : null}
          <span className="text-white font-semibold text-sm tracking-tight">
            {branding?.name || copy.app.name}
          </span>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        <form action={action} className="space-y-4" noValidate>
          {state.error && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium"
            >
              {state.error === "invalid" ? c.invalid : c.unavailable}
            </div>
          )}

          <div className={otpStep ? "hidden" : "space-y-4"}>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {c.username || c.email}
              </span>
              <input
                name="username"
                type="text"
                autoComplete="username"
                placeholder={c.enterYourEmail || c.username}
                dir="ltr"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070d2]/30 focus:border-[#0070d2] transition-colors"
              />
            </label>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {c.password}
                </span>
                <Link
                  href="/login/forgot"
                  className="text-[11px] text-[#0070d2] hover:text-[#005fb2] dark:text-[#38bdf8] dark:hover:text-[#7dd3fc] font-medium transition-colors"
                >
                  {c.forgotPassword}
                </Link>
              </div>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                dir="ltr"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070d2]/30 focus:border-[#0070d2] transition-colors"
              />
            </div>
          </div>

          {otpStep && (
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {c.otp}
              </span>
              <input
                name="otp"
                inputMode="text"
                autoComplete="one-time-code"
                dir="ltr"
                autoFocus
                required
                maxLength={64}
                className="w-full text-xs py-2 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070d2]/30 focus:border-[#0070d2] transition-colors font-mono"
              />
              <span className="block text-[11px] text-slate-500">
                {formatMessage(c.otpHint, { digits: 6 })}
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-[#0070d2] hover:bg-[#005fb2] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <KeyRound className="size-4" />
            )}
            <span>{pending ? c.verifying : otpStep ? c.verify : c.submit}</span>
          </button>

          {otpStep && (
            <button
              type="button"
              className="w-full text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-center cursor-pointer"
              onClick={() => window.location.reload()}
            >
              {c.back}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
