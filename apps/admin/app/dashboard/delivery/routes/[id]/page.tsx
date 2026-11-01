import { notFound } from "next/navigation";
import { getRouteSheet, requireFeatureEnabled } from "@platform/database";
import { requirePagePermission } from "../../../../../lib/auth";
import { RouteSheetView } from "../../../../../components/delivery/RouteSheetView";
import { pageMetadata } from "../../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("delivery/routes/[id]");

export const dynamic = "force-dynamic";

export default async function RouteSheetPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("deliveries", "assign");
  await requireFeatureEnabled("delivery");
  const { id } = await params;
  const sheet = await getRouteSheet(id);
  if (!sheet) notFound();
  return <RouteSheetView sheet={sheet} />;
}
