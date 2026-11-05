import { expect, test } from "vitest";
import { Webhook } from "svix";
import { verifyResendWebhook } from "../../lib/resend-webhook";

test("webhook verification accepts the stored signing secret instead of the environment value", () => {
  const signingSecret = `whsec_${Buffer.from("test-only-signing-material").toString("base64")}`;
  const payload = JSON.stringify({
    type: "email.delivered",
    data: { email_id: "test-message" },
  });
  const date = new Date();
  const id = "test-webhook-id";
  const signature = new Webhook(signingSecret).sign(id, date, payload);
  const headers = new Headers({
    "svix-id": id,
    "svix-timestamp": String(Math.floor(date.getTime() / 1000)),
    "svix-signature": signature,
  });

  expect(verifyResendWebhook(payload, headers, signingSecret).id).toBe(id);
  expect(() => verifyResendWebhook(payload, headers, "")).toThrow(
    "WEBHOOK_NOT_CONFIGURED",
  );
});
