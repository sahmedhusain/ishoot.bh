"use client";
import {ContentImage} from "../shared/ContentImage";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input, Button, Card } from "@ishoot/ui";
import { Lock, Mail, ArrowRight, AlertCircle, Globe } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function AdminLoginFormView({ companyName,logoUrl,iconUrl }: { companyName?: string;logoUrl?:string;iconUrl?:string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCallback = searchParams.get("callbackUrl") || "/dashboard";
  const callbackUrl = requestedCallback.startsWith("/") && !requestedCallback.startsWith("//") && !requestedCallback.includes("\\") ? requestedCallback : "/dashboard";
  const { t, locale, setLocale, isRTL } = useAdminLocale();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [mfaRequired, setMfaRequired] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleToggleLocale = () => {
    setLocale(locale === "ar" ? "en" : "ar");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, otp }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.mfaRequired) setMfaRequired(true);
        setErrorMessage(
          res.status === 401
            ? t.loginView.errorInvalid
            : data.error || t.loginView.errorGeneric,
        );
        setLoading(false);
        return;
      }

      router.replace(callbackUrl);
    } catch {
      setErrorMessage(t.loginView.errorGeneric);
      setLoading(false);
    }
  };

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen flex items-center justify-center p-6 bg-[#050807] relative overflow-hidden"
    >
      <div className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#014842]/30 via-[#09937F]/10 to-transparent blur-3xl pointer-events-none" />

      <div className="absolute top-6 end-6 z-20">
        <button
          type="button"
          onClick={handleToggleLocale}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-[#9EADA9] hover:text-white transition-all backdrop-blur-md"
        >
          <Globe className="w-3.5 h-3.5 text-[#09937F]" />
          <span>{t.loginView.switchLanguage}</span>
        </button>
      </div>

      <Card className="relative z-10 w-full max-w-md p-8 sm:p-10 bg-[#0B1210] border border-[#09937F]/30 shadow-2xl rounded-3xl space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <ContentImage
              width={40} height={40} src={iconUrl}
              alt={companyName || ""}
              className="h-10 w-auto object-contain shrink-0 filter drop-shadow-[0_0_12px_rgba(9,147,127,0.3)]"
            />
            <ContentImage
              width={240} height={60} src={logoUrl}
              alt={companyName || ""}
              className="h-7 w-auto object-contain"
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white tracking-tight font-display">
              {companyName ? (
                <span>{companyName}</span>
              ) : (
                <span>{t.portalTitle}</span>
              )}
            </h1>
            <p className="text-xs text-[#9EADA9] tracking-wider uppercase">
              {t.loginView.subtitle}
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#9EADA9]">
              {t.loginView.emailLabel}
            </label>
            <div className="relative">
              <Mail
                className={`w-4 h-4 absolute top-3.5 text-[#9EADA9] ${
                  isRTL ? "right-3.5" : "left-3.5"
                }`}
              />
              <Input
                type="email"
                required
                autoComplete="email"
                placeholder={t.loginView.emailPlaceholder}
                className={isRTL ? "pr-10" : "pl-10"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#9EADA9]">
                {t.loginView.passwordLabel}
              </label>
              <button type="button" onClick={() => router.push("/login/forgot")} className="text-[11px] text-[#09937F] hover:text-white transition-colors">
                {isRTL ? "هل نسيت كلمة المرور؟" : "Forgot password?"}
              </button>
            </div>
            <div className="relative">
              <Lock
                className={`w-4 h-4 absolute top-3.5 text-[#9EADA9] ${
                  isRTL ? "right-3.5" : "left-3.5"
                }`}
              />
              <Input
                type="password"
                required
                autoComplete="current-password"
                placeholder={t.loginView.passwordPlaceholder}
                className={isRTL ? "pr-10" : "pl-10"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {mfaRequired && <label className="block text-xs text-white">{isRTL ? "رمز المصادقة أو رمز الاسترداد" : "Authentication or recovery code"}<Input autoComplete="one-time-code" value={otp} maxLength={32} onChange={(e) => setOtp(e.target.value.trim())} required /></label>}

          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            size="lg"
            className="w-full gap-2 mt-4"
          >
            <span>
              {loading ? t.loginView.authenticating : t.loginView.submit}
            </span>
            <ArrowRight className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          </Button>
        </form>

        <div className="text-center text-[11px] text-[#9EADA9]/60">
          {t.loginView.footerNote}
        </div>
      </Card>
    </div>
  );
}
