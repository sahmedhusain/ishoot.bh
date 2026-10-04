import type { NextRequest } from "next/server";
// Bound the actual multipart stream before formData parses it; Content-Length alone is untrusted.
export async function readUploadForm(req: NextRequest) {
  const max = 11 * 1024 * 1024;
  if (!req.headers.get("content-type")?.startsWith("multipart/form-data;") || Number(req.headers.get("content-length")) > max) throw new Error("UPLOAD_LIMIT");
  const reader = req.body?.getReader();
  if (!reader) throw new Error("INVALID_UPLOAD");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel(); throw new Error("UPLOAD_LIMIT"); }
    chunks.push(value);
  }
  return new Request("http://upload.invalid", { method: "POST", headers: { "content-type": req.headers.get("content-type")! }, body: Buffer.concat(chunks) }).formData();
}
