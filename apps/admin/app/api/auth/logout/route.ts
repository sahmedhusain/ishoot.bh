import { measureOperation } from "@ishoot/database";
import { NextRequest, NextResponse } from "next/server";
import { deleteSession, createActivityLog } from "@ishoot/database";
import { verifySessionToken } from "../../../../lib/jwt";
import { SESSION_COOKIE_NAME } from "../../../../lib/auth";

export async function POST(req: NextRequest) {
  return measureOperation("admin:auth/logout:POST", async () => {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      const payload = await verifySessionToken(token);
      if (payload) {
        const ipAddress =
          req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
          req.headers.get("x-real-ip") ||
          undefined;
        const userAgent = req.headers.get("user-agent") || undefined;

        await createActivityLog({
          user_id: payload.userId,
          action: "logout",
          entity_type: "auth",
          entity_id: payload.userId,
          ip_address: ipAddress,
          user_agent: userAgent,
        });
      }

      await deleteSession(token);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete(SESSION_COOKIE_NAME);

    return response;
  } catch (err: any) {
    console.error("Logout error:", err);
    const response = NextResponse.json({ success: true });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  });
}
