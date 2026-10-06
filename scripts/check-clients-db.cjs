// Run: node scripts/check-clients-db.cjs  (local database only; everything is rolled back)
// Client profiles: individual / company (local with CR, foreign with registration) / government, points of contact
// mirrored onto the client, CR uniqueness, and the client list's filters, sorting, ABC ranking and export batches.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const { db } = require("../packages/database/src/db.ts");
const { transactionContext } = require("../packages/database/src/transaction-context.ts");
const cp = require("../packages/database/src/queries/client-profiles.ts");

const rollback = new Error("ROLLBACK_CLIENTS_TEST");
const rejects = (promise, message) => assert.rejects(promise, (error) => error.message === message);

async function main() {
  try {
    await db.$transaction((tx) => transactionContext.run(tx, async () => {
      const tag = `zz-check-${Date.now()}`;
      // ---- validation per client type
      await rejects(cp.createClientProfile({ client_kind: "company", company: `${tag} Co`, company_origin: "local", contact_persons: [{ full_name: "A" }] }), "Enter the commercial registration (CR) number, e.g. 142859-1");
      await rejects(cp.createClientProfile({ client_kind: "company", company: `${tag} Co`, company_origin: "local", cr_number: "12345" , contact_persons: [{ full_name: "A" }] }), "Enter the commercial registration (CR) number, e.g. 142859-1");
      await rejects(cp.createClientProfile({ client_kind: "company", company: `${tag} Co`, company_origin: "local", cr_number: "9912345-1" }), "Add at least one point of contact");
      await rejects(cp.createClientProfile({ client_kind: "company", company: `${tag} Co`, company_origin: "foreign", registration_country: "BH", registration_number: "X", contact_persons: [{ full_name: "A" }] }), "Choose the country where the company is registered");
      await rejects(cp.createClientProfile({ client_kind: "company", company: `${tag} Co`, company_origin: "foreign", registration_country: "AE", contact_persons: [{ full_name: "A" }] }), "Enter the company's registration number");
      await rejects(cp.createClientProfile({ client_kind: "government", contact_persons: [{ full_name: "A" }] }), "Enter the government entity's name");
      await rejects(cp.createClientProfile({ client_kind: "individual" }), "Client name is required");
      await rejects(cp.createClientProfile({ client_kind: "company", company: `${tag} Co`, cr_number: "9912345-1", vat_number: "123", contact_persons: [{ full_name: "A" }] }), "A Bahrain VAT number has 15 digits");
      await rejects(cp.createClientProfile({ client_kind: "individual", full_name: "X", address: { country: "ZZ" } }), "Choose a country from the list");
      await rejects(cp.createClientProfile({ client_kind: "company", company: `${tag} Co`, cr_number: "9912345-1", contact_persons: [{ full_name: " " }] }), "Every point of contact needs a name");

      // ---- local company with several points of contact; the primary is mirrored onto the client
      const local = await cp.createClientProfile({
        client_kind: "company", company: `${tag} Local W.L.L.`, company_ar: "شركة محلية", company_origin: "local", cr_number: " 9912345-1 ",
        legal_form: "wll", vat_number: "200000000000003", industry: "hospitality", website: "example.bh", payment_terms_days: 45,
        address: { country: "BH", building: "123", road: "456", block: "789", area: "Seef", city: "Manama" },
        contact_persons: [
          { full_name: "Sara Ali", position: "Marketing Manager", department: "Marketing", email: "SARA@EXAMPLE.BH", phone: "+973 3900 0001" },
          { full_name: "Omar Hasan Khalil", position: "Procurement", department: "Finance", email: "omar@example.bh", is_primary: true },
          { full_name: "Mona Saleh", position: "CEO", is_primary: true },
        ],
      });
      assert.equal(local.client_kind, "company");
      assert.equal(local.cr_number, "9912345-1", "CR is trimmed");
      assert.equal(local.registration_country, "BH");
      assert.equal(local.website, "https://example.bh");
      assert.equal(local.contact_persons.length, 3);
      assert.deepEqual(local.contact_persons.map((p) => p.is_primary), [false, true, false], "exactly one primary: the first marked");
      assert.equal(local.first_name, "Omar");
      assert.equal(local.last_name, "Hasan Khalil");
      assert.equal(local.email, "omar@example.bh");
      assert.equal(local.job_title, "Procurement");
      assert.equal(local.contact_persons[0].email, "sara@example.bh", "e-mails are stored lower-case");
      assert.equal(local.address_details.block, "789");
      await rejects(
        cp.createClientProfile({ client_kind: "company", company: `${tag} Copy`, cr_number: "9912345-1", contact_persons: [{ full_name: "B" }] }),
        "Another client is already registered with this CR number",
      );

      // ---- partial update keeps the rest of the profile; switching to foreign drops the CR
      const renamed = await cp.updateClientProfile(local.id, { company: `${tag} Renamed` });
      assert.equal(renamed.cr_number, "9912345-1");
      assert.equal(renamed.contact_persons.length, 3);
      assert.equal(renamed.payment_terms_days, 45);
      const foreign = await cp.updateClientProfile(local.id, { company_origin: "foreign", registration_country: "AE", registration_number: "DMCC-778" });
      assert.equal(foreign.cr_number, undefined);
      assert.equal(foreign.registration_country, "AE");
      assert.equal(foreign.vat_number, "200000000000003", "a foreign tax number is not held to the Bahrain format");

      // ---- government and individual
      const gov = await cp.createClientProfile({
        client_kind: "government", company: `${tag} Ministry`, government_type: "ministry", supplier_number: "SUP-1", requires_purchase_order: true,
        contact_persons: [{ full_name: "Huda Isa", position: "Director", department: "Media" }],
      });
      assert.equal(gov.registration_country, "BH");
      assert.equal(gov.requires_purchase_order, true);
      const person = await cp.createClientProfile({ client_kind: "individual", full_name: `${tag} Person Name`, nationality: "BH", contact_persons: [{ full_name: "ignored" }] });
      assert.equal(person.first_name, `${tag}`);
      assert.equal(person.contact_persons.length, 0, "individuals have no points of contact");
      const toIndividual = await cp.updateClientProfile(gov.id, { client_kind: "individual", full_name: "Huda Isa" });
      assert.equal(toIndividual.company, undefined);
      assert.equal(toIndividual.contact_persons.length, 0);
      assert.equal(toIndividual.requires_purchase_order, false);

      // ---- list: filters, search through points of contact, sorting, ranking
      const search = await cp.getClientsPage({ q: "Procurement" });
      assert.equal(search.items.length, 0, "position is not searched");
      const byPerson = await cp.getClientsPage({ q: "Sara Ali" });
      assert.ok(byPerson.items.some((r) => r.id === local.id), "search covers points of contact");
      const byCr = await cp.getClientsPage({ q: "DMCC-778" });
      assert.deepEqual(byCr.items.map((r) => r.id), [local.id]);
      const foreignOnly = await cp.getClientsPage({ origin: "foreign", q: tag });
      assert.deepEqual(foreignOnly.items.map((r) => r.id), [local.id]);
      // The ministry was turned into an individual named "Huda Isa", so only two records still carry the tag.
      const individuals = await cp.getClientsPage({ kind: "individual", q: tag });
      assert.deepEqual(individuals.items.map((r) => r.id), [person.id]);
      const huda = await cp.getClientsPage({ kind: "individual", q: "Huda Isa" });
      assert.ok(huda.items.some((r) => r.id === gov.id));
      const never = await cp.getClientsPage({ balance: "never_billed", q: tag });
      assert.equal(never.items.length, 2);
      const sortedAsc = await cp.getClientsPage({ q: tag, sort: "name_asc" });
      const names = sortedAsc.items.map((r) => (r.company || r.full_name).toLowerCase());
      assert.deepEqual(names, [...names].sort());
      assert.ok(sortedAsc.summary.total >= 3);
      for (const sort of ["oldest", "rank", "revenue_desc", "revenue_asc", "outstanding_desc", "activity_desc", "activity_asc", "name_desc"]) await cp.getClientsPage({ sort });
      const invalid = cp.clientListParameters({ kind: "x", sort: "drop table", country: "ZZ", tier: "Q" });
      assert.deepEqual([invalid.kind, invalid.sort, invalid.country, invalid.tier], ["all", "newest", "all", "all"]);

      // Ranking: ABC tiers over billed revenue, ranks are consecutive and A comes first.
      const ranked = await cp.getClientsPage({ sort: "rank" });
      const withRank = ranked.items.filter((r) => r.rank);
      withRank.forEach((r, index) => assert.equal(r.rank, index + 1));
      const tierOrder = { A: 0, B: 1, C: 2 };
      for (let i = 1; i < withRank.length; i++) assert.ok(tierOrder[withRank[i].tier] >= tierOrder[withRank[i - 1].tier], "tiers follow the rank order");
      for (let i = 1; i < withRank.length; i++) assert.ok(withRank[i].billed <= withRank[i - 1].billed);
      if (withRank.length) {
        assert.equal(withRank[0].tier, "A");
        const standing = await cp.getClientStanding(withRank[0].id);
        assert.equal(standing.rank, 1);
        const tierA = await cp.getClientsPage({ tier: "A" });
        assert.ok(tierA.items.every((r) => r.tier === "A"));
      }

      // ---- export batches walk every match in id order
      const batch = await cp.getClientsPage({ q: tag }, { batchSize: 2 });
      assert.equal(batch.items.length, 2);
      assert.ok(batch.items[0].id < batch.items[1].id);
      const next = await cp.getClientsPage({ q: tag }, { batchSize: 2, after: batch.items[1].id });
      assert.equal(next.items.length, 0);
      const first = await cp.getClientsPage({ q: tag }, { batchSize: 1 });
      const rest = await cp.getClientsPage({ q: tag }, { batchSize: 5, after: first.items[0].id });
      assert.deepEqual(rest.items.map((r) => r.id), [batch.items[1].id]);

      throw rollback;
    }), { timeout: 60000 });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log("Client checks passed and rolled back: individual, local and foreign company and government profiles, points of contact with one primary, CR uniqueness, filters, sorting, ABC ranking and export batches.");
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => db.$disconnect());
