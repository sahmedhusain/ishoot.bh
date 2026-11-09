
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
