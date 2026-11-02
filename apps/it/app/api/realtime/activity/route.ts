import { reportITActivity } from "@platform/api-client";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "../../../../lib/session";

export const dynamic = "force-dynamic";

/** The browser reports that the IT account went idle or came back, for their status (away). */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return new NextResponse(null, { status: 401 });
  const body = (await req.json().catch(() => null)) as { state?: unknown } | null;
  if (body?.state !== "active" && body?.state !== "idle") return new NextResponse(null, { status: 400 });
  try {
    await reportITActivity(user.token, body.state);
  } catch {
    return new NextResponse(null, { status: 503 });
  }
  return new NextResponse(null, { status: 204 });
}
