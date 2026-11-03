import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ setting: vi.fn(), queue: vi.fn() }));
// The notify client as @platform/email sees it: one factory per specifier, as the package resolves differently.
const client = vi.hoisted(() => {
  class ApiError extends Error {
    constructor(
      readonly status: number,
      readonly code: string,
    ) {
      super(`backend answered ${status} ${code}`);
    }
  }
  const isApiError = (error: unknown, ...codes: string[]) =>
    error instanceof ApiError &&
    (codes.length === 0 || codes.includes(error.code));
  return { ApiError, isApiError };
});
vi.mock("@platform/api-client", () => ({
  queueMessage: mocks.queue,
  getIntegration: mocks.setting,
  isApiError: client.isApiError,
}));
vi.mock("../../lib/api", () => ({
  queueMessage: mocks.queue,
  getIntegration: mocks.setting,
  isApiError: client.isApiError,
}));
const { ApiError } = client;
import { getResendCredentials, sendEmail } from "../../lib/email";

const mail = {
  to: "recipient@example.test",
  subject: "Subject",
  html: "<p>Body</p>",
  idempotencyKey: "one-message",
};
beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "re_environment_test_key");
  vi.stubEnv("FROM_EMAIL", "legacy@example.test");
  vi.stubEnv("RESEND_WEBHOOK_SECRET", "legacy-webhook-secret");
  vi.clearAllMocks();
  let n = 0;
  mocks.queue.mockImplementation(async () => ({
    id: `message-${++n}`,
    status: "queued",
  }));
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("e-mail through the notify service", () => {
  test("each recipient is one queued message, keyed so a repeat never sends twice", async () => {
    const result = await sendEmail({
      ...mail,
      to: ["a@example.test", "b@example.test"],
      attachments: [{ filename: "slip.pdf", content: Buffer.from("%PDF") }],
    });
    expect(result).toEqual({ success: true, id: "message-1" });
    expect(mocks.queue).toHaveBeenCalledTimes(2);
    expect(
      mocks.queue.mock.calls.map(([input]) => [input.to, input.idempotencyKey]),
    ).toEqual([
      ["a@example.test", "one-message:0"],
      ["b@example.test", "one-message:1"],
    ]);
    expect(mocks.queue.mock.calls[0][0]).toMatchObject({
      channel: "email",
      subject: "Subject",
      html: "<p>Body</p>",
      attachments: [
        {
          filename: "slip.pdf",
          content: Buffer.from("%PDF").toString("base64"),
        },
      ],
    });
    await sendEmail(mail);
    expect(mocks.queue.mock.calls[2][0].idempotencyKey).toBe("one-message");
  });
  test("legacy environment keys never send: notify uses the integration IT set up", async () => {
    await sendEmail(mail);
    expect(JSON.stringify(mocks.queue.mock.calls)).not.toContain(
      "re_environment_test_key",
    );
    expect(JSON.stringify(mocks.queue.mock.calls)).not.toContain(
      "legacy@example.test",
    );
  });
  test("a refused message reports the reason; an outage reports failure without claiming delivery", async () => {
    mocks.queue.mockRejectedValueOnce(
      new ApiError(
        422,
        "validation_failed",
        "to is not an e-mail address",
        "request-1",
      ),
    );
    const refused = await sendEmail({ ...mail, to: "nobody" });
    expect(refused.success).toBe(false);
    expect(refused.error).toBe("Enter a valid e-mail address");
    mocks.queue.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));
    const down = await sendEmail(mail);
    expect(down.success).toBe(false);
    expect(down.error).not.toContain("ECONNREFUSED");
  });
  test("the webhook secret comes from the saved integration, else the environment; a disconnect stops it", async () => {
    mocks.setting.mockResolvedValueOnce({
      isActive: true,
      credentials: {
        apiKey: "re_key",
        fromEmail: "settings@example.test",
        webhookSecret: "stored-signing-secret",
      },
    });
    expect((await getResendCredentials())?.webhookSecret).toBe(
      "stored-signing-secret",
    );
    mocks.setting.mockResolvedValueOnce(null);
    expect(await getResendCredentials()).toEqual({
      apiKey: "",
      fromEmail: "",
      webhookSecret: "legacy-webhook-secret",
    });
    mocks.setting.mockResolvedValueOnce({ isActive: false, credentials: null });
    expect(await getResendCredentials()).toBeNull();
  });
});

test("Resend webhook verification accepts the stored signing secret instead of the environment value", async () => {
  const { Webhook } = await import("svix");
  const { verifyResendWebhook } =
    await import("../../../../apps/admin/lib/resend-webhook");
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
