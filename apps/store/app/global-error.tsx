"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Flag, Home, RefreshCw } from "lucide-react";

function makeIncidentId(digest?: string) {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  if (digest) {
    const cleaned = digest.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
    if (cleaned) return `ERR-${datePart}-${cleaned}`;
  }
  return `ERR-${datePart}-500-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [incidentId] = React.useState(() => makeIncidentId(error?.digest));
  const [reportState, setReportState] = React.useState<
    "idle" | "submitting" | "submitted" | "failed"
  >("idle");
  const [ticketNumber, setTicketNumber] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (error) {
      console.error(`[StoreGlobalError ${incidentId}]`, error);
    }
  }, [error, incidentId]);

  const submitReport = async () => {
    if (reportState === "submitting" || reportState === "submitted") return;
    setReportState("submitting");
    try {
      const res = await fetch("/api/error-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorCode: "500",
          incidentId,
          statusCode: 500,
          route: typeof window !== "undefined" ? window.location.pathname : "/",
          url: typeof window !== "undefined" ? window.location.href : "",
          timestamp: new Date().toISOString(),
          message: error?.message || "Global application error",
          stack: error?.stack || "",
          digest: error?.digest || "",
          priority: "critical",
          clientMeta:
            typeof window !== "undefined"
              ? {
                  viewport: `${window.innerWidth}x${window.innerHeight}`,
                  language: navigator.language || "en",
                  platform: navigator.platform || "web",
                  referrer: document.referrer || "",
                }
              : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        ticketNumber?: number | null;
      };
      if (!res.ok || !data.ok) throw new Error("report_failed");
      setTicketNumber(data.ticketNumber ?? null);
      setReportState("submitted");
    } catch {
      setReportState("failed");
    }
  };

  return (
    <html lang="en">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --ge-surface: #faf8ff;
                --ge-container: #efedf4;
                --ge-on-surface: #1a1b21;
                --ge-on-variant: #44464f;
                --ge-outline: #c5c6d0;
                --ge-primary: #1e3a8a;
                --ge-on-primary: #ffffff;
                --ge-secondary-container: #dce2f9;
                --ge-on-secondary-container: #151b2c;
                --ge-error-container: #ffdad6;
                --ge-on-error-container: #410002;
              }
              @media (prefers-color-scheme: dark) {
                :root {
                  --ge-surface: #121318;
                  --ge-container: #1e1f26;
                  --ge-on-surface: #e3e2e9;
                  --ge-on-variant: #c5c6d0;
                  --ge-outline: #44464f;
                  --ge-primary: #adc6ff;
                  --ge-on-primary: #002e69;
                  --ge-secondary-container: #3b4664;
                  --ge-on-secondary-container: #dce2f9;
                  --ge-error-container: #93000a;
                  --ge-on-error-container: #ffdad6;
                }
              }
            `,
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          backgroundColor: "var(--ge-surface)",
          color: "var(--ge-on-surface)",
        }}
      >
        <main
          role="alert"
          style={{
            maxWidth: "34rem",
            width: "100%",
            borderRadius: "24px",
            border: "1px solid var(--ge-outline)",
            backgroundColor: "var(--ge-container)",
            padding: "32px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              margin: "0 auto 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "var(--ge-error-container)",
              color: "var(--ge-on-error-container)",
            }}
          >
            <AlertCircle width={30} height={30} aria-hidden="true" />
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            <span
              style={{
                borderRadius: "9999px",
                padding: "4px 12px",
                fontSize: "12px",
                fontWeight: 700,
                backgroundColor: "var(--ge-error-container)",
                color: "var(--ge-on-error-container)",
              }}
            >
              HTTP 500
            </span>
            <span
              data-testid="error-code-badge"
              style={{
                borderRadius: "9999px",
                padding: "4px 12px",
                fontSize: "12px",
                fontWeight: 600,
                fontFamily: "ui-monospace, monospace",
                border: "1px solid var(--ge-outline)",
                backgroundColor: "var(--ge-surface)",
              }}
            >
              {incidentId}
            </span>
          </div>

          <h1 style={{ fontSize: "24px", fontWeight: 700, margin: "0 0 10px" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--ge-on-variant)", margin: "0 0 24px" }}>
            We hit an unexpected issue loading the store. Please try again or report this reference code so our team can investigate.
          </p>

          {reportState === "submitted" && (
            <div
              role="status"
              data-testid="error-report-confirmation"
              style={{
                marginBottom: "20px",
                borderRadius: "14px",
                padding: "10px 14px",
                fontSize: "13px",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "var(--ge-secondary-container)",
                color: "var(--ge-on-secondary-container)",
              }}
            >
              <CheckCircle2 width={16} height={16} aria-hidden="true" />
              <span>
                Reported{ticketNumber ? ` (Ticket #${ticketNumber})` : ""} · {incidentId}
              </span>
            </div>
          )}

          {reportState === "failed" && (
            <p role="alert" style={{ fontSize: "13px", color: "#ba1a1a", marginBottom: "16px" }}>
              Could not send report right now. Please try again.
            </p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                minHeight: "44px",
                padding: "10px 20px",
                borderRadius: "9999px",
                border: 0,
                backgroundColor: "var(--ge-primary)",
                color: "var(--ge-on-primary)",
                fontSize: "13px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              <RefreshCw width={16} height={16} aria-hidden="true" />
              Try Again
            </button>
            <a
              href="/"
              style={{
                minHeight: "44px",
                padding: "10px 20px",
                borderRadius: "9999px",
                border: "1px solid var(--ge-outline)",
                backgroundColor: "var(--ge-surface)",
                color: "var(--ge-on-surface)",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxSizing: "border-box",
              }}
            >
              <Home width={16} height={16} aria-hidden="true" />
              Return Home
            </a>
            <button
              type="button"
              data-testid="error-report-button"
              onClick={() => void submitReport()}
              disabled={reportState === "submitting" || reportState === "submitted"}
              style={{
                minHeight: "44px",
                padding: "10px 20px",
                borderRadius: "9999px",
                border: 0,
                backgroundColor: "var(--ge-secondary-container)",
                color: "var(--ge-on-secondary-container)",
                fontSize: "13px",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                opacity: reportState === "submitted" ? 0.7 : 1,
              }}
            >
              <Flag width={16} height={16} aria-hidden="true" />
              {reportState === "submitting"
                ? "Reporting..."
                : reportState === "submitted"
                  ? "Reported"
                  : "Report"}
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
