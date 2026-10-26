import { db } from "../db";
import { ROUTES } from "../constants/routes";
import { hasPermission } from "../queries/permissions";
import { listExpiringEmployeeDocuments } from "../queries/employee-credentials";
import type {
  PermissionAction,
  PermissionResource,
} from "../constants/permissions";

/** Reminder stages: a document is reminded once at each stage it reaches. */
const STAGES = [60, 30, 7, 0] as const;
const stageOf = (days: number) =>
  days < 0 ? 0 : (STAGES.filter((s) => days <= s).at(-1) ?? null);

async function usersWith(
  resource: PermissionResource,
  action: PermissionAction,
) {
  const users = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, role: true, permissions: true },
  });
  const allowed = await Promise.all(
    users.map((u) =>
      hasPermission(
        u.role,
        resource,
        action,
        u.permissions as Record<string, boolean> | null,
      ),
    ),
  );
  return users.filter((_, i) => allowed[i]).map((u) => u.id);
}

interface Reminder {
  key: string;
  recipients: string[];
  title: string;
  message: string;
  messageKey: string;
  params: Record<string, string>;
  actionUrl: string;
  entityType: string;
  entityId: string;
}

async function send(reminders: Reminder[]) {
  let sent = 0;
  for (const r of reminders) {
    if (!r.recipients.length) continue;
    const already = await db.notification.findMany({
      where: { eventKey: r.key, userId: { in: r.recipients } },
      select: { userId: true },
    });
    const done = new Set(already.map((n) => n.userId));
    const data = r.recipients
      .filter((id) => !done.has(id))
      .map((userId) => ({
        userId,
        title: r.title,
        message: r.message,
        type:
          r.params.days === "0" || r.params.days.startsWith("-")
            ? "warning"
            : "info",
        entityType: r.entityType,
        entityId: r.entityId,
        messageKey: r.messageKey,
        messageParams: r.params,
        actionUrl: r.actionUrl,
        eventKey: r.key,
      }));
    if (data.length) {
      await db.notification.createMany({ data });
      sent += data.length;
    }
  }
  return sent;
}

/**
 * Notifies HR about passports, CPRs, visas, permits and other employee documents, and settings managers
 * about company documents and tax certificates, at 60, 30 and 7 days before expiry and once expired.
 */
export async function sendExpiryReminders() {
  const reminders: Reminder[] = [];
  const [hr, admins, employeeDocs, companyDocs, taxes] = await Promise.all([
    usersWith("employees", "edit"),
    usersWith("settings", "write"),
    listExpiringEmployeeDocuments(STAGES[0]),
    db.companyDocument.findMany({
      where: {
        validUntil: { lte: new Date(Date.now() + STAGES[0] * 86400000) },
      },
      select: { id: true, titleEn: true, titleAr: true, validUntil: true },
    }),
    db.taxRate.findMany({
      where: {
        isActive: true,
        certificateValidUntil: {
          lte: new Date(Date.now() + STAGES[0] * 86400000),
        },
      },
      select: {
        id: true,
        code: true,
        nameEn: true,
        nameAr: true,
        certificateValidUntil: true,
      },
    }),
  ]);
  for (const doc of employeeDocs) {
    const stage = stageOf(doc.days);
    if (stage === null) continue;
    reminders.push({
      key: `expiry:employee:${doc.employeeId}:${doc.document}:${doc.label ?? ""}:${doc.expiryDate}:${stage}`,
      recipients: hr,
      title:
        doc.days < 0
          ? "Employee document expired"
          : "Employee document expiring",
      message: `${doc.nameEn}: ${doc.label ?? doc.document} ${doc.days < 0 ? "expired on" : "expires on"} ${doc.expiryDate}`,
      messageKey:
        doc.days < 0
          ? "expiryReminders.employeeExpired"
          : "expiryReminders.employeeExpiring",
      params: {
        nameEn: doc.nameEn,
        nameAr: doc.nameAr,
        document: doc.document,
        label: doc.label ?? "",
        date: doc.expiryDate,
        days: String(doc.days),
      },
      actionUrl: ROUTES.hr.employee(doc.employeeId),
      entityType: "employee",
      entityId: doc.employeeId,
    });
  }
  const today = Date.parse(
    new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10),
  );
  const daysTo = (d: Date) => Math.round((d.getTime() - today) / 86400000);
  for (const doc of companyDocs) {
    if (!doc.validUntil) continue;
    const days = daysTo(doc.validUntil);
    const stage = stageOf(days);
    if (stage === null) continue;
    const date = doc.validUntil.toISOString().slice(0, 10);
    reminders.push({
      key: `expiry:company-document:${doc.id}:${date}:${stage}`,
      recipients: admins,
      title:
        days < 0 ? "Company document expired" : "Company document expiring",
      message: `${doc.titleEn} ${days < 0 ? "expired on" : "expires on"} ${date}`,
      messageKey:
        days < 0
          ? "expiryReminders.companyExpired"
          : "expiryReminders.companyExpiring",
      params: {
        nameEn: doc.titleEn,
        nameAr: doc.titleAr ?? doc.titleEn,
        date,
        days: String(days),
      },
      actionUrl: ROUTES.company.documents,
      entityType: "company_document",
      entityId: doc.id,
    });
  }
  for (const tax of taxes) {
    if (!tax.certificateValidUntil) continue;
    const days = daysTo(tax.certificateValidUntil);
    const stage = stageOf(days);
    if (stage === null) continue;
    const date = tax.certificateValidUntil.toISOString().slice(0, 10);
    reminders.push({
      key: `expiry:tax-certificate:${tax.id}:${date}:${stage}`,
      recipients: admins,
      title: days < 0 ? "Tax certificate expired" : "Tax certificate expiring",
      message: `${tax.nameEn} ${days < 0 ? "expired on" : "expires on"} ${date}`,
      messageKey:
        days < 0
          ? "expiryReminders.companyExpired"
          : "expiryReminders.companyExpiring",
      params: {
        nameEn: tax.nameEn,
        nameAr: tax.nameAr,
        date,
        days: String(days),
      },
      actionUrl: ROUTES.settings.company,
      entityType: "tax_rate",
      entityId: tax.id,
    });
  }
  return send(reminders);
}
