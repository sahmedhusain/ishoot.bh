"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { SLAPolicy } from "@platform/api-client";
import { TICKET_PRIORITIES } from "@platform/contracts";
import { updateSLAAction } from "../app/actions";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";

export function SLAView({
  policies,
  canEdit,
}: {
  policies: SLAPolicy[];
  canEdit: boolean;
}) {
  const { copy, priority, date } = useCopy();
  const s = copy.sla;
  const [selectedPriority, setSelectedPriority] = React.useState("");

  const byPriority = new Map(policies.map((p) => [p.priority, p]));
  const displayedPriorities = selectedPriority
    ? TICKET_PRIORITIES.filter((p) => p === selectedPriority)
    : TICKET_PRIORITIES;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle title={s.title} description={s.description} />
        <span className="it-status-pane font-bold text-amber-700 dark:text-amber-400">
          T-CODE: SPRO_SLA [SLA POLICY MAINTENANCE]
        </span>
      </div>

      {!canEdit && <p className="text-xs font-mono text-ink-muted">{s.readOnly}</p>}

      <div className="it-card p-0 overflow-x-auto">
        <div className="p-2 border-b border-slate-300 dark:border-slate-700 bg-surface flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase font-mono text-ink">SERVICE LEVEL AGREEMENTS</h2>
          <div className="flex items-center gap-2">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="it-field-sunken text-xs font-mono py-1"
            >
              <option value="">{s.filterPriority}: {s.filterAll}</option>
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {priority(p)}
                </option>
              ))}
            </select>
            <span className="text-[10px] font-mono text-ink-muted">
              TIERS: {displayedPriorities.length} / {TICKET_PRIORITIES.length}
            </span>
          </div>
        </div>

        <table className="it-table w-full font-mono text-xs">
          <thead>
            <tr>
              <th className="text-start">{s.priority}</th>
              <th className="text-start">{s.response} (MIN)</th>
              <th className="text-start">{s.resolve} (MIN)</th>
              <th className="text-start">{s.updatedBy}</th>
              {canEdit && <th className="text-start">ACTIONS</th>}
            </tr>
          </thead>
          <tbody>
            {displayedPriorities.map((p) => {
              const policy = byPriority.get(p);
              return policy ? (
                <Row
                  key={`${p}-${policy.updatedAt}`}
                  policy={policy}
                  label={priority(p)}
                  canEdit={canEdit}
                  updated={date(policy.updatedAt)}
                />
              ) : null;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({
  policy,
  label,
  canEdit,
  updated,
}: {
  policy: SLAPolicy;
  label: string;
  canEdit: boolean;
  updated: string;
}) {
  const { copy } = useCopy();
  const router = useRouter();
  const [response, setResponse] = React.useState(policy.responseMinutes);
  const [resolve, setResolve] = React.useState(policy.resolveMinutes);
  const [busy, setBusy] = React.useState(false);
  const changed =
    response !== policy.responseMinutes || resolve !== policy.resolveMinutes;

  const save = async () => {
    setBusy(true);
    try {
      const { ok } = await updateSLAAction(policy.priority, response, resolve);
      if (!ok) return void toast.error(copy.sla.failed);
      toast.success(copy.sla.saved);
      router.refresh();
    } catch {
      toast.error(copy.sla.failed);
    } finally {
      setBusy(false);
    }
  };

  const field = (value: number, set: (n: number) => void, name: string) =>
    canEdit ? (
      <input
        type="number"
        min={1}
        step={1}
        aria-label={`${label} ${name}`}
        className="it-field-sunken w-24 font-mono text-xs"
        value={value}
        onChange={(e) =>
          set(Math.max(0, Math.trunc(Number(e.target.value) || 0)))
        }
      />
    ) : (
      <span className="font-mono">{value}</span>
    );

  return (
    <tr>
      <td className="font-bold text-ink uppercase">{label}</td>
      <td>{field(response, setResponse, copy.sla.response)}</td>
      <td>{field(resolve, setResolve, copy.sla.resolve)}</td>
      <td className="text-xs text-ink-muted">{updated}</td>
      {canEdit && (
        <td>
          <button
            type="button"
            disabled={!changed || busy}
            onClick={save}
            className="it-btn-3d py-0.5 px-3 font-bold text-emerald-800 dark:text-emerald-300 disabled:opacity-40"
          >
            {copy.sla.save}
          </button>
        </td>
      )}
    </tr>
  );
}
