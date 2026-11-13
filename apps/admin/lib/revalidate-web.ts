import { serverTemplates, formatMessage } from "@platform/locales";

async function revalidateOrigin(
  origin: string | undefined,
  tags: string[],
  paths: string[],
): Promise<boolean> {
  const secret = process.env.REVALIDATION_SECRET;
  if (!origin || !secret) return false;

  try {
    const response = await fetch(`${origin}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ tags, paths }),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok)
      throw new Error(
        formatMessage(serverTemplates.publicSiteRevalidationFailed0, {
          0: response.status,
        }),
      );
    return true;
  } catch (err) {
    console.warn("Failed to revalidate public cache:", err);
    return false;
  }
}

export async function revalidatePublicStore(
  tags: string[] = ["store", "inventory"],
  paths: string[] = ["/"],
): Promise<boolean> {
  return revalidateOrigin(process.env.STORE_URL, tags, paths);
}

export async function revalidatePublicSite(
  tags: string[] = [],
  paths: string[] = ["/"],
): Promise<boolean> {
  const webUrl = process.env.WEB_URL;
  const storeUrl = process.env.STORE_URL;
  const secret = process.env.REVALIDATION_SECRET;

  if ((!webUrl && !storeUrl) || !secret) {
    console.warn(
      "Public cache invalidation is unconfigured; cached content refreshes after its 60-second TTL.",
    );
    return false;
  }

  const [webOk, storeOk] = await Promise.all([
    revalidateOrigin(webUrl, tags, paths),
    revalidateOrigin(storeUrl, tags, paths),
  ]);
  return webOk || storeOk;
}
