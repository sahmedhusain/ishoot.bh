import { requirePermission } from "../../../../lib/auth";
import * as React from "react";
import { getAllEquipment } from "@ishoot/database";
import { EquipmentManagementView } from "../../../../components/cms/EquipmentManagementView";

export const dynamic = "force-dynamic";

export default async function EquipmentManagerPage() {
  await requirePermission("equipment", "read");
  const items = await getAllEquipment();

  return <EquipmentManagementView initialEquipment={items} />;
}
