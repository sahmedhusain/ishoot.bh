import path from "node:path";
import type { Prisma } from "../../prisma/generated/client";
export function uploadRoot() {
  const configured = process.env.UPLOAD_ROOT;
  if (process.env.NODE_ENV === "production" && (!configured || !path.isAbsolute(configured)))
    throw new Error("Configure an absolute UPLOAD_ROOT on durable shared storage");
  return configured ? path.resolve(configured) : path.join(process.cwd(), "private", "uploads");
}
export async function claimUpload(tx: Prisma.TransactionClient, fileUrl: string, ownerId?: string) {
  if (!ownerId || typeof fileUrl !== "string" || !/^\/api\/files\/[a-z]+\/[a-zA-Z0-9_-]+\.(pdf|png|jpg|jpeg|webp)$/.test(fileUrl))
    throw new Error("Invalid uploaded file");
  const claimed = await tx.uploadObject.updateMany({ where: { fileUrl, ownerId, claimedAt: null, expiresAt: { gt: new Date() }, isPublic: false }, data: { claimedAt: new Date() } });
  if (claimed.count !== 1) throw new Error("Upload is expired, already claimed, or belongs to another user");
  return tx.uploadObject.findUniqueOrThrow({ where: { fileUrl } });
}
