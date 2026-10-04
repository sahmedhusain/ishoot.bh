import { measureOperation } from "@ishoot/database";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(req: NextRequest) {
  return measureOperation("web:revalidate:POST", async () => {
  const secret = req.headers.get("x-revalidate-secret");
  const expectedSecret = process.env.REVALIDATION_SECRET;
  if (!expectedSecret || !secret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tags, paths } = await req.json();
    if (
      (tags !== undefined &&
        (!Array.isArray(tags) ||
          tags.length > 32 ||
          tags.some(
            (tag: unknown) => typeof tag !== "string" || tag.length > 200,
          ))) ||
      (paths !== undefined &&
        (!Array.isArray(paths) ||
          paths.length > 32 ||
          paths.some(
            (path: unknown) =>
              typeof path !== "string" ||
              !path.startsWith("/") ||
              path.startsWith("//") ||
              path.length > 2000,
          )))
    )
      return NextResponse.json(
        { error: "Invalid invalidation request" },
        { status: 400 },
      );
    revalidateTag("website");
    revalidateTag("company");

    if (Array.isArray(tags)) {
      for (const tag of tags) {
        if (typeof tag === "string") {
          revalidateTag(tag);
        }
      }
    }

    if (Array.isArray(paths)) {
      for (const path of paths) {
        if (typeof path === "string") {
          revalidatePath(path);
          if (path === "/") {
            revalidatePath("/en", "layout");
            revalidatePath("/ar", "layout");
          } else if (!/^\/(en|ar)(\/|$)/.test(path)) {
            revalidatePath(`/en${path}`);
            revalidatePath(`/ar${path}`);
          }
        }
      }
    }

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to revalidate" },
      { status: 500 },
    );
  }

  });
}
