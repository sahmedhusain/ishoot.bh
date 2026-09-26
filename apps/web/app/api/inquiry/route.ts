import { NextRequest, NextResponse } from 'next/server';
import { createInquiry } from '@ishoot/database';
import {
  sendEmail,
  createInquiryConfirmationEmail,
  createInquiryNotificationEmail,
} from '@ishoot/email';

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
      locale = 'en',
    } = body;

    if (!fullName || !email || !message) {
      return NextResponse.json(
        { error: 'Full name, email, and message are required.' },
        { status: 400 }
      );
    }

    // 1. Record inquiry in database
    const inquiry = await createInquiry({
      full_name: fullName,
      email,
      phone,
      company,
      services_requested: services,
      budget_range: budget,
      target_timeline: timeline,
      message,
      locale,
    });

    // 2. Dispatch Dual-Email notifications asynchronously
    // A: Confirmation email to client
    const clientHtml = createInquiryConfirmationEmail(fullName, services, locale);
    const clientSubject =
      locale === 'ar'
        ? 'شكراً لتواصلك مع آي شوت | ishoot'
        : 'Thank you for contacting ishoot';

    await sendEmail({
      to: email,
      subject: clientSubject,
      html: clientHtml,
    });

    // B: Internal notification to ishoot team
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
      to: 'hello@ishoot.bh',
      subject: `🔔 New Inquiry: ${fullName} — ${services[0] || 'Production'}`,
      html: teamHtml,
    });

    return NextResponse.json({
      success: true,
      inquiryId: inquiry.id,
      message: 'Inquiry received and notifications dispatched.',
    });
  } catch (error) {
    console.error('Inquiry API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing inquiry.' },
      { status: 500 }
    );
  }
}
