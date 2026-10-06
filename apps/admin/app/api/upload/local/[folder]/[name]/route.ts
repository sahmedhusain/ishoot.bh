import { NextRequest, NextResponse } from "next/server";
import { db, detectFileType, isSupabaseStorageConfigured, measureOperation, uploadRoot, writeLocalUpload } from "@ishoot/database";
import { getCurrentUser } from "../../../../../../lib/auth";

export const dynamic = "force-dynamic";

/**
 * Local-disk upload target used when Supabase Storage is not configured. Only the user who started the upload may
 * send it, once, before it expires; the bytes must match the registered size and real file type.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ folder: string; name: string }> }) {
  return measureOperation("admin:upload/local:PUT", async () => {
    if (isSupabaseStorageConfigured()) return NextResponse.json({ error: "Not available" }, { status: 404 });
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { folder, name } = await params;
    if (!/^(payments|invoices|certificates|vault|deals|general|brand)$/.test(folder) || !/^[a-zA-Z0-9_-]+\.(pdf|png|jpg|jpeg|webp)$/.test(name))
      return NextResponse.json({ error: "Invalid upload path" }, { status: 400 });
    const fileUrl = `/api/files/${folder}/${name}`;
    const upload = await db.uploadObject.findUnique({ where: { fileUrl } });
    if (!upload || upload.ownerId !== user.id || upload.claimedAt || upload.expiresAt <= new Date())
      return NextResponse.json({ error: "Upload not found or expired" }, { status: 404 });
    const declared = Number(req.headers.get("content-length") ?? upload.fileSize);
    if (declared > 10 * 1024 * 1024) return NextResponse.json({ error: "Maximum file size is 10 MB" }, { status: 413 });
    const bytes = new Uint8Array(await req.arrayBuffer());
    if (bytes.byteLength !== upload.fileSize) return NextResponse.json({ error: "File size does not match" }, { status: 400 });
    if (detectFileType(bytes) !== upload.mimeType) return NextResponse.json({ error: "The file content does not match its type" }, { status: 415 });
    try {
      await writeLocalUpload(fileUrl, uploadRoot(), bytes);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") return NextResponse.json({ error: "This upload was already sent" }, { status: 409 });
      console.error("Local upload write error:", error);
      return NextResponse.json({ error: "Could not store the file" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  });
}
