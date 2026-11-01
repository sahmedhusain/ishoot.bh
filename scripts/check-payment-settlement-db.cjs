// Local disposable database only: real receipt/transaction queries, signed fake webhooks, no external HTTP; rolled back.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { db } = require("../packages/database/src/db.ts");
const { transactionContext } = require("../packages/database/src/transaction-context.ts");
const { encryptIntegrationCredentials } = require("../packages/database/src/services/integration-credentials.ts");
const { settleAttempt, handlePaymentWebhook, startOrderPayment } = require("../packages/database/src/queries/online-payments.ts");
const rollback = new Error("ROLLBACK_PAYMENT_SETTLEMENT_TEST");
const webhookSecret = "audit-webhook-secret-not-a-real-key";
const originalFetch = global.fetch;
let calls = 0;
global.fetch = async () => { calls++; throw new Error("External HTTP is forbidden in this check"); };

const signed = event => {
  const rawBody = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac("sha256", webhookSecret).update(`${timestamp}.${rawBody}`).digest("hex");
  return { rawBody, headers: new Headers({ "stripe-signature": `t=${timestamp},v1=${signature}` }) };
};
const capture = attempt => ({ state: "paid", paymentId: `pi_${attempt.id}`, amount: 12.5, currency: "BHD" });
const event = attempt => ({ id: `evt_${attempt.id}`, type: "checkout.session.completed", data: { object: { id: attempt.sessionId, payment_status: "paid", payment_intent: `pi_${attempt.id}`, amount_total: 12500, currency: "bhd", metadata: { attempt: attempt.id } } } });

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(url.hostname) && /_test$/.test(url.pathname), "Use a local disposable *_test database");
  try {
    await db.$transaction(tx => transactionContext.run(tx, async () => {
      await require("../packages/database/src/queries/integrations.ts").saveIntegrationSettings(
        "stripe",
        {
          isActive: true,
          values: { secretKey: "sk_test_audit_only", webhookSecret },
        },
        "check-settlement",
      );
      await tx.storeSettings.upsert({ where: { id: "default" }, create: { id: "default", paymentGateway: "stripe" }, update: { paymentGateway: "stripe" } });
      const create = async () => {
        const order = await tx.salesOrder.create({ data: { number: `AUDIT-${crypto.randomUUID()}`, name: "Settlement test buyer", paymentMethod: "online", subtotal: 12.5, total: 12.5, currency: "BHD" } });
        return tx.paymentAttempt.create({ data: { orderId: order.id, gateway: "stripe", sessionId: `cs_${crypto.randomUUID()}`, amount: 12.5, currency: "BHD", status: "pending" } });
      };
      for (const patch of [{ amount: undefined }, { currency: undefined }, { currency: "USD" }, { amount: 0 }, { amount: 10 }, { amount: 15 }, { paymentId: undefined }]) {
        const attempt = await create();
        assert.equal((await settleAttempt(attempt.id, { ...capture(attempt), ...patch })).state, "review");
        const order = await tx.salesOrder.findUniqueOrThrow({ where: { id: attempt.orderId } });
        assert.equal(Number(order.amountPaid), 0, "unverified money cannot credit an order");
        assert.equal(order.invoiceId, null, "unverified money cannot create a receipt/invoice");
        await assert.rejects(startOrderPayment(order.id, { url: "https://shop.example.test", locale: "en" }), /needs review/);
      }
      const first = await create();
      const request = event(first);
      await handlePaymentWebhook("stripe", signed(request));
      const paid = await tx.paymentAttempt.findUniqueOrThrow({ where: { id: first.id } });
      assert.equal(paid.status, "paid");
      assert.ok(paid.paymentId);
      const receipt = await tx.payment.findUniqueOrThrow({ where: { id: paid.paymentId } });
      assert.equal(Number(receipt.amount), 12.5);
      assert.equal(Number((await tx.salesOrder.findUniqueOrThrow({ where: { id: first.orderId } })).amountPaid), 12.5);
      assert.equal((await handlePaymentWebhook("stripe", signed(request))).duplicate, true);
      assert.equal(await tx.payment.count({ where: { invoiceId: receipt.invoiceId } }), 1, "webhook retries cannot duplicate receipts");
      const other = await create();
      assert.equal((await settleAttempt(other.id, { ...capture(other), paymentId: paid.gatewayPaymentId })).state, "review");
      assert.equal(Number((await tx.salesOrder.findUniqueOrThrow({ where: { id: other.orderId } })).amountPaid), 0);
      await tx.$executeRawUnsafe("SAVEPOINT duplicate_reference");
      await assert.rejects(tx.paymentAttempt.update({ where: { id: other.id }, data: { gatewayPaymentId: paid.gatewayPaymentId } }));
      await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT duplicate_reference");

      const orphan = await create();
      await tx.paymentAttempt.update({ where: { id: orphan.id }, data: { status: "paid", gatewayPaymentId: capture(orphan).paymentId } });
      await assert.rejects(startOrderPayment(orphan.orderId, { url: "https://shop.example.test", locale: "en" }), /needs review/);
      await settleAttempt(orphan.id, capture(orphan));
      assert.ok((await tx.paymentAttempt.findUniqueOrThrow({ where: { id: orphan.id } })).paymentId, "a verified recheck repairs a previously claimed payment without a receipt");

      const recover = await create();
      await settleAttempt(recover.id, { ...capture(recover), currency: undefined });
      assert.equal((await settleAttempt(recover.id, capture(recover))).state, "paid", "a verified recheck can resolve review without another charge");

      const fail = await create();
      await tx.$executeRawUnsafe("SAVEPOINT ledger_failure");
      await tx.$executeRawUnsafe("CREATE TEMP TABLE audit_payment_marker (id INT) ON COMMIT DROP");
      await tx.$executeRawUnsafe("CREATE FUNCTION pg_temp.audit_fail_payment() RETURNS trigger LANGUAGE plpgsql AS $body$ BEGIN RAISE EXCEPTION 'audit-ledger-failure'; END; $body$");
      await tx.$executeRawUnsafe('CREATE TRIGGER audit_payment_failure BEFORE INSERT ON "Payment" FOR EACH ROW EXECUTE FUNCTION pg_temp.audit_fail_payment()');
      await assert.rejects(handlePaymentWebhook("stripe", signed(event(fail))), /audit-ledger-failure/);
      await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT ledger_failure");
      assert.equal(await tx.paymentWebhookEvent.count({ where: { gateway: "stripe", eventId: event(fail).id } }), 0, "the failed receipt must not consume the webhook retry");
      assert.equal((await tx.paymentAttempt.findUniqueOrThrow({ where: { id: fail.id } })).status, "pending");
      await handlePaymentWebhook("stripe", signed(event(fail)));
      assert.equal((await tx.paymentAttempt.findUniqueOrThrow({ where: { id: fail.id } })).status, "paid");
      assert.equal(calls, 0);
      throw rollback;
    }), { timeout: 30000 });
  } catch (error) { if (error !== rollback) throw error; }
  finally { global.fetch = originalFetch; await db.$disconnect(); }
  console.log("Payment settlement checks passed: verified amounts/currencies, review holds, exact receipts, reference uniqueness, signed replay and ledger-failure rollback; fixtures rolled back.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
