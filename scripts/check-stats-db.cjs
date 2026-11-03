// Run: node scripts/check-stats-db.cjs  (local database only; everything is rolled back)
// Website statistics: typed-in values, live presets, rounding and suffixes.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const { db } = require("../apps/admin/lib/database/db.ts");
const { transactionContext } = require("../apps/admin/lib/database/transaction-context.ts");
const stats = require("../apps/admin/lib/database/queries/stats.ts");

const rollback = new Error("ROLLBACK_STATS_TEST");
const labels = { labelEn: "Label", labelAr: "تسمية" };

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(url.hostname), "Run only against a local test/development database");
  try {
    await db.$transaction((tx) => transactionContext.run(tx, async () => {
      const stamp = Date.now();
      const value = (row) => stats.computeStatisticValue(row);
      const preset = (name, extra = {}) => ({ value: "", source: "preset", preset: name, presetParam: null, roundTo: null, suffix: null, ...extra });

      // Each preset counts exactly what it says.
      const before = {};
      for (const name of ["projects_delivered", "clients_served", "team_members", "portfolio_projects", "five_star_reviews"]) before[name] = Number(await value(preset(name)));
      const a = await tx.crmContact.create({ data: { firstName: "Stat", lastName: "A" } });
      const b = await tx.crmContact.create({ data: { firstName: "Stat", lastName: "B" } });
      await tx.crmDeal.create({ data: { currency: "BHD", title: "Won", dealStage: "closed_won", contactId: a.id } });
      await tx.crmDeal.create({ data: { currency: "BHD", title: "Lost", dealStage: "closed_lost", contactId: a.id } });
      const inv = (clientId, status, n) => tx.invoice.create({ data: { currency: "BHD", invoiceNumber: `STAT-${stamp}-${n}`, clientId, status, dueDate: new Date() } });
      await inv(a.id, "sent", 1); await inv(a.id, "paid", 2); await inv(b.id, "draft", 3); await inv(b.id, "void", 4);
      const emp = (status, n) => tx.employee.create({ data: { employeeNumber: `STAT-${stamp}-${n}`, firstNameEn: "S", lastNameEn: "T", firstNameAr: "س", lastNameAr: "ت", jobTitleEn: "Crew", jobTitleAr: "طاقم", hireDate: new Date(), status } });
      await emp("active", 1); await emp("terminated", 2);
      await tx.portfolioItem.create({ data: { slug: `stat-${stamp}`, titleEn: "P", titleAr: "ب", clientName: "C", year: 2026, thumbnailUrl: "/x.jpg" } });
      const review = (rating, isApproved) => tx.review.create({ data: { authorEn: "A", authorAr: "أ", quoteEn: "Q", quoteAr: "ق", rating, isApproved } });
      await review(5, true); await review(5, false); await review(4, true);
      const delta = async (name) => Number(await value(preset(name))) - before[name];
      assert.equal(await delta("projects_delivered"), 1, "only won deals");
      assert.equal(await delta("clients_served"), 1, "distinct clients with an issued invoice; drafts and voids excluded");
      assert.equal(await delta("team_members"), 1, "only active employees");
      assert.equal(await delta("portfolio_projects"), 1);
      assert.equal(await delta("five_star_reviews"), 1, "approved five-star reviews only");

      // Years in business, rounding down and suffix.
      const now = new Date("2026-10-06");
      assert.equal(await stats.computeStatisticValue(preset("years_in_business", { presetParam: 2015, suffix: "+" }), now), "11+");
      assert.equal(await stats.computeStatisticValue(preset("years_in_business", { presetParam: 1990, roundTo: 10 }), now), "30");
      assert.equal(await stats.computeStatisticValue({ ...preset(null), source: "manual", value: "8K" }), "8K");

      // Validation: manual rows drop preset settings; presets need their inputs.
      await assert.rejects(stats.createStatistic({ ...labels, value: "", source: "manual" }), /Enter a value/);
      await assert.rejects(stats.createStatistic({ ...labels, value: "", source: "preset" }), /Choose what to count/);
      await assert.rejects(stats.createStatistic({ ...labels, value: "", source: "preset", preset: "years_in_business" }), /founding year/);
      await assert.rejects(stats.createStatistic({ ...labels, value: "", source: "preset", preset: "team_members", roundTo: 0 }), /Round to/);
      const manual = await stats.createStatistic({ ...labels, value: "150+", source: "manual", suffix: "x", roundTo: 5 });
      assert.deepEqual([manual.preset, manual.roundTo, manual.suffix], [null, null, null]);
      const live = await stats.updateStatistic(manual.id, { source: "preset", preset: "five_star_reviews", suffix: " ★" });
      assert.deepEqual([live.source, live.preset, live.suffix], ["preset", "five_star_reviews", "★"]);
      const resolved = (await stats.getStatistics()).find((s) => s.id === manual.id);
      assert.equal(resolved.value, `${before.five_star_reviews + 1}★`, "getStatistics resolves the website value");
      assert.equal(resolved.storedValue, "150+", "the typed value is kept for switching back");
      const back = await stats.updateStatistic(manual.id, { source: "manual" });
      assert.deepEqual([back.value, back.preset, back.suffix], ["150+", null, null]);
      throw rollback;
    }), { timeout: 30000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log("Statistics database checks passed and rolled back: six presets, rounding, suffix, validation, resolved website values.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
