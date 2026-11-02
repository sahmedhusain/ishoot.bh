"use client";
import { useConfirmation } from "@platform/ui";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button, Card, CurrencyDisplay, Input, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { ProcurementLineRecord, ProcurementProductOption } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { cancelRequisitionAction, createRfqAction, saveRequisitionAction, submitRequisitionAction } from "../../app/actions/procurement";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";
import { LinesEditor, emptyLine, linesInput, linesSubtotal, type LineDraft } from "./LinesEditor";
import { StatusPill } from "./StatusPill";
import { PageHeader } from "../layout/PageHeader";

interface Requisition {
  id: string;
  number: string;
  status: string;
  requested_by: string;
  needed_by: string | null;
  note: string;
  decision_note: string;
  estimated_total: number;
  lines: ProcurementLineRecord[];
  orders: { id: string; number: string; status: string }[];
  rfqs: { id: string; number: string; status: string }[];
}

const toDraft = (l: ProcurementLineRecord): LineDraft => ({ productId: l.product_id ?? "", variantId: l.variant_key, description: l.product_id ? "" : l.description, quantity: String(l.quantity), unitPrice: l.unit_price == null ? "" : String(l.unit_price) });

/** One requisition: edited while a draft (or after a rejection), then sent for approval and turned into orders. */
export function RequisitionView({ requisition, products, currency, canEdit, canProcure }: { requisition: Requisition | null; products: ProcurementProductOption[]; currency: string; canEdit: boolean; canProcure: boolean }) {
  const confirmAction = useConfirmation();
  const { t, locale } = useAdminLocale();
  const copy = t.procurement.requisitions;
  const common = t.procurement.common;
  const router = useRouter();
  const editable = canEdit && (!requisition || requisition.status === "draft" || requisition.status === "rejected");
  const [lines, setLines] = React.useState<LineDraft[]>(requisition?.lines.length ? requisition.lines.map(toDraft) : [emptyLine()]);
  const [neededBy, setNeededBy] = React.useState(requisition?.needed_by ?? "");
  const [note, setNote] = React.useState(requisition?.note ?? "");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const savedId = React.useRef(requisition?.id);

  const run = async (task: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
      if (done) setMessage({ tone: "ok", text: done });
      if (!requisition && savedId.current) router.replace(ROUTES.procurement.requisition(savedId.current));
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, t) });
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    const result = await saveRequisitionAction({ id: savedId.current, neededBy, note, lines: linesInput(lines) });
    savedId.current = result.id;
    return result.id;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <PageHeader
        title={<>{requisition ? <span dir="ltr">{requisition.number}</span> : copy.editorTitle}{requisition && <StatusPill status={requisition.status} />}</>}
        back={{ href: ROUTES.procurement.requisitions, label: copy.title }}
        meta={requisition && <p className="text-xs text-ink-muted mt-1">{`${copy.requestedBy}: ${requisition.requested_by}`}</p>}
        actions={<div className="flex flex-wrap gap-2">
          {editable && (
            <>
              <Button type="button" variant="outline" size="sm" className="rounded-full" disabled={busy} onClick={() => run(save, common.save)} data-testid="requisition-save">{common.save}</Button>
              <Button type="button" variant="primary" size="sm" className="rounded-full" disabled={busy} onClick={() => run(async () => { const id = await save(); const result = await submitRequisitionAction(id); setMessage({ tone: "ok", text: result.status === "approved" ? copy.approvedNow : copy.submitted }); })} data-testid="requisition-submit">{copy.submit}</Button>
            </>
          )}
          {requisition?.status === "approved" && canProcure && (
            <>
              <Button type="button" variant="outline" size="sm" className="rounded-full" disabled={busy} onClick={() => run(async () => { const result = await createRfqAction({ title: requisition.number, dueDate: "", note: requisition.note, requisitionId: requisition.id, lines: [] }); router.push(ROUTES.procurement.rfq(result.id)); })} data-testid="requisition-rfq">{copy.toRfq}</Button>
              <Link href={ROUTES.procurement.newOrder({ requisitionId: requisition.id })} className="inline-flex items-center rounded-full bg-primary px-4 h-9 text-sm font-semibold text-primary-foreground hover:opacity-90" data-testid="requisition-order">{copy.toOrder}</Link>
            </>
          )}
          {requisition && canEdit && ["draft", "rejected", "approved"].includes(requisition.status) && (
            <Button type="button" variant="ghost" size="sm" className="rounded-full text-rose-600" disabled={busy} onClick={() => confirmAction({ description: common.cancelConfirm, onConfirm: () => run(() => cancelRequisitionAction(requisition.id)) })}>{common.cancel}</Button>
          )}
          {busy && <Loader2 className="w-4 h-4 animate-spin self-center" aria-hidden="true" />}
        </div>}
      />
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{message.text}</p>}
      {requisition?.status === "rejected" && requisition.decision_note && <p className="text-sm rounded-xl px-4 py-3 bg-rose-500/10 text-rose-700 dark:text-rose-300">{formatMessage(copy.rejectedBecause, { reason: requisition.decision_note })}</p>}

      <Card className="p-5 space-y-4" data-page-section>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label={copy.neededBy}>
            {(id) => <Input id={id} type="date" disabled={!editable} value={neededBy} onChange={(e) => setNeededBy(e.target.value)} className="rounded-lg" />}
          </Field>
          <Field label={common.note} wide>
            {(id) => <Input id={id} maxLength={1000} disabled={!editable} value={note} onChange={(e) => setNote(e.target.value)} className="rounded-lg" />}
          </Field>
        </div>
        <h2 className="font-bold text-ink">{t.procurement.lines.title}</h2>
        <LinesEditor lines={lines} onChange={setLines} products={products} priceLabel={t.procurement.lines.estimatedCost} readOnly={!editable} />
        <p className="text-sm text-end">
          <span className="text-ink-muted">{copy.estimatedTotal}: </span>
          <span className="font-semibold"><CurrencyDisplay amount={editable ? linesSubtotal(lines) : requisition?.estimated_total ?? 0} currency={currency} /></span>
        </p>
      </Card>

      {requisition && (requisition.rfqs.length > 0 || requisition.orders.length > 0) && (
        <Card className="p-5 space-y-2">
          {requisition.rfqs.map((r) => (
            <Link key={r.id} href={ROUTES.procurement.rfq(r.id)} className="flex items-center gap-3 text-sm hover:text-accent"><span className="font-mono text-xs" dir="ltr">{r.number}</span><StatusPill status={r.status} /></Link>
          ))}
          {requisition.orders.map((o) => (
            <Link key={o.id} href={ROUTES.procurement.order(o.id)} className="flex items-center gap-3 text-sm hover:text-accent"><span className="font-mono text-xs" dir="ltr">{o.number}</span><StatusPill status={o.status} /></Link>
          ))}
        </Card>
      )}
      {requisition?.needed_by && !editable && <p className="text-xs text-ink-muted">{`${copy.neededBy}: ${formatDate(requisition.needed_by, locale)}`}</p>}
    </div>
  );
}
