import { lookupFile, readFile, listCompanyAssetsForIT } from "@platform/api-client";
import { asUser, requireAllowed } from "../../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ folder: string; name: string }> },
) {
  const { folder, name } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(folder) || !/^[a-zA-Z0-9_.-]+$/.test(name) || name.includes("..")) {
    return new Response(null, { status: 404 });
  }
  const url = `/api/files/${folder}/${name}`;
  try {
    const file = await lookupFile(url);
    if (!file) {
      return new Response(null, { status: 404 });
    }
    if (!file.isPublic) {
      const user = await requireAllowed("setup", "read");
      const assets = await asUser(() => listCompanyAssetsForIT(user.token));
      if (!assets.some((asset) => asset.fileUrl === url)) {
        return new Response(null, { status: 404 });
      }
    }
    const response = await readFile(url);
    if (!response) {
      return new Response(null, { status: 404 });
    }
    const bytes = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || file.mimeType;
    return new Response(bytes, {
      headers: {
        "content-type": contentType,
        "content-length": String(bytes.byteLength),
        "cache-control": file.isPublic ? "public, max-age=86400" : "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
