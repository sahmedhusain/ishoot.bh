import { notFound } from "next/navigation";
import { CheckCircle2, CreditCard } from "lucide-react";
import { formatMessage } from "@platform/locales";
import { onlinePaymentAvailable, orderFromPaymentLink, paymentLinkOrder } from "@platform/database";
import { requireSiteLanguage, siteTranslations } from "../../../../lib/site";
import { storeEnabled } from "../../../../lib/customer";
import { formatPrice } from "../../../../lib/site-copy";
import { PayButton } from "../../../../components/store/PayButton";

export const dynamic = "force-dynamic";

/** Paying an order online: right after checkout, again after a failed try, or from a link the store sent. */
export default async function PayPage({ params, searchParams }: { params: Promise<{ locale: string; token: string }>; searchParams: Promise<{ start?: string; failed?: string; pending?: string }> }) {
  const { locale, token } = await params;
  await requireSiteLanguage(locale);
  if (!(await storeEnabled())) notFound();
  const [query, t] = await Promise.all([searchParams, siteTranslations(locale)]);
  const orderId = orderFromPaymentLink(token);
  const order = orderId ? await paymentLinkOrder(orderId) : null;
  const shell = (children: React.ReactNode) => (
    <div className="relative min-h-screen bg-brand-base text-ink">
      <div className="shell page-heading max-w-xl space-y-6">{children}</div>
    </div>
  );
  if (!order) return shell(<p className="text-ink-muted" role="alert">{t.store.linkInvalid}</p>);
  const values = { number: order.number };
  if (order.owed <= 0)
    return shell(
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto w-14 h-14 text-emerald-400" aria-hidden="true" />
        <p className="text-lg text-white" data-testid="pay-state">{formatMessage(t.store.alreadyPaid, values)}</p>
      </div>,
    );
  if (order.closed) return shell(<p className="text-ink-muted" role="alert" data-testid="pay-state">{formatMessage(t.store.orderClosed, values)}</p>);
  const online = await onlinePaymentAvailable();
  return shell(
    <>
      {query.failed === "1" && (
        <div role="alert" className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 space-y-1" data-testid="pay-state">
          <p className="font-semibold text-white">{t.store.payFailedTitle}</p>
          <p className="text-sm text-ink-muted">{formatMessage(t.store.payFailedText, values)}</p>
        </div>
      )}
      {query.pending === "1" && (
        <div role="status" className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-1" data-testid="pay-state">
          <p className="font-semibold text-white">{t.store.payPendingTitle}</p>
          <p className="text-sm text-ink-muted">{formatMessage(t.store.payPendingText, values)}</p>
        </div>
      )}
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-display flex items-center gap-3">
        <CreditCard className="w-8 h-8 text-[var(--web-accent)]" aria-hidden="true" />
        {formatMessage(t.store.payTitle, values)}
      </h1>
      <ul className="space-y-2 text-sm rounded-2xl border border-white/10 p-5">
        {order.lines.map((l, index) => (
          <li key={index} className="flex justify-between gap-3">
            <span>{l.description} × {l.quantity}</span>
            <span className="text-white">{formatPrice(l.line_total, order.currency, locale)}</span>
          </li>
        ))}
        <li className="flex justify-between gap-3 border-t border-white/10 pt-2 font-bold text-white" data-testid="pay-owed">{formatMessage(t.store.payOwed, { amount: formatPrice(order.owed, order.currency, locale) })}</li>
      </ul>
      {online ? <PayButton token={token} locale={locale} autoStart={query.start === "1"} /> : <p className="text-ink-muted" role="alert">{t.account.errors.paymentGatewayUnavailable}</p>}
    </>,
  );
}
