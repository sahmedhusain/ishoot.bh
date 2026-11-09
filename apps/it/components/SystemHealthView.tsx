"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertTriangle, RefreshCw, Search, Filter, X } from "lucide-react";
import type { ServiceHealth } from "@platform/api-client";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";

export function SystemHealthView({ items }: { items: ServiceHealth[] }) {
  const { copy, date } = useCopy();
  const h = copy.systemHealth;
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState("");

  const refresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 500);
  };

  const allHealthy = items.length > 0 && items.every((i) => i.status === "healthy");

  const filteredItems = React.useMemo(() => {
    return items.filter((svc) => {
      if (searchQuery.trim() && !svc.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (selectedStatus === "healthy" && svc.status !== "healthy") {
        return false;
      }
      if (selectedStatus === "degraded" && svc.status === "healthy") {
        return false;
      }
      return true;
    });
  }, [items, searchQuery, selectedStatus]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle title={h.title} description={h.description} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{h.refresh}</span>
          </button>
        </div>
      </div>

      <div
        className={`flex items-center gap-3 p-3 border font-mono text-xs ${
          allHealthy
            ? "border-emerald-500 bg-emerald-50/50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300"
            : "border-amber-500 bg-amber-50/50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300"
        }`}
      >
        {allHealthy ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
        )}
        <div>
          <h3 className="font-bold uppercase tracking-wider">
            {allHealthy ? h.allHealthyTitle : h.degradedTitle}
          </h3>
          <p className="text-[11px] opacity-90 font-sans">
            {allHealthy ? h.allHealthySubtitle : h.degradedSubtitle}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs font-mono">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2 top-2 size-3.5 text-slate-400" />
          <input
            type="text"
            placeholder={h.searchPlaceholder}
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
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="it-field-sunken text-xs font-mono py-1"
          >
            <option value="">{h.filterStatus}: {h.filterAll}</option>
            <option value="healthy">{h.filterHealthy}</option>
            <option value="degraded">{h.filterDegraded}</option>
          </select>
        </div>
        {(searchQuery || selectedStatus) && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedStatus("");
            }}
            className="it-btn-3d py-1 px-2 text-[10px] text-rose-700 dark:text-rose-400"
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 font-mono text-xs">
        {filteredItems.length === 0 ? (
          <div className="col-span-full it-card p-6 text-center text-ink-muted">
            No services match the active filters.
          </div>
        ) : (
          filteredItems.map((svc) => {
            const isHealthy = svc.status === "healthy";
            return (
              <div
                key={svc.name}
                className={`it-card p-3 space-y-2.5 ${isHealthy ? "border-l-4 border-l-emerald-600" : "border-l-4 border-l-rose-600"}`}
              >
                <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-1.5">
                  <span className="font-bold uppercase tracking-wider text-ink">{svc.name}</span>
                  <span
                    className={`border px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      isHealthy
                        ? "border-emerald-400 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "border-rose-400 bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                    }`}
                  >
                    {isHealthy ? "✔ " + h.healthy : "⚠ " + h.unhealthy}
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-ink-muted">
                  <div className="flex justify-between">
                    <span>{h.latency}:</span>
                    <span className="font-bold text-ink">{svc.latencyMs} {h.milliseconds}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{h.checkedAt}:</span>
                    <span>{date(svc.checkedAt)}</span>
                  </div>
                  {svc.error && (
                    <p className="pt-1 text-[11px] text-rose-600 dark:text-rose-400 font-bold break-all">
                      ERR: {svc.error}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
