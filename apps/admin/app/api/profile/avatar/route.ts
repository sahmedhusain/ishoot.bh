import { serverMessages } from "@platform/locales";
import { importUpload, isApiError } from "@platform/api-client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

/**
 * Fetches a profile photo from a link (the files service reaches public addresses only, docs/adr/0012) into an upload
 * of the signed-in person's, which the browser then crops. It expires unless saved.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: serverMessages.unauthorized }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { url?: unknown } | null;
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url || url.length > 2048) return NextResponse.json({ error: serverMessages.avatarLinkInvalid }, { status: 400 });
  try {
    const upload = await importUpload({ ownerId: user.id, folder: "avatars", url });
    return NextResponse.json({ fileUrl: upload.fileUrl });
  } catch (error) {
    if (isApiError(error, "source_not_allowed")) return NextResponse.json({ error: serverMessages.avatarLinkInvalid }, { status: 422 });
    if (isApiError(error, "source_unreachable")) return NextResponse.json({ error: serverMessages.avatarLinkUnreachable }, { status: 422 });
    if (isApiError(error, "unsupported_file_type")) return NextResponse.json({ error: serverMessages.avatarNotImage }, { status: 415 });
    if (isApiError(error, "payload_too_large")) return NextResponse.json({ error: serverMessages.avatarTooLarge }, { status: 413 });
    console.error("Importing a profile photo failed:", error);
    return NextResponse.json({ error: serverMessages.avatarLinkUnreachable }, { status: 503 });
  }
}
