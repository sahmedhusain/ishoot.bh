import { serverMessages } from "@platform/locales";
import {
  createHmac,
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
} from "node:crypto";
import { runAtomicMutation } from "../api/atomic";
import { deleteTableRow, listTableRows, upsertTableRow } from "../api/tables";
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function base32(bytes: Buffer) {
  let value = 0,
    bits = 0,
    result = "";
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += alphabet[(value >>> bits) & 31];
    }
  }
  if (bits) result += alphabet[(value << (5 - bits)) & 31];
  return result;
}
export function totp(secret: Buffer, step: number, digits = 6) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac("sha1", secret).update(counter).digest();
  const offset = mac[mac.length - 1] & 15;
  return String(
    (mac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits,
  ).padStart(digits, "0");
}
function encryptionKey() {
  const key = Buffer.from(process.env.MFA_ENCRYPTION_KEY || "", "base64");
  if (key.length !== 32)
    throw new Error(serverMessages.configureASeparate32ByteBase64Mfa);
  return key;
}
function encrypt(secret: Buffer, userId: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(userId));
  const encrypted = Buffer.concat([cipher.update(secret), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((v) => v.toString("base64"))
    .join(".");
}
function decrypt(value: string, userId: string) {
  const [iv, tag, data] = value.split(".").map((v) => Buffer.from(v, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAAD(Buffer.from(userId));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}
function matchingStep(
  secret: Buffer,
  code: string,
  last?: bigint | null,
  now = Date.now(),
) {
  if (!/^\d{6}$/.test(code)) return;
  const step = Math.floor(now / 30000);
  for (const candidate of [step, step - 1, step + 1])
    if (
      candidate >= 0 &&
      (last == null || BigInt(candidate) > last) &&
      timingSafeEqual(Buffer.from(totp(secret, candidate)), Buffer.from(code))
    )
      return candidate;
}
export async function beginMfaEnrollment(userId: string) {
  return runAtomicMutation(async () => {
    const users = await listTableRows<Record<string, any>>("identity", "user");
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error(serverMessages.userNotFound || "User not found");
    if (user.mfaEnabled) throw new Error(serverMessages.mfaIsAlreadyEnabled);
    const secret = randomBytes(20);
    await upsertTableRow("identity", "user", {
      ...user,
      id: userId,
      mfaPendingSecretEncrypted: encrypt(secret, userId),
      mfaPendingExpiresAt: new Date(Date.now() + 600000).toISOString(),
    });
    return { secret: base32(secret), email: user.email };
  });
}
export async function completeMfaEnrollment(userId: string, code: string) {
  return runAtomicMutation(async () => {
    const users = await listTableRows<Record<string, any>>("identity", "user");
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error(serverMessages.userNotFound || "User not found");
    if (
      user.mfaEnabled ||
      !user.mfaPendingSecretEncrypted ||
      !user.mfaPendingExpiresAt ||
      new Date(user.mfaPendingExpiresAt) <= new Date()
    )
      throw new Error(serverMessages.enrollmentExpired);
    const step = matchingStep(
      decrypt(user.mfaPendingSecretEncrypted, userId),
      code,
    );
    if (step === undefined)
      throw new Error(serverMessages.invalidAuthenticationCode);
    const codes = Array.from({ length: 10 }, () =>
      randomBytes(16).toString("hex"),
    );
    const existingCodes = await listTableRows<Record<string, any>>(
      "identity",
      "mfa_recovery_code",
    );
    for (const row of existingCodes.filter((c) => c.userId === userId)) {
      await deleteTableRow("identity", "mfa_recovery_code", row.id);
    }
    for (const c of codes) {
      await upsertTableRow("identity", "mfa_recovery_code", {
        id: crypto.randomUUID(),
        userId,
        codeHash: createHash("sha256").update(c).digest("hex"),
      });
    }
    await upsertTableRow("identity", "user", {
      ...user,
      id: userId,
      mfaEnabled: true,
      mfaSecretEncrypted: user.mfaPendingSecretEncrypted,
      mfaPendingSecretEncrypted: null,
      mfaPendingExpiresAt: null,
      mfaLastStep: step,
    });
    const sessions = await listTableRows<Record<string, any>>(
      "identity",
      "session",
    );
    for (const s of sessions.filter((s) => s.userId === userId)) {
      await deleteTableRow("identity", "session", s.id);
    }
    await upsertTableRow("system", "activity_log", {
      id: crypto.randomUUID(),
      userId,
      action: "enable_mfa",
      entityType: "auth",
      entityId: userId,
    });
    return codes;
  });
}
export async function verifyMfa(userId: string, code: string) {
  return runAtomicMutation(async () => {
    const users = await listTableRows<Record<string, any>>("identity", "user");
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error(serverMessages.userNotFound || "User not found");
    if (!user.mfaEnabled) return true;
    if (/^[a-f0-9]{32}$/.test(code)) {
      const codeHash = createHash("sha256").update(code).digest("hex");
      const recoveryCodes = await listTableRows<Record<string, any>>(
        "identity",
        "mfa_recovery_code",
      );
      const match = recoveryCodes.find(
        (r) => r.userId === userId && r.codeHash === codeHash && !r.usedAt,
      );
      if (!match) return false;
      await upsertTableRow("identity", "mfa_recovery_code", {
        ...match,
        usedAt: new Date().toISOString(),
      });
      await upsertTableRow("system", "activity_log", {
        id: crypto.randomUUID(),
        userId,
        action: "use_recovery_code",
        entityType: "auth",
        entityId: userId,
      });
      return true;
    }
    if (!user.mfaSecretEncrypted) return false;
    const step = matchingStep(
      decrypt(user.mfaSecretEncrypted, userId),
      code,
      user.mfaLastStep != null ? BigInt(user.mfaLastStep) : null,
    );
    if (step === undefined) return false;
    await upsertTableRow("identity", "user", {
      ...user,
      id: userId,
      mfaLastStep: step,
    });
    return true;
  });
}
export async function disableMfa(userId: string, code: string) {
  return runAtomicMutation(async () => {
    if (!(await verifyMfa(userId, code)))
      throw new Error(serverMessages.invalidAuthenticationCode);
    const users = await listTableRows<Record<string, any>>("identity", "user");
    const user = users.find((u) => u.id === userId);
    if (user) {
      await upsertTableRow("identity", "user", {
        ...user,
        id: userId,
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaPendingSecretEncrypted: null,
        mfaPendingExpiresAt: null,
        mfaLastStep: null,
      });
    }
    const existingCodes = await listTableRows<Record<string, any>>(
      "identity",
      "mfa_recovery_code",
    );
    for (const row of existingCodes.filter((c) => c.userId === userId)) {
      await deleteTableRow("identity", "mfa_recovery_code", row.id);
    }
    const sessions = await listTableRows<Record<string, any>>(
      "identity",
      "session",
    );
    for (const s of sessions.filter((s) => s.userId === userId)) {
      await deleteTableRow("identity", "session", s.id);
    }
    await upsertTableRow("system", "activity_log", {
      id: crypto.randomUUID(),
      userId,
      action: "disable_mfa",
      entityType: "auth",
      entityId: userId,
    });
  });
}

export async function cancelMfaEnrollment(userId: string) {
  await runAtomicMutation(async () => {
    const users = await listTableRows<Record<string, any>>("identity", "user");
    const user = users.find((u) => u.id === userId);
    if (user) {
      await upsertTableRow("identity", "user", {
        ...user,
        id: userId,
        mfaPendingSecretEncrypted: null,
        mfaPendingExpiresAt: null,
      });
    }
    await upsertTableRow("system", "activity_log", {
      id: crypto.randomUUID(),
      userId,
      action: "cancel_mfa_enrollment",
      entityType: "auth",
      entityId: userId,
    });
  });
}
