import { serverMessages } from "@platform/locales";

import { measureOperation } from "@platform/database";
import { NextRequest, NextResponse } from "next/server";
import { getDocumentArchiveExportBatch, getRequestExportBatch, iterateListExport, listDomains, type ClientListRow, type RequestListFilters } from "@platform/database";
import { archiveKindsForCurrentUser } from "../../../../lib/archive-access";
import { getCurrentUser, requirePermission } from "../../../../lib/auth";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const columns = {
  archive: ["id", "group", "kind", "file_name", "file_url", "file_size", "mime_type", "related_to", "uploaded_by", "created_at", "expires_on"],
  expenses: ["id", "description_en", "description_ar", "vendor_name", "expense_date", "currency", "amount", "category_id", "deal_id"],
  invoices: ["id", "invoice_number", "issue_date", "due_date", "status", "currency", "total_amount", "amount_paid", "amount_due", "customer"],
  payments: ["id", "receipt_number", "invoiceNumber", "customerName", "payment_date", "currency", "amount", "payment_method"],
  contacts: [
    "id", "rank", "tier", "client_kind", "contact_type", "name", "company", "company_name_ar", "company_origin", "legal_form",
    "cr_number", "cr_expiry_date", "registration_country", "registration_number", "government_type", "supplier_number", "requires_purchase_order",
    "vat_number", "industry", "nationality", "website", "primary_contact", "job_title", "email", "phone", "contact_persons",
    "address_country", "address_city", "address", "payment_terms_days", "preferred_language", "billed", "collected", "outstanding",
    "overdue", "invoice_count", "deals_won", "last_activity", "created_at",
  ],
  deals: ["id", "title", "stage", "currency", "value", "probability", "target_close_date", "customer"],
  calendar: ["id", "title", "start_date", "end_date", "event_type", "location", "deal_id", "created_by"],
  moms: ["id", "mom_number", "title", "meeting_date", "status", "client_name", "deal_title", "created_by_name", "approved_by_name"],
  companyDocuments: ["id", "title_en", "category", "document_number", "valid_from", "valid_until"],
  requests: ["id", "reference", "kind", "title", "customer", "priority", "workflowStatus", "team", "assignee", "source", "createdAt", "slaDueDate", "overdue"],
};
/** A client row for the spreadsheet: the profile flattened, with every point of contact on one cell. */
function clientRow(row: ClientListRow) {
  const a = row.address_details ?? {};
  return {
    ...row,
    name: row.client_kind === "individual" ? row.full_name : row.company || row.full_name,
    primary_contact: row.client_kind === "individual" ? "" : row.full_name,
    contact_persons: (row.contact_persons ?? [])
      .map((p) => [p.full_name, p.position, p.department, p.email, p.phone].filter(Boolean).join(" / ") + (p.is_primary ? " *" : ""))
      .join("; "),
    address_country: a.country ?? "",
    address_city: a.city ?? "",
    address: [a.building, a.unit, a.road, a.block, a.area, a.line, a.state, a.postal_code, a.po_box].filter(Boolean).join(", "),
    billed: row.billed.toFixed(3),
    collected: row.collected.toFixed(3),
    outstanding: row.outstanding.toFixed(3),
    last_activity: row.last_activity.slice(0, 10),
    created_at: row.created_at.slice(0, 10),
  };
}
function csv(value: unknown) {
  let text = value == null ? "" : String(value);
  if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
/** The company archive export: every file the viewer may see and export, in the archive's filters. */
async function exportArchive(req: NextRequest) {
  const kinds = await archiveKindsForCurrentUser(["read", "export"]);
  if (!kinds.length) return NextResponse.json({ error: serverMessages.runtimeForbidden }, { status: 403 });
  const input = Object.fromEntries(["q", "group", "kind", "expiry", "from", "to"].map((key) => [key, (req.nextUrl.searchParams.get(key) || "").slice(0, 200) || undefined]));
  const encoder = new TextEncoder();
  let after = "";
  let header = false;
  let done = false;
  const stream = new ReadableStream({
    async pull(controller) {
      try {
        if (!header) { controller.enqueue(encoder.encode("\uFEFF" + columns.archive.map(csv).join(",") + "\r\n")); header = true; return; }
        if (done || req.signal.aborted) { controller.close(); return; }
        const rows = await getDocumentArchiveExportBatch(input, kinds, after, 500);
        if (!rows.length) { controller.close(); return; }
        after = rows[rows.length - 1].id;
        done = rows.length < 500;
        const lines = rows.map((row) => {
          const data: Record<string, unknown> = { ...row, related_to: row.owner_en, created_at: row.created_at.slice(0, 10) };
          return columns.archive.map((key) => csv(data[key])).join(",");
        });
        controller.enqueue(encoder.encode(lines.join("\r\n") + "\r\n"));
      } catch (error) { controller.error(error); }
    },
  });
  return new NextResponse(stream, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="archive-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
/** The request inbox export: the same filters as the inbox, every match walked by id. */
async function exportRequests(req: NextRequest) {
  let viewer: { id: string };
  try {
    viewer = await requirePermission("requests", "read");
    await requirePermission("requests", "export");
  } catch {
    return NextResponse.json({ error: serverMessages.runtimeForbidden }, { status: 403 });
  }
  const q = req.nextUrl.searchParams;
  const get = (key: string) => (q.get(key) || "").slice(0, 200) || undefined;
  const filters: RequestListFilters = {
    kind: get("kind") as RequestListFilters["kind"], status: get("status") || "open", scope: get("scope") as RequestListFilters["scope"],
    team: get("team"), priority: get("priority"), due: get("due"), assignee: get("assignee"), source: get("source"),
    customerId: get("customerId"), from: get("from"), to: get("to"), search: get("search"),
  };
  const encoder = new TextEncoder();
  let after: string | undefined;
  let header = false;
  let done = false;
  const stream = new ReadableStream({
    async pull(controller) {
      try {
        if (!header) { controller.enqueue(encoder.encode("\uFEFF" + columns.requests.map(csv).join(",") + "\r\n")); header = true; return; }
        if (done || req.signal.aborted) { controller.close(); return; }
        const rows = await getRequestExportBatch(filters, viewer.id, { after, batchSize: 500 });
        if (!rows.length) { controller.close(); return; }
        after = rows[rows.length - 1].id;
        done = rows.length < 500;
        controller.enqueue(encoder.encode(rows.map((row) => columns.requests.map((key) => csv((row as unknown as Record<string, unknown>)[key])).join(",")).join("\r\n") + "\r\n"));
      } catch (error) { controller.error(error); }
    },
  });
  return new NextResponse(stream, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="requests-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ domain: string }> }) {
  return measureOperation("admin:exports/[domain]:GET", async () => {
  if (!(await getCurrentUser())) return NextResponse.json({ error: serverMessages.unauthorized }, { status: 401 });
  const { domain } = await params;
  if (domain === "requests") return exportRequests(req);
  if (domain === "archive") return exportArchive(req);
  if (!Object.hasOwn(listDomains, domain)) return new NextResponse(null, { status: 404 });
  const name = domain as keyof typeof listDomains;
  try { for (const resource of name === "archive" ? ["contacts","deals","invoices","payments","expenses","settings"] as const : name === "companyDocuments" ? ["settings"] : [name]) { await requirePermission(resource as any, "read"); await requirePermission(resource as any, "export"); } }
  catch { return NextResponse.json({ error: serverMessages.runtimeForbidden }, { status: 403 }); }
  const dealId = req.nextUrl.searchParams.get("dealId") || "";
  const contactId = req.nextUrl.searchParams.get("contactId") || req.nextUrl.searchParams.get("clientId") || "";
  if (dealId && (name === "contacts" || name === "companyDocuments" || dealId.length > 150)) return NextResponse.json({error:serverMessages.runtimeInvalidExportScope},{status:400});
  if (contactId && contactId.length > 150) return NextResponse.json({error:serverMessages.runtimeInvalidExportScope},{status:400});
  if (dealId) { try { await requirePermission("deals", "read"); } catch { return NextResponse.json({error:serverMessages.runtimeForbidden},{status:403}); } }
  if (contactId) { try { await requirePermission("contacts", "read"); } catch { return NextResponse.json({error:serverMessages.runtimeForbidden},{status:403}); } }
  const search = Object.fromEntries(["kind", "type", "origin", "country", "tier", "balance", "activity", "sort"].map((key) => [key, req.nextUrl.searchParams.get(key) || undefined]));
  const paramsInput = { ...search, dealId, contactId, clientId: contactId, q: req.nextUrl.searchParams.get("q") || "", status: req.nextUrl.searchParams.get("status") || "all" };
  const iterator = iterateListExport(name, paramsInput);
  const encoder = new TextEncoder();
  let header = false;
  const stream = new ReadableStream({
    async pull(controller) {
      try {
        if (!header) { controller.enqueue(encoder.encode("\uFEFF" + columns[name].map(csv).join(",") + "\r\n")); header = true; return; }
        if (req.signal.aborted) { await iterator.return(); controller.close(); return; }
        const next = await iterator.next();
        if (next.done) { controller.close(); return; }
        const lines = next.value.map((row: any) => {
          const data = name === "contacts" ? clientRow(row) : { ...row, customer: row.contact?.company || row.contact?.full_name || "" };
          return columns[name].map((key) => csv(data[key])).join(",");
        });
        controller.enqueue(encoder.encode(lines.join("\r\n") + "\r\n"));
      } catch (error) { await iterator.return(); controller.error(error); }
    },
    async cancel() { await iterator.return(); },
  });
  return new NextResponse(stream, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name === "contacts" ? "clients" : name}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });

  });
}
