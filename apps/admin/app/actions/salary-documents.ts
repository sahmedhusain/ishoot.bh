"use server";
import {
  serverTemplates,
  formatMessage,
  serverMessages,
  getTranslations,
} from "@platform/locales";

import { ROUTES } from "../../constants/routes";

import {
  runAtomicMutation,
  createActivityLog,
  getCompanySettings,
  submitForApproval,
  findPendingApproval,
  decideApprovalRequest,
  measureOperation,
  getActiveIntegrationCredentials,
  getIntegrationRecord,
} from "@platform/database";
import { listEmployees } from "@platform/api-client";
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
  languages: Array<"ar" | "en">;
}) {
  return measureOperation("action:requestSalaryDocumentAction", async () => {
    const actor = await requireAuth();
    validateActionArguments("requestSalaryDocumentAction", { data });
    const employees = await listEmployees().catch(() => []);
    const employee = employees.find((e) => e.id === data.employeeId);
    if (!employee) throw new Error(serverMessages.employeeNotFound);
    if ((employee as any).userId === actor.id)
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
          formatMessage(serverTemplates.payrollIsNotApprovedYetFor0, {
            0: missing.join(", "),
          }),
        );
    }
    const { id, approvalStatus } = await runAtomicMutation(async () => {
      const docId = `saldoc_${Date.now()}`;
      const approval = await submitForApproval({
        targetType: "salary_document",
        targetId: docId,
        requesterId: (employee as any).userId ?? actor.id,
        policySnapshot: { kind: data.kind, months, languages },
      });
      await createActivityLog({
        user_id: actor.id,
        action: "request",
        entity_type: "salary_document",
        entity_id: docId,
        details: {
          kind: data.kind,
          months,
          languages,
          employeeId: employee.id,
          approvalStatus: approval.status,
        },
      });
      return { id: docId, approvalStatus: approval.status };
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
    await runAtomicMutation(async () => {
      const pending = await findPendingApproval("salary_document", id);
      if (!pending)
        throw new Error(serverMessages.requestHasAlreadyBeenReviewed);
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
    throw new Error(serverMessages.youCanViewDownloadOrPrintYourOwn);
  if (document.status !== "issued")
    throw new Error(serverMessages.onlyIssuedDocumentsCanBeSent);
  if (!document.languages.includes(locale))
    throw new Error(serverMessages.thisDocumentWasNotRequestedIn);
  const recipient = document.employee.email;
  if (!recipient)
    throw new Error(serverMessages.addTheEmployeeEmailBeforeSending);
  const h = getTranslations(locale).admin.hrExtensions;
  const attachment = await generateSalaryDocumentPdf(
    document,
    await getCompanySettings(),
    locale,
  );
  if (attachment.length > 2 * 1024 * 1024)
    throw new Error(serverMessages.pdfExceedsTheEmailAttachmentLimit);
  await runAtomicMutation(async () => {
    await createActivityLog({
      user_id: actor.id,
      action: "queue_email",
      entity_type: "salary_document",
      entity_id: id,
      details: { recipient },
    });
  });
  return { success: true, status: "queued" };
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
    throw new Error(serverMessages.youCanViewDownloadOrPrintYourOwn);
  if (document.status !== "issued")
    throw new Error(serverMessages.onlyIssuedDocumentsCanBeSent);
  if (!document.languages.includes(locale))
    throw new Error(serverMessages.thisDocumentWasNotRequestedIn);
  const integration = await getIntegrationRecord("whatsapp");
  const credentials = await getActiveIntegrationCredentials("whatsapp");
  if (!credentials) return { fallback: true };
  if (!credentials.phoneId || !credentials.token)
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
  const config = integration?.config as { apiVersion?: string } | null;
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

export async function payslipMonthsForEmployeeAction(employeeId: string) {
  validateActionArguments("payslipMonthsForEmployeeAction", { employeeId });
  const actor = await requireAuth();
  const employees = await listEmployees().catch(() => []);
  const employee = employees.find((e) => e.id === employeeId);
  if (!employee) throw new Error(serverMessages.employeeNotFound);
  if ((employee as any).userId !== actor.id && !(await canManageSalaryDocuments(actor)))
    throw new Error(serverMessages.youCanOnlyRequestYourOwnDocuments);
  return availablePayslipMonths(employeeId);
}
