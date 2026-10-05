"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@ishoot/ui";
import { REQUEST_PRIORITIES, type RequestKind } from "@ishoot/database/constants/requests";
import {
  convertInquiryToClientAction,
  linkInquiryCustomerAction,
  manageInquiryAction,
  updateInquiryStatusAction,
} from "../../app/actions/crm";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { EntityLookup } from "../shared/EntityLookup";

const LEAD_STATUSES = ["new", "contacted", "qualified", "archived"] as const;
const FEEDBACK_STATUSES = ["new", "in_progress", "waiting", "resolved"] as const;

/** Priority, SLA, ownership and (for sales leads) qualification and conversion — on the request's own page. */
export function RequestManagePanel({
  request,
  kind,
  canManage,
  canSell,
}: {
  request: { id: string; priority: string; slaDueDate: Date | string | null; status: string; customerId: string | null; convertedDealId: string | null };
  kind: RequestKind;
  canManage: boolean;
  canSell: boolean;
}) {
  const { t } = useAdminLocale();
  const copy = t.requestManage;
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [priority, setPriority] = React.useState(request.priority);
  const [sla, setSla] = React.useState(request.slaDueDate ? new Date(request.slaDueDate).toISOString().slice(0, 10) : "");
  const [customerId, setCustomerId] = React.useState("");
  const run = async (fn: () => Promise<unknown>, after?: (result: any) => void) => {
    setBusy(true);
    try {
      const result = await fn();
      toast.success(copy.saved);
      after?.(result);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : copy.failed);
    } finally {
      setBusy(false);
    }
  };
  if (!canManage && !canSell) return null;
  const field = "w-full rounded-xl border border-ink/15 bg-surface px-3 py-2 text-xs text-ink";
  const isLead = kind === "quote" || kind === "inquiry";
  const statuses = kind === "feedback" ? FEEDBACK_STATUSES : LEAD_STATUSES;

  return (
    <div className="p-6 rounded-2xl bg-surface border border-ink/10 shadow-sm space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-accent">{copy.title}</h3>
      {canManage && (
        <div className="space-y-3 text-xs">
          <label className="block space-y-1">
            <span className="text-ink-muted">{copy.priority}</span>
            <select className={field} value={priority} onChange={(e) => setPriority(e.target.value)}>
              {REQUEST_PRIORITIES.map((p) => <option key={p} value={p}>{t.requestLabels.priority[p]}</option>)}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-ink-muted">{copy.sla}</span>
            <input type="date" className={field} value={sla} onChange={(e) => setSla(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => run(() => manageInquiryAction(request.id, { priority, slaDueDate: sla || null }))}>{copy.save}</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => manageInquiryAction(request.id, { claim: true }))}>{copy.claim}</Button>
          </div>
        </div>
      )}

      {canSell && (isLead || kind === "feedback") && (
        <div className="space-y-3 border-t border-ink/10 pt-4 text-xs">
          <h4 className="font-semibold text-ink">{copy.salesTitle}</h4>
          <label className="block space-y-1">
            <span className="text-ink-muted">{copy.leadStatus}</span>
            <select
              className={field}
              value={request.status}
              disabled={busy}
              onChange={(e) => run(() => updateInquiryStatusAction(request.id, e.target.value as never))}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>{kind === "feedback" ? copy.feedbackStatuses[s as keyof typeof copy.feedbackStatuses] : copy.leadStatuses[s as keyof typeof copy.leadStatuses]}</option>
              ))}
            </select>
          </label>
          {isLead && !request.convertedDealId && (
            <>
              {!request.customerId && (
                <div className="space-y-1">
                  <span className="text-ink-muted">{copy.linkCustomer}</span>
                  <EntityLookup domain="contacts" value={customerId} onChange={setCustomerId} />
                  <Button size="sm" variant="outline" disabled={busy || !customerId} onClick={() => run(() => linkInquiryCustomerAction(request.id, customerId))}>{copy.link}</Button>
                </div>
              )}
              <Button
                size="sm"
                disabled={busy}
                onClick={() => run(() => convertInquiryToClientAction(request.id), (res) => res?.dealId && router.push(ROUTES.crm.deal(res.dealId)))}
              >
                {copy.convert}
              </Button>
            </>
          )}
          {request.convertedDealId && (
            <Button size="sm" variant="outline" onClick={() => router.push(ROUTES.crm.deal(request.convertedDealId!))}>{copy.converted}</Button>
          )}
        </div>
      )}
    </div>
  );
}
