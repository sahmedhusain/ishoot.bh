import { reportActivity } from "@platform/api-client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

/** The browser reports that the person went idle or came back, for their status (away). */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse(null, { status: 401 });
  const body = (await req.json().catch(() => null)) as { state?: unknown } | null;
  if (body?.state !== "active" && body?.state !== "idle") return new NextResponse(null, { status: 400 });
  try {
    await reportActivity("staff", user.id, body.state);
  } catch {
    return new NextResponse(null, { status: 503 });
  }
  return new NextResponse(null, { status: 204 });
}
