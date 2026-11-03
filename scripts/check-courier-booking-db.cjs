// Controlled carrier/SQL regression: local disposable database only, mocked HTTP, all records rolled back.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { db } = require("../apps/admin/lib/database/db.ts");
const { transactionContext } = require("../apps/admin/lib/database/transaction-context.ts");
const { encryptIntegrationCredentials } = require("../apps/admin/lib/database/services/integration-credentials.ts");
const { handToAgency } = require("../apps/admin/lib/database/queries/couriers.ts");
const { assignShipment } = require("../apps/admin/lib/database/queries/fleet.ts");
const { moveShipment } = require("../apps/admin/lib/database/queries/shipments.ts");
const rollback = new Error("ROLLBACK_COURIER_BOOKING_TEST");
const secret = "courier-test-secret-not-a-real-key";
const originalFetch = global.fetch;
const originalError = console.error;
const logs = [];
let mode = "success";
let calls = 0;

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(url.hostname) && /_test$/.test(url.pathname), "Use a local disposable *_test database");
  console.error = (...args) => logs.push(args.join(" "));
  try {
    await db.$transaction(tx => transactionContext.run(tx, async () => {
      const actor = await tx.user.findFirstOrThrow({ where: { role: "super_admin", isActive: true }, select: { id: true } });
      const company = await tx.companySetting.findFirstOrThrow();
      await tx.companySetting.update({ where: { id: company.id }, data: { companyNameEn: "Carrier test sender", phone: "+97317000000", addressEn: "Road 1", city: "Manama", country: "Bahrain" } });
      await require("../apps/admin/lib/database/queries/integrations.ts").saveIntegrationSettings(
        "dhl_express",
        {
          isActive: true,
          values: {
            environment: "test",
            apiKey: "test-api-key",
            apiSecret: secret,
            accountNumber: "test-account",
          },
        },
        actor.id,
      );
      const agency = await tx.courierAgency.create({ data: { name: `Audit courier ${crypto.randomUUID()}`, kind: "dhl_express", isActive: true } });
      const order = await tx.salesOrder.create({ data: { number: `AUDIT-${crypto.randomUUID()}`, name: "Carrier test buyer", paymentMethod: "cod", subtotal: 12.5, total: 12.5, currency: "BHD" } });
      const create = (country = "Bahrain") => tx.shipment.create({ data: { number: `AUDIT-${crypto.randomUUID()}`, orderId: order.id, recipientName: "Carrier test buyer", recipientPhone: "+97336000000", promisedBy: new Date(), trackingToken: crypto.randomUUID(), address: { line1: "Road 2", city: "Muharraq", country }, codAmount: 12.5 } });
      const input = { agencyId: agency.id, fee: "2.5", weightKg: "1.75", lengthCm: "31", widthCm: "22", heightCm: "14" };
      global.fetch = async (address, init) => {
        calls++;
        assert.equal(new URL(address).pathname.endsWith("/shipments"), true);
        const body = JSON.parse(init.body);
        assert.deepEqual(body.content.packages, [{ weight: 1.75, dimensions: { length: 31, width: 22, height: 14 } }]);
        const shipment = await tx.shipment.findUniqueOrThrow({ where: { number: body.customerReferences[0].value } });
        assert.equal(shipment.courierBookingStatus, "pending", "claim must be durable before the remote call");
        assert.equal(shipment.agencyId, null, "an attempted booking is not a confirmed handover");
        if (mode === "failure") return new Response(JSON.stringify({ detail: `Service unavailable ${secret}` }), { status: 503 });
        if (mode === "changed") await tx.shipment.update({ where: { id: shipment.id }, data: { status: "cancelled" } });
        return new Response(JSON.stringify({ shipmentTrackingNumber: `TEST-${calls}`, ...(mode === "bad-label" ? { documents: [{ typeCode: "label", imageFormat: "PDF", content: Buffer.from("invalid pdf").toString("base64") }] } : {}) }), { status: 200 });
      };

      for (const invalid of [{ ...input, fee: "-1" }, { ...input, fee: "100000000000" }, { ...input, weightKg: "" }, { ...input, heightCm: "" }]) {
        const shipment = await create();
        await assert.rejects(handToAgency(shipment.id, invalid, actor.id));
        assert.equal((await tx.shipment.findUniqueOrThrow({ where: { id: shipment.id } })).courierBookingStatus, null);
      }
      await assert.rejects(handToAgency((await create("Atlantis")).id, input, actor.id));
      assert.equal(calls, 0, "fee, country and measurement validation happens before any carrier call");

      const racing = await create();
      const results = await Promise.allSettled([handToAgency(racing.id, input, actor.id), handToAgency(racing.id, input, actor.id)]);
      assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
      assert.equal(calls, 1, "competing submissions cannot buy two labels");
      assert.equal((await tx.shipment.findUniqueOrThrow({ where: { id: racing.id } })).trackingNumber, "TEST-1");

      mode = "failure";
      const uncertain = await create();
      await assert.rejects(handToAgency(uncertain.id, input, actor.id));
      assert.equal((await tx.shipment.findUniqueOrThrow({ where: { id: uncertain.id } })).courierBookingStatus, "unknown");
      const beforeRetry = calls;
      await assert.rejects(handToAgency(uncertain.id, input, actor.id));
      await assert.rejects(assignShipment(uncertain.id, { driverId: "" }, actor.id));
      await assert.rejects(moveShipment(uncertain.id, { to: "out_for_delivery" }, actor.id));
      assert.equal(calls, beforeRetry);
      await handToAgency(uncertain.id, { agencyId: agency.id, trackingNumber: "PORTAL-CONFIRMED" }, actor.id);
      assert.equal((await tx.shipment.findUniqueOrThrow({ where: { id: uncertain.id } })).courierBookingStatus, "confirmed");

      const closed = await create();
      await assert.rejects(handToAgency(closed.id, input, actor.id));
      await tx.shipment.update({ where: { id: closed.id }, data: { status: "cancelled" } });
      assert.equal((await handToAgency(closed.id, { agencyId: agency.id, trackingNumber: "LATE-PORTAL-TRACKING" }, actor.id)).needsAttention, true);
      assert.equal((await tx.shipment.findUniqueOrThrow({ where: { id: closed.id } })).status, "cancelled");
      assert.equal((await tx.shipment.findUniqueOrThrow({ where: { id: closed.id } })).trackingNumber, "LATE-PORTAL-TRACKING");

      const retry = await create();
      await assert.rejects(handToAgency(retry.id, input, actor.id));
      await tx.shipment.update({ where: { id: retry.id }, data: { courierBookingStartedAt: new Date(Date.now() - 121_000) } });
      await assert.rejects(handToAgency(retry.id, { ...input, confirmNoBooking: "wrong-reference" }, actor.id));
      mode = "success";
      await handToAgency(retry.id, { ...input, confirmNoBooking: retry.number }, actor.id);
      assert.equal((await tx.shipment.findUniqueOrThrow({ where: { id: retry.id } })).courierBookingStatus, "confirmed");

      mode = "bad-label";
      const missingLabel = await create();
      assert.equal((await handToAgency(missingLabel.id, input, actor.id)).labelUnavailable, true);
      assert.ok((await tx.shipment.findUniqueOrThrow({ where: { id: missingLabel.id } })).trackingNumber, "label failure must not lose the confirmed tracking number");
      mode = "changed";
      const changed = await create();
      assert.equal((await handToAgency(changed.id, input, actor.id)).needsAttention, true);
      assert.equal((await tx.shipment.findUniqueOrThrow({ where: { id: changed.id } })).status, "cancelled", "remote success must not reopen a concurrently cancelled shipment");
      assert.equal((await tx.shipment.findUniqueOrThrow({ where: { id: changed.id } })).courierBookingStatus, "review");
      assert.ok(!logs.join(" ").includes(secret), "raw provider credentials must never reach operation logs");
      throw rollback;
    }), { timeout: 20000 });
  } catch (error) { if (error !== rollback) throw error; }
  finally { global.fetch = originalFetch; console.error = originalError; await db.$disconnect(); }
  console.log("Courier booking checks passed: measured requests, preflight validation, claims, reconciliation, label persistence and state races; fixtures rolled back.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
