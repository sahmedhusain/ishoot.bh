import { cache } from "react";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getContentSnapshot } from "@platform/api-client";
import { exampleSnapshot, getWebsiteSnapshot } from "@platform/database";
import {
  isBusinessActivity,
  type BusinessActivity,
} from "@platform/database/website-presets";
/** The signed preview cookie: the draft website, or an activity's demo website when it names one. */
const previewCookie = cache(
  async (): Promise<{ example: BusinessActivity | null } | null> => {
    const value = (await cookies()).get("platform_preview")?.value;
    const secret = process.env.REVALIDATION_SECRET;
    if (!value || !secret) return null;
    const [expires, token, example] = value.split(".");
    if (
      !/^[a-f0-9]{64}$/.test(token || "") ||
      Number(expires) < Date.now() ||
      !Number.isFinite(Number(expires)) ||
      (example !== undefined && !isBusinessActivity(example))
    )
      return null;
    const expected = createHmac("sha256", secret)
      .update(
        example
          ? `website-example:${example}:${expires}`
          : `website-preview:${expires}`,
      )
      .digest("hex");
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token))
      ? { example: example ?? null }
      : null;
  },
);
export const isWebsitePreview = cache(async () => !!(await previewCookie()));
/** The activity whose demo website is showing, if any. */
export const websiteExample = cache(
  async () => (await previewCookie())?.example ?? null,
);
const getPublishedWebsite = unstable_cache(
  async () => {
    try {
      const snap = await getContentSnapshot("main");
      if (snap?.published && typeof snap.published === "object" && Object.keys(snap.published).length > 0) {
        return snap.published as any;
      }
    } catch {
      // Fallback to database
    }
    return getWebsiteSnapshot(false);
  },
  ["published-website"],
  { revalidate: 60, tags: ["website"] },
);

export const getWebsite = cache(async () => {
  const preview = await previewCookie();
  if (preview?.example) return exampleSnapshot(preview.example);
  return preview ? getWebsiteSnapshot(true) : getPublishedWebsite();
});
