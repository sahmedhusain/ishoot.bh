import { serverMessages } from "@platform/locales";
import {
  createHmac,
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
} from "node:crypto";
import { db, runAtomicMutation } from "../db";
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
    await db.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
    const user = await db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { mfaEnabled: true, email: true },
    });
    if (user.mfaEnabled) throw new Error(serverMessages.mfaIsAlreadyEnabled);
    const secret = randomBytes(20);
    await db.user.update({
      where: { id: userId },
      data: {
        mfaPendingSecretEncrypted: encrypt(secret, userId),
        mfaPendingExpiresAt: new Date(Date.now() + 600000),
      },
    });
    return { secret: base32(secret), email: user.email };
  });
}
export async function completeMfaEnrollment(userId: string, code: string) {
  return runAtomicMutation(async () => {
    await db.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    if (
      user.mfaEnabled ||
      !user.mfaPendingSecretEncrypted ||
      !user.mfaPendingExpiresAt ||
      user.mfaPendingExpiresAt <= new Date()
    )
      throw new Error(serverMessages.enrollmentExpired);
    const step = matchingStep(
      decrypt(user.mfaPendingSecretEncrypted, userId),
      code,
    );
    if (step === undefined) throw new Error(serverMessages.invalidAuthenticationCode);
    const codes = Array.from({ length: 10 }, () =>
      randomBytes(16).toString("hex"),
    );
    await db.mfaRecoveryCode.deleteMany({ where: { userId } });
    await db.mfaRecoveryCode.createMany({
      data: codes.map((c) => ({
        userId,
        codeHash: createHash("sha256").update(c).digest("hex"),
      })),
    });
    await db.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecretEncrypted: user.mfaPendingSecretEncrypted,
        mfaPendingSecretEncrypted: null,
        mfaPendingExpiresAt: null,
        mfaLastStep: step,
      },
    });
    await db.session.deleteMany({ where: { userId } });
    await db.activityLog.create({
      data: {
        userId,
        action: "enable_mfa",
        entityType: "auth",
        entityId: userId,
      },
    });
    return codes;
  });
}
export async function verifyMfa(userId: string, code: string) {
  return runAtomicMutation(async () => {
    await db.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.mfaEnabled) return true;
    if (/^[a-f0-9]{32}$/.test(code)) {
      const result = await db.mfaRecoveryCode.updateMany({
        where: {
          userId,
          codeHash: createHash("sha256").update(code).digest("hex"),
          usedAt: null,
        },
        data: { usedAt: new Date() },
      });
      if (result.count)
        await db.activityLog.create({
          data: {
            userId,
            action: "use_recovery_code",
            entityType: "auth",
            entityId: userId,
          },
        });
      return result.count === 1;
    }
    if (!user.mfaSecretEncrypted) return false;
    const step = matchingStep(
      decrypt(user.mfaSecretEncrypted, userId),
      code,
      user.mfaLastStep,
    );
    if (step === undefined) return false;
    await db.user.update({
      where: { id: userId },
      data: { mfaLastStep: step },
    });
    return true;
  });
}
export async function disableMfa(userId: string, code: string) {
  return runAtomicMutation(async () => {
    if (!(await verifyMfa(userId, code)))
      throw new Error(serverMessages.invalidAuthenticationCode);
    await db.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaPendingSecretEncrypted: null,
        mfaPendingExpiresAt: null,
        mfaLastStep: null,
      },
    });
    await db.mfaRecoveryCode.deleteMany({ where: { userId } });
    await db.session.deleteMany({ where: { userId } });
    await db.activityLog.create({
      data: {
        userId,
        action: "disable_mfa",
        entityType: "auth",
        entityId: userId,
      },
    });
  });
}

/** Abandon setup without changing the account's active second factor. */
export async function cancelMfaEnrollment(userId: string) {
  await runAtomicMutation(async () => {
    await db.user.update({
      where: { id: userId },
      data: { mfaPendingSecretEncrypted: null, mfaPendingExpiresAt: null },
    });
    await db.activityLog.create({
      data: {
        userId,
        action: "cancel_mfa_enrollment",
        entityType: "auth",
        entityId: userId,
      },
    });
  });
}
