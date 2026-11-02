"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertTriangle, RefreshCw, Activity } from "lucide-react";
import { Button, Card } from "@platform/ui";
import type { ServiceHealth } from "@platform/api-client";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";

export function SystemHealthView({ items }: { items: ServiceHealth[] }) {
  const { copy, date } = useCopy();
  const h = copy.systemHealth;
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const refresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 500);
  };

  const allHealthy = items.length > 0 && items.every((i) => i.status === "healthy");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle title={h.title} description={h.description} />
        <Button
          type="button"
          variant="outline"
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          <span>{h.refresh}</span>
        </Button>
      </div>

      <div
        className={`flex items-center gap-3 rounded-2xl p-4 border ${
          allHealthy
            ? "border-emerald-200 bg-emerald-50/50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300"
            : "border-amber-200 bg-amber-50/50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300"
        }`}
      >
        {allHealthy ? (
          <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        )}
        <div>
          <h3 className="text-sm font-semibold">
            {allHealthy ? h.allHealthyTitle : h.degradedTitle}
          </h3>
          <p className="text-xs opacity-90">
            {allHealthy ? h.allHealthySubtitle : h.degradedSubtitle}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((svc) => {
          const isHealthy = svc.status === "healthy";
          return (
            <Card
              key={svc.name}
              className="rounded-3xl border border-outline-variant p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold capitalize">{svc.name}</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isHealthy
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300"
                  }`}
                >
                  {isHealthy ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  )}
                  {isHealthy ? h.healthy : h.unhealthy}
                </span>
              </div>

              <div className="space-y-1 text-xs text-ink-muted">
                <div className="flex justify-between">
                  <span>{h.latency}:</span>
                  <span className="font-mono">{svc.latencyMs} ms</span>
                </div>
                <div className="flex justify-between">
                  <span>{h.checkedAt}:</span>
                  <span>{date(svc.checkedAt)}</span>
                </div>
                {svc.error && (
                  <p className="pt-2 text-xs text-red-600 dark:text-red-400 break-words">
                    {svc.error}
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
