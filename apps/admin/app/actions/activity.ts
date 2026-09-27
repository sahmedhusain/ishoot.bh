"use server";

import { getActivityLogs, createActivityLog } from "@ishoot/database";
import { revalidatePath } from "next/cache";

export async function getActivityLogsAction(limit: number = 50) {
  return await getActivityLogs(limit);
}

export async function createActivityLogAction(data: {
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: any;
  ip_address?: string;
}) {
  const log = await createActivityLog(data);
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/audit");
  return { success: true, log };
}
