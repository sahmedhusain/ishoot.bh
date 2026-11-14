import { measureOperation, createActivityLog } from "@platform/database";
import { NextRequest, NextResponse } from "next/server";
import { signOut } from "@platform/api-client";
import { trustedClientIp } from "@platform/database/services/abuse-limits";
import {
  ACCESS_COOKIE,
  REALM,
  REFRESH_COOKIE,
  clearedCookies,
  verifyAccessToken,
} from "../../../../lib/identity-session";
import { emitItTelemetry } from "../../../../lib/telemetry";

export async function POST(req: NextRequest) {
  return measureOperation("admin:auth/logout:POST", async () => {
    try {
      const staff = await verifyAccessToken(req.cookies.get(ACCESS_COOKIE)?.value);
      const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
      if (refresh) await signOut(REALM, refresh);
      if (staff) {
        const ipAddress = trustedClientIp(req.headers);
        const userAgent = req.headers.get("user-agent") || undefined;
        await createActivityLog({
          user_id: staff.userId,
          action: "logout",
          entity_type: "auth",
          entity_id: staff.userId,
          ip_address: ipAddress,
          user_agent: userAgent,
        });
        void emitItTelemetry({
          level: "INFO",
          service: "auth/admin",
          user: staff.userId,
          action: "AUTH_LOGOUT",
          message: `Admin logout for ${staff.userId}`,
          ipAddress,
          userAgent,
        });
      }
    } catch (err) {
      console.error("Logout error:", err);
    }
    const response = NextResponse.json({ success: true });
    for (const c of clearedCookies()) response.cookies.set(c.name, c.value, c.options);
    return response;
  });
}
