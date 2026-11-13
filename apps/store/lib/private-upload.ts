import { deleteFile, isApiError, storeFile, type FileRecord } from "@platform/api-client";

export async function storePrivateUpload(
  req: Request,
  namePrefix: "inquiry" | "customer",
): Promise<FileRecord | Response> {
  const size = Number(req.headers.get("content-length"));
  if (!req.body || !Number.isInteger(size) || size <= 0)
    return Response.json({ error: "invalid_input" }, { status: 400 });
  let fileName = "";
  try {
    fileName = decodeURIComponent(req.headers.get("x-file-name") ?? "")
      .replace(/[\x00-\x1f/\\]/g, "")
      .trim()
      .slice(0, 200);
  } catch {}
  try {
    const stored = await storeFile({ folder: "general", namePrefix }, req.body, {
      size,
      fileName: fileName || undefined,
    });
    if (stored) return stored;
  } catch (error) {
    if (isApiError(error, "payload_too_large"))
      return Response.json({ error: "file_too_large" }, { status: 413 });
    if (isApiError(error, "unsupported_file_type", "file_content_mismatch"))
      return Response.json({ error: "invalid_input" }, { status: 415 });
  }
  return Response.json({ error: "generic" }, { status: 503 });
}

export const discardPrivateUpload = (fileUrl: string) =>
  deleteFile(fileUrl).catch(() => undefined);
