import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { admin } from "./helpers";

/** Draft records let the layout audit render detail screens without changing existing records. */
export async function prepareLayoutFixtures(db: PrismaClient) {
  const prefix = `UI-${randomUUID()}`;
  const today = new Date();
  const cleanup: Array<() => PromiseLike<unknown>> = [];
  const routes: string[] = [];
  const remove = async () => {
    for (const operation of cleanup.reverse()) await operation();
  };
  async function add(
    model: {
      create(args: { data: any }): PromiseLike<{ id: string }>;
      delete(args: { where: { id: string } }): PromiseLike<unknown>;
    },
    data: Record<string, unknown>,
    route?: string,
  ) {
    const row = await model.create({ data });
    cleanup.push(() => model.delete({ where: { id: row.id } }));
    if (route) routes.push(`${route}/${row.id}`);
    return row.id;
  }
  try {
    const actor = await db.user.findUniqueOrThrow({
      where: { email: admin.email },
    });
    const employee = await db.employee.findFirstOrThrow();
    const warehouse = await db.warehouse.findFirstOrThrow();
    const supplier = await add(db.crmContact, {
      firstName: "Layout supplier مورد",
      contactType: "vendor",
    });
    const category = await add(db.assetCategory, {
      code: prefix,
      nameEn: "Layout equipment",
      nameAr: "معدات التصميم",
    });
    const asset = await add(
      db.asset,
      { assetTag: prefix, categoryId: category, name: "Camera كاميرا" },
      "/dashboard/assets",
    );
    await add(
      db.assetHandover,
      {
        reference: prefix,
        assetId: asset,
        employeeId: employee.id,
        kind: "issue",
        handoverDate: today,
        condition: "good",
        createdById: actor.id,
      },
      "/dashboard/assets/handovers",
    );
    await add(
      db.employeeHandover,
      {
        reference: prefix,
        employeeId: employee.id,
        kind: "exit",
        effectiveDate: today,
        createdById: actor.id,
      },
      "/dashboard/hr/handovers",
    );
    await add(
      db.finalSettlement,
      {
        reference: prefix,
        employeeId: employee.id,
        reason: "resignation",
        lastWorkingDay: today,
        createdById: actor.id,
      },
      "/dashboard/hr/settlements",
    );
    const latest = await db.payrollRun.aggregate({ _max: { year: true } });
    const run = await add(db.payrollRun, {
      year: Math.max(2099, (latest._max.year ?? 2098) + 1),
      month: 1,
      periodStart: today,
      periodEnd: today,
    });
    await add(
      db.payrollItem,
      { payrollRunId: run, employeeId: employee.id },
      "/dashboard/hr/payroll/items",
    );
    await add(
      db.stockCount,
      { number: prefix, warehouseId: warehouse.id },
      "/dashboard/inventory/counts",
    );
    await add(
      db.announcement,
      {
        reference: prefix,
        titleEn: "Layout review إعلان",
        titleAr: "مراجعة التصميم Layout",
        bodyEn: "Draft layout review.",
        bodyAr: "مسودة لمراجعة التصميم.",
        createdById: actor.id,
      },
      "/dashboard/announcements",
    );
    await add(
      db.officialLetter,
      {
        reference: prefix,
        letterDate: today,
        createdById: actor.id,
        verificationCode: prefix,
        subjectEn: "Layout letter",
        subjectAr: "خطاب التصميم",
      },
      "/dashboard/letters",
    );
    await add(
      db.legalMatter,
      { number: prefix, title: "Layout matter قضية" },
      "/dashboard/legal",
    );
    await add(
      db.purchaseRequisition,
      { number: prefix, requestedById: actor.id },
      "/dashboard/procurement/requisitions",
    );
    await add(
      db.rfq,
      { number: prefix, title: "Layout quote عرض" },
      "/dashboard/procurement/rfqs",
    );
    await add(
      db.purchaseOrder,
      { number: prefix, supplierId: supplier },
      "/dashboard/procurement/orders",
    );
    await add(
      db.supplierBill,
      { number: prefix, supplierId: supplier, billDate: today },
      "/dashboard/procurement/bills",
    );
    await add(
      db.product,
      {
        sku: prefix,
        nameEn: "Layout product منتج",
        nameAr: "منتج Layout",
        price: 1,
      },
      "/dashboard/products",
    );
    const order = await add(
      db.salesOrder,
      {
        number: prefix,
        name: "Layout customer عميل",
        paymentMethod: "cash",
        subtotal: 1,
        total: 1,
        currency: "BHD",
      },
      "/dashboard/orders",
    );
    await add(
      db.shipment,
      {
        number: prefix,
        orderId: order,
        promisedBy: today,
        recipientName: "Layout customer عميل",
        recipientPhone: "+973 33000000",
        address: { line1: "Manama المنامة", city: "Manama", country: "BH" },
        trackingToken: prefix,
      },
      "/dashboard/delivery",
    );
    await add(
      db.routeSheet,
      { number: prefix, date: today, driverId: employee.id },
      "/dashboard/delivery/routes",
    );
    const invoice = await add(db.invoice, {
      invoiceNumber: prefix,
      dueDate: today,
    });
    routes.push(`/dashboard/invoices/${invoice}/edit`);
    const project = await add(
      db.project,
      { code: prefix, name: "Layout project مشروع" },
      "/dashboard/tasks/projects",
    );
    await add(
      db.task,
      { number: prefix, title: "Layout task مهمة", projectId: project },
      "/dashboard/tasks",
    );
    return { routes, cleanup: remove };
  } catch (error) {
    await remove();
    throw error;
  }
}
