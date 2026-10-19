import { serverMessages } from "@ishoot/locales";
import { db } from "@ishoot/database";
import { requirePermission } from "./auth";
export async function requireInquiryAccess(
  id: string,
  action: "read" | "write" | "delete",
) {
  await requirePermission("leads", action);
  const inquiry = await db.inquiry.findUnique({
    where: { id },
    select: { intent: true },
  });
  if (!inquiry) throw new Error(serverMessages.requestNotFound);
  return requirePermission(
    inquiry.intent === "complaint" ? "support" : "leads",
    action,
  );
}
