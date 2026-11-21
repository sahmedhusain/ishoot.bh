"use server";

import { revalidatePath } from "next/cache";
import {
  runDatabaseMaintenanceForIT,
  runDatabaseQueryForIT,
} from "@platform/api-client";
import { pushLogs } from "../../../lib/logger-queue";
import { asUser, requireAllowed } from "../../../lib/session";

export async function runDatabaseQueryAction(sql: string) {
  const user = await requireAllowed("database", "read");
  const result = await asUser(() => runDatabaseQueryForIT(user.token, sql));
  return { ok: true as const, result };
}

export async function runDatabaseMaintenanceAction(
  action: "analyze" | "purge_outbox",
) {
  const user = await requireAllowed("backups", "execute");
  const value = await asUser(() =>
    runDatabaseMaintenanceForIT(user.token, action),
  );
  pushLogs([
    {
      timestamp: new Date().toISOString(),
      level: "INFO",
      service: "frontend/it",
      user: user.email || user.subject,
      action: "DATABASE_MAINTENANCE",
      message: `Executed ${action} (affectedRows=${value.affectedRows})`,
      durationMs: value.durationMs,
    },
  ]);
  revalidatePath("/database");
  return { ok: true as const, value };
}
