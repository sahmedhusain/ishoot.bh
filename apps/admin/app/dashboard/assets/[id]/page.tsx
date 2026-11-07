import { notFound } from "next/navigation";
import { getAsset, listAssetCategories } from "@platform/database";
import { listEmployees } from "@platform/api-client";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { AssetDetailView } from "../../../../components/assets/AssetDetailView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("assets/[id]");

export const dynamic = "force-dynamic";

export default async function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("assets", "read");
  const { id } = await params;
  const [found, categories, rawEmployees, canEdit] = await Promise.all([
    getAsset(id),
    listAssetCategories(),
    listEmployees().catch(() => []),
    hasPermission("assets", "edit"),
  ]);
  if (!found) notFound();
  const employees = rawEmployees.map((e) => ({
    id: e.id,
    name_en: `${e.first_name_en || ""} ${e.last_name_en || ""}`.trim() || e.id,
    name_ar: `${e.first_name_ar || e.first_name_en || ""} ${e.last_name_ar || e.last_name_en || ""}`.trim() || e.id,
  }));
  return (
    <AssetDetailView
      asset={found.asset}
      handovers={found.handovers}
      categories={categories}
      employees={employees}
      canEdit={canEdit}
    />
  );
}
