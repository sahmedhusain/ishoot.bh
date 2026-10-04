require("dotenv").config({ quiet: true });
const crypto = require("crypto");
const { PrismaClient } = require("../packages/database/node_modules/@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting seed-new-features script...");

  // Fetch users for linking
  const users = await prisma.user.findMany();
  const userByRole = {};
  for (const u of users) {
    userByRole[u.role] = u;
  }
  const superAdmin = userByRole["super_admin"] || users[0];
  const adminUser = userByRole["admin"] || superAdmin;
  const financeManager = userByRole["finance_manager"] || superAdmin;
  const productionManager = userByRole["production_manager"] || superAdmin;
  const producer = userByRole["producer"] || productionManager;
  const editor = userByRole["editor"] || superAdmin;
  const sales = userByRole["sales"] || superAdmin;

  console.log(`👤 Found ${users.length} users. Super Admin: ${superAdmin?.email}`);

  // Fetch contacts for linking
  const contacts = await prisma.crmContact.findMany();
  const contact01 = contacts.find((c) => c.companyName?.includes("Batelco")) || contacts[0];
  const contact02 = contacts.find((c) => c.companyName?.includes("Gulf Air")) || contacts[1] || contact01;
  const contact03 = contacts.find((c) => c.companyName?.includes("Tourism") || c.companyName?.includes("BTEA")) || contacts[2] || contact01;
  const contact04 = contacts.find((c) => c.companyName?.includes("BBDO")) || contacts[3] || contact01;

  console.log(`🏢 Linked contacts: ${contact01?.id}, ${contact02?.id}, ${contact03?.id}, ${contact04?.id}`);

  // 1. Reference Sequences
  console.log("🔢 Seeding Reference Sequences...");
  const refSequences = [
    { id: "SR_2026", prefix: "SR", year: 2026, lastNumber: 1 },
    { id: "CR_2026", prefix: "CR", year: 2026, lastNumber: 1 },
    { id: "QTE_2026", prefix: "QTE", year: 2026, lastNumber: 6 },
    { id: "INV_2026", prefix: "INV", year: 2026, lastNumber: 25 },
  ];
  for (const seq of refSequences) {
    await prisma.referenceSequence.upsert({
      where: { id: seq.id },
      update: { lastNumber: seq.lastNumber },
      create: seq,
    });
  }

  // 2. Exchange Rate Snapshots (Canonical 9 Currencies)
  console.log("💱 Seeding Exchange Rate Snapshots (9 Canonical Currencies)...");
  const fxSnapshotsData = [
    { baseCurrency: "BHD", quoteCurrency: "USD", rate: 2.652520, effectiveDate: new Date("2026-10-04"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "SAR", rate: 9.946950, effectiveDate: new Date("2026-10-04"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "AED", rate: 9.741600, effectiveDate: new Date("2026-10-04"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "KWD", rate: 0.814210, effectiveDate: new Date("2026-10-04"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "OMR", rate: 1.020580, effectiveDate: new Date("2026-10-04"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "QAR", rate: 9.655170, effectiveDate: new Date("2026-10-04"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "EUR", rate: 2.450980, effectiveDate: new Date("2026-10-04"), provider: "frankfurter" },
    { baseCurrency: "BHD", quoteCurrency: "GBP", rate: 2.083330, effectiveDate: new Date("2026-10-04"), provider: "frankfurter" },
    { baseCurrency: "BHD", quoteCurrency: "USD", rate: 2.652520, effectiveDate: new Date("2026-10-03"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "SAR", rate: 9.947200, effectiveDate: new Date("2026-10-03"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "AED", rate: 9.741200, effectiveDate: new Date("2026-10-03"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "KWD", rate: 0.814150, effectiveDate: new Date("2026-10-03"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "OMR", rate: 1.020500, effectiveDate: new Date("2026-10-03"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "QAR", rate: 9.654800, effectiveDate: new Date("2026-10-03"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "EUR", rate: 2.448500, effectiveDate: new Date("2026-10-03"), provider: "frankfurter" },
    { baseCurrency: "BHD", quoteCurrency: "GBP", rate: 2.081500, effectiveDate: new Date("2026-10-03"), provider: "frankfurter" },
  ];
  for (const fx of fxSnapshotsData) {
    await prisma.exchangeRateSnapshot.upsert({
      where: {
        baseCurrency_quoteCurrency_effectiveDate: {
          baseCurrency: fx.baseCurrency,
          quoteCurrency: fx.quoteCurrency,
          effectiveDate: fx.effectiveDate,
        },
      },
      update: { rate: fx.rate, provider: fx.provider },
      create: fx,
    });
  }

  // 3. HRMS Departments & Leave Types
  console.log("🏛️ Seeding HRMS Departments & Leave Types...");
  const departmentsData = [
    { code: "EXEC", nameEn: "Executive Management", nameAr: "الإدارة التنفيذية", managerId: superAdmin?.id },
    { code: "PROD", nameEn: "Production & Cinematography", nameAr: "إدارة الإنتاج والتصوير السينمائي", managerId: productionManager?.id },
    { code: "POST", nameEn: "Post-Production & VFX", nameAr: "ما بعد الإنتاج والمونتاج والمؤثرات", managerId: productionManager?.id },
    { code: "FIN", nameEn: "Finance & Accounts", nameAr: "الشؤون المالية والمحاسبة", managerId: financeManager?.id },
    { code: "COMM", nameEn: "Commercial & Business Development", nameAr: "الشؤون التجارية وتطوير الأعمال", managerId: sales?.id },
  ];
  const deptMap = {};
  for (const d of departmentsData) {
    const created = await prisma.department.upsert({
      where: { code: d.code },
      update: { nameEn: d.nameEn, nameAr: d.nameAr, managerId: d.managerId },
      create: d,
    });
    deptMap[d.code] = created.id;
  }

  const leaveTypesData = [
    { code: "annual", nameEn: "Annual Leave", nameAr: "إجازة سنوية", daysAllowedPerYear: 30, isPaid: true },
    { code: "sick", nameEn: "Sick Leave", nameAr: "إجازة مرضية", daysAllowedPerYear: 15, isPaid: true },
    { code: "emergency", nameEn: "Emergency Leave", nameAr: "إجازة طارئة", daysAllowedPerYear: 6, isPaid: true },
    { code: "hajj", nameEn: "Hajj Leave", nameAr: "إجازة حج", daysAllowedPerYear: 21, isPaid: true },
  ];
  const leaveTypeMap = {};
  for (const lt of leaveTypesData) {
    const created = await prisma.leaveType.upsert({
      where: { code: lt.code },
      update: { nameEn: lt.nameEn, nameAr: lt.nameAr, daysAllowedPerYear: lt.daysAllowedPerYear, isPaid: lt.isPaid },
      create: lt,
    });
    leaveTypeMap[lt.code] = created.id;
  }

  // 4. HRMS Employees & Employment Records
  console.log("👥 Seeding HRMS Employees & Employment Records...");
  const employeesData = [
    {
      employeeNumber: "EMP-001",
      userId: superAdmin?.id,
      departmentId: deptMap["EXEC"],
      firstNameEn: "Sayed",
      lastNameEn: "Ahmed",
      firstNameAr: "سيد",
      lastNameAr: "أحمد",
      email: superAdmin?.email,
      phone: "+973 3900 1100",
      cprNumber: "880112345",
      jobTitleEn: "General Director & Cinema Director",
      jobTitleAr: "المدير العام والمخرج السينمائي",
      hireDate: new Date("2020-01-01"),
      status: "active",
      leaveBalanceDays: 30.0,
      basicSalary: 3500.0,
      housingAllowance: 500.0,
      transportAllowance: 200.0,
    },
    {
      employeeNumber: "EMP-002",
      userId: adminUser?.id,
      departmentId: deptMap["EXEC"],
      firstNameEn: "Mohamed",
      lastNameEn: "Al-Mahdi",
      firstNameAr: "محمد",
      lastNameAr: "المهدي",
      email: adminUser?.email,
      phone: "+973 3900 2200",
      cprNumber: "910223456",
      jobTitleEn: "Managing Director",
      jobTitleAr: "المدير التنفيذي",
      hireDate: new Date("2021-03-01"),
      status: "active",
      leaveBalanceDays: 28.0,
      basicSalary: 2800.0,
      housingAllowance: 400.0,
      transportAllowance: 150.0,
    },
    {
      employeeNumber: "EMP-003",
      userId: financeManager?.id,
      departmentId: deptMap["FIN"],
      firstNameEn: "Zainab",
      lastNameEn: "Al-Shami",
      firstNameAr: "زينب",
      lastNameAr: "الشامي",
      email: financeManager?.email,
      phone: "+973 3900 3300",
      cprNumber: "930334567",
      jobTitleEn: "Chief Financial Officer",
      jobTitleAr: "المدير المالي الأول",
      hireDate: new Date("2022-01-15"),
      status: "active",
      leaveBalanceDays: 26.0,
      basicSalary: 2400.0,
      housingAllowance: 350.0,
      transportAllowance: 150.0,
    },
    {
      employeeNumber: "EMP-004",
      userId: productionManager?.id,
      departmentId: deptMap["PROD"],
      firstNameEn: "Ali",
      lastNameEn: "Al-Samahiji",
      firstNameAr: "علي",
      lastNameAr: "السماهيجي",
      email: productionManager?.email,
      phone: "+973 3900 4400",
      cprNumber: "900445678",
      jobTitleEn: "Head of Cinematic Production",
      jobTitleAr: "رئيس الإنتاج السينمائي الميداني",
      hireDate: new Date("2021-06-01"),
      status: "active",
      leaveBalanceDays: 25.0,
      basicSalary: 2200.0,
      housingAllowance: 300.0,
      transportAllowance: 150.0,
    },
    {
      employeeNumber: "EMP-005",
      userId: editor?.id,
      departmentId: deptMap["POST"],
      firstNameEn: "Fatima",
      lastNameEn: "Al-Kaabi",
      firstNameAr: "فاطمة",
      lastNameAr: "الكعبي",
      email: editor?.email,
      phone: "+973 3900 6600",
      cprNumber: "950556789",
      jobTitleEn: "Lead Colorist & Senior Editor",
      jobTitleAr: "رئيسة قسم المونتاج وتلوين السينما",
      hireDate: new Date("2022-08-01"),
      status: "on_leave",
      leaveBalanceDays: 21.0,
      basicSalary: 1800.0,
      housingAllowance: 250.0,
      transportAllowance: 100.0,
    },
    {
      employeeNumber: "EMP-006",
      userId: sales?.id,
      departmentId: deptMap["COMM"],
      firstNameEn: "Khalid",
      lastNameEn: "Al-Saeed",
      firstNameAr: "خالد",
      lastNameAr: "السعيد",
      email: sales?.email,
      phone: "+973 3900 8811",
      cprNumber: "940667890",
      jobTitleEn: "Commercial Accounts Executive",
      jobTitleAr: "المسؤول التنفيذي للحسابات التجارية",
      hireDate: new Date("2023-02-01"),
      status: "active",
      leaveBalanceDays: 27.0,
      basicSalary: 1600.0,
      housingAllowance: 250.0,
      transportAllowance: 100.0,
    },
  ];

  const empMap = {};
  for (const emp of employeesData) {
    const { basicSalary, housingAllowance, transportAllowance, ...empFields } = emp;
    const createdEmp = await prisma.employee.upsert({
      where: { employeeNumber: empFields.employeeNumber },
      update: empFields,
      create: empFields,
    });
    empMap[empFields.employeeNumber] = createdEmp;

    await prisma.employmentRecord.deleteMany({ where: { employeeId: createdEmp.id } });
    await prisma.employmentRecord.create({
      data: {
        employeeId: createdEmp.id,
        contractType: "full_time",
        basicSalary,
        housingAllowance,
        transportAllowance,
        otherAllowances: 0.0,
        effectiveFrom: empFields.hireDate,
        isCurrent: true,
      },
    });
  }

  // Approved Leave Request for EMP-005
  if (empMap["EMP-005"] && leaveTypeMap["annual"]) {
    await prisma.leaveRequest.deleteMany({ where: { employeeId: empMap["EMP-005"].id } });
    await prisma.leaveRequest.create({
      data: {
        employeeId: empMap["EMP-005"].id,
        leaveTypeId: leaveTypeMap["annual"],
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-07"),
        fullDay: true,
        status: "approved",
        reason: "Annual vacation & rest after international commercial film project.",
        approvedById: productionManager?.id || superAdmin?.id,
        approvedAt: new Date("2026-09-28"),
        reviewNotes: "Approved. All Davinci Resolve suites handed over to secondary colorist.",
      },
    });
  }

  // 5. HRMS Payroll Run (Month 9, Year 2026)
  console.log("💰 Seeding HRMS Payroll Run (Month 9, 2026)...");
  const payrollRun = await prisma.payrollRun.upsert({
    where: { year_month: { year: 2026, month: 9 } },
    update: {
      status: "approved",
      totalGross: 15300.0,
      totalDeductions: 1071.0,
      totalNet: 14229.0,
      totalEmployerCost: 17136.0,
      approvedById: superAdmin?.id,
      approvedAt: new Date("2026-09-28"),
    },
    create: {
      year: 2026,
      month: 9,
      periodStart: new Date("2026-09-01"),
      periodEnd: new Date("2026-09-30"),
      status: "approved",
      totalGross: 15300.0,
      totalDeductions: 1071.0,
      totalNet: 14229.0,
      totalEmployerCost: 17136.0,
      approvedById: superAdmin?.id,
      approvedAt: new Date("2026-09-28"),
    },
  });

  await prisma.payrollItem.deleteMany({ where: { payrollRunId: payrollRun.id } });
  for (const emp of employeesData) {
    const createdEmp = empMap[emp.employeeNumber];
    if (!createdEmp) continue;
    const gross = emp.basicSalary + emp.housingAllowance + emp.transportAllowance;
    const gosiEmp = gross * 0.07;
    const gosiEmpr = gross * 0.12;
    const net = gross - gosiEmp;
    await prisma.payrollItem.create({
      data: {
        payrollRunId: payrollRun.id,
        employeeId: createdEmp.id,
        basicSalary: emp.basicSalary,
        housingAllowance: emp.housingAllowance,
        transportAllowance: emp.transportAllowance,
        otherAllowances: 0.0,
        grossSalary: gross,
        gosiEmployee: gosiEmp,
        gosiEmployer: gosiEmpr,
        otherDeductions: 0.0,
        netSalary: net,
        paymentStatus: "paid",
      },
    });
  }

  // ApprovalRequest for Payroll Run
  const payrollHash = crypto.createHash("sha256").update(`payroll_${payrollRun.id}_1`).digest("hex");
  const payrollApproval = await prisma.approvalRequest.upsert({
    where: { targetType_targetId_revision: { targetType: "payroll_run", targetId: payrollRun.id, revision: 1 } },
    update: { status: "approved" },
    create: {
      targetType: "payroll_run",
      targetId: payrollRun.id,
      revision: 1,
      contentHash: payrollHash,
      status: "approved",
      requestedById: financeManager?.id || superAdmin?.id,
      policySnapshot: { threshold: 10000, requiredRole: "super_admin" },
      diffPayload: { totalNet: 14229.0, employeeCount: employeesData.length },
    },
  });

  await prisma.approvalDecision.deleteMany({ where: { approvalRequestId: payrollApproval.id } });
  await prisma.approvalDecision.create({
    data: {
      approvalRequestId: payrollApproval.id,
      decision: "approved",
      decidedById: superAdmin?.id,
      reason: "September 2026 studio staff payroll and statutory GOSI allocations reviewed and approved.",
      decidedAt: new Date("2026-09-28"),
    },
  });

  // 6. Inquiries (Service Request & Change Request)
  console.log("📨 Seeding Inquiries (SR & CR)...");
  const srInquiry = await prisma.inquiry.upsert({
    where: { reference: "SR-2026-0001" },
    update: {
      requestType: "SR",
      workflowStatus: "in_progress",
      priority: "high",
    },
    create: {
      reference: "SR-2026-0001",
      requestType: "SR",
      name: contact01?.firstName ? `${contact01.firstName} ${contact01.lastName || ""}` : "حمد الرميحي",
      email: contact01?.email || "h.alromaihi@batelco.com.bh",
      phone: contact01?.phone || "+973 3944 1122",
      companyName: contact01?.companyName || "Batelco Telecommunications",
      customerId: contact01?.id,
      serviceType: "commercial_film",
      message: "Requesting studio crew, Arri Alexa 35 package, and director for 5G Ultra commercial pickup day.",
      status: "qualified",
      workflowStatus: "in_progress",
      priority: "high",
      team: "production",
      assignedToId: productionManager?.id,
      slaDueDate: new Date("2026-10-10"),
    },
  });

  await prisma.requestEvent.deleteMany({ where: { inquiryId: srInquiry.id } });
  await prisma.requestAssignment.deleteMany({ where: { inquiryId: srInquiry.id } });
  await prisma.requestComment.deleteMany({ where: { inquiryId: srInquiry.id } });

  await prisma.requestEvent.createMany({
    data: [
      { inquiryId: srInquiry.id, actorId: superAdmin?.id, eventType: "status_change", details: { from: "received", to: "in_progress" } },
      { inquiryId: srInquiry.id, actorId: productionManager?.id, eventType: "assignment", details: { assignedTo: "Ali Al-Samahiji" } },
    ],
  });

  await prisma.requestAssignment.create({
    data: {
      inquiryId: srInquiry.id,
      assignedToId: productionManager?.id || superAdmin?.id,
      assignedById: superAdmin?.id,
      team: "production",
      reason: "Lead production management for Batelco 5G pickup shoot.",
      active: true,
    },
  });

  await prisma.requestComment.createMany({
    data: [
      {
        inquiryId: srInquiry.id,
        authorId: productionManager?.id || superAdmin?.id,
        body: "Arri Alexa 35 and Cooke Anamorphic lens kit reserved with grip team.",
        isClientVisible: false,
      },
      {
        inquiryId: srInquiry.id,
        authorId: superAdmin?.id,
        body: "Schedule confirmed for Thursday at Bahrain Bay location.",
        isClientVisible: true,
      },
    ],
  });

  const crInquiry = await prisma.inquiry.upsert({
    where: { reference: "CR-2026-0001" },
    update: {
      requestType: "CR",
      workflowStatus: "under_review",
      priority: "urgent",
    },
    create: {
      reference: "CR-2026-0001",
      requestType: "CR",
      name: contact03?.firstName ? `${contact03.firstName} ${contact03.lastName || ""}` : "طارق الدوسري",
      email: contact03?.email || "t.aldoseri@btea.bh",
      phone: contact03?.phone || "+973 3611 9900",
      companyName: contact03?.companyName || "Bahrain Tourism & Exhibitions Authority (BTEA)",
      customerId: contact03?.id,
      serviceType: "aerial_cinematography",
      message: "Scope change: Additional 4K FPV drone passes and sunset hyperlapse shots over Exhibition World Bahrain.",
      status: "contacted",
      workflowStatus: "under_review",
      priority: "urgent",
      team: "production",
      assignedToId: producer?.id,
      slaDueDate: new Date("2026-10-08"),
    },
  });

  await prisma.requestEvent.deleteMany({ where: { inquiryId: crInquiry.id } });
  await prisma.requestAssignment.deleteMany({ where: { inquiryId: crInquiry.id } });
  await prisma.requestComment.deleteMany({ where: { inquiryId: crInquiry.id } });

  await prisma.requestEvent.create({
    data: { inquiryId: crInquiry.id, actorId: superAdmin?.id, eventType: "status_change", details: { from: "received", to: "under_review" } },
  });

  await prisma.requestAssignment.create({
    data: {
      inquiryId: crInquiry.id,
      assignedToId: producer?.id || superAdmin?.id,
      assignedById: superAdmin?.id,
      team: "production",
      reason: "Evaluating flight permissions and additional equipment rate for sunset shoot.",
      active: true,
    },
  });

  // 7. Quotations across Full Lifecycle
  console.log("📄 Seeding Quotations across Full Lifecycle (Draft, Submitted, Approved, Issued, Accepted, Converted)...");
  
  // Find first invoice to link converted quotation
  const firstInvoice = await prisma.invoice.findFirst();

  const quotationsData = [
    {
      quotationNumber: "QTE-2026-001",
      clientId: contact01?.id,
      subtotal: 3500.0,
      vatEnabled: false,
      vatPercentage: 10.0,
      vatAmount: 0.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      totalAmount: 3500.0,
      currency: "BHD",
      language: "ar",
      status: "draft",
      issueDate: new Date("2026-10-01"),
      validUntilDate: new Date("2026-11-01"),
      createdById: sales?.id || superAdmin?.id,
      items: [
        { descriptionEn: "Arri Alexa 35 Camera Package (2 Days)", descriptionAr: "باقة كاميرا أري أليكسا 35 السينمائية (يومان)", quantity: 2, unitPrice: 1000.0, lineTotal: 2000.0, orderIndex: 0 },
        { descriptionEn: "Cinema Prime Lenses (Set of 5)", descriptionAr: "طقم عدسات سينمائية فاخرة (5 عدسات)", quantity: 2, unitPrice: 500.0, lineTotal: 1000.0, orderIndex: 1 },
        { descriptionEn: "Grip & Sound Equipment Package", descriptionAr: "باقة معدات الإضاءة وهندسة الصوت الميدانية", quantity: 1, unitPrice: 500.0, lineTotal: 500.0, orderIndex: 2 },
      ],
    },
    {
      quotationNumber: "QTE-2026-002",
      clientId: contact02?.id,
      subtotal: 6000.0,
      vatEnabled: true,
      vatPercentage: 10.0,
      vatAmount: 570.0,
      discountType: "percentage",
      discountValue: 5.0,
      discountAmount: 300.0,
      totalAmount: 6270.0,
      currency: "BHD",
      language: "en",
      status: "submitted",
      issueDate: new Date("2026-10-02"),
      validUntilDate: new Date("2026-11-02"),
      createdById: sales?.id || superAdmin?.id,
      items: [
        { descriptionEn: "Commercial Film Production — In-flight Brand Story", descriptionAr: "إنتاج فيلم إعلاني ترويجي — تجربة الضيافة الجوية", quantity: 1, unitPrice: 4500.0, lineTotal: 4500.0, orderIndex: 0 },
        { descriptionEn: "DaVinci Resolve HDR Color Grading & Mastering", descriptionAr: "تلوين سينمائي وماسترينغ رقمي بأحدث تقنيات HDR", quantity: 1, unitPrice: 1500.0, lineTotal: 1500.0, orderIndex: 1 },
      ],
    },
    {
      quotationNumber: "QTE-2026-003",
      clientId: contact03?.id,
      subtotal: 12000.0,
      vatEnabled: true,
      vatPercentage: 10.0,
      vatAmount: 1080.0,
      discountType: "percentage",
      discountValue: 10.0,
      discountAmount: 1200.0,
      totalAmount: 11880.0,
      currency: "BHD",
      language: "ar",
      status: "approved",
      issueDate: new Date("2026-09-25"),
      validUntilDate: new Date("2026-10-25"),
      createdById: sales?.id || superAdmin?.id,
      items: [
        { descriptionEn: "Tourism Kingdom Showcase Film (8K Raw)", descriptionAr: "فيلم وثائقي ترويجي لمعالم مملكة البحرين (8K RAW)", quantity: 1, unitPrice: 7000.0, lineTotal: 7000.0, orderIndex: 0 },
        { descriptionEn: "Heavy-Lifter Drone Cinematography with Operator", descriptionAr: "تصوير جوي سينمائي متقدم بواسطة طائرة درون مخصصة للسينما", quantity: 2, unitPrice: 1500.0, lineTotal: 3000.0, orderIndex: 1 },
        { descriptionEn: "Original Cinematic Orchestral Score & Sound Design", descriptionAr: "تأليف موسيقى تصويرية أوركسترالية خاصة وتصميم صوتي", quantity: 1, unitPrice: 2000.0, lineTotal: 2000.0, orderIndex: 2 },
      ],
    },
    {
      quotationNumber: "QTE-2026-004",
      clientId: contact04?.id,
      subtotal: 4800.0,
      vatEnabled: false,
      vatPercentage: 10.0,
      vatAmount: 0.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      totalAmount: 4800.0,
      currency: "BHD",
      language: "en",
      status: "issued",
      deliveryChannel: "email",
      deliveredAt: new Date("2026-10-02T10:00:00Z"),
      issueDate: new Date("2026-10-02"),
      validUntilDate: new Date("2026-11-02"),
      createdById: sales?.id || superAdmin?.id,
      items: [
        { descriptionEn: "Social Media 4K Campaign Reels (Set of 6)", descriptionAr: "إنتاج وتصوير 6 مقاطع فيديو ترويجية لمنصات التواصل (4K)", quantity: 6, unitPrice: 600.0, lineTotal: 3600.0, orderIndex: 0 },
        { descriptionEn: "High-End Motion Graphics & Typography Design", descriptionAr: "تصميم غرافيك متحرك وطباعة حركية عالية الدقة", quantity: 1, unitPrice: 1200.0, lineTotal: 1200.0, orderIndex: 1 },
      ],
    },
    {
      quotationNumber: "QTE-2026-005",
      clientId: contact01?.id,
      subtotal: 8500.0,
      vatEnabled: true,
      vatPercentage: 10.0,
      vatAmount: 850.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      totalAmount: 9350.0,
      currency: "BHD",
      language: "ar",
      status: "accepted",
      acceptanceEvidence: "Client PO approval received: PO#BAT-2026-9921",
      issueDate: new Date("2026-09-20"),
      validUntilDate: new Date("2026-10-20"),
      createdById: sales?.id || superAdmin?.id,
      invoiceId: null, // Ready for 1-Click Conversion!
      items: [
        { descriptionEn: "National Day 60s Cinema Commercial", descriptionAr: "إعلان اليوم الوطني السينمائي (60 ثانية)", quantity: 1, unitPrice: 6500.0, lineTotal: 6500.0, orderIndex: 0 },
        { descriptionEn: "Multi-cam Behind the Scenes Coverage", descriptionAr: "تغطية سينمائية خلف الكواليس بكاميرات متعددة", quantity: 1, unitPrice: 1000.0, lineTotal: 1000.0, orderIndex: 1 },
        { descriptionEn: "Spatial Audio Mix & Dolby Atmos Mastering", descriptionAr: "ماسترينغ وهندسة صوت دولبي أتموس ثلاثية الأبعاد", quantity: 1, unitPrice: 1000.0, lineTotal: 1000.0, orderIndex: 2 },
      ],
    },
    {
      quotationNumber: "QTE-2026-006",
      clientId: contact03?.id,
      subtotal: 9800.0,
      vatEnabled: false,
      vatPercentage: 10.0,
      vatAmount: 0.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      totalAmount: 9800.0,
      currency: "BHD",
      language: "ar",
      status: "converted",
      acceptanceEvidence: "Approved by BTEA procurement; converted to Tax Invoice ISH-2026-001",
      issueDate: new Date("2026-08-10"),
      validUntilDate: new Date("2026-09-10"),
      createdById: superAdmin?.id,
      invoiceId: firstInvoice ? firstInvoice.id : null,
      items: [
        { descriptionEn: "Exhibition World Bahrain Inauguration Documentary", descriptionAr: "فيلم وثائقي رسمي لافتتاح مركز البحرين العالمي للمعارض", quantity: 1, unitPrice: 8000.0, lineTotal: 8000.0, orderIndex: 0 },
        { descriptionEn: "4K Live Cinema Stream Relay Infrastructure", descriptionAr: "بث تلفزيوني سينمائي مباشر بدقة 4K", quantity: 1, unitPrice: 1800.0, lineTotal: 1800.0, orderIndex: 1 },
      ],
    },
  ];

  for (const q of quotationsData) {
    const { items, ...qData } = q;
    const existingQ = await prisma.quotation.findUnique({ where: { quotationNumber: qData.quotationNumber } });
    let qId = existingQ?.id;
    if (existingQ) {
      await prisma.quotation.update({ where: { id: existingQ.id }, data: qData });
    } else {
      const created = await prisma.quotation.create({ data: qData });
      qId = created.id;
    }

    if (qId) {
      await prisma.quotationLineItem.deleteMany({ where: { quotationId: qId } });
      for (const item of items) {
        await prisma.quotationLineItem.create({
          data: { ...item, quotationId: qId },
        });
      }

      // Add approval fixtures for submitted and approved quotes
      if (q.quotationNumber === "QTE-2026-002") {
        const hash = crypto.createHash("sha256").update(`quotation_${qId}_1`).digest("hex");
        await prisma.approvalRequest.upsert({
          where: { targetType_targetId_revision: { targetType: "quotation", targetId: qId, revision: 1 } },
          update: { status: "pending", discountReason: "5% commercial discount for annual Gulf Air fleet campaign" },
          create: {
            targetType: "quotation",
            targetId: qId,
            revision: 1,
            contentHash: hash,
            status: "pending",
            requestedById: sales?.id || superAdmin?.id,
            discountReason: "5% commercial discount for annual Gulf Air fleet campaign",
            policySnapshot: { maxDiscountPercent: 10, requiredRole: "admin" },
          },
        });
      } else if (q.quotationNumber === "QTE-2026-003") {
        const hash = crypto.createHash("sha256").update(`quotation_${qId}_1`).digest("hex");
        const appReq = await prisma.approvalRequest.upsert({
          where: { targetType_targetId_revision: { targetType: "quotation", targetId: qId, revision: 1 } },
          update: { status: "approved", discountReason: "10% strategic partner discount for BTEA national tourism campaign" },
          create: {
            targetType: "quotation",
            targetId: qId,
            revision: 1,
            contentHash: hash,
            status: "approved",
            requestedById: sales?.id || superAdmin?.id,
            discountReason: "10% strategic partner discount for BTEA national tourism campaign",
            policySnapshot: { maxDiscountPercent: 10, requiredRole: "admin" },
          },
        });
        await prisma.approvalDecision.deleteMany({ where: { approvalRequestId: appReq.id } });
        await prisma.approvalDecision.create({
          data: {
            approvalRequestId: appReq.id,
            decision: "approved",
            decidedById: superAdmin?.id,
            reason: "Strategic kingdom showcase project. Approved 10% partner discount.",
            decidedAt: new Date("2026-09-26"),
          },
        });
      }
    }
  }

  // Summary counts
  const [quotationCount, employeeCount, deptCount, fxCount, approvalCount, reqEventCount] = await Promise.all([
    prisma.quotation.count(),
    prisma.employee.count(),
    prisma.department.count(),
    prisma.exchangeRateSnapshot.count(),
    prisma.approvalRequest.count(),
    prisma.requestEvent.count(),
  ]);

  console.log("✨ Seeding Complete!");
  console.log(`📊 Current DB Counts:
  - Quotations: ${quotationCount}
  - Employees: ${employeeCount}
  - Departments: ${deptCount}
  - FX Snapshots: ${fxCount}
  - Approvals: ${approvalCount}
  - Request Events: ${reqEventCount}`);
}

main()
  .catch((e) => {
    console.error("❌ Error in seed-new-features:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
