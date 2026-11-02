import { serverMessages } from "@platform/locales";

import { measureOperation } from "@platform/database";
import { isFontMimeType } from "@platform/database/constants/theme";
import { isApiError, registerUpload } from "@platform/api-client";
import { FILE_URL_PREFIX } from "@platform/contracts";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { requireAttachmentAccess } from "../../../../lib/attachment-access";
import { tooLargeMessage } from "../../../../lib/upload-errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return measureOperation("admin:upload/init:POST", async () => {
    try {
      const user = await getCurrentUser();
      if (!user)
        return NextResponse.json(
          { error: serverMessages.unauthorized },
          { status: 401 },
        );

      const input: unknown = await req.json();
      if (!input || typeof input !== "object" || Array.isArray(input))
        return NextResponse.json(
          { error: serverMessages.runtimeInvalidUploadInput },
          { status: 400 },
        );
      const {
        fileName,
        fileType,
        fileSize,
        entityType = "general",
        entityId = "",
      } = input as Record<string, unknown>;

      if (
        typeof fileName !== "string" ||
        !fileName.trim() ||
        typeof fileType !== "string" ||
        typeof fileSize !== "number" ||
        !Number.isInteger(fileSize) ||
        fileSize <= 0 ||
        typeof entityType !== "string" ||
        typeof entityId !== "string"
      )
        return NextResponse.json(
          { error: serverMessages.runtimeInvalidUploadInput },
          { status: 400 },
        );
      // Brand fonts (woff2, woff, ttf, otf) are accepted only for the company theme, and are public like the logos.
      // Which types each storage folder accepts is checked by the files service (contracts/catalog/files.json).
      const brandFont = entityType === "company_font";
      if (brandFont !== isFontMimeType(fileType))
        return NextResponse.json(
          { error: serverMessages.runtimeUnsupportedFileType },
          { status: 415 },
        );

      try {
        await requireAttachmentAccess(entityType, entityId, "write");
      } catch {
        return NextResponse.json(
          { error: serverMessages.runtimeUploadAccessDenied },
          { status: 403 },
        );
      }

      let subfolder = "general";
      if (entityType === "payment" || entityType === "bank")
        subfolder = "payments";
      else if (entityType === "company_setting") subfolder = "certificates";
      else if (entityType === "invoice" || entityType === "quotation")
        subfolder = "invoices";
      else if (entityType === "contact" || entityType === "customer_vault")
        subfolder = "vault";
      else if (entityType === "deal") subfolder = "deals";
      else if (entityType === "user_avatar") subfolder = "avatars";

      const publicBrand =
        brandFont ||
        (entityType === "company_asset" &&
          [
            "logo_light",
            "logo_dark",
            "icon_light",
            "icon_dark",
            "icon",
          ].includes(entityId)) ||
        entityType === "cms_asset" ||
        entityType === "cms_document";
      if (
        (publicBrand &&
          entityType !== "cms_document" &&
          fileType === "application/pdf") ||
        (entityType === "cms_document" && fileType !== "application/pdf")
      )
        return NextResponse.json(
          { error: serverMessages.runtimeBrandAssetsMustBeImages },
          { status: 415 },
        );
      if (publicBrand) subfolder = "brand";

      let upload;
      try {
        upload = await registerUpload({
          ownerId: user.id,
          folder: subfolder,
          fileName,
          mimeType: fileType,
          fileSize,
        });
      } catch (error) {
        if (isApiError(error, "unsupported_file_type"))
          return NextResponse.json(
            { error: serverMessages.runtimeUnsupportedFileType },
            { status: 415 },
          );
        if (isApiError(error, "payload_too_large"))
          return NextResponse.json(
            { error: tooLargeMessage(error.extra.maxFileSize) },
            { status: 413 },
          );
        throw error;
      }

      // The browser sends the bytes to our own owner-checked route, which streams them to the files service.
      return NextResponse.json({
        success: true,
        signedUrl: upload.fileUrl.replace(
          FILE_URL_PREFIX,
          "/api/upload/content/",
        ),
        fileUrl: upload.fileUrl,
      });
    } catch (err: unknown) {
      console.error("Upload init error:", err);
      return NextResponse.json(
        {
          success: false,
          error: serverMessages.runtimeFailedToInitializeUpload,
        },
        { status: 500 },
      );
    }
  });
}
