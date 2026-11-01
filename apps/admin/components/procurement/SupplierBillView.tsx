"use client";
import { useConfirmation } from "@platform/ui";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, Paperclip, Plus, Trash2 } from "lucide-react";
import { Button, Card, CurrencyDisplay, Input, Select, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { SupplierBillRecord } from "@platform/database";
import { SUPPLIER_PAYMENT_METHODS, documentTotals } from "@platform/database/constants/procurement";
import { ROUTES } from "../../constants/routes";
import { approveSupplierBillAction, attachSupplierBillFileAction, cancelSupplierBillAction, recordSupplierPaymentAction, saveSupplierBillAction } from "../../app/actions/procurement";
import { uploadForClaim } from "../../lib/upload-client";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";
import { StatusPill } from "./StatusPill";
import { PageHeader } from "../layout/PageHeader";

interface LineDraft {
  orderLineId?: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

interface SupplierBillViewProps {
  bill: SupplierBillRecord | null;
  fromOrder: { supplierId: string; purchaseOrderId: string; number: string; lines: { orderLineId: string; description: string; quantity: number; unitPrice: number }[]; vatAmount: number } | null;
  suppliers: { id: string; name: string }[];
  currency: string;
  rights: { edit: boolean; approve: boolean; pay: boolean };
}

const today = () => new Date().toISOString().slice(0, 10);

/** One supplier bill: entered (from an order or by hand), matched, approved into an expense and paid. */
export function SupplierBillView({ bill, fromOrder, suppliers, currency, rights }: SupplierBillViewProps) {
  const confirmAction = useConfirmation();
  const { t, locale } = useAdminLocale();
  const copy = t.procurement.bills;
  const common = t.procurement.common;
  const router = useRouter();
  const editable = rights.edit && (!bill || bill.status === "draft");
  const [form, setForm] = React.useState({
    supplierId: bill?.supplier.id ?? fromOrder?.supplierId ?? suppliers[0]?.id ?? "",
    supplierRef: bill?.supplier_ref ?? "",
    billDate: bill?.bill_date ?? today(),
    dueDate: bill?.due_date ?? "",
    vatAmount: String(bill?.vat_amount ?? fromOrder?.vatAmount ?? 0),
    note: bill?.note ?? "",
    attachmentUrl: bill?.attachment_url ?? "",
  });
  const [lines, setLines] = React.useState<LineDraft[]>(() =>
    bill ? bill.lines.map((l) => ({ orderLineId: l.order_line_id ?? undefined, description: l.description, quantity: String(l.quantity), unitPrice: String(l.unit_price) })) : fromOrder?.lines.length ? fromOrder.lines.map((l) => ({ orderLineId: l.orderLineId, description: l.description, quantity: String(l.quantity), unitPrice: String(l.unitPrice) })) : [{ description: "", quantity: "1", unitPrice: "" }],
  );
  const [override, setOverride] = React.useState("");
  const [payment, setPayment] = React.useState({ amount: "", paidOn: today(), method: "bank_transfer", reference: "" });
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const subtotal = documentTotals(lines.map((l) => ({ quantity: Number(l.quantity) || 0, unitPrice: Number(l.unitPrice) || 0 })), 0).subtotal;
  const total = Math.round((subtotal + (Number(form.vatAmount) || 0)) * 1000) / 1000;
  const issueName = (issue: string) => (copy.issues as Record<string, string>)[issue] ?? issue;

  const run = async (task: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
      if (done) setMessage({ tone: "ok", text: done });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, t) });
    } finally {
      setBusy(false);
    }
  };
  const save = () =>
    run(async () => {
      const result = await saveSupplierBillAction({ id: bill?.id, ...form, purchaseOrderId: bill?.order?.id ?? fromOrder?.purchaseOrderId, lines: lines.map((l) => ({ orderLineId: l.orderLineId, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice })) });
      if (!bill) router.replace(ROUTES.procurement.bill(result.id));
    }, common.save);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <PageHeader
        title={<>{bill ? <span dir="ltr">{bill.number}</span> : copy.new}{bill && <StatusPill status={bill.status} />}</>}
        description={[
              bill?.order && <Link key="o" href={ROUTES.procurement.order(bill.order.id)} className="hover:text-accent" dir="ltr">{bill.order.number}</Link>,
              fromOrder && <span key="f" dir="ltr">{fromOrder.number}</span>,
              bill?.created_by && <span key="c">{formatMessage(common.createdBy, { name: bill.created_by })}</span>,
              bill?.approved_by && <span key="a">{formatMessage(common.approvedBy, { name: bill.approved_by })}</span>,
            ].filter(Boolean).reduce<React.ReactNode[]>((all, item, i) => (i ? [...all, " · ", item] : [item]), [])}
        back={{ href: ROUTES.procurement.bills, label: copy.title }}
        actions={<div className="flex flex-wrap gap-2">
          {editable && <Button type="button" variant="primary" size="sm" className="rounded-full" disabled={busy} onClick={save} data-testid="bill-save">{common.save}</Button>}
          {bill?.expense_id && <Link href={ROUTES.expenses.list({ highlight: bill.expense_id })} className="inline-flex items-center rounded-full border border-outline-variant px-3 h-9 text-sm hover:border-accent">{copy.expense}</Link>}
          {bill?.status === "draft" && rights.edit && <Button type="button" variant="ghost" size="sm" className="rounded-full text-rose-600" disabled={busy} onClick={() => confirmAction({ description: common.cancelConfirm, onConfirm: () => run(() => cancelSupplierBillAction(bill.id)) })}>{common.cancel}</Button>}
          {busy && <Loader2 className="w-4 h-4 animate-spin self-center" aria-hidden="true" />}
        </div>}
      />
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{message.text}</p>}

      <Card className="p-5 space-y-4" data-page-section>
        <fieldset disabled={!editable} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label={copy.supplier}>
            {(id) => (
              <Select id={id} value={form.supplierId} disabled={!!(bill?.order || fromOrder)} onChange={(e) => set({ supplierId: e.target.value })} className="rounded-lg">
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            )}
          </Field>
          <Field label={copy.supplierRef}>
            {(id) => <Input id={id} name="supplierRef" dir="ltr" maxLength={60} value={form.supplierRef} onChange={(e) => set({ supplierRef: e.target.value })} className="rounded-lg font-mono" />}
          </Field>
          <Field label={copy.billDate}>
            {(id) => <Input id={id} type="date" value={form.billDate} onChange={(e) => set({ billDate: e.target.value })} className="rounded-lg" />}
          </Field>
          <Field label={copy.dueDate}>
            {(id) => <Input id={id} type="date" value={form.dueDate} onChange={(e) => set({ dueDate: e.target.value })} className="rounded-lg" />}
          </Field>
          <Field label={common.note} wide>
            {(id) => <Input id={id} maxLength={1000} value={form.note} onChange={(e) => set({ note: e.target.value })} className="rounded-lg" />}
          </Field>
          <Field label={copy.vatAmount}>
            {(id) => <Input id={id} name="vatAmount" type="number" min={0} step="any" value={form.vatAmount} onChange={(e) => set({ vatAmount: e.target.value })} className="rounded-lg" />}
          </Field>
        </fieldset>
        {bill && (
          <div className="flex flex-wrap items-center gap-3" data-testid="bill-file">
            {bill.attachment_url ? <a href={bill.attachment_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-accent hover:underline">{copy.attachment}</a> : null}
            {bill.status !== "cancelled" && (
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-outline-variant px-3 h-8 text-xs font-semibold hover:border-accent">
                <Paperclip className="w-3.5 h-3.5" aria-hidden="true" />
                {bill.attachment_url ? copy.replaceFile : copy.attachFile}
                <input
                  type="file"
                  name="billFile"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void run(async () => attachSupplierBillFileAction(bill.id, (await uploadForClaim(file, { entityType: "supplier_bill", entityId: bill.id })).fileUrl), copy.fileAttached);
                  }}
                />
              </label>
            )}
          </div>
        )}

        <h2 className="font-bold text-ink">{t.procurement.lines.title}</h2>
        {editable ? (
          <div className="space-y-2">
            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center rounded-xl border border-outline-variant p-3">
                <Input aria-label={`${t.procurement.lines.description} ${index + 1}`} maxLength={300} value={line.description} onChange={(e) => setLines(lines.map((l, i) => (i === index ? { ...l, description: e.target.value } : l)))} className="col-span-2 sm:col-span-6 h-10 rounded-lg" />
                <Input aria-label={`${t.procurement.lines.quantity} ${index + 1}`} type="number" min={0} step="0.001" value={line.quantity} onChange={(e) => setLines(lines.map((l, i) => (i === index ? { ...l, quantity: e.target.value } : l)))} className="sm:col-span-2 h-10 rounded-lg" />
                <Input aria-label={`${t.procurement.lines.unitPrice} ${index + 1}`} type="number" min={0} step="any" value={line.unitPrice} onChange={(e) => setLines(lines.map((l, i) => (i === index ? { ...l, unitPrice: e.target.value } : l)))} className="sm:col-span-3 h-10 rounded-lg" />
                <button type="button" aria-label={formatMessage(t.procurement.lines.remove, { number: index + 1 })} disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, i) => i !== index))} className="sm:col-span-1 justify-self-end p-2 rounded-lg text-rose-600 hover:bg-rose-500/10 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {!(bill?.order || fromOrder) && (
              <Button type="button" size="sm" variant="outline" className="rounded-full gap-1.5" onClick={() => setLines([...lines, { description: "", quantity: "1", unitPrice: "" }])}><Plus className="w-3.5 h-3.5" />{t.procurement.lines.add}</Button>
            )}
          </div>
        ) : null}

        {bill && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              {copy.match}
              {bill.matched ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" />{copy.matched}</span> : <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300"><AlertTriangle className="w-3.5 h-3.5" />{copy.mismatched}</span>}
            </h3>
            <div className="overflow-x-auto rounded-xl border border-outline-variant">
              <table className="w-full text-sm" data-testid="bill-match">
                <thead className="bg-ink/[0.03] text-xs text-ink-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-start font-semibold">{t.procurement.lines.description}</th>
                    <th scope="col" className="px-3 py-2 text-end font-semibold">{t.procurement.lines.quantity}</th>
                    <th scope="col" className="px-3 py-2 text-end font-semibold">{t.procurement.lines.unitPrice}</th>
                    <th scope="col" className="px-3 py-2 text-end font-semibold">{copy.ordered}</th>
                    <th scope="col" className="px-3 py-2 text-end font-semibold">{copy.receivedQty}</th>
                    <th scope="col" className="px-3 py-2 text-end font-semibold">{copy.orderedPrice}</th>
                    <th scope="col" className="px-3 py-2 text-start font-semibold">{copy.match}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {bill.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="px-3 py-2">{l.description}</td>
                      <td className="px-3 py-2 text-end tabular-nums">{l.quantity}</td>
                      <td className="px-3 py-2 text-end"><CurrencyDisplay amount={l.unit_price} currency={currency} /></td>
                      <td className="px-3 py-2 text-end tabular-nums text-ink-muted">{l.ordered ?? "—"}</td>
                      <td className="px-3 py-2 text-end tabular-nums text-ink-muted">{l.received ?? "—"}</td>
                      <td className="px-3 py-2 text-end text-ink-muted">{l.ordered_price == null ? "—" : <CurrencyDisplay amount={l.ordered_price} currency={currency} />}</td>
                      <td className="px-3 py-2">
                        {l.issues.length ? l.issues.map((issue) => <span key={issue} className="me-1 inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">{issueName(issue)}</span>) : <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-label={copy.matched} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {bill.override_reason && <p className="text-xs text-amber-700 dark:text-amber-300">{formatMessage(copy.overridden, { reason: bill.override_reason })}</p>}
          </div>
        )}

        <dl className="ms-auto w-full sm:w-72 space-y-1 text-sm" data-testid="bill-totals">
          <div className="flex justify-between"><dt className="text-ink-muted">{common.subtotal}</dt><dd><CurrencyDisplay amount={editable ? subtotal : bill?.subtotal ?? 0} currency={currency} /></dd></div>
          <div className="flex justify-between"><dt className="text-ink-muted">{common.vat}</dt><dd><CurrencyDisplay amount={editable ? Number(form.vatAmount) || 0 : bill?.vat_amount ?? 0} currency={currency} /></dd></div>
          <div className="flex justify-between font-bold border-t border-outline-variant pt-1"><dt>{common.total}</dt><dd><CurrencyDisplay amount={editable ? total : bill?.total ?? 0} currency={currency} /></dd></div>
          {bill && bill.status !== "draft" && (
            <>
              <div className="flex justify-between"><dt className="text-ink-muted">{copy.paid}</dt><dd><CurrencyDisplay amount={bill.amount_paid} currency={currency} /></dd></div>
              <div className="flex justify-between font-semibold"><dt>{copy.balance}</dt><dd data-testid="bill-balance"><CurrencyDisplay amount={Math.round((bill.total - bill.amount_paid) * 1000) / 1000} currency={currency} /></dd></div>
            </>
          )}
        </dl>
      </Card>

      {bill?.status === "draft" && rights.approve && (
        <Card className="p-5 space-y-3">
          {!bill.matched && (
            <Field label={copy.overrideReason}>
              {(id) => <Input id={id} name="overrideReason" maxLength={500} value={override} onChange={(e) => setOverride(e.target.value)} className="rounded-lg" />}
            </Field>
          )}
          <Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5" disabled={busy || (!bill.matched && !override.trim())} onClick={() => run(() => approveSupplierBillAction(bill.id, override), copy.approved)} data-testid="bill-approve">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {bill.matched ? copy.approve : copy.approveAnyway}
          </Button>
        </Card>
      )}

      {bill && bill.status !== "draft" && bill.status !== "cancelled" && (
        <Card className="p-5 space-y-3" data-page-section>
          <h2 className="font-bold text-ink">{copy.payments}</h2>
          {bill.payments.map((p) => (
            <p key={p.id} className="text-sm flex flex-wrap justify-between gap-2">
              <span>{formatDate(p.paid_on, locale)}</span>
              <span className="text-ink-muted">{(copy.methods as Record<string, string>)[p.method] ?? p.method}{p.reference ? ` · ${p.reference}` : ""}</span>
              <CurrencyDisplay amount={p.amount} currency={currency} />
            </p>
          ))}
          {rights.pay && bill.amount_paid < bill.total && (
            <div className="grid sm:grid-cols-5 gap-2 items-end" data-testid="bill-payment">
              <Field label={copy.amount}>{(id) => <Input id={id} name="paymentAmount" type="number" min={0} step="any" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} className="rounded-lg" />}</Field>
              <Field label={copy.paidOn}>{(id) => <Input id={id} type="date" value={payment.paidOn} onChange={(e) => setPayment({ ...payment, paidOn: e.target.value })} className="rounded-lg" />}</Field>
              <Field label={copy.method}>
                {(id) => (
                  <Select id={id} value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })} className="rounded-lg">
                    {SUPPLIER_PAYMENT_METHODS.map((m) => <option key={m} value={m}>{copy.methods[m]}</option>)}
                  </Select>
                )}
              </Field>
              <Field label={copy.reference}>{(id) => <Input id={id} maxLength={100} value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} className="rounded-lg" />}</Field>
              <Button type="button" variant="primary" size="sm" className="rounded-full h-11" disabled={busy || !payment.amount} onClick={() => run(async () => { await recordSupplierPaymentAction(bill.id, payment); setPayment({ ...payment, amount: "", reference: "" }); }, copy.paymentSaved)} data-testid="bill-pay">{copy.recordPayment}</Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
