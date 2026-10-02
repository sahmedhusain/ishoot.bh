export async function revalidatePublicSite(
  tags: string[] = [],
  paths: string[] = ["/"],
): Promise<void> {
  const webUrl = process.env.WEB_URL;
  const secret = process.env.REVALIDATION_SECRET;

  if (!webUrl || !secret) {
    return;
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
    if (!response.ok) throw new Error(`Public site revalidation failed (${response.status})`);
  } catch (err) {
    console.warn("Failed to revalidate public site cache:", err);
  }
}
