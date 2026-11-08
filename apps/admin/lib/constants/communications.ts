// Announcements and official letters vocabulary. Runtime-free so client components can import it.

export const ANNOUNCEMENT_CATEGORIES = [
  "general",
  "policy",
  "hr",
  "holiday",
  "event",
  "operations",
  "urgent",
] as const;
export const ANNOUNCEMENT_PRIORITIES = [
  "normal",
  "important",
  "urgent",
] as const;
export const ANNOUNCEMENT_AUDIENCES = [
  "company",
  "team",
  "departments",
  "roles",
  "people",
] as const;
export const LETTER_CLASSIFICATIONS = [
  "external",
  "internal",
  "confidential",
] as const;
export const LETTER_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "cancelled",
] as const;

/** Placeholders a letter template may use; each is filled from the company, the recipient, an employee or the letter. */
export const LETTER_PLACEHOLDERS = [
  "company.name",
  "company.cr",
  "company.address",
  "company.phone",
  "company.email",
  "date",
  "reference",
  "recipient.name",
  "recipient.title",
  "recipient.organization",
  "employee.name",
  "employee.number",
  "employee.jobTitle",
  "employee.department",
  "employee.hireDate",
  "employee.cpr",
  "employee.nationality",
  "employee.passport",
  "employee.basicSalary",
  "employee.grossSalary",
  "purpose",
] as const;
