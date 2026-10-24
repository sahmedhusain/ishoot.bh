import { serverMessages, formatMessage, getTranslations } from "@platform/locales";


import {requireFeatureEnabled, measureOperation } from "@platform/database";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import {
  resolveIncomingLead,
  getCompanySettings,
  getWebsiteSnapshot,
  db,
  normalizeToE164,
} from "@platform/database";
import { sendEmail } from "@platform/email";

import {
  readSubmission,
  textField,
  submissionKey,
} from "../../../lib/submissions";

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
export async function POST(req: NextRequest) {
  return measureOperation("web:inquiry:POST", async () => {
  try {
    try { await requireFeatureEnabled("crm_deals"); } catch { return NextResponse.json({error:serverMessages.runtimeSubmissionsAreTemporarilyUnavailable},{status:503}); }
    const body = await readSubmission(req);
    const intent = textField(body, "intent") || "inquiry";
    if (
      !["inquiry", "quote_request", "complaint", "suggestion"].includes(intent)
    )
      throw new Error(serverMessages.invalidInput);
    const locale = textField(body, "locale") || "en";
    if (!["en", "ar"].includes(locale)) throw new Error(serverMessages.invalidInput);
    const name =
      textField(body, "fullName", 200, intent !== "suggestion") ||
      getTranslations(locale === "ar" ? "ar" : "en").contact.anonymousSuggestion;
    const email = textField(body, "email", 254).toLowerCase();
    const phone = textField(body, "phone", 40);
    if (
      (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
      (phone && !normalizeToE164(phone)) ||
      (intent !== "suggestion" && !email && !phone)
    )
      throw new Error(serverMessages.invalidInput);
    const serviceIds = body.services ?? [];
    if (
      !Array.isArray(serviceIds) ||
      serviceIds.length > 20 ||
      serviceIds.some((id) => typeof id !== "string")
    )
      throw new Error(serverMessages.invalidInput);
    const available = (await getWebsiteSnapshot()).services;
    const selected = available.filter((service) =>
      serviceIds.includes(service.id),
    );
    if (selected.length !== new Set(serviceIds).size)
      throw new Error(serverMessages.invalidInput);
    const services = selected.map((service) =>
      locale === "ar" ? service.nameAr : service.nameEn,
    );
    const budget = textField(body, "budget", 100);
    if (
      ![
        "",
        "not_sure",
        "under_500",
        "500_1500",
        "1500_5000",
        "5000_plus",
      ].includes(budget)
    )
      throw new Error(serverMessages.invalidInput);
    const data = {
      name,
      email,
      phone,
      intent: intent as
        "inquiry" | "quote_request" | "complaint" | "suggestion",
      locale,
      companyName: textField(body, "company", 200),
      serviceType: services.join(", "),
      serviceIds: selected.map((s) => s.id),
      budgetRange:
        (
          {
            not_sure: "Not sure",
            under_500: "Under BHD 500",
            "500_1500": "BHD 500–1,500",
            "1500_5000": "BHD 1,500–5,000",
            "5000_plus": "BHD 5,000+",
          } as Record<string, string>
        )[budget] || "",
      timeline: textField(body, "timeline", 100),
      message: textField(body, "message", 10000, true),
      location: textField(body, "location", 300),
      projectReference: textField(body, "projectReference", 200),
    };
    const key = submissionKey(body);
    const resolved = await resolveIncomingLead({
      ...data,
      submissionKey: key,
      requestHash: createHash("sha256")
        .update(JSON.stringify(data))
        .digest("hex"),
    });
    let confirmationSent = resolved.confirmationStatus === "sent";
    if (!resolved.repeated) {
      // Persistence succeeds independently of notification delivery. Never ask the visitor to resubmit a saved request.
      const reference = escape(resolved.reference);
      try {
        const settings = await getCompanySettings();
        const recipient = process.env.NOTIFICATION_EMAIL || settings.email;
        const deliveries = await Promise.allSettled([
          email
            ? sendEmail({
                to: email,
                subject: formatMessage(getTranslations(locale === "ar" ? "ar" : "en").email.inquiryReceived.subject, { reference: resolved.reference }),
                html: `<div dir="${locale === "ar" ? "rtl" : "ltr"}"><p>${getTranslations(locale === "ar" ? "ar" : "en").email.inquiryReceived.body}</p><p>${reference}</p></div>`,
              })
            : Promise.resolve(null),
          recipient
            ? sendEmail({
                to: recipient,
                subject: `Website ${intent}: ${resolved.reference}`,
                html: `<p>A new ${escape(intent.replaceAll("_", " "))} is waiting in the dashboard.</p><p>Reference: ${reference}</p>`,
              })
            : Promise.resolve(null),
        ]);
        const result = (index: number) =>
          deliveries[index].status === "fulfilled"
            ? deliveries[index].value
            : null;
        const confirmation = result(0);
        const notification = result(1);
        confirmationSent =
          !!confirmation?.success && !!process.env.RESEND_API_KEY;
        await db.inquiry.update({
          where: { id: resolved.inquiryId },
          data: {
            confirmationStatus: !email
              ? "not_requested"
              : confirmationSent
                ? "sent"
                : "failed",
            notificationStatus:
              notification?.success && process.env.RESEND_API_KEY
                ? "sent"
                : "failed",
            confirmationProviderId: confirmation?.id,
            notificationProviderId: notification?.id,
          },
        });
      } catch (error) {
        console.error("Request saved; notification processing failed", error);
        await db.inquiry
          .update({
            where: { id: resolved.inquiryId },
            data: {
              confirmationStatus: email ? "failed" : "not_requested",
              notificationStatus: "failed",
            },
          })
          .catch(() => {});
      }
    }
    return NextResponse.json({
      success: true,
      reference: resolved.reference,
      confirmationSent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status =
      message === "RATE_LIMIT"
        ? 429
        : [
              "INVALID_INPUT",
              "Invalid phone number",
              "Submission key already used",
            ].includes(message)
          ? 400
          : 500;
    if (status === 500) console.error("Inquiry submission failed", error);
    return NextResponse.json(
      {
        error:
          status === 429
            ? "Please wait a minute before trying again."
            : status === 400
              ? "Check the required fields and contact details."
              : "We could not save your message. Please try again.",
      },
      { status },
    );
  }

  });
}
