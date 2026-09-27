import { NextRequest, NextResponse } from "next/server";
import { resolveIncomingLead } from "@ishoot/database";
import {
  sendEmail,
  createInquiryConfirmationEmail,
  createInquiryNotificationEmail,
} from "@ishoot/email";
import { getTranslations } from "@ishoot/locales";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fullName,
      email,
      phone,
      company,
      services = [],
      budget,
      timeline,
      message,
      locale = "en",
    } = body;

    if (!fullName || !email || !message) {
      return NextResponse.json(
        { error: "Full name, email, and message are required." },
        { status: 400 },
      );
    }

    const resolved = await resolveIncomingLead({
      name: fullName,
      email,
      phone,
      companyName: company,
      serviceType: services.join(", "),
      budgetRange: budget,
      timeline,
      message,
      source: "website",
      locale,
    });

    const clientHtml = createInquiryConfirmationEmail(
      fullName,
      services,
      locale,
    );
    const trans = getTranslations(locale === "ar" ? "ar" : "en");
    const clientSubject = trans.contact.emailSubject;

    await sendEmail({
      to: email,
      subject: clientSubject,
      html: clientHtml,
    });

    const teamHtml = createInquiryNotificationEmail({
      fullName,
      email,
      phone,
      company,
      services,
      budget,
      message,
    });

    await sendEmail({
      to: "hello@ishoot.bh",
      subject: `🔔 New Inquiry: ${fullName} — ${services[0] || "Production"}`,
      html: teamHtml,
    });

    return NextResponse.json({
      success: true,
      inquiryId: resolved.inquiryId,
      customerId: resolved.customerId,
      resolution: resolved.resolution,
      message: "Inquiry received and notifications dispatched.",
    });
  } catch (error) {
    console.error("Inquiry API Error:", error);
    return NextResponse.json(
      { error: "Internal server error processing inquiry." },
      { status: 500 },
    );
  }
}
