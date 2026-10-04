"use server";
import { getTranslations } from "@ishoot/locales";
import {
  db,
  runAtomicMutation,
  createActivityLog,
  getCompanySettings,
} from "@ishoot/database";
import { requireAuth } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";
import {
  canManageSalaryDocuments,
  getAccessibleSalaryDocument,
  salaryDocumentSnapshot,
} from "../../lib/salary-documents";
import { revalidatePath } from "next/cache";
import { generateSalaryDocumentPdf } from "../../lib/pdf/salary-document-pdf";

export async function requestSalaryDocumentAction(data: {
  employeeId: string;
  kind: "payslip" | "salary_certificate";
  months: string[];
}) {
  const actor = await requireAuth();
  validateActionArguments("requestSalaryDocumentAction", { data });
  const employee = await db.employee.findUniqueOrThrow({
    where: { id: data.employeeId },
  });
  const manager = await canManageSalaryDocuments(actor);
  if (employee.userId !== actor.id && !manager)
    throw new Error("You can only request your own documents");
  const months = Array.from(new Set(data.months)).sort();
  if (
    data.kind === "payslip" &&
    (!months.length ||
      months.length > 24 ||
      months.some((value) => !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)))
  )
    throw new Error("Select between one and 24 valid months");
  const issued = manager || actor.role === "super_admin";
  const id = await runAtomicMutation(async () => {
    const document = await db.salaryDocument.create({
      data: {
        employeeId: employee.id,
        kind: data.kind,
        months: data.kind === "payslip" ? months : [],
        requestedById: actor.id,
        status: issued ? "issued" : "pending",
        reviewedById: issued ? actor.id : null,
        issuedAt: issued ? new Date() : null,
        snapshot: issued
          ? await salaryDocumentSnapshot(employee.id, data.kind, months)
          : undefined,
      },
    });
    await createActivityLog({
      user_id: actor.id,
      action: issued ? "issue" : "request",
      entity_type: "salary_document",
      entity_id: document.id,
      details: {
        kind: data.kind,
        months,
        employeeId: employee.id,
        autoApproved: actor.role === "super_admin",
      },
    });
    return document.id;
  });
  revalidatePath("/dashboard/hr/documents");
  revalidatePath("/dashboard/profile");
  revalidatePath(`/dashboard/hr/employees/${employee.id}`);
  return { success: true, id };
}

export async function reviewSalaryDocumentAction(
  id: string,
  decision: "issued" | "rejected",
  notes?: string,
) {
  const actor = await requireAuth();
  validateActionArguments("reviewSalaryDocumentAction", {
    id,
    decision,
    notes,
  });
  if (!(await canManageSalaryDocuments(actor)))
    throw new Error("HR and payroll permissions required");
  await runAtomicMutation(async () => {
    await db.$queryRaw`SELECT id FROM "SalaryDocument" WHERE id=${id} FOR UPDATE`;
    const document = await db.salaryDocument.findUniqueOrThrow({
      where: { id },
    });
    if (document.status !== "pending")
      throw new Error("Request has already been reviewed");
    const snapshot =
      decision === "issued"
        ? await salaryDocumentSnapshot(
            document.employeeId,
            document.kind,
            document.months as string[],
          )
        : undefined;
    await db.salaryDocument.update({
      where: { id },
      data: {
        status: decision,
        reviewedById: actor.id,
        reviewNotes: notes || null,
        snapshot,
        issuedAt: decision === "issued" ? new Date() : null,
      },
    });
    await createActivityLog({
      user_id: actor.id,
      action: decision,
      entity_type: "salary_document",
      entity_id: id,
      details: { before: document.status, after: decision, notes },
    });
  });
  revalidatePath("/dashboard/hr/documents");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/hr/employees");
  return { success: true };
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
