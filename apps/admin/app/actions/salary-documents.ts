"use server";
import { serverTemplates, formatMessage, serverMessages, getTranslations } from "@ishoot/locales";

import { ROUTES } from "../../constants/routes";

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
  canShareSalaryDocument,
  getAccessibleSalaryDocument,
} from "../../lib/salary-documents";
import { revalidatePath } from "next/cache";
import { generateSalaryDocumentPdf } from "../../lib/pdf/salary-document-pdf";

export async function requestSalaryDocumentAction(data: {
  employeeId: string;
  kind: "payslip" | "salary_certificate";
  months: string[];
  /** The employee picks Arabic, English or both; each language is its own PDF. */
  languages: Array<"ar" | "en">;
}) {
  return measureOperation("action:requestSalaryDocumentAction", async () => {
    const actor = await requireAuth();
    validateActionArguments("requestSalaryDocumentAction", { data });
    const employee = await db.employee.findUniqueOrThrow({
      where: { id: data.employeeId },
    });
    if (employee.userId === actor.id)
      await requirePermission("self_service", "create");
    else if (!(await canManageSalaryDocuments(actor)))
      throw new Error(serverMessages.youCanOnlyRequestYourOwnDocuments);
    const months = Array.from(new Set(data.months)).sort();
    if (
      data.kind === "payslip" &&
      (!months.length ||
        months.length > 24 ||
        months.some((value) => !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)))
    )
      throw new Error(serverMessages.selectBetweenOneAnd24ValidMonths);
    const languages = (["ar", "en"] as const).filter((language) =>
      data.languages.includes(language),
    );
    if (!languages.length)
      throw new Error(serverMessages.chooseTheDocumentLanguageArabicEnglish);
    if (data.kind === "payslip") {
      const available = await availablePayslipMonths(employee.id);
      const missing = months.filter((month) => !available.includes(month));
      if (missing.length)
        throw new Error(
          formatMessage(serverTemplates.payrollIsNotApprovedYetFor0, { 0: missing.join(", ") }),
        );
    }
    const { id, approvalStatus } = await runAtomicMutation(async () => {
      const document = await db.salaryDocument.create({
        data: {
          employeeId: employee.id,
          kind: data.kind,
          months: data.kind === "payslip" ? months : [],
          languages: [...languages],
          requestedById: actor.id,
          status: "pending",
        },
      });
      // The employee is the requester even when HR files on their behalf.
      const approval = await submitForApproval({
        targetType: "salary_document",
        targetId: document.id,
        requesterId: employee.userId ?? actor.id,
        policySnapshot: { kind: data.kind, months, languages },
      });
      await createActivityLog({
        user_id: actor.id,
        action: "request",
        entity_type: "salary_document",
        entity_id: document.id,
        details: {
          kind: data.kind,
          months,
          languages,
          employeeId: employee.id,
          approvalStatus: approval.status,
        },
      });
      return { id: document.id, approvalStatus: approval.status };
    });
    revalidatePath(ROUTES.hr.documents());
    revalidatePath(ROUTES.profile());
    revalidatePath(ROUTES.approvals());
    revalidatePath(ROUTES.hr.employee(employee.id));
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
    validateActionArguments("reviewSalaryDocumentAction", {
      id,
      decision,
      notes,
    });
    // Who may issue is defined by the salary document approval policy and enforced by the engine.
    await runAtomicMutation(async () => {
      const pending = await findPendingApproval("salary_document", id);
      if (!pending) throw new Error(serverMessages.requestHasAlreadyBeenReviewed);
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
    revalidatePath(ROUTES.hr.documents());
    revalidatePath(ROUTES.profile());
    revalidatePath(ROUTES.approvals());
    revalidatePath(ROUTES.hr.employees);
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
  if (!(await canShareSalaryDocument(document, actor)))
    throw new Error(
      serverMessages.youCanViewDownloadOrPrintYourOwn,
    );
  if (document.status !== "issued")
    throw new Error(serverMessages.onlyIssuedDocumentsCanBeSent);
  if (!document.languages.includes(locale))
    throw new Error(serverMessages.thisDocumentWasNotRequestedIn);
  const recipient = document.employee.email;
  if (!recipient) throw new Error(serverMessages.addTheEmployeeEmailBeforeSending);
  const h = getTranslations(locale).admin.hrExtensions;
  const attachment = await generateSalaryDocumentPdf(
    document,
    await getCompanySettings(),
    locale,
  );
  if (attachment.length > 2 * 1024 * 1024)
    throw new Error(serverMessages.pdfExceedsTheEmailAttachmentLimit);
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
        attachmentName: `${document.kind === "payslip" ? "Payslip" : "Salary-Certificate"}-${document.employee.employeeNumber}-${locale.toUpperCase()}.pdf`,
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
  if (!(await canShareSalaryDocument(document, actor)))
    throw new Error(
      serverMessages.youCanViewDownloadOrPrintYourOwn,
    );
  if (document.status !== "issued")
    throw new Error(serverMessages.onlyIssuedDocumentsCanBeSent);
  if (!document.languages.includes(locale))
    throw new Error(serverMessages.thisDocumentWasNotRequestedIn);
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

/** HR filing a payslip for someone else needs that employee's payroll months. */
export async function payslipMonthsForEmployeeAction(employeeId: string) {
  validateActionArguments("payslipMonthsForEmployeeAction", { employeeId });
  const actor = await requireAuth();
  const employee = await db.employee.findUniqueOrThrow({
    where: { id: employeeId },
    select: { userId: true },
  });
  if (employee.userId !== actor.id && !(await canManageSalaryDocuments(actor)))
    throw new Error(serverMessages.youCanOnlyRequestYourOwnDocuments);
  return availablePayslipMonths(employeeId);
}
