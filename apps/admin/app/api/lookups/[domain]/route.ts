import { measureOperation } from "@ishoot/database";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@ishoot/database";
import { getCurrentUser, requirePermission } from "../../../../lib/auth";
export async function GET(req: NextRequest, { params }: { params: Promise<{ domain: string }> }) {
  return measureOperation("admin:lookups/[domain]:GET", async () => {
  if (!(await getCurrentUser())) return new NextResponse(null, { status: 401 });
  const { domain } = await params;
  if (!["contacts", "deals", "invoices", "payments"].includes(domain)) return new NextResponse(null, { status: 404 });
  try { await requirePermission(domain as "contacts" | "deals" | "invoices" | "payments", "read"); } catch { return new NextResponse(null, { status: 403 }); }
  const q = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 200);
  const page = Math.min(1000000, Math.max(1, Number.parseInt(req.nextUrl.searchParams.get("page") || "1", 10) || 1));
  const clientId = req.nextUrl.searchParams.get("clientId")?.slice(0,150);
  const requestedId = req.nextUrl.searchParams.get("id")?.slice(0,150);
  const match = { contains: q, mode: "insensitive" as const };
  const definitions = {
    contacts: { model: "crmContact", where: { OR: [{ firstName: match }, { lastName: match }, { companyName: match }, { email: match }] }, select: { id: true, firstName: true, lastName: true, companyName: true } },
    deals: { model: "crmDeal", where: { title: match }, select: { id: true, title: true } },
    invoices: { model: "invoice", where: {...(requestedId?{id:requestedId}:{invoiceNumber:match}), ...(clientId?{OR:[{clientId},{deal:{contactId:clientId}}]}:{}), status:{notIn:["draft","void","paid"]}}, select: {id:true,invoiceNumber:true,clientId:true,issueDate:true,dueDate:true,status:true,currency:true,totalAmount:true} },
    payments: { model: "payment", where: { receiptNumber: match }, select: { id: true, receiptNumber: true } },
  };
  const spec = definitions[domain as keyof typeof definitions];
  const rows = await (db as any)[spec.model].findMany({ where: spec.where, select: spec.select, orderBy: { id: "asc" }, take: 21, skip: (page - 1) * 20 });
  const paid = domain === "invoices" ? await db.payment.groupBy({by:["invoiceId","currency"],where:{invoiceId:{in:rows.map((r:any)=>r.id)}},_sum:{amount:true}}) : [];
  return NextResponse.json({ items: rows.slice(0, 20).map((row: any) => ({ ...(domain === "invoices" ? {invoice:{id:row.id,invoice_number:row.invoiceNumber,contact_id:row.clientId,currency:row.currency,total_amount:Number(row.totalAmount),amount_due:Math.max(0,Number(row.totalAmount)-Number(paid.find(p=>p.invoiceId===row.id && p.currency===row.currency)?._sum.amount||0))}} : {}), id: row.id, label: row.invoiceNumber || row.receiptNumber || row.title || [row.companyName, [row.firstName, row.lastName].filter(Boolean).join(" ")].filter(Boolean).join(" · ") })), hasMore: rows.length > 20 }, { headers: { "Cache-Control": "private, no-store" } });

  });
}
