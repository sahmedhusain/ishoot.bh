import { lookupFile, readFile, listCompanyAssetsForIT } from "@platform/api-client";
import { asUser, requireAllowed } from "../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments = [] } = await params;
  if (segments.length < 2) {
    return new Response(null, { status: 404 });
  }
  const folder = segments[0];
  const middle = segments.slice(1, -1);
  const name = segments[segments.length - 1];
  if (
    !/^[a-zA-Z0-9_-]+$/.test(folder) ||
    middle.some((seg) => !/^[a-zA-Z0-9_-]+$/.test(seg)) ||
    !/^[a-zA-Z0-9_.-]+$/.test(name) ||
    name.includes("..")
  ) {
    return new Response(null, { status: 404 });
  }
  const url = `/api/files/${segments.join("/")}`;
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
