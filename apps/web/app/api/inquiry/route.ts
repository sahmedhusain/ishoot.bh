import { NextRequest, NextResponse } from "next/server";
import { resolveIncomingLead, getCompanySettings } from "@ishoot/database";
import {
  sendEmail,
  createInquiryConfirmationEmail,
  createInquiryNotificationEmail,
} from "@ishoot/email";
import { getTranslations, type Locale } from "@ishoot/locales";

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

    const localeKey: Locale = locale === "ar" ? "ar" : "en";
    const trans = getTranslations(localeKey);

    if (!fullName || !email || !message) {
      return NextResponse.json(
        { error: trans.api.inquiry.requiredFields },
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
    const clientSubject = trans.email.confirmation.subject.replace(
      "{companyName}",
      company || trans.common.brandName,
    );

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

    const companySettings = await getCompanySettings();
    const notificationRecipient = process.env.NOTIFICATION_EMAIL || companySettings.email;

    if (notificationRecipient) {
      const notificationSubject = trans.email.notification.subject.replace(
        "{fullName}",
        fullName,
      );
      await sendEmail({
        to: notificationRecipient,
        subject: notificationSubject,
        html: teamHtml,
      });
    }

    return NextResponse.json({
      success: true,
      inquiryId: resolved.inquiryId,
      customerId: resolved.customerId,
      resolution: resolved.resolution,
      message: trans.api.inquiry.success,
    });
  } catch (error) {
    console.error("Inquiry API Error:", error);
    const trans = getTranslations("en");
    return NextResponse.json(
      { error: trans.api.inquiry.serverError },
      { status: 500 },
    );
  }
}
