import { unlink } from "node:fs/promises";
import {
  detectFileType,
  getStorageClient,
  isSupabaseStorageConfigured,
  localUploadPath,
  uploadRoot,
  uploadStorageLocation,
} from "@platform/database";

/** Both public intake and account uploads use the same bounded reader and byte-level type checks. */
export async function readPrivateUpload(req: Request) {
  const limit = 10 * 1024 * 1024;
  if (Number(req.headers.get("content-length")) > limit)
    return Response.json({ error: "file_too_large" }, { status: 413 });
  const reader = req.body?.getReader();
  if (!reader) return Response.json({ error: "invalid_input" }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return Response.json({ error: "file_too_large" }, { status: 413 });
    }
    chunks.push(part.value);
  }
  const bytes = Buffer.concat(chunks);
  const type = detectFileType(bytes);
  const extension = (
    {
      "application/pdf": "pdf",
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
    } as Record<string, string>
  )[type ?? ""];
  if (!extension || !size)
    return Response.json({ error: "invalid_input" }, { status: 415 });
  let fileName = "";
  try {
    fileName = decodeURIComponent(req.headers.get("x-file-name") ?? "")
      .replace(/[\x00-\x1f/\\]/g, "")
      .trim()
      .slice(0, 200);
  } catch {}
  return {
    bytes,
    type: type!,
    extension,
    size,
    fileName: fileName || `attachment.${extension}`,
  };
}

export async function discardPrivateUpload(fileUrl: string) {
  const location = uploadStorageLocation(fileUrl, false);
  if (isSupabaseStorageConfigured())
    await getStorageClient()
      .storage.from(location.bucket)
      .remove([location.path]);
  else
    await unlink(localUploadPath(fileUrl, uploadRoot())).catch(() => undefined);
}
