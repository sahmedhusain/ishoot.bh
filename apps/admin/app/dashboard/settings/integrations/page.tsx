import { requirePermission } from "../../../../lib/auth";
import * as React from "react";
import { MetaIntegrationsView } from "../../../../components/settings/MetaIntegrationsView";
import { db } from "@ishoot/database";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "01234567890123456789012345678901";

function decrypt(text: string): Record<string, string> | null {
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
    return JSON.parse(decrypted);
  } catch (err) {
    return null;
  }
}

export default async function IntegrationsSettingsPage() {
  await requirePermission("settings", "write");
  
  const records = await db.integrationSetting.findMany();
  
  const whatsapp = records.find(r => r.provider === "whatsapp");
  const meta = records.find(r => r.provider === "meta");
  
  const waCreds = whatsapp?.credentials ? decrypt(whatsapp.credentials) : null;
  const metaCreds = meta?.credentials ? decrypt(meta.credentials) : null;
  
  return <MetaIntegrationsView 
    initialWhatsApp={{
      isActive: whatsapp?.isActive || false,
      healthStatus: whatsapp?.healthStatus || "unknown",
      phoneId: waCreds?.phoneId || "",
      businessId: waCreds?.businessId || "",
      token: waCreds?.token || "",
      config: whatsapp?.config as any || {}
    }}
    initialMeta={{
      isActive: meta?.isActive || false,
      healthStatus: meta?.healthStatus || "unknown",
      accountId: metaCreds?.accountId || "",
      pageId: metaCreds?.pageId || "",
      config: meta?.config as any || {}
    }}
  />;
}
