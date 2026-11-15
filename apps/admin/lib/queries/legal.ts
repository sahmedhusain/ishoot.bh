import {
  formatMessage,
  getTranslations,
  serverMessages,
} from "@platform/locales";
import { listTableRows, upsertTableRow } from "../api/tables";
import { LEGAL_KINDS, LEGAL_STATUSES } from "../constants/outreach";
import { createNotification } from "./notifications";
import { getNextSequenceNumber } from "./sequence";

const num = (value: { toString(): string } | number | string | null | undefined) =>
  value == null ? null : Number(value.toString());
const dateOnly = (value: Date | string | null | undefined) =>
  value ? new Date(value).toISOString().slice(0, 10) : null;

async function names(ids: (string | null | undefined)[]) {
  const wanted = new Set(ids.filter((v): v is string => !!v));
  const rows = wanted.size
    ? await listTableRows<any>("identity", "user").catch(() => [])
    : [];
  return new Map<string, string>(
    rows.filter((u: any) => wanted.has(u.id)).map((u: any) => [u.id, u.fullName]),
  );
}

export async function listLegalMatters(
  filters: { status?: string; q?: string } = {},
) {
  const allRows = await listTableRows<any>("system", "legal_matter");
  const q = filters.q?.trim().toLowerCase();
  const rows = allRows
    .filter((m) => {
      if (filters.status === "open" && m.status === "closed") return false;
      else if (
        filters.status &&
        filters.status !== "open" &&
        (LEGAL_STATUSES as readonly string[]).includes(filters.status) &&
        m.status !== filters.status
      )
        return false;
      if (q) {
        const hay = [m.title, m.number, m.counterparty, m.reference]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const na = a.nextDate ? new Date(a.nextDate).getTime() : Infinity;
      const nb = b.nextDate ? new Date(b.nextDate).getTime() : Infinity;
      if (na !== nb) return na - nb;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    })
    .slice(0, 300);
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
  const [matters, allEvents] = await Promise.all([
    listTableRows<any>("system", "legal_matter"),
    listTableRows<any>("system", "legal_matter_event", "at ASC"),
  ]);
  const m = matters.find((row) => row.id === id);
  if (!m) return null;
  const events = allEvents.filter((e) => e.matterId === id);
  const people = await names([m.assigneeId, ...events.map((e) => e.byId)]);
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
    closed_at: m.closedAt ? new Date(m.closedAt).toISOString() : null,
    events: events.map((e) => ({
      id: e.id,
      kind: e.kind,
      body: e.body,
      at: new Date(e.at || e.createdAt || Date.now()).toISOString(),
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
  const nextDateIso = nextDate ? nextDate.toISOString() : null;
  const data = {
    title,
    kind: input.kind,
    status: input.status,
    counterparty: input.counterparty.trim().slice(0, 200) || null,
    reference: input.reference.trim().slice(0, 120) || null,
    nextDate: nextDateIso,
    assigneeId: input.assigneeId || null,
    amountAtStake: amount === null ? null : Math.round(amount * 1000) / 1000,
    description: input.description.trim().slice(0, 10000) || null,
    outcome: input.outcome.trim().slice(0, 10000) || null,
  };
  if (!input.id) {
    const created = await upsertTableRow<any>("system", "legal_matter", {
      id: crypto.randomUUID(),
      ...data,
      number: await getNextSequenceNumber("LGL"),
      createdById: userId,
      closedAt: data.status === "closed" ? new Date().toISOString() : null,
    });
    await upsertTableRow("system", "legal_matter_event", {
      id: crypto.randomUUID(),
      matterId: created.id,
      kind: "status",
      body: created.status,
      byId: userId,
    });
    return created;
  }
  const matters = await listTableRows<any>("system", "legal_matter");
  const before = matters.find((row) => row.id === input.id);
  if (!before) throw new Error(serverMessages.legalMatterInvalid);
  const beforeNextTime = before.nextDate ? new Date(before.nextDate).getTime() : undefined;
  const nextTime = nextDate?.getTime();
  const updated = await upsertTableRow<any>("system", "legal_matter", {
    ...before,
    ...data,
    id: input.id,
    closedAt:
      data.status === "closed" ? (before.closedAt ?? new Date().toISOString()) : null,
    ...(beforeNextTime !== nextTime ? { remindedFor: null } : {}),
  });
  if (before.status !== updated.status)
    await upsertTableRow("system", "legal_matter_event", {
      id: crypto.randomUUID(),
      matterId: updated.id,
      kind: "status",
      body: updated.status,
      byId: userId,
    });
  if (beforeNextTime !== nextTime && nextDate)
    await upsertTableRow("system", "legal_matter_event", {
      id: crypto.randomUUID(),
      matterId: updated.id,
      kind: "date",
      body: input.nextDate,
      byId: userId,
    });
  return updated;
}

export async function addLegalNote(id: string, body: string, userId: string) {
  const text = body.trim().slice(0, 5000);
  if (!text) throw new Error(serverMessages.taskCommentEmpty);
  await upsertTableRow("system", "legal_matter_event", {
    id: crypto.randomUUID(),
    matterId: id,
    kind: "note",
    body: text,
    byId: userId,
  });
}

export async function remindLegalDates(now = new Date()) {
  const horizonMs = now.getTime() + 7 * 86_400_000;
  const floorMs = now.getTime() - 86_400_000;
  const all = await listTableRows<any>("system", "legal_matter");
  const due = all.filter((m) => {
    if (m.status === "closed" || !m.assigneeId || !m.nextDate) return false;
    const t = new Date(m.nextDate).getTime();
    return t <= horizonMs && t >= floorMs;
  });
  const copy = getTranslations("en").admin.legal.notifications.nextDate;
  let sent = 0;
  for (const m of due) {
    if (
      m.remindedFor &&
      m.nextDate &&
      new Date(m.remindedFor).getTime() === new Date(m.nextDate).getTime()
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
    await upsertTableRow("system", "legal_matter", {
      ...m,
      remindedFor: m.nextDate,
    });
    sent++;
  }
  return sent;
}

export async function licenceRegister() {
  const { getCompanyDocuments } = await import("./company-documents");
  const docs = await getCompanyDocuments().catch(() => []);
  return docs
    .filter((d) => Boolean(d.valid_until))
    .sort((a, b) => (a.valid_until || "").localeCompare(b.valid_until || ""))
    .map((d) => ({
      id: d.id,
      title_en: d.title_en,
      title_ar: d.title_ar ?? d.title_en,
      category: d.category,
      number: d.document_number ?? "",
      valid_until: d.valid_until ?? null,
    }));
}

export async function contractRegister() {
  const [{ listContracts }, { listContacts }] = await Promise.all([
    import("../api/workflow"),
    import("../api/sales"),
  ]);
  const [contracts, contacts] = await Promise.all([
    listContracts().catch(() => []),
    listContacts().catch(() => []),
  ]);
  const contactMap = new Map<string, string>(
    (contacts || []).map(
      (c: any) =>
        [
          c.id,
          c.company || [c.firstName, c.lastName].filter(Boolean).join(" ") || c.id,
        ] as [string, string],
    ),
  );
  return (contracts || []).map((c) => ({
    id: c.id,
    number: c.contractNumber,
    title_en: c.title,
    title_ar: c.title,
    status: c.status,
    party: c.clientId ? contactMap.get(c.clientId) || c.clientId : "",
    deal_id: c.dealId ?? "",
    valid_until: c.endDate ? c.endDate.slice(0, 10) : null,
  }));
}
