import { serverMessages } from "@platform/locales";
import { listTableRows } from "./api/tables";
import { requirePermission } from "./auth";
export async function requireInquiryAccess(
  id: string,
  action: "read" | "write" | "delete",
) {
  await requirePermission("leads", action);
  const inquiries = await listTableRows<Record<string, any>>("sales", "inquiry");
  const inquiry = inquiries.find((i) => i.id === id);
  if (!inquiry) throw new Error(serverMessages.requestNotFound);
  return requirePermission(
    inquiry.intent === "complaint" ? "support" : "leads",
    action,
  );
}
