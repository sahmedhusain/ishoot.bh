import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getWebsiteSnapshot } from "@ishoot/database";
export async function isWebsitePreview() {
  const value = (await cookies()).get("ishoot_preview")?.value;
  const secret = process.env.REVALIDATION_SECRET;
  if (!value || !secret) return false;
  const [expires, token] = value.split(".");
  if (
    !/^[a-f0-9]{64}$/.test(token || "") ||
    Number(expires) < Date.now() ||
    !Number.isFinite(Number(expires))
  )
    return false;
  const expected = createHmac("sha256", secret)
    .update(`website-preview:${expires}`)
    .digest("hex");
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}
export async function getWebsite() {
  return getWebsiteSnapshot(await isWebsitePreview());
}
