"use client";
import { useConfirmation } from "@platform/ui";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, FileText, Loader2, Mail, MessageCircle, Printer } from "lucide-react";
import { Button, Card, CurrencyDisplay, Input, Select, formatCurrencyValue, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { ProcurementLineRecord, ProcurementProductOption, PurchaseOrderRecord, SupplierRecord, WarehouseRecord } from "@platform/database";
import { documentTotals } from "@platform/database/constants/procurement";
import { ROUTES } from "../../constants/routes";
import { cancelPurchaseOrderAction, emailPurchaseOrderAction, markPurchaseOrderSentAction, savePurchaseOrderAction, submitPurchaseOrderAction } from "../../app/actions/procurement";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";
import { LinesEditor, emptyLine, linesInput, type LineDraft } from "./LinesEditor";
import { StatusPill } from "./StatusPill";
import { PageHeader } from "../layout/PageHeader";

interface PurchaseOrderViewProps {
  order: PurchaseOrderRecord | null;
  fromRequisition: { id: string; number: string; lines: ProcurementLineRecord[] } | null;
  suppliers: SupplierRecord[];
  warehouses: WarehouseRecord[];
  products: ProcurementProductOption[];
  company: { currency: string; vatEnabled: boolean; vatPercentage: number; name: string };
  rights: { edit: boolean; export: boolean; cancel: boolean; receive?: boolean; bill?: boolean };
  receivePanel?: React.ReactNode;
}

const pdfUrl = (id: string, download = false) => `/api/procurement/orders/${encodeURIComponent(id)}/pdf${download ? "?download=true" : ""}`;
const lineDraft = (l: { product_id: string | null; variant_key: string; description: string; quantity: number; unit_price: number | null }): LineDraft => ({ productId: l.product_id ?? "", variantId: l.variant_key, description: l.product_id ? "" : l.description, quantity: String(l.quantity), unitPrice: l.unit_price == null ? "" : String(l.unit_price) });

export function PurchaseOrderView({ order, fromRequisition, suppliers, warehouses, products, company, rights, receivePanel }: PurchaseOrderViewProps) {
  const confirmAction = useConfirmation();
  const { t, locale } = useAdminLocale();
  const copy = t.procurement.orders;
  const common = t.procurement.common;
  const router = useRouter();
  const editable = rights.edit && (!order || order.status === "draft");
  const defaultWarehouse = warehouses.find((w) => w.is_default) ?? warehouses[0];
  const [form, setForm] = React.useState({
    supplierId: order?.supplier.id ?? suppliers[0]?.id ?? "",
    orderDate: order?.order_date ?? new Date().toISOString().slice(0, 10),
    expectedDate: order?.expected_date ?? "",
    warehouseId: order?.warehouse?.id ?? defaultWarehouse?.id ?? "",
    vatEnabled: order?.vat_enabled ?? company.vatEnabled,
    note: order?.note ?? "",
    terms: order?.terms ?? "",
  });
  const [lines, setLines] = React.useState<LineDraft[]>(() => (order ? order.lines.map(lineDraft) : fromRequisition ? fromRequisition.lines.map(lineDraft) : [emptyLine()]));
  const savedId = React.useRef(order?.id);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));
  const totals = editable ? documentTotals(lines.map((l) => ({ quantity: Number(l.quantity) || 0, unitPrice: Number(l.unitPrice) || 0 })), form.vatEnabled ? company.vatPercentage : 0) : { subtotal: order?.subtotal ?? 0, vatAmount: order?.vat_amount ?? 0, total: order?.total ?? 0 };

  const run = async (task: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
      if (done) setMessage({ tone: "ok", text: done });
      if (!order && savedId.current) router.replace(ROUTES.procurement.order(savedId.current));
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, t) });
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    const result = await savePurchaseOrderAction({ id: savedId.current, ...form, warehouseId: form.warehouseId || undefined, requisitionId: order ? undefined : fromRequisition?.id, lines: linesInput(lines) });
    savedId.current = result.id;
    return result.id;
  };
  const whatsapp = () => {
    if (!order) return;
    const phone = (order.supplier.phone || "").replace(/[^\d]/g, "");
    const text = formatMessage(copy.whatsappText, { number: order.number, company: company.name, total: formatCurrencyValue(order.total, company.currency, locale === "ar"), date: order.expected_date ? formatDate(order.expected_date, locale) : "—" });
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    void run(() => markPurchaseOrderSentAction(order.id, "whatsapp"));
  };
  const sendable = order && ["approved", "sent", "partially_received"].includes(order.status);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <PageHeader
        title={<>{order ? <span dir="ltr">{order.number}</span> : copy.new}{order && <StatusPill status={order.status} />}</>}
        description={[
              order?.requisition && formatMessage(copy.fromRequisition, { number: order.requisition.number }),
              fromRequisition && formatMessage(copy.fromRequisition, { number: fromRequisition.number }),
              order?.rfq && formatMessage(copy.fromRfq, { number: order.rfq.number }),
              order?.created_by && formatMessage(common.createdBy, { name: order.created_by }),
              order?.approved_by && formatMessage(common.approvedBy, { name: order.approved_by }),
              order?.sent_at && formatMessage(copy.sentOn, { date: formatDate(order.sent_at, locale), via: (copy.via as Record<string, string>)[order.sent_via ?? ""] ?? "" }),
            ].filter(Boolean).join(" · ")}
        back={{ href: ROUTES.procurement.orders, label: copy.title }}
        actions={<div className="flex flex-wrap gap-2">
          {editable && (
            <>
              <Button type="button" variant="outline" size="sm" className="rounded-full" disabled={busy} onClick={() => run(save, common.save)} data-testid="order-save">{common.save}</Button>
              <Button type="button" variant="primary" size="sm" className="rounded-full" disabled={busy} onClick={() => run(async () => { const id = await save(); const result = await submitPurchaseOrderAction(id); setMessage({ tone: "ok", text: result.status === "approved" ? copy.approvedNow : copy.submitted }); })} data-testid="order-submit">{copy.submit}</Button>
            </>
          )}
          {order && sendable && rights.export && (
            <Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5" disabled={busy || !order.supplier.email} title={order.supplier.email ? undefined : copy.noEmail} onClick={() => run(async () => { const result = await emailPurchaseOrderAction(order.id); setMessage({ tone: "ok", text: formatMessage(copy.emailQueued, { email: result.recipient }) }); })} data-testid="order-email">
              <Mail className="w-3.5 h-3.5" />
              {copy.sendEmail}
            </Button>
          )}
          {order && sendable && rights.edit && order.supplier.phone && (
            <Button type="button" variant="outline" size="sm" className="rounded-full gap-1.5" disabled={busy} onClick={whatsapp}>
              <MessageCircle className="w-3.5 h-3.5" />
              {copy.sendWhatsApp}
            </Button>
          )}
          {order && order.status !== "draft" && (
            <>
              <a href={pdfUrl(order.id)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant px-3 h-9 text-sm hover:border-accent" data-testid="order-pdf">
                <FileText className="w-3.5 h-3.5" />
                {copy.pdf}
              </a>
              {rights.export && (
                <a href={pdfUrl(order.id, true)} className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant px-3 h-9 text-sm hover:border-accent">
                  <Download className="w-3.5 h-3.5" />
                  {copy.download}
                </a>
              )}
            </>
          )}
          {order && sendable && rights.edit && order.status !== "sent" && (
            <Button type="button" variant="ghost" size="sm" className="rounded-full gap-1.5" disabled={busy} onClick={() => run(() => markPurchaseOrderSentAction(order.id, "printed"))}>
              <Printer className="w-3.5 h-3.5" />
              {copy.markPrinted}
            </Button>
          )}
          {order && rights.bill && order.lines.some((l) => l.received > l.billed) && (
            <Link href={ROUTES.procurement.newBill({ orderId: order.id })} className="inline-flex items-center rounded-full border border-outline-variant px-3 h-9 text-sm hover:border-accent" data-testid="order-bill">{t.procurement.bills.fromOrder}</Link>
          )}
          {order && rights.cancel && ["draft", "pending_approval", "approved", "sent"].includes(order.status) && (
            <Button type="button" variant="ghost" size="sm" className="rounded-full text-rose-600" disabled={busy} onClick={() => confirmAction({ description: common.cancelConfirm, onConfirm: () => run(() => cancelPurchaseOrderAction(order.id)) })}>{copy.cancelOrder}</Button>
          )}
          {busy && <Loader2 className="w-4 h-4 animate-spin self-center" aria-hidden="true" />}
        </div>}
      />
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{message.text}</p>}

      <Card className="p-5 space-y-4" data-page-section>
        <fieldset disabled={!editable} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label={copy.supplier}>
            {(id) => (
              <Select id={id} name="supplier" value={form.supplierId} onChange={(e) => set({ supplierId: e.target.value })} className="rounded-lg">
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            )}
          </Field>
          <Field label={copy.orderDate}>
            {(id) => <Input id={id} type="date" value={form.orderDate} onChange={(e) => set({ orderDate: e.target.value })} className="rounded-lg" />}
          </Field>
          <Field label={copy.expectedDate}>
            {(id) => <Input id={id} type="date" value={form.expectedDate} onChange={(e) => set({ expectedDate: e.target.value })} className="rounded-lg" />}
          </Field>
          <Field label={copy.deliverTo}>
            {(id) => (
              <Select id={id} value={form.warehouseId} onChange={(e) => set({ warehouseId: e.target.value })} className="rounded-lg">
                {warehouses.filter((w) => w.is_active).map((w) => <option key={w.id} value={w.id}>{locale === "ar" ? w.name_ar : w.name_en}</option>)}
              </Select>
            )}
          </Field>
          <Field label={common.note} wide>
            {(id) => <Input id={id} maxLength={1000} value={form.note} onChange={(e) => set({ note: e.target.value })} className="rounded-lg" />}
          </Field>
          <Field label={copy.terms} wide>
            {(id) => <Input id={id} maxLength={2000} value={form.terms} onChange={(e) => set({ terms: e.target.value })} className="rounded-lg" />}
          </Field>
          <label className="flex items-center gap-2.5 text-sm text-ink">
            <input type="checkbox" className="h-4 w-4 accent-accent" checked={form.vatEnabled} onChange={(e) => set({ vatEnabled: e.target.checked })} />
            {`${copy.vat} (${company.vatPercentage}%)`}
          </label>
        </fieldset>
        <h2 className="font-bold text-ink">{t.procurement.lines.title}</h2>
        {editable ? (
          <LinesEditor lines={lines} onChange={setLines} products={products} priceLabel={t.procurement.lines.unitPrice} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-outline-variant">
            <table className="w-full text-sm" data-testid="order-lines">
              <thead className="bg-ink/[0.03] text-xs text-ink-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 text-start font-semibold">{t.procurement.lines.description}</th>
                  <th scope="col" className="px-3 py-2 text-end font-semibold">{t.procurement.lines.quantity}</th>
                  <th scope="col" className="px-3 py-2 text-end font-semibold">{t.procurement.lines.unitPrice}</th>
                  <th scope="col" className="px-3 py-2 text-end font-semibold">{copy.received}</th>
                  <th scope="col" className="px-3 py-2 text-end font-semibold">{copy.billed}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {order?.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2">{l.description}</td>
                    <td className="px-3 py-2 text-end tabular-nums">{l.quantity}</td>
                    <td className="px-3 py-2 text-end"><CurrencyDisplay amount={l.unit_price} currency={company.currency} /></td>
                    <td className="px-3 py-2 text-end tabular-nums">{l.received}</td>
                    <td className="px-3 py-2 text-end tabular-nums">{l.billed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <dl className="ms-auto w-full sm:w-72 space-y-1 text-sm" data-testid="order-totals">
          <div className="flex justify-between"><dt className="text-ink-muted">{common.subtotal}</dt><dd><CurrencyDisplay amount={totals.subtotal} currency={company.currency} /></dd></div>
          {totals.vatAmount > 0 && <div className="flex justify-between"><dt className="text-ink-muted">{common.vat}</dt><dd><CurrencyDisplay amount={totals.vatAmount} currency={company.currency} /></dd></div>}
          <div className="flex justify-between font-bold border-t border-outline-variant pt-1"><dt>{common.total}</dt><dd><CurrencyDisplay amount={totals.total} currency={company.currency} /></dd></div>
        </dl>
      </Card>

      {receivePanel}

      {order && (order.receipts.length > 0 || order.bills.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="p-5 space-y-2" data-page-section>
            <h2 className="font-bold text-ink">{copy.receipts}</h2>
            {order.receipts.map((r) => <p key={r.id} className="text-sm flex justify-between gap-2"><span className="font-mono text-xs" dir="ltr">{r.number}</span><span className="text-ink-muted">{formatDate(r.received_at, locale)}</span><span className="tabular-nums">{r.quantity}</span></p>)}
          </Card>
          <Card className="p-5 space-y-2" data-page-section>
            <h2 className="font-bold text-ink">{copy.bills}</h2>
            {order.bills.map((b) => <Link key={b.id} href={ROUTES.procurement.bill(b.id)} className="text-sm flex justify-between gap-2 hover:text-accent"><span className="font-mono text-xs" dir="ltr">{b.number}</span><StatusPill status={b.status} /><CurrencyDisplay amount={b.total} currency={company.currency} /></Link>)}
          </Card>
        </div>
      )}
    </div>
  );
}
