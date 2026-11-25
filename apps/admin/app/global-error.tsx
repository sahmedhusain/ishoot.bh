"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Home, Loader2, RefreshCw, Send } from "lucide-react";

function makeIncidentId(): string {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()
      : Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "0");
  return `INC-${day}-500-${suffix}`;
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [incidentId, setIncidentId] = React.useState("INC-500");
  const [dark, setDark] = React.useState(false);
  const [reportState, setReportState] = React.useState<
    | { status: "idle" }
    | { status: "submitting" }
    | { status: "reported"; ticketNumber: number }
    | { status: "failed" }
  >({ status: "idle" });

  React.useEffect(() => {
    setIncidentId(makeIncidentId());
    const rootDark =
      document.documentElement.classList.contains("dark") ||
      window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    setDark(Boolean(rootDark));
  }, []);

  React.useEffect(() => {
    console.error(`[GlobalError HTTP-500 ${incidentId}]:`, error);
  }, [error, incidentId]);

  const handleReport = async () => {
    if (reportState.status === "submitting" || reportState.status === "reported") return;
    setReportState({ status: "submitting" });
    try {
      const response = await fetch("/api/error-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorCode: "HTTP-500",
          incidentId,
          statusCode: 500,
          route: window.location.pathname || "/",
          url: window.location.href,
          timestamp: new Date().toISOString(),
          message: error?.message,
          stack: error?.stack,
          digest: error?.digest,
          clientMeta: {
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            language: navigator.language,
            platform: navigator.platform,
            referrer: document.referrer || undefined,
          },
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        ticketNumber?: number;
      };
      if (!response.ok || !data.ok || typeof data.ticketNumber !== "number") {
        setReportState({ status: "failed" });
        return;
      }
      setReportState({ status: "reported", ticketNumber: data.ticketNumber });
    } catch {
      setReportState({ status: "failed" });
    }
  };

  const surface = dark ? "#141318" : "#fdf8fd";
  const cardBg = dark ? "#1d1b20" : "#f7f2fa";
  const cardBorder = dark ? "#49454f" : "#cac4d0";
  const textPrimary = dark ? "#e6e0e9" : "#1d1b20";
  const textMuted = dark ? "#cac4d0" : "#49454f";
  const errorBg = dark ? "#93000a" : "#ffdad6";
  const errorText = dark ? "#ffdad6" : "#410002";
  const primaryBg = dark ? "#d0bcff" : "#6750a4";
  const primaryText = dark ? "#381e72" : "#ffffff";

  return (
    <html lang="en" className={dark ? "dark" : "light"}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          backgroundColor: surface,
          color: textPrimary,
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <section
          aria-labelledby="global-error-title"
          style={{
            width: "100%",
            maxWidth: "560px",
            borderRadius: "28px",
            border: `1px solid ${cardBorder}`,
            backgroundColor: cardBg,
            padding: "32px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "12px", marginBottom: "20px" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "16px",
                backgroundColor: errorBg,
                color: errorText,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertTriangle size={26} aria-hidden="true" />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
              <span
                style={{
                  borderRadius: "9999px",
                  backgroundColor: errorBg,
                  color: errorText,
                  padding: "4px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                HTTP 500
              </span>
              <span
                style={{
                  borderRadius: "9999px",
                  border: `1px solid ${cardBorder}`,
                  padding: "4px 12px",
                  fontSize: "12px",
                  fontFamily: "ui-monospace, monospace",
                  color: textMuted,
                }}
              >
                Incident ID: <strong style={{ color: textPrimary }}>{incidentId}</strong>
              </span>
            </div>
          </div>

          <h1 id="global-error-title" style={{ margin: "0 0 10px", fontSize: "24px", fontWeight: 700 }}>
            Application Runtime Error
          </h1>
          <p style={{ margin: "0 0 20px", fontSize: "15px", lineHeight: 1.6, color: textMuted }}>
            An unexpected interruption occurred while loading the application. You can retry, return to the dashboard, or report this incident to IT Support.
          </p>

          {reportState.status === "reported" && (
            <div
              role="status"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                borderRadius: "16px",
                padding: "12px 16px",
                marginBottom: "18px",
                border: `1px solid ${cardBorder}`,
                fontSize: "14px",
              }}
            >
              <CheckCircle2 size={18} aria-hidden="true" />
              <span>
                Issue reported to IT Support — Ticket #{reportState.ticketNumber} ({incidentId})
              </span>
            </div>
          )}

          {reportState.status === "failed" && (
            <div
              role="alert"
              style={{
                borderRadius: "16px",
                padding: "12px 16px",
                marginBottom: "18px",
                backgroundColor: errorBg,
                color: errorText,
                fontSize: "14px",
              }}
            >
              Unable to submit the report right now. Please share the incident ID with IT Support.
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                height: "40px",
                padding: "0 20px",
                borderRadius: "9999px",
                border: "none",
                backgroundColor: primaryBg,
                color: primaryText,
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={16} aria-hidden="true" />
              <span>Try Again</span>
            </button>

            <a
              href="/dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                height: "40px",
                padding: "0 20px",
                borderRadius: "9999px",
                border: `1px solid ${cardBorder}`,
                color: textPrimary,
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              <Home size={16} aria-hidden="true" />
              <span>Return to Dashboard</span>
            </a>

            <button
              type="button"
              onClick={() => void handleReport()}
              disabled={reportState.status === "submitting" || reportState.status === "reported"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                height: "40px",
                padding: "0 20px",
                borderRadius: "9999px",
                border: `1px solid ${cardBorder}`,
                backgroundColor: "transparent",
                color: textPrimary,
                fontWeight: 600,
                fontSize: "14px",
                cursor: reportState.status === "reported" ? "default" : "pointer",
                opacity: reportState.status === "submitting" || reportState.status === "reported" ? 0.6 : 1,
              }}
            >
              {reportState.status === "submitting" ? (
                <Loader2 size={16} aria-hidden="true" />
              ) : (
                <Send size={16} aria-hidden="true" />
              )}
              <span>{reportState.status === "submitting" ? "Submitting report..." : "Report Issue"}</span>
            </button>
          </div>
        </section>
      </body>
    </html>
  );
}
