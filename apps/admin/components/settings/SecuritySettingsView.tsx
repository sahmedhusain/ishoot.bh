"use client";
import { useState } from "react";
import Link from "next/link";
import { KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
export function SecuritySettingsView({ enabled }: { enabled: boolean }) {
  const { t } = useAdminLocale();
  const [password, setPassword] = useState(""), [code, setCode] = useState(""), [secret, setSecret] = useState(""), [codes, setCodes] = useState<string[]>([]), [message, setMessage] = useState(""), [loading, setLoading] = useState(false);
  async function submit(mode: string) {
    setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/auth/mfa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode, password, code }) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      if (data.secret) setSecret(data.secret);
      if (data.recoveryCodes) { setCodes(data.recoveryCodes); setSecret(""); setPassword(""); setCode(""); }
      if (mode !== "enroll") setMessage(t.securitySettings.updatedSignInAgain);
    } catch (error) { setMessage(error instanceof Error && error.message ? error.message : t.securitySettings.failed); }
    finally { setLoading(false); }
  }
  const st = t.securitySettings;
  const field = "mt-1.5 block h-11 w-full rounded-xl border border-ink/15 bg-surface-sunken/60 px-3.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";
  const primary = "inline-flex items-center justify-center gap-2 h-11 rounded-full bg-primary px-6 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-40 transition-colors";
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      <header className="flex items-start gap-4">
        <span className="w-12 h-12 shrink-0 rounded-2xl bg-accent/10 text-accent flex items-center justify-center" aria-hidden>
          <ShieldCheck className="w-6 h-6" />
        </span>
        <div className="flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-ink">{st.accountSecurity}</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${enabled ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>
              {enabled ? st.statusOn : st.statusOff}
            </span>
          </div>
          <p className="text-sm text-ink-muted">{st.subtitle}</p>
        </div>
      </header>

      <section className="rounded-3xl border border-ink/10 bg-white dark:bg-surface-raised p-5 sm:p-6 shadow-xs space-y-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <KeyRound className="w-4 h-4 text-accent" aria-hidden />
          {enabled ? st.mfaIsEnabled : st.mfaIsDisabled}
        </p>
        <label className="block text-xs font-semibold text-ink">
          {st.currentPassword}
          <input className={field} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {!enabled && !secret && !codes.length ? (
          <button className={primary} disabled={loading || !password} onClick={() => submit("enroll")}>
            <Smartphone className="w-4 h-4" aria-hidden /> {st.setUpAuthenticator}
          </button>
        ) : null}
        {secret ? (
          <div className="space-y-2 rounded-2xl bg-surface-sunken/60 border border-ink/10 p-4">
            <p className="text-xs text-ink-muted">{st.addThisSetupKeyTo}</p>
            <code dir="ltr" className="block break-all font-mono text-sm font-semibold text-ink select-all">{secret}</code>
          </div>
        ) : null}
        {enabled || secret ? (
          <>
            <label className="block text-xs font-semibold text-ink">
              {st.authenticationOrRecoveryCode}
              <input className={`${field} font-mono tracking-widest`} dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={32} value={code} onChange={(e) => setCode(e.target.value.trim())} />
            </label>
            <button
              className={enabled ? "inline-flex items-center justify-center h-11 rounded-full border border-rose-500/40 px-6 text-sm font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 disabled:opacity-40" : primary}
              disabled={loading || !password || !code}
              onClick={() => submit(enabled ? "disable" : "confirm")}
            >
              {enabled ? st.disableMfa : st.confirmSetup}
            </button>
          </>
        ) : null}
        {codes.length ? (
          <div className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">{st.saveTheseCodesSecurelyThey}</p>
            <pre dir="ltr" className="grid grid-cols-2 gap-1 font-mono text-sm text-ink select-all">{codes.join("\n")}</pre>
          </div>
        ) : null}
        {message ? (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-sunken/60 border border-ink/10 px-4 py-3 text-sm text-ink">
            <span>{message}</span>
            <Link href="/login" className="font-semibold text-primary dark:text-mint hover:underline">{st.signIn}</Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
