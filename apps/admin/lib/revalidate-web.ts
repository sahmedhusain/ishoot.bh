import { serverTemplates, formatMessage } from "@platform/locales";
export async function revalidatePublicSite(
  tags: string[] = [],
  paths: string[] = ["/"],
): Promise<boolean> {
  const webUrl = process.env.WEB_URL;
  const secret = process.env.REVALIDATION_SECRET;

  if (!webUrl || !secret) {
    console.warn(
      "Public cache invalidation is unconfigured; cached content refreshes after its 60-second TTL.",
    );
    return false;
  }

  try {
    const response = await fetch(`${webUrl}/api/revalidate`, {
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
    console.warn("Failed to revalidate public site cache:", err);
    return false;
  }
}
