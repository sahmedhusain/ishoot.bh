import { serverMessages } from "@ishoot/locales";

import {requireFeatureEnabled, measureOperation } from "@ishoot/database";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@ishoot/database";
import {
  readSubmission,
  textField,
  submissionKey,
} from "../../../lib/submissions";
export async function POST(req: NextRequest) {
  return measureOperation("web:reviews:POST", async () => {
  try {
    try { await requireFeatureEnabled("reviews"); } catch { return NextResponse.json({error:serverMessages.runtimeSubmissionsAreTemporarilyUnavailable},{status:503}); }
    const body = await readSubmission(req);
    const authorName = textField(body, "authorName", 200, true);
    const companyName = textField(body, "companyName", 200);
    const quote = textField(body, "quote", 5000, true);
    const locale = textField(body, "locale") || "en";
    const rating = body.rating;
    if (
      typeof rating !== "number" ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5 ||
      !["ar", "en"].includes(locale)
    )
      throw new Error(serverMessages.invalidInput);
    const key = submissionKey(body);
    const requestHash = createHash("sha256")
      .update(
        JSON.stringify({ authorName, companyName, quote, locale, rating }),
      )
      .digest("hex");
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`;
      const prior = await tx.review.findUnique({
        where: { submissionKey: key },
      });
      if (prior) {
        if (prior.requestHash !== requestHash) throw new Error(serverMessages.invalidInput);
        return;
      }
      await tx.review.create({
        data: {
          authorEn: authorName,
          authorAr: authorName,
          companyEn: companyName,
          companyAr: companyName,
          quoteEn: locale === "en" ? quote : "",
          quoteAr: locale === "ar" ? quote : "",
          originalLocale: locale,
          rating,
          isApproved: false,
          submissionKey: key,
          requestHash,
        },
      });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status =
      message === "RATE_LIMIT" ? 429 : message === "INVALID_INPUT" ? 400 : 500;
    return NextResponse.json(
      {
        error:
          status === 429
            ? "Please wait before trying again."
            : "Please check your review and try again.",
      },
      { status },
    );
  }

  });
}
