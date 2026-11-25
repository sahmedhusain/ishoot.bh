import { notFound } from "next/navigation";
import { CheckCircle2, CreditCard } from "lucide-react";
import { formatMessage } from "@platform/locales";
import { onlinePaymentAvailable, orderFromPaymentLink, paymentLinkOrder } from "@platform/database";
import { requireSiteLanguage, siteTranslations } from "../../../../lib/site";
import { storeEnabled } from "../../../../lib/customer";
import { formatPrice } from "../../../../lib/site-copy";
import { PayButton } from "../../../../components/store/PayButton";

export const dynamic = "force-dynamic";

export default async function PayPage({ params, searchParams }: { params: Promise<{ locale: string; token: string }>; searchParams: Promise<{ start?: string; failed?: string; pending?: string }> }) {
  const { locale, token } = await params;
  await requireSiteLanguage(locale);
  if (!(await storeEnabled())) notFound();
  const [query, t] = await Promise.all([searchParams, siteTranslations(locale)]);
  const orderId = orderFromPaymentLink(token);
  const order = orderId ? await paymentLinkOrder(orderId) : null;
  const shell = (children: React.ReactNode) => (
    <div className="bg-m3-surface text-m3-on-surface pb-20">
      <div className="shell page-heading space-y-6">{children}</div>
    </div>
  );
  if (!order) return shell(<p className="text-m3-on-surface-variant" role="alert">{t.store.linkInvalid}</p>);
  const values = { number: order.number };
  if (order.owed <= 0 && !order.payment_review)
    return shell(
      <div className="rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low p-8 space-y-4 text-center max-w-lg mx-auto">
        <CheckCircle2 className="mx-auto w-14 h-14 text-m3-primary" aria-hidden="true" />
        <p className="text-lg font-semibold text-m3-on-surface" data-testid="pay-state">{formatMessage(t.store.alreadyPaid, values)}</p>
      </div>,
    );
  if (order.closed && !order.payment_review) return shell(<p className="text-m3-on-surface-variant" role="alert" data-testid="pay-state">{formatMessage(t.store.orderClosed, values)}</p>);
  const online = await onlinePaymentAvailable();
  return shell(
    <>
      {order.payment_review && (
        <div role="status" className="rounded-2xl border border-m3-outline-variant bg-m3-tertiary-container text-m3-on-tertiary-container p-4 space-y-1" data-testid="pay-review">
          <p className="font-semibold">{t.store.payReviewTitle}</p>
          <p className="text-sm opacity-90">{formatMessage(t.store.payReviewText, values)}</p>
        </div>
      )}
      {!order.payment_review && query.failed === "1" && (
        <div role="alert" className="rounded-2xl border border-m3-error/40 bg-m3-error-container text-m3-on-error-container p-4 space-y-1" data-testid="pay-state">
          <p className="font-semibold">{t.store.payFailedTitle}</p>
          <p className="text-sm opacity-90">{formatMessage(t.store.payFailedText, values)}</p>
        </div>
      )}
      {!order.payment_review && query.pending === "1" && (
        <div role="status" className="rounded-2xl border border-m3-outline-variant bg-m3-secondary-container text-m3-on-secondary-container p-4 space-y-1" data-testid="pay-state">
          <p className="font-semibold">{t.store.payPendingTitle}</p>
          <p className="text-sm opacity-90">{formatMessage(t.store.payPendingText, values)}</p>
        </div>
      )}
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-m3-on-surface font-display flex items-center gap-3">
        <CreditCard className="w-8 h-8 text-m3-primary" aria-hidden="true" />
        {formatMessage(t.store.payTitle, values)}
      </h1>
      <ul className="space-y-2.5 text-sm rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-5">
        {order.lines.map((l, index) => (
          <li key={index} className="flex justify-between gap-3 text-m3-on-surface-variant">
            <span>{l.description} × {l.quantity}</span>
            <span className="font-medium text-m3-on-surface">{formatPrice(l.line_total, order.currency, locale)}</span>
          </li>
        ))}
        <li className="flex justify-between gap-3 border-t border-m3-outline-variant pt-3 font-bold text-m3-on-surface" data-testid="pay-owed">
          {formatMessage(t.store.payOwed, { amount: formatPrice(order.owed, order.currency, locale) })}
        </li>
      </ul>
      {!order.payment_review && (online ? <PayButton token={token} locale={locale} autoStart={query.start === "1"} /> : <p className="text-m3-on-surface-variant" role="alert">{t.account.errors.paymentGatewayUnavailable}</p>)}
    </>,
  );
}
