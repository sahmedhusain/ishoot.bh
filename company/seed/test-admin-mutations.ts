import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

import { createContact, createDeal, createQuotation, getQuotation, listQuotations, listDeals, listContacts } from "../../apps/admin/lib/api/sales";
import { listInvoices, listPayments } from "../../apps/admin/lib/api/finance";

async function main() {
  console.log("=== Testing Admin App End-to-End Mutations ===");

  // 1. Create a Contact
  console.log("\n1. Creating test contact...");
  const contact = await createContact({
    company: "Al Jasmi Media Production",
    firstName: "Ali",
    lastName: "Jassim",
    email: `ali.jassim.${Date.now()}@example.bh`,
    phone: "+97339123456",
    tags: ["vip", "commercial"],
  });
  console.log("   ✅ Contact created:", contact.id, "-", contact.company || `${contact.firstName} ${contact.lastName}`);

  if (!contact.id) {
    throw new Error("Contact ID is missing!");
  }

  // 2. Create a Deal
  console.log("\n2. Creating test deal linked to contact...");
  const deal = await createDeal({
    contactId: contact.id,
    title: "National Day 2026 Commercial Production",
    value: "5200.0",
    stage: "lead",
    currency: "BHD",
  });
  console.log("   ✅ Deal created:", deal.id, "-", deal.title, `(Value: ${deal.value} BHD, Stage: ${deal.stage})`);

  if (!deal.id) {
    throw new Error("Deal ID is missing!");
  }
  if (isNaN(Number(deal.value)) || Number(deal.value) !== 5200) {
    throw new Error(`Deal value is invalid: ${deal.value}`);
  }

  // 3. Create a Quotation
  console.log("\n3. Creating test quotation linked to deal & contact...");
  const today = new Date().toISOString().slice(0, 10);
  const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const quotation = await createQuotation({
    contactId: contact.id,
    dealId: deal.id,
    currency: "BHD",
    subtotal: "5000.0",
    total: "5000.0",
    discount: "0",
    vatAmount: "0",
    vatRate: "0",
    status: "draft",
    notes: "Official quotation for National Day commercial",
    items: [
      {
        description: "4K Cinema Camera Crew (3 Days)",
        quantity: 3,
        unitPrice: 1000.0,
        amount: 3000.0,
        sortOrder: 0,
      },
      {
        description: "Aerial Drone Coverage & Licensing",
        quantity: 1,
        unitPrice: 2000.0,
        amount: 2000.0,
        sortOrder: 1,
      },
    ],
  });
  console.log("   ✅ Quotation created:", quotation.id, "-", quotation.quotationNumber, `(Total: ${quotation.total} BHD)`);

  if (!quotation.id) {
    throw new Error("Quotation ID is missing!");
  }

  // 4. Retrieve Quotation and verify fields
  console.log("\n4. Verifying quotation details...");
  const fetchedQuotation = await getQuotation(quotation.id);
  console.log("   Retrieved Quotation:", {
    id: fetchedQuotation.id,
    number: fetchedQuotation.quotationNumber,
    contactId: fetchedQuotation.contactId,
    dealId: fetchedQuotation.dealId,
    total: fetchedQuotation.total,
    status: fetchedQuotation.status,
    itemsCount: fetchedQuotation.items?.length,
  });

  if (fetchedQuotation.contactId !== contact.id) {
    throw new Error(`Quotation contactId mismatch! Expected ${contact.id}, got ${fetchedQuotation.contactId}`);
  }
  if (fetchedQuotation.dealId !== deal.id) {
    throw new Error(`Quotation dealId mismatch! Expected ${deal.id}, got ${fetchedQuotation.dealId}`);
  }
  if (isNaN(Number(fetchedQuotation.total)) || Number(fetchedQuotation.total) <= 0) {
    throw new Error(`Quotation total is NaN or zero: ${fetchedQuotation.total}`);
  }
  console.log("   ✅ Quotation fields and relationships verified successfully!");

  // 5. Check list counts across services
  console.log("\n5. Checking lists across services...");
  const [allContacts, allDeals, allQuotations, allInvoices, allPayments] = await Promise.all([
    listContacts(),
    listDeals(),
    listQuotations(),
    listInvoices(),
    listPayments(),
  ]);

  console.log(`   Contacts count: ${allContacts.length}`);
  console.log(`   Deals count: ${allDeals.length}`);
  console.log(`   Quotations count: ${allQuotations.length}`);
  console.log(`   Invoices count: ${allInvoices.length}`);
  console.log(`   Payments count: ${allPayments.length}`);

  // Ensure no deal has NaN value
  for (const d of allDeals) {
    if (isNaN(Number(d.value))) {
      throw new Error(`Deal ${d.id} has NaN value!`);
    }
    if (d.value === undefined) {
      throw new Error(`Deal ${d.id} has undefined value!`);
    }
  }

  // Ensure no quotation has NaN total
  for (const q of allQuotations) {
    if (isNaN(Number(q.total))) {
      throw new Error(`Quotation ${q.id} has NaN total!`);
    }
    if (q.total === undefined) {
      throw new Error(`Quotation ${q.id} has undefined total!`);
    }
  }

  console.log("\n🎉 ALL TESTS PASSED! No undefined, no NaN, all entities created and linked cleanly.");
}

main().catch((err) => {
  console.error("\n❌ Test failed:", err);
  if (err.response) {
    console.error("Response:", err.response);
  }
  if (err.extra) {
    console.error("Extra:", JSON.stringify(err.extra, null, 2));
  }
  process.exit(1);
});
