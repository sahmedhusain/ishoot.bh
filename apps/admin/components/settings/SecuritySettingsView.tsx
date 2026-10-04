"use client";
import { useState } from "react";
import Link from "next/link";
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
    } catch (error) { setMessage(error instanceof Error ? error.message : "Failed"); }
    finally { setLoading(false); }
  }
  return <div className="max-w-xl space-y-5"><h1 className="text-xl font-bold">{t.securitySettings.accountSecurity}</h1><p>{enabled ? (t.securitySettings.mfaIsEnabled) : (t.securitySettings.mfaIsDisabled)}</p>
    <label className="block">{t.securitySettings.currentPassword}<input className="block rounded-lg border p-2 text-slate-900" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
    {!enabled && !secret && !codes.length ? <button disabled={loading || !password} onClick={() => submit("enroll")}>{t.securitySettings.setUpAuthenticator}</button> : null}
    {secret ? <div><p>{t.securitySettings.addThisSetupKeyTo}</p><code className="break-all">{secret}</code></div> : null}
    {enabled || secret ? <><label className="block">{t.securitySettings.authenticationOrRecoveryCode}<input className="block rounded-lg border p-2 text-slate-900" autoComplete="one-time-code" maxLength={32} value={code} onChange={(e) => setCode(e.target.value.trim())} /></label><button disabled={loading || !password || !code} onClick={() => submit(enabled ? "disable" : "confirm")}>{enabled ? (t.securitySettings.disableMfa) : (t.securitySettings.confirmSetup)}</button></> : null}
    {codes.length ? <div><p>{t.securitySettings.saveTheseCodesSecurelyThey}</p><pre>{codes.join("\n")}</pre></div> : null}
    {message ? <p role="status">{message}</p> : null}<Link href="/login">{t.securitySettings.signIn}</Link>
  </div>;
}
