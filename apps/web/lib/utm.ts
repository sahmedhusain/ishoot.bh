import type { NextRequest } from "next/server";

export function campaignFrom(req: NextRequest) {
  const raw = req.cookies.get("platform-utm")?.value;
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as Record<
      string,
      unknown
    >;
    const pick = (v: unknown) =>
      typeof v === "string" && /^[A-Za-z0-9._-]{1,60}$/.test(v) ? v : "";
    const campaign = pick(value.campaign).toLowerCase();
    return campaign
      ? { campaign, source: pick(value.source), medium: pick(value.medium) }
      : null;
  } catch {
    return null;
  }
}
