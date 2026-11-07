import { getSite } from "../../../lib/site";
import { isWebsitePreview } from "../../../lib/website";
import { serverMessages } from "@platform/locales";

import { requireFeatureEnabled, measureOperation } from "@platform/database";
import { NextRequest, NextResponse } from "next/server";
import { createReview } from "../../../lib/api/cms";
import { serviceToken } from "../../../lib/api/service-token";
import {
  readSubmission,
  textField,
  submissionKey,
} from "../../../lib/submissions";
export async function POST(req: NextRequest) {
  return measureOperation("web:reviews:POST", async () => {
    try {
      const { config, enabled } = await getSite();
      if (!enabled || !config.commerce.capabilities.inquiries || await isWebsitePreview()) return NextResponse.json({ error: serverMessages.runtimeSubmissionsAreTemporarilyUnavailable }, { status: 404 });
      try {
        await requireFeatureEnabled("reviews");
      } catch {
        return NextResponse.json(
          { error: serverMessages.runtimeSubmissionsAreTemporarilyUnavailable },
          { status: 503 },
        );
      }
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
      const token = await serviceToken().catch(() => "");
      await createReview(token, {
        authorEn: authorName,
        authorAr: authorName,
        companyEn: companyName || authorName,
        companyAr: companyName || authorName,
        quoteEn: locale === "en" ? quote : "",
        quoteAr: locale === "ar" ? quote : "",
        rating,
        isApproved: false,
      });
      return NextResponse.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const status =
        message === "RATE_LIMIT"
          ? 429
          : message === "INVALID_INPUT"
            ? 400
            : 500;
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
