import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type {
  AssetRecord,
  ConsolidatedRequest,
  Department,
  Employee,
  EmployeeHandoverDetail,
  GosiRules,
  LeaveRequest,
  PayrollRun,
} from "@platform/database";
import { GosiView } from "../../components/gosi/GosiView";
import { NationalitySchemeFields } from "../../components/gosi/NationalitySchemeFields";
import { EmployeeHandoversCard } from "../../components/handovers/EmployeeHandoversCard";
import { HandoverWorkspaceView } from "../../components/handovers/HandoverWorkspaceView";
import { HANDOVER_STATUS_STYLE, HandoversListView } from "../../components/handovers/HandoversListView";
import { AttendanceSheetView } from "../../components/hr/AttendanceSheetView";
import { CredentialFields, emptyCredential } from "../../components/hr/CredentialFields";
import { EmployeeAccountCard } from "../../components/hr/EmployeeAccountCard";
import { EmployeeAttachments } from "../../components/hr/EmployeeAttachments";
import { EmployeeDetailView } from "../../components/hr/EmployeeDetailView";
import { EmployeePayHistory } from "../../components/hr/EmployeePayHistory";
import { EmployeeResidencyPanel } from "../../components/hr/EmployeeResidencyPanel";
import { EmployeesListView } from "../../components/hr/EmployeesListView";
import { ExpiringDocumentsCard } from "../../components/hr/ExpiringDocumentsCard";
import { HrRequestsView } from "../../components/hr/HrRequestsView";
import { HrSettingsView } from "../../components/hr/HrSettingsView";
import { ImportPeopleView } from "../../components/hr/ImportPeopleView";
import { LeaveBalancesCard } from "../../components/hr/LeaveBalancesCard";
import { LeaveManagementView } from "../../components/hr/LeaveManagementView";
import { NewEmployeeFormView } from "../../components/hr/NewEmployeeFormView";
import { NoEmployeeProfile } from "../../components/hr/NoEmployeeProfile";
import { PayLinesEditor, toPayLineDraft } from "../../components/hr/PayLinesEditor";
import { PayrollItemView } from "../../components/hr/PayrollItemView";
import { PayrollManagementView } from "../../components/hr/PayrollManagementView";
import { PayrollSettingsFields, emptyPayrollSettings } from "../../components/hr/PayrollSettingsFields";
import { RecurringPayPanel } from "../../components/hr/RecurringPayPanel";
import { SalaryDocumentsView } from "../../components/hr/SalaryDocumentsView";
import { SupportClaimsPanel } from "../../components/hr/SupportClaimsPanel";
import { NewRequestFormView } from "../../components/requests/NewRequestFormView";
import { RequestAttachments } from "../../components/requests/RequestAttachments";
import {
  RequestPriorityBadge,
  RequestTypeBadge,
  RequestWorkflowBadge,
} from "../../components/requests/RequestBadges";
import { RequestDetailView } from "../../components/requests/RequestDetailView";
import { RequestManagePanel } from "../../components/requests/RequestManagePanel";
import { RequestsInboxView } from "../../components/requests/RequestsInboxView";
import { ServiceReplyPanel } from "../../components/requests/ServiceReplyPanel";
import { ServiceSettingsView } from "../../components/requests/ServiceSettingsView";
import { adminActionMocks } from "./setup";
import { AdminTestProviders } from "./fixtures";

describe("Admin Batch 6: HR, Payroll, GOSI, Employee Handovers & Requests", () => {
  const department: Department = {
    id: "dept-1",
    code: "PROD",
    nameEn: "Production",
    nameAr: "الإنتاج",
    name_en: "Production",
    name_ar: "الإنتاج",
    parent_id: null,
  } as unknown as Department;

  const employee: Employee = {
    id: "emp-1",
    userId: "usr-1",
    employeeNumber: "EMP-001",
    firstNameEn: "Bader",
    lastNameEn: "Ali",
    firstNameAr: "بدر",
    lastNameAr: "علي",
    fullNameEn: "Bader Ali",
    fullNameAr: "بدر علي",
    email: "bader@example.test",
    phone: "+97339000001",
    departmentId: "dept-1",
    departmentNameEn: "Production",
    departmentNameAr: "الإنتاج",
    jobTitleEn: "Camera Operator",
    jobTitleAr: "مصور",
    status: "active",
    hireDate: "2024-01-01",
    nationality: "BH",
    payrollSettings: emptyPayrollSettings,
    employmentRecords: [
      {
        id: "er-1",
        isCurrent: true,
        basicSalary: 800,
        housingAllowance: 100,
        transportAllowance: 50,
        otherAllowances: 0,
        currency: "BHD",
        effectiveFrom: "2024-01-01",
      },
    ],
  } as unknown as Employee;

  it("renders HR Employees, Credentials, Residency, Attendance, Leave, Settings & Import components cleanly", () => {
    render(
      <AdminTestProviders>
        <NoEmployeeProfile />
        <EmployeesListView
          employees={[employee]}
          departments={[department]}
          total={1}
          currentDepartment="all"
          currentStatus="all"
          search=""
          page={1}
          canViewPay
          canCreate
        />
        <EmployeeDetailView employee={employee} departments={[department]} canEdit canViewPay canEditPay />
        <NewEmployeeFormView departments={[department]} linkUser={{ id: "usr-1", fullName: "Bader Ali", email: "bader@example.test", role: "staff" }} canSetPay />
        <EmployeeAccountCard
          account={{ fullName: "Bader Ali", email: "bader@example.test", phone: "+97339000001", role: "staff", managerId: null, discountLimit: 10, commissionRate: 0 } as unknown as Parameters<typeof EmployeeAccountCard>[0]["account"]}
          email="bader@example.test"
          isSuperAdmin={false}
          roles={[{ id: "staff", name: "Staff" }]}
          managers={[]}
          requests={[]}
          canManageUsers
          canEditEmployees
          canViewPay
        />
        <EmployeeAttachments employeeId="emp-1" attachments={[]} canEdit canDelete />
        <EmployeeResidencyPanel
          employeeId="emp-1"
          residency={{
            identity: { nationality: "BH", nationalId: "900101001", cprNumber: "900101001", cprExpiresAt: "2028-01-01", passportNumber: null, passportExpiresAt: null },
            nationality: "BH",
            nationalId: "900101001",
            passportNumber: null,
            passportExpiresAt: null,
            visaNumber: null,
            visaExpiresAt: null,
            cprNumber: "900101001",
            cprExpiresAt: "2028-01-01",
            credentials: [],
          } as unknown as Parameters<typeof EmployeeResidencyPanel>[0]["residency"]}
          canEdit
        />
        <CredentialFields value={emptyCredential("cpr")} onChange={vi.fn()} employeeId="emp-1" />
        <ExpiringDocumentsCard rows={[]} />
        <AttendanceSheetView
          sheet={{
            year: 2026,
            month: 5,
            days: ["2026-05-01"],
            employees: [],
            cells: {},
            shiftTypes: [],
            holidays: [],
          } as unknown as Parameters<typeof AttendanceSheetView>[0]["sheet"]}
          canEdit
        />
        <LeaveBalancesCard balances={[]} year={2026} employeeId="emp-1" canAdjust />
        <LeaveManagementView
          requests={[] as LeaveRequest[]}
          leaveTypes={[{ id: "lt-1", code: "ANNUAL", nameEn: "Annual", nameAr: "سنوية", paid: true, allowHalfDay: true, allowHours: false, isActive: true } as unknown as Parameters<typeof LeaveManagementView>[0]["leaveTypes"][number]]}
          myBalances={[]}
          allEmployees={[employee]}
          myEmployee={employee}
          currentUserId="usr-1"
          canFileForOthers
          decidableIds={[]}
          currentStatus="all"
          total={0}
          page={1}
        />
        <HrRequestsView
          rows={[]}
          type="all"
          status="all"
          employeeId="emp-1"
          canFile
          canFileDocuments
          employees={[{ id: "emp-1", nameEn: "Bader Ali", nameAr: "بدر علي", employeeNumber: "EMP-001" } as unknown as Parameters<typeof HrRequestsView>[0]["employees"][number]]}
          leaveTypes={[]}
        />
        <HrSettingsView
          policy={{
            salaryTiming: "arrears",
            payDay: 28,
            attendanceCutoffDay: 25,
            weekendDays: [5, 6],
            workHoursPerDay: 8,
            workDaysPerMonth: 22,
            lateGraceMinutes: 15,
            overtimeMultiplierDay: 1.25,
            overtimeMultiplierNight: 1.5,
            overtimeMultiplierRest: 1.5,
            overtimeMultiplierHoliday: 2,
          } as unknown as Parameters<typeof HrSettingsView>[0]["policy"]}
          leaveTypes={[]}
          holidays={[]}
          holidayYear={2026}
          shiftTypes={[]}
          canPolicy
          canLeave
        />
        <ImportPeopleView
          departments={[{ code: "PROD", nameEn: "Production", nameAr: "الإنتاج" }]}
          roles={[{ id: "staff", nameEn: "Staff", nameAr: "موظف" }]}
          languages={["en", "ar"]}
          canCreateAccounts
        />
      </AdminTestProviders>,
    );

    expect(screen.getAllByText(/Bader Ali/).length).toBeGreaterThanOrEqual(1);
    expect(adminActionMocks.createEmployeeAction).toBeDefined();
    expect(adminActionMocks.updateEmployeeAction).toBeDefined();
    expect(adminActionMocks.cancelAccountChangeAction).toBeDefined();
    expect(adminActionMocks.createAttachmentAction).toBeDefined();
    expect(adminActionMocks.deleteAttachmentAction).toBeDefined();
    expect(adminActionMocks.updateEmployeeIdentityAction).toBeDefined();
    expect(adminActionMocks.saveEmployeeCredentialAction).toBeDefined();
    expect(adminActionMocks.deleteEmployeeCredentialAction).toBeDefined();
    expect(adminActionMocks.saveAttendanceAction).toBeDefined();
    expect(adminActionMocks.deleteAttendanceAction).toBeDefined();
    expect(adminActionMocks.markMonthPresentAction).toBeDefined();
    expect(adminActionMocks.addLeaveAdjustmentAction).toBeDefined();
    expect(adminActionMocks.createLeaveRequestAction).toBeDefined();
    expect(adminActionMocks.decideLeaveRequestAction).toBeDefined();
    expect(adminActionMocks.cancelLeaveRequestAction).toBeDefined();
    expect(adminActionMocks.payslipMonthsForEmployeeAction).toBeDefined();
    expect(adminActionMocks.updateHrPolicyAction).toBeDefined();
    expect(adminActionMocks.saveLeaveTypeAction).toBeDefined();
    expect(adminActionMocks.savePublicHolidayAction).toBeDefined();
    expect(adminActionMocks.deletePublicHolidayAction).toBeDefined();
    expect(adminActionMocks.saveShiftTypeAction).toBeDefined();
    expect(adminActionMocks.previewPeopleImportAction).toBeDefined();
    expect(adminActionMocks.importPeopleAction).toBeDefined();
  });

  it("renders Payroll, GOSI & Employee Handovers components cleanly", () => {
    const run: PayrollRun = {
      id: "pr-1",
      year: 2026,
      month: 5,
      status: "draft",
      totalGross: 950,
      totalNet: 900,
      employeeCount: 1,
      items: [],
    } as unknown as PayrollRun;

    const gosiRules: GosiRules = {
      bahrainiEmployeePercent: 7,
      bahrainiEmployerPercent: 12,
      nonBahrainiEmployeePercent: 0,
      nonBahrainiEmployerPercent: 3,
      wageCap: 4000,
      effectiveFrom: "2024-01-01",
    } as unknown as GosiRules;

    const handover: EmployeeHandoverDetail = {
      id: "eh-1",
      reference: "EH-2026-001",
      kind: "offboarding",
      status: "open",
      cases_mode: "delegate",
      delegate_user_id: "usr-1",
      team_user_ids: ["usr-1"],
      employee: { id: "emp-1", name_en: "Bader Ali", name_ar: "بدر علي", number: "EMP-001" },
      cases: [],
      returns: [],
      checklist: [{ key: "laptop", label: "Return Laptop", done: false, note: null }],
      blockers: { assetsHeld: 0, returnsInProgress: 0, casesPending: 0, checklistOpen: 0 },
      approval: { decisions: [] },
      created_at: "2026-05-01T00:00:00Z",
    } as unknown as EmployeeHandoverDetail;

    const draftLine = toPayLineDraft({ id: "pl-1", kind: "earning", category: "bonus", labelEn: "Bonus", labelAr: "مكافأة", amount: 50, taxable: false } as unknown as Parameters<typeof toPayLineDraft>[0]);
    expect(draftLine).toBeDefined();

    render(
      <AdminTestProviders>
        <PayrollSettingsFields value={emptyPayrollSettings} onChange={vi.fn()} />
        <PayLinesEditor kind="addition" lines={[draftLine]} onChange={vi.fn()} />
        <EmployeePayHistory rows={[]} />
        <RecurringPayPanel employeeId="emp-1" items={[]} canEdit />
        <SalaryDocumentsView employeeId="emp-1" documents={[]} availableMonths={["2026-05"]} decidableIds={[]} />
        <SupportClaimsPanel claims={[]} canRecord />
        <PayrollManagementView runs={[run]} currentUserId="usr-1" decidableRunIds={[]} canEdit canCreate canPay />
        <PayrollItemView
          detail={{
            item: { id: "pi-1", basicSalary: 800, allowances: 150, deductions: 50, netPay: 900, netSalary: 900, paymentStatus: "unpaid", attendanceSummary: null },
            run,
            employee,
            position: { index: 1, total: 1 },
            previousId: null,
            nextId: null,
            lines: [],
            attendance: [],
            leaves: [],
          } as unknown as Parameters<typeof PayrollItemView>[0]["detail"]}
          canEdit
          canPay
        />
        <NationalitySchemeFields rules={gosiRules} disabled={false} onChange={vi.fn()} />
        <GosiView rules={gosiRules} components={[]} registrations={[]} canEdit />
        <EmployeeHandoversCard employeeId="emp-1" items={[]} canStart />
        <HandoversListView items={[]} status="open" kind="" employees={[{ id: "emp-1", name_en: "Bader Ali", name_ar: "بدر علي" } as unknown as Parameters<typeof HandoversListView>[0]["employees"][number]]} canEdit />
        <HandoverWorkspaceView handover={handover} held={[] as AssetRecord[]} users={[{ id: "usr-1", name: "Tariq" }]} canEdit canReturnAssets approvalId={null} />
      </AdminTestProviders>,
    );

    expect(HANDOVER_STATUS_STYLE.open).toBeTruthy();
    expect(adminActionMocks.saveRecurringPayAction).toBeDefined();
    expect(adminActionMocks.deleteRecurringPayAction).toBeDefined();
    expect(adminActionMocks.requestSalaryDocumentAction).toBeDefined();
    expect(adminActionMocks.emailSalaryDocumentAction).toBeDefined();
    expect(adminActionMocks.whatsappSalaryDocumentAction).toBeDefined();
    expect(adminActionMocks.recordSupportReimbursementAction).toBeDefined();
    expect(adminActionMocks.generatePayrollRunAction).toBeDefined();
    expect(adminActionMocks.submitPayrollRunForApprovalAction).toBeDefined();
    expect(adminActionMocks.approvePayrollRunAction).toBeDefined();
    expect(adminActionMocks.recalculatePayrollRunAction).toBeDefined();
    expect(adminActionMocks.markPayrollRunPaidAction).toBeDefined();
    expect(adminActionMocks.setPayrollLinesAction).toBeDefined();
    expect(adminActionMocks.payPayrollItemAction).toBeDefined();
    expect(adminActionMocks.updateGosiComponentAction).toBeDefined();
    expect(adminActionMocks.scheduleGosiComponentAction).toBeDefined();
    expect(adminActionMocks.endGosiComponentAction).toBeDefined();
    expect(adminActionMocks.updateGosiRulesAction).toBeDefined();
    expect(adminActionMocks.registerUnregisteredEmployeesAction).toBeDefined();
    expect(adminActionMocks.saveEmployeeGosiRecordAction).toBeDefined();
    expect(adminActionMocks.deleteEmployeeGosiRecordAction).toBeDefined();
    expect(adminActionMocks.openEmployeeHandoverAction).toBeDefined();
    expect(adminActionMocks.setHandoverCaseModeAction).toBeDefined();
    expect(adminActionMocks.applyHandoverCasesAction).toBeDefined();
    expect(adminActionMocks.cancelEmployeeHandoverAction).toBeDefined();
    expect(adminActionMocks.refreshHandoverCasesAction).toBeDefined();
    expect(adminActionMocks.updateHandoverChecklistAction).toBeDefined();
    expect(adminActionMocks.submitEmployeeHandoverAction).toBeDefined();
  });

  it("renders Consolidated Requests & Service Desk components cleanly", () => {
    const req: ConsolidatedRequest = {
      id: "req-1",
      reference: "SR-2026-001",
      requestType: "SR",
      status: "open",
      priority: "normal",
      team: "production",
      subject: "Camera Package Inquiry",
      message: "Need cinema rig quote",
      fullName: "Ali Hassan",
      email: "ali@acme.test",
      phone: "+97339000001",
      company: "Acme Trading",
      assignedToId: "usr-1",
      slaDueDate: null,
      customerId: null,
      convertedDealId: null,
      comments: [],
      timeline: [],
      attachments: [],
      createdAt: "2026-05-01T10:00:00Z",
    } as unknown as ConsolidatedRequest;

    render(
      <AdminTestProviders>
        <RequestTypeBadge type="SR" />
        <RequestWorkflowBadge status="open" />
        <RequestPriorityBadge priority="normal" />
        <RequestAttachments files={[]} />
        <RequestsInboxView
          rows={[]}
          total={0}
          page={1}
          stats={{ open: 0, overdue: 0, unassigned: 0, awaitingApproval: 0, mine: 0, resolvedThisMonth: 0 }}
          filters={{ search: "", kind: "all", status: "open", scope: "all", sort: "urgency", team: "all", priority: "all", assignee: "all", source: "all", due: "all", from: "", to: "", customerId: "" } as unknown as Parameters<typeof RequestsInboxView>[0]["filters"]}
          canCreate
          canExport
          staff={[{ id: "usr-1", name: "Tariq" }]}
        />
        <NewRequestFormView users={[{ id: "usr-1", name: "Tariq", role: "admin" }]} canPickContact services={[]} />
        <RequestDetailView
          request={req}
          users={[{ id: "usr-1", name: "Tariq", role: "admin" }]}
          currentUserId="usr-1"
          canDecideApproval
          canSell
        />
        <RequestManagePanel
          request={{ id: "req-1", priority: "normal", slaDueDate: null, status: "open", customerId: null, convertedDealId: null }}
          kind="service"
          canManage
          canSell
        />
        <ServiceReplyPanel
          requestId="req-1"
          customerLocale="en"
          hasEmail
          hasPhone
          order={null}
          replies={[]}
          cannedReplies={[]}
          canReply
        />
        <ServiceSettingsView
          settings={{ responseSlaHours: 4, resolutionSlaHours: 24, autoAcknowledge: true } as unknown as Parameters<typeof ServiceSettingsView>[0]["settings"]}
          replies={[]}
          languages={["en", "ar"]}
          canEditTimes
        />
      </AdminTestProviders>,
    );

    expect(adminActionMocks.createConsolidatedRequestAction).toBeDefined();
    expect(adminActionMocks.approveRequestAction).toBeDefined();
    expect(adminActionMocks.submitRequestForApprovalAction).toBeDefined();
    expect(adminActionMocks.confirmRequestAction).toBeDefined();
    expect(adminActionMocks.assignRequestWithAvailabilityAction).toBeDefined();
    expect(adminActionMocks.returnRequestAction).toBeDefined();
    expect(adminActionMocks.resolveRequestAction).toBeDefined();
    expect(adminActionMocks.addRequestCommentAction).toBeDefined();
    expect(adminActionMocks.manageInquiryAction).toBeDefined();
    expect(adminActionMocks.updateInquiryStatusAction).toBeDefined();
    expect(adminActionMocks.linkInquiryCustomerAction).toBeDefined();
    expect(adminActionMocks.convertInquiryToClientAction).toBeDefined();
    expect(adminActionMocks.replyToRequestAction).toBeDefined();
    expect(adminActionMocks.saveServiceSettingsAction).toBeDefined();
    expect(adminActionMocks.saveCannedReplyAction).toBeDefined();
  });
});
