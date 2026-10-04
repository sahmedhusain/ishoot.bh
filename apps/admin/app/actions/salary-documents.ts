"use server";
import { getTranslations } from "@ishoot/locales";
import {
  db,
  runAtomicMutation,
  createActivityLog,
  getCompanySettings,
  submitForApproval,
  findPendingApproval,
  decideApprovalRequest,
  measureOperation,
} from "@ishoot/database";
import { requireAuth, requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";
import {
  availablePayslipMonths,
  canManageSalaryDocuments,
  getAccessibleSalaryDocument,
} from "../../lib/salary-documents";
import { revalidatePath } from "next/cache";
import { generateSalaryDocumentPdf } from "../../lib/pdf/salary-document-pdf";

export async function requestSalaryDocumentAction(data: {
  employeeId: string;
  kind: "payslip" | "salary_certificate";
  months: string[];
}) {
  return measureOperation("action:requestSalaryDocumentAction", async () => {
    const actor = await requireAuth();
    validateActionArguments("requestSalaryDocumentAction", { data });
    const employee = await db.employee.findUniqueOrThrow({
      where: { id: data.employeeId },
    });
    if (employee.userId === actor.id) await requirePermission("self_service", "create");
    else if (!(await canManageSalaryDocuments(actor)))
      throw new Error("You can only request your own documents");
    const months = Array.from(new Set(data.months)).sort();
    if (
      data.kind === "payslip" &&
      (!months.length ||
        months.length > 24 ||
        months.some((value) => !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)))
    )
      throw new Error("Select between one and 24 valid months");
    if (data.kind === "payslip") {
      const available = await availablePayslipMonths(employee.id);
      const missing = months.filter((month) => !available.includes(month));
      if (missing.length) throw new Error(`Payroll is not approved yet for: ${missing.join(", ")}`);
    }
    const { id, approvalStatus } = await runAtomicMutation(async () => {
      const document = await db.salaryDocument.create({
        data: {
          employeeId: employee.id,
          kind: data.kind,
          months: data.kind === "payslip" ? months : [],
          requestedById: actor.id,
          status: "pending",
        },
      });
      // The employee is the requester even when HR files on their behalf.
      const approval = await submitForApproval({
        targetType: "salary_document",
        targetId: document.id,
        requesterId: employee.userId ?? actor.id,
        policySnapshot: { kind: data.kind, months },
      });
      await createActivityLog({
        user_id: actor.id,
        action: "request",
        entity_type: "salary_document",
        entity_id: document.id,
        details: { kind: data.kind, months, employeeId: employee.id, approvalStatus: approval.status },
      });
      return { id: document.id, approvalStatus: approval.status };
    });
    revalidatePath("/dashboard/hr/documents");
    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard/approvals");
    revalidatePath(`/dashboard/hr/employees/${employee.id}`);
    return { success: true, id, approvalStatus };
  });
}

export async function reviewSalaryDocumentAction(
  id: string,
  decision: "issued" | "rejected",
  notes?: string,
) {
  return measureOperation("action:reviewSalaryDocumentAction", async () => {
    const actor = await requireAuth();
    validateActionArguments("reviewSalaryDocumentAction", { id, decision, notes });
    // Who may issue is defined by the salary document approval policy and enforced by the engine.
    await runAtomicMutation(async () => {
      const pending = await findPendingApproval("salary_document", id);
      if (!pending) throw new Error("Request has already been reviewed");
      const outcome = await decideApprovalRequest(
        pending.id,
        actor.id,
        decision === "issued" ? "approved" : "rejected",
        notes,
      );
      await createActivityLog({
        user_id: actor.id,
        action: decision,
        entity_type: "salary_document",
        entity_id: id,
        details: { notes, approvalStatus: outcome.status },
      });
    });
    revalidatePath("/dashboard/hr/documents");
    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard/approvals");
    revalidatePath("/dashboard/hr/employees");
    return { success: true };
  });
}

export async function emailSalaryDocumentAction(
  id: string,
  locale: "ar" | "en",
) {
  const actor = await requireAuth();
  validateActionArguments("emailSalaryDocumentAction", { id, locale });
  const document = await getAccessibleSalaryDocument(id, actor);
  if (document.status !== "issued")
    throw new Error("Only issued documents can be sent");
  const recipient = document.employee.email;
  if (!recipient) throw new Error("Add the employee email before sending");
  const h = getTranslations(locale).admin.hrExtensions;
  const attachment = await generateSalaryDocumentPdf(
    document,
    await getCompanySettings(),
    locale,
  );
  if (attachment.length > 2 * 1024 * 1024)
    throw new Error("PDF exceeds the email attachment limit");
  const job = await runAtomicMutation(async () => {
    const job = await db.emailJob.upsert({
      where: { eventKey: `salary:${id}:${locale}` },
      update: {},
      create: {
        eventKey: `salary:${id}:${locale}`,
        createdById: actor.id,
        recipient,
        subject: `${document.kind === "payslip" ? h.payslip : h.salary_certificate} · ${document.employee.employeeNumber}`,
        html: `<p>${h.emailBody}</p>`,
        attachmentName: `Salary-${id}.pdf`,
        attachment,
      },
    });
    await createActivityLog({
      user_id: actor.id,
      action: "queue_email",
      entity_type: "salary_document",
      entity_id: id,
      details: { jobId: job.id },
    });
    return job;
  });
  return { success: true, status: job.status };
}

export async function whatsappSalaryDocumentAction(
  id: string,
  locale: "ar" | "en",
) {
  const actor = await requireAuth();
  validateActionArguments("whatsappSalaryDocumentAction", { id, locale });
  const h = getTranslations(locale).admin.hrExtensions;
  const document = await getAccessibleSalaryDocument(id, actor);
  if (document.status !== "issued")
    throw new Error("Only issued documents can be sent");
  const integration = await db.integrationSetting.findUnique({
    where: { provider: "whatsapp" },
  });
  if (!integration?.isActive || !integration.credentials)
    return { fallback: true };
  const { decryptIntegrationCredentials } =
    await import("../../lib/integration-credentials");
  const credentials = decryptIntegrationCredentials(integration.credentials);
  if (!credentials?.phoneId || !credentials.token)
    throw new Error(h.configureWhatsApp);
  const recipient = document.employee.phone?.replace(/[\s()-]/g, "");
  if (!recipient || !/^\+[1-9]\d{6,14}$/.test(recipient))
    throw new Error(h.phoneInternational);
  const pdf = await generateSalaryDocumentPdf(
    document,
    await getCompanySettings(),
    locale,
  );
  const { sendWhatsAppDocument } = await import("../../lib/whatsapp-document");
  const config = integration.config as { apiVersion?: string } | null;
  let result;
  try {
    result = await sendWhatsAppDocument({
      phoneId: credentials.phoneId,
      token: credentials.token,
      recipient: recipient.slice(1),
      filename: `Salary-${id}.pdf`,
      pdf,
      version: config?.apiVersion,
    });
  } catch {
    await createActivityLog({
      user_id: actor.id,
      action: "whatsapp_failed",
      entity_type: "salary_document",
      entity_id: id,
    });
    throw new Error(h.whatsappFailed);
  }
  await createActivityLog({
    user_id: actor.id,
    action: "whatsapp_accepted",
    entity_type: "salary_document",
    entity_id: id,
    details: { messageId: result.messageId },
  });
  return { fallback: false, messageId: result.messageId };
}
