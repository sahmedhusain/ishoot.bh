"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  FileQuestion,
  Flag,
  Home,
  Package,
  RefreshCw,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Tag,
  UserRound,
} from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { showSnackbar } from "../ui/snackbar";

export interface WebUnifiedErrorPageProps {
  statusCode?: number | string;
  title?: string;
  description?: string;
  message?: string;
  error?: (Error & { digest?: string; status?: number; statusCode?: number }) | null;
  reset?: () => void;
  showQuickLinks?: boolean;
}

function buildIncidentId(code: string, digest?: string): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  if (digest) {
    const cleaned = digest.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
    if (cleaned) return `ERR-${datePart}-${cleaned}`;
  }
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ERR-${datePart}-${code}-${random}`.slice(0, 28);
}

export function WebUnifiedErrorPage({
  statusCode,
  title: customTitle,
  description: customDescription,
  message: customMessage,
  error,
  reset,
  showQuickLinks,
}: WebUnifiedErrorPageProps) {
  const { locale, isRTL, translations } = useTranslation();
  const copy = translations.errorPages;
  const ar = locale === "ar";

  const resolvedCode = String(
    statusCode ?? (error?.status || error?.statusCode || (error ? 500 : 404)),
  );
  const numericStatus = Number(resolvedCode) || 500;

  const [incidentId] = React.useState(() =>
    buildIncidentId(resolvedCode, error?.digest),
  );
  const [reportState, setReportState] = React.useState<
    "idle" | "submitting" | "submitted" | "failed"
  >("idle");
  const [ticketNumber, setTicketNumber] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (error) {
      console.error(`[StoreError HTTP ${resolvedCode} ${incidentId}]`, error);
    }
  }, [error, resolvedCode, incidentId]);

  const titleKey = `code${resolvedCode}Title` as keyof typeof copy;
  const descKey = `code${resolvedCode}Desc` as keyof typeof copy;

  const resolvedTitle =
    customTitle || (copy[titleKey] as string) || copy.genericTitle;
  const resolvedDesc =
    customDescription || (copy[descKey] as string) || copy.genericDescription;

  const is404 = resolvedCode === "404" || Boolean(showQuickLinks);
  const isAuth = resolvedCode === "401" || resolvedCode === "403";

  const submitReport = async () => {
    if (reportState === "submitting" || reportState === "submitted") return;
    setReportState("submitting");
    try {
      const currentUrl =
        typeof window !== "undefined" ? window.location.href : "";
      const route =
        typeof window !== "undefined" ? window.location.pathname : "/";
      const clientMeta =
        typeof window !== "undefined"
          ? {
              viewport: `${window.innerWidth}x${window.innerHeight}`,
              language: navigator.language || locale,
              platform: navigator.platform || "web",
              referrer: document.referrer || "",
            }
          : undefined;

      const res = await fetch("/api/error-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorCode: resolvedCode,
          incidentId,
          statusCode: numericStatus,
          route,
          url: currentUrl,
          timestamp: new Date().toISOString(),
          message: customMessage || error?.message || `HTTP ${resolvedCode}`,
          stack: error?.stack || "",
          digest: error?.digest || "",
          clientMeta,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        ticketNumber?: number | null;
      };
      if (!res.ok || !data.ok) {
        throw new Error("report_failed");
      }
      setTicketNumber(data.ticketNumber ?? null);
      setReportState("submitted");
      showSnackbar({
        message: ar
          ? `تم إرسال البلاغ بنجاح (${incidentId})`
          : `Issue reported (${incidentId})`,
        tone: "success",
      });
    } catch {
      setReportState("failed");
      showSnackbar({
        message: ar
          ? "تعذر إرسال البلاغ حالياً. يرجى المحاولة مرة أخرى."
          : "Could not send report right now. Please try again.",
        tone: "error",
      });
    }
  };

  const quickLinks = [
    { href: `/${locale}`, label: translations.nav?.home || copy.homeLink, icon: Home },
    { href: `/${locale}/shop`, label: ar ? "تسوق الكل" : "Shop All", icon: ShoppingBag },
    { href: `/${locale}/deals`, label: translations.nav?.offers || "Deals", icon: Sparkles },
    { href: `/${locale}/categories`, label: ar ? "الفئات" : "Categories", icon: Tag },
    { href: `/${locale}/track-order`, label: ar ? "تتبع الطلب" : "Track Order", icon: Package },
    { href: `/${locale}/account`, label: translations.nav?.account || "Account", icon: UserRound },
  ];

  const iconTone = is404
    ? "bg-m3-primary-container text-m3-on-primary-container"
    : isAuth
      ? "bg-m3-tertiary-container text-m3-on-tertiary-container"
      : "bg-m3-error-container text-m3-on-error-container";

  const chipTone = is404
    ? "bg-m3-secondary-container text-m3-on-secondary-container"
    : isAuth
      ? "bg-m3-tertiary-container text-m3-on-tertiary-container"
      : "bg-m3-error-container text-m3-on-error-container";

  return (
    <main
      role="alert"
      className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-m3-surface text-m3-on-surface"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="max-w-xl w-full rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low p-6 sm:p-10 shadow-m3-2 text-center space-y-6">
        <div className={`mx-auto h-16 w-16 rounded-2xl flex items-center justify-center ${iconTone}`}>
          {is404 ? (
            <FileQuestion className="w-8 h-8" aria-hidden="true" />
          ) : isAuth ? (
            <ShieldAlert className="w-8 h-8" aria-hidden="true" />
          ) : (
            <AlertCircle className="w-8 h-8" aria-hidden="true" />
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wide ${chipTone}`}>
              HTTP {resolvedCode}
            </span>
            <span
              data-testid="error-code-badge"
              dir="ltr"
              className="inline-flex items-center rounded-full border border-m3-outline-variant bg-m3-surface px-3 py-1 font-mono text-xs font-semibold text-m3-on-surface"
            >
              {incidentId}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-m3-on-surface font-display tracking-tight">
            {resolvedTitle}
          </h1>

          <p className="text-sm sm:text-base text-m3-on-surface-variant leading-relaxed max-w-md mx-auto">
            {resolvedDesc}
          </p>
        </div>

        {reportState === "submitted" && (
          <div
            role="status"
            data-testid="error-report-confirmation"
            className="rounded-2xl border border-m3-outline-variant bg-m3-primary-container text-m3-on-primary-container px-4 py-3 text-xs sm:text-sm font-medium flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {ar
                ? `تم إرسال البلاغ لفريق الدعم الفني${ticketNumber ? ` (تذكرة رقم #${ticketNumber})` : ""}. رمز المتابعة: ${incidentId}`
                : `Reported to support${ticketNumber ? ` (Ticket #${ticketNumber})` : ""}. Reference: ${incidentId}`}
            </span>
          </div>
        )}

        {reportState === "failed" && (
          <p role="alert" className="text-xs font-medium text-m3-error">
            {ar
              ? "تعذر إرسال البلاغ تلقائياً. يرجى المحاولة مرة أخرى."
              : "Unable to submit report right now. Please try again."}
          </p>
        )}

        {is404 && (
          <div className="pt-2 space-y-2.5 text-start">
            <p className="text-xs font-semibold uppercase tracking-wider text-m3-on-surface-variant text-center">
              {copy.quickLinksHeading}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {quickLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="m3-state-layer flex min-h-11 items-center justify-center gap-2 px-3 py-2 rounded-xl border border-m3-outline-variant bg-m3-surface text-xs font-medium text-m3-on-surface hover:border-m3-primary transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5 text-m3-primary shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {reset && (
            <button
              type="button"
              onClick={reset}
              className="m3-state-layer min-h-11 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-m3-primary text-m3-on-primary text-xs sm:text-sm font-bold hover:brightness-95 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              <span>{copy.retry}</span>
            </button>
          )}

          <Link
            href={`/${locale}`}
            className="m3-state-layer min-h-11 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-m3-outline bg-m3-surface text-m3-on-surface text-xs sm:text-sm font-semibold hover:border-m3-primary transition-colors"
          >
            <Home className="w-4 h-4 text-m3-primary" aria-hidden="true" />
            <span>{copy.returnHome}</span>
          </Link>

          <button
            type="button"
            data-testid="error-report-button"
            onClick={() => void submitReport()}
            disabled={reportState === "submitting" || reportState === "submitted"}
            className="m3-state-layer min-h-11 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-m3-secondary-container text-m3-on-secondary-container text-xs sm:text-sm font-semibold hover:brightness-95 transition-all disabled:opacity-60 cursor-pointer"
          >
            <Flag className="w-4 h-4" aria-hidden="true" />
            <span>
              {reportState === "submitting"
                ? ar ? "جاري الإرسال..." : "Reporting..."
                : reportState === "submitted"
                  ? ar ? "تم الإبلاغ" : "Reported"
                  : copy.reportButton ?? (ar ? "إبلاغ عن المشكلة" : "Report")}
            </span>
          </button>
        </div>
      </div>
    </main>
  );
}
