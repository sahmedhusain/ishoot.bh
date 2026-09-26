export function renderBrandEmailLayout(title: string, contentHtml: string, isRtl: boolean = false): string {
  const dir = isRtl ? 'rtl' : 'ltr';
  const textAlign = isRtl ? 'right' : 'left';
  const fontFamily = isRtl
    ? "'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif"
    : "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  return `
<!DOCTYPE html>
<html dir="${dir}" lang="${isRtl ? 'ar' : 'en'}">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #050807; font-family: ${fontFamily}; color: #F2F6F5;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050807; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0B1210; border: 1px solid rgba(9, 147, 127, 0.25); border-radius: 16px; overflow: hidden;">
          <!-- Header Bar: #014842 (Brand Emerald) -->
          <tr>
            <td style="background-color: #014842; padding: 28px 36px; border-bottom: 2px solid #09937F;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="${textAlign}">
                    <span style="font-size: 26px; font-weight: 700; letter-spacing: 1px; color: #FFFFFF;">
                      ishoot<span style="color: #09937F;">.</span>
                    </span>
                    <div style="font-size: 11px; text-transform: uppercase; tracking: 2px; color: #9EADA9; margin-top: 4px;">
                      ${isRtl ? 'دار الإنتاج السينمائي — مملكة البحرين' : 'Cinema Production House — Kingdom of Bahrain'}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 36px; text-align: ${textAlign}; line-height: 1.65; color: #F2F6F5;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #050807; padding: 24px 36px; border-top: 1px solid rgba(255, 255, 255, 0.08); text-align: center; font-size: 12px; color: #9EADA9;">
              <div style="margin-bottom: 8px;">
                ishoot Cinema Production • Seef District, Kingdom of Bahrain
              </div>
              <div>
                CR: CR-142859-1 • <a href="https://ishoot.bh" style="color: #09937F; text-decoration: none;">ishoot.bh</a> • hello@ishoot.bh
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

// 1. Client Inquiry Acknowledgment Template
export function createInquiryConfirmationEmail(name: string, services: string[], locale: string = 'en'): string {
  const isAr = locale === 'ar';
  const serviceList = services.map((s) => `<li style="margin-bottom: 6px; color: #09937F;">${s}</li>`).join('');

  if (isAr) {
    const content = `
      <h2 style="color: #FFFFFF; font-size: 22px; margin-top: 0;">شكراً لتواصلك معنا، ${name}!</h2>
      <p style="font-size: 15px; color: #9EADA9;">
        استلمنا تفاصيل مشروعك وسيقوم فريق الإنتاج بمراجعة متطلباتك والتواصل معك خلال <strong>24 ساعة</strong> لتحديد موعد الاجتماع المبدئي ومناقشة تفاصيل العمل.
      </p>
      <div style="background-color: #111C19; border: 1px solid rgba(9, 147, 127, 0.2); border-radius: 12px; padding: 20px; margin: 24px 0;">
        <div style="font-size: 13px; font-weight: 600; text-transform: uppercase; color: #FFFFFF; margin-bottom: 12px;">
          الخدمات المطلوبة:
        </div>
        <ul style="margin: 0; padding-right: 20px; font-size: 14px;">
          ${serviceList}
        </ul>
      </div>
      <p style="font-size: 14px; color: #9EADA9;">
        إذا كانت لديك أي استفسارات عاجلة، يمكنك مراسلتنا مباشرة عبر الواتساب أو الرد على هذا البريد الإلكتروني.
      </p>
      <div style="margin-top: 28px;">
        <span style="font-weight: 600; color: #FFFFFF;">مع أطيب التحيات،</span><br>
        <span style="color: #09937F;">فريق إنتاج آي شوت</span>
      </div>
    `;
    return renderBrandEmailLayout('شكراً لتواصلك مع آي شوت', content, true);
  }

  const content = `
    <h2 style="color: #FFFFFF; font-size: 22px; margin-top: 0;">Thank you for contacting us, ${name}!</h2>
    <p style="font-size: 15px; color: #9EADA9;">
      We have received your project brief. Our production team is reviewing your requirements and will connect with you within <strong>24 hours</strong> to coordinate initial discussions.
    </p>
    <div style="background-color: #111C19; border: 1px solid rgba(9, 147, 127, 0.2); border-radius: 12px; padding: 20px; margin: 24px 0;">
      <div style="font-size: 13px; font-weight: 600; text-transform: uppercase; color: #FFFFFF; margin-bottom: 12px;">
        Services Requested:
      </div>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
        ${serviceList}
      </ul>
    </div>
    <p style="font-size: 14px; color: #9EADA9;">
      For urgent production inquiries, you may reach us directly via WhatsApp or reply to this message.
    </p>
    <div style="margin-top: 28px;">
      <span style="font-weight: 600; color: #FFFFFF;">Warm regards,</span><br>
      <span style="color: #09937F;">The ishoot Production Team</span>
    </div>
  `;
  return renderBrandEmailLayout('Thank you for contacting ishoot', content, false);
}

// 2. Internal Team Notification Template
export function createInquiryNotificationEmail(inquiry: {
  fullName: string;
  email: string;
  phone?: string;
  company?: string;
  services: string[];
  budget?: string;
  message?: string;
}): string {
  const serviceList = inquiry.services.map((s) => `<li>${s}</li>`).join('');

  const content = `
    <div style="display: inline-block; background-color: rgba(9, 147, 127, 0.15); border: 1px solid #09937F; color: #09937F; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 999px; text-transform: uppercase; margin-bottom: 16px;">
      New Lead Received
    </div>
    <h2 style="color: #FFFFFF; font-size: 22px; margin-top: 0;">${inquiry.fullName} is requesting to collaborate</h2>
    
    <table width="100%" border="0" cellspacing="0" cellpadding="8" style="background-color: #111C19; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.08); font-size: 14px; margin: 20px 0;">
      <tr>
        <td width="140" style="color: #9EADA9;">Full Name:</td>
        <td style="color: #FFFFFF; font-weight: 600;">${inquiry.fullName}</td>
      </tr>
      <tr>
        <td style="color: #9EADA9;">Email:</td>
        <td><a href="mailto:${inquiry.email}" style="color: #09937F; text-decoration: none;">${inquiry.email}</a></td>
      </tr>
      <tr>
        <td style="color: #9EADA9;">Phone:</td>
        <td><a href="tel:${inquiry.phone || ''}" style="color: #09937F; text-decoration: none;">${inquiry.phone || 'Not specified'}</a></td>
      </tr>
      <tr>
        <td style="color: #9EADA9;">Company:</td>
        <td style="color: #FFFFFF;">${inquiry.company || 'Direct / Individual'}</td>
      </tr>
      <tr>
        <td style="color: #9EADA9;">Anticipated Budget:</td>
        <td style="color: #09937F; font-weight: 600;">${inquiry.budget || 'To be discussed'}</td>
      </tr>
      <tr>
        <td valign="top" style="color: #9EADA9;">Services:</td>
        <td style="color: #FFFFFF;"><ul style="margin: 0; padding-left: 18px;">${serviceList}</ul></td>
      </tr>
    </table>

    <div style="font-size: 13px; font-weight: 600; color: #9EADA9; margin-bottom: 8px;">Project Brief:</div>
    <div style="background-color: #050807; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 16px; font-size: 14px; color: #F2F6F5; white-space: pre-wrap;">
      ${inquiry.message || 'No additional message provided.'}
    </div>
  `;
  return renderBrandEmailLayout(`🔔 New Inquiry: ${inquiry.fullName}`, content, false);
}

// 3. Invoice Delivery Email Template
export function createInvoiceDeliveryEmail(params: {
  clientName: string;
  invoiceNumber: string;
  totalAmountFormatted: string;
  dueDate: string;
  bankName: string;
  bankIban: string;
  locale?: 'en' | 'ar';
}): string {
  const isAr = params.locale === 'ar';

  if (isAr) {
    const content = `
      <h2 style="color: #FFFFFF; font-size: 22px; margin-top: 0;">عزيزنا ${params.clientName}،</h2>
      <p style="font-size: 15px; color: #9EADA9;">
        نرفق لكم طيه الفاتورة رقم <strong>${params.invoiceNumber}</strong> الخاصة بالمشروع الإنتاجي المعتمد.
      </p>

      <div style="background-color: #111C19; border: 1px solid rgba(9, 147, 127, 0.25); border-radius: 12px; padding: 24px; margin: 24px 0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 14px;">
          <tr>
            <td style="color: #9EADA9;">رقم الفاتورة:</td>
            <td style="color: #FFFFFF; font-weight: 600;">${params.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="color: #9EADA9;">تاريخ الاستحقاق:</td>
            <td style="color: #FFFFFF;">${params.dueDate}</td>
          </tr>
          <tr>
            <td style="color: #9EADA9; font-size: 16px; padding-top: 12px;">المبلغ المطلوب سداده:</td>
            <td style="color: #09937F; font-size: 20px; font-weight: 700; padding-top: 12px;">${params.totalAmountFormatted}</td>
          </tr>
        </table>

        <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); margin-top: 16px; padding-top: 16px; font-size: 13px;">
          <div style="font-weight: 600; color: #FFFFFF; margin-bottom: 6px;">بيانات التحويل البنكي:</div>
          <div style="color: #9EADA9;">البنك: ${params.bankName}</div>
          <div style="color: #9EADA9;">الآيبان: <span style="color: #FFFFFF; font-family: monospace;">${params.bankIban}</span></div>
        </div>
      </div>

      <p style="font-size: 14px; color: #9EADA9;">
        تجدون نسخة الفاتورة الرسمية بصيغة PDF مرفقة مع هذا البريد الإلكتروني.
      </p>
    `;
    return renderBrandEmailLayout(`فاتورة رقم ${params.invoiceNumber} من آي شوت`, content, true);
  }

  const content = `
    <h2 style="color: #FFFFFF; font-size: 22px; margin-top: 0;">Dear ${params.clientName},</h2>
    <p style="font-size: 15px; color: #9EADA9;">
      Please find attached official invoice <strong>${params.invoiceNumber}</strong> for your production project.
    </p>

    <div style="background-color: #111C19; border: 1px solid rgba(9, 147, 127, 0.25); border-radius: 12px; padding: 24px; margin: 24px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 14px;">
        <tr>
          <td style="color: #9EADA9;">Invoice Number:</td>
          <td style="color: #FFFFFF; font-weight: 600;">${params.invoiceNumber}</td>
        </tr>
        <tr>
          <td style="color: #9EADA9;">Payment Due Date:</td>
          <td style="color: #FFFFFF;">${params.dueDate}</td>
        </tr>
        <tr>
          <td style="color: #9EADA9; font-size: 16px; padding-top: 12px;">Amount Due:</td>
          <td style="color: #09937F; font-size: 20px; font-weight: 700; padding-top: 12px;">${params.totalAmountFormatted}</td>
        </tr>
      </table>

      <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); margin-top: 16px; padding-top: 16px; font-size: 13px;">
        <div style="font-weight: 600; color: #FFFFFF; margin-bottom: 6px;">Bank Transfer Details:</div>
        <div style="color: #9EADA9;">Bank: ${params.bankName}</div>
        <div style="color: #9EADA9;">IBAN: <span style="color: #FFFFFF; font-family: monospace;">${params.bankIban}</span></div>
      </div>
    </div>

    <p style="font-size: 14px; color: #9EADA9;">
      The complete printable PDF document is attached to this email.
    </p>
  `;
  return renderBrandEmailLayout(`Invoice ${params.invoiceNumber} from ishoot`, content, false);
}

// 4. Payment Receipt Email Template
export function createPaymentReceiptEmail(params: {
  clientName: string;
  receiptNumber: string;
  invoiceNumber: string;
  amountReceivedFormatted: string;
  remainingDueFormatted: string;
  paymentMethod: string;
  isPaidInFull: boolean;
  locale?: 'en' | 'ar';
}): string {
  const isAr = params.locale === 'ar';

  if (isAr) {
    const content = `
      <div style="display: inline-block; background-color: rgba(16, 185, 129, 0.15); border: 1px solid #10B981; color: #10B981; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 999px; text-transform: uppercase; margin-bottom: 16px;">
        ${params.isPaidInFull ? 'تم سداد الفاتورة بالكامل' : 'استلام دفعة جزئية'}
      </div>
      <h2 style="color: #FFFFFF; font-size: 22px; margin-top: 0;">تأكيد استلام الدفعة</h2>
      <p style="font-size: 15px; color: #9EADA9;">
        عزيزنا ${params.clientName}، نؤكد لكم استلام الدفعة المالية الموضحة أدناه للفاتورة رقم <strong>${params.invoiceNumber}</strong>.
      </p>

      <div style="background-color: #111C19; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 24px; margin: 24px 0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 14px;">
          <tr>
            <td style="color: #9EADA9;">رقم الإيصال:</td>
            <td style="color: #FFFFFF; font-weight: 600;">${params.receiptNumber}</td>
          </tr>
          <tr>
            <td style="color: #9EADA9;">طريقة الدفع:</td>
            <td style="color: #FFFFFF;">${params.paymentMethod}</td>
          </tr>
          <tr>
            <td style="color: #9EADA9; font-size: 16px; padding-top: 12px;">المبلغ المستلم:</td>
            <td style="color: #10B981; font-size: 20px; font-weight: 700; padding-top: 12px;">${params.amountReceivedFormatted}</td>
          </tr>
          <tr>
            <td style="color: #9EADA9;">المتبقي على الفاتورة:</td>
            <td style="color: #F2F6F5; font-weight: 600;">${params.remainingDueFormatted}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 14px; color: #9EADA9;">
        تجدون إيصال الاستلام الرسمي بصيغة PDF مرفقاً مع هذه الرسالة.
      </p>
    `;
    return renderBrandEmailLayout(`إيصال استلام دفعة ${params.receiptNumber} — آي شوت`, content, true);
  }

  const content = `
    <div style="display: inline-block; background-color: rgba(16, 185, 129, 0.15); border: 1px solid #10B981; color: #10B981; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 999px; text-transform: uppercase; margin-bottom: 16px;">
      ${params.isPaidInFull ? 'Paid in Full' : 'Partial Payment Received'}
    </div>
    <h2 style="color: #FFFFFF; font-size: 22px; margin-top: 0;">Payment Receipt Confirmation</h2>
    <p style="font-size: 15px; color: #9EADA9;">
      Dear ${params.clientName}, we confirm receipt of your payment for invoice <strong>${params.invoiceNumber}</strong>.
    </p>

    <div style="background-color: #111C19; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 24px; margin: 24px 0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 14px;">
        <tr>
          <td style="color: #9EADA9;">Receipt Number:</td>
          <td style="color: #FFFFFF; font-weight: 600;">${params.receiptNumber}</td>
        </tr>
        <tr>
          <td style="color: #9EADA9;">Payment Method:</td>
          <td style="color: #FFFFFF;">${params.paymentMethod}</td>
        </tr>
        <tr>
          <td style="color: #9EADA9; font-size: 16px; padding-top: 12px;">Amount Received:</td>
          <td style="color: #10B981; font-size: 20px; font-weight: 700; padding-top: 12px;">${params.amountReceivedFormatted}</td>
        </tr>
        <tr>
          <td style="color: #9EADA9;">Remaining Balance:</td>
          <td style="color: #F2F6F5; font-weight: 600;">${params.remainingDueFormatted}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 14px; color: #9EADA9;">
      Your formal payment receipt document is attached to this email.
    </p>
  `;
  return renderBrandEmailLayout(`Payment Receipt ${params.receiptNumber} — ishoot`, content, false);
}
