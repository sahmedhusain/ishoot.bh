import { listDeliveryZones, listShipments, requireFeatureEnabled, shipmentCounts } from "@platform/database";
import { requirePagePermission } from "../../../lib/auth";
import { deliveryScope } from "../../../lib/delivery-scope";
import { getCachedCompanySettings } from "../../../lib/cached-queries";
import { ShipmentsListView } from "../../../components/delivery/ShipmentsListView";
import { pageMetadata } from "../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("delivery");

export const dynamic = "force-dynamic";

export default async function ShipmentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission("deliveries", "read");
  await requireFeatureEnabled("delivery");
  const scope = await deliveryScope();
  const query = await searchParams;
  const text = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : "");
  const filters = { q: text("q"), status: text("status"), date: text("date"), zone: text("zone"), late: text("late") === "1" };
  const [result, counts, zones, company] = await Promise.all([
    listShipments({ q: filters.q, status: filters.status, date: filters.date, zoneId: filters.zone, late: filters.late, driverId: scope.driverId ?? undefined, page: Number(text("page")) || 1 }),
    shipmentCounts(),
    listDeliveryZones(),
    getCachedCompanySettings(),
  ]);
  return <ShipmentsListView {...result} counts={counts} zones={zones.map((z) => ({ id: z.id, name_en: z.name_en, name_ar: z.name_ar }))} filters={filters} currency={company.default_currency} />;
}
