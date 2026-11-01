import { LANGUAGES } from "@platform/locales/registry";
import { serverMessages } from "@platform/locales";

import { measureOperation } from "@platform/database";
import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

// Hashing both sides gives equal lengths, so the comparison takes the same time whatever was sent.
function secretMatches(sent: string, expected: string) {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(sent), digest(expected));
}

export async function POST(req: NextRequest) {
  return measureOperation("web:revalidate:POST", async () => {
    const secret = req.headers.get("x-revalidate-secret");
    const expectedSecret = process.env.REVALIDATION_SECRET;
    if (!expectedSecret || !secret || !secretMatches(secret, expectedSecret)) {
      return NextResponse.json(
        { error: serverMessages.unauthorized },
        { status: 401 },
      );
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
          { error: serverMessages.runtimeInvalidInvalidationRequest },
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
            const locales = LANGUAGES.map((language) => language.code);
            if (path === "/") {
              for (const locale of locales) revalidatePath(`/${locale}`, "layout");
            } else if (!locales.some((locale) => path === `/${locale}` || path.startsWith(`/${locale}/`))) {
              for (const locale of locales) revalidatePath(`/${locale}${path}`);
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
