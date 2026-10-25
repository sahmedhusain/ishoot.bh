"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "../../hooks/useTranslation";
import { accountPost, field, label, primaryButton, secondaryButton } from "./ui";

type Tab = "password" | "code" | "signUp";

/** Signing in to the website: password, an e-mailed code, a new account, or Google / Apple when set up. */
export function AccountSignIn({ locale, providers, notice, next }: { locale: string; providers: { google: boolean; apple: boolean }; notice: string; next: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("password");
  const [form, setForm] = React.useState({ name: "", email: "", password: "", code: "", marketingOptIn: false });
  const [codeSent, setCodeSent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  // A key the texts do not have comes back as its own path; fall back to the generic wording then.
  const known = (path: string, fallback: string) => (t(path) === path ? t(fallback) : t(path));
  const [error, setError] = React.useState(notice ? known(`account.signinNotices.${notice}`, "account.signinNotices.generic") : "");
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const errorText = (key: string) => known(`account.errors.${key}`, "account.errors.generic");
  const done = () => {
    if (next && /^\/(en|ar)\//.test(next)) router.push(next);
    router.refresh();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (tab === "password") await accountPost("sign-in", { email: form.email, password: form.password, locale });
      else if (tab === "signUp") await accountPost("sign-up", { name: form.name, email: form.email, password: form.password, marketingOptIn: form.marketingOptIn, locale });
      else if (!codeSent) {
        await accountPost("code", { email: form.email, locale });
        setCodeSent(true);
        return;
      } else await accountPost("code-verify", { email: form.email, code: form.code, name: form.name, locale });
      done();
    } catch (err) {
      setError(errorText(err instanceof Error ? err.message : "generic"));
    } finally {
      setBusy(false);
    }
  };

  const provider = (id: "google" | "apple") => `/api/account/${id}?locale=${locale}${next ? `&next=${encodeURIComponent(next)}` : ""}`;

  return (
    <div className="relative min-h-screen bg-brand-base text-ink">
      <div className="shell page-heading max-w-xl">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">{t("account.signInTitle")}</h1>
        <p className="mt-3 text-ink-muted">{t("account.signInSubtitle")}</p>

        <div role="tablist" aria-label={t("account.signInTitle")} className="mt-8 grid grid-cols-3 gap-2">
          {(["password", "code", "signUp"] as const).map((id) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setError(""); setCodeSent(false); }} className={`rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold transition-colors ${tab === id ? "bg-white/10 text-white" : "text-ink-muted hover:text-white"}`}>
              {t(`account.tabs.${id}`)}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-5" data-testid="account-form">
          {(tab === "signUp" || (tab === "code" && codeSent)) && (
            <label className="block space-y-2">
              <span className={label}>{t("account.name")}</span>
              <input name="name" autoComplete="name" required={tab === "signUp"} maxLength={120} value={form.name} onChange={(e) => set({ name: e.target.value })} className={field} />
            </label>
          )}
          <label className="block space-y-2">
            <span className={label}>{t("account.email")}</span>
            <input name="email" type="email" autoComplete="email" required dir="ltr" maxLength={254} readOnly={tab === "code" && codeSent} value={form.email} onChange={(e) => set({ email: e.target.value })} className={field} />
          </label>
          {tab !== "code" && (
            <label className="block space-y-2">
              <span className={label}>{t("account.password")}</span>
              <input name="password" type="password" autoComplete={tab === "signUp" ? "new-password" : "current-password"} required minLength={tab === "signUp" ? 8 : 1} maxLength={200} value={form.password} onChange={(e) => set({ password: e.target.value })} className={field} />
              {tab === "signUp" && <span className="block text-xs text-ink-muted">{t("account.passwordHint")}</span>}
            </label>
          )}
          {tab === "code" && codeSent && (
            <>
              <p role="status" className="text-sm text-ink-muted">{t("account.codeSent", { email: form.email })}</p>
              <label className="block space-y-2">
                <span className={label}>{t("account.code")}</span>
                <input name="code" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} dir="ltr" value={form.code} onChange={(e) => set({ code: e.target.value.replace(/\D/g, "") })} className={`${field} tracking-[0.4em] text-center text-lg`} />
              </label>
            </>
          )}
          {tab === "signUp" && (
            <label className="flex items-center gap-3 text-sm text-ink-muted">
              <input type="checkbox" checked={form.marketingOptIn} onChange={(e) => set({ marketingOptIn: e.target.checked })} className="h-4 w-4 accent-[var(--web-accent)]" />
              {t("account.marketing")}
            </label>
          )}
          {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
          <button type="submit" disabled={busy} className={`${primaryButton} w-full`} data-testid="account-submit">
            {busy ? t("account.working") : tab === "password" ? t("account.signIn") : tab === "signUp" ? t("account.signUp") : codeSent ? t("account.verify") : t("account.sendCode")}
          </button>
        </form>

        {(providers.google || providers.apple) && (
          <div className="mt-8 space-y-3">
            <p className="text-center text-xs text-ink-muted">{t("account.or")}</p>
            {providers.google && <a href={provider("google")} className={`${secondaryButton} w-full`}>{t("account.google")}</a>}
            {providers.apple && <a href={provider("apple")} className={`${secondaryButton} w-full`}>{t("account.apple")}</a>}
          </div>
        )}
      </div>
    </div>
  );
}
