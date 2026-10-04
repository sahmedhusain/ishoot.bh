"use server";

import { measureOperation, db } from "@ishoot/database";
import { getCurrentUser } from "../../lib/auth";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "01234567890123456789012345678901"; // 32 bytes

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decrypt(text: string): string | null {
  try {
    const [ivHex, authTagHex, encryptedHex] = text.split(":");
    if (!ivHex || !authTagHex || !encryptedHex) return null;
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm", 
      Buffer.from(ENCRYPTION_KEY), 
      Buffer.from(ivHex, "hex")
    );
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("Decryption error", err);
    return null;
  }
}

export async function getIntegration(provider: string) {
  return measureOperation(`admin:getIntegration:${provider}`, async () => {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") throw new Error("Unauthorized");
    
    const record = await db.integrationSetting.findUnique({ where: { provider } });
    if (!record) return null;

    let credentials = null;
    if (record.credentials) {
      const dec = decrypt(record.credentials);
      if (dec) credentials = JSON.parse(dec);
    }

    return {
      isActive: record.isActive,
      credentials,
      config: record.config as Record<string, any> | null,
      healthStatus: record.healthStatus,
      lastCheckedAt: record.lastCheckedAt
    };
  });
}

export async function saveIntegration(provider: string, isActive: boolean, credentials: Record<string, string>, config: Record<string, any> = {}) {
  return measureOperation(`admin:saveIntegration:${provider}`, async () => {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") throw new Error("Unauthorized");

    const encryptedCredentials = encrypt(JSON.stringify(credentials));

    // Simple truthy health check simulation
    const isHealthy = Object.keys(credentials).length > 0;

    await db.integrationSetting.upsert({
      where: { provider },
      update: {
        isActive,
        credentials: encryptedCredentials,
        config,
        updatedById: user.id,
        healthStatus: isHealthy ? "healthy" : "error",
        lastCheckedAt: new Date(),
      },
      create: {
        provider,
        isActive,
        credentials: encryptedCredentials,
        config,
        updatedById: user.id,
        healthStatus: isHealthy ? "healthy" : "error",
        lastCheckedAt: new Date(),
      }
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}

export async function unlinkIntegration(provider: string) {
  return measureOperation(`admin:unlinkIntegration:${provider}`, async () => {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") throw new Error("Unauthorized");

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

    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}
