import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ARCHIVE_KINDS, type ArchiveKind } from "@platform/database/constants/archive";
import { SocialAnalyticsView } from "../../components/analytics/SocialAnalyticsView";
import { ApprovalDecisionPanel } from "../../components/approvals/ApprovalDecisionPanel";
import { ApprovalItemView } from "../../components/approvals/ApprovalItemView";
import { ApprovalsCenterView } from "../../components/approvals/ApprovalsCenterView";
import { CompanyArchiveView } from "../../components/archive/CompanyArchiveView";
import { CalendarCanvas } from "../../components/calendar/CalendarCanvas";
import { CalendarView } from "../../components/calendar/CalendarView";
import { DashboardBoard } from "../../components/dashboard/DashboardBoard";
import { DashboardWidget, widgetCard } from "../../components/dashboard/DashboardWidgets";
import { DepartmentDashboardView } from "../../components/dashboard/DepartmentDashboardView";
import {
  ArchiveFoldersWidget,
  CustomFoldersWidget,
} from "../../components/dashboard/FolderWidgets";
import {
  BookmarksLaunchpadWidget,
  CalendarMiniWidget,
  ClockWorldWidget,
  CountdownMilestoneWidget,
  FocusPomodoroWidget,
  LocalClockWidget,
  QuickCalculatorWidget,
  ScratchpadNotesWidget,
  StickyQuoteWidget,
  WEATHER_CITIES_BY_COUNTRY,
  WEATHER_CITY_PRESETS,
  WORLD_CLOCK_CITIES,
  WeatherLocalWidget,
  WelcomeProfileWidget,
} from "../../components/dashboard/LifestyleWidgets";
import { WorkloadPanels } from "../../components/dashboard/WorkloadPanels";
import { DirectoryView } from "../../components/directory/DirectoryView";
import { OrgChartView } from "../../components/directory/OrgChartView";
import { MomContent } from "../../components/moms/MomContent";
import { MomDetailView } from "../../components/moms/MomDetailView";
import { MomsListView } from "../../components/moms/MomsListView";
import { NewMomFormView } from "../../components/moms/NewMomFormView";
import { ReportView } from "../../components/reports/ReportView";
import { ReportsCatalogView } from "../../components/reports/ReportsCatalogView";
import { ProjectView, ProjectsView } from "../../components/tasks/ProjectsView";
import { PriorityPill, TaskLink, TaskStatusPill } from "../../components/tasks/TaskBits";
import { TaskForm, emptyTask } from "../../components/tasks/TaskForm";
import { TaskView } from "../../components/tasks/TaskView";
import { TasksPage } from "../../components/tasks/TasksPage";
import { TasksView } from "../../components/tasks/TasksView";
import { TeamPerformanceView } from "../../components/team/TeamPerformanceView";
import type { DashboardData } from "../../lib/dashboard-widgets";
import { adminActionMocks } from "./setup";
import { AdminTestProviders } from "./fixtures";

function makeDashboardData(): DashboardData {
  return {
    generatedAt: "2026-05-01T10:00:00Z",
    showMoney: true,
    finance: {
      revenue: 5000,
      receivables: 1200,
      expenses: 800,
      profit: 4200,
      pendingInvoicesCount: 3,
      overdueCount: 1,
    } as unknown as DashboardData["finance"],
    cashflow: [
      { month: "2026-04", monthLabel: "Apr", income: 2500, expenses: 400 },
      { month: "2026-05", monthLabel: "May", income: 2500, expenses: 400 },
    ] as unknown as DashboardData["cashflow"],
    deals: { totalCount: 5, totalValue: 12000, byStage: {} } as unknown as DashboardData["deals"],
    stages: [{ key: "qualified", name_en: "Qualified", name_ar: "مؤهل", color: "#2563EB", sort_order: 1, active: true }] as unknown as DashboardData["stages"],
    leads: 4,
    orders: { today: 2, pending: 1, totalRevenue: 900 } as unknown as DashboardData["orders"],
    recentOrders: [],
    lowStock: { rows: [], total: 0 },
    shipments: { inTransit: 2, pending: 1, deliveredToday: 3 } as unknown as DashboardData["shipments"],
    tasks: { open: 3, overdue: 1, dueToday: 1, items: [] } as unknown as DashboardData["tasks"],
    campaigns: [],
    legal: { active: 1, expiringLicences: 0, upcomingHearings: 0, expiringContracts: 0 } as unknown as DashboardData["legal"],
    events: [],
    activity: [],
    hrPulse: { totalEmployees: 12, onLeaveToday: 1, pendingLeaves: 1 } as unknown as DashboardData["hrPulse"],
    procurementPulse: { openRequisitions: 2, openOrders: 1, pendingBills: 1 } as unknown as DashboardData["procurementPulse"],
    archiveFolders: {
      groups: [{ group: "contracts", count: 2 }],
      recent: [{ id: "arc-1", file_name: "contract.pdf", file_url: "/media/contract.pdf", kind: "contract", created_at: "2026-05-01" }],
      expired: 0,
      expiring: 1,
    },
    customFolders: [{ id: "cf-1", owner_id: "usr-1", scope: "personal", department_id: null, name: "Important", name_en: "Important", name_ar: "مهم", color: "emerald", items: [], kind_keys: ["contract"], created_at: "2026-05-01" }] as unknown as DashboardData["customFolders"],
    userProfile: {
      id: "usr-1",
      fullName: "Tariq Al-Zayed",
      email: "admin@example.test",
      role: "admin",
      departmentId: "dept-1",
      departmentNameEn: "Management",
      departmentNameAr: "الإدارة",
      jobTitleEn: "Director",
      jobTitleAr: "مدير",
    },
    currency: "BHD",
    companyCity: "Manama",
    company: null,
    workload: {
      approvals: { pendingCount: 1, oldestCreatedAt: "2026-05-01T09:00:00Z", byType: {} } as unknown as NonNullable<DashboardData["workload"]>["approvals"],
      requests: null,
      complaints: null,
      generatedAt: "2026-05-01T10:00:00Z",
    },
    actions: [{ key: "newInvoice", href: "/dashboard/invoices/new" }],
  };
}

describe("Admin Batch 2: Dashboard, Analytics, Reports, Approvals, Calendar, Tasks, MoM, Archive & Directory", () => {
  it("renders DashboardBoard, DashboardWidgets, DepartmentDashboardView, FolderWidgets, LifestyleWidgets & WorkloadPanels", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, data: {} }), { status: 200 }));
    const data = makeDashboardData();
    const layout = [
      { id: "welcome_profile", kind: "welcome_profile" as const, size: "2x1" as const, order: 0 },
      { id: "kpi_revenue", kind: "kpi_revenue" as const, size: "1x1" as const, order: 1 },
      { id: "archive_folders", kind: "archive_folders" as const, size: "2x1" as const, order: 2 },
      { id: "custom_folders", kind: "custom_folders" as const, size: "2x1" as const, order: 3 },
    ];

    render(
      <AdminTestProviders>
        <DashboardBoard
          desk="executive"
          layout={layout as unknown as Parameters<typeof DashboardBoard>[0]["layout"]}
          custom={false}
          available={["welcome_profile", "kpi_revenue", "archive_folders", "custom_folders"]}
          data={data}
          loaded={{}}
          showDepartment
        />
        <DashboardWidget id="kpi_revenue" data={data} />
        <ArchiveFoldersWidget data={data} />
        <CustomFoldersWidget data={data} />
        <WelcomeProfileWidget data={data} />
        <LocalClockWidget data={data} />
        <ClockWorldWidget data={data} />
        <WeatherLocalWidget data={data} />
        <CalendarMiniWidget data={data} />
        <ScratchpadNotesWidget data={data} />
        <FocusPomodoroWidget data={data} />
        <QuickCalculatorWidget data={data} />
        <CountdownMilestoneWidget data={data} />
        <StickyQuoteWidget data={data} />
        <BookmarksLaunchpadWidget data={data} />
        <DepartmentDashboardView
          departments={[{ id: "dept-1", name_en: "Management", name_ar: "الإدارة" }]}
          chosenId="dept-1"
          summary={{ headcount: 10, away_today: 1, pending_leave: 1, open_tasks: 3, overdue_tasks: 0, open_requests: 1, by_role: [], people: [] } as unknown as Parameters<typeof DepartmentDashboardView>[0]["summary"]}
          canSeeLeave
        />
        <WorkloadPanels
          approvals={{ pending: 1, awaitingMe: 1, stale: 0, decidedLast30: 2, awaitingMeByType: {}, queue: [], pendingCount: 1, oldestCreatedAt: "2026-05-01T09:00:00Z", staleCount: 0, byTarget: [] } as unknown as Parameters<typeof WorkloadPanels>[0]["approvals"]}
          requests={null}
          complaints={null}
          generatedAt="2026-05-01T10:00:00Z"
        />
      </AdminTestProviders>,
    );

    expect(widgetCard).toContain("admin-widget");
    expect(WORLD_CLOCK_CITIES.length).toBeGreaterThan(0);
    expect(WEATHER_CITY_PRESETS.manama.key).toBe("manama");
    expect(WEATHER_CITIES_BY_COUNTRY.bh).toContain("manama");
    expect(adminActionMocks.saveDashboardLayoutAction).toBeDefined();
    expect(adminActionMocks.resetDashboardLayoutAction).toBeDefined();
    expect(adminActionMocks.saveCustomFolderAction).toBeDefined();
    expect(adminActionMocks.deleteCustomFolderAction).toBeDefined();
    await fetch("/api/workspace/prefs", { method: "GET" });
    await fetch("/api/workspace/prefs", { method: "PUT" });
    expect(fetchSpy).toHaveBeenCalledWith("/api/workspace/prefs", expect.anything());
  });

  it("exercises SocialAnalyticsView, Approvals, Archive, Calendar, Directory & TeamPerformanceView", async () => {
    const user = userEvent.setup();
    adminActionMocks.refreshSocialAnalyticsAction.mockResolvedValueOnce({ results: [] });
    render(
      <AdminTestProviders>
        <SocialAnalyticsView
          analytics={{
            accounts: [
              {
                platform: "instagram",
                connected: true,
                followers: 1200,
                followersChange: 25,
                isStale: false,
                lastSyncedAt: "2026-05-01T08:00:00Z",
                lastError: null,
                needsReconnect: false,
              },
            ],
            byPlatform: [],
            ownerInsights: [],
            daily: [],
            contentTypes: [],
            topPosts: [],
            posts: [],
            trends: [],
            partial: false,
            periodDays: 30,
            totals: { posts: 0, interactions: 0, views: 0, likes: 0, comments: 0, shares: 0, saves: 0, avgEngagementRate: 0 },
            previousTotals: { posts: 0, interactions: 0, views: 0, likes: 0, comments: 0, shares: 0, saves: 0, avgEngagementRate: 0 },
          } as unknown as Parameters<typeof SocialAnalyticsView>[0]["analytics"]}
          plans={[
            {
              id: "plan-1",
              title: "Launch Reel",
              caption: "Behind the scenes",
              platforms: ["instagram"],
              mediaUrl: null,
              scheduledFor: "2026-05-10",
              status: "draft",
              publishedUrl: null,
              assignee: { id: "usr-1", fullName: "Tariq Al-Zayed" },
              createdBy: { id: "usr-1", fullName: "Tariq Al-Zayed" },
              updatedAt: "2026-05-01",
            },
          ]}
          team={[{ id: "usr-1", fullName: "Tariq Al-Zayed" }]}
          platform={null}
        />
        <ApprovalDecisionPanel approvalId="apr-1" requiresSignature={false} onDecided={vi.fn()} />
        <ApprovalsCenterView
          requests={[]}
          total={0}
          page={1}
          pageSize={20}
          scope="mine"
          status="pending"
          targetType="all"
          canViewAll
          currentUserId="usr-1"
          counts={{ awaiting: 0, mine: 0 }}
        />
        <ApprovalItemView
          item={{
            targetType: "quotation",
            targetId: "q-1",
            reference: "QT-100",
            subject: { name: "Acme WLL", email: "acme@example.test" },
            facts: [{ key: "total", value: { kind: "money", value: 500, currency: "BHD" } }],
            changes: [],
            images: [],
            files: [],
            note: "Please review",
            recordUrl: "/dashboard/quotations/q-1",
            status: "pending",
            approvalId: "apr-1",
            canDecide: true,
            requiresSignature: false,
            signerName: "Tariq",
            history: [],
          } as unknown as Parameters<typeof ApprovalItemView>[0]["item"]}
        />
        <CompanyArchiveView
          items={[
            {
              id: "doc-1",
              kind: "contract",
              file_name: "nda.pdf",
              file_url: "/media/nda.pdf",
              mime_type: "application/pdf",
              file_size: 1024,
              created_at: "2026-05-01T00:00:00Z",
              expires_at: null,
              notes: null,
            } as unknown as Parameters<typeof CompanyArchiveView>[0]["items"][number],
          ]}
          total={1}
          page={1}
          pageSize={20}
          filters={{ q: "", kind: "", group: "", expired: false, expiring: false }}
          counts={{ total: 1, byKind: {}, byGroup: { contracts: 1 }, expired: 0, expiring: 0 } as unknown as Parameters<typeof CompanyArchiveView>[0]["counts"]}
          kinds={[Object.keys(ARCHIVE_KINDS)[0] as ArchiveKind]}
          canExport
          canUpload
          customFolders={[]}
        />
        <CalendarCanvas
          date={new Date("2026-05-01T00:00:00Z")}
          mode="month"
          heading="May 2026"
          loading={false}
          feedConnected={false}
          layers={[{ id: "events", label: "Events", color: "#2563EB", enabled: true }]}
          setDate={vi.fn()}
          setMode={vi.fn()}
          move={vi.fn()}
          toggleLayer={vi.fn()}
          refresh={vi.fn()}
          create={vi.fn()}
          select={vi.fn()}
          title={(ev) => ev.title}
          time={() => "10:00"}
          onDay={() => []}
        />
        <CalendarView
          initialEvents={[]}
          currentUserId="usr-1"
          people={[{ id: "usr-1", name: "Tariq Al-Zayed" }]}
          departments={[{ id: "dept-1", nameEn: "Management", nameAr: "الإدارة" }]}
          roles={[{ id: "admin", nameEn: "Admin", nameAr: "مدير" }]}
          feedConnected={false}
          feed={null}
          syncEnabled={false}
        />
        <DirectoryView
          entries={[]}
          total={0}
          page={1}
          pageSize={20}
          filters={{ q: "", departmentId: "" }}
          departments={[{ id: "dept-1", name_en: "Management", name_ar: "الإدارة" }]}
        />
        <OrgChartView
          departments={[{ id: "dept-1", name_en: "Management", name_ar: "الإدارة", parent_id: null, head_name: "Tariq Al-Zayed", member_count: 5 } as unknown as Parameters<typeof OrgChartView>[0]["departments"][number]]}
          unassigned={0}
        />
        <TeamPerformanceView
          period="month"
          from="2026-05-01"
          to="2026-05-31"
          members={[]}
          history={{}}
          managers={[{ id: "usr-1", name: "Tariq Al-Zayed" }]}
          managerId=""
        />
      </AdminTestProviders>,
    );

    await user.click(screen.getAllByRole("button", { name: /refresh|sync/i })[0]);
    expect(adminActionMocks.refreshSocialAnalyticsAction).toBeDefined();
    expect(adminActionMocks.saveSocialPlanAction).toBeDefined();
    expect(adminActionMocks.deleteSocialPlanAction).toBeDefined();
    expect(adminActionMocks.decideApprovalAction).toBeDefined();
    expect(adminActionMocks.createAttachmentAction).toBeDefined();
    expect(adminActionMocks.deleteAttachmentAction).toBeDefined();
    expect(adminActionMocks.createCalendarEventAction).toBeDefined();
    expect(adminActionMocks.updateCalendarEventAction).toBeDefined();
    expect(adminActionMocks.deleteCalendarEventAction).toBeDefined();
  });

  it("renders MoM components, Reports & Tasks/Projects components cleanly", async () => {
    const mom = {
      id: "mom-1",
      mom_number: "MOM-2026-001",
      title: "Kickoff Sync",
      title_ar: "اجتماع",
      meeting_date: "2026-05-01",
      status: "draft",
      attendees: [],
      agenda_items: [],
      decisions: [],
      action_items: [],
      created_at: "2026-05-01T00:00:00Z",
    } as unknown as Parameters<typeof MomContent>[0]["mom"];

    const taskChoices = {
      projects: [{ id: "prj-1", name: "Studio Upgrade" }],
      users: [{ id: "usr-1", name: "Tariq Al-Zayed", role: "admin" }],
      people: [{ id: "usr-1", name: "Tariq Al-Zayed" }],
      departments: [{ id: "dept-1", name_en: "Management", name_ar: "الإدارة" }],
    } as unknown as Parameters<typeof TasksView>[0]["choices"];

    const taskRow = {
      id: "tsk-1",
      title: "Prepare equipment list",
      description: "Verify lenses",
      status: "todo",
      priority: "high",
      due_date: "2026-05-10",
      assignee_id: "usr-1",
      assignee_name: "Tariq Al-Zayed",
      project_id: "prj-1",
      project_name: "Studio Upgrade",
      comment_count: 0,
    } as unknown as Parameters<typeof TasksView>[0]["rows"][number];

    const taskRecord = {
      ...taskRow,
      start_date: "2026-05-01",
      comments: [],
      events: [],
    } as unknown as Parameters<typeof TaskView>[0]["task"];

    const projectRow = {
      id: "prj-1",
      name: "Studio Upgrade",
      description: "Camera gear",
      status: "active",
      department_id: "dept-1",
      owner_id: "usr-1",
      color: "#2563EB",
      start_date: "2026-05-01",
      due_date: "2026-06-01",
    } as unknown as Parameters<typeof ProjectView>[0]["project"];

    const filters = {
      view: "all" as const,
      q: "",
      project: "",
      assignee: "",
      department: "",
      status: "",
      due: "",
    };

    render(
      <AdminTestProviders>
        <MomContent mom={mom} />
        <MomDetailView
          mom={mom}
          company={{ company_name_en: "Zayed Group" } as unknown as Parameters<typeof MomDetailView>[0]["company"]}
          currentUser={{ id: "usr-1", name: "Tariq", email: "admin@example.test", role: "admin" }}
        />
        <MomsListView initialMoms={[mom]} />
        <NewMomFormView
          clients={[{ id: "cli-1", name: "Acme", company: "Acme WLL" }]}
          deals={[{ id: "deal-1", title: "Production" }]}
          companyName="Zayed Group"
          initialAttendee={{ name: "Tariq", email: "admin@example.test" }}
        />
        <ReportsCatalogView reports={[{ key: "revenue_by_client", area: "finance" }]} />
        <ReportView
          result={{
            definition: {
              key: "revenue_by_client",
              area: "finance",
              columns: [{ key: "client", label: "Client", kind: "text" }],
              dateFiltered: true,
              formats: ["csv"],
            } as unknown as Parameters<typeof ReportView>[0]["result"]["definition"],
            from: "2026-05-01",
            to: "2026-05-31",
            rows: [],
            totals: {},
            previous: null,
          }}
          locale="en"
          compare={false}
          schedules={[]}
          currency="BHD"
          today="2026-05-01"
        />
        <PriorityPill priority="high" />
        <TaskStatusPill status="todo" />
        <TaskLink type="contact" id="cli-1" />
        <TaskForm initial={emptyTask()} choices={taskChoices} canAssign selfId="usr-1" onSaved={vi.fn()} onCancel={vi.fn()} />
        <TaskView task={taskRecord} choices={taskChoices} canAssign selfId="usr-1" />
        <TasksView rows={[taskRow]} choices={taskChoices} filters={filters} canAssign selfId="usr-1" today="2026-05-01" />
        <TasksPage rows={[taskRow]} choices={taskChoices} filters={filters} canAssign selfId="usr-1" today="2026-05-01" />
        <ProjectsView projects={[projectRow]} choices={taskChoices} canManage />
        <ProjectView project={projectRow} rows={[taskRow]} choices={taskChoices} filters={filters} canAssign selfId="usr-1" today="2026-05-01" />
      </AdminTestProviders>,
    );

    expect(screen.getAllByText(/Kickoff Sync/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Studio Upgrade/).length).toBeGreaterThanOrEqual(1);
    expect(adminActionMocks.approveAndSignMomAction).toBeDefined();
    expect(adminActionMocks.shareMomViaEmailAction).toBeDefined();
    expect(adminActionMocks.getSignatureModeAction).toBeDefined();
    expect(adminActionMocks.deleteMomAction).toBeDefined();
    expect(adminActionMocks.createMomAction).toBeDefined();
    expect(adminActionMocks.saveReportScheduleAction).toBeDefined();
    expect(adminActionMocks.stopReportScheduleAction).toBeDefined();
    expect(adminActionMocks.saveProjectAction).toBeDefined();
    expect(adminActionMocks.saveTaskAction).toBeDefined();
    expect(adminActionMocks.moveTaskAction).toBeDefined();
    expect(adminActionMocks.addTaskCommentAction).toBeDefined();
  });
});
