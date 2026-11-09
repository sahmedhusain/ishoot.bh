import { getMyStatus } from "@platform/api-client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(null, { status: 401 });
  try {
    return NextResponse.json(await getMyStatus("staff", user.id), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(null, { status: 503 });
  }
}
