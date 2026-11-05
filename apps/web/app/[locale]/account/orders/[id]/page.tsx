import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { customerOrder, db, formatDocumentPhone, paymentLinkToken } from "@platform/database";
import type { OrderAddress } from "@platform/database/queries/store";
import { accountsEnabled, currentCustomer } from "../../../../../lib/customer";
import {
  getSite,
  requireSiteLanguage,
  siteTranslations,
} from "../../../../../lib/site";
import { formatPrice } from "../../../../../lib/site-copy";
import {
  OrderAttachments,
  PrintOrder,
} from "../../../../../components/account/OrderAttachments";
import { OrderHelp } from "../../../../../components/account/AccountDashboard";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function CustomerOrderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requireSiteLanguage(locale);
  if (!(await accountsEnabled())) notFound();
  const customer = await currentCustomer();
  if (!customer)
    redirect(
      `/${locale}/account?next=${encodeURIComponent(`/${locale}/account/orders/${id}`)}`,
    );
  const order = await customerOrder(customer.id, id);
  if (!order) notFound();
  const [site, t, files] = await Promise.all([
    getSite(),
    siteTranslations(locale),
    db.attachment.findMany({
      where: {
        entityType: "sales_order",
        entityId: id,
        uploadedById: null,
        fileUrl: { startsWith: "/api/files/general/customer_" },
      },
      select: { id: true, fileName: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const ar = locale === "ar";
  const money = (value: { toString(): string }) =>
    formatPrice(Number(value), order.currency, locale);
  const address = order.shippingAddress as unknown as OrderAddress | null;
  return (
    <article
      className="shell page-heading space-y-8 max-w-5xl order-receipt"
      data-testid="customer-order-detail"
    >
      <div className="flex flex-wrap justify-between gap-4 print:hidden">
        <Link
          href={`/${locale}/account`}
          className="text-m3-primary underline min-h-11 py-2"
        >
          {t.store.backToAccount}
        </Link>
        <PrintOrder locale={locale} />
      </div>
      <header className="space-y-3">
        <p className="text-sm text-ink-muted">
          {ar ? site.company.company_name_ar : site.company.company_name_en}
        </p>
        <h1 className="text-3xl sm:text-5xl font-display font-bold">
          <bdi dir="ltr">{order.number}</bdi>
        </h1>
        <p className="text-ink-muted">
          {new Intl.DateTimeFormat(ar ? "ar-u-nu-latn" : "en-GB", {
            dateStyle: "long",
          }).format(order.placedAt)}{" "}
          ·{" "}
          {(order.fulfilment === "pickup"
            ? t.store.pickupStatuses[
                order.status as keyof typeof t.store.pickupStatuses
              ]
            : undefined) ??
            t.store.statuses[order.status as keyof typeof t.store.statuses] ??
            order.status}
        </p>
      </header>
      <div className="grid md:grid-cols-2 gap-6">
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">{t.store.contact}</h2>
          <p>{order.name}</p>
          <p>
            <bdi>{order.email}</bdi>
          </p>
          <p>
            <bdi dir="ltr">{order.phone ? formatDocumentPhone(order.phone) : ""}</bdi>
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">
            {t.store.fulfilments[order.fulfilment as "pickup" | "delivery"]}
          </h2>
          {address && (
            <address className="not-italic text-ink-muted">
              {address.name} {address.phone ? <span dir="ltr">· <bdi dir="ltr">{formatDocumentPhone(address.phone)}</bdi></span> : null}
              <br />
              {[
                address.line1,
                address.line2,
                address.area,
                address.city,
                address.country,
                address.postalCode,
              ]
                .filter(Boolean)
                .join(", ")}
            </address>
          )}
          {order.shipments[0] && (
            <Link
              className="inline-flex min-h-11 items-center text-m3-primary underline"
              href={`/${locale}/track/${order.shipments[0].trackingToken}`}
            >
              {t.store.track}
            </Link>
          )}
        </section>
      </div>
      <section>
        <h2 className="sr-only">{t.store.items}</h2>
        <ul className="divide-y divide-m3-outline-variant">
          {order.lines.map((line) => (
            <li
              key={line.id}
              className="flex flex-wrap justify-between gap-3 py-4"
            >
              <div>
                <p className="font-medium">{line.description}</p>
                <p className="text-sm text-ink-muted">
                  {Number(line.quantity)} × {money(line.unitPrice)}
                </p>
              </div>
              <p className="font-semibold">{money(line.lineTotal)}</p>
            </li>
          ))}
        </ul>
      </section>
      <dl className="ms-auto max-w-md space-y-3 border-t border-m3-outline-variant pt-6">
        {[
          [t.store.subtotal, order.subtotal],
          [t.store.discount, order.discountAmount],
          [t.store.delivery, order.deliveryFee],
          [t.store.vat, order.vatAmount],
          [t.store.total, order.total],
        ].map(([label, amount]) => (
          <div key={String(label)} className="flex justify-between gap-4">
            <dt>{String(label)}</dt>
            <dd className="font-semibold">
              {money(amount as typeof order.total)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-ink-muted">
        {t.store.amountPaid}: {money(order.amountPaid)}
      </p>
      {order.paymentMethod === "online" &&
        Number(order.total) > Number(order.amountPaid) &&
        !["cancelled", "returned"].includes(order.status) && (
          <Link
            className="inline-flex min-h-11 items-center text-m3-primary underline print:hidden"
            href={`/${locale}/pay/${paymentLinkToken(order.id)}`}
          >
            {t.store.payNow}
          </Link>
        )}
      <div className="print:hidden space-y-8">
        <OrderAttachments
          orderId={id}
          files={files}
          enabled={site.config.commerce.orderAttachments !== false}
          locale={locale}
        />
        <OrderHelp orderId={id} locale={locale} />
      </div>
    </article>
  );
}
