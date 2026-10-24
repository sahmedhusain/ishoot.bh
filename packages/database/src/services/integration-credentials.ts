import { serverMessages } from "@platform/locales";
import crypto from "node:crypto";
function encryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || Buffer.byteLength(key, "utf8") !== 32) throw new Error(serverMessages.configureASeparate32ByteEncryptionKey);
  return Buffer.from(key, "utf8");
}
export function encryptIntegrationCredentials(credentials: Record<string, string>) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = cipher.update(JSON.stringify(credentials), "utf8", "hex") + cipher.final("hex");
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${encrypted}`;
}
export function decryptIntegrationCredentials(text: string): Record<string, string> | null {
  try {
    const [iv, tag, encrypted] = text.split(":");
    if (!iv || !tag || !encrypted) return null;
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(tag, "hex"));
    const result: unknown = JSON.parse(decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8"));
    if (!result || typeof result !== "object" || Array.isArray(result) || Object.values(result).some(value => typeof value !== "string")) return null;
    return result as Record<string, string>;
  } catch { return null; }
}
