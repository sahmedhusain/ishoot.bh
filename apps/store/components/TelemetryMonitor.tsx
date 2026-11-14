"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

export function TelemetryMonitor() {
  const pathname = usePathname();
  const queueRef = React.useRef<Array<Record<string, unknown>>>([]);

  const flush = React.useCallback(() => {
    if (queueRef.current.length === 0) return;
    const batch = queueRef.current.splice(0, 50);
    const payload = JSON.stringify({ logs: batch });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/telemetry", new Blob([payload], { type: "application/json" }));
    } else {
      fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }, []);

  React.useEffect(() => {
    if (!pathname) return;
    queueRef.current.push({
      timestamp: new Date().toISOString(),
      level: "INFO",
      action: "ROUTE_VISIT",
      message: pathname,
    });
  }, [pathname]);

  React.useEffect(() => {
    const origError = console.error;
    const origWarn = console.warn;
    console.error = (...args: unknown[]) => {
      try {
        queueRef.current.push({
          timestamp: new Date().toISOString(),
          level: "ERROR",
          action: "CONSOLE_ERROR",
          message: args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ").slice(0, 1500),
        });
      } catch {}
      origError.apply(console, args);
    };
    console.warn = (...args: unknown[]) => {
      try {
        queueRef.current.push({
          timestamp: new Date().toISOString(),
          level: "WARN",
          action: "CONSOLE_WARN",
          message: args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ").slice(0, 1500),
        });
      } catch {}
      origWarn.apply(console, args);
    };
    const timer = window.setInterval(flush, 5000);
    return () => {
      console.error = origError;
      console.warn = origWarn;
      window.clearInterval(timer);
      flush();
    };
  }, [flush]);

  return null;
}
