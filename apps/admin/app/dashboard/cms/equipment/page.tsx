import { requirePagePermission } from "../../../../lib/auth";
import { getAllEquipment } from "@platform/database";
import { EquipmentManagementView } from "../../../../components/cms/EquipmentManagementView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("cms/equipment");

export const dynamic = "force-dynamic";

export default async function EquipmentManagerPage() {
  await requirePagePermission("equipment", "read");
  const items = await getAllEquipment();

  return <EquipmentManagementView initialEquipment={items} />;
}
