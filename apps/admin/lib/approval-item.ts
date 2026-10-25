import {
  canDecideApproval,
  db,
  getSignatureMode,
  type Profile,
} from "@platform/database";
import {
  APPROVAL_TARGET_TYPES,
  type ApprovalTargetType,
} from "@platform/database/constants/approvals";
import { ROUTES } from "../constants/routes";
import { readableApprovalTypes } from "./approval-access";

/** A value shown on the approval page; the page formats it in the interface language. */
export type FactValue =
  | { kind: "text"; value: string }
  | { kind: "bilingual"; en: string; ar: string }
  | { kind: "date"; value: string }
  | { kind: "datetime"; value: string }
  | { kind: "money"; value: number; currency: string }
  | { kind: "number"; value: number; unit?: "days" | "percent" | "people" }
  /** A small closed list translated through `approvals.item.enums[group]`. */
  | { kind: "enum"; group: string; value: string };

export interface ApprovalItemDetail {
  targetType: ApprovalTargetType;
  targetId: string;
  reference: string | null;
  /** The person the request is about (who asked, or whose account changes). */
  subject: { name: string; email?: string | null } | null;
  facts: Array<{ key: string; value: FactValue }>;
  /** Field-by-field before → after for change requests. */
  changes: Array<{
    key: string;
    before: FactValue | null;
    after: FactValue | null;
  }>;
  /** Signatures and similar images compared side by side. */
  images: Array<{ key: string; url: string | null }>;
  files: Array<{ name: string; url: string }>;
  note: string | null;
  /** The full record, when it has its own page. */
  recordUrl: string | null;
  approval: {
    id: string;
    status: string;
    currentStep: number;
    revision: number;
    selfApproved: boolean;
    createdAt: string;
    requestedBy: { name: string; email: string };
    waitingFor: string[];
    decisions: Array<{
      decision: string;
      name: string;
      at: string;
      reason: string | null;
      step: number;
    }>;
  } | null;
  canDecide: boolean;
  isRequester: boolean;
  /** The approver must draw their signature when approving (the document is signed on the spot). */
  signatureRequired: boolean;
}

const text = (value: string | null | undefined): FactValue | null =>
  value ? { kind: "text", value } : null;
const day = (value: Date | null | undefined): FactValue | null =>
  value ? { kind: "date", value: value.toISOString().slice(0, 10) } : null;
const money = (value: unknown, currency = "BHD"): FactValue => ({
  kind: "money",
  value: Number(value ?? 0),
  currency,
});
const name = (e: { firstNameEn: string; lastNameEn: string }) =>
  `${e.firstNameEn} ${e.lastNameEn}`;
const bilingual = (en: string, ar: string | null | undefined): FactValue => ({
  kind: "bilingual",
  en,
  ar: ar || en,
});

type Builder = Omit<
  ApprovalItemDetail,
  | "targetType"
  | "targetId"
  | "approval"
  | "canDecide"
  | "isRequester"
  | "signatureRequired"
> & { subjectUserId?: string | null };
const empty = (): Builder => ({
  reference: null,
  subject: null,
  facts: [],
  changes: [],
  images: [],
  files: [],
  note: null,
  recordUrl: null,
});
const push = (b: Builder, key: string, value: FactValue | null) =>
  value && b.facts.push({ key, value });

async function userName(id: string | null | undefined) {
  if (!id) return null;
  const user = await db.user.findUnique({
    where: { id },
    select: { fullName: true },
  });
  return user?.fullName ?? null;
}

async function attachmentsOf(entityType: string, entityId: string) {
  const rows = await db.attachment.findMany({
    where: { entityType, entityId },
    select: { fileName: true, fileUrl: true },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
  return rows.map((r) => ({ name: r.fileName, url: r.fileUrl }));
}

/** What the record behind an approval says, per request type. */
async function describe(
  targetType: ApprovalTargetType,
  id: string,
  diff: Record<string, unknown> | null,
): Promise<Builder | null> {
  const b = empty();
  switch (targetType) {
    case "profile_change": {
      const r = await db.profileChangeRequest.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      });
      if (!r) return null;
      const before = (r.oldValues ?? {}) as Record<string, string>;
      const after = (r.newValues ?? {}) as Record<string, string>;
      b.subject = { name: r.user.fullName, email: r.user.email };
      b.subjectUserId = r.user.id;
      for (const key of ["fullName", "email"])
        if (after[key] && after[key] !== before[key])
          b.changes.push({
            key,
            before: text(before[key]),
            after: text(after[key]),
          });
      b.note = typeof diff?.reason === "string" ? diff.reason : null;
      push(b, "status", {
        kind: "enum",
        group: "requestStatus",
        value: r.status,
      });
      return b;
    }
    case "signature_change": {
      const r = await db.signatureChange.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      });
      if (!r) return null;
      b.subject = { name: r.user.fullName, email: r.user.email };
      b.subjectUserId = r.user.id;
      b.images.push(
        { key: "currentSignature", url: r.previousUrl },
        { key: "newSignature", url: r.signatureUrl },
      );
      push(b, "status", {
        kind: "enum",
        group: "requestStatus",
        value: r.status,
      });
      return b;
    }
    case "account_change": {
      const r = await db.accountChangeRequest.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          requestedBy: { select: { fullName: true } },
        },
      });
      if (!r) return null;
      const changes = (r.changes ?? {}) as Record<string, unknown>;
      const before = (r.before ?? {}) as Record<string, unknown>;
      b.subject = { name: r.user.fullName, email: r.user.email };
      b.subjectUserId = r.user.id;
      const roles = await db.role.findMany({
        select: { id: true, nameEn: true, nameAr: true },
      });
      const role = (value: unknown): FactValue | null => {
        const found = roles.find((x) => x.id === value);
        return found
          ? bilingual(found.nameEn, found.nameAr)
          : text(value as string);
      };
      const percent = (value: unknown): FactValue | null =>
        value == null
          ? null
          : { kind: "number", value: Number(value), unit: "percent" };
      for (const [key, value] of Object.entries(changes)) {
        if (key === "statusReason") continue;
        const was = before[key];
        if (key === "role")
          b.changes.push({ key, before: role(was), after: role(value) });
        else if (key === "managerId")
          b.changes.push({
            key: "manager",
            before: text(await userName(was as string)),
            after: text(await userName(value as string)),
          });
        else if (key === "status")
          b.changes.push({
            key,
            before: was
              ? { kind: "enum", group: "accountStatus", value: String(was) }
              : null,
            after: {
              kind: "enum",
              group: "accountStatus",
              value: String(value),
            },
          });
        else
          b.changes.push({ key, before: percent(was), after: percent(value) });
      }
      b.note = (changes.statusReason as string) || r.reason || null;
      push(b, "status", {
        kind: "enum",
        group: "requestStatus",
        value: r.status,
      });
      return b;
    }
    case "leave_request": {
      const r = await db.leaveRequest.findUnique({
        where: { id },
        include: {
          leaveType: true,
          employee: {
            select: {
              id: true,
              userId: true,
              firstNameEn: true,
              lastNameEn: true,
              employeeNumber: true,
              leaveBalanceDays: true,
            },
          },
        },
      });
      if (!r) return null;
      b.subject = { name: name(r.employee) };
      b.subjectUserId = r.employee.userId;
      b.reference = r.employee.employeeNumber;
      push(b, "leaveType", bilingual(r.leaveType.nameEn, r.leaveType.nameAr));
      push(b, "from", day(r.startDate));
      push(b, "to", day(r.endDate));
      push(b, "portion", {
        kind: "enum",
        group: "portion",
        value: r.dayPortion,
      });
      push(b, "days", { kind: "number", value: Number(r.days), unit: "days" });
      push(b, "status", {
        kind: "enum",
        group: "requestStatus",
        value: r.status,
      });
      b.note = r.reason;
      if (r.attachmentUrl)
        b.files.push({ name: "attachment", url: r.attachmentUrl });
      b.recordUrl = ROUTES.hr.leave({ highlight: id });
      return b;
    }
    case "salary_document": {
      const r = await db.salaryDocument.findUnique({
        where: { id },
        include: {
          employee: {
            select: {
              userId: true,
              firstNameEn: true,
              lastNameEn: true,
              employeeNumber: true,
            },
          },
        },
      });
      if (!r) return null;
      b.subject = { name: name(r.employee) };
      b.subjectUserId = r.employee.userId;
      b.reference = r.employee.employeeNumber;
      push(b, "documentKind", {
        kind: "enum",
        group: "salaryDocument",
        value: r.kind,
      });
      const months = (r.months as string[]) ?? [];
      if (months.length) push(b, "months", text(months.join(", ")));
      push(b, "languages", text(r.languages.join(" + ").toUpperCase()));
      push(b, "status", {
        kind: "enum",
        group: "requestStatus",
        value: r.status,
      });
      b.recordUrl = ROUTES.hr.documents({ highlight: id });
      return b;
    }
    case "expense": {
      const r = await db.expense.findUnique({
        where: { id },
        include: {
          category: true,
          deal: { select: { title: true } },
          client: {
            select: { firstName: true, lastName: true, companyName: true },
          },
          createdBy: { select: { id: true, fullName: true } },
        },
      });
      if (!r) return null;
      b.subject = r.createdBy ? { name: r.createdBy.fullName } : null;
      b.subjectUserId = r.createdBy?.id;
      push(b, "description", text(r.descriptionEn));
      push(b, "amount", money(r.amount, r.currency));
      if (Number(r.inputVatAmount) > 0)
        push(b, "inputVat", money(r.inputVatAmount, r.currency));
      push(b, "date", day(r.expenseDate));
      if (r.category)
        push(b, "category", bilingual(r.category.nameEn, r.category.nameAr));
      push(b, "vendor", text(r.vendorName));
      push(b, "scope", { kind: "enum", group: "expenseScope", value: r.scope });
      push(b, "deal", text(r.deal?.title));
      push(
        b,
        "client",
        text(
          r.client
            ? r.client.companyName ||
                [r.client.firstName, r.client.lastName]
                  .filter(Boolean)
                  .join(" ")
            : null,
        ),
      );
      push(b, "status", {
        kind: "enum",
        group: "requestStatus",
        value: r.status,
      });
      b.note = r.notes;
      b.files = await attachmentsOf("expense", id);
      if (!b.files.length && r.receiptUrl)
        b.files.push({ name: "receipt", url: r.receiptUrl });
      b.recordUrl = ROUTES.expenses.list({ highlight: id });
      return b;
    }
    case "expense_claim": {
      const r = await db.expenseClaim.findUnique({
        where: { id },
        include: {
          category: true,
          deal: { select: { title: true } },
          claimant: { select: { id: true, fullName: true, email: true } },
        },
      });
      if (!r) return null;
      b.subject = { name: r.claimant.fullName, email: r.claimant.email };
      b.subjectUserId = r.claimant.id;
      b.reference = r.claimNumber;
      push(b, "amount", money(r.amount, r.currency));
      push(b, "date", day(r.expenseDate));
      if (r.category)
        push(b, "category", bilingual(r.category.nameEn, r.category.nameAr));
      push(b, "deal", text(r.deal?.title));
      push(b, "status", {
        kind: "enum",
        group: "claimStatus",
        value: r.status,
      });
      b.note = r.reason;
      b.files = await attachmentsOf("expense_claim", id);
      if (!b.files.length) b.files.push({ name: "receipt", url: r.receiptUrl });
      b.recordUrl = ROUTES.claims.list({ highlight: id });
      return b;
    }
    case "payroll_run": {
      const r = await db.payrollRun.findUnique({
        where: { id },
        include: { _count: { select: { items: true } } },
      });
      if (!r) return null;
      b.reference = `${r.year}-${String(r.month).padStart(2, "0")}`;
      push(b, "period", text(b.reference));
      push(b, "employees", {
        kind: "number",
        value: r._count.items,
        unit: "people",
      });
      push(b, "totalGross", money(r.totalGross));
      push(b, "totalDeductions", money(r.totalDeductions));
      push(b, "totalNet", money(r.totalNet));
      push(b, "employerCost", money(r.totalEmployerCost));
      push(b, "payDate", day(r.payDate));
      push(b, "status", {
        kind: "enum",
        group: "payrollStatus",
        value: r.status,
      });
      b.recordUrl = ROUTES.hr.payroll({ highlight: id });
      return b;
    }
    case "invoice": {
      const r = await db.invoice.findUnique({
        where: { id },
        include: {
          client: {
            select: { firstName: true, lastName: true, companyName: true },
          },
        },
      });
      if (!r) return null;
      b.reference = r.invoiceNumber;
      push(
        b,
        "client",
        text(
          r.client
            ? r.client.companyName ||
                [r.client.firstName, r.client.lastName]
                  .filter(Boolean)
                  .join(" ")
            : null,
        ),
      );
      push(b, "issueDate", day(r.issueDate));
      push(b, "dueDate", day(r.dueDate));
      push(b, "subtotal", money(r.subtotal, r.currency));
      if (Number(r.discountAmount) > 0)
        push(b, "discount", money(r.discountAmount, r.currency));
      push(b, "total", money(r.totalAmount, r.currency));
      b.recordUrl = ROUTES.invoices.detail(id);
      return b;
    }
    case "quotation": {
      const r = await db.quotation.findUnique({
        where: { id },
        include: {
          client: {
            select: { firstName: true, lastName: true, companyName: true },
          },
        },
      });
      if (!r) return null;
      b.reference = r.quotationNumber;
      push(
        b,
        "client",
        text(
          r.client
            ? r.client.companyName ||
                [r.client.firstName, r.client.lastName]
                  .filter(Boolean)
                  .join(" ")
            : null,
        ),
      );
      push(b, "subtotal", money(r.subtotal, r.currency));
      if (Number(r.discountAmount) > 0)
        push(b, "discount", money(r.discountAmount, r.currency));
      push(b, "total", money(r.totalAmount, r.currency));
      b.recordUrl = ROUTES.quotations.detail(id);
      return b;
    }
    case "service_request": {
      const r = await db.inquiry.findUnique({ where: { id } });
      if (!r) return null;
      b.reference = r.projectReference || r.reference;
      b.subject = { name: r.name, email: r.email };
      push(b, "requestType", text(r.requestType));
      push(b, "company", text(r.companyName));
      push(b, "priority", text(r.priority));
      b.note = r.message;
      b.recordUrl = ROUTES.requests.detail(id);
      return b;
    }
    case "purchase_requisition": {
      const r = await db.purchaseRequisition.findUnique({ where: { id }, include: { lines: { orderBy: { sortOrder: "asc" } } } });
      if (!r) return null;
      b.reference = r.number;
      b.subjectUserId = r.requestedById;
      const requester = await userName(r.requestedById);
      b.subject = requester ? { name: requester } : null;
      push(b, "amount", money(r.estimatedTotal));
      push(b, "neededBy", day(r.neededBy));
      push(b, "lineCount", { kind: "number", value: r.lines.length });
      b.note = [r.note, ...r.lines.map((l) => `• ${l.description} × ${Number(l.quantity)}`)].filter(Boolean).join("\n");
      b.recordUrl = ROUTES.procurement.requisition(id);
      return b;
    }
    case "purchase_order": {
      const o = await db.purchaseOrder.findUnique({ where: { id }, include: { supplier: true, lines: { orderBy: { sortOrder: "asc" } } } });
      if (!o) return null;
      b.reference = o.number;
      b.subjectUserId = o.createdById;
      push(b, "vendor", text(o.supplier.companyName || [o.supplier.firstName, o.supplier.lastName].filter(Boolean).join(" ")));
      push(b, "total", money(o.total));
      push(b, "date", day(o.orderDate));
      push(b, "expectedDate", day(o.expectedDate));
      push(b, "lineCount", { kind: "number", value: o.lines.length });
      b.note = [o.note, ...o.lines.map((l) => `• ${l.description} × ${Number(l.quantity)} @ ${Number(l.unitPrice)}`)].filter(Boolean).join("\n");
      b.recordUrl = ROUTES.procurement.order(id);
      return b;
    }
    default:
      return null;
  }
}

/** The approval page for one record, or null when it does not exist or the viewer may not see it. */
export async function getApprovalItem(
  targetTypeParam: string,
  targetId: string,
  viewer: Profile,
): Promise<ApprovalItemDetail | null> {
  if (!(APPROVAL_TARGET_TYPES as readonly string[]).includes(targetTypeParam))
    return null;
  const targetType = targetTypeParam as ApprovalTargetType;
  const latest = await db.approvalRequest.findFirst({
    where: { targetType, targetId },
    orderBy: { revision: "desc" },
    include: {
      requestedBy: { select: { fullName: true, email: true } },
      decisions: {
        orderBy: { decidedAt: "asc" },
        include: { decidedBy: { select: { id: true, fullName: true } } },
      },
    },
  });
  const details = await describe(
    targetType,
    targetId,
    (latest?.diffPayload ?? null) as Record<string, unknown> | null,
  );
  if (!details) return null;

  const involved =
    viewer.role === "super_admin" ||
    details.subjectUserId === viewer.id ||
    (latest &&
      (latest.requestedById === viewer.id ||
        latest.approverIds.includes(viewer.id) ||
        latest.decisions.some((d) => d.decidedById === viewer.id)));
  if (!involved && !(await readableApprovalTypes()).includes(targetType))
    return null;

  const waitingFor =
    latest?.status === "pending"
      ? (
          await db.user.findMany({
            where: { id: { in: latest.approverIds } },
            select: { fullName: true },
          })
        ).map((u) => u.fullName)
      : [];
  const { subjectUserId: _subject, ...rest } = details;
  return {
    targetType,
    targetId,
    ...rest,
    approval: latest
      ? {
          id: latest.id,
          status: latest.status,
          currentStep: latest.currentStep,
          revision: latest.revision,
          selfApproved: latest.selfApproved,
          createdAt: latest.createdAt.toISOString(),
          requestedBy: {
            name: latest.requestedBy.fullName,
            email: latest.requestedBy.email,
          },
          waitingFor,
          decisions: latest.decisions.map((d) => ({
            decision: d.decision,
            name: d.decidedBy.fullName,
            at: d.decidedAt.toISOString(),
            reason: d.reason,
            step: d.step,
          })),
        }
      : null,
    canDecide: latest ? canDecideApproval(latest, viewer) : false,
    isRequester: latest?.requestedById === viewer.id,
    signatureRequired: (await getSignatureMode(targetType)) === "live",
  };
}
