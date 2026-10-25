import { notFound } from "next/navigation";
import { getStoreSettings } from "@platform/database";
import { getSite, requireSiteLanguage } from "../../../lib/site";
import { collectionHref } from "../../../lib/site-copy";
import { storeEnabled } from "../../../lib/customer";
import { CartView } from "../../../components/store/CartView";

export const dynamic = "force-dynamic";

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireSiteLanguage(locale);
  if (!(await storeEnabled())) notFound();
  const [settings, { info }] = await Promise.all([getStoreSettings(), getSite()]);
  return <CartView locale={locale} currency={info.currency} shopHref={collectionHref(info, locale)} fulfilments={{ delivery: settings.delivery_enabled, pickup: settings.pickup_enabled }} />;
}
