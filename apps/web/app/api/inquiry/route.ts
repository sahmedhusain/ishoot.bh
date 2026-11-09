import { inquiryUploadToken } from "@platform/database/services/inquiry-upload-token";
import { signInSecret } from "../../../lib/customer";
import { isWebsitePreview } from "../../../lib/website";
import {
  serverMessages,
  formatMessage,
  getTranslations,
} from "@platform/locales";

import { requireFeatureEnabled, measureOperation } from "@platform/database";
import { resolveWebsiteConfig } from "@platform/database/website-config";
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import {
  resolveIncomingLead,
  getCompanySettings,
  getWebsiteSnapshot,
  isValidEmail,
  isValidPhone,
  formatPhoneE164,
  normalizeEmail,
} from "@platform/database";
import { sendEmail } from "@platform/email";
import { campaignFrom } from "../../../lib/utm";

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
      if (await isWebsitePreview())
        return NextResponse.json(
          { error: serverMessages.runtimeSubmissionsAreTemporarilyUnavailable },
          { status: 404 },
        );
      try {
        await requireFeatureEnabled("crm_deals");
        await requireFeatureEnabled("cms");
      } catch {
        return NextResponse.json(
          { error: serverMessages.runtimeSubmissionsAreTemporarilyUnavailable },
          { status: 503 },
        );
      }
      const body = await readSubmission(req);
      const intent = textField(body, "intent") || "inquiry";
      if (
        !["inquiry", "quote_request", "complaint", "suggestion"].includes(
          intent,
        )
      )
        throw new Error(serverMessages.invalidInput);
      const locale = textField(body, "locale") || "en";
      if (!["en", "ar"].includes(locale))
        throw new Error(serverMessages.invalidInput);
      const name =
        textField(body, "fullName", 200, intent !== "suggestion") ||
        getTranslations(locale === "ar" ? "ar" : "en").contact
          .anonymousSuggestion;
      const rawEmail = textField(body, "email", 254);
      const rawPhone = textField(body, "phone", 40);
      if (
        (rawEmail && !isValidEmail(rawEmail)) ||
        (rawPhone && !isValidPhone(rawPhone)) ||
        (intent !== "suggestion" && !rawEmail && !rawPhone)
      )
        throw new Error(serverMessages.invalidInput);
      const email = rawEmail ? normalizeEmail(rawEmail) : "";
      const phone = rawPhone ? formatPhoneE164(rawPhone) : "";
      const serviceIds = body.services ?? [];
      if (
        !Array.isArray(serviceIds) ||
        serviceIds.length > 20 ||
        serviceIds.some((id) => typeof id !== "string")
      )
        throw new Error(serverMessages.invalidInput);
      const website = await getWebsiteSnapshot();
      if (!resolveWebsiteConfig(website.config).commerce.capabilities.inquiries)
        return NextResponse.json(
          { error: serverMessages.runtimeSubmissionsAreTemporarilyUnavailable },
          { status: 404 },
        );
      const available = website.services;
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
      const currency = (await getCompanySettings()).default_currency;
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
              under_500: `Under ${currency} 500`,
              "500_1500": `${currency} 500–1,500`,
              "1500_5000": `${currency} 1,500–5,000`,
              "5000_plus": `${currency} 5,000+`,
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
        utmCampaign: campaignFrom(req)?.campaign ?? null,
        submissionKey: key,
        requestHash: createHash("sha256")
          .update(JSON.stringify(data))
          .digest("hex"),
      });
      let confirmationSent = resolved.confirmationStatus === "sent";
      if (!resolved.repeated) {
        const reference = escape(resolved.reference);
        try {
          const settings = await getCompanySettings();
          const recipient = settings.email;
          const deliveries = await Promise.allSettled([
            email
              ? sendEmail({
                  to: email,
                  subject: formatMessage(
                    getTranslations(locale === "ar" ? "ar" : "en").email
                      .inquiryReceived.subject,
                    { reference: resolved.reference },
                  ),
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
          confirmationSent = !!confirmation?.success;
        } catch (error) {
          console.error("Request saved; notification processing failed", error);
        }
      }
      let uploadToken: string | undefined;
      if (
        resolveWebsiteConfig(website.config).commerce.inquiryAttachments !==
        false
      ) {
        try {
          uploadToken = inquiryUploadToken(resolved.inquiryId, signInSecret());
        } catch {}
      }
      return NextResponse.json({
        success: true,
        uploadToken,
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
