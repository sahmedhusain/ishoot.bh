import { serverMessages } from "@platform/locales";

import { NextResponse } from "next/server";
import { db, processEmailJobs, processRevalidationJobs, removeExpiredUploads, markOverdueInvoices, sendExpiryReminders, processRecurringExpenses } from "@platform/database";
import { sendEmail } from "@platform/email";
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: serverMessages.unauthorized }, { status: 401 });
  try {
    if (process.env.RESEND_API_KEY && process.env.FROM_EMAIL) await processEmailJobs(sendEmail);
    if (process.env.WEB_URL && process.env.REVALIDATION_SECRET)
      await processRevalidationJobs({ webUrl: process.env.WEB_URL, secret: process.env.REVALIDATION_SECRET });
    const removedUploads = await removeExpiredUploads();
    await db.abuseWindow.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86400000) } } });
    await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    const invoicesMarkedOverdue = await markOverdueInvoices();
    const expiryReminders = await sendExpiryReminders();
    const recurringExpenses = await processRecurringExpenses();
    return NextResponse.json({ success: true, removedUploads, invoicesMarkedOverdue, expiryReminders, recurringExpenses });
  } catch {
    console.error("Scheduled maintenance failed");
    return NextResponse.json({ error: serverMessages.runtimeMaintenanceFailed }, { status: 500 });
  }
}
