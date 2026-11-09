"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldAlert, Check, X, Search, Filter } from "lucide-react";
import { formatMessage } from "@platform/locales";
import type { ModuleState } from "@platform/api-client";
import { setModuleAction } from "../app/actions";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";
import { CriticalActionModal } from "./CriticalActionModal";

export function ModulesView({
  modules,
  canEdit,
}: {
  modules: ModuleState[] | null;
  canEdit: boolean;
}) {
  const { copy, name, date } = useCopy();
  const m = copy.modules;
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedState, setSelectedState] = React.useState("");

  // Confirmation Modal State for Disabling
  const [pendingDisable, setPendingDisable] = React.useState<{
    key: string;
    label: string;
  } | null>(null);

  const toggle = async (key: string, enabled: boolean) => {
    setBusy(key);
    try {
      const { ok } = await setModuleAction(key, enabled);
      if (ok) toast.success(m.saved);
      else toast.error(m.failed);
      router.refresh();
    } catch {
      toast.error(m.failed);
    } finally {
      setBusy(null);
    }
  };

  const handleToggleClick = (module: ModuleState, label: string) => {
    if (!canEdit) return;
    if (module.enabled) {
      // Disabling is a critical action
      setPendingDisable({ key: module.key, label });
    } else {
      // Enabling is safe
      void toggle(module.key, true);
    }
  };

  const filteredModules = React.useMemo(() => {
    if (!modules) return [];
    return modules.filter((mod) => {
      const label = name(mod);
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!mod.key.toLowerCase().includes(q) && !label.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (selectedState === "enabled" && !mod.enabled) return false;
      if (selectedState === "disabled" && mod.enabled) return false;
      return true;
    });
  }, [modules, searchQuery, selectedState, name]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle title={m.title} description={m.description} />
        <span className="it-status-pane font-bold text-amber-700 dark:text-amber-400">
          T-CODE: SM19 [SYSTEM MODULES]
        </span>
      </div>

      <div className="flex items-center gap-2 border border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2.5 text-xs text-amber-800 dark:text-amber-300 font-mono">
        <ShieldAlert className="size-4 shrink-0" aria-hidden />
        <p>{m.warning}</p>
      </div>

      {!canEdit && <p className="text-xs text-ink-muted font-mono">{m.readOnly}</p>}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs font-mono">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2 top-2 size-3.5 text-slate-400" />
          <input
            type="text"
            placeholder={m.searchPlaceholder}
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
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="it-field-sunken text-xs font-mono py-1"
          >
            <option value="">{m.filterState}: {m.filterAll}</option>
            <option value="enabled">{m.filterEnabled}</option>
            <option value="disabled">{m.filterDisabled}</option>
          </select>
        </div>
        {(searchQuery || selectedState) && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedState("");
            }}
            className="it-btn-3d py-1 px-2 text-[10px] text-rose-700 dark:text-rose-400"
          >
            Clear
          </button>
        )}
      </div>

      {!modules ? (
        <div
          role="alert"
          className="it-card p-8 text-center text-xs font-mono text-ink-muted"
        >
          {m.unavailable}
        </div>
      ) : filteredModules.length === 0 ? (
        <div className="it-card p-6 text-center text-xs font-mono text-ink-muted">
          No modules match the filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredModules.map((module) => {
            const label = name(module);
            return (
              <div
                key={module.key}
                className={`it-card p-3 space-y-2 ${module.enabled ? "border-l-4 border-l-emerald-600" : "border-l-4 border-l-slate-400 opacity-80"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-bold font-mono text-xs text-ink">{label}</h2>
                    <p
                      className="font-mono text-[11px] text-ink-muted"
                      dir="ltr"
                    >
                      {module.key}
                    </p>
                    <p className="mt-1 text-[10px] text-ink-muted font-mono">
                      {formatMessage(m.byDefault, {
                        state: module.enabledByDefault ? m.on : m.off,
                      })}
                      {module.updatedAt
                        ? ` · ${formatMessage(m.changed, { when: date(module.updatedAt) })}`
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!canEdit || busy === module.key}
                    onClick={() => handleToggleClick(module, label)}
                    className={`it-btn-3d py-1 px-3 text-xs font-mono font-bold flex items-center gap-1 ${
                      module.enabled
                        ? "text-emerald-800 dark:text-emerald-300"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {module.enabled ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>[ON]</span>
                      </>
                    ) : (
                      <>
                        <X className="h-3.5 w-3.5" />
                        <span>[OFF]</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pendingDisable && (
        <CriticalActionModal
          open={true}
          title={m.disableConfirmTitle}
          description={m.disableConfirmDesc}
          impactDetails={[
            `Module: ${pendingDisable.label} (${pendingDisable.key})`,
            m.warning,
          ]}
          requiredConfirmationText="DISABLE"
          dangerLevel="critical"
          busy={busy === pendingDisable.key}
          onCancel={() => setPendingDisable(null)}
          onConfirm={async () => {
            const key = pendingDisable.key;
            setPendingDisable(null);
            await toggle(key, false);
          }}
        />
      )}
    </div>
  );
}
