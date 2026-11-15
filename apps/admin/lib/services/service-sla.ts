import { listTableRows, upsertTableRow } from "../api/tables";

export async function slaDueFor(
  priority: string | null | undefined,
  from = new Date(),
  _client?: unknown,
) {
  const rows = await listTableRows<Record<string, any>>("system", "service_settings");
  let settings = rows.find((s) => s.id === "default");
  if (!settings) {
    settings = await upsertTableRow("system", "service_settings", {
      id: "default",
    });
  }
  const hours =
    priority === "urgent"
      ? Number(settings?.slaUrgentHours ?? 4)
      : priority === "high"
        ? Number(settings?.slaHighHours ?? 24)
        : Number(settings?.slaNormalHours ?? 72);
  return new Date(from.getTime() + hours * 3_600_000);
}
