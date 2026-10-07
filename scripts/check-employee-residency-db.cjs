// Run: node scripts/check-employee-residency-db.cjs  (local database only; everything is rolled back)
// Employee identity (nationality, CPR, passport), visas, permits and other documents with costs and expiry,
// the monthly cost roll-up, the expiring-documents list and the reminders sent once per stage.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const { db } = require("../packages/database/src/db.ts");
const { transactionContext } = require("../packages/database/src/transaction-context.ts");
const ec = require("../packages/database/src/queries/employee-credentials.ts");
const { sendExpiryReminders } = require("../packages/database/src/services/expiry-reminders.ts");
const { expiryStatus, monthlyCost, needsWorkVisa } = require("../packages/database/src/constants/employee-documents.ts");

const rollback = new Error("ROLLBACK_RESIDENCY_TEST");
const rejects = (promise, message) => assert.rejects(promise, (error) => error.message === message);
const inDays = (n) => new Date(Date.now() + 3 * 3600000 + n * 86400000).toISOString().slice(0, 10);

async function main() {
  assert.equal(needsWorkVisa("BH"), false);
  assert.equal(needsWorkVisa("SA"), false);
  assert.equal(needsWorkVisa("IN"), true);
  assert.equal(monthlyCost(120, "yearly"), 10);
  assert.equal(monthlyCost(240, "term", 24), 10);
  assert.equal(monthlyCost(500, "one_time"), 0);
  assert.equal(expiryStatus(inDays(-1)).status, "expired");
  assert.deepEqual(expiryStatus(inDays(10)), { status: "expiring", days: 10 });
  assert.equal(expiryStatus(inDays(90)).status, "valid");

  try {
    await db.$transaction((tx) => transactionContext.run(tx, async () => {
      const employee = await tx.employee.findFirstOrThrow({ where: { status: "active" } });

      // ---- identity
      await rejects(ec.updateEmployeeIdentity(employee.id, { cpr_number: "12345" }), "A CPR number has 9 digits");
      await rejects(ec.updateEmployeeIdentity(employee.id, { nationality: "XX" }), "Choose a country from the list");
      await rejects(ec.updateEmployeeIdentity(employee.id, { date_of_birth: inDays(5) }), "Enter a valid date of birth");
      await ec.updateEmployeeIdentity(employee.id, {
        nationality: "IN", date_of_birth: "1990-04-02", gender: "male", cpr_number: " 900112233 ",
        cpr_expiry_date: inDays(20), passport_number: "z1234567", passport_country: "IN", passport_expiry_date: inDays(-3),
      });
      const stored = await tx.employee.findUniqueOrThrow({ where: { id: employee.id } });
      assert.equal(stored.cprNumber, "900112233");
      assert.equal(stored.passportNumber, "Z1234567", "passport numbers are upper-cased");

      // ---- documents and costs
      await rejects(ec.saveEmployeeCredential(employee.id, { kind: "spaceship" }), "Choose the document type");
      await rejects(ec.saveEmployeeCredential(employee.id, { kind: "visa", issue_date: inDays(10), expiry_date: inDays(1) }), "The expiry date cannot be before the issue date");
      await rejects(ec.saveEmployeeCredential(employee.id, { kind: "visa", cost_amount: 100 }), "Choose how often the cost is paid");
      await rejects(ec.saveEmployeeCredential(employee.id, { kind: "visa", cost_amount: 100, cost_frequency: "term" }), "Enter the number of months the cost covers (1 to 120)");
      await rejects(ec.saveEmployeeCredential(employee.id, { kind: "other" }), "Name the document");
      await tx.employeeCredential.deleteMany({ where: { employeeId: employee.id } });
      const visa = await ec.saveEmployeeCredential(employee.id, { kind: "visa", visa_type: "employment", number: "V-1", issuing_country: "BH", issue_date: inDays(-300), expiry_date: inDays(6), sponsor: "Company", cost_amount: 240, cost_frequency: "term", cost_term_months: 24 });
      await ec.saveEmployeeCredential(employee.id, { kind: "work_permit", number: "LMRA-1", cost_amount: 5, cost_frequency: "monthly" });
      await ec.saveEmployeeCredential(employee.id, { kind: "health_insurance", expiry_date: inDays(200), cost_amount: 120, cost_frequency: "yearly" });
      await ec.saveEmployeeCredential(employee.id, { kind: "driving_license", expiry_date: inDays(40), cost_amount: 30, cost_frequency: "yearly", paid_by: "employee" });
      await ec.saveEmployeeCredential(employee.id, { kind: "medical_fitness", cost_amount: 25, cost_frequency: "one_time" });
      const residency = await ec.getEmployeeResidency(employee.id);
      assert.equal(residency.credentials.length, 5);
      assert.equal(residency.monthlyCost, 10 + 5 + 10, "term, monthly and yearly company costs; employee-paid excluded");
      assert.equal(residency.yearlyCost, 300);
      assert.equal(residency.oneTimeCost, 25);
      assert.equal(residency.credentials[0].id, visa.id, "soonest expiry first");
      assert.equal(residency.credentials[0].status, "expiring");
      const other = await tx.employee.findFirst({ where: { id: { not: employee.id } } });
      if (other) await rejects(ec.saveEmployeeCredential(other.id, { kind: "visa", id: visa.id }), "Document not found");

      // ---- expiring list and reminders (once per stage)
      const expiring = (await ec.listExpiringEmployeeDocuments(60)).filter((r) => r.employeeId === employee.id);
      assert.deepEqual(expiring.map((r) => r.document), ["passport", "visa", "cpr", "driving_license"]);
      assert.equal(expiring[0].days, -3);
      await tx.notification.deleteMany({ where: { eventKey: { startsWith: `expiry:employee:${employee.id}:` } } });
      const first = await sendExpiryReminders();
      assert.ok(first > 0);
      const keys = await tx.notification.findMany({ where: { eventKey: { startsWith: `expiry:employee:${employee.id}:` } }, select: { eventKey: true, messageKey: true } });
      assert.ok(keys.some((k) => k.messageKey === "expiryReminders.employeeExpired"));
      assert.ok(keys.some((k) => k.eventKey.endsWith(":7")), "the visa is in its 7-day stage");
      const again = await sendExpiryReminders();
      const after = await tx.notification.count({ where: { eventKey: { startsWith: `expiry:employee:${employee.id}:` } } });
      assert.equal(after, keys.length, "no repeat reminders for the same stage");
      assert.ok(again <= first);

      await ec.deleteEmployeeCredential(visa.id);
      assert.equal(await tx.employeeCredential.count({ where: { id: visa.id } }), 0);
      throw rollback;
    }), { timeout: 60000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log("Employee residency checks passed and rolled back: identity validation, visas and permits with costs, monthly roll-up, expiring list, reminders once per stage.");
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => db.$disconnect());
