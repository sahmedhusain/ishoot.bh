import { isValidEmail } from "../constants/validation";
import {
  formatMessage,
  getTranslations,
  serverMessages,
} from "@platform/locales";
import { listTableRows, upsertTableRow } from "../api/tables";
import { getMessageStatus, queueMessage } from "@platform/api-client";
import { resolveIncomingLead } from "../services/lead-resolver";
import { getCompanyConfiguration } from "../api/company";

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

export async function getServiceSettings() {
  const rows = await listTableRows<any>("system", "service_settings").catch(() => []);
  let s = rows.find((r) => r.id === "default") || null;
  if (!s) {
    s = await upsertTableRow("system", "service_settings", { id: "default" }).catch(() => null);
  }
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
  const rows = await listTableRows<any>("system", "service_settings").catch(() => []);
  const existing = rows.find((r) => r.id === "default");
  await upsertTableRow("system", "service_settings", { ...(existing || {}), id: "default", ...data });
}

export async function listCannedReplies(activeOnly = false) {
  const allRows = await listTableRows<any>("system", "canned_reply", "sort_order ASC, title ASC");
  const rows = activeOnly ? allRows.filter((r) => r.isActive) : allRows;
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body_en: r.bodyEn,
    body_ar: r.bodyAr,
    is_active: !!r.isActive,
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
  const rows = input.id ? await listTableRows<any>("system", "canned_reply").catch(() => []) : [];
  const existing = input.id ? rows.find((r) => r.id === input.id) : null;
  return upsertTableRow("system", "canned_reply", {
    ...(existing || {}),
    id: input.id || crypto.randomUUID(),
    ...data,
  });
}

async function notRefused(id: string, waitMs = 5000) {
  for (let waited = 0; waited <= waitMs; waited += 500) {
    const message = await getMessageStatus(id).catch(() => null);
    if (message?.status === "sent") return true;
    if (message?.status === "failed") return false;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return true;
}

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
  const inquiries = await listTableRows<any>("sales", "inquiry");
  const request = inquiries.find((r) => r.id === inquiryId);
  if (!request) throw new Error(serverMessages.requestNotFound);
  let whatsappLink: string | null = null;
  if (input.channel === "email") {
    if (!request.email || !isValidEmail(request.email))
      throw new Error(serverMessages.serviceReplyNoEmail);
    const company = await getCompanyConfiguration().catch(() => null);
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
  const comment = await upsertTableRow<any>("system", "request_comment", {
    id: crypto.randomUUID(),
    inquiryId,
    authorId: author.id,
    body,
    isClientVisible: true,
    channel: input.channel,
  });
  if (request.workflowStatus === "received")
    await upsertTableRow("sales", "inquiry", {
      ...request,
      id: inquiryId,
      workflowStatus: "under_review",
      status: "contacted",
    });
  return { commentId: comment.id, whatsappLink };
}

export async function requestReplies(inquiryId: string) {
  const [allRows, users] = await Promise.all([
    listTableRows<any>("system", "request_comment", "created_at ASC"),
    listTableRows<any>("identity", "user").catch(() => []),
  ]);
  const userMap = new Map<string, any>(users.map((u): [any, any] => [u.id, u]));
  const rows = allRows.filter((r) => r.inquiryId === inquiryId && r.isClientVisible);
  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    channel: r.channel ?? "",
    author: userMap.get(r.authorId)?.fullName ?? "",
    at: new Date(r.createdAt || Date.now()).toISOString(),
  }));
}

export async function createOrderHelpRequest(
  customer: { id: string; name: string; email: string; phone: string },
  input: {
    orderId: string;
    kind: "question" | "problem";
    message: string;
    locale: string;
  },
) {
  const orders = await listTableRows<any>("commerce", "sales_order");
  const order = orders.find((o) => o.id === input.orderId && o.customerId === customer.id);
  if (!order) throw new Error(serverMessages.requestNotFound);
  const message = input.message.trim().slice(0, 5000);
  if (message.length < 5) throw new Error(serverMessages.serviceReplyEmpty);
  return resolveIncomingLead({
    name: customer.name,
    email: customer.email,
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

export async function requestsForOrder(orderId: string) {
  const allRows = await listTableRows<any>("sales", "inquiry", "created_at DESC");
  const rows = allRows.filter((r) => r.orderId === orderId).slice(0, 20);
  return rows.map((r) => ({
    id: r.id,
    reference: r.reference,
    intent: r.intent,
    status: r.workflowStatus,
    created_at: new Date(r.createdAt || Date.now()).toISOString(),
  }));
}
