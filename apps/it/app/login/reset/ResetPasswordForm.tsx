"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Lock, ShieldAlert } from "lucide-react";
import { resetPasswordAction, type ResetPasswordState } from "../../actions";
import { useCopy } from "../../../components/CopyProvider";

export function ResetPasswordForm({
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
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [state, action, pending] = React.useActionState<ResetPasswordState, FormData>(
    resetPasswordAction,
    {},
  );
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const mismatch = Boolean(confirmPassword && password !== confirmPassword);

  return (
    <div className="w-full max-w-md bg-white dark:bg-[#141f32] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden font-sans">
      <div className="bg-[#1a2b49] text-white p-6 text-center border-b border-[#243756]">
        <div className="flex items-center justify-center gap-2 font-bold tracking-tight mb-2">
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
        <h1 className="text-base font-bold text-white tracking-tight">
          {c.resetPasswordTitle}
        </h1>
        <p className="text-xs text-slate-300 mt-1">
          {c.resetPasswordSubtitle}
        </p>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {state.success ? (
          <div className="space-y-4">
            <div
              role="status"
              className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-start gap-2.5"
            >
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
              <span>{c.passwordResetSuccess}</span>
            </div>

            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-[#0070d2] hover:bg-[#005fb2] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer text-decoration-none"
            >
              <ArrowLeft className="size-4" />
              <span>{c.backToLogin}</span>
            </Link>
          </div>
        ) : !token ? (
          <div className="space-y-4">
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium"
            >
              {c.invalidToken}
            </div>

            <Link
              href="/login/forgot"
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-[#0070d2] hover:bg-[#005fb2] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer text-decoration-none"
            >
              <ArrowLeft className="size-4" />
              <span>{c.forgotPasswordTitle}</span>
            </Link>
          </div>
        ) : (
          <form action={action} className="space-y-4" noValidate>
            {state.error && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium"
              >
                {state.error === "mismatch"
                  ? c.passwordsDoNotMatch
                  : state.error === "invalid_token"
                    ? c.invalidToken
                    : c.unavailable}
              </div>
            )}

            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="email" value={email} />

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {c.newPassword}
              </span>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                dir="ltr"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070d2]/30 focus:border-[#0070d2] transition-colors"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {c.confirmPassword}
              </span>
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                dir="ltr"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070d2]/30 focus:border-[#0070d2] transition-colors"
              />
              {mismatch && (
                <span className="block text-[11px] text-rose-500 font-medium">
                  {c.passwordsDoNotMatch}
                </span>
              )}
            </label>

            <button
              type="submit"
              disabled={pending || mismatch}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-[#0070d2] hover:bg-[#005fb2] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Lock className="size-4" />
              )}
              <span>{pending ? c.verifying : c.resetPasswordSubmit}</span>
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                <span>{c.backToLogin}</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
