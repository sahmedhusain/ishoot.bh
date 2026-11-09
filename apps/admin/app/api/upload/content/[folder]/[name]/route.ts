import { serverMessages } from "@platform/locales";
import { isApiError, writeUpload } from "@platform/api-client";
import { FILE_URL_PREFIX } from "@platform/contracts";
import { NextRequest, NextResponse } from "next/server";
import { measureOperation } from "@platform/database";
import { getCurrentUser } from "../../../../../../lib/auth";
import { tooLargeMessage } from "../../../../../../lib/upload-errors";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ folder: string; name: string }> },
) {
  return measureOperation("admin:upload/content:PUT", async () => {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json(
        { error: serverMessages.unauthorized },
        { status: 401 },
      );
    const { folder, name } = await params;
    const size = Number(req.headers.get("content-length"));
    if (!req.body || !Number.isInteger(size) || size <= 0)
      return NextResponse.json(
        { error: serverMessages.runtimeFileSizeDoesNotMatch },
        { status: 400 },
      );
    try {
      await writeUpload(
        `${FILE_URL_PREFIX}${folder}/${name}`,
        user.id,
        req.body,
        size,
      );
      return NextResponse.json({ success: true });
    } catch (error) {
      if (
        isApiError(
          error,
          "file_not_found",
          "upload_not_owned",
          "upload_unavailable",
          "invalid_file_url",
        )
      )
        return NextResponse.json(
          { error: serverMessages.runtimeUploadNotFoundOrExpired },
          { status: 404 },
        );
      if (isApiError(error, "file_content_mismatch", "unsupported_file_type"))
        return NextResponse.json(
          { error: serverMessages.runtimeTheFileContentDoesNotMatchItsType },
          { status: 415 },
        );
      if (isApiError(error, "payload_too_large"))
        return NextResponse.json(
          { error: tooLargeMessage(error.extra.maxFileSize) },
          { status: 413 },
        );
      console.error("Upload content error:", error);
      return NextResponse.json(
        { error: serverMessages.runtimeCouldNotStoreTheFile },
        { status: 500 },
      );
    }
  });
}
