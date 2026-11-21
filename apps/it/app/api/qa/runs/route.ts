import { NextRequest, NextResponse } from "next/server";
import { itAllowed } from "@platform/contracts";
import { currentUser } from "../../../../lib/session";
import { QaRunnerError, startQaRun } from "../../../../lib/qa-runner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!itAllowed(user.roles, "backups", "execute")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { suiteKey?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (typeof body.suiteKey !== "string" || !body.suiteKey.trim()) {
    return NextResponse.json({ error: "suiteKey is required" }, { status: 400 });
  }

  try {
    const actor = user.email || user.subject;
    const run = startQaRun(body.suiteKey.trim(), actor);
    return NextResponse.json({ run }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof QaRunnerError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to start QA run" },
      { status: 500 },
    );
  }
}
