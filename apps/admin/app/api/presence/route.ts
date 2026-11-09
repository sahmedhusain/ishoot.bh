import { getPresence } from "@platform/api-client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth";

export const dynamic = "force-dynamic";

const ID = /^[A-Za-z0-9_:-]{1,128}$/;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ items: [] }, { status: 401 });
  const ids = Array.from(new Set((req.nextUrl.searchParams.get("ids") ?? "").split(",").filter((id) => ID.test(id)))).slice(0, 200);
  try {
    return NextResponse.json({ items: await getPresence("staff", ids) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ items: [] }, { status: 503 });
  }
}
