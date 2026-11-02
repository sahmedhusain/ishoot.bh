"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Database, RefreshCw, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Button, Card } from "@platform/ui";
import type { DatabaseStats } from "@platform/api-client";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";

export function DatabaseView({ stats }: { stats: DatabaseStats | null }) {
  const { copy, date } = useCopy();
  const dbCopy = copy.database;
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const refresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle title={dbCopy.title} description={dbCopy.description} />
        <Button
          type="button"
          variant="outline"
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          <span>{dbCopy.refresh}</span>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Goose Schema Migrations */}
        <Card className="rounded-3xl border border-outline-variant p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">{dbCopy.migrationsTitle}</h2>
          </div>
          <p className="text-xs text-ink-muted">{dbCopy.migrationsSubtitle}</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm rtl:text-right">
              <thead>
                <tr className="border-b border-outline-variant text-xs text-ink-muted">
                  <th className="pb-2 font-medium">{dbCopy.schema}</th>
                  <th className="pb-2 font-medium">{dbCopy.version}</th>
                  <th className="pb-2 font-medium">{dbCopy.appliedAt}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {stats?.schemas?.map((s) => (
                  <tr key={s.schema}>
                    <td className="py-2.5 font-mono font-medium capitalize">
                      {s.schema}
                    </td>
                    <td className="py-2.5 font-mono text-xs">{s.version}</td>
                    <td className="py-2.5 text-xs text-ink-muted">
                      {date(s.appliedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Outbox Lag */}
        <Card className="rounded-3xl border border-outline-variant p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">{dbCopy.outboxTitle}</h2>
          </div>
          <p className="text-xs text-ink-muted">{dbCopy.outboxSubtitle}</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm rtl:text-right">
              <thead>
                <tr className="border-b border-outline-variant text-xs text-ink-muted">
                  <th className="pb-2 font-medium">{dbCopy.schema}</th>
                  <th className="pb-2 font-medium">{dbCopy.pendingEvents}</th>
                  <th className="pb-2 font-medium">{dbCopy.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {stats?.outboxLag?.map((lag) => {
                  const isClean = lag.pending === 0;
                  return (
                    <tr key={lag.schema}>
                      <td className="py-2.5 font-mono font-medium capitalize">
                        {lag.schema}
                      </td>
                      <td className="py-2.5 font-mono text-xs">{lag.pending}</td>
                      <td className="py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            isClean
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                          }`}
                        >
                          {isClean ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          {isClean ? dbCopy.synced : dbCopy.lagging}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* River Queue Stats */}
      <Card className="rounded-3xl border border-outline-variant p-6 space-y-4">
        <h2 className="text-base font-semibold">{dbCopy.riverTitle}</h2>
        <p className="text-xs text-ink-muted">{dbCopy.riverSubtitle}</p>

        {!stats?.riverStats?.length ? (
          <p className="text-xs text-ink-muted py-4 text-center">
            {dbCopy.noRiverJobs}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.riverStats.map((item, idx) => (
              <div
                key={`${item.queue}-${item.state}-${idx}`}
                className="rounded-2xl border border-outline-variant p-4 space-y-1"
              >
                <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">
                  {item.queue}
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold font-mono">{item.count}</span>
                  <span className="rounded-md bg-surface-variant px-2 py-0.5 text-xs font-medium">
                    {item.state}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
