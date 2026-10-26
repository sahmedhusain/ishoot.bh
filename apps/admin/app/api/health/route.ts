import { NextResponse } from "next/server";
import { installationFingerprint, measureOperation } from "@platform/database";

export const dynamic = "force-dynamic";

/** Whether this app is up and which installation it belongs to (Settings → Website → Check domain). */
export async function GET() {
  return measureOperation("admin:health:GET", async () => {
    const installation = await installationFingerprint().catch(() => null);
    return NextResponse.json(
      { ok: installation !== null, app: "admin", installation },
      {
        status: installation ? 200 : 503,
        headers: {
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  });
}
