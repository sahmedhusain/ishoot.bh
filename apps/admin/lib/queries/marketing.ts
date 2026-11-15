import { isValidEmail } from "../constants/validation";
import crypto from "node:crypto";
import { getTranslations, serverMessages } from "@platform/locales";
import { listTableRows, upsertTableRow } from "../api/tables";
import { runAtomicMutation } from "../api/atomic";
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

const num = (value: unknown) => (value == null ? 0 : Number(value));
const round3 = (value: number) => Math.round(value * 1000) / 1000;
const dateOnly = (value: Date | string | null | undefined) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};
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
  const keys = new Set(campaigns.map((c) => c.utmCampaign));
  const coupons = new Set(
    campaigns.map((c) => c.couponCode).filter((c): c is string => !!c),
  );
  const [orders, inquiries] = await Promise.all([
    listTableRows<Record<string, any>>("commerce", "sales_order"),
    listTableRows<Record<string, any>>("sales", "inquiry"),
  ]);
  const results = new Map(
    campaigns.map((c) => [
      c.utmCampaign,
      { orders: 0, revenue: 0, requests: 0 },
    ]),
  );
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    if (!keys.has(o.utmCampaign) && !(o.couponCode && coupons.has(o.couponCode)))
      continue;
    const campaign =
      campaigns.find((c) => c.utmCampaign === o.utmCampaign) ??
      campaigns.find((c) => c.couponCode && c.couponCode === o.couponCode);
    if (!campaign) continue;
    const r = results.get(campaign.utmCampaign)!;
    r.orders += 1;
    r.revenue = round3(r.revenue + num(o.total));
  }
  for (const q of inquiries) {
    if (q.utmCampaign && results.has(String(q.utmCampaign))) {
      results.get(String(q.utmCampaign))!.requests += 1;
    }
  }
  return results;
}

export async function listCampaigns() {
  const rows = (await listTableRows<Record<string, any>>("sales", "campaign"))
    .sort((a, b) => {
      const sCmp = String(a.status ?? "").localeCompare(String(b.status ?? ""));
      if (sCmp !== 0) return sCmp;
      const aStart = a.startDate ? new Date(a.startDate).getTime() : -Infinity;
      const bStart = b.startDate ? new Date(b.startDate).getTime() : -Infinity;
      if (bStart !== aStart) return bStart - aStart;
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    })
    .slice(0, 200);
  const results = await campaignResults(
    rows.map((c) => ({
      utmCampaign: String(c.utmCampaign ?? ""),
      couponCode: c.couponCode ?? null,
    })),
  );
  return rows.map((c) => {
    const r = results.get(String(c.utmCampaign)) ?? {
      orders: 0,
      revenue: 0,
      requests: 0,
    };
    return {
      id: String(c.id),
      code: String(c.code ?? ""),
      name: String(c.name ?? ""),
      channel: String(c.channel ?? ""),
      status: String(c.status ?? ""),
      start_date: dateOnly(c.startDate),
      end_date: dateOnly(c.endDate),
      budget: num(c.budget),
      spend: num(c.spend),
      utm_campaign: String(c.utmCampaign ?? ""),
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
  const existingCampaigns = await listTableRows<Record<string, any>>("sales", "campaign");
  const clash = existingCampaigns.find(
    (c) => c.utmCampaign === utm && (!input.id || c.id !== input.id),
  );
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
    startDate: startDate ? startDate.toISOString() : null,
    endDate: endDate ? endDate.toISOString() : null,
    budget: money(input.budget),
    spend: money(input.spend),
    utmCampaign: utm,
    couponCode,
    notes: input.notes.trim().slice(0, 5000) || null,
    ownerId: input.ownerId || null,
  };
  if (input.id)
    return upsertTableRow("sales", "campaign", { id: input.id, ...data });
  return upsertTableRow("sales", "campaign", {
    id: crypto.randomUUID(),
    ...data,
    code: await getNextSequenceNumber("MKT"),
    createdById: userId,
  });
}

function readRules(value: unknown): SegmentRules {
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
  const [customers, addresses, orders] = await Promise.all([
    listTableRows<Record<string, any>>("commerce", "customer"),
    listTableRows<Record<string, any>>("commerce", "customer_address"),
    listTableRows<Record<string, any>>("commerce", "sales_order"),
  ]);
  const addrByCustomer = new Map<string, string[]>();
  for (const a of addresses) {
    const cid = String(a.customerId ?? "");
    if (!cid || !a.city) continue;
    const list = addrByCustomer.get(cid) ?? [];
    list.push(String(a.city));
    addrByCustomer.set(cid, list);
  }
  const ordersByCustomer = new Map<string, Record<string, any>[]>();
  for (const o of orders) {
    if (o.status === "cancelled" || !o.customerId) continue;
    const cid = String(o.customerId);
    const list = ordersByCustomer.get(cid) ?? [];
    list.push(o);
    ordersByCustomer.set(cid, list);
  }
  return customers.filter((c) => {
    const cid = String(c.id);
    const custOrders = ordersByCustomer.get(cid) ?? [];
    const cities = [
      ...(addrByCustomer.get(cid) ?? []),
      ...custOrders.map((o) =>
        String((o.shippingAddress as { city?: string } | null)?.city ?? ""),
      ),
    ].filter(Boolean);
    const lastOrderAt: Date | null = custOrders.reduce(
      (latest: Date | null, o: any) => {
        const d = o.placedAt ? new Date(o.placedAt) : null;
        return !latest || (d && d > latest) ? d : latest;
      },
      null,
    );
    return matchesSegment(
      rules,
      {
        orders: custOrders.length,
        spent: custOrders.reduce((sum, o) => sum + num(o.total), 0),
        lastOrderAt,
        cities,
      },
      now,
    );
  });
}

export async function listSegments() {
  const rows = await listTableRows<Record<string, any>>(
    "commerce",
    "customer_segment",
    "name ASC",
  );
  return Promise.all(
    rows.map(async (s) => {
      const rules = readRules(s.rules);
      const members = await segmentMembers(rules);
      return {
        id: String(s.id),
        name: String(s.name ?? ""),
        rules,
        size: members.length,
        reachable: members.filter((m) => Boolean(m.marketingOptIn)).length,
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
  const stored = JSON.parse(JSON.stringify(rules));
  return input.id
    ? upsertTableRow("commerce", "customer_segment", {
        id: input.id,
        name,
        rules: stored,
      })
    : upsertTableRow("commerce", "customer_segment", {
        id: crypto.randomUUID(),
        name,
        rules: stored,
      });
}

export async function listBroadcasts() {
  const [allBroadcasts, segments, campaigns, recipients] = await Promise.all([
    listTableRows<Record<string, any>>("system", "broadcast", "created_at DESC"),
    listTableRows<Record<string, any>>("commerce", "customer_segment"),
    listTableRows<Record<string, any>>("sales", "campaign"),
    listTableRows<Record<string, any>>("system", "broadcast_recipient"),
  ]);
  const rows = allBroadcasts
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 50);
  const segById = new Map(segments.map((s) => [String(s.id), String(s.name ?? "")]));
  const campById = new Map(campaigns.map((c) => [String(c.id), String(c.name ?? "")]));
  return rows.map((b) => {
    const bid = String(b.id);
    const of = (status: string) =>
      recipients.filter((r) => r.broadcastId === bid && r.status === status).length;
    return {
      id: bid,
      name: String(b.name ?? ""),
      status: String(b.status ?? "draft"),
      segment: b.segmentId ? (segById.get(String(b.segmentId)) ?? "") : "",
      segment_id: String(b.segmentId ?? ""),
      campaign: b.campaignId ? (campById.get(String(b.campaignId)) ?? "") : "",
      campaign_id: String(b.campaignId ?? ""),
      subject_en: String(b.subjectEn ?? ""),
      subject_ar: String(b.subjectAr ?? ""),
      body_en: String(b.bodyEn ?? ""),
      body_ar: String(b.bodyAr ?? ""),
      pending: of("pending"),
      sent: of("sent"),
      failed: of("failed"),
      sent_at: b.sentAt ? new Date(b.sentAt).toISOString() : null,
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
    const broadcasts = await listTableRows<Record<string, any>>("system", "broadcast");
    const existing = broadcasts.find((b) => b.id === input.id && b.status === "draft");
    if (!existing) throw new Error(serverMessages.broadcastAlreadySent);
    await upsertTableRow("system", "broadcast", { id: input.id, ...data });
    return { id: input.id };
  }
  return upsertTableRow("system", "broadcast", {
    id: crypto.randomUUID(),
    ...data,
    status: "draft",
    createdById: userId,
  });
}

export async function queueBroadcast(id: string) {
  const [broadcasts, segments] = await Promise.all([
    listTableRows<Record<string, any>>("system", "broadcast"),
    listTableRows<Record<string, any>>("commerce", "customer_segment"),
  ]);
  const broadcast = broadcasts.find((b) => b.id === id);
  if (!broadcast || broadcast.status !== "draft")
    throw new Error(serverMessages.broadcastAlreadySent);
  const segment = segments.find((s) => s.id === broadcast.segmentId);
  if (!segment) throw new Error(serverMessages.broadcastInvalid);
  const members = (await segmentMembers(readRules(segment.rules))).filter(
    (m) => Boolean(m.marketingOptIn) && isValidEmail(String(m.email ?? "")),
  );
  if (!members.length) throw new Error(serverMessages.broadcastNoRecipients);
  return runAtomicMutation(async () => {
    const existingRecipients = await listTableRows<Record<string, any>>(
      "system",
      "broadcast_recipient",
    );
    const existingKeys = new Set(
      existingRecipients
        .filter((r) => r.broadcastId === id)
        .map((r) => String(r.customerId)),
    );
    for (const m of members) {
      if (existingKeys.has(String(m.id))) continue;
      await upsertTableRow("system", "broadcast_recipient", {
        id: crypto.randomUUID(),
        broadcastId: id,
        customerId: m.id,
        email: m.email,
        locale: m.locale === "en" ? "en" : "ar",
        status: "pending",
      });
    }
    await upsertTableRow("system", "broadcast", {
      id,
      status: "sending",
      queuedAt: new Date().toISOString(),
    });
    return members.length;
  });
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
  await upsertTableRow("commerce", "customer", {
    id: customerId,
    marketingOptIn: false,
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
  const [broadcasts, allRecipients, customers] = await Promise.all([
    listTableRows<Record<string, any>>("system", "broadcast"),
    listTableRows<Record<string, any>>("system", "broadcast_recipient"),
    listTableRows<Record<string, any>>("commerce", "customer"),
  ]);
  const active = broadcasts.filter((b) => b.status === "sending").slice(0, 10);
  const optedInCustomers = new Set(
    customers.filter((c) => Boolean(c.marketingOptIn)).map((c) => String(c.id)),
  );
  let sent = 0;
  for (const broadcast of active) {
    const recipients = allRecipients
      .filter((r) => r.broadcastId === broadcast.id && r.status === "pending")
      .slice(0, batch);
    for (const r of recipients) {
      if (!optedInCustomers.has(String(r.customerId))) {
        await upsertTableRow("system", "broadcast_recipient", {
          id: r.id,
          status: "failed",
          error: "unsubscribed",
        });
        continue;
      }
      const ar = r.locale !== "en";
      const copy = getTranslations(ar ? "ar" : "en").admin.marketing;
      const link = `${siteUrl.replace(/\/$/, "")}/${ar ? "ar" : "en"}/unsubscribe/${unsubscribeToken(String(r.customerId))}`;
      const body = String(ar ? broadcast.bodyAr : broadcast.bodyEn)
        .split(/\n{2,}/)
        .map((p) => `<p style="white-space:pre-line">${escape(p)}</p>`)
        .join("");
      const ok = await send({
        to: String(r.email),
        subject: String(ar ? broadcast.subjectAr : broadcast.subjectEn),
        html: `<div dir="${ar ? "rtl" : "ltr"}">${body}<p style="color:#64748b;font-size:12px"><a href="${escape(link)}">${escape(copy.unsubscribe)}</a></p></div>`,
        idempotencyKey: `broadcast:${broadcast.id}:${r.customerId}`,
      }).catch(() => false);
      await upsertTableRow("system", "broadcast_recipient", {
        id: r.id,
        ...(ok
          ? { status: "sent", sentAt: new Date().toISOString() }
          : { status: "failed", error: "not_sent" }),
      });
      if (ok) sent++;
    }
    const remainingPending = (
      await listTableRows<Record<string, any>>("system", "broadcast_recipient")
    ).some((r) => r.broadcastId === broadcast.id && r.status === "pending");
    if (!remainingPending) {
      await upsertTableRow("system", "broadcast", {
        id: broadcast.id,
        status: "sent",
        sentAt: new Date().toISOString(),
      });
    }
  }
  return sent;
}
