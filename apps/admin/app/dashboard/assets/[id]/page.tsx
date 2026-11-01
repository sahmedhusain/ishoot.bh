import { notFound } from "next/navigation";
import { db, getAsset, listAssetCategories } from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { AssetDetailView } from "../../../../components/assets/AssetDetailView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("assets/[id]");

export const dynamic = "force-dynamic";

export default async function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("assets", "read");
  const { id } = await params;
  const [found, categories, employees, canEdit] = await Promise.all([
    getAsset(id),
    listAssetCategories(),
    db.employee.findMany({ where: { status: { not: "terminated" } }, select: { id: true, firstNameEn: true, lastNameEn: true, firstNameAr: true, lastNameAr: true }, orderBy: { firstNameEn: "asc" } }),
    hasPermission("assets", "edit"),
  ]);
  if (!found) notFound();
  return (
    <AssetDetailView
      asset={found.asset}
      handovers={found.handovers}
      categories={categories}
      employees={employees.map((e) => ({ id: e.id, name_en: `${e.firstNameEn} ${e.lastNameEn}`, name_ar: `${e.firstNameAr} ${e.lastNameAr}` }))}
      canEdit={canEdit}
    />
  );
}
