import { serverMessages } from "@platform/locales";
import { measureOperation } from "@platform/database";
import { NextRequest, NextResponse } from "next/server";
import { getEffectivePermissions } from "@platform/database";
import { getCurrentUser } from "../../../../lib/auth";

export async function GET(req: NextRequest) {
  return measureOperation("admin:auth/me:GET", async () => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: serverMessages.unauthorized }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        department: user.department,
        avatarUrl: user.avatar_url,
        permissions: await getEffectivePermissions(
          user.role,
          user.permissions as Record<string, boolean> | undefined,
        ),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Unauthorized" },
      { status: 401 },
    );
  }

  });
}
