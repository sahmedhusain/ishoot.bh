import { getTranslations, type Locale } from "@ishoot/locales";

export function escapeEmailHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
function safeWebsiteUrl(value: string): string {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

export interface BrandEmailCompanyInfo {
  nameEn?: string;
  nameAr?: string;
  cr?: string;
  website?: string;
  email?: string;
  addressEn?: string;
  addressAr?: string;
}

export function renderBrandEmailLayout(
  title: string,
  contentHtml: string,
  isRtl: boolean = false,
  companyInfo?: BrandEmailCompanyInfo,
): string {
  if (!companyInfo || !companyInfo.nameEn || !companyInfo.nameAr)
    throw new Error(
      "Database company identity is required for email templates",
    );
  const dir = isRtl ? "rtl" : "ltr";
  const textAlign = isRtl ? "right" : "left";
  const fontFamily =
    "'Thmanyah Sans', 'Thmanyah', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Arial, sans-serif";

  const comp = {
    nameEn: escapeEmailHtml(companyInfo?.nameEn),
    nameAr: escapeEmailHtml(companyInfo?.nameAr),
    cr: escapeEmailHtml(companyInfo?.cr),
    website: escapeEmailHtml(safeWebsiteUrl(companyInfo?.website || "")),
    email: escapeEmailHtml(companyInfo?.email),
    addressEn: escapeEmailHtml(companyInfo?.addressEn),
    addressAr: escapeEmailHtml(companyInfo?.addressAr),
  };

  const displayName = isRtl ? comp.nameAr : comp.nameEn;
  const displayAddress = isRtl ? comp.addressAr : comp.addressEn;
  const cleanWebsiteDomain = comp.website.replace(/^https?:\/\//, "");
  const localeKey: Locale = isRtl ? "ar" : "en";
  const t = getTranslations(localeKey);

  return `
<!DOCTYPE html>
<html dir="${dir}" lang="${localeKey}">
<head>
  <meta charset="utf-8">
  <title>${escapeEmailHtml(title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #050807; font-family: ${fontFamily}; color: #F2F6F5; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050807; padding: 40px 12px;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #0B1210; border: 1px solid rgba(9, 147, 127, 0.3); border-radius: 20px; overflow: hidden; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);">
          <!-- Header Bar with Emerald Accent Line -->
          <tr>
            <td style="background-color: #014842; padding: 28px 36px; border-bottom: 2px solid #09937F;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="${textAlign}">
                    <span style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #FFFFFF;">
                      ${displayName}<span style="color: #09937F;">.</span>
                    </span>
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #9EADA9; margin-top: 4px; font-weight: 500;">
                      ${displayAddress}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content Container -->
          <tr>
            <td style="padding: 40px 36px; text-align: ${textAlign}; line-height: 1.65; color: #F2F6F5;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer Bar -->
          <tr>
            <td style="background-color: #050807; padding: 28px 36px; border-top: 1px solid rgba(255, 255, 255, 0.08); text-align: center; font-size: 12px; color: #9EADA9;">
              <div style="margin-bottom: 10px; font-weight: 500; color: #C5D1CD;">
                ${displayName} • ${displayAddress}
              </div>
              <div style="color: #839490; font-size: 11px;">
                ${t.email.layout.cr.replace("{cr}", comp.cr)} • <a href="${comp.website}" style="color: #09937F; text-decoration: none; font-weight: 600;">${cleanWebsiteDomain}</a> • ${comp.email}
              </div>
              <div style="margin-top: 12px; color: #556662; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">
                ${t.email.layout.rights}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function createInquiryConfirmationEmail(
  name: string,
  services: string[],
  locale: string = "en",
  companyInfo?: BrandEmailCompanyInfo,
): string {
  const localeKey: Locale = locale === "ar" ? "ar" : "en";
  const isAr = localeKey === "ar";
  const t = getTranslations(localeKey);

  const compName = isAr
    ? (companyInfo?.nameAr ?? "")
    : (companyInfo?.nameEn ?? "");

  const serviceList = services
    .map(
      (s) =>
        `<li style="margin-bottom: 8px; color: #09937F; font-weight: 500;"><span style="color: #F2F6F5;">${escapeEmailHtml(s)}</span></li>`,
    )
    .join("");

  const subject = t.email.confirmation.subject.replace(
    "{companyName}",
    compName,
  );
  const title = t.email.confirmation.title.replace("{name}", name);
  const receivedMsg = t.email.confirmation.receivedMessage;
  const servicesTitle = t.email.confirmation.servicesRequested;
  const urgentInquiries = t.email.confirmation.urgentInquiries;
  const warmRegards = t.email.confirmation.warmRegards;
  const prodTeam = t.email.confirmation.productionTeam.replace(
    "{companyName}",
    compName,
  );

  const content = `
    <h2 style="color: #FFFFFF; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">${escapeEmailHtml(title)}</h2>
    <p style="font-size: 15px; color: #9EADA9; margin-bottom: 24px;">
      ${escapeEmailHtml(receivedMsg)}
    </p>
    <div style="background-color: #111C19; border: 1px solid rgba(9, 147, 127, 0.25); border-radius: 14px; padding: 22px; margin: 24px 0;">
      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #FFFFFF; margin-bottom: 14px;">
        ${escapeEmailHtml(servicesTitle)}
      </div>
      <ul style="margin: 0; ${isAr ? "padding-right: 20px;" : "padding-left: 20px;"} font-size: 14px;">
        ${serviceList}
      </ul>
    </div>
    <p style="font-size: 14px; color: #9EADA9; line-height: 1.6;">
      ${escapeEmailHtml(urgentInquiries)}
    </p>
    <div style="margin-top: 32px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px;">
      <span style="font-weight: 600; color: #FFFFFF; font-size: 15px;">${escapeEmailHtml(warmRegards)}</span><br>
      <span style="color: #09937F; font-weight: 600; font-size: 14px;">${escapeEmailHtml(prodTeam)}</span>
    </div>
  `;

  return renderBrandEmailLayout(subject, content, isAr, companyInfo);
}

export function createInquiryNotificationEmail(inquiry: {
  fullName: string;
  email: string;
  phone?: string;
  company?: string;
  services: string[];
  budget?: string;
  message?: string;
  companyInfo?: BrandEmailCompanyInfo;
  locale?: string;
}): string {
  const isAr = inquiry.locale === "ar";
  const localeKey: Locale = isAr ? "ar" : "en";
  const t = getTranslations(localeKey);
  const serviceList = inquiry.services
    .map((s) => `<li style="margin-bottom: 4px;">${escapeEmailHtml(s)}</li>`)
    .join("");

  const badgeText = t.email.notification.badge;
  const titleText = t.email.notification.title.replace(
    "{fullName}",
    inquiry.fullName,
  );
  const subjectText = t.email.notification.subject.replace(
    "{fullName}",
    inquiry.fullName,
  );

  const content = `
    <div style="display: inline-block; background-color: rgba(9, 147, 127, 0.15); border: 1px solid #09937F; color: #09937F; font-size: 11px; font-weight: 700; padding: 5px 14px; border-radius: 999px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 18px;">
      ${badgeText}
    </div>
    <h2 style="color: #FFFFFF; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 20px;">${escapeEmailHtml(titleText)}</h2>

    <table width="100%" border="0" cellspacing="0" cellpadding="10" style="background-color: #111C19; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.08); font-size: 14px; margin: 20px 0;">
      <tr>
        <td width="140" style="color: #9EADA9; font-weight: 500;">${t.email.notification.fullName}</td>
        <td style="color: #FFFFFF; font-weight: 700;">${escapeEmailHtml(inquiry.fullName)}</td>
      </tr>
      <tr>
        <td style="color: #9EADA9; font-weight: 500;">${t.email.notification.email}</td>
        <td><a href="mailto:${escapeEmailHtml(inquiry.email)}" style="color: #09937F; text-decoration: none; font-weight: 600;">${escapeEmailHtml(inquiry.email)}</a></td>
      </tr>
      <tr>
        <td style="color: #9EADA9; font-weight: 500;">${t.email.notification.phone}</td>
        <td><a href="tel:${escapeEmailHtml(inquiry.phone ?? "")}" style="color: #09937F; text-decoration: none; font-family: monospace;">${escapeEmailHtml(inquiry.phone ?? t.email.notification.notSpecified)}</a></td>
      </tr>
      <tr>
        <td style="color: #9EADA9; font-weight: 500;">${t.email.notification.company}</td>
        <td style="color: #FFFFFF;">${escapeEmailHtml(inquiry.company ?? t.email.notification.directIndividual)}</td>
      </tr>
      <tr>
        <td style="color: #9EADA9; font-weight: 500;">${t.email.notification.budget}</td>
        <td style="color: #09937F; font-weight: 700;">${escapeEmailHtml(inquiry.budget ?? t.email.notification.toBeDiscussed)}</td>
      </tr>
      <tr>
        <td valign="top" style="color: #9EADA9; font-weight: 500;">${t.email.notification.services}</td>
        <td style="color: #FFFFFF;"><ul style="margin: 0; padding-left: 18px;">${serviceList}</ul></td>
      </tr>
    </table>

    <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9EADA9; margin-bottom: 8px;">${t.email.notification.projectBrief}</div>
    <div style="background-color: #050807; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 18px; font-size: 14px; color: #F2F6F5; white-space: pre-wrap; line-height: 1.6;">
      ${escapeEmailHtml(inquiry.message ?? t.email.notification.noMessage)}
    </div>
  `;

  return renderBrandEmailLayout(
    subjectText,
    content,
    isAr,
    inquiry.companyInfo,
  );
}

export function createInvoiceDeliveryEmail(params: {
  clientName: string;
  invoiceNumber: string;
  totalAmountFormatted: string;
  dueDate: string;
  bankName: string;
  bankIban: string;
  locale?: "en" | "ar";
  companyInfo?: BrandEmailCompanyInfo;
}): string {
  const localeKey: Locale = params.locale === "ar" ? "ar" : "en";
  const isAr = localeKey === "ar";
  const t = getTranslations(localeKey);

  const compName = isAr
    ? (params.companyInfo?.nameAr ?? "")
    : (params.companyInfo?.nameEn ?? "");

  const subject = t.email.invoiceDelivery.subject
    .replace("{invoiceNumber}", params.invoiceNumber)
    .replace("{companyName}", compName);

  const greeting = t.email.invoiceDelivery.greeting.replace(
    "{clientName}",
    params.clientName,
  );
  const body = t.email.invoiceDelivery.body.replace(
    "{invoiceNumber}",
    params.invoiceNumber,
  );

  const content = `
    <h2 style="color: #FFFFFF; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 16px;">${escapeEmailHtml(greeting)}</h2>
    <p style="font-size: 15px; color: #9EADA9; margin-bottom: 24px;">
      ${escapeEmailHtml(body)}
    </p>

    <div style="background-color: #111C19; border: 1px solid rgba(9, 147, 127, 0.3); border-radius: 16px; padding: 26px; margin: 24px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="8" style="font-size: 14px;">
        <tr>
          <td style="color: #9EADA9;">${t.email.invoiceDelivery.invoiceNumber}</td>
          <td style="color: #FFFFFF; font-weight: 700;">${escapeEmailHtml(params.invoiceNumber)}</td>
        </tr>
        <tr>
          <td style="color: #9EADA9;">${t.email.invoiceDelivery.dueDate}</td>
          <td style="color: #FFFFFF;">${escapeEmailHtml(params.dueDate)}</td>
        </tr>
        <tr>
          <td style="color: #9EADA9; font-size: 15px; padding-top: 14px;">${t.email.invoiceDelivery.amountDue}</td>
          <td style="color: #09937F; font-size: 22px; font-weight: 800; padding-top: 14px;">${escapeEmailHtml(params.totalAmountFormatted)}</td>
        </tr>
      </table>

      <div style="border-top: 1px solid rgba(255, 255, 255, 0.1); margin-top: 20px; padding-top: 18px; font-size: 13px;">
        <div style="font-weight: 700; color: #FFFFFF; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          ${t.email.invoiceDelivery.bankDetails}
        </div>
        <div style="color: #9EADA9; margin-bottom: 4px;">${t.email.invoiceDelivery.bank} <span style="color: #FFFFFF;">${escapeEmailHtml(params.bankName)}</span></div>
        <div style="color: #9EADA9;">${t.email.invoiceDelivery.iban} <span style="color: #FFFFFF; font-family: monospace; font-weight: 600;">${escapeEmailHtml(params.bankIban)}</span></div>
      </div>
    </div>

    <p style="font-size: 14px; color: #9EADA9; line-height: 1.6;">
      ${t.email.invoiceDelivery.pdfNotice}
    </p>
  `;

  return renderBrandEmailLayout(subject, content, isAr, params.companyInfo);
}

export function createPaymentReceiptEmail(params: {
  clientName: string;
  receiptNumber: string;
  invoiceNumber: string;
  amountReceivedFormatted: string;
  remainingDueFormatted: string;
  paymentMethod: string;
  isPaidInFull: boolean;
  locale?: "en" | "ar";
  companyInfo?: BrandEmailCompanyInfo;
}): string {
  const localeKey: Locale = params.locale === "ar" ? "ar" : "en";
  const isAr = localeKey === "ar";
  const t = getTranslations(localeKey);

  const compName = isAr
    ? (params.companyInfo?.nameAr ?? "")
    : (params.companyInfo?.nameEn ?? "");

  const subject = t.email.paymentReceipt.subject
    .replace("{receiptNumber}", params.receiptNumber)
    .replace("{companyName}", compName);

  const badgeText = params.isPaidInFull
    ? t.email.paymentReceipt.badgePaidInFull
    : t.email.paymentReceipt.badgePartial;

  const title = t.email.paymentReceipt.title;
  const greeting = t.email.paymentReceipt.greeting.replace(
    "{clientName}",
    params.clientName,
  );
  const body = t.email.paymentReceipt.body.replace(
    "{invoiceNumber}",
    params.invoiceNumber,
  );

  const content = `
    <div style="display: inline-block; background-color: rgba(16, 185, 129, 0.15); border: 1px solid #10B981; color: #10B981; font-size: 11px; font-weight: 700; padding: 5px 14px; border-radius: 999px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 18px;">
      ${badgeText}
    </div>
    <h2 style="color: #FFFFFF; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">${escapeEmailHtml(title)}</h2>
    <p style="font-size: 15px; color: #9EADA9; margin-bottom: 24px;">
      ${escapeEmailHtml(greeting)} ${escapeEmailHtml(body)}
    </p>

    <div style="background-color: #111C19; border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 16px; padding: 26px; margin: 24px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="8" style="font-size: 14px;">
        <tr>
          <td style="color: #9EADA9;">${t.email.paymentReceipt.receiptNumber}</td>
          <td style="color: #FFFFFF; font-weight: 700;">${escapeEmailHtml(params.receiptNumber)}</td>
        </tr>
        <tr>
          <td style="color: #9EADA9;">${t.email.paymentReceipt.paymentMethod}</td>
          <td style="color: #FFFFFF;">${escapeEmailHtml(params.paymentMethod)}</td>
        </tr>
        <tr>
          <td style="color: #9EADA9; font-size: 15px; padding-top: 14px;">${t.email.paymentReceipt.amountReceived}</td>
          <td style="color: #10B981; font-size: 22px; font-weight: 800; padding-top: 14px;">${escapeEmailHtml(params.amountReceivedFormatted)}</td>
        </tr>
        <tr>
          <td style="color: #9EADA9;">${t.email.paymentReceipt.remainingBalance}</td>
          <td style="color: #F2F6F5; font-weight: 600;">${escapeEmailHtml(params.remainingDueFormatted)}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 14px; color: #9EADA9; line-height: 1.6;">
      ${t.email.paymentReceipt.pdfNotice}
    </p>
  `;

  return renderBrandEmailLayout(subject, content, isAr, params.companyInfo);
}
