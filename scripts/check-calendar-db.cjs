// Run: node scripts/check-calendar-db.cjs  (local database only; everything is rolled back)
// Who sees which calendar event (private, team, department, company, custom, managers above the creator), the dated
// work of each role (leave for managers and HR, deal shoots for sales), edit rights, and personal subscription links.
require("dotenv").config({ quiet: true });
require("ts-node").register({
  transpileOnly: true,
  skipProject: true,
  compilerOptions: {
    module: "CommonJS",
    target: "ES2022",
    moduleResolution: "Node",
    esModuleInterop: true,
    resolveJsonModule: true,
  },
});
const assert = require("node:assert/strict");
const { db } = require("../packages/database/src/db.ts");
const {
  transactionContext,
} = require("../packages/database/src/transaction-context.ts");
const cal = require("../packages/database/src/queries/calendar.ts");

const rollback = new Error("ROLLBACK_CALENDAR_TEST");
const D = (s) => new Date(`${s}T00:00:00Z`);

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname),
    "Run only against a local test/development database",
  );
  try {
    await db.$transaction(
      (tx) =>
        transactionContext.run(tx, async () => {
          const stamp = Date.now();
          const user = (name, role, managerId = null) =>
            tx.user.create({
              data: {
                email: `${name}-${stamp}@calendar.test`,
                fullName: name,
                passwordHash: "x",
                role,
                managerId,
              },
            });
          const ceo = await user("ceo", "admin");
          const lead = await user("lead", "production_manager", ceo.id);
          const alice = await user("alice", "sales", lead.id);
          const bob = await user("bob", "sales", lead.id);
          const finance = await user("fin", "accountant");
          const sales = await tx.department.create({
            data: { code: `S${stamp}`, nameEn: "Sales", nameAr: "المبيعات" },
          });
          const fin = await tx.department.create({
            data: { code: `F${stamp}`, nameEn: "Finance", nameAr: "المالية" },
          });
          const employee = (u, dept, n) =>
            tx.employee.create({
              data: {
                employeeNumber: `CAL-${stamp}-${n}`,
                userId: u.id,
                departmentId: dept.id,
                firstNameEn: u.fullName,
                lastNameEn: "T",
                firstNameAr: "ت",
                lastNameAr: "ت",
                jobTitleEn: "x",
                jobTitleAr: "x",
                hireDate: D("2190-01-01"),
              },
            });
          const aliceEmployee = await employee(alice, sales, 1);
          await employee(bob, sales, 2);
          await employee(lead, sales, 3);
          await employee(finance, fin, 4);

          const event = (creator, visibility, extra = {}) =>
            cal.createCalendarEvent({
              title: `${creator.fullName}-${visibility}`,
              start_date: "2199-03-10T08:00:00Z",
              end_date: "2199-03-10T09:00:00Z",
              created_by: creator.id,
              visibility,
              ...extra,
            });
          const priv = await event(alice, "private");
          const privWithBob = await event(alice, "private", {
            audience_user_ids: [bob.id],
          });
          const team = await event(alice, "team");
          const dept = await event(alice, "department");
          const deptShared = await event(alice, "department", {
            audience_department_ids: [fin.id],
          });
          const company = await event(alice, "company");
          const custom = await event(bob, "custom", {
            audience_roles: ["accountant"],
          });
          await assert.rejects(
            event(bob, "custom"),
            (e) =>
              e.message ===
              "Choose the people, departments or roles who can see the event",
          );

          const seen = async (u) =>
            new Set(
              (
                await cal.getCalendarFor(
                  u.id,
                  D("2199-03-01"),
                  D("2199-03-31"),
                  ["own", "shared"],
                )
              ).map((e) => e.id),
            );
          const [aliceSees, bobSees, leadSees, ceoSees, finSees] =
            await Promise.all([alice, bob, lead, ceo, finance].map(seen));
          for (const e of [priv, privWithBob, team, dept, deptShared, company])
            assert.ok(
              aliceSees.has(e.id),
              "the creator sees all of their own events",
            );
          assert.ok(
            !bobSees.has(priv.id) && bobSees.has(privWithBob.id),
            "private: only the people chosen",
          );
          assert.ok(
            !leadSees.has(priv.id),
            "private events stay private even from managers",
          );
          assert.ok(
            bobSees.has(team.id) &&
              leadSees.has(team.id) &&
              ceoSees.has(team.id),
            "team: peers and the managers above",
          );
          assert.ok(
            !finSees.has(team.id),
            "team events are not shown to other departments",
          );
          assert.ok(
            bobSees.has(dept.id) && !finSees.has(dept.id),
            "department: the creator's department",
          );
          assert.ok(
            finSees.has(deptShared.id),
            "a department chosen in addition sees it",
          );
          assert.ok(finSees.has(company.id), "company: everyone");
          assert.ok(
            finSees.has(custom.id) &&
              !aliceSees.has(custom.id) &&
              leadSees.has(custom.id),
            "custom: the roles chosen, plus the creator's managers",
          );

          const items = await cal.getCalendarFor(
            alice.id,
            D("2199-03-01"),
            D("2199-03-31"),
            ["own"],
          );
          assert.equal(
            items.find((e) => e.id === team.id).editable,
            true,
            "the creator can change their event",
          );
          assert.equal(
            (
              await cal.getCalendarFor(
                bob.id,
                D("2199-03-01"),
                D("2199-03-31"),
                ["shared"],
              )
            ).find((e) => e.id === team.id).editable,
            false,
            "others cannot",
          );

          // ---- role-related dates: Alice's approved leave shows to her manager, not to a peer
          const annual = await tx.leaveType.findFirstOrThrow({
            where: { code: "annual" },
          });
          await tx.leaveRequest.create({
            data: {
              employeeId: aliceEmployee.id,
              leaveTypeId: annual.id,
              startDate: D("2199-03-15"),
              endDate: D("2199-03-16"),
              days: 2,
              status: "approved",
              reason: "x",
            },
          });
          const leaveFor = async (u) =>
            (
              await cal.getCalendarFor(u.id, D("2199-03-01"), D("2199-03-31"), [
                "leave",
              ])
            ).length;
          assert.equal(
            await leaveFor(lead),
            1,
            "a manager sees their team's leave",
          );
          assert.equal(
            await leaveFor(alice),
            1,
            "the employee sees their own leave",
          );
          // Bob (sales) cannot read employees, so he sees only his own and his reports' leave.
          assert.equal(await leaveFor(bob), 0);

          await tx.crmDeal.create({
            data: {
              title: "Shoot X",
              shootDate: D("2199-03-20"),
              assignedTo: alice.id,
              dealStage: "production",
            },
          });
          const salesFor = async (u) =>
            (
              await cal.getCalendarFor(u.id, D("2199-03-01"), D("2199-03-31"), [
                "sales",
              ])
            ).filter((e) => e.title.includes("Shoot X")).length;
          assert.equal(
            await salesFor(alice),
            1,
            "the salesperson sees their deal's shoot day",
          );
          assert.equal(
            await salesFor(finance),
            0,
            "finance does not see sales dates",
          );

          // ---- personal subscription links
          await assert.rejects(
            cal.createCalendarFeedToken(alice.id, []),
            (e) => e.message === "Choose what your calendar link includes",
          );
          const token = await cal.createCalendarFeedToken(alice.id, [
            "own",
            "leave",
          ]);
          const resolved = await cal.resolveCalendarFeedToken(token);
          assert.deepEqual(
            [resolved.userId, resolved.layers],
            [alice.id, ["own", "leave"]],
          );
          const rotated = await cal.createCalendarFeedToken(alice.id, ["own"]);
          assert.equal(
            await cal.resolveCalendarFeedToken(token),
            null,
            "a new link replaces the old one",
          );
          assert.ok(await cal.resolveCalendarFeedToken(rotated));
          await tx.user.update({
            where: { id: alice.id },
            data: { isActive: false },
          });
          assert.equal(
            await cal.resolveCalendarFeedToken(rotated),
            null,
            "an inactive user's link stops working",
          );
          throw rollback;
        }),
      { timeout: 120000 },
    );
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log(
    "Calendar checks passed and rolled back: private, team, department, company and custom audiences, managers above the creator, edit rights, leave and sales dates by role, and personal subscription links.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
