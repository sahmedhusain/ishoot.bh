// Business-integrity audit for seeded (or real) data. Each rule is a query returning the rows that
// break it; an empty result means the rule holds. Run: pnpm --filter @platform/database db:check-integrity
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Rule = { area: string; name: string; sql: string };

const totalsRule = (table: string, lineTable: string, fk: string) => `
  WITH lines AS (SELECT "${fk}" id, SUM("lineTotal") s FROM "${lineTable}" GROUP BY 1)
  SELECT d.id, d.subtotal, l.s lines, d."discountAmount", d."vatAmount", d."totalAmount"
  FROM "${table}" d LEFT JOIN lines l ON l.id = d.id
  WHERE l.s IS NULL
     OR d.subtotal <> l.s
     OR d."totalAmount" <> d.subtotal - d."discountAmount" + d."vatAmount" + d."otherTaxAmount"
     OR (d."vatEnabled" AND d."vatAmount" <> ROUND((d.subtotal - d."discountAmount") * d."vatPercentage" / 100, 3))
     OR (NOT d."vatEnabled" AND d."vatAmount" <> 0)
     OR (d."discountType" = 'none' AND d."discountAmount" <> 0)
     OR (d."discountType" = 'percentage' AND d."discountAmount" <> ROUND(d.subtotal * d."discountValue" / 100, 3))`;

const RULES: Rule[] = [
  // ---------- Finance ----------
  {
    area: "finance",
    name: "invoice line total = quantity × unit price",
    sql: `SELECT id, "invoiceId" FROM "InvoiceLineItem" WHERE "lineTotal" <> ROUND(quantity * "unitPrice", 3)`,
  },
  {
    area: "finance",
    name: "invoice subtotal/discount/VAT/total agree with its lines",
    sql: totalsRule("Invoice", "InvoiceLineItem", "invoiceId"),
  },
  {
    area: "finance",
    name: "other taxes on invoices and quotations add up to their stored total and follow the rate",
    sql: `WITH docs AS (
        SELECT 'invoice' kind, id, subtotal - "discountAmount" base, "otherTaxAmount" FROM "Invoice"
        UNION ALL SELECT 'quotation', id, subtotal - "discountAmount", "otherTaxAmount" FROM "Quotation"),
      taxes AS (SELECT COALESCE("invoiceId", "quotationId") id, SUM(amount) s,
          BOOL_AND(ABS(amount - (SELECT base FROM docs WHERE docs.id = COALESCE(t."invoiceId", t."quotationId")) * "ratePercent" / 100) <= 0.005) rated
        FROM "DocumentTax" t GROUP BY 1)
      SELECT d.kind, d.id, d."otherTaxAmount", t.s FROM docs d LEFT JOIN taxes t ON t.id = d.id
      WHERE d."otherTaxAmount" <> COALESCE(t.s, 0) OR t.rated = false`,
  },
  {
    area: "finance",
    name: "invoice status matches the payments received",
    sql: `WITH p AS (SELECT "invoiceId" id, SUM(amount) paid FROM "Payment" GROUP BY 1)
      SELECT i."invoiceNumber", i.status, i."totalAmount", COALESCE(p.paid,0) paid FROM "Invoice" i LEFT JOIN p ON p.id = i.id
      WHERE (i.status = 'paid' AND COALESCE(p.paid,0) <> i."totalAmount")
         OR (i.status = 'partially_paid' AND NOT (COALESCE(p.paid,0) > 0 AND COALESCE(p.paid,0) < i."totalAmount"))
         OR (i.status IN ('draft','void','sent') AND COALESCE(p.paid,0) <> 0)
         -- the overdue sweep also moves part-paid invoices to overdue, so overdue only needs a balance
         OR (i.status = 'overdue' AND COALESCE(p.paid,0) >= i."totalAmount")
         OR COALESCE(p.paid,0) > i."totalAmount"`,
  },
  {
    area: "finance",
    name: "overdue invoices are past due; sent invoices are not",
    sql: `SELECT "invoiceNumber", status, "dueDate" FROM "Invoice"
      WHERE (status = 'overdue' AND "dueDate" >= CURRENT_DATE) OR (status = 'sent' AND "dueDate" < CURRENT_DATE)`,
  },
  // VAT registration can change over time, so each document is checked against its own VAT choice, not today's setting.
  {
    area: "finance",
    name: "documents charging VAT use a positive rate; documents without VAT carry no VAT",
    sql: `SELECT 'invoice' doc, "invoiceNumber" num FROM "Invoice" WHERE status <> 'void'
        AND (("vatEnabled" AND "vatPercentage" <= 0) OR (NOT "vatEnabled" AND "vatAmount" <> 0))
      UNION ALL SELECT 'quotation', "quotationNumber" FROM "Quotation"
        WHERE ("vatEnabled" AND "vatPercentage" <= 0) OR (NOT "vatEnabled" AND "vatAmount" <> 0)`,
  },
  {
    area: "finance",
    name: "due date is not before issue date",
    sql: `SELECT "invoiceNumber" FROM "Invoice" WHERE "dueDate" < "issueDate"`,
  },
  {
    area: "finance",
    name: "payment currency and date match its invoice",
    sql: `SELECT p."receiptNumber" FROM "Payment" p JOIN "Invoice" i ON i.id = p."invoiceId"
      WHERE p.currency <> i.currency OR p."paymentDate" < i."issueDate" OR p.amount <= 0`,
  },
  {
    area: "finance",
    name: "invoice numbers use the company format and are below the next counter",
    sql: `SELECT i."invoiceNumber" FROM "Invoice" i, "CompanySetting" c
      WHERE i."invoiceNumber" !~ ('^' || c."invoicePrefix" || '-' || EXTRACT(YEAR FROM i."issueDate")::int || '-[0-9]{4}$')
         OR split_part(i."invoiceNumber", '-', 3)::int >= c."invoiceNextNumber"`,
  },
  {
    area: "finance",
    name: "receipt numbers use the company format and are below the next counter",
    sql: `SELECT p."receiptNumber" FROM "Payment" p, "CompanySetting" c
      WHERE p."receiptNumber" !~ ('^' || c."receiptPrefix" || '-' || EXTRACT(YEAR FROM p."paymentDate")::int || '-[0-9]{4}$')
         OR split_part(p."receiptNumber", '-', 3)::int >= c."receiptNextNumber"`,
  },
  {
    area: "finance",
    name: "invoice client matches its deal's client",
    sql: `SELECT i."invoiceNumber" FROM "Invoice" i JOIN "CrmDeal" d ON d.id = i."dealId" WHERE i."clientId" IS DISTINCT FROM d."contactId"`,
  },
  {
    area: "finance",
    name: "expense gross = net + input VAT",
    sql: `SELECT id, amount, "netAmount", "inputVatAmount" FROM "Expense" WHERE amount <> "netAmount" + "inputVatAmount" OR amount <= 0`,
  },
  {
    area: "finance",
    name: "expense scope matches its deal/client link",
    sql: `SELECT e.id, e.scope FROM "Expense" e LEFT JOIN "CrmDeal" d ON d.id = e."dealId"
      WHERE (e.scope = 'deal' AND (e."dealId" IS NULL OR e."clientId" IS DISTINCT FROM d."contactId"))
         OR (e.scope = 'client' AND (e."clientId" IS NULL OR e."dealId" IS NOT NULL))
         OR (e.scope = 'internal' AND (e."dealId" IS NOT NULL OR e."clientId" IS NOT NULL))`,
  },
  {
    area: "finance",
    name: "paid claims booked exactly one matching expense",
    sql: `SELECT c.id, c.status FROM "ExpenseClaim" c LEFT JOIN "Expense" e ON e.id = c."expenseId"
      WHERE (c.status = 'paid' AND (e.id IS NULL OR e.amount <> c.amount OR e.currency <> c.currency OR e.status <> 'approved'))
         OR (c.status <> 'paid' AND c."expenseId" IS NOT NULL)`,
  },
  {
    area: "finance",
    name: "claims awaiting approval have a pending approval request",
    sql: `SELECT c.id FROM "ExpenseClaim" c WHERE c.status = 'submitted'
      AND NOT EXISTS (SELECT 1 FROM "ApprovalRequest" a WHERE a."targetType" = 'expense_claim' AND a."targetId" = c.id AND a.status = 'pending')`,
  },
  {
    area: "sales",
    name: "documents with clients are approved, signed and stamped",
    sql: `SELECT "quotationNumber" FROM "Quotation" WHERE status IN ('issued','accepted','rejected','expired','converted') AND "signedAt" IS NULL
      UNION ALL SELECT "invoiceNumber" FROM "Invoice" WHERE status NOT IN ('draft','void') AND ("signedAt" IS NULL OR "approvalStatus" <> 'approved')
      UNION ALL SELECT "invoiceNumber" FROM "Invoice" WHERE "signedAt" IS NOT NULL AND "approvalStatus" <> 'approved'`,
  },
  {
    area: "sales",
    name: "commission payouts booked a matching expense (or were paid with the salary)",
    sql: `SELECT p.id FROM "CommissionPayout" p LEFT JOIN "Expense" e ON e.id = p."expenseId"
      WHERE (p."payrollItemId" IS NULL AND (e.id IS NULL OR e.amount <> p.amount OR e.status <> 'approved'))
        OR (p."payrollItemId" IS NOT NULL AND p."expenseId" IS NOT NULL)
        OR ABS(p.amount - ROUND(p."basisAmount" * p."ratePercent" / 100, 3)) > 0.001`,
  },
  {
    area: "sales",
    name: "invoices are credited like their quotation unless reassigned",
    sql: `SELECT i."invoiceNumber" FROM "Invoice" i JOIN "Quotation" q ON q."invoiceId" = i.id
      WHERE i."salesOwnerId" IS DISTINCT FROM q."salesOwnerId"
        AND NOT EXISTS (SELECT 1 FROM "SalesAttributionChange" c WHERE c."entityType" = 'invoice' AND c."entityId" = i.id)`,
  },
  {
    area: "sales",
    name: "issued quotations and invoices are credited to someone",
    sql: `SELECT "quotationNumber" FROM "Quotation" WHERE "salesOwnerId" IS NULL AND status <> 'draft'
      UNION ALL SELECT "invoiceNumber" FROM "Invoice" WHERE "salesOwnerId" IS NULL AND status <> 'draft'`,
  },
  {
    area: "finance",
    name: "every expense has an active-or-used category",
    sql: `SELECT id FROM "Expense" WHERE "categoryId" IS NULL`,
  },
  {
    area: "finance",
    name: "quotation line total = quantity × unit price",
    sql: `SELECT id, "quotationId" FROM "QuotationLineItem" WHERE "lineTotal" <> ROUND(quantity * "unitPrice", 3)`,
  },
  {
    area: "finance",
    name: "quotation subtotal/discount/VAT/total agree with its lines",
    sql: totalsRule("Quotation", "QuotationLineItem", "quotationId"),
  },
  {
    area: "finance",
    name: "quotation numbers use the QTE sequence format and the sequence is ahead",
    sql: `SELECT q."quotationNumber" FROM "Quotation" q
      LEFT JOIN "ReferenceSequence" s ON s.id = 'QTE_' || split_part(q."quotationNumber", '-', 2)
      WHERE q."quotationNumber" !~ '^QTE-[0-9]{4}-[0-9]{6}$' OR s."lastNumber" IS NULL
         OR split_part(q."quotationNumber", '-', 3)::int > s."lastNumber"`,
  },
  {
    area: "finance",
    name: "converted quotations point at an invoice for the same client and currency",
    sql: `SELECT q."quotationNumber", q.status FROM "Quotation" q LEFT JOIN "Invoice" i ON i.id = q."invoiceId"
      WHERE (q.status = 'converted') <> (q."invoiceId" IS NOT NULL)
         OR (i.id IS NOT NULL AND (i."clientId" IS DISTINCT FROM q."clientId" OR i.currency <> q.currency))`,
  },
  {
    area: "finance",
    name: "quotation client matches its deal's client",
    sql: `SELECT q."quotationNumber" FROM "Quotation" q JOIN "CrmDeal" d ON d.id = q."dealId" WHERE q."clientId" IS DISTINCT FROM d."contactId"`,
  },
  {
    area: "finance",
    name: "valid-until is after the quotation date; open quotations are not expired",
    sql: `SELECT "quotationNumber", status, "validUntilDate" FROM "Quotation"
      WHERE "validUntilDate" < "issueDate" OR (status IN ('issued') AND "validUntilDate" < CURRENT_DATE)`,
  },

  // ---------- CRM ----------
  {
    area: "crm",
    name: "lost deals have a lost reason",
    sql: `SELECT id, title FROM "CrmDeal" WHERE "dealStage" = 'closed_lost' AND COALESCE(TRIM("lostReason"), '') = ''`,
  },
  {
    area: "crm",
    name: "deal stage is not behind its own quotations and invoices",
    // The company's own pipeline order decides what "behind" means (DealPipelineStage.sortOrder).
    sql: `WITH need AS (
        SELECT "dealId" id, CASE WHEN status IN ('accepted','converted') THEN 'contract_signed' ELSE 'proposal_sent' END stage FROM "Quotation" WHERE "dealId" IS NOT NULL AND status IN ('issued','accepted','converted')
        UNION ALL
        SELECT "dealId", CASE WHEN status = 'paid' THEN 'closed_won' ELSE 'invoiced' END FROM "Invoice" WHERE "dealId" IS NOT NULL AND status IN ('sent','partially_paid','overdue','paid'))
      SELECT d.id, d.title, d."dealStage", MAX(ns."sortOrder") needed FROM "CrmDeal" d
      JOIN need n ON n.id = d.id
      JOIN "DealPipelineStage" ns ON ns.id = n.stage
      LEFT JOIN "DealPipelineStage" ds ON ds.id = d."dealStage"
      WHERE d."dealStage" <> 'closed_lost' GROUP BY d.id, ds."sortOrder" HAVING MAX(ns."sortOrder") > COALESCE(ds."sortOrder", -1)`,
  },
  {
    area: "crm",
    name: "lost deals have no paid or open invoices",
    sql: `SELECT d.title FROM "CrmDeal" d JOIN "Invoice" i ON i."dealId" = d.id
      WHERE d."dealStage" = 'closed_lost' AND i.status IN ('sent','partially_paid','paid','overdue')`,
  },
  {
    area: "crm",
    name: "converted inquiry and its deal belong to the same customer",
    sql: `SELECT d.title FROM "CrmDeal" d JOIN "Inquiry" q ON q.id = d."sourceInquiryId" WHERE q."customerId" IS DISTINCT FROM d."contactId"`,
  },
  {
    area: "crm",
    name: "contact emails are unique and normalised",
    sql: `SELECT "emailNorm", COUNT(*) FROM "CrmContact" WHERE email IS NOT NULL
      GROUP BY "emailNorm" HAVING COUNT(*) > 1 OR "emailNorm" IS NULL
      UNION ALL SELECT email, 1 FROM "CrmContact" WHERE email IS NOT NULL AND "emailNorm" IS DISTINCT FROM LOWER(TRIM(email))`,
  },
  {
    area: "crm",
    name: "deal probability is between 0 and 100 and value is not negative",
    sql: `SELECT title FROM "CrmDeal" WHERE probability NOT BETWEEN 0 AND 100 OR "dealValue" < 0`,
  },

  // ---------- Requests ----------
  {
    area: "requests",
    name: "every request reference uses the sequence format and the sequence is ahead",
    sql: `SELECT q.reference FROM "Inquiry" q LEFT JOIN "ReferenceSequence" s ON s.id = split_part(q.reference, '-', 1) || '_' || split_part(q.reference, '-', 2)
      WHERE q.reference !~ '^(SR|CR|INQ|RFQ|CMP|SUG)-[0-9]{4}-[0-9]{6}$'
         OR s."lastNumber" IS NULL OR split_part(q.reference, '-', 3)::int > s."lastNumber"`,
  },
  {
    area: "requests",
    name: "assigned requests have an assignee",
    sql: `SELECT reference FROM "Inquiry" WHERE "workflowStatus" IN ('assigned','pending_approval','approved','confirmed') AND "assignedToId" IS NULL AND "requestType" IN ('SR','CR')`,
  },
  {
    area: "requests",
    name: "resolved requests have a resolution date",
    sql: `SELECT reference FROM "Inquiry" WHERE "workflowStatus" = 'resolved' AND "resolvedAt" IS NULL`,
  },

  // ---------- Approvals ----------
  {
    area: "approvals",
    name: "pending approvals point at a target that is waiting for approval",
    sql: `SELECT a."targetType", a."targetId" FROM "ApprovalRequest" a WHERE a.status = 'pending' AND NOT CASE a."targetType"
        WHEN 'quotation' THEN EXISTS (SELECT 1 FROM "Quotation" t WHERE t.id = a."targetId" AND t.status = 'submitted')
        WHEN 'leave_request' THEN EXISTS (SELECT 1 FROM "LeaveRequest" t WHERE t.id = a."targetId" AND t.status = 'pending')
        WHEN 'payroll_run' THEN EXISTS (SELECT 1 FROM "PayrollRun" t WHERE t.id = a."targetId" AND t.status = 'submitted')
        WHEN 'expense' THEN EXISTS (SELECT 1 FROM "Expense" t WHERE t.id = a."targetId" AND t.status = 'pending')
        WHEN 'signature_change' THEN EXISTS (SELECT 1 FROM "SignatureChange" t WHERE t.id = a."targetId" AND t.status = 'pending')
        WHEN 'expense_claim' THEN EXISTS (SELECT 1 FROM "ExpenseClaim" t WHERE t.id = a."targetId" AND t.status = 'submitted')
        WHEN 'service_request' THEN EXISTS (SELECT 1 FROM "Inquiry" t WHERE t.id = a."targetId" AND t."workflowStatus" = 'pending_approval')
        WHEN 'profile_change' THEN EXISTS (SELECT 1 FROM "ProfileChangeRequest" t WHERE t.id = a."targetId" AND t.status = 'pending')
        WHEN 'salary_document' THEN EXISTS (SELECT 1 FROM "SalaryDocument" t WHERE t.id = a."targetId" AND t.status = 'pending')
        WHEN 'invoice' THEN EXISTS (SELECT 1 FROM "Invoice" t WHERE t.id = a."targetId" AND t."approvalStatus" = 'submitted')
        WHEN 'account_change' THEN EXISTS (SELECT 1 FROM "AccountChangeRequest" t WHERE t.id = a."targetId" AND t.status = 'pending')
        WHEN 'asset_handover' THEN EXISTS (SELECT 1 FROM "AssetHandover" t WHERE t.id = a."targetId" AND t.status = 'pending_approval')
        WHEN 'employee_handover' THEN EXISTS (SELECT 1 FROM "EmployeeHandover" t WHERE t.id = a."targetId" AND t.status = 'pending_approval')
        WHEN 'final_settlement' THEN EXISTS (SELECT 1 FROM "FinalSettlement" t WHERE t.id = a."targetId" AND t.status = 'submitted')
        WHEN 'announcement' THEN EXISTS (SELECT 1 FROM "Announcement" t WHERE t.id = a."targetId" AND t.status = 'pending_approval')
        WHEN 'official_letter' THEN EXISTS (SELECT 1 FROM "OfficialLetter" t WHERE t.id = a."targetId" AND t.status = 'pending_approval')
        WHEN 'purchase_requisition' THEN EXISTS (SELECT 1 FROM "PurchaseRequisition" t WHERE t.id = a."targetId" AND t.status = 'pending_approval')
        WHEN 'purchase_order' THEN EXISTS (SELECT 1 FROM "PurchaseOrder" t WHERE t.id = a."targetId" AND t.status = 'pending_approval')
        ELSE false END`,
  },
  {
    area: "sales",
    name: "company and government clients have exactly one primary point of contact; individuals have none",
    sql: `SELECT c.id, c."clientKind", COUNT(p.id) persons, COUNT(p.id) FILTER (WHERE p."isPrimary") primaries
      FROM "CrmContact" c LEFT JOIN "ClientContactPerson" p ON p."contactId" = c.id GROUP BY c.id
      HAVING (c."clientKind" = 'individual' AND COUNT(p.id) > 0)
          OR (c."clientKind" <> 'individual' AND COUNT(p.id) FILTER (WHERE p."isPrimary") <> 1)`,
  },
  {
    area: "sales",
    name: "client registration matches its type (local companies in Bahrain, foreign ones abroad)",
    sql: `SELECT id, "clientKind", "companyOrigin", "registrationCountry", "crNumber" FROM "CrmContact"
      WHERE ("clientKind" = 'company' AND "companyOrigin" = 'local' AND ("registrationCountry" IS DISTINCT FROM 'BH' OR "crNumber" IS NULL OR "crNumber" !~ '^[0-9]{1,7}-[0-9]{1,3}$'))
         OR ("clientKind" = 'company' AND "companyOrigin" = 'foreign' AND ("registrationCountry" IS NULL OR "registrationCountry" = 'BH' OR "crNumber" IS NOT NULL OR NULLIF(BTRIM("registrationNumber"),'') IS NULL))
         OR ("clientKind" = 'company' AND "companyOrigin" IS NULL)
         OR ("clientKind" <> 'company' AND ("crNumber" IS NOT NULL OR "companyOrigin" IS NOT NULL))
         OR ("clientKind" = 'individual' AND NULLIF(BTRIM("companyName"), '') IS NOT NULL)`,
  },
  {
    area: "sales",
    name: "a quotation the client signed is accepted (or later)",
    sql: `SELECT q.id, q."quotationNumber", q.status FROM "ClientSignature" c JOIN "Quotation" q ON q.id = c."documentId"
      WHERE c."documentType" = 'quotation' AND c.status = 'signed' AND q.status NOT IN ('accepted', 'converted', 'expired', 'cancelled', 'rejected')`,
  },
  {
    area: "sales",
    name: "an open signing link belongs to a document that can still be signed",
    sql: `SELECT c.id, c."documentType", c."documentId" FROM "ClientSignature" c
      LEFT JOIN "Quotation" q ON c."documentType" = 'quotation' AND q.id = c."documentId"
      LEFT JOIN "Invoice" i ON c."documentType" = 'invoice' AND i.id = c."documentId"
      WHERE c.status = 'pending' AND c."expiresAt" > now() AND COALESCE(q.status, i.status) NOT IN ('issued', 'accepted', 'sent', 'partially_paid', 'overdue', 'paid')`,
  },
  {
    area: "approvals",
    name: "items waiting for approval have a pending approval request",
    sql: `SELECT 'quotation' t, id FROM "Quotation" x WHERE status = 'submitted' AND NOT EXISTS (SELECT 1 FROM "ApprovalRequest" a WHERE a."targetId" = x.id AND a.status = 'pending')
      UNION ALL SELECT 'leave', id FROM "LeaveRequest" x WHERE status = 'pending' AND NOT EXISTS (SELECT 1 FROM "ApprovalRequest" a WHERE a."targetId" = x.id AND a.status = 'pending')
      UNION ALL SELECT 'payroll', id FROM "PayrollRun" x WHERE status = 'submitted' AND NOT EXISTS (SELECT 1 FROM "ApprovalRequest" a WHERE a."targetId" = x.id AND a.status = 'pending')
      UNION ALL SELECT 'expense', id FROM "Expense" x WHERE status = 'pending' AND NOT EXISTS (SELECT 1 FROM "ApprovalRequest" a WHERE a."targetId" = x.id AND a.status = 'pending')
      UNION ALL SELECT 'request', id FROM "Inquiry" x WHERE "workflowStatus" = 'pending_approval' AND NOT EXISTS (SELECT 1 FROM "ApprovalRequest" a WHERE a."targetId" = x.id AND a.status = 'pending')
      UNION ALL SELECT 'profile_change', id FROM "ProfileChangeRequest" x WHERE status = 'pending' AND NOT EXISTS (SELECT 1 FROM "ApprovalRequest" a WHERE a."targetId" = x.id AND a.status = 'pending')
      UNION ALL SELECT 'salary_document', id FROM "SalaryDocument" x WHERE status = 'pending' AND NOT EXISTS (SELECT 1 FROM "ApprovalRequest" a WHERE a."targetId" = x.id AND a.status = 'pending')`,
  },
  {
    area: "approvals",
    name: "decided approvals carry a matching decision",
    sql: `SELECT a.id, a.status FROM "ApprovalRequest" a WHERE a.status IN ('approved','rejected')
      AND NOT EXISTS (SELECT 1 FROM "ApprovalDecision" d WHERE d."approvalRequestId" = a.id AND d.decision = a.status)`,
  },

  {
    area: "approvals",
    name: "new workflow items waiting for approval have the matching pending request",
    sql: `WITH targets AS (
      SELECT 'asset_handover' kind,id FROM "AssetHandover" WHERE status='pending_approval'
      UNION ALL SELECT 'employee_handover',id FROM "EmployeeHandover" WHERE status='pending_approval'
      UNION ALL SELECT 'final_settlement',id FROM "FinalSettlement" WHERE status='submitted'
      UNION ALL SELECT 'announcement',id FROM "Announcement" WHERE status='pending_approval'
      UNION ALL SELECT 'official_letter',id FROM "OfficialLetter" WHERE status='pending_approval'
      UNION ALL SELECT 'purchase_requisition',id FROM "PurchaseRequisition" WHERE status='pending_approval'
      UNION ALL SELECT 'purchase_order',id FROM "PurchaseOrder" WHERE status='pending_approval')
      SELECT t.* FROM targets t WHERE NOT EXISTS (SELECT 1 FROM "ApprovalRequest" a WHERE a."targetType"=t.kind AND a."targetId"=t.id AND a.status='pending')`,
  },
  {
    area: "hr",
    name: "final settlement totals match additions and deductions",
    sql: `WITH lines AS (SELECT "settlementId" id,COALESCE(SUM(amount) FILTER(WHERE kind='addition'),0) additions,COALESCE(SUM(amount) FILTER(WHERE kind='deduction'),0) deductions FROM "FinalSettlementLine" GROUP BY 1)
      SELECT s.reference FROM "FinalSettlement" s LEFT JOIN lines l ON l.id=s.id
      WHERE s."totalAdditions"<>COALESCE(l.additions,0) OR s."totalDeductions"<>COALESCE(l.deductions,0) OR s."netAmount"<>s."totalAdditions"-s."totalDeductions"`,
  },
  {
    area: "hr",
    name: "paid final settlements record who paid, when and how",
    sql: `SELECT reference FROM "FinalSettlement" WHERE status='paid' AND ("paidAt" IS NULL OR "paidById" IS NULL OR "paymentMethod" IS NULL)`,
  },
  {
    area: "hr",
    name: "employee social insurance registrations do not overlap",
    sql: `SELECT a.id,a."employeeId" FROM "EmployeeGosiRecord" a JOIN "EmployeeGosiRecord" b ON a."employeeId"=b."employeeId" AND a.id<b.id AND a."effectiveFrom"<=COALESCE(b."effectiveTo",'infinity'::date) AND b."effectiveFrom"<=COALESCE(a."effectiveTo",'infinity'::date)`,
  },
  {
    area: "hr",
    name: "active component rates have nonoverlapping effective dates",
    sql: `SELECT a.code,a.id FROM "GosiComponent" a JOIN "GosiComponent" b ON a.code=b.code AND a.id<b.id AND a."isActive" AND b."isActive" AND a."effectiveFrom"<=COALESCE(b."effectiveTo",'infinity'::date) AND b."effectiveFrom"<=COALESCE(a."effectiveTo",'infinity'::date)`,
  },
  {
    area: "hr",
    name: "partial support approvals specify their approved amount or percentage",
    sql: `SELECT id FROM "EmployeeSupport" WHERE status='partially_approved' AND "approvedPercent" IS NULL AND "approvedAmount" IS NULL`,
  },
  {
    area: "communications",
    name: "issued official communications retain their required signature",
    sql: `SELECT 'letter' kind,reference FROM "OfficialLetter" WHERE status='approved' AND "showSignature" AND ("signatureUrl" IS NULL OR "signerId" IS NULL OR "signedAt" IS NULL)
      UNION ALL SELECT 'announcement',reference FROM "Announcement" WHERE status='published' AND official AND ("signatureUrl" IS NULL OR "signedById" IS NULL OR "signedAt" IS NULL OR "publishedAt" IS NULL)`,
  },

  // ---------- HR ----------
  // Read-only "viewer" logins are external (auditors, guests) and are not staff.
  {
    area: "hr",
    name: "every active staff user has an employee record",
    sql: `SELECT u.email, u.role FROM "User" u WHERE u."isActive" AND u."archivedAt" IS NULL AND u.role <> 'viewer' AND NOT EXISTS (SELECT 1 FROM "Employee" e WHERE e."userId" = u.id)`,
  },
  {
    area: "hr",
    name: "employee e-mail matches the linked user",
    sql: `SELECT e."employeeNumber" FROM "Employee" e JOIN "User" u ON u.id = e."userId" WHERE LOWER(e.email) IS DISTINCT FROM LOWER(u.email)`,
  },
  {
    area: "hr",
    name: "each employee has exactly one current employment record",
    sql: `SELECT e."employeeNumber", COUNT(r.id) FILTER (WHERE r."isCurrent") current FROM "Employee" e LEFT JOIN "EmploymentRecord" r ON r."employeeId" = e.id
      WHERE e.status <> 'terminated' GROUP BY e.id HAVING COUNT(r.id) FILTER (WHERE r."isCurrent") <> 1`,
  },
  {
    area: "hr",
    name: "employee numbers use the EMP sequence format and the sequence is ahead",
    sql: `SELECT e."employeeNumber" FROM "Employee" e LEFT JOIN "ReferenceSequence" s ON s.id = 'EMP_' || split_part(e."employeeNumber", '-', 2)
      WHERE e."employeeNumber" !~ '^EMP-[0-9]{4}-[0-9]{6}$' OR s."lastNumber" IS NULL OR split_part(e."employeeNumber", '-', 3)::int > s."lastNumber"`,
  },
  {
    area: "hr",
    name: "reporting lines have no cycles",
    sql: `WITH RECURSIVE chain(start, cur, depth) AS (SELECT id, "managerId", 1 FROM "User" WHERE "managerId" IS NOT NULL
        UNION ALL SELECT c.start, u."managerId", c.depth + 1 FROM chain c JOIN "User" u ON u.id = c.cur WHERE u."managerId" IS NOT NULL AND c.depth < 50)
      SELECT DISTINCT start FROM chain WHERE cur = start`,
  },
  {
    area: "hr",
    name: "leave dates are ordered and approved leave does not overlap",
    sql: `SELECT id FROM "LeaveRequest" WHERE "endDate" < "startDate"
      UNION ALL SELECT a.id FROM "LeaveRequest" a JOIN "LeaveRequest" b ON a."employeeId" = b."employeeId" AND a.id < b.id
      WHERE a.status = 'approved' AND b.status = 'approved' AND a."startDate" <= b."endDate" AND b."startDate" <= a."endDate"`,
  },
  {
    area: "hr",
    name: "decided leave records who decided it",
    sql: `SELECT id FROM "LeaveRequest" WHERE status IN ('approved','rejected') AND ("approvedById" IS NULL OR "approvedAt" IS NULL)`,
  },
  {
    area: "hr",
    name: "payroll item gross = fixed pay + bonus + overtime + shift allowance + commission; net = gross − contribution − all deductions",
    sql: `SELECT id FROM "PayrollItem" WHERE "grossSalary" <> "basicSalary" + "housingAllowance" + "transportAllowance" + "otherAllowances" + "bonus" + "overtimePay" + "shiftAllowance" + "commission"
      OR "netSalary" <> "grossSalary" - "gosiEmployee" - "absenceDeduction" - "leaveDeduction" - "latenessDeduction" - "otherDeductions" OR "netSalary" < 0`,
  },
  {
    area: "hr",
    name: "commission paid through payroll matches the salary line",
    sql: `SELECT c.id FROM "CommissionPayout" c JOIN "PayrollItem" i ON i.id = c."payrollItemId" WHERE c.amount <> i.commission`,
  },
  {
    area: "hr",
    name: "leave requests charge days and half days cover a single day",
    sql: `SELECT id FROM "LeaveRequest" WHERE status IN ('pending','approved') AND ("days" <= 0 OR ("dayPortion" <> 'full' AND "startDate"::date <> "endDate"::date))`,
  },
  {
    area: "hr",
    name: "a user's signature is their latest approved drawn signature",
    sql: `SELECT u.email FROM "User" u JOIN LATERAL (SELECT "signatureUrl" FROM "SignatureChange" c WHERE c."userId" = u.id AND c.status = 'approved' ORDER BY c."decidedAt" DESC LIMIT 1) last ON true
      WHERE u."signatureUrl" IS DISTINCT FROM last."signatureUrl"`,
  },
  {
    area: "hr",
    name: "signature changes awaiting approval have a pending approval request",
    sql: `SELECT c.id FROM "SignatureChange" c WHERE c.status = 'pending'
      AND NOT EXISTS (SELECT 1 FROM "ApprovalRequest" a WHERE a."targetType" = 'signature_change' AND a."targetId" = c.id AND a.status = 'pending')`,
  },
  {
    area: "hr",
    name: "support reimbursements are received after their recorded claim period",
    sql: `SELECT id FROM "SupportReimbursement" WHERE to_char("receivedOn", 'YYYY-MM') < "periodEnd" OR "receivedAmount" < 0`,
  },
  {
    area: "hr",
    name: "payroll run totals equal the sum of its items",
    sql: `SELECT r.year, r.month FROM "PayrollRun" r JOIN "PayrollItem" i ON i."payrollRunId" = r.id GROUP BY r.id
      HAVING r."totalGross" <> SUM(i."grossSalary") OR r."totalNet" <> SUM(i."netSalary")
        OR r."totalDeductions" <> SUM(i."gosiEmployee" + i."absenceDeduction" + i."leaveDeduction" + i."latenessDeduction" + i."otherDeductions")`,
  },
  {
    area: "hr",
    name: "paid payroll runs have every salary paid; salaries are only paid once the run is approved",
    sql: `SELECT r.year, r.month, r.status FROM "PayrollRun" r JOIN "PayrollItem" i ON i."payrollRunId" = r.id GROUP BY r.id
      HAVING (r.status = 'paid' AND BOOL_OR(i."paymentStatus" <> 'paid')) OR (r.status NOT IN ('paid', 'approved', 'closed') AND BOOL_OR(i."paymentStatus" = 'paid'))`,
  },
  {
    area: "hr",
    name: "payroll additions and deductions add up to the line's bonus and other deductions",
    sql: `WITH l AS (SELECT "payrollItemId" id, SUM(amount) FILTER (WHERE kind = 'addition') a, SUM(amount) FILTER (WHERE kind = 'deduction') d FROM "PayrollItemLine" GROUP BY 1)
      SELECT p.id, p.bonus, p."otherDeductions", l.a, l.d FROM "PayrollItem" p LEFT JOIN l ON l.id = p.id
      WHERE p.bonus <> COALESCE(l.a, 0) OR p."otherDeductions" <> COALESCE(l.d, 0)`,
  },
  {
    area: "hr",
    name: "payslips match their payroll run period",
    sql: `SELECT p.id FROM "Payslip" p JOIN "PayrollItem" i ON i.id = p."payrollItemId" JOIN "PayrollRun" r ON r.id = i."payrollRunId"
      WHERE p.month <> r.month OR p.year <> r.year OR p."employeeId" <> i."employeeId"`,
  },

  // ---------- Operations ----------
  // Status can be set by hand, so a handover history is not required; an issued asset still needs a holder and others must not keep one.
  {
    area: "operations",
    name: "issued assets have a holder and other assets do not",
    sql: `SELECT "assetTag", status, "holderEmployeeId" FROM "Asset"
      WHERE (status = 'assigned' AND "holderEmployeeId" IS NULL) OR (status <> 'assigned' AND "holderEmployeeId" IS NOT NULL)`,
  },
  {
    area: "operations",
    name: "calendar events end after they start",
    sql: `SELECT id, title FROM "CalendarEvent" WHERE "endDate" < "startDate"`,
  },
  {
    area: "operations",
    name: "approved minutes of meeting record their approver",
    sql: `SELECT "momNumber" FROM "MinuteOfMeeting" WHERE status IN ('approved','shared') AND "approvedById" IS NULL`,
  },
  {
    area: "operations",
    name: "attachments point at an existing record",
    sql: `SELECT a."entityType", a."entityId" FROM "Attachment" a WHERE NOT CASE a."entityType"
        WHEN 'invoice' THEN EXISTS (SELECT 1 FROM "Invoice" x WHERE x.id = a."entityId")
        WHEN 'payment' THEN EXISTS (SELECT 1 FROM "Payment" x WHERE x.id = a."entityId")
        WHEN 'deal' THEN EXISTS (SELECT 1 FROM "CrmDeal" x WHERE x.id = a."entityId")
        WHEN 'contact' THEN EXISTS (SELECT 1 FROM "CrmContact" x WHERE x.id = a."entityId")
        WHEN 'customer_vault' THEN EXISTS (SELECT 1 FROM "CrmContact" x WHERE x.id = a."entityId")
        WHEN 'employee' THEN EXISTS (SELECT 1 FROM "Employee" x WHERE x.id = a."entityId")
        WHEN 'expense' THEN EXISTS (SELECT 1 FROM "Expense" x WHERE x.id = a."entityId")
        ELSE true END`,
  },
];

async function main() {
  let failures = 0;
  for (const rule of RULES) {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      rule.sql,
    );
    if (rows.length) {
      failures++;
      console.log(`✗ [${rule.area}] ${rule.name} — ${rows.length} row(s)`);
      for (const row of rows.slice(0, 5))
        console.log(
          "    ",
          JSON.stringify(row, (_k, v) =>
            typeof v === "bigint" ? Number(v) : v,
          ),
        );
    } else console.log(`✓ [${rule.area}] ${rule.name}`);
  }
  console.log(
    failures
      ? `\n${failures} of ${RULES.length} integrity rules failed.`
      : `\nAll ${RULES.length} integrity rules hold.`,
  );
  if (failures) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
