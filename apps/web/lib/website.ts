import { cache } from "react";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getWebsiteSnapshot } from "@platform/database";
export const isWebsitePreview = cache(async () => {
  const value = (await cookies()).get("platform_preview")?.value;
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
});
const getPublishedWebsite = unstable_cache(
  () => getWebsiteSnapshot(false),
  ["published-website"],
  { revalidate: 60, tags: ["website"] },
);
export const getWebsite = cache(async () => {
  return (await isWebsitePreview())
    ? getWebsiteSnapshot(true)
    : getPublishedWebsite();
});
