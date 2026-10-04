"use server";
import { ROUTES } from "../../constants/routes";
import type { Prisma } from "@ishoot/database";
import { validateActionArguments } from "../../lib/action-input";

import { measureOperation,db } from "@ishoot/database";
import { requirePermission } from "../../lib/auth";
import { revalidatePath } from "next/cache";
import { encryptIntegrationCredentials } from "../../lib/integration-credentials";

export async function saveIntegration(provider: string, isActive: boolean, credentials: Record<string, string>, config: Record<string, unknown> = {}) {
  validateActionArguments("saveIntegration", { provider, isActive, credentials, config });
  return measureOperation(`admin:saveIntegration:${provider}`, async () => {
    const user = await requirePermission("settings", "write");

    const encryptedCredentials = encryptIntegrationCredentials(credentials);

    // Saving credentials does not prove provider connectivity.

    await db.integrationSetting.upsert({
      where: { provider },
      update: {
        isActive,
        credentials: encryptedCredentials,
        config: JSON.parse(JSON.stringify(config)) as Prisma.InputJsonObject,
        updatedById: user.id,
        healthStatus: "unknown",
        lastCheckedAt: new Date(),
      },
      create: {
        provider,
        isActive,
        credentials: encryptedCredentials,
        config: JSON.parse(JSON.stringify(config)) as Prisma.InputJsonObject,
        updatedById: user.id,
        healthStatus: "unknown",
        lastCheckedAt: new Date(),
      }
    });

    revalidatePath(ROUTES.settings.root);
    return { success: true };
  });
}

export async function unlinkIntegration(provider: string) {
  validateActionArguments("unlinkIntegration", { provider });
  return measureOperation(`admin:unlinkIntegration:${provider}`, async () => {
    const user = await requirePermission("settings", "write");

    await db.integrationSetting.update({
      where: { provider },
      data: {
        isActive: false,
        credentials: null,
        healthStatus: "unknown",
        lastCheckedAt: new Date(),
        updatedById: user.id
      }
    });

    revalidatePath(ROUTES.settings.root);
    return { success: true };
  });
}
