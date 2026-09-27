export async function revalidatePublicSite(
  tags: string[] = [],
  paths: string[] = ["/"],
): Promise<void> {
  const webUrl = process.env.WEB_URL || "http://localhost:3000";
  const secret =
    process.env.REVALIDATION_SECRET || "ishoot-revalidate-secret-2026";

  try {
    await fetch(`${webUrl}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ tags, paths }),
      signal: AbortSignal.timeout(3000),
    });
  } catch (err) {
    console.warn("Cross-app revalidation to web failed (non-blocking):", err);
  }
}
