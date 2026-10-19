import { hasPermission } from "./auth";

/** Target types whose approval records a reader may see beyond their own queue. */
const READ_ACCESS: Array<[string, Parameters<typeof hasPermission>]> = [
  ["quotation", ["quotations", "read"]],
  ["invoice", ["invoices", "read"]],
  ["expense", ["expenses", "read"]],
  ["expense_claim", ["expenses", "read"]],
  ["payroll_run", ["payroll", "read"]],
  ["salary_document", ["payroll", "issue_send"]],
  ["leave_request", ["employees", "read"]],
  ["profile_change", ["profile_changes", "read"]],
  ["service_request", ["requests", "read"]],
  ["signature_change", ["users", "read"]],
  ["account_change", ["users", "read"]],
  ["final_settlement", ["payroll", "read"]],
  ["announcement", ["announcements", "read"]],
  ["official_letter", ["letters", "read"]],
];

export async function readableApprovalTypes(): Promise<string[]> {
  const readable = await Promise.all(
    READ_ACCESS.map(async ([type, [resource, action]]) =>
      (await hasPermission(resource, action)) ? type : null,
    ),
  );
  return readable.filter((type): type is string => type !== null);
}
