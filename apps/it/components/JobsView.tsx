"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Cpu, RefreshCw, Search, Filter, X, RotateCcw } from "lucide-react";
import type { DatabaseStats } from "@platform/api-client";
import { retryJobAction } from "../app/(desk)/jobs/actions";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";
import { CriticalActionModal } from "./CriticalActionModal";

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
  const [busy, setBusy] = React.useState(false);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedQueue, setSelectedQueue] = React.useState("");

  // Confirmation Modal State
  const [retryQueue, setRetryQueue] = React.useState<string | null>(null);

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

  const allQueueNames = Object.keys(queues);

  const filteredQueues = React.useMemo(() => {
    return Object.entries(queues).filter(([qName]) => {
      if (searchQuery.trim() && !qName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (selectedQueue && qName !== selectedQueue) {
        return false;
      }
      return true;
    });
  }, [queues, searchQuery, selectedQueue]);

  const handleRetryQueue = async (qName: string) => {
    setBusy(true);
    try {
      await retryJobAction(qName);
      toast.success(`Discarded jobs in queue ${qName} queued for re-execution`);
      router.refresh();
    } catch {
      toast.error("Failed to retry discarded jobs");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle title={j.title} description={j.description} />
        <div className="flex items-center gap-2">
          <span className="it-status-pane font-bold text-amber-700 dark:text-amber-400">
            T-CODE: SM37 [JOB QUEUES]
          </span>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="it-btn-3d py-1.5 px-3 font-bold flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{j.refresh}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs font-mono">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2 top-2 size-3.5 text-slate-400" />
          <input
            type="text"
            placeholder={j.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="it-field-sunken w-full pl-7 pr-7 py-1 text-xs font-mono"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Filter className="size-3.5 text-slate-400" />
          <select
            value={selectedQueue}
            onChange={(e) => setSelectedQueue(e.target.value)}
            className="it-field-sunken text-xs font-mono py-1"
          >
            <option value="">{j.filterQueue}: {j.filterAll}</option>
            {allQueueNames.map((name) => (
              <option key={name} value={name}>
                {name.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        {(searchQuery || selectedQueue) && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedQueue("");
            }}
            className="it-btn-3d py-1 px-2 text-[10px] text-rose-700 dark:text-rose-400"
          >
            Clear
          </button>
        )}
      </div>

      <div className="space-y-4 font-mono text-xs">
        {filteredQueues.length === 0 ? (
          <div className="it-card p-8 text-center text-ink-muted">
            {j.noQueues}
          </div>
        ) : (
          filteredQueues.map(([qName, states]) => {
            const hasDiscarded = (states.discarded ?? 0) > 0;
            return (
              <div
                key={qName}
                className="it-card p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    <h2 className="text-xs font-bold uppercase tracking-wide text-ink">
                      QUEUE: {qName.toUpperCase()}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {canExecute && hasDiscarded && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setRetryQueue(qName)}
                        className="it-btn-3d py-1 px-2 text-[10px] text-rose-700 dark:text-rose-400 font-bold flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>{j.retryAll} ({states.discarded})</span>
                      </button>
                    )}
                    <span className="it-status-pane text-[10px]">ENGINE: RIVER (PG)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {[
                    { state: "available", label: j.available, count: states.available ?? 0, tone: "text-sky-700 dark:text-sky-300 border-sky-400 bg-sky-50 dark:bg-sky-950/30" },
                    { state: "running", label: j.running, count: states.running ?? 0, tone: "text-indigo-700 dark:text-indigo-300 border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30" },
                    { state: "completed", label: j.completed, count: states.completed ?? 0, tone: "text-emerald-700 dark:text-emerald-300 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30" },
                    { state: "retryable", label: j.retryable, count: states.retryable ?? 0, tone: "text-amber-700 dark:text-amber-400 border-amber-400 bg-amber-50 dark:bg-amber-950/30" },
                    { state: "discarded", label: j.discarded, count: states.discarded ?? 0, tone: "text-rose-700 dark:text-rose-400 border-rose-400 bg-rose-50 dark:bg-rose-950/30" },
                  ].map(({ state, label, count, tone }) => (
                    <div
                      key={state}
                      className={`border p-2.5 space-y-1 ${tone}`}
                    >
                      <span className="text-[10px] uppercase font-bold text-ink-muted">
                        {label}
                      </span>
                      <p className="text-base font-bold font-mono text-ink">{count}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {retryQueue && (
        <CriticalActionModal
          open={true}
          title={j.retryConfirmTitle}
          description={j.retryConfirmDesc}
          impactDetails={[
            `Queue: ${retryQueue.toUpperCase()}`,
            "All discarded and dead-letter jobs will be marked as available for immediate worker polling.",
          ]}
          requiredConfirmationText="RETRY"
          dangerLevel="warning"
          busy={busy}
          onCancel={() => setRetryQueue(null)}
          onConfirm={async () => {
            const q = retryQueue;
            setRetryQueue(null);
            await handleRetryQueue(q);
          }}
        />
      )}
    </div>
  );
}
