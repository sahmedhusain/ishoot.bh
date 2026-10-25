import type { Prisma } from "@prisma/client";
import { db } from "../db";

/** When a request should be resolved, from the service settings' hours for its priority. */
export async function slaDueFor(priority: string | null | undefined, from = new Date(), client: Prisma.TransactionClient | typeof db = db) {
  const settings = await client.serviceSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
  const hours = priority === "urgent" ? settings.slaUrgentHours : priority === "high" ? settings.slaHighHours : settings.slaNormalHours;
  return new Date(from.getTime() + hours * 3_600_000);
}
