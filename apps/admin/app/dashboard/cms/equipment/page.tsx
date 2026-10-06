import { requirePagePermission } from "../../../../lib/auth";
import { getAllEquipment } from "@ishoot/database";
import { EquipmentManagementView } from "../../../../components/cms/EquipmentManagementView";

export const dynamic = "force-dynamic";

export default async function EquipmentManagerPage() {
  await requirePagePermission("equipment", "read");
  const items = await getAllEquipment();

  return <EquipmentManagementView initialEquipment={items} />;
}
