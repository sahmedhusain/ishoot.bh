import { pickupAvailable } from "@platform/database/constants/website-commerce";
import { notFound } from "next/navigation";
import { getStoreSettings } from "@platform/database";
import { getSite, requireSiteLanguage } from "../../../lib/site";
import { collectionHref } from "../../../lib/site-copy";
import { orderingEnabled } from "../../../lib/customer";
import { CartView } from "../../../components/store/CartView";

export const dynamic = "force-dynamic";

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireSiteLanguage(locale);
  if (!(await orderingEnabled())) notFound();
  const [settings, { info, config }] = await Promise.all([getStoreSettings(), getSite()]);
  if (!config.commerce.capabilities.ordering) notFound();
  return <CartView locale={locale} currency={info.currency} shopHref={collectionHref(info, locale)} fulfilments={{ delivery: settings.delivery_enabled && config.commerce.capabilities.delivery, pickup: settings.pickup_enabled && pickupAvailable(config.commerce) }} />;
}
