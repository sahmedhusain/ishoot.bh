import { getMyStatus } from "@platform/api-client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

/**
 * The signed-in person's own status, read in the background on every page and after each change. A route rather than
 * a server action: actions run one at a time and post to the page, so a background read would queue with saves.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(null, { status: 401 });
  try {
    return NextResponse.json(await getMyStatus("staff", user.id), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(null, { status: 503 });
  }
}
