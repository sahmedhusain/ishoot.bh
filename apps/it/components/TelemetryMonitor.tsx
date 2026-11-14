"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

interface QueuedLog {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  service: string;
  action: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export function TelemetryMonitor() {
  const pathname = usePathname();
  const queueRef = React.useRef<QueuedLog[]>([]);

  const flush = React.useCallback(() => {
    if (queueRef.current.length === 0) return;
    const batch = queueRef.current.splice(0, 50);
    const payload = JSON.stringify({ logs: batch });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/logs/batch",
        new Blob([payload], { type: "application/json" }),
      );
    } else {
      fetch("/api/logs/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }, []);

  const enqueue = React.useCallback(
    (entry: Omit<QueuedLog, "timestamp" | "service">) => {
      queueRef.current.push({
        timestamp: new Date().toISOString(),
        service: "frontend/it",
        ...entry,
      });
      if (queueRef.current.length >= 20) flush();
    },
    [flush],
  );

  React.useEffect(() => {
    if (!pathname) return;
    enqueue({
      level: "INFO",
      action: "ROUTE_VISIT",
      message: pathname,
      metadata: { path: pathname },
    });
  }, [pathname, enqueue]);

  React.useEffect(() => {
    const origError = console.error;
    const origWarn = console.warn;

    console.error = (...args: unknown[]) => {
      try {
        enqueue({
          level: "ERROR",
          action: "CONSOLE_ERROR",
          message: args
            .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
            .join(" ")
            .slice(0, 1500),
        });
      } catch {}
      origError.apply(console, args);
    };

    console.warn = (...args: unknown[]) => {
      try {
        enqueue({
          level: "WARN",
          action: "CONSOLE_WARN",
          message: args
            .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
            .join(" ")
            .slice(0, 1500),
        });
      } catch {}
      origWarn.apply(console, args);
    };

    const timer = window.setInterval(flush, 4000);
    return () => {
      console.error = origError;
      console.warn = origWarn;
      window.clearInterval(timer);
      flush();
    };
  }, [enqueue, flush]);

  return null;
}
