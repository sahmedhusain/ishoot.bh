import { NextRequest, NextResponse } from "next/server";
import { consumeAbuseLimit, db } from "@platform/database";
import { inquiryFromUploadToken } from "@platform/database/services/inquiry-upload-token";
import { sameOrigin, signInSecret, jsonError } from "../../../../lib/customer";
import { getSite } from "../../../../lib/site";
import { isWebsitePreview } from "../../../../lib/website";
import {
  storePrivateUpload,
  discardPrivateUpload,
} from "../../../../lib/private-upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "generic" }, { status: 403 });
  const { config, enabled } = await getSite();
  if (
    !enabled ||
    (await isWebsitePreview()) ||
    !config.commerce.capabilities.inquiries ||
    config.commerce.inquiryAttachments === false
  )
    return NextResponse.json({ error: "unavailable" }, { status: 404 });
  let id: string | null = null;
  try {
    id = inquiryFromUploadToken(
      req.headers.get("x-inquiry-upload-token") ?? "",
      signInSecret(),
    );
  } catch {}
  if (
    !id ||
    !(await db.inquiry.findFirst({
      where: { id, source: "website" },
      select: { id: true },
    }))
  )
    return NextResponse.json({ error: "unavailable" }, { status: 404 });
  try {
    await consumeAbuseLimit("inquiry-upload", id, 6, 3600);
  } catch (error) {
    return jsonError(error);
  }
  const file = await storePrivateUpload(req, "inquiry");
  if (file instanceof Response) return file;
  const { fileUrl } = file;
  try {
    await db.$transaction(async (tx) => {
      const existing = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "Inquiry" WHERE id = ${id} FOR UPDATE`;
      if (
        !existing.length ||
        (await tx.attachment.count({
          where: { entityType: "inquiry", entityId: id! },
        })) >= 3
      )
        throw new Error("attachment_limit");
      await tx.attachment.create({
        data: {
          entityType: "inquiry",
          entityId: id!,
          fileUrl,
          fileName: file.fileName,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
        },
      });
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    await discardPrivateUpload(fileUrl);
    return NextResponse.json({ error: "attachment_limit" }, { status: 400 });
  }
}
