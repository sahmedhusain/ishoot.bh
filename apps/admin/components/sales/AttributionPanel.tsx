"use client";

import { Select } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { errorMessage } from "../../lib/error-text";
import * as React from "react";
import { useRouter } from "next/navigation";
import { History, UserCheck, UserPen } from "lucide-react";
import { toast } from "sonner";
import type { AttributionInfo } from "@platform/database/queries/sales-attribution";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { reassignSalesOwnerAction } from "../../app/actions/sales";

interface AttributionPanelProps {
  entityType: "quotation" | "invoice";
  entityId: string;
  info: AttributionInfo;
  salesPeople: { id: string; name: string }[];
  canReassign: boolean;
}

/** Who issued the document, who it is credited to, and every change of credit. */
export function AttributionPanel({ entityType, entityId, info, salesPeople, canReassign }: AttributionPanelProps) {
  const { t, locale } = useAdminLocale();
  const a = t.attribution;
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [owner, setOwner] = React.useState(info.salesOwner?.id ?? "");
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    if (!owner) return;
    setSaving(true);
    try {
      await reassignSalesOwnerAction(entityType, entityId, owner, reason || null);
      toast.success(a.saved);
      setEditing(false);
      setReason("");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err, t, a.failed));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-outline-variant bg-surface p-5 space-y-4">
      <h3 className="text-sm font-bold text-ink flex items-center gap-2">
        <UserCheck className="w-4 h-4 text-accent" />
        <bdi dir="auto">{a.title}</bdi>
      </h3>
      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-ink-muted">{a.issuedBy}</dt>
          <dd className="font-semibold text-ink mt-0.5"><bdi dir="auto">{info.issuedBy?.name ?? "—"}</bdi></dd>
        </div>
        <div>
          <dt className="text-ink-muted">{a.creditedTo}</dt>
          <dd className="font-semibold text-ink mt-0.5"><bdi dir="auto">{info.salesOwner?.name ?? "—"}</bdi></dd>
        </div>
      </dl>

      {canReassign && !editing && (
        <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
          <UserPen className="w-3.5 h-3.5" />
          {a.change}
        </button>
      )}
      {editing && (
        <div className="space-y-2">
          <Select
            aria-label={a.creditedTo}
            className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-xs text-ink"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          >
            {salesPeople.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <input
            className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-xs text-ink"
            placeholder={a.reasonPlaceholder}
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-2">
            <button type="button" disabled={saving} onClick={save} className="px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold disabled:opacity-60">
              {t.actions.save}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-full border border-outline-variant text-xs text-ink">
              {t.actions.cancel}
            </button>
          </div>
        </div>
      )}

      {info.history.length > 0 && (
        <div className="pt-3 border-t border-outline-variant">
          <div className="text-[11px] font-semibold text-ink-muted flex items-center gap-1.5 mb-2">
            <History className="w-3.5 h-3.5" />
            {a.history}
          </div>
          <ol className="space-y-2">
            {info.history.map((h) => (
              <li key={h.id} className="text-[11px] text-ink">
                {formatMessage(a.historyLine, { from: h.from ?? "—", to: h.to, by: h.changedBy })}
                <span className="text-ink-muted"> · {new Date(h.at).toLocaleDateString(locale === "ar" ? "ar-u-nu-latn" : "en-GB")}</span>
                {h.reason && <div className="text-ink-muted italic">“{h.reason}”</div>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
