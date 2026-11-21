import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import {
  getWorkspacePrefs,
  saveWorkspacePrefs,
} from "../../../../lib/queries/dashboard";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const prefs = await getWorkspacePrefs(user.id);
  return NextResponse.json(prefs, { headers: noStore });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    widgets?: unknown;
    scratchpad?: Record<string, unknown>;
    sidebarPrefs?: Record<string, unknown>;
  };
  const patch: {
    widgets?: unknown;
    scratchpad?: Record<string, unknown>;
    sidebarPrefs?: Record<string, unknown>;
  } = {};
  if (body.widgets !== undefined) patch.widgets = body.widgets;
  if (body.scratchpad !== undefined) patch.scratchpad = body.scratchpad;
  if (body.sidebarPrefs !== undefined) patch.sidebarPrefs = body.sidebarPrefs;
  const updated = await saveWorkspacePrefs(user.id, patch);
  return NextResponse.json(updated, { headers: noStore });
}
