import { db } from "../atomic";

/** When a request should be resolved, from the service settings' hours for its priority. */
export async function slaDueFor(
  priority: string | null | undefined,
  from = new Date(),
  client: any = db,
) {
  try {
    const settings = await client.serviceSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });
    const hours =
      priority === "urgent"
        ? (settings.slaUrgentHours ?? 4)
        : priority === "high"
          ? (settings.slaHighHours ?? 24)
          : (settings.slaNormalHours ?? 72);
    return new Date(from.getTime() + hours * 3_600_000);
  } catch {
    const hours = priority === "urgent" ? 4 : priority === "high" ? 24 : 72;
    return new Date(from.getTime() + hours * 3_600_000);
  }
}
