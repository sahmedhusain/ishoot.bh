"use client";
import { useState } from "react";
import Link from "next/link";
import { useAdminLocale } from "../../hooks/useAdminLocale";
export function SecuritySettingsView({ enabled }: { enabled: boolean }) {
  const { isRTL } = useAdminLocale();
  const [password, setPassword] = useState(""), [code, setCode] = useState(""), [secret, setSecret] = useState(""), [codes, setCodes] = useState<string[]>([]), [message, setMessage] = useState(""), [loading, setLoading] = useState(false);
  async function submit(mode: string) {
    setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/auth/mfa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode, password, code }) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      if (data.secret) setSecret(data.secret);
      if (data.recoveryCodes) { setCodes(data.recoveryCodes); setSecret(""); setPassword(""); setCode(""); }
      if (mode !== "enroll") setMessage(isRTL ? "تم التحديث. سجل الدخول مرة أخرى." : "Updated. Sign in again.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Failed"); }
    finally { setLoading(false); }
  }
  return <div className="max-w-xl space-y-5"><h1 className="text-xl font-bold">{isRTL ? "أمان الحساب" : "Account security"}</h1><p>{enabled ? (isRTL ? "المصادقة الثنائية مفعلة" : "MFA is enabled") : (isRTL ? "المصادقة الثنائية غير مفعلة" : "MFA is disabled")}</p>
    <label className="block">{isRTL ? "كلمة المرور الحالية" : "Current password"}<input className="block rounded-lg border p-2 text-slate-900" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
    {!enabled && !secret && !codes.length ? <button disabled={loading || !password} onClick={() => submit("enroll")}>{isRTL ? "إعداد تطبيق المصادقة" : "Set up authenticator"}</button> : null}
    {secret ? <div><p>{isRTL ? "أضف المفتاح إلى تطبيق المصادقة وأدخل الرمز خلال عشر دقائق." : "Add this setup key to your authenticator and enter its code within ten minutes."}</p><code className="break-all">{secret}</code></div> : null}
    {enabled || secret ? <><label className="block">{isRTL ? "رمز المصادقة أو الاسترداد" : "Authentication or recovery code"}<input className="block rounded-lg border p-2 text-slate-900" autoComplete="one-time-code" maxLength={32} value={code} onChange={(e) => setCode(e.target.value.trim())} /></label><button disabled={loading || !password || !code} onClick={() => submit(enabled ? "disable" : "confirm")}>{enabled ? (isRTL ? "تعطيل المصادقة الثنائية" : "Disable MFA") : (isRTL ? "تأكيد الإعداد" : "Confirm setup")}</button></> : null}
    {codes.length ? <div><p>{isRTL ? "احفظ هذه الرموز بأمان. يظهر كل رمز مرة واحدة ويستخدم مرة واحدة." : "Save these codes securely. They are shown once and each works once."}</p><pre>{codes.join("\n")}</pre></div> : null}
    {message ? <p role="status">{message}</p> : null}<Link href="/login">{isRTL ? "تسجيل الدخول" : "Sign in"}</Link>
  </div>;
}
