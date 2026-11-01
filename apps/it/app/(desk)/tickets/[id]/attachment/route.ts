import { NextResponse, type NextRequest } from "next/server";
import { getQueueTicket, lookupFile, readFile } from "@platform/api-client";
import { itAllowed } from "@platform/contracts";
import { currentUser } from "../../../../../lib/session";

export const dynamic = "force-dynamic";

/** An attachment of a ticket, for IT staff who may read tickets. The ticket is read with their own token. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) return new NextResponse(null, { status: 401 });
  if (!itAllowed(user.roles, "tickets", "read"))
    return new NextResponse(null, { status: 403 });
  const { id } = await params;
  const fileUrl = req.nextUrl.searchParams.get("fileUrl") ?? "";
  try {
    const detail = await getQueueTicket(user.token, id);
    const attachment = detail?.attachments.find((a) => a.fileUrl === fileUrl);
    const record = attachment && (await lookupFile(attachment.fileUrl));
    const file = record && (await readFile(record.fileUrl));
    if (!attachment || !record || !file?.body)
      return new NextResponse(null, { status: 404 });
    return new Response(file.body, {
      headers: {
        "Content-Type": record.mimeType,
        "Content-Length": String(record.fileSize),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
