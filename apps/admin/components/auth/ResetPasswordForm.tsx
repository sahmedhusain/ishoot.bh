"use client";
import type { AuthBrandingProps } from "../../types/auth";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input, Button, Card } from "@ishoot/ui";
import { Lock, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { ContentImage } from "../shared/ContentImage";

export function ResetPasswordForm({ companyName, logoUrl, iconUrl }: AuthBrandingProps) {
  const { t } = useAdminLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!token || !email) {
      setError(t.resetPasswordForm.invalidOrMissingPasswordReset);
    }
  }, [token, email, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !email) return;
    if (password.length < 8) {
      setError(t.resetPasswordForm.passwordMustBeAtLeast);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword: password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(t.resetPasswordForm.passwordSuccessfullyResetYouCan);
      setTimeout(() => router.push("/login"), 3000);
    } catch(err: any) {
      setError(err.message || t.resetPasswordForm.failedToResetPassword);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#050807] relative overflow-hidden">
      <Card className="relative z-10 w-full max-w-md p-8 sm:p-10 bg-[#0B1210] border border-accent/30 shadow-2xl rounded-3xl space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <ContentImage width={40} height={40} src={iconUrl ?? undefined} alt={companyName} className="h-10 w-auto object-contain shrink-0 filter drop-shadow-[0_0_12px_rgba(9,147,127,0.3)]" />
            <ContentImage width={240} height={60} src={logoUrl ?? undefined} alt={companyName} className="h-7 w-auto object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight font-display">{t.resetPasswordForm.createNewPassword}</h1>
            <p className="text-xs text-[#9EADA9] uppercase">{t.resetPasswordForm.setAStrongPasswordFor}</p>
          </div>
        </div>

        {error && <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span></div>}
        {message && <div className="p-3.5 rounded-xl bg-accent/15 border border-accent/30 flex items-start gap-2.5 text-xs text-accent"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /><span>{message}</span></div>}

        {!message && !error && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">{t.resetPasswordForm.newPassword}</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute top-3.5 left-3.5 text-[#9EADA9]" />
                <Input type="password" required placeholder={t.resetPasswordForm.min8Characters} minLength={8} className="pl-10" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={loading} variant="primary" size="lg" className="w-full gap-2 mt-4">
              <span>{loading ? "Resetting..." : t.resetPasswordForm.resetPassword}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
