"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, CreditCard, Link2, Loader2 } from "lucide-react";
import { Button, Card, CurrencyDisplay, Input, Select, formatCurrencyValue, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { OrderRecord, orderPaymentAttempts, requestsForOrder } from "@platform/database";
import { ORDER_TRANSITIONS, type OrderStatus } from "@platform/database/constants/store";
import { ROUTES } from "../../constants/routes";
import { addOrderNoteAction, issueOrderInvoiceAction, moveOrderAction, recordOrderPaymentAction, recordOrderRefundAction } from "../../app/actions/orders";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";
import { OrderStatusPill, PaymentStatusPill } from "./OrderPills";

/** One order: who and where, the items and totals, moving it along, payments, refunds, invoice and history. */
type Attempt = Awaited<ReturnType<typeof orderPaymentAttempts>>[number];
type OrderRequest = Awaited<ReturnType<typeof requestsForOrder>>[number];

export function OrderView({ order, attempts, requests, paymentLink, rights }: { order: OrderRecord; attempts: Attempt[]; requests: OrderRequest[]; paymentLink: string; rights: { edit: boolean; refund: boolean; invoice: boolean } }) {
  const { t, locale } = useAdminLocale();
  const copy = t.orders.detail;
  const router = useRouter();
  const [note, setNote] = React.useState("");
  const [payment, setPayment] = React.useState({ amount: String(Math.max(0, Math.round((order.total - order.amount_paid) * 1000) / 1000)), method: "cash", reference: "" });
  const [refund, setRefund] = React.useState({ amount: "", reason: "" });
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const money = (value: number) => formatCurrencyValue(value, order.currency, locale === "ar");
  const gatewayName = (id: string) => (t.integrations.providers as Record<string, { name: string }>)[id]?.name ?? id;
  const paidOnline = attempts.find((a) => a.status === "paid" && a.amount > a.amount_refunded);
  const next = (ORDER_TRANSITIONS[order.status as OrderStatus] ?? []).filter((s) => s !== "paid");

  const run = async (task: () => Promise<unknown>, done = copy.saved) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
      setMessage({ tone: "ok", text: done });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, t) });
    } finally {
      setBusy(false);
    }
  };
  const eventText = (e: OrderRecord["events"][number]) => {
    if (e.kind === "status") return formatMessage(copy.events.status, { status: (t.orders.statuses as Record<string, string>)[e.status ?? ""] ?? e.status ?? "" });
    if (e.kind === "payment" || e.kind === "refund") return formatMessage(copy.events[e.kind], { amount: money(e.amount ?? 0) });
    return copy.events.note;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Link href={ROUTES.orders.list} className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-accent">
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
            {copy.back}
          </Link>
          <h1 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex flex-wrap items-center gap-3">
            <span dir="ltr">{order.number}</span>
            <OrderStatusPill status={order.status} />
            <PaymentStatusPill status={order.payment_status} />
          </h1>
          <p className="text-xs text-ink-muted mt-1">{[(t.orders.channels as Record<string, string>)[order.channel], (t.orders.paymentMethods as Record<string, string>)[order.payment_method], formatDate(order.placed_at, locale, "time")].join(" · ")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {rights.edit && next.map((status) => (
            <Button key={status} type="button" size="sm" variant={status === "cancelled" || status === "returned" ? "ghost" : "primary"} className={`rounded-full ${status === "cancelled" ? "text-rose-600" : ""}`} disabled={busy} onClick={() => { const confirm = (copy.moveConfirm as Record<string, string>)[status]; if (confirm && !window.confirm(confirm)) return; void run(() => moveOrderAction(order.id, status, note)); }} data-testid={`order-move-${status}`}>
              {(copy.moveTo as Record<string, string>)[status]}
            </Button>
          ))}
          {order.invoice ? (
            <Link href={ROUTES.invoices.detail(order.invoice.id)} className="inline-flex items-center rounded-full border border-ink/15 px-3 h-9 text-sm hover:border-accent" data-testid="order-invoice">{formatMessage(copy.invoice, { number: order.invoice.invoiceNumber })}</Link>
          ) : rights.invoice && !["cancelled"].includes(order.status) ? (
            <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={() => run(() => issueOrderInvoiceAction(order.id))}>{copy.issueInvoice}</Button>
          ) : null}
          {busy && <Loader2 className="w-4 h-4 animate-spin self-center" aria-hidden="true" />}
        </div>
      </div>
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{message.text}</p>}

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 space-y-1 text-sm">
          <h2 className="font-bold text-ink mb-2">{copy.customer}</h2>
          <p className="font-semibold text-ink">{order.name}</p>
          {order.email && <p className="text-ink-muted" dir="ltr">{order.email}</p>}
          {order.phone && <p className="text-ink-muted" dir="ltr">{order.phone}</p>}
          {order.note && <p className="text-ink-muted pt-2 whitespace-pre-line">{order.note}</p>}
        </Card>
        <Card className="p-5 space-y-1 text-sm">
          <h2 className="font-bold text-ink mb-2">{order.fulfilment === "pickup" ? copy.pickup : copy.deliverTo}</h2>
          {order.address && (
            <>
              <p className="font-semibold text-ink">{order.address.name} · <span dir="ltr">{order.address.phone}</span></p>
              <p className="text-ink-muted">{[order.address.line1, order.address.line2, order.address.area, order.address.city, order.address.country, order.address.postalCode].filter(Boolean).join(", ")}</p>
            </>
          )}
        </Card>
      </div>

      <Card className="p-5 space-y-4">
        <h2 className="font-bold text-ink">{copy.items}</h2>
        <ul className="divide-y divide-ink/10 text-sm" data-testid="order-lines">
          {order.lines.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
              <span className="flex-1 min-w-0 text-ink">{l.description} <span className="font-mono text-xs text-ink-muted" dir="ltr">{l.sku}</span></span>
              <span className="tabular-nums text-ink-muted">{l.quantity} × {money(l.unit_price)}</span>
              <span className="font-semibold"><CurrencyDisplay amount={l.line_total} currency={order.currency} /></span>
            </li>
          ))}
        </ul>
        <dl className="ms-auto w-full sm:w-72 space-y-1 text-sm" data-testid="order-totals">
          <div className="flex justify-between"><dt className="text-ink-muted">{copy.subtotal}</dt><dd>{money(order.subtotal)}</dd></div>
          {order.discount > 0 && <div className="flex justify-between"><dt className="text-ink-muted">{formatMessage(copy.discount, { code: order.coupon_code ?? "" })}</dt><dd>- {money(order.discount)}</dd></div>}
          {order.delivery_fee > 0 && <div className="flex justify-between"><dt className="text-ink-muted">{copy.delivery}</dt><dd>{money(order.delivery_fee)}</dd></div>}
          {order.vat_amount > 0 && <div className="flex justify-between"><dt className="text-ink-muted">{copy.vat}</dt><dd>{money(order.vat_amount)}</dd></div>}
          <div className="flex justify-between font-bold border-t border-ink/10 pt-1"><dt>{copy.total}</dt><dd>{money(order.total)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-muted">{copy.paid}</dt><dd data-testid="order-paid">{money(order.amount_paid)}</dd></div>
          {order.amount_refunded > 0 && <div className="flex justify-between"><dt className="text-ink-muted">{copy.refunded}</dt><dd>{money(order.amount_refunded)}</dd></div>}
        </dl>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {rights.edit && order.amount_paid < order.total && !["cancelled", "returned"].includes(order.status) && (
          <Card className="p-5 space-y-3" data-testid="order-payment">
            <h2 className="font-bold text-ink">{copy.recordPayment}</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label={copy.amount}>{(id) => <Input id={id} name="paymentAmount" type="number" min={0} step="0.001" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} className="rounded-lg" />}</Field>
              <Field label={copy.method}>
                {(id) => (
                  <Select id={id} value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })} className="rounded-lg">
                    {(["cash", "card", "bank_transfer"] as const).map((m) => <option key={m} value={m}>{t.orders.paymentMethods[m]}</option>)}
                  </Select>
                )}
              </Field>
              <Field label={copy.reference} wide>{(id) => <Input id={id} maxLength={100} value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} className="rounded-lg" />}</Field>
            </div>
            <Button type="button" variant="primary" size="sm" className="rounded-full" disabled={busy || !payment.amount} onClick={() => run(() => recordOrderPaymentAction(order.id, payment))} data-testid="order-pay">{copy.recordPayment}</Button>
          </Card>
        )}
        {rights.refund && order.amount_paid > order.amount_refunded && (
          <Card className="p-5 space-y-3">
            <h2 className="font-bold text-ink">{copy.refund}</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label={copy.amount}>{(id) => <Input id={id} name="refundAmount" type="number" min={0} step="0.001" value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} className="rounded-lg" />}</Field>
              <Field label={copy.refundReason}>{(id) => <Input id={id} maxLength={500} value={refund.reason} onChange={(e) => setRefund({ ...refund, reason: e.target.value })} className="rounded-lg" />}</Field>
            </div>
            {paidOnline && <p className="text-xs text-ink-muted">{formatMessage(copy.refundOnline, { gateway: gatewayName(paidOnline.gateway) })}</p>}
            <Button type="button" variant="outline" size="sm" className="rounded-full" disabled={busy || !refund.amount} onClick={() => run(async () => { await recordOrderRefundAction(order.id, refund.amount, refund.reason); setRefund({ amount: "", reason: "" }); })} data-testid="order-refund">{copy.refund}</Button>
          </Card>
        )}
        {paymentLink && (
          <Card className="p-5 space-y-3" data-testid="order-payment-link">
            <h2 className="font-bold text-ink flex items-center gap-2"><Link2 className="w-4 h-4 text-accent" aria-hidden="true" />{copy.paymentLink}</h2>
            <p className="text-xs text-ink-muted">{copy.paymentLinkHint}</p>
            <div className="flex gap-2">
              <Input readOnly aria-label={copy.paymentLink} value={paymentLink} dir="ltr" className="rounded-lg font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
              <Button type="button" size="sm" variant="outline" className="rounded-full shrink-0 gap-1.5" onClick={() => void navigator.clipboard?.writeText(paymentLink).then(() => setMessage({ tone: "ok", text: copy.linkCopied }))}>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                {copy.copyLink}
              </Button>
            </div>
          </Card>
        )}
      </div>

      {attempts.length > 0 && (
        <Card className="p-5 space-y-3">
          <h2 className="font-bold text-ink flex items-center gap-2"><CreditCard className="w-4 h-4 text-accent" aria-hidden="true" />{copy.onlinePayments}</h2>
          <ul className="divide-y divide-ink/10 text-sm" data-testid="order-attempts">
            {attempts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                <span className="font-semibold text-ink">{gatewayName(a.gateway)}</span>
                {a.test_mode && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">{copy.testMode}</span>}
                <span className="text-ink-muted">{(copy.attemptStatuses as Record<string, string>)[a.status] ?? a.status}</span>
                <span>{money(a.amount)}</span>
                {a.amount_refunded > 0 && <span className="text-xs text-ink-muted">{copy.refunded} {money(a.amount_refunded)}</span>}
                <span className="font-mono text-xs text-ink-muted" dir="ltr">{a.reference}</span>
                <span className="ms-auto text-xs text-ink-muted">{formatDate(a.created_at, locale, "time")}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {requests.length > 0 && (
        <Card className="p-5 space-y-3" data-testid="order-requests">
          <h2 className="font-bold text-ink">{t.serviceDesk.orderRequests}</h2>
          <ul className="divide-y divide-ink/10 text-sm">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                <Link href={ROUTES.requests.detail(r.id)} className="font-mono text-xs font-semibold hover:text-accent" dir="ltr">{r.reference}</Link>
                <span className="text-xs text-ink-muted">{formatDate(r.created_at, locale, "time")}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-5 space-y-3">
        <h2 className="font-bold text-ink">{copy.history}</h2>
        <ol className="space-y-2 text-sm" data-testid="order-history">
          {order.events.map((e) => (
            <li key={e.id} className="flex flex-wrap gap-x-3">
              <span className="text-xs text-ink-muted w-36">{formatDate(e.at, locale, "time")}</span>
              <span className="font-medium text-ink">{eventText(e)}</span>
              {e.note && <span className="text-ink-muted">{e.note}</span>}
              {e.by && <span className="text-xs text-ink-muted">{e.by}</span>}
            </li>
          ))}
        </ol>
        {rights.edit && (
          <div className="flex gap-2">
            <Input aria-label={copy.statusNote} placeholder={copy.statusNote} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="rounded-lg" />
            <Button type="button" size="sm" variant="outline" className="rounded-full shrink-0" disabled={busy || !note.trim()} onClick={() => run(async () => { await addOrderNoteAction(order.id, note); setNote(""); })}>{copy.addNote}</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
