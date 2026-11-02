import { beforeEach, expect, it, vi } from "vitest";
import { serverMessages } from "../../packages/locales/src";

const db = vi.hoisted(() => ({
  inquiry: { findUnique: vi.fn(), update: vi.fn() },
  companySetting: { findFirst: vi.fn() },
  requestComment: { create: vi.fn() },
}));
vi.mock("../../packages/database/src/db", () => ({ db }));
const api = vi.hoisted(() => ({
  queueMessage: vi.fn(),
  getMessageStatus: vi.fn(),
}));
vi.mock("../../packages/api-client/src/index", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../packages/api-client/src/index")
  >()),
  ...api,
}));

import { replyToRequest } from "../../packages/database/src/queries/service-desk";
beforeEach(() => vi.clearAllMocks());

it("does not record a reply or advance its request when the mail queue refuses it", async () => {
  db.inquiry.findUnique.mockResolvedValue({
    id: "request-1",
    reference: "SR-2026-000001",
    email: "customer@example.test",
    locale: "en",
    name: "Customer",
    workflowStatus: "received",
  });
  db.companySetting.findFirst.mockResolvedValue({
    companyNameEn: "Example",
    companyNameAr: "مثال",
  });
  const send = vi.fn().mockResolvedValue(false);

  await expect(
    replyToRequest(
      "request-1",
      { channel: "email", body: "Reply" },
      { id: "staff-1" },
      send,
    ),
  ).rejects.toThrow(serverMessages.serviceReplyNotSent);
  expect(send).toHaveBeenCalledOnce();
  expect(db.requestComment.create).not.toHaveBeenCalled();
  expect(db.inquiry.update).not.toHaveBeenCalled();
});

it("offers a manual chat when notify refuses a WhatsApp reply", async () => {
  db.inquiry.findUnique.mockResolvedValue({
    id: "request-1",
    phoneE164: "+97336000010",
    workflowStatus: "received",
  });
  db.requestComment.create.mockResolvedValue({ id: "reply-1" });
  api.queueMessage.mockResolvedValue({ id: "message-1" });
  api.getMessageStatus.mockResolvedValue({ status: "failed" });
  const send = vi.fn();
  const result = await replyToRequest(
    "request-1",
    { channel: "whatsapp", body: "Reply" },
    { id: "staff-1" },
    send,
  );
  expect(result).toEqual({
    commentId: "reply-1",
    whatsappLink: "https://wa.me/97336000010?text=Reply",
  });
  expect(db.requestComment.create).toHaveBeenCalledOnce();
  expect(send).not.toHaveBeenCalled();
});
