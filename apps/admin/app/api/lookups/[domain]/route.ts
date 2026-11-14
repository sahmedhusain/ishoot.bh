import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, requirePermission } from "../../../../lib/auth";
import type { PermissionResource } from "../../../../lib/constants/permissions";
import {
  listContacts,
  listContracts,
  listDeals,
  listDepartments,
  listDirectoryRefs,
  listEmployees,
  listHRUsers,
  listInvoices,
  listITAssets,
  listMyTickets,
  listOfficialLetters,
  listOrders,
  listPayments,
  listProducts,
  listQuotations,
  listWarehouses,
} from "@platform/api-client";
import { listSystemProjects, listSystemServices } from "../../../../lib/api/system-catalog";

const ALLOWED_DOMAINS = [
  "contacts",
  "deals",
  "invoices",
  "payments",
  "projects",
  "departments",
  "employees",
  "users",
  "quotations",
  "contracts",
  "letters",
  "assets",
  "orders",
  "warehouses",
  "tickets",
  "products",
  "services",
] as const;

const PERMISSION_MAP: Record<(typeof ALLOWED_DOMAINS)[number], PermissionResource> = {
  contacts: "contacts",
  deals: "deals",
  invoices: "invoices",
  payments: "payments",
  projects: "moms",
  departments: "moms",
  employees: "moms",
  users: "users",
  quotations: "quotations",
  contracts: "contracts",
  letters: "letters",
  assets: "assets",
  orders: "orders",
  warehouses: "inventory",
  tickets: "it_support",
  products: "products",
  services: "quotations",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string }> },
) {
  const actor = await getCurrentUser();
  if (!actor) return new NextResponse(null, { status: 401 });
  const { domain } = await params;
  if (!(ALLOWED_DOMAINS as readonly string[]).includes(domain))
    return new NextResponse(null, { status: 404 });
  try {
    const permDomain = PERMISSION_MAP[domain as (typeof ALLOWED_DOMAINS)[number]];
    await requirePermission(permDomain, "read");
  } catch {
    return new NextResponse(null, { status: 403 });
  }
  const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase().slice(0, 200);
  const idParam = (req.nextUrl.searchParams.get("id") || "").trim();
  const clientIdParam = (req.nextUrl.searchParams.get("clientId") || "").trim();

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
  } else if (domain === "projects") {
    const list = await listSystemProjects().catch(() => []);
    const refs =
      Array.isArray(list) && list.length > 0
        ? list
        : await listDirectoryRefs("project").catch(() => []);
    const filtered = q
      ? refs.filter((p: any) =>
          [p.code, p.name].filter(Boolean).some((s: string) => s.toLowerCase().includes(q)),
        )
      : refs;
    items = filtered.slice(0, 20).map((p: any) => ({
      id: p.id,
      label: [p.code, p.name].filter(Boolean).join(" · ") || p.id,
    }));
  } else if (domain === "departments") {
    const list = await listDepartments().catch(() => []);
    const refs =
      Array.isArray(list) && list.length > 0
        ? list
        : await listDirectoryRefs("department").catch(() => []);
    const filtered = q
      ? refs.filter((d: any) =>
          [d.code, d.nameEn, d.nameAr, d.name]
            .filter(Boolean)
            .some((s: string) => s.toLowerCase().includes(q)),
        )
      : refs;
    items = filtered.slice(0, 20).map((d: any) => ({
      id: d.id,
      label: [d.code, d.nameEn || d.name].filter(Boolean).join(" · ") || d.id,
    }));
  } else if (domain === "employees") {
    const list = await listEmployees().catch(() => []);
    const refs =
      Array.isArray(list) && list.length > 0
        ? list
        : await listDirectoryRefs("employee").catch(() => []);
    const filtered = q
      ? refs.filter((e: any) =>
          [e.firstNameEn, e.lastNameEn, e.name, e.email, e.jobTitleEn]
            .filter(Boolean)
            .some((s: string) => s.toLowerCase().includes(q)),
        )
      : refs;
    items = filtered.slice(0, 20).map((e: any) => ({
      id: e.id,
      label:
        [e.firstNameEn ? `${e.firstNameEn} ${e.lastNameEn || ""}`.trim() : e.name, e.jobTitleEn || e.email]
          .filter(Boolean)
          .join(" · ") || e.id,
    }));
  } else if (domain === "invoices") {
    const list = await listInvoices().catch(() => []);
    const filtered = list.filter((inv: any) => {
      if (idParam && inv.id !== idParam) return false;
      if (clientIdParam && inv.contactId !== clientIdParam) return false;
      if (q && !(inv.invoiceNumber || "").toLowerCase().includes(q)) return false;
      return true;
    });
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
  } else if (domain === "users") {
    const list = await listHRUsers().catch(() => []);
    const filtered = q
      ? list.filter((u) =>
          [u.displayName, u.email, u.realm].filter(Boolean).some((s) => String(s).toLowerCase().includes(q)),
        )
      : list;
    items = filtered.slice(0, 20).map((u) => ({
      id: u.subjectId,
      label: [u.displayName, u.email, u.realm].filter(Boolean).join(" · ") || u.subjectId,
    }));
  } else if (domain === "quotations") {
    const list = await listQuotations().catch(() => []);
    const filtered = q
      ? list.filter((qt: any) =>
          [qt.quotationNumber, qt.status].filter(Boolean).some((s: string) => s.toLowerCase().includes(q)),
        )
      : list;
    items = filtered.slice(0, 20).map((qt: any) => ({
      id: qt.id,
      label: [qt.quotationNumber, qt.total ? `${qt.total} ${qt.currency || ""}`.trim() : null].filter(Boolean).join(" · ") || qt.id,
    }));
  } else if (domain === "contracts") {
    const list = await listContracts(clientIdParam ? { clientId: clientIdParam } : undefined).catch(() => []);
    const filtered = q
      ? list.filter((c: any) =>
          [c.contractNumber, c.title, c.status].filter(Boolean).some((s: string) => s.toLowerCase().includes(q)),
        )
      : list;
    items = filtered.slice(0, 20).map((c: any) => ({
      id: c.id,
      label: [c.contractNumber, c.title].filter(Boolean).join(" · ") || c.id,
    }));
  } else if (domain === "letters") {
    const list = await listOfficialLetters(clientIdParam ? { clientId: clientIdParam } : undefined).catch(() => []);
    const filtered = q
      ? list.filter((l: any) =>
          [l.letterNumber, l.recipientName, l.subject].filter(Boolean).some((s: string) => s.toLowerCase().includes(q)),
        )
      : list;
    items = filtered.slice(0, 20).map((l: any) => ({
      id: l.id,
      label: [l.letterNumber, l.subject || l.recipientName].filter(Boolean).join(" · ") || l.id,
    }));
  } else if (domain === "assets") {
    const list = await listITAssets().catch(() => []);
    const filtered = q
      ? list.filter((a: any) =>
          [a.assetTag, a.name, a.brand, a.model, a.serialNumber].filter(Boolean).some((s: string) => s.toLowerCase().includes(q)),
        )
      : list;
    items = filtered.slice(0, 20).map((a: any) => ({
      id: a.id,
      label: [a.assetTag, a.name, a.model].filter(Boolean).join(" · ") || a.id,
    }));
  } else if (domain === "orders") {
    const list = await listOrders(clientIdParam ? { contactId: clientIdParam } : undefined).catch(() => []);
    const filtered = q
      ? list.filter((o: any) =>
          [o.orderNumber, o.status].filter(Boolean).some((s: string) => s.toLowerCase().includes(q)),
        )
      : list;
    items = filtered.slice(0, 20).map((o: any) => ({
      id: o.id,
      label: [o.orderNumber, o.total ? `${o.total} ${o.currency || ""}`.trim() : o.status].filter(Boolean).join(" · ") || o.id,
    }));
  } else if (domain === "warehouses") {
    const list = await listWarehouses().catch(() => []);
    const filtered = q
      ? list.filter((w: any) =>
          [w.code, w.nameEn, w.nameAr].filter(Boolean).some((s: string) => s.toLowerCase().includes(q)),
        )
      : list;
    items = filtered.slice(0, 20).map((w: any) => ({
      id: w.id,
      label: [w.code, w.nameEn].filter(Boolean).join(" · ") || w.id,
    }));
  } else if (domain === "tickets") {
    const page = await listMyTickets(actor.id, { limit: 50 }).catch(() => ({ items: [] }));
    const list = page.items || [];
    const filtered = q
      ? list.filter((t: any) =>
          [t.ticketNumber, t.subject, t.category].filter(Boolean).some((s: string) => s.toLowerCase().includes(q)),
        )
      : list;
    items = filtered.slice(0, 20).map((t: any) => ({
      id: t.id,
      label: [t.ticketNumber, t.subject].filter(Boolean).join(" · ") || t.id,
    }));
  } else if (domain === "products") {
    const list = await listProducts().catch(() => []);
    const filtered = q
      ? list.filter((p: any) =>
          [p.sku, p.nameEn, p.nameAr, p.barcode].filter(Boolean).some((s: string) => s.toLowerCase().includes(q)),
        )
      : list;
    items = filtered.slice(0, 20).map((p: any) => ({
      id: p.id,
      label: [p.sku, p.nameEn, p.sellingPrice ? `${p.sellingPrice} ${p.currency || ""}`.trim() : null].filter(Boolean).join(" · ") || p.id,
    }));
  } else if (domain === "services") {
    const list = await listSystemServices().catch(() => []);
    const filtered = q
      ? list.filter((s: any) =>
          [s.code, s.nameEn, s.nameAr, s.category].filter(Boolean).some((x: string) => x.toLowerCase().includes(q)),
        )
      : list;
    items = filtered.slice(0, 20).map((s: any) => ({
      id: s.id,
      label: [s.code, s.nameEn, s.defaultRate != null ? `${s.defaultRate}` : null].filter(Boolean).join(" · ") || s.id,
    }));
  }

  return NextResponse.json(
    { items, hasMore: false },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
