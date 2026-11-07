import { isValidEmail } from "../constants/validation";
import {
  formatMessage,
  getTranslations,
  serverMessages,
} from "@platform/locales";
import { db } from "../atomic";
import { getMessageStatus, queueMessage } from "@platform/api-client";
import { resolveIncomingLead } from "../services/lead-resolver";

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

// ─── Settings ────────────────────────────────────────────────────────────────────────────────────────────────────

export async function getServiceSettings() {
  const s = await db.serviceSettings
    .upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    })
    .catch(() => null);
  return {
    sla_urgent_hours: s?.slaUrgentHours ?? 4,
    sla_high_hours: s?.slaHighHours ?? 24,
    sla_normal_hours: s?.slaNormalHours ?? 72,
  };
}
export type ServiceSettingsRecord = Awaited<
  ReturnType<typeof getServiceSettings>
>;

export async function saveServiceSettings(input: {
  urgent: string;
  high: string;
  normal: string;
}) {
  const hours = (text: string, max: number) => {
    const value = Number(text);
    if (!Number.isInteger(value) || value < 1 || value > max)
      throw new Error(serverMessages.serviceSlaInvalid);
    return value;
  };
  const data = {
    slaUrgentHours: hours(input.urgent, 720),
    slaHighHours: hours(input.high, 720),
    slaNormalHours: hours(input.normal, 2160),
  };
  await db.serviceSettings.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });
}

// ─── Canned replies ──────────────────────────────────────────────────────────────────────────────────────────────

export async function listCannedReplies(activeOnly = false) {
  const rows = await db.cannedReply.findMany({
    where: activeOnly ? { isActive: true } : {},
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body_en: r.bodyEn,
    body_ar: r.bodyAr,
    is_active: r.isActive,
  }));
}
export type CannedReplyRecord = Awaited<
  ReturnType<typeof listCannedReplies>
>[number];

export interface CannedReplyInput {
  id?: string;
  title: string;
  bodyEn: string;
  bodyAr: string;
  isActive: boolean;
}

export async function saveCannedReply(input: CannedReplyInput) {
  const title = input.title.trim().slice(0, 120);
  const bodyEn = input.bodyEn.trim().slice(0, 4000);
  const bodyAr = input.bodyAr.trim().slice(0, 4000);
  if (!title || (!bodyEn && !bodyAr))
    throw new Error(serverMessages.cannedReplyInvalid);
  const data = {
    title,
    bodyEn: bodyEn || bodyAr,
    bodyAr: bodyAr || bodyEn,
    isActive: input.isActive,
  };
  return input.id
    ? db.cannedReply.update({ where: { id: input.id }, data })
    : db.cannedReply.create({ data });
}

/**
 * Whether notify has not refused a message within a few seconds. A refusal comes quickly (the provider answers at
 * once); a message still queued after that is on its way, and IT sees how it ends.
 */
async function notRefused(id: string, waitMs = 5000) {
  for (let waited = 0; waited <= waitMs; waited += 500) {
    const message = await getMessageStatus(id).catch(() => null);
    if (message?.status === "sent") return true;
    if (message?.status === "failed") return false;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return true;
}

// ─── Replying to the customer ────────────────────────────────────────────────────────────────────────────────────

/**
 * Replies to the person who raised a request, then keeps the reply on the request as a customer-visible comment
 * and moves the request out of "received". E-mail goes out through `sendEmail` (passed in by the app, which owns
 * the mailer) before anything is recorded; WhatsApp goes through the notify service, and when it refuses the message
 * (no WhatsApp integration, or outside WhatsApp's 24-hour window) a wa.me link comes back for the agent to send it by
 * hand.
 */
export async function replyToRequest(
  inquiryId: string,
  input: { channel: "email" | "whatsapp"; body: string },
  author: { id: string },
  sendEmail: (message: {
    to: string;
    subject: string;
    html: string;
    idempotencyKey: string;
  }) => Promise<boolean>,
) {
  const body = input.body.trim().slice(0, 4000);
  if (!body) throw new Error(serverMessages.serviceReplyEmpty);
  const request = await db.inquiry.findUnique({
    where: { id: inquiryId },
    select: {
      id: true,
      reference: true,
      email: true,
      phone: true,
      phoneE164: true,
      locale: true,
      name: true,
      workflowStatus: true,
    },
  });
  if (!request) throw new Error(serverMessages.requestNotFound);
  let whatsappLink: string | null = null;
  if (input.channel === "email") {
    if (!request.email || !isValidEmail(request.email))
      throw new Error(serverMessages.serviceReplyNoEmail);
    const company = await db.companySetting.findFirst({
      select: { companyNameEn: true, companyNameAr: true },
    });
    const locale = request.locale === "en" ? "en" : "ar";
    const copy = getTranslations(locale).admin.serviceDesk.email;
    const companyName =
      (locale === "ar" ? company?.companyNameAr : company?.companyNameEn) ?? "";
    const sent = await sendEmail({
      to: request.email,
      subject: formatMessage(copy.subject, {
        reference: request.reference,
        company: companyName,
      }).slice(0, 200),
      html: `<div dir="${locale === "ar" ? "rtl" : "ltr"}"><p>${escape(formatMessage(copy.greeting, { name: request.name }))}</p><p style="white-space:pre-line">${escape(body)}</p><p>${escape(companyName)}</p><p style="color:#64748b;font-size:12px">${escape(request.reference)}</p></div>`,
      idempotencyKey: `request_reply:${request.id}:${Date.now()}`,
    });
    if (!sent) throw new Error(serverMessages.serviceReplyNotSent);
  } else {
    const to = (request.phoneE164 || request.phone || "").replace(/[^\d]/g, "");
    if (to.length < 8) throw new Error(serverMessages.serviceReplyNoPhone);
    const delivered = await queueMessage({
      channel: "whatsapp",
      to,
      text: body,
      idempotencyKey: `request_reply:${request.id}:${Date.now()}`,
      actorId: author.id,
    }).then(
      (queued) => notRefused(queued.id),
      () => false,
    );
    if (!delivered)
      whatsappLink = `https://wa.me/${to}?text=${encodeURIComponent(body)}`;
  }
  const comment = await db.requestComment.create({
    data: {
      inquiryId,
      authorId: author.id,
      body,
      isClientVisible: true,
      channel: input.channel,
    },
  });
  if (request.workflowStatus === "received")
    await db.inquiry.update({
      where: { id: inquiryId },
      data: { workflowStatus: "under_review", status: "contacted" },
    });
  return { commentId: comment.id, whatsappLink };
}

/** Replies already sent to the customer on a request, newest last. */
export async function requestReplies(inquiryId: string) {
  const rows = await db.requestComment.findMany({
    where: { inquiryId, isClientVisible: true },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { fullName: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    channel: r.channel ?? "",
    author: r.author.fullName,
    at: r.createdAt.toISOString(),
  }));
}

// ─── Requests about orders ───────────────────────────────────────────────────────────────────────────────────────

/** A signed-in customer asks about one of their orders: a question, or a problem (a complaint, high priority). */
export async function createOrderHelpRequest(
  customer: { id: string; name: string; email: string; phone: string },
  input: {
    orderId: string;
    kind: "question" | "problem";
    message: string;
    locale: string;
  },
) {
  const order = await db.salesOrder.findFirst({
    where: { id: input.orderId, customerId: customer.id },
    select: { id: true, number: true, phone: true },
  });
  if (!order) throw new Error(serverMessages.requestNotFound);
  const message = input.message.trim().slice(0, 5000);
  if (message.length < 5) throw new Error(serverMessages.serviceReplyEmpty);
  return resolveIncomingLead({
    name: customer.name,
    email: customer.email,
    // The phone on the order reaches them when their profile has none.
    phone: customer.phone || order.phone || undefined,
    message: `${order.number}\n\n${message}`,
    source: "website",
    locale: input.locale,
    intent: input.kind === "problem" ? "complaint" : "inquiry",
    priority: input.kind === "problem" ? "high" : "normal",
    orderId: order.id,
    projectReference: order.number,
  });
}

/** The requests raised about an order, for the order page. */
export async function requestsForOrder(orderId: string) {
  const rows = await db.inquiry.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      reference: true,
      intent: true,
      workflowStatus: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    reference: r.reference,
    intent: r.intent,
    status: r.workflowStatus,
    created_at: r.createdAt.toISOString(),
  }));
}
