import type { Database } from "@platform/database/decimal";
import { db } from "../atomic";

export async function slaDueFor(
  priority: string | null | undefined,
  from = new Date(),
  client: Database.TransactionClient | typeof db = db,
) {
  const settings = await client.serviceSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  const hours =
    priority === "urgent"
      ? settings.slaUrgentHours
      : priority === "high"
        ? settings.slaHighHours
        : settings.slaNormalHours;
  return new Date(from.getTime() + hours * 3_600_000);
}
