import { expect, test } from "@playwright/test";
import { mintServiceToken } from "./helpers/strict-audit";

const GATEWAY = process.env.API_URL || "http://127.0.0.1:8080";

test.describe("Phase 1.2 — Sales, Finance, HR & Workflow APIs (GET/POST/PUT/DELETE)", () => {
  test("sales API: contacts, deals, inquiries, quotations, campaigns & pipeline stages full CRUD", async ({
    request,
  }) => {
    const token = mintServiceToken("admin");
    const ts = Date.now();
    const headers = { Authorization: `Bearer ${token}` };

    // Read reference endpoints
    for (const p of ["/v1/sales/pipeline-stages", "/v1/sales/catalog", "/v1/sales/contacts", "/v1/sales/deals", "/v1/sales/inquiries", "/v1/sales/quotations", "/v1/sales/campaigns"]) {
      const r = await request.get(`${GATEWAY}${p}`, { headers });
      expect(r.status(), `GET ${p}`).toBe(200);
    }

    // Contact CRUD
    const cRes = await request.post(`${GATEWAY}/v1/sales/contacts`, {
      headers,
      data: {
        firstName: "E2E",
        lastName: `Contact${ts}`,
        email: `e2e-sales-${ts}@example.test`,
        phone: "+97336009999",
        company: `E2E Corp ${ts}`,
        contactType: "company",
        status: "active",
        tags: ["e2e"],
      },
    });
    expect(cRes.status(), await cRes.text()).toBe(201);
    const contact = await cRes.json();
    expect((await request.get(`${GATEWAY}/v1/sales/contacts/${contact.id}`, { headers })).status()).toBe(200);
    expect((await request.put(`${GATEWAY}/v1/sales/contacts/${contact.id}`, {
      headers,
      data: { ...contact, company: `E2E Corp Updated ${ts}` },
    })).status()).toBe(200);

    // Deal CRUD + stage update
    const dRes = await request.post(`${GATEWAY}/v1/sales/deals`, {
      headers,
      data: {
        title: `E2E Deal ${ts}`,
        contactId: contact.id,
        stage: "qualified",
        value: "500.000",
        currency: "BHD",
        probability: 60,
        status: "open",
      },
    });
    expect(dRes.status(), await dRes.text()).toBe(201);
    const deal = await dRes.json();
    expect((await request.get(`${GATEWAY}/v1/sales/deals/${deal.id}`, { headers })).status()).toBe(200);
    expect((await request.put(`${GATEWAY}/v1/sales/deals/${deal.id}/stage`, {
      headers,
      data: { stage: "proposal", status: "open" },
    })).status()).toBe(200);

    // Quotation CRUD + status update
    const qRes = await request.post(`${GATEWAY}/v1/sales/quotations`, {
      headers,
      data: {
        quotationNumber: `QT-E2E-${ts}`,
        dealId: deal.id,
        contactId: contact.id,
        status: "draft",
        subtotal: "100.000",
        discount: "0.000",
        vatRate: "10.00",
        vatAmount: "10.000",
        total: "110.000",
        currency: "BHD",
        items: [
          {
            description: "E2E Consulting Line",
            quantity: "1.000",
            unitPrice: "100.000",
            amount: "100.000",
            sortOrder: 0,
          },
        ],
      },
    });
    expect(qRes.status(), await qRes.text()).toBe(201);
    const quotation = await qRes.json();
    expect((await request.get(`${GATEWAY}/v1/sales/quotations/${quotation.id}`, { headers })).status()).toBe(200);
    expect((await request.put(`${GATEWAY}/v1/sales/quotations/${quotation.id}`, {
      headers,
      data: { notes: `Updated quotation notes ${ts}` },
    })).status()).toBe(200);
    expect((await request.put(`${GATEWAY}/v1/sales/quotations/${quotation.id}/status`, {
      headers,
      data: { status: "sent" },
    })).status()).toBe(200);

    // Inquiry unauthenticated 401 -> service POST -> admin status PUT -> DELETE
    const unauthInq = await request.post(`${GATEWAY}/v1/sales/inquiries`, {
      data: { inquiryType: "quote_request", subject: "Unauth" },
    });
    expect(unauthInq.status()).toBe(401);

    const inqRes = await request.post(`${GATEWAY}/v1/sales/inquiries`, {
      headers,
      data: {
        inquiryType: "quote_request",
        subject: `E2E Inquiry ${ts}`,
        message: "API inquiry lifecycle test",
        requesterName: "API Tester",
        requesterEmail: `api-inq-${ts}@example.test`,
      },
    });
    expect(inqRes.status(), await inqRes.text()).toBe(201);
    const inquiry = await inqRes.json();
    expect((await request.put(`${GATEWAY}/v1/sales/inquiries/${inquiry.id}/status`, {
      headers,
      data: { status: "in_progress" },
    })).status()).toBe(200);

    // Campaign CRUD
    const campRes = await request.post(`${GATEWAY}/v1/sales/campaigns`, {
      headers,
      data: { name: `E2E Campaign ${ts}`, channel: "email", status: "draft" },
    });
    expect(campRes.status(), await campRes.text()).toBe(201);
    const camp = await campRes.json();
    expect((await request.put(`${GATEWAY}/v1/sales/campaigns/${camp.id}`, {
      headers,
      data: { ...camp, name: `E2E Campaign Updated ${ts}` },
    })).status()).toBe(200);

    // Cleanup all created sales entities + verify 404 after DELETE
    expect((await request.delete(`${GATEWAY}/v1/sales/campaigns/${camp.id}`, { headers })).status()).toBe(204);
    expect((await request.delete(`${GATEWAY}/v1/sales/inquiries/${inquiry.id}`, { headers })).status()).toBe(204);
    expect((await request.delete(`${GATEWAY}/v1/sales/quotations/${quotation.id}`, { headers })).status()).toBe(204);
    expect((await request.delete(`${GATEWAY}/v1/sales/deals/${deal.id}`, { headers })).status()).toBe(204);
    expect((await request.delete(`${GATEWAY}/v1/sales/contacts/${contact.id}`, { headers })).status()).toBe(204);
    expect((await request.get(`${GATEWAY}/v1/sales/contacts/${contact.id}`, { headers })).status()).toBe(404);
  });

  test("finance API: invoices, payments, expense categories, expenses & settlements CRUD", async ({ request }) => {
    const token = mintServiceToken("admin");
    const headers = { Authorization: `Bearer ${token}` };
    const ts = Date.now();

    for (const p of [
      "/v1/finance/invoices",
      "/v1/finance/payments",
      "/v1/finance/expenses",
      "/v1/finance/expense-categories",
      "/v1/finance/settlements",
      "/v1/finance/catalog",
      "/v1/finance/contacts-ref",
      "/v1/finance/quotations-ref",
      "/v1/finance/tax-rates",
      "/v1/finance/commission-snapshots",
      "/v1/finance/payment-collections",
      "/v1/finance/document-taxes",
      "/v1/finance/journal-entries",
      "/v1/finance/payment-methods",
      "/v1/system/final-settlements",
    ]) {
      const r = await request.get(`${GATEWAY}${p}`, { headers });
      expect(r.status(), `GET ${p}`).toBe(200);
    }

    // Expense Category CRUD
    const catRes = await request.post(`${GATEWAY}/v1/finance/expense-categories`, {
      headers,
      data: { nameEn: `E2E Exp Cat ${ts}`, nameAr: `فئة مصروف ${ts}`, code: `EC${ts.toString().slice(-6)}`, isActive: true },
    });
    expect(catRes.status(), await catRes.text()).toBe(201);
    const cat = await catRes.json();
    expect((await request.put(`${GATEWAY}/v1/finance/expense-categories/${cat.id}`, {
      headers,
      data: { ...cat, nameEn: `E2E Exp Cat Updated ${ts}` },
    })).status()).toBe(200);

    // Expense CRUD
    const expRes = await request.post(`${GATEWAY}/v1/finance/expenses`, {
      headers,
      data: {
        title: `E2E Expense ${ts}`,
        categoryId: cat.id,
        amount: "25.500",
        currency: "BHD",
        expenseDate: new Date().toISOString().slice(0, 10),
        status: "pending",
        vendor: "E2E Vendor",
      },
    });
    expect(expRes.status(), await expRes.text()).toBe(201);
    const exp = await expRes.json();
    expect((await request.put(`${GATEWAY}/v1/finance/expenses/${exp.id}`, {
      headers,
      data: { title: `E2E Expense Edited ${ts}`, amount: 30.0 },
    })).status()).toBe(200);
    expect((await request.put(`${GATEWAY}/v1/finance/expenses/${exp.id}/approve`, {
      headers,
      data: { approvedBy: "BA0001" },
    })).status()).toBe(200);

    // Invoice CRUD + status + payment allocation + delete
    const today = new Date().toISOString().slice(0, 10);
    const invRes = await request.post(`${GATEWAY}/v1/finance/invoices`, {
      headers,
      data: {
        invoiceNumber: `INV-E2E-${ts}`,
        status: "draft",
        issueDate: today,
        dueDate: today,
        subtotal: "100.000",
        discount: "0.000",
        vatRate: "10.00",
        vatAmount: "10.000",
        total: "110.000",
        amountPaid: "0.000",
        balanceDue: "110.000",
        currency: "BHD",
        items: [
          {
            description: "E2E API Invoice Item",
            quantity: "1.000",
            unitPrice: "100.000",
            amount: "100.000",
            sortOrder: 0,
          },
        ],
      },
    });
    expect(invRes.status(), await invRes.text()).toBe(201);
    const inv = await invRes.json();
    expect((await request.get(`${GATEWAY}/v1/finance/invoices/${inv.id}`, { headers })).status()).toBe(200);
    expect((await request.put(`${GATEWAY}/v1/finance/invoices/${inv.id}/status`, {
      headers,
      data: { status: "sent" },
    })).status()).toBe(200);

    const payRes = await request.post(`${GATEWAY}/v1/finance/payments`, {
      headers,
      data: {
        paymentNumber: `PAY-E2E-${ts}`,
        invoiceId: inv.id,
        amount: "50.000",
        currency: "BHD",
        paymentMethod: "bank_transfer",
        paymentDate: today,
        allocations: [{ invoiceId: inv.id, allocatedAmount: "50.000" }],
      },
    });
    expect(payRes.status(), await payRes.text()).toBe(201);
    const pay = await payRes.json();
    expect((await request.get(`${GATEWAY}/v1/finance/payments/${pay.id}`, { headers })).status()).toBe(200);

    // Cleanup
    expect((await request.delete(`${GATEWAY}/v1/finance/payments/${pay.id}`, { headers })).status()).toBe(204);
    expect((await request.delete(`${GATEWAY}/v1/finance/invoices/${inv.id}`, { headers })).status()).toBe(204);
    expect((await request.delete(`${GATEWAY}/v1/finance/expenses/${exp.id}`, { headers })).status()).toBe(204);
    expect((await request.delete(`${GATEWAY}/v1/finance/expense-categories/${cat.id}`, { headers })).status()).toBe(204);
  });

  test("hr & workflow APIs: departments, employees, tasks, moms, contracts & approvals CRUD", async ({
    request,
  }) => {
    const token = mintServiceToken("admin");
    const headers = { Authorization: `Bearer ${token}` };
    const ts = Date.now();

    for (const p of [
      "/v1/hr/departments",
      "/v1/hr/employees",
      "/v1/hr/leave",
      "/v1/hr/leave-balances",
      "/v1/hr/attendance",
      "/v1/hr/payroll",
      "/v1/hr/gosi/settings",
      "/v1/workflow/approvals",
      "/v1/workflow/signatures",
      "/v1/workflow/tasks",
      "/v1/workflow/calendar",
      "/v1/workflow/moms",
      "/v1/workflow/contracts",
      "/v1/workflow/letters",
      "/v1/workflow/letter-templates",
      "/v1/workflow/directory",
    ]) {
      const r = await request.get(`${GATEWAY}${p}`, { headers });
      expect(r.status(), `GET ${p}`).toBe(200);
    }

    // Department CRUD
    const deptRes = await request.post(`${GATEWAY}/v1/hr/departments`, {
      headers,
      data: { code: `D${ts.toString().slice(-6)}`, nameEn: `E2E Dept ${ts}`, nameAr: `قسم ${ts}` },
    });
    expect(deptRes.status(), await deptRes.text()).toBe(201);
    const dept = await deptRes.json();
    expect((await request.put(`${GATEWAY}/v1/hr/departments/${dept.id}`, {
      headers,
      data: { ...dept, nameEn: `E2E Dept Updated ${ts}` },
    })).status()).toBe(200);

    // Employee CRUD
    const empRes = await request.post(`${GATEWAY}/v1/hr/employees`, {
      headers,
      data: {
        employeeNumber: `E2E-${ts.toString().slice(-6)}`,
        firstNameEn: "E2E",
        lastNameEn: `Staff${ts}`,
        firstNameAr: "موظف",
        lastNameAr: `${ts}`,
        email: `e2e-emp-${ts}@example.test`,
        jobTitleEn: "QA Engineer",
        jobTitleAr: "مهندس جودة",
        departmentId: dept.id,
        hireDate: new Date().toISOString().slice(0, 10),
        status: "active",
        basicSalary: "800.000",
        housingAllowance: "100.000",
        transportAllowance: "50.000",
        otherAllowances: "0.000",
      },
    });
    expect(empRes.status(), await empRes.text()).toBe(201);
    const emp = await empRes.json();
    expect((await request.get(`${GATEWAY}/v1/hr/employees/${emp.id}`, { headers })).status()).toBe(200);
    expect((await request.put(`${GATEWAY}/v1/hr/employees/${emp.id}`, {
      headers,
      data: { ...emp, jobTitleEn: "Senior QA Engineer" },
    })).status()).toBe(200);
    expect((await request.delete(`${GATEWAY}/v1/hr/employees/${emp.id}`, { headers })).status()).toBe(204);
    expect((await request.delete(`${GATEWAY}/v1/hr/departments/${dept.id}`, { headers })).status()).toBe(204);

    // Workflow Task CRUD
    const taskRes = await request.post(`${GATEWAY}/v1/workflow/tasks`, {
      headers,
      data: { title: `E2E Task ${ts}`, status: "todo", priority: "medium" },
    });
    expect(taskRes.status(), await taskRes.text()).toBe(201);
    const task = await taskRes.json();
    expect((await request.put(`${GATEWAY}/v1/workflow/tasks/${task.id}/status`, {
      headers,
      data: { status: "done" },
    })).status()).toBe(200);
    expect((await request.delete(`${GATEWAY}/v1/workflow/tasks/${task.id}`, { headers })).status()).toBe(204);

    // Workflow MoM CRUD
    const momRes = await request.post(`${GATEWAY}/v1/workflow/moms`, {
      headers,
      data: {
        momNumber: `MOM-E2E-${ts}`,
        title: `E2E MoM ${ts}`,
        meetingDate: new Date().toISOString().slice(0, 10),
        status: "draft",
      },
    });
    expect(momRes.status(), await momRes.text()).toBe(201);
    const mom = await momRes.json();
    expect((await request.get(`${GATEWAY}/v1/workflow/moms/${mom.id}`, { headers })).status()).toBe(200);
    expect((await request.put(`${GATEWAY}/v1/workflow/moms/${mom.id}`, {
      headers,
      data: { ...mom, title: `E2E MoM Updated ${ts}` },
    })).status()).toBe(200);
    expect((await request.delete(`${GATEWAY}/v1/workflow/moms/${mom.id}`, { headers })).status()).toBe(204);
  });
});
