import { measureOperation } from "@ishoot/database";
import { NextRequest, NextResponse } from "next/server";
import { iterateListExport, listDomains } from "@ishoot/database";
import { getCurrentUser, requirePermission } from "../../../../lib/auth";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const columns = {
  archive: ["id","file_name","file_url","file_size","mime_type","entity_type","entity_id","entity_label","uploaded_by","created_at"],
  expenses: ["id", "description_en", "description_ar", "vendor_name", "expense_date", "currency", "amount", "category_id", "deal_id"],
  invoices: ["id", "invoice_number", "issue_date", "due_date", "status", "currency", "total_amount", "amount_paid", "amount_due", "customer"],
  payments: ["id", "receipt_number", "invoiceNumber", "customerName", "payment_date", "currency", "amount", "payment_method"],
  contacts: ["id", "full_name", "company", "email", "phone", "contact_type"],
  deals: ["id", "title", "stage", "currency", "value", "probability", "target_close_date", "customer"],
  calendar: ["id", "title", "start_date", "end_date", "event_type", "location", "deal_id", "created_by"],
  moms: ["id", "mom_number", "title", "meeting_date", "status", "client_name", "deal_title", "created_by_name", "approved_by_name"],
  companyDocuments: ["id", "title_en", "category", "document_number", "valid_from", "valid_until"],
};
function csv(value: unknown) {
  let text = value == null ? "" : String(value);
  if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export async function GET(req: NextRequest, { params }: { params: Promise<{ domain: string }> }) {
  return measureOperation("admin:exports/[domain]:GET", async () => {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { domain } = await params;
  if (!Object.hasOwn(listDomains, domain)) return new NextResponse(null, { status: 404 });
  const name = domain as keyof typeof listDomains;
  try { for (const resource of name === "archive" ? ["contacts","deals","invoices","payments","expenses","settings"] as const : name === "companyDocuments" ? ["settings"] : [name]) { await requirePermission(resource as any, "read"); await requirePermission(resource as any, "export"); } }
  catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  const dealId = req.nextUrl.searchParams.get("dealId") || "";
  const contactId = req.nextUrl.searchParams.get("contactId") || req.nextUrl.searchParams.get("clientId") || "";
  if (dealId && (name === "contacts" || name === "companyDocuments" || dealId.length > 150)) return NextResponse.json({error:"Invalid export scope"},{status:400});
  if (contactId && contactId.length > 150) return NextResponse.json({error:"Invalid export scope"},{status:400});
  if (dealId) { try { await requirePermission("deals", "read"); } catch { return NextResponse.json({error:"Forbidden"},{status:403}); } }
  if (contactId) { try { await requirePermission("contacts", "read"); } catch { return NextResponse.json({error:"Forbidden"},{status:403}); } }
  const paramsInput = { dealId, contactId, clientId: contactId, q: req.nextUrl.searchParams.get("q") || "", status: req.nextUrl.searchParams.get("status") || "all" };
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
          const data = { ...row, customer: row.contact?.company || row.contact?.full_name || "" };
          return columns[name].map((key) => csv(data[key])).join(",");
        });
        controller.enqueue(encoder.encode(lines.join("\r\n") + "\r\n"));
      } catch (error) { await iterator.return(); controller.error(error); }
    },
    async cancel() { await iterator.return(); },
  });
  return new NextResponse(stream, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });

  });
}
