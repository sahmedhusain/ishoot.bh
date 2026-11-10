import { isValidEmail } from "../constants/validation";
import crypto from "node:crypto";
import { Database } from "@platform/database/decimal";
import { getTranslations, serverMessages } from "@platform/locales";
import { db } from "../atomic";
import {
  CAMPAIGN_CHANNELS,
  CAMPAIGN_STATUSES,
  campaignReturn,
  isUtmSlug,
  matchesSegment,
  utmSlug,
  type SegmentRules,
} from "../constants/outreach";
import { getNextSequenceNumber } from "./sequence";

const num = (value: { toString(): string } | null | undefined) =>
  value == null ? 0 : Number(value.toString());
const round3 = (value: number) => Math.round(value * 1000) / 1000;
const dateOnly = (value: Date | null) =>
  value ? value.toISOString().slice(0, 10) : null;
const parseDate = (text: string) => {
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text))
    throw new Error(serverMessages.campaignInvalid);
  return new Date(`${text}T00:00:00Z`);
};

async function campaignResults(
  campaigns: { utmCampaign: string; couponCode: string | null }[],
) {
  if (!campaigns.length)
    return new Map<
      string,
      { orders: number; revenue: number; requests: number }
    >();
  const keys = campaigns.map((c) => c.utmCampaign);
  const coupons = campaigns
    .map((c) => c.couponCode)
    .filter((c): c is string => !!c);
  const [orders, requests] = await Promise.all([
    db.salesOrder.findMany({
      where: {
        status: { notIn: ["cancelled"] },
        OR: [
          { utmCampaign: { in: keys } },
          ...(coupons.length ? [{ couponCode: { in: coupons } }] : []),
        ],
      },
      select: { utmCampaign: true, couponCode: true, total: true },
    }),
    db.inquiry.groupBy({
      by: ["utmCampaign"],
      where: { utmCampaign: { in: keys } },
      _count: { _all: true },
    }),
  ]);
  const results = new Map(
    campaigns.map((c) => [
      c.utmCampaign,
      { orders: 0, revenue: 0, requests: 0 },
    ]),
  );
  for (const o of orders) {
    const campaign =
      campaigns.find((c) => c.utmCampaign === o.utmCampaign) ??
      campaigns.find((c) => c.couponCode && c.couponCode === o.couponCode);
    if (!campaign) continue;
    const r = results.get(campaign.utmCampaign)!;
    r.orders += 1;
    r.revenue = round3(r.revenue + num(o.total));
  }
  for (const q of requests)
    if (q.utmCampaign && results.has(q.utmCampaign))
      results.get(q.utmCampaign)!.requests = q._count._all;
  return results;
}

export async function listCampaigns() {
  const rows = await db.campaign.findMany({
    orderBy: [
      { status: "asc" },
      { startDate: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    take: 200,
  });
  const results = await campaignResults(rows);
  return rows.map((c) => {
    const r = results.get(c.utmCampaign) ?? {
      orders: 0,
      revenue: 0,
      requests: 0,
    };
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      channel: c.channel,
      status: c.status,
      start_date: dateOnly(c.startDate),
      end_date: dateOnly(c.endDate),
      budget: num(c.budget),
      spend: num(c.spend),
      utm_campaign: c.utmCampaign,
      coupon_code: c.couponCode ?? "",
      notes: c.notes ?? "",
      owner_id: c.ownerId ?? "",
      ...r,
      return_on_spend: campaignReturn(r.revenue, num(c.spend)),
    };
  });
}
export type CampaignRow = Awaited<ReturnType<typeof listCampaigns>>[number];

export interface CampaignInput {
  id?: string;
  name: string;
  channel: string;
  status: string;
  startDate: string;
  endDate: string;
  budget: string;
  spend: string;
  utmCampaign: string;
  couponCode: string;
  notes: string;
  ownerId?: string;
}

export async function saveCampaign(input: CampaignInput, userId: string) {
  const name = input.name.trim().slice(0, 160);
  const money = (text: string) => {
    const value = Number(text || 0);
    if (!Number.isFinite(value) || value < 0 || value > 999_999_999)
      throw new Error(serverMessages.campaignInvalid);
    return round3(value);
  };
  if (
    !name ||
    !(CAMPAIGN_CHANNELS as readonly string[]).includes(input.channel) ||
    !(CAMPAIGN_STATUSES as readonly string[]).includes(input.status)
  )
    throw new Error(serverMessages.campaignInvalid);
  const utm = (input.utmCampaign.trim().toLowerCase() || utmSlug(name)).slice(
    0,
    60,
  );
  if (!isUtmSlug(utm)) throw new Error(serverMessages.campaignUtmInvalid);
  const clash = await db.campaign.findFirst({
    where: { utmCampaign: utm, ...(input.id ? { id: { not: input.id } } : {}) },
    select: { id: true },
  });
  if (clash) throw new Error(serverMessages.campaignUtmTaken);
  const startDate = parseDate(input.startDate);
  const endDate = parseDate(input.endDate);
  if (startDate && endDate && startDate > endDate)
    throw new Error(serverMessages.taskDatesInvalid);
  const couponCode = input.couponCode.trim().toUpperCase().slice(0, 30) || null;
  const data = {
    name,
    channel: input.channel,
    status: input.status,
    startDate,
    endDate,
    budget: money(input.budget),
    spend: money(input.spend),
    utmCampaign: utm,
    couponCode,
    notes: input.notes.trim().slice(0, 5000) || null,
    ownerId: input.ownerId || null,
  };
  if (input.id) return db.campaign.update({ where: { id: input.id }, data });
  return db.campaign.create({
    data: {
      ...data,
      code: await getNextSequenceNumber("MKT"),
      createdById: userId,
    },
  });
}

function readRules(value: Database.JsonValue): SegmentRules {
  const v = (
    value && typeof value === "object" && !Array.isArray(value) ? value : {}
  ) as Record<string, unknown>;
  const n = (key: string) =>
    typeof v[key] === "number" && Number.isFinite(v[key])
      ? (v[key] as number)
      : undefined;
  return {
    minOrders: n("minOrders"),
    minSpent: n("minSpent"),
    orderedWithinDays: n("orderedWithinDays"),
    notOrderedForDays: n("notOrderedForDays"),
    city: typeof v.city === "string" && v.city ? v.city : undefined,
  };
}

async function segmentMembers(rules: SegmentRules, now = new Date()) {
  const customers = await db.customer.findMany({
    select: {
      id: true,
      email: true,
      locale: true,
      marketingOptIn: true,
      addresses: { select: { city: true } },
      orders: {
        where: { status: { not: "cancelled" } },
        select: { total: true, placedAt: true, shippingAddress: true },
      },
    },
  });
  return customers.filter((c) => {
    const cities = [
      ...c.addresses.map((a) => a.city),
      ...c.orders.map((o) =>
        String((o.shippingAddress as { city?: string } | null)?.city ?? ""),
      ),
    ].filter(Boolean);
    const lastOrderAt: Date | null = (c.orders || []).reduce(
      (latest: any, o: any) => (!latest || o.placedAt > latest ? o.placedAt : latest),
      null,
    );
    return matchesSegment(
      rules,
      {
        orders: c.orders.length,
        spent: c.orders.reduce((sum, o) => sum + num(o.total), 0),
        lastOrderAt,
        cities,
      },
      now,
    );
  });
}

export async function listSegments() {
  const rows = await db.customerSegment.findMany({ orderBy: { name: "asc" } });
  return Promise.all(
    rows.map(async (s) => {
      const rules = readRules(s.rules);
      const members = await segmentMembers(rules);
      return {
        id: s.id,
        name: s.name,
        rules,
        size: members.length,
        reachable: members.filter((m) => m.marketingOptIn).length,
      };
    }),
  );
}
export type SegmentRow = Awaited<ReturnType<typeof listSegments>>[number];

export interface SegmentInput {
  id?: string;
  name: string;
  minOrders: string;
  minSpent: string;
  orderedWithinDays: string;
  notOrderedForDays: string;
  city: string;
}

export async function saveSegment(input: SegmentInput) {
  const name = input.name.trim().slice(0, 120);
  if (!name) throw new Error(serverMessages.segmentInvalid);
  const whole = (text: string) => {
    if (!text.trim()) return undefined;
    const value = Number(text);
    if (!Number.isFinite(value) || value < 0 || value > 1_000_000)
      throw new Error(serverMessages.segmentInvalid);
    return value;
  };
  const rules: SegmentRules = {
    minOrders: whole(input.minOrders),
    minSpent: whole(input.minSpent),
    orderedWithinDays: whole(input.orderedWithinDays),
    notOrderedForDays: whole(input.notOrderedForDays),
    city: input.city.trim().slice(0, 80) || undefined,
  };
  const stored = JSON.parse(JSON.stringify(rules)) as Database.InputJsonObject;
  return input.id
    ? db.customerSegment.update({
        where: { id: input.id },
        data: { name, rules: stored },
      })
    : db.customerSegment.create({ data: { name, rules: stored } });
}

export async function listBroadcasts() {
  const rows = await db.broadcast.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      segment: { select: { name: true } },
      campaign: { select: { name: true } },
    },
  });
  const counts = rows.length
    ? await db.broadcastRecipient.groupBy({
        by: ["broadcastId", "status"],
        where: { broadcastId: { in: rows.map((r) => r.id) } },
        _count: { _all: true },
      })
    : [];
  return rows.map((b) => {
    const of = (status: string) =>
      counts.find((c) => c.broadcastId === b.id && c.status === status)?._count
        ._all ?? 0;
    return {
      id: b.id,
      name: b.name,
      status: b.status,
      segment: b.segment?.name ?? "",
      segment_id: b.segmentId ?? "",
      campaign: b.campaign?.name ?? "",
      campaign_id: b.campaignId ?? "",
      subject_en: b.subjectEn,
      subject_ar: b.subjectAr,
      body_en: b.bodyEn,
      body_ar: b.bodyAr,
      pending: of("pending"),
      sent: of("sent"),
      failed: of("failed"),
      sent_at: b.sentAt?.toISOString() ?? null,
    };
  });
}
export type BroadcastRow = Awaited<ReturnType<typeof listBroadcasts>>[number];

export interface BroadcastInput {
  id?: string;
  name: string;
  segmentId: string;
  campaignId?: string;
  subjectEn: string;
  subjectAr: string;
  bodyEn: string;
  bodyAr: string;
}

export async function saveBroadcast(input: BroadcastInput, userId: string) {
  const name = input.name.trim().slice(0, 120);
  const subjectEn = input.subjectEn.trim().slice(0, 200);
  const subjectAr = input.subjectAr.trim().slice(0, 200);
  const bodyEn = input.bodyEn.trim().slice(0, 20000);
  const bodyAr = input.bodyAr.trim().slice(0, 20000);
  if (
    !name ||
    !input.segmentId ||
    (!subjectEn && !subjectAr) ||
    (!bodyEn && !bodyAr)
  )
    throw new Error(serverMessages.broadcastInvalid);
  const data = {
    name,
    segmentId: input.segmentId,
    campaignId: input.campaignId || null,
    subjectEn: subjectEn || subjectAr,
    subjectAr: subjectAr || subjectEn,
    bodyEn: bodyEn || bodyAr,
    bodyAr: bodyAr || bodyEn,
  };
  if (input.id) {
    const updated = await db.broadcast.updateMany({
      where: { id: input.id, status: "draft" },
      data,
    });
    if (!updated.count) throw new Error(serverMessages.broadcastAlreadySent);
    return { id: input.id };
  }
  return db.broadcast.create({ data: { ...data, createdById: userId } });
}

export async function queueBroadcast(id: string) {
  const broadcast = await db.broadcast.findUnique({
    where: { id },
    include: { segment: true },
  });
  if (!broadcast || broadcast.status !== "draft")
    throw new Error(serverMessages.broadcastAlreadySent);
  if (!broadcast.segment) throw new Error(serverMessages.broadcastInvalid);
  const members = (
    await segmentMembers(readRules(broadcast.segment.rules))
  ).filter(
    (m) => m.marketingOptIn && isValidEmail(m.email),
  );
  if (!members.length) throw new Error(serverMessages.broadcastNoRecipients);
  await db.$transaction([
    db.broadcastRecipient.createMany({
      data: members.map((m) => ({
        broadcastId: id,
        customerId: m.id,
        email: m.email,
        locale: m.locale === "en" ? "en" : "ar",
      })),
      skipDuplicates: true,
    }),
    db.broadcast.update({
      where: { id },
      data: { status: "sending", queuedAt: new Date() },
    }),
  ]);
  return members.length;
}

function unsubscribeSecret() {
  const secret =
    process.env.CUSTOMER_AUTH_SECRET || process.env.REVALIDATION_SECRET;
  if (!secret) throw new Error(serverMessages.broadcastInvalid);
  return secret;
}
const unsubscribeSignature = (customerId: string) =>
  crypto
    .createHmac("sha256", unsubscribeSecret())
    .update(`unsubscribe:${customerId}`)
    .digest("base64url")
    .slice(0, 32);
export const unsubscribeToken = (customerId: string) =>
  `${customerId}.${unsubscribeSignature(customerId)}`;

export async function unsubscribeCustomer(token: string) {
  const [customerId, signature] = token.split(".");
  if (!customerId || !signature || !/^[0-9a-f-]{36}$/.test(customerId))
    return false;
  const expected = unsubscribeSignature(customerId);
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    return false;
  await db.customer.updateMany({
    where: { id: customerId },
    data: { marketingOptIn: false },
  });
  return true;
}

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

export async function sendBroadcastBatch(
  send: (message: {
    to: string;
    subject: string;
    html: string;
    idempotencyKey: string;
  }) => Promise<boolean>,
  siteUrl: string,
  batch = 50,
) {
  const active = await db.broadcast.findMany({
    where: { status: "sending" },
    take: 10,
  });
  let sent = 0;
  for (const broadcast of active) {
    const recipients = await db.broadcastRecipient.findMany({
      where: { broadcastId: broadcast.id, status: "pending" },
      take: batch,
    });
    const optedIn = new Set(
      (
        await db.customer.findMany({
          where: {
            id: { in: recipients.map((r) => r.customerId) },
            marketingOptIn: true,
          },
          select: { id: true },
        })
      ).map((c) => c.id),
    );
    const unsubscribed = recipients.filter((r) => !optedIn.has(r.customerId)).map((r) => r.id);
    if (unsubscribed.length)
      await db.broadcastRecipient.updateMany({
        where: { id: { in: unsubscribed } },
        data: { status: "failed", error: "unsubscribed" },
      });
    for (const r of recipients) {
      if (!optedIn.has(r.customerId)) continue;
      const ar = r.locale !== "en";
      const copy = getTranslations(ar ? "ar" : "en").admin.marketing;
      const link = `${siteUrl.replace(/\/$/, "")}/${ar ? "ar" : "en"}/unsubscribe/${unsubscribeToken(r.customerId)}`;
      const body = (ar ? broadcast.bodyAr : broadcast.bodyEn)
        .split(/\n{2,}/)
        .map((p) => `<p style="white-space:pre-line">${escape(p)}</p>`)
        .join("");
      const ok = await send({
        to: r.email,
        subject: ar ? broadcast.subjectAr : broadcast.subjectEn,
        html: `<div dir="${ar ? "rtl" : "ltr"}">${body}<p style="color:#64748b;font-size:12px"><a href="${escape(link)}">${escape(copy.unsubscribe)}</a></p></div>`,
        idempotencyKey: `broadcast:${broadcast.id}:${r.customerId}`,
      }).catch(() => false);
      await db.broadcastRecipient.update({
        where: { id: r.id },
        data: ok
          ? { status: "sent", sentAt: new Date() }
          : { status: "failed", error: "not_sent" },
      });
      if (ok) sent++;
    }
    if (
      !(await db.broadcastRecipient.count({
        where: { broadcastId: broadcast.id, status: "pending" },
      }))
    )
      await db.broadcast.update({
        where: { id: broadcast.id },
        data: { status: "sent", sentAt: new Date() },
      });
  }
  return sent;
}
