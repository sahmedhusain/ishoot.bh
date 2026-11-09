import { getMyTicket, lookupFile } from "@platform/api-client";
import { fileResponse, measureOperation } from "@platform/database";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "../../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return measureOperation("admin:it-support/[id]/attachment:GET", async () => {
    const user = await getCurrentUser();
    if (!user) return new NextResponse(null, { status: 401 });
    if (!(await hasPermission("it_support", "read")))
      return new NextResponse(null, { status: 403 });
    const { id } = await params;
    const fileUrl = req.nextUrl.searchParams.get("fileUrl") ?? "";
    try {
      const ticket = await getMyTicket(id, user.id);
      const attachment = ticket?.attachments.find((a) => a.fileUrl === fileUrl);
      if (!attachment) return new NextResponse(null, { status: 404 });
      const record = await lookupFile(attachment.fileUrl);
      const response =
        record &&
        (await fileResponse(record, { fileName: attachment.fileName }));
      return response ?? new NextResponse(null, { status: 404 });
    } catch {
      return new NextResponse(null, { status: 502 });
    }
  });
}
