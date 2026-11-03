// Run: node scripts/check-volume.cjs <database_test>
// Scale run for people and lists: fills a disposable database (name ending in _test, on this machine) with
// 2,000 employees (1,500 with accounts) in a nested department tree and 50,000 records (requests, deals,
// expenses), then times the lists people open every day and fails when one is slower than its budget.
// The database keeps the volume afterwards, so it can be opened in the browser (tests/e2e/serve.cjs).
const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const database = process.argv[2];
if (!/^[a-z0-9_]+_test$/.test(database ?? "")) {
  console.error("Usage: node scripts/check-volume.cjs <database_test>");
  process.exit(1);
}
const url = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)) throw new Error("Run only against a local database");
url.pathname = `/${database}`;
process.env.DATABASE_URL = process.env.DIRECT_URL = url.toString();
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const { db } = require("../apps/admin/lib/database/db.ts");

const EMPLOYEES = 2000;
const ACCOUNTS = 1500;
const RECORDS = { inquiry: 20000, crmDeal: 15000, expense: 15000 };
/** Milliseconds each list may take on a developer machine against a local database. */
const BUDGET_MS = 1500;

const pick = (list, i) => list[i % list.length];
const day = (offset) => new Date(Date.now() - offset * 86400000);

async function fill() {
  const marker = await db.user.count({ where: { email: { endsWith: "@volume.test" } } });
  if (marker >= ACCOUNTS) return console.log("Volume already present; timing only.");
  const owner = await db.user.findFirstOrThrow({ where: { role: "super_admin" }, select: { id: true } });
  // A department tree three levels deep.
  const roots = ["OPS", "SALES", "FIN", "HR", "WH"];
  const departments = [];
  for (const [r, root] of roots.entries()) {
    const top = await db.department.create({ data: { code: `V${root}`, nameEn: `Volume ${root}`, nameAr: `قسم ${root}`, sortOrder: 100 + r } });
    departments.push(top.id);
    for (let c = 0; c < 3; c++) {
      const child = await db.department.create({ data: { code: `V${root}${c}`, nameEn: `Volume ${root} ${c}`, nameAr: `قسم ${root} ${c}`, parentId: top.id } });
      departments.push(child.id);
      const leaf = await db.department.create({ data: { code: `V${root}${c}L`, nameEn: `Volume ${root} ${c} team`, nameAr: `فريق ${root} ${c}`, parentId: child.id } });
      departments.push(leaf.id);
    }
  }
  const roles = ["employee", "sales", "department_manager", "project_lead", "customer_service", "driver"];
  const users = Array.from({ length: ACCOUNTS }, (_, i) => ({
    email: `person${i}@volume.test`,
    fullName: `Person ${i} Volume`,
    passwordHash: "volume-not-a-hash",
    role: pick(roles, i),
    departmentId: pick(departments, i),
  }));
  for (let i = 0; i < users.length; i += 500) await db.user.createMany({ data: users.slice(i, i + 500) });
  const accounts = await db.user.findMany({ where: { email: { endsWith: "@volume.test" } }, select: { id: true, departmentId: true }, orderBy: { email: "asc" } });
  for (const [index, departmentId] of departments.entries()) await db.department.update({ where: { id: departmentId }, data: { managerId: accounts[index].id } });
  const employees = Array.from({ length: EMPLOYEES }, (_, i) => ({
    employeeNumber: `VOL-${String(i).padStart(5, "0")}`,
    userId: i < accounts.length ? accounts[i].id : null,
    departmentId: pick(departments, i),
    firstNameEn: `Person${i}`,
    lastNameEn: "Volume",
    firstNameAr: `شخص${i}`,
    lastNameAr: "تجريبي",
    jobTitleEn: pick(["Clerk", "Driver", "Agent", "Engineer"], i),
    jobTitleAr: pick(["كاتب", "سائق", "موظف", "مهندس"], i),
    hireDate: day(i % 900),
  }));
  for (let i = 0; i < employees.length; i += 500) await db.employee.createMany({ data: employees.slice(i, i + 500) });
  const ids = accounts.map((a) => a.id);
  const inquiries = Array.from({ length: RECORDS.inquiry }, (_, i) => ({
    reference: `VOL-SR-${String(i).padStart(6, "0")}`,
    name: `Volume customer ${i}`,
    email: `customer${i}@volume.test`,
    message: `Volume request ${i}`,
    workflowStatus: pick(["received", "assigned", "in_progress", "resolved"], i),
    assignedToId: i % 7 === 0 ? null : pick(ids, i),
    createdAt: day(i % 700),
  }));
  for (let i = 0; i < inquiries.length; i += 1000) await db.inquiry.createMany({ data: inquiries.slice(i, i + 1000) });
  const stages = ["lead", "proposal_sent", "contract_signed", "production", "delivered", "invoiced", "closed_won"];
  const deals = Array.from({ length: RECORDS.crmDeal }, (_, i) => ({ title: `Volume deal ${i}`, dealStage: pick(stages, i), dealValue: (i % 50) * 100, assignedTo: pick(ids, i * 3), createdAt: day(i % 700) }));
  for (let i = 0; i < deals.length; i += 1000) await db.crmDeal.createMany({ data: deals.slice(i, i + 1000) });
  const category = await db.expenseCategory.findFirstOrThrow({ select: { id: true } });
  const expenses = Array.from({ length: RECORDS.expense }, (_, i) => ({ categoryId: category.id, descriptionEn: `Volume expense ${i}`, descriptionAr: `مصروف ${i}`, amount: 10 + (i % 90), expenseDate: day(i % 700), createdById: pick(ids, i * 5) || owner.id, createdAt: day(i % 700) }));
  for (let i = 0; i < expenses.length; i += 1000) await db.expense.createMany({ data: expenses.slice(i, i + 1000) });
  console.log(`Filled ${EMPLOYEES} employees, ${ACCOUNTS} accounts, ${departments.length} departments and ${Object.values(RECORDS).reduce((a, b) => a + b, 0)} records.`);
}

async function main() {
  const started = Date.now();
  await fill();
  console.log(`Fill: ${((Date.now() - started) / 1000).toFixed(1)} s`);
  const users = require("../apps/admin/lib/database/queries/users.ts");
  const hrms = require("../apps/admin/lib/database/queries/hrms.ts");
  const directory = require("../apps/admin/lib/database/queries/directory.ts");
  const departments = require("../apps/admin/lib/database/queries/departments.ts");
  const scope = require("../apps/admin/lib/database/queries/data-scope.ts");
  const lists = require("../apps/admin/lib/database/queries/list-pages.ts");
  const requests = require("../apps/admin/lib/database/queries/requests.ts");
  const manager = await db.user.findFirstOrThrow({ where: { email: "person0@volume.test" }, select: { id: true } });
  await db.roleDataScope.upsert({ where: { role_area: { role: "department_manager", area: "deals" } }, create: { role: "department_manager", area: "deals", scope: "department" }, update: {} });
  const visible = await scope.scopedUserIds({ id: manager.id, role: "department_manager" }, "deals");
  const timings = [];
  const time = async (name, task) => {
    const start = performance.now();
    const result = await task();
    timings.push({ list: name, ms: Math.round(performance.now() - start) });
    return result;
  };
  await time("users page 1", () => users.getUsersPage({}));
  await time("users search", () => users.getUsersPage({ q: "Person 1234" }));
  await time("users by department, page 3", async () => users.getUsersPage({ departmentId: (await db.department.findFirstOrThrow({ where: { code: "VOPS" } })).id, page: 3 }));
  await time("employees page 40", () => hrms.listEmployees({ page: 40, pageSize: 25 }));
  await time("employees search", () => hrms.listEmployees({ search: "Person19" }));
  const people = await time("directory search", () => directory.getCompanyDirectory({ q: "Person 15" }));
  assert.ok(people.total > 0);
  await time("directory page 20", () => directory.getCompanyDirectory({ page: 20 }));
  await time("org chart", () => departments.getOrgChart());
  await time("department scope", () => scope.scopedUserIds({ id: manager.id, role: "department_manager" }, "deals"));
  await time("deals page 100", () => lists.getDealsPage({ page: "100" }));
  await time("deals in a department scope", () => lists.getDealsPage({}, undefined, visible));
  await time("expenses page 200", () => lists.getExpensesPage({ page: "200" }));
  await time("request inbox", () => requests.getRequestList({ status: "all" }, manager.id, 50));
  await time("request inbox in scope", () => requests.getRequestList({ status: "open" }, manager.id, 1, visible));
  console.table(timings);
  const slow = timings.filter((t) => t.ms > BUDGET_MS);
  assert.deepEqual(slow, [], `Slower than ${BUDGET_MS} ms: ${slow.map((t) => t.list).join(", ")}`);
  console.log(`Volume checks passed: ${timings.length} lists under ${BUDGET_MS} ms with ${EMPLOYEES} employees and ${Object.values(RECORDS).reduce((a, b) => a + b, 0)} records.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
