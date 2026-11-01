import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ setting: vi.fn(), fetch: vi.fn() }));
vi.mock("../../packages/database/src/queries/integrations", () => ({
  getIntegrationRecord: mocks.setting,
}));
vi.mock("@platform/database", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@platform/database");
  return {
    ...actual,
    getIntegrationRecord: mocks.setting,
  };
});
import { getResendCredentials, sendEmail } from "../../packages/email/src";

const secret = "re_settings_only_test_key";
const mail = {
  to: "recipient@example.test",
  subject: "Subject",
  html: "<p>Body</p>",
  idempotencyKey: "one-message",
};
beforeEach(() => {
  vi.stubEnv("ENCRYPTION_KEY", "01234567890123456789012345678901");
  vi.stubEnv("RESEND_API_KEY", "re_environment_test_key");
  vi.stubEnv("FROM_EMAIL", "legacy@example.test");
  vi.stubEnv("RESEND_WEBHOOK_SECRET", "legacy-webhook-secret");
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.fetch.mockImplementation(
    async () =>
      new Response(JSON.stringify({ id: "provider-receipt" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("encrypted email integration", () => {
  test("settings credentials drive actual delivery and preserve idempotency", async () => {
    mocks.setting.mockResolvedValue({
      isActive: true,
      credentials: {
        apiKey: secret,
        fromEmail: "settings@example.test",
        webhookSecret: "stored-signing-secret",
      },
    });
    expect(await sendEmail(mail)).toEqual({
      success: true,
      id: "provider-receipt",
    });
    const request = mocks.fetch.mock.calls[0][1] as RequestInit;
    expect(new Headers(request.headers).get("Authorization")).toBe(
      `Bearer ${secret}`,
    );
    expect(new Headers(request.headers).get("Idempotency-Key")).toBe(
      mail.idempotencyKey,
    );
    expect(JSON.parse(String(request.body))).toMatchObject({
      from: "settings@example.test",
      to: mail.to,
    });
    expect((await getResendCredentials())?.webhookSecret).toBe(
      "stored-signing-secret",
    );
  });
  test("explicit disconnect prevents legacy environment keys from sending mail", async () => {
    mocks.setting.mockResolvedValue({ isActive: false, credentials: null });
    expect((await sendEmail(mail)).success).toBe(false);
    expect(await getResendCredentials()).toBeNull();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  test("unreadable encrypted credentials do not fall back to environment keys", async () => {
    mocks.setting.mockResolvedValue({
      isActive: true,
      credentials: null,
    });
    expect((await sendEmail(mail)).success).toBe(false);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  test("environment-only legacy installations remain supported before a settings record exists", async () => {
    mocks.setting.mockResolvedValue(null);
    expect((await sendEmail(mail)).success).toBe(true);
    expect(
      new Headers(mocks.fetch.mock.calls[0][1].headers).get("Authorization"),
    ).toBe("Bearer re_environment_test_key");
  });
  test("provider errors are returned without exposing the API key or claiming delivery", async () => {
    mocks.setting.mockResolvedValue({
      isActive: true,
      credentials: {
        apiKey: secret,
        fromEmail: "settings@example.test",
      },
    });
    mocks.fetch.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            name: "validation_error",
            message: `Rejected ${secret}`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
    );
    const result = await sendEmail(mail);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).not.toContain(secret);
  });
});

test("Resend webhook verification accepts the stored signing secret instead of the environment value", async () => {
  const { Webhook } = await import("svix");
  const { verifyResendWebhook } =
    await import("../../apps/admin/lib/resend-webhook");
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

test("a settings read failure returns failure without losing the caller's queued job", async () => {
  mocks.setting.mockRejectedValueOnce(new Error("Database unavailable"));
  expect((await sendEmail(mail)).success).toBe(false);
  expect(mocks.fetch).not.toHaveBeenCalled();
});
