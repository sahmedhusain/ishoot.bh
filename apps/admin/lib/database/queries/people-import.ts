import { randomBytes } from "node:crypto";
import { db } from "../atomic";
import { createEmployee } from "./hrms";
import { createUser } from "./users";

/** Columns of the employee and account import (HR → Employees → Import), in template order. */
export const PEOPLE_IMPORT_COLUMNS = [
  "first_name_en",
  "last_name_en",
  "first_name_ar",
  "last_name_ar",
  "job_title_en",
  "job_title_ar",
  "department_code",
  "hire_date",
  "basic_salary",
  "email",
  "phone",
  "account_role",
  "manager_email",
] as const;
export type PeopleImportColumn = (typeof PEOPLE_IMPORT_COLUMNS)[number];
/** One row of the file, by column name (every cell is text, any may be empty). */
export interface PeopleImportRow {
  first_name_en?: string;
  last_name_en?: string;
  first_name_ar?: string;
  last_name_ar?: string;
  job_title_en?: string;
  job_title_ar?: string;
  department_code?: string;
  hire_date?: string;
  basic_salary?: string;
  email?: string;
  phone?: string;
  account_role?: string;
  manager_email?: string;
}

/** Problems a row can have; the admin copy names each one (`peopleImport.problems.<code>`). */
export type PeopleImportProblem =
  | "nameRequired"
  | "titleRequired"
  | "dateInvalid"
  | "salaryInvalid"
  | "payNotAllowed"
  | "departmentUnknown"
  | "emailInvalid"
  | "emailTaken"
  | "emailRepeated"
  | "roleUnknown"
  | "roleNotAllowed"
  | "accountNeedsEmail"
  | "accountsNotAllowed"
  | "managerUnknown";

export interface PeopleImportCheck {
  /** 1-based row number in the file, after the header. */
  row: number;
  problems: PeopleImportProblem[];
  /** The row will also create a staff account. */
  account: boolean;
}

export interface PeopleImportOptions {
  /** May set salaries (payroll:edit). */
  canSetPay: boolean;
  /** May create staff accounts (users:write). */
  canCreateAccounts: boolean;
  /** Roles the importer may give (never super_admin). */
  assignableRoles: string[];
}

export const PEOPLE_IMPORT_LIMIT = 2000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const clean = (row: PeopleImportRow) =>
  Object.fromEntries(
    PEOPLE_IMPORT_COLUMNS.map((column) => [
      column,
      (row[column] ?? "").toString().trim().slice(0, 200),
    ]),
  ) as Record<PeopleImportColumn, string>;

/** Checks every row without saving anything: the preview the importer reviews before importing. */
export async function checkPeopleImport(
  input: PeopleImportRow[],
  options: PeopleImportOptions,
): Promise<PeopleImportCheck[]> {
  const rows = input.slice(0, PEOPLE_IMPORT_LIMIT).map(clean);
  const [departments, roles, users] = await Promise.all([
    db.department.findMany({ select: { code: true } }),
    db.role.findMany({ select: { id: true } }),
    db.user.findMany({
      where: {
        email: {
          in: rows
            .flatMap((r) => [r.email, r.manager_email])
            .filter(Boolean)
            .map((e) => e.toLowerCase()),
        },
      },
      select: { email: true },
    }),
  ]);
  const codes = new Set(departments.map((d) => d.code.toUpperCase()));
  const roleIds = new Set(roles.map((r) => r.id));
  const existing = new Set(users.map((u) => u.email.toLowerCase()));
  const importedEmails = new Map<string, number>();
  for (const row of rows)
    if (row.email)
      importedEmails.set(
        row.email.toLowerCase(),
        (importedEmails.get(row.email.toLowerCase()) ?? 0) + 1,
      );
  const accountEmails = new Set(
    rows
      .filter((r) => r.account_role && r.email)
      .map((r) => r.email.toLowerCase()),
  );
  return rows.map((row, index) => {
    const problems: PeopleImportProblem[] = [];
    if (
      !(row.first_name_en || row.first_name_ar) ||
      !(row.last_name_en || row.last_name_ar)
    )
      problems.push("nameRequired");
    if (!row.job_title_en && !row.job_title_ar) problems.push("titleRequired");
    if (
      row.hire_date &&
      (!DATE.test(row.hire_date) || !Number.isFinite(Date.parse(row.hire_date)))
    )
      problems.push("dateInvalid");
    if (row.basic_salary) {
      const salary = Number(row.basic_salary);
      if (!Number.isFinite(salary) || salary < 0)
        problems.push("salaryInvalid");
      else if (salary > 0 && !options.canSetPay) problems.push("payNotAllowed");
    }
    if (row.department_code && !codes.has(row.department_code.toUpperCase()))
      problems.push("departmentUnknown");
    const email = row.email.toLowerCase();
    if (email && !EMAIL.test(email)) problems.push("emailInvalid");
    if (email && (importedEmails.get(email) ?? 0) > 1)
      problems.push("emailRepeated");
    if (row.account_role) {
      if (!options.canCreateAccounts) problems.push("accountsNotAllowed");
      else if (!email) problems.push("accountNeedsEmail");
      if (email && existing.has(email)) problems.push("emailTaken");
      if (!roleIds.has(row.account_role)) problems.push("roleUnknown");
      else if (!options.assignableRoles.includes(row.account_role))
        problems.push("roleNotAllowed");
    }
    const manager = row.manager_email.toLowerCase();
    if (manager && !existing.has(manager) && !accountEmails.has(manager))
      problems.push("managerUnknown");
    return { row: index + 1, problems, account: !!row.account_role && !!email };
  });
}

/**
 * Imports the rows that passed checkPeopleImport: an employee record for each, and a staff account where the row
 * gives a role (with a random password; the person sets their own through "Forgot password"). Managers are linked
 * once every account exists. Rows with problems are skipped.
 */
export async function importPeople(
  input: PeopleImportRow[],
  actorId: string,
  options: PeopleImportOptions,
) {
  const checks = await checkPeopleImport(input, options);
  const rows = input.slice(0, PEOPLE_IMPORT_LIMIT).map(clean);
  const departments = new Map<string, string>(
    (await db.department.findMany({ select: { id: true, code: true } })).map(
      (d: any) => [d.code.toUpperCase(), d.id],
    ),
  );
  let employees = 0;
  let accounts = 0;
  const managerLinks: { userId: string; managerEmail: string }[] = [];
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (checks[index].problems.length) continue;
    const departmentId = row.department_code
      ? (departments.get(row.department_code.toUpperCase()) ?? null)
      : null;
    let userId: string | undefined;
    if (checks[index].account) {
      const user = await createUser({
        full_name:
          `${row.first_name_en || row.first_name_ar} ${row.last_name_en || row.last_name_ar}`.trim(),
        email: row.email,
        password: randomBytes(24).toString("base64url"),
        role: row.account_role,
        phone: row.phone || undefined,
        department_id: departmentId,
      });
      userId = user.id;
      accounts++;
      if (row.manager_email)
        managerLinks.push({
          userId,
          managerEmail: row.manager_email.toLowerCase(),
        });
    }
    await createEmployee(
      {
        userId,
        firstNameEn: row.first_name_en || row.first_name_ar,
        lastNameEn: row.last_name_en || row.last_name_ar,
        firstNameAr: row.first_name_ar || row.first_name_en,
        lastNameAr: row.last_name_ar || row.last_name_en,
        jobTitleEn: row.job_title_en || row.job_title_ar,
        jobTitleAr: row.job_title_ar || row.job_title_en,
        email: row.email || null,
        phone: row.phone || null,
        departmentId,
        hireDate: row.hire_date ? new Date(row.hire_date) : new Date(),
        basicSalary: Number(row.basic_salary) || 0,
      },
      actorId,
    );
    employees++;
  }
  for (const link of managerLinks) {
    const manager = await db.user.findUnique({
      where: { email: link.managerEmail },
      select: { id: true },
    });
    if (manager && manager.id !== link.userId)
      await db.user.update({
        where: { id: link.userId },
        data: { managerId: manager.id },
      });
  }
  return {
    employees,
    accounts,
    skipped: checks.filter((check) => check.problems.length).length,
  };
}
