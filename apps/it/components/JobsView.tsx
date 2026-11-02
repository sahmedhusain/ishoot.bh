"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Cpu, RefreshCw, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { Button, Card } from "@platform/ui";
import type { DatabaseStats } from "@platform/api-client";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";

export function JobsView({
  stats,
  canExecute,
}: {
  stats: DatabaseStats | null;
  canExecute: boolean;
}) {
  const { copy } = useCopy();
  const j = copy.jobs;
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const refresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 500);
  };

  const queues = React.useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const item of stats?.riverStats ?? []) {
      if (!map[item.queue]) map[item.queue] = {};
      map[item.queue][item.state] = item.count;
    }
    return map;
  }, [stats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle title={j.title} description={j.description} />
        <Button
          type="button"
          variant="outline"
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          <span>{j.refresh}</span>
        </Button>
      </div>

      <div className="grid gap-6">
        {Object.keys(queues).length === 0 ? (
          <Card className="rounded-3xl border border-outline-variant p-8 text-center text-ink-muted">
            {j.noQueues}
          </Card>
        ) : (
          Object.entries(queues).map(([qName, states]) => (
            <Card
              key={qName}
              className="rounded-3xl border border-outline-variant p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-semibold capitalize">
                    {qName} {j.queue}
                  </h2>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { state: "available", label: j.available, count: states.available ?? 0 },
                  { state: "running", label: j.running, count: states.running ?? 0 },
                  { state: "completed", label: j.completed, count: states.completed ?? 0 },
                  { state: "retryable", label: j.retryable, count: states.retryable ?? 0 },
                  { state: "discarded", label: j.discarded, count: states.discarded ?? 0 },
                ].map(({ state, label, count }) => (
                  <div
                    key={state}
                    className="rounded-2xl border border-outline-variant p-4 space-y-1"
                  >
                    <span className="text-xs font-medium text-ink-muted">
                      {label}
                    </span>
                    <p className="text-xl font-bold font-mono">{count}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
