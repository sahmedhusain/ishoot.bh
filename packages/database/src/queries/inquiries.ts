import { db } from "../db";
import { Inquiry } from "../types";

function mapInquiry(inq: any): Inquiry {
  return {
    id: inq.id,
    full_name: inq.name,
    email: inq.email,
    phone: inq.phone || undefined,
    company: inq.companyName || undefined,
    services_requested: inq.serviceType ? inq.serviceType.split(", ") : [],
    budget_range: inq.budgetRange || undefined,
    target_timeline: inq.timeline || undefined,
    message: inq.message,
    status: (inq.status as any) || "new",
    confirmation_sent: true,
    notification_sent: true,
    locale: inq.locale || "ar",
    created_at: inq.createdAt.toISOString(),
  };
}

export async function createInquiry(
  inquiry: Omit<
    Inquiry,
    "id" | "created_at" | "status" | "confirmation_sent" | "notification_sent"
  >,
): Promise<Inquiry> {
  const created = await db.inquiry.create({
    data: {
      name: inquiry.full_name,
      email: inquiry.email,
      phone: inquiry.phone || null,
      companyName: inquiry.company || null,
      serviceType: inquiry.services_requested
        ? inquiry.services_requested.join(", ")
        : null,
      budgetRange: inquiry.budget_range || null,
      timeline: inquiry.target_timeline || null,
      message: inquiry.message || "",
      status: "new",
      locale: inquiry.locale || "ar",
    },
  });
  return mapInquiry(created);
}

export async function getAllInquiries(): Promise<Inquiry[]> {
  try {
    const inquiries = await db.inquiry.findMany({
      orderBy: { createdAt: "desc" },
    });
    return inquiries.map(mapInquiry);
  } catch (e) {
    console.error("Error fetching inquiries from DB:", e);
    return [];
  }
}

export async function updateInquiryStatus(
  id: string,
  status: Inquiry["status"],
): Promise<boolean> {
  try {
    await db.inquiry.update({
      where: { id },
      data: { status },
    });
    return true;
  } catch (e) {
    console.error(`Error updating inquiry ${id}:`, e);
    return false;
  }
}

export async function deleteInquiry(id: string): Promise<boolean> {
  try {
    await db.inquiry.delete({ where: { id } });
    return true;
  } catch (e) {
    console.error(`Error deleting inquiry ${id}:`, e);
    return false;
  }
}
