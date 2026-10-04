"use client";
import type { AuthBrandingProps } from "../../types/auth";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Input, Button, Card } from "@ishoot/ui";
import { Mail, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { ContentImage } from "../shared/ContentImage";

export function ForgotPasswordForm({ companyName, logoUrl, iconUrl }: AuthBrandingProps) {
  const { t } = useAdminLocale();
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message || t.forgotPasswordForm.resetLinkSent);
    } catch(err: any) {
      setError(err.message || t.forgotPasswordForm.failedToSendResetLink);
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
            <h1 className="text-xl font-bold text-white tracking-tight font-display">{t.forgotPasswordForm.resetPassword}</h1>
            <p className="text-xs text-[#9EADA9] uppercase">{t.forgotPasswordForm.enterYourEmailToReceive}</p>
          </div>
        </div>

        {error && <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span></div>}
        {message && <div className="p-3.5 rounded-xl bg-accent/15 border border-accent/30 flex items-start gap-2.5 text-xs text-accent"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /><span>{message}</span></div>}

        {!message && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9EADA9]">{t.forgotPasswordForm.emailAddress}</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute top-3.5 left-3.5 text-[#9EADA9]" />
                <Input type="email" required placeholder="admin@ishoot.bh" className="pl-10" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={loading} variant="primary" size="lg" className="w-full gap-2 mt-4">
              <span>{loading ? "Sending..." : t.forgotPasswordForm.sendResetLink}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        )}

        <div className="text-center">
          <button onClick={() => router.push("/login")} className="text-xs text-accent hover:text-white transition-colors flex items-center justify-center gap-1 mx-auto">
            <ArrowLeft className="w-3 h-3" /> {t.forgotPasswordForm.backToLogin}
          </button>
        </div>
      </Card>
    </div>
  );
}
