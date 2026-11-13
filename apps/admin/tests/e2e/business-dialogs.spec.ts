import { selectOption } from "./helpers/select-option";
import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import enLocale from "../../locales/en.json";
import arLocale from "../../locales/ar.json";
import { admin, testDatabase } from "./helpers/helpers";
const en = enLocale.admin;
const ar = arLocale.admin;

const db = testDatabase();
let employeeId = "",
  createdEmployeeId = "",
  leaveId = "",
  approvalId = "",
  requestId = "",
  momId = "",
  programId = "";
test.beforeEach(async () => {
  employeeId =
    createdEmployeeId =
    leaveId =
    approvalId =
    requestId =
    momId =
    programId =
      "";
  const actor = await db.user.findUniqueOrThrow({
    where: { email: admin.email },
    include: { employee: true },
  });
  const employee =
    actor.employee ??
    (await db.employee.create({
      data: {
        userId: actor.id,
        employeeNumber: `E2E-${randomUUID()}`,
        firstNameEn: "E2E",
        lastNameEn: "Dialog",
        firstNameAr: "اختبار",
        lastNameAr: "الحوار",
        jobTitleEn: "Tester",
        jobTitleAr: "مختبر",
        hireDate: new Date("2020-01-01"),
      },
    }));
  employeeId = employee.id;
  if (!actor.employee) createdEmployeeId = employee.id;
  const type = await db.leaveType.findFirstOrThrow();
  const leave = await db.leaveRequest.create({
    data: {
      employeeId,
      leaveTypeId: type.id,
      startDate: new Date("2030-01-07"),
      endDate: new Date("2030-01-08"),
      reason: "E2E dialog leave",
    },
  });
  leaveId = leave.id;
  const requester = await db.user.findFirstOrThrow({
    where: { id: { not: actor.id } },
  });
  const approval = await db.approvalRequest.create({
    data: {
      targetType: "leave_request",
      targetId: leaveId,
      contentHash: "0".repeat(64),
      requestedById: requester.id,
      approverIds: [actor.id],
      policySnapshot: {},
    },
  });
  approvalId = approval.id;
  const request = await db.inquiry.create({
    data: {
      reference: `SR-2099-${randomUUID()}`,
      name: "E2E dialog request",
      email: "audit@example.test",
      message: "E2E request dialog",
      requestType: "SR",
      workflowStatus: "confirmed",
    },
  });
  requestId = request.id;
  const mom = await db.minuteOfMeeting.create({
    data: {
      momNumber: `E2E-${randomUUID()}`,
      title: "E2E dialog meeting",
      meetingDate: new Date(),
      agenda: "E2E dialog agenda",
      status: "approved",
    },
  });
  momId = mom.id;
  const program = await db.supportProgram.create({
    data: {
      code: `E2E-${randomUUID()}`,
      nameEn: "E2E dialog support",
      nameAr: "دعم اختبار الحوار",
      provider: "E2E",
    },
  });
  programId = program.id;
});
test.afterEach(async () => {
  await db.approvalRequest.deleteMany({ where: { id: approvalId } });
  await db.leaveRequest.deleteMany({ where: { id: leaveId } });
  await db.inquiry.deleteMany({ where: { id: requestId } });
  await db.minuteOfMeeting.deleteMany({ where: { id: momId } });
  await db.supportProgram.deleteMany({ where: { id: programId } });
  if (createdEmployeeId)
    await db.employee.delete({ where: { id: createdEmployeeId } });
});
test.afterAll(() => db.$disconnect());

for (const locale of ["en", "ar"] as const) {
  test(`business dialogs retain failed input and cancel safely (${locale})`, async ({
    page,
  }) => {
    const t = locale === "en" ? en : ar;
    await page.setViewportSize({
      width: locale === "ar" ? 390 : 1440,
      height: 900,
    });
    await page.addInitScript((locale) => {
      localStorage.setItem("platform_admin_locale", locale);
      localStorage.setItem(
        "platform_admin_theme",
        locale === "ar" ? "dark" : "light",
      );
    }, locale);
    const nativeDialogs: string[] = [];
    page.on("dialog", async (dialog) => {
      nativeDialogs.push(dialog.type());
      await dialog.dismiss();
    });
    const dialog = page.getByRole("dialog");
    await page.goto("/dashboard/hr/leave");
    await page.route("**/dashboard/hr/leave", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            status: 500,
            contentType: "text/plain",
            body: "Test action failure",
          })
        : route.continue(),
    );
    await page
      .getByRole("main")
      .getByRole("button", {
        name: t.leaveManagement.applyForLeave,
        exact: true,
      })
      .click();
    const reason = dialog.getByLabel(t.leaveManagement.reasonForAbsence, {
      exact: true,
    });
    await reason.fill("E2E retained leave reason");
    await dialog
      .getByLabel(t.leaveManagement.startDate, { exact: true })
      .fill("2030-02-04");
    await dialog
      .getByLabel(t.leaveManagement.endDate, { exact: true })
      .fill("2030-02-05");
    await dialog
      .getByRole("button", {
        name: t.leaveManagement.submitApplication,
        exact: true,
      })
      .click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(reason).toHaveValue("E2E retained leave reason");
    await dialog
      .getByRole("button", { name: t.shared.cancel, exact: true })
      .click();
    const leaveRow = page
      .getByRole("row")
      .filter({ hasText: "E2E dialog leave" });
    await leaveRow
      .getByRole("button", { name: t.shared.reject, exact: true })
      .click();
    const reject = dialog.getByLabel(t.leaveManagement.reasonForRejection, {
      exact: true,
    });
    await reject.fill("E2E retained rejection");
    await dialog
      .getByRole("button", { name: t.shared.confirmRejection, exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(reject).toHaveValue("E2E retained rejection");
    await dialog
      .getByRole("button", { name: t.shared.cancel, exact: true })
      .click();
    await leaveRow
      .getByRole("button", { name: t.shared.cancel, exact: true })
      .click();
    await expect(dialog.locator("[data-confirm-dialog]")).toHaveCount(1);
    await dialog.getByRole("button").last().click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await dialog
      .getByRole("button", { name: t.shared.cancel, exact: true })
      .click();
    expect(
      (await db.leaveRequest.findUniqueOrThrow({ where: { id: leaveId } }))
        .status,
    ).toBe("pending");

    await page.goto(`/dashboard/requests/${requestId}`);
    await page.route("**/dashboard/requests/**", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            status: 500,
            contentType: "text/plain",
            body: "Test action failure",
          })
        : route.continue(),
    );
    await page
      .getByRole("main")
      .getByRole("button", { name: t.requestDetail.assignLead, exact: true })
      .click();
    await expect(
      dialog.getByLabel(t.requestDetail.assignedTeam2, { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByLabel(t.requestDetail.assigneePersonCheckedAgainstLeave, {
        exact: true,
      }),
    ).toBeVisible();
    await dialog
      .getByRole("button", { name: t.requestDetail.cancel, exact: true })
      .click();
    await page
      .getByRole("main")
      .getByRole("button", { name: t.requestDetail.return, exact: true })
      .click();
    const notes = dialog.getByRole("textbox");
    await notes.fill("E2E retained return reason");
    await dialog
      .getByRole("button", {
        name: t.requestDetail.confirmAndApply,
        exact: true,
      })
      .click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(notes).toHaveValue("E2E retained return reason");
    await dialog
      .getByRole("button", { name: t.requestDetail.cancel, exact: true })
      .click();
    await page
      .getByRole("main")
      .getByRole("button", { name: t.requestDetail.resolve, exact: true })
      .click();
    await notes.fill("E2E retained resolution");
    await dialog
      .getByRole("button", {
        name: t.requestDetail.confirmAndApply,
        exact: true,
      })
      .click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(notes).toHaveValue("E2E retained resolution");
    await dialog
      .getByRole("button", { name: t.requestDetail.cancel, exact: true })
      .click();
    expect(
      (await db.inquiry.findUniqueOrThrow({ where: { id: requestId } }))
        .workflowStatus,
    ).toBe("confirmed");

    await page.goto("/dashboard/hr/supports");
    await page
      .getByRole("main")
      .getByRole("button", { name: t.supports.addEnrolment, exact: true })
      .click();
    await selectOption(dialog
      .getByRole("combobox", { name: t.supports.fields.employee, exact: true }), employeeId);
    await selectOption(dialog
      .getByRole("combobox", { name: t.supports.fields.program, exact: true }), programId);
    await dialog
      .getByLabel(t.supports.fields.notes, { exact: true })
      .fill("E2E retained support note");
    await page.route("**/dashboard/hr/supports", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            status: 500,
            contentType: "text/plain",
            body: "Test action failure",
          })
        : route.continue(),
    );
    await dialog
      .getByRole("button", { name: t.supports.save, exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(
      dialog.getByLabel(t.supports.fields.notes, { exact: true }),
    ).toHaveValue("E2E retained support note");
    await dialog
      .getByRole("button", { name: t.actions.cancel, exact: true })
      .click();

    await page.goto("/dashboard/hr/gosi");
    await expect(page.locator("[data-overlay-scroll-ready]")).toBeAttached();
    await page
      .getByRole("main")
      .getByRole("button", { name: t.gosi.register, exact: true })
      .first()
      .click();
    await dialog
      .getByLabel(t.gosi.fields.registrationNumber, { exact: true })
      .fill("E2E-REG");
    await page.route(/\/dashboard\/hr\/(?:gosi|pensions)(?:\?.*)?$/, (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            status: 500,
            contentType: "text/plain",
            body: "Test action failure",
          })
        : route.continue(),
    );
    await dialog
      .getByRole("button", { name: t.gosi.saveRegistration, exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(
      dialog.getByLabel(t.gosi.fields.registrationNumber, { exact: true }),
    ).toHaveValue("E2E-REG");
    await dialog
      .getByRole("button", { name: t.actions.cancel, exact: true })
      .click();

    await page.goto(`/dashboard/moms/${momId}`);
    await page
      .getByRole("main")
      .getByRole("button", { name: t.momDetail.shareEmail, exact: true })
      .click();
    const email = dialog.getByLabel(t.momDetail.recipientEmail, {
      exact: true,
    });
    await email.fill("audit@example.test");
    await expect(dialog.getByRole("textbox")).toHaveCount(1);
    let emailCalls = 0;
    let releaseEmail!: () => void;
    const blockedEmail = new Promise<void>((resolve) => {
      releaseEmail = resolve;
    });
    await page.route("**/dashboard/moms/**", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      emailCalls++;
      await blockedEmail;
      await route.fulfill({
        status: 500,
        contentType: "text/plain",
        body: "Test action failure",
      });
    });
    await dialog
      .getByRole("button", { name: t.momDetail.sendEmail, exact: true })
      .click();
    try {
      await expect(
        dialog.getByRole("button", { name: t.momDetail.cancel, exact: true }),
      ).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
      await dialog
        .locator("form")
        .evaluate((form) => (form as HTMLFormElement).requestSubmit());
    } finally {
      releaseEmail();
    }
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(email).toHaveValue("audit@example.test");
    expect(emailCalls).toBe(1);
    expect(await db.emailJob.count({ where: { momId } })).toBe(0);
    expect(nativeDialogs).toEqual([]);
  });
}
