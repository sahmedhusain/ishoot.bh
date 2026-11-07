import { serverMessages } from "@platform/locales";

import { NextResponse } from "next/server";
import {
  syncDueSocialIntegrations,
  expireOnlinePayments,
  remindDueTasks,
  remindLegalDates,
  sendBroadcastBatch,
  syncAgencyTracking,
  processEmailJobs,
  processRevalidationJobs,
  markOverdueInvoices,
  sendExpiryReminders,
  processRecurringExpenses,
} from "@platform/database";
import { sendEmail } from "@platform/email";
import { deliverReportSchedules } from "../../../lib/report-delivery";
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json(
      { error: serverMessages.unauthorized },
      { status: 401 },
    );
  try {
    // The notify service sends them (through the provider IT set up) and retries; this hands the queued jobs over.
    await processEmailJobs(sendEmail);
    if (process.env.WEB_URL && process.env.REVALIDATION_SECRET)
      await processRevalidationJobs({
        webUrl: process.env.WEB_URL,
        secret: process.env.REVALIDATION_SECRET,
      });

    const invoicesMarkedOverdue = await markOverdueInvoices();
    const expiryReminders = await sendExpiryReminders();
    const recurringExpenses = await processRecurringExpenses();
    const socialSync = await syncDueSocialIntegrations();
    const onlinePayments = await expireOnlinePayments();
    const courierTracking = await syncAgencyTracking();
    const taskReminders = await remindDueTasks();
    const legalReminders = await remindLegalDates();
    // Marketing e-mail goes out in batches, each with an unsubscribe link back to the website.
    const broadcastsSent = process.env.WEB_URL
      ? await sendBroadcastBatch(
          async (message) =>
            (await sendEmail(message).catch(() => null))?.success === true,
          process.env.WEB_URL,
        )
      : 0;
    const reportsSent = await deliverReportSchedules();
    return NextResponse.json({
      success: true,
      invoicesMarkedOverdue,
      expiryReminders,
      recurringExpenses,
      socialSync,
      onlinePayments,
      courierTracking,
      taskReminders,
      legalReminders,
      broadcastsSent,
      reportsSent,
    });
  } catch {
    console.error("Scheduled maintenance failed");
    return NextResponse.json(
      { error: serverMessages.runtimeMaintenanceFailed },
      { status: 500 },
    );
  }
}
