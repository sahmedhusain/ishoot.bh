import { NextRequest, NextResponse } from "next/server";
import { createReview, createActivityLog } from "@ishoot/database";
import { getTranslations, type Locale } from "@ishoot/locales";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      authorName,
      companyName,
      rating = 5,
      quote,
      locale = "en",
    } = body;

    const localeKey: Locale = locale === "ar" ? "ar" : "en";
    const trans = getTranslations(localeKey);

    if (!authorName || !quote) {
      return NextResponse.json(
        {
          success: false,
          error: trans.api.reviews.requiredFields,
        },
        { status: 400 }
      );
    }

    const numericRating = Math.min(5, Math.max(1, Number(rating) || 5));

    const review = await createReview({
      authorEn: authorName.trim(),
      authorAr: authorName.trim(),
      companyEn: companyName ? companyName.trim() : undefined,
      companyAr: companyName ? companyName.trim() : undefined,
      quoteEn: quote.trim(),
      quoteAr: quote.trim(),
      rating: numericRating,
      year: new Date().getFullYear().toString(),
      isApproved: false, // Explicitly false: Requires admin approval in Dashboard
    });

    try {
      await createActivityLog({
        user_id: "00000000-0000-0000-0000-000000000001",
        action: "create",
        entity_type: "review",
        entity_id: review.id,
        details: {
          author: authorName,
          company: companyName,
          rating: numericRating,
          source: "web_client",
        },
      });
    } catch {
      // Non-blocking activity log
    }

    return NextResponse.json({
      success: true,
      message: trans.api.reviews.success,
      reviewId: review.id,
    });
  } catch (error: any) {
    console.error("Client Review Submission Error:", error);
    const trans = getTranslations("en");
    return NextResponse.json(
      {
        success: false,
        error: trans.api.reviews.serverError,
      },
      { status: 500 }
    );
  }
}
