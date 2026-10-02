import { NextRequest, NextResponse } from "next/server";
import { readFile, realpath } from "fs/promises";
import path from "path";
import { db } from "@ishoot/database";
import { getCurrentUser } from "../../../../../lib/auth";
import { requireAttachmentAccess } from "../../../../../lib/attachment-access";

export async function GET(req: NextRequest, { params }: { params: Promise<{ folder: string; name: string }> }) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { folder, name } = await params;
  const types: Record<string, string> = { payments: "payment", invoices: "invoice", certificates: "company_setting", vault: "contact", deals: "deal", general: "general" };
  if (!types[folder] || !/^[a-zA-Z0-9_-]+\.(pdf|png|jpg|jpeg|webp)$/.test(name)) return new NextResponse(null, { status: 404 });
  try {
    const url = `/api/files/${folder}/${name}`;
    const attachment = await db.attachment.findFirst({ where: { OR: [{ fileUrl: url }, { fileUrl: `/uploads/${folder}/${name}` }] } });
    await requireAttachmentAccess(attachment?.entityType || types[folder], attachment?.entityId || "pending", "read");
    let filePath = path.join(process.cwd(), "private", "uploads", folder, name);
    try { filePath = await realpath(filePath); } catch {
      filePath = await realpath(path.join(process.cwd(), "public", "uploads", folder, name));
    }
    const roots = [path.join(process.cwd(), "private", "uploads") + path.sep, path.join(process.cwd(), "public", "uploads") + path.sep];
    if (!roots.some((root) => filePath.startsWith(root))) return new NextResponse(null, { status: 404 });
    const bytes = await readFile(filePath);
    const mime: Record<string, string> = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };
    return new NextResponse(new Uint8Array(bytes), { headers: {
      "Content-Type": mime[name.split(".").pop()!],
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    return new NextResponse(null, { status: 403 });
  }
}
