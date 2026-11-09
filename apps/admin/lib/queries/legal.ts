import { Prisma } from "@prisma/client";
import {
  formatMessage,
  getTranslations,
  serverMessages,
} from "@platform/locales";
import { db } from "../atomic";
import { LEGAL_KINDS, LEGAL_STATUSES } from "../constants/outreach";
import { createNotification } from "./notifications";
import { getNextSequenceNumber } from "./sequence";

const num = (value: { toString(): string } | null | undefined) =>
  value == null ? null : Number(value.toString());
const dateOnly = (value: Date | null) =>
  value ? value.toISOString().slice(0, 10) : null;

async function names(ids: (string | null)[]) {
  const wanted = Array.from(new Set(ids.filter((v): v is string => !!v)));
  const rows = wanted.length
    ? await db.user.findMany({
        where: { id: { in: wanted } },
        select: { id: true, fullName: true },
      })
    : [];
  return new Map<string, string>(rows.map((u: any) => [u.id, u.fullName]));
}

export async function listLegalMatters(
  filters: { status?: string; q?: string } = {},
) {
  const where: Prisma.LegalMatterWhereInput = {};
  if (filters.status === "open") where.status = { not: "closed" };
  else if (
    filters.status &&
    (LEGAL_STATUSES as readonly string[]).includes(filters.status)
  )
    where.status = filters.status;
  const q = filters.q?.trim();
  if (q)
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { number: { contains: q, mode: "insensitive" } },
      { counterparty: { contains: q, mode: "insensitive" } },
      { reference: { contains: q, mode: "insensitive" } },
    ];
  const rows = await db.legalMatter.findMany({
    where,
    orderBy: [
      { nextDate: { sort: "asc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    take: 300,
  });
  const people = await names(rows.map((r) => r.assigneeId));
  return rows.map((m) => ({
    id: m.id,
    number: m.number,
    title: m.title,
    kind: m.kind,
    status: m.status,
    counterparty: m.counterparty ?? "",
    reference: m.reference ?? "",
    next_date: dateOnly(m.nextDate),
    assignee: people.get(m.assigneeId ?? "") ?? "",
    amount_at_stake: num(m.amountAtStake),
  }));
}
export type LegalMatterRow = Awaited<
  ReturnType<typeof listLegalMatters>
>[number];

export async function getLegalMatter(id: string) {
  const m = await db.legalMatter.findUnique({
    where: { id },
    include: { events: { orderBy: { at: "asc" } } },
  });
  if (!m) return null;
  const people = await names([m.assigneeId, ...m.events.map((e) => e.byId)]);
  return {
    id: m.id,
    number: m.number,
    title: m.title,
    kind: m.kind,
    status: m.status,
    counterparty: m.counterparty ?? "",
    reference: m.reference ?? "",
    next_date: dateOnly(m.nextDate),
    assignee_id: m.assigneeId ?? "",
    assignee: people.get(m.assigneeId ?? "") ?? "",
    amount_at_stake: num(m.amountAtStake),
    description: m.description ?? "",
    outcome: m.outcome ?? "",
    closed_at: m.closedAt?.toISOString() ?? null,
    events: m.events.map((e) => ({
      id: e.id,
      kind: e.kind,
      body: e.body,
      at: e.at.toISOString(),
      by: people.get(e.byId ?? "") ?? "",
    })),
  };
}
export type LegalMatterRecord = NonNullable<
  Awaited<ReturnType<typeof getLegalMatter>>
>;

export interface LegalMatterInput {
  id?: string;
  title: string;
  kind: string;
  status: string;
  counterparty: string;
  reference: string;
  nextDate: string;
  assigneeId?: string;
  amountAtStake: string;
  description: string;
  outcome: string;
}

export async function saveLegalMatter(input: LegalMatterInput, userId: string) {
  const title = input.title.trim().slice(0, 200);
  if (
    !title ||
    !(LEGAL_KINDS as readonly string[]).includes(input.kind) ||
    !(LEGAL_STATUSES as readonly string[]).includes(input.status)
  )
    throw new Error(serverMessages.legalMatterInvalid);
  if (input.nextDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.nextDate))
    throw new Error(serverMessages.legalMatterInvalid);
  const amount = input.amountAtStake.trim()
    ? Number(input.amountAtStake)
    : null;
  if (amount !== null && (!Number.isFinite(amount) || amount < 0))
    throw new Error(serverMessages.legalMatterInvalid);
  const nextDate = input.nextDate
    ? new Date(`${input.nextDate}T00:00:00Z`)
    : null;
  const data = {
    title,
    kind: input.kind,
    status: input.status,
    counterparty: input.counterparty.trim().slice(0, 200) || null,
    reference: input.reference.trim().slice(0, 120) || null,
    nextDate,
    assigneeId: input.assigneeId || null,
    amountAtStake: amount === null ? null : Math.round(amount * 1000) / 1000,
    description: input.description.trim().slice(0, 10000) || null,
    outcome: input.outcome.trim().slice(0, 10000) || null,
  };
  if (!input.id) {
    const created = await db.legalMatter.create({
      data: {
        ...data,
        number: await getNextSequenceNumber("LGL"),
        createdById: userId,
        closedAt: data.status === "closed" ? new Date() : null,
      },
    });
    await db.legalMatterEvent.create({
      data: {
        matterId: created.id,
        kind: "status",
        body: created.status,
        byId: userId,
      },
    });
    return created;
  }
  const before = await db.legalMatter.findUnique({ where: { id: input.id } });
  if (!before) throw new Error(serverMessages.legalMatterInvalid);
  const updated = await db.legalMatter.update({
    where: { id: input.id },
    data: {
      ...data,
      closedAt:
        data.status === "closed" ? (before.closedAt ?? new Date()) : null,
      ...(before.nextDate?.getTime() !== nextDate?.getTime()
        ? { remindedFor: null }
        : {}),
    },
  });
  if (before.status !== updated.status)
    await db.legalMatterEvent.create({
      data: {
        matterId: updated.id,
        kind: "status",
        body: updated.status,
        byId: userId,
      },
    });
  if (before.nextDate?.getTime() !== nextDate?.getTime() && nextDate)
    await db.legalMatterEvent.create({
      data: {
        matterId: updated.id,
        kind: "date",
        body: input.nextDate,
        byId: userId,
      },
    });
  return updated;
}

export async function addLegalNote(id: string, body: string, userId: string) {
  const text = body.trim().slice(0, 5000);
  if (!text) throw new Error(serverMessages.taskCommentEmpty);
  await db.legalMatterEvent.create({
    data: { matterId: id, kind: "note", body: text, byId: userId },
  });
}

export async function remindLegalDates(now = new Date()) {
  const horizon = new Date(now.getTime() + 7 * 86_400_000);
  const due = await db.legalMatter.findMany({
    where: {
      status: { not: "closed" },
      assigneeId: { not: null },
      nextDate: { lte: horizon, gte: new Date(now.getTime() - 86_400_000) },
    },
  });
  const copy = getTranslations("en").admin.legal.notifications.nextDate;
  let sent = 0;
  for (const m of due) {
    if (
      m.remindedFor &&
      m.nextDate &&
      m.remindedFor.getTime() === m.nextDate.getTime()
    )
      continue;
    const params = {
      number: m.number,
      title: m.title,
      date: dateOnly(m.nextDate) ?? "",
    };
    await createNotification({
      user_id: m.assigneeId!,
      title: formatMessage(copy.title, params),
      message: formatMessage(copy.message, params),
      message_key: "legal.notifications.nextDate",
      message_params: params,
      type: "warning",
      entity_type: "legal_matter",
      entity_id: m.id,
    });
    await db.legalMatter.update({
      where: { id: m.id },
      data: { remindedFor: m.nextDate },
    });
    sent++;
  }
  return sent;
}

export async function licenceRegister() {
  const rows = await db.companyDocument.findMany({
    where: { validUntil: { not: null } },
    orderBy: { validUntil: "asc" },
    take: 200,
    select: {
      id: true,
      titleEn: true,
      titleAr: true,
      category: true,
      documentNumber: true,
      validUntil: true,
    },
  });
  return rows.map((d) => ({
    id: d.id,
    title_en: d.titleEn,
    title_ar: d.titleAr ?? d.titleEn,
    category: d.category,
    number: d.documentNumber ?? "",
    valid_until: dateOnly(d.validUntil),
  }));
}

export async function contractRegister() {
  const rows = await db.contract.findMany({
    orderBy: [
      { validUntil: { sort: "asc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    take: 200,
    include: {
      contact: {
        select: { firstName: true, lastName: true, companyName: true },
      },
    },
  });
  return rows.map((c) => ({
    id: c.id,
    number: c.contractNumber,
    title_en: c.titleEn,
    title_ar: c.titleAr ?? c.titleEn,
    status: c.status,
    party: c.contact
      ? c.contact.companyName ||
        [c.contact.firstName, c.contact.lastName].filter(Boolean).join(" ")
      : "",
    deal_id: c.dealId ?? "",
    valid_until: dateOnly(c.validUntil),
  }));
}
