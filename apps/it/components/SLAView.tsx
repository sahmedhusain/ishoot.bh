"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Card, Input } from "@platform/ui";
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
  const byPriority = new Map(policies.map((p) => [p.priority, p]));
  return (
    <>
      <PageTitle title={s.title} description={s.description} />
      {!canEdit && <p className="text-xs text-ink-muted mb-4">{s.readOnly}</p>}
      <Card className="rounded-3xl bg-surface border border-outline-variant overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-start text-xs text-ink-muted border-b border-outline-variant">
              <th className="p-4 text-start font-semibold">{s.priority}</th>
              <th className="p-4 text-start font-semibold">{s.response}</th>
              <th className="p-4 text-start font-semibold">{s.resolve}</th>
              <th className="p-4 text-start font-semibold">{s.updatedBy}</th>
              {canEdit && <th className="p-4" />}
            </tr>
          </thead>
          <tbody>
            {TICKET_PRIORITIES.map((p) => {
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
      </Card>
    </>
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
      <Input
        type="number"
        min={1}
        step={1}
        aria-label={`${label} ${name}`}
        className="max-w-[10rem]"
        value={value}
        onChange={(e) =>
          set(Math.max(0, Math.trunc(Number(e.target.value) || 0)))
        }
      />
    ) : (
      <span className="font-mono">{value}</span>
    );

  return (
    <tr className="border-b border-outline-variant last:border-0">
      <td className="p-4 font-semibold text-ink">{label}</td>
      <td className="p-4">{field(response, setResponse, copy.sla.response)}</td>
      <td className="p-4">{field(resolve, setResolve, copy.sla.resolve)}</td>
      <td className="p-4 text-xs text-ink-muted">{updated}</td>
      {canEdit && (
        <td className="p-4 text-end">
          <Button
            type="button"
            size="sm"
            variant="primary"
            disabled={!changed || busy}
            onClick={save}
          >
            {copy.sla.save}
          </Button>
        </td>
      )}
    </tr>
  );
}
