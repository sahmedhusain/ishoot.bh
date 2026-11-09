import { notFound } from "next/navigation";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { getOrder, onlinePaymentAvailable, orderPaymentAttempts, paymentLinkToken, requestsForOrder, requireFeatureEnabled } from "@platform/database";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { OrderView } from "../../../../components/orders/OrderView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("orders/[id]");

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("orders", "read");
  await requireFeatureEnabled("store");
  const { id } = await params;
  const [order, attempts, requests, online, canEdit, canApprove, canInvoice, company] = await Promise.all([getOrder(id), orderPaymentAttempts(id), requestsForOrder(id), onlinePaymentAvailable(), hasPermission("orders", "edit"), hasPermission("orders", "approve"), hasPermission("invoices", "create"), getCachedCompanySettings()]);
  if (!order) notFound();
  const web = (company.website_domain ? `https://${company.website_domain}` : (process.env.WEB_URL || "")).replace(/\/$/, "");
  const owed = order.total - order.amount_paid > 0.0005 && !["cancelled", "returned"].includes(order.status);
  const paymentLink = online && owed && web ? `${web}/${order.locale === "en" ? "en" : "ar"}/pay/${paymentLinkToken(order.id)}` : "";
  return <OrderView order={order} attempts={attempts} requests={requests} paymentLink={paymentLink} rights={{ edit: canEdit, refund: canApprove, invoice: canInvoice }} />;
}
