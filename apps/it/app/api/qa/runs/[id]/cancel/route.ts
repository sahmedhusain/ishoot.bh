import { NextRequest, NextResponse } from "next/server";
import { itAllowed } from "@platform/contracts";
import { currentUser } from "../../../../../../lib/session";
import { cancelQaRun } from "../../../../../../lib/qa-runner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!itAllowed(user.roles, "backups", "execute")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const run = cancelQaRun(id, user.email || user.subject);
  if (!run) return NextResponse.json({ error: "QA run not found" }, { status: 404 });

  return NextResponse.json({ ok: true, run }, { headers: { "Cache-Control": "no-store" } });
}
