import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, requirePermission } from "../../../../lib/auth";
import { listContacts, listDeals, listInvoices, listPayments } from "@platform/api-client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  if (!(await getCurrentUser()))
    return new NextResponse(null, { status: 401 });
  const { domain } = await params;
  if (!["contacts", "deals", "invoices", "payments"].includes(domain))
    return new NextResponse(null, { status: 404 });
  try {
    await requirePermission(
      domain as "contacts" | "deals" | "invoices" | "payments",
      "read",
    );
  } catch {
    return new NextResponse(null, { status: 403 });
  }
  const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase().slice(0, 200);

  let items: any[] = [];
  if (domain === "contacts") {
    const list = await listContacts().catch(() => []);
    const filtered = q
      ? list.filter((c: any) =>
          [c.company, c.companyName, c.firstName, c.lastName, c.fullName, c.email, c.phone]
            .filter(Boolean)
            .some((s: string) => s.toLowerCase().includes(q)),
        )
      : list;
    items = filtered.slice(0, 20).map((c: any) => ({
      id: c.id,
      label: [c.company || c.companyName, c.fullName || `${c.firstName || ""} ${c.lastName || ""}`.trim()].filter(Boolean).join(" · ") || c.id,
    }));
  } else if (domain === "deals") {
    const list = await listDeals().catch(() => []);
    const filtered = q
      ? list.filter((d: any) => (d.title || "").toLowerCase().includes(q))
      : list;
    items = filtered.slice(0, 20).map((d: any) => ({
      id: d.id,
      label: d.title || d.id,
    }));
  } else if (domain === "invoices") {
    const list = await listInvoices().catch(() => []);
    const filtered = q
      ? list.filter((inv: any) => (inv.invoiceNumber || "").toLowerCase().includes(q))
      : list;
    items = filtered.slice(0, 20).map((inv: any) => ({
      id: inv.id,
      label: inv.invoiceNumber || inv.id,
      invoice: {
        id: inv.id,
        invoice_number: inv.invoiceNumber,
        contact_id: inv.contactId,
        currency: inv.currency,
        total_amount: Number(inv.total ?? inv.totalAmount ?? 0),
        amount_due: Number(inv.balanceDue ?? inv.total ?? 0),
      },
    }));
  } else if (domain === "payments") {
    const list = await listPayments().catch(() => []);
    const filtered = q
      ? list.filter((p: any) =>
          [p.paymentNumber, p.reference].filter(Boolean).some((s: string) => s.toLowerCase().includes(q)),
        )
      : list;
    items = filtered.slice(0, 20).map((p: any) => ({
      id: p.id,
      label: p.paymentNumber || p.reference || p.id,
    }));
  }

  return NextResponse.json(
    { items, hasMore: false },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
