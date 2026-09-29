import * as React from "react";
import { requirePermission } from "../../../../lib/auth";
import { db } from "@ishoot/database";
import { RolesManagementView } from "../../../../components/settings/RolesManagementView";

export default async function RolesSettingsPage() {
  await requirePermission("settings", "read");

  const roles = await db.role.findMany({
     
       
       
 
    orderBy: { createdAt: "asc" },
  });

  return <RolesManagementView initialRoles={roles as any} />;
}
