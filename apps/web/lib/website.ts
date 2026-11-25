import { cache } from "react";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getContentSnapshot } from "@platform/api-client";
import { getWebsiteSnapshot, type WebsiteSnapshot } from "@platform/database";
import { hydrateWebsiteSnapshot } from "./queries/website";

const previewCookie = cache(async (): Promise<boolean> => {
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
export const isWebsitePreview = cache(async () => previewCookie());
const getPublishedWebsite = cache(
  unstable_cache(
    async (): Promise<WebsiteSnapshot> => {
      try {
        const snap = await getContentSnapshot("main");
        const pub = snap?.published as Record<string, any> | undefined;
        if (
          pub &&
          typeof pub === "object" &&
          pub.config &&
          Array.isArray(pub.config.sections) &&
          pub.config.sections.length > 0 &&
          Array.isArray(pub.portfolio)
        ) {
          return hydrateWebsiteSnapshot(pub as unknown as WebsiteSnapshot);
        }
      } catch {}
      return await getWebsiteSnapshot(false);
    },
    ["published-website"],
    { revalidate: 60, tags: ["website"] },
  ),
);

export const getWebsite = cache(async () => {
  const preview = await previewCookie();
  return preview ? getWebsiteSnapshot(true) : getPublishedWebsite();
});
