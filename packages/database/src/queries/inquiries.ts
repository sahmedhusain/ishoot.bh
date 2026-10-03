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
    confirmation_sent: inq.confirmationStatus === "sent",
    notification_sent: inq.notificationStatus === "sent",
    confirmation_status: inq.confirmationStatus,
    notification_status: inq.notificationStatus,
    intent: inq.intent,
    reference: inq.reference,
    assigned_to_id: inq.assignedToId || undefined,
    assigned_to_name: inq.assignedTo?.fullName,
    priority: inq.priority,
    location: inq.location || undefined,
    project_reference: inq.projectReference || undefined,
    customer_id: inq.customerId || undefined,
    merge_flag: inq.mergeFlag,
    source: inq.source,
    notes: inq.notes?.map((note: any) => ({
      id: note.id,
      body: note.body,
      author: note.author.fullName,
      created_at: note.createdAt.toISOString(),
    })),
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

export async function getAllInquiries(
  includeComplaints = false,
  page = 1,
): Promise<Inquiry[]> {
  try {
    const inquiries = await db.inquiry.findMany({
      where: includeComplaints ? undefined : { intent: { not: "complaint" } },
      include: {
        assignedTo: { select: { fullName: true } },
        notes: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { author: { select: { fullName: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      skip: (Math.max(1, page) - 1) * 50,
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
      data: { status, resolvedAt: status === "resolved" ? new Date() : null },
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
