import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, vi } from "vitest";

const {
  mockRouter,
  mockNavigation,
  toastMocks,
  adminActionMocks,
  makeActionExports,
} = vi.hoisted(() => {
  const router = {
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  };
  const nav = {
    pathname: "/dashboard",
    searchParams: new URLSearchParams(),
    params: { id: "id-1" } as Record<string, string | string[]>,
  };
  const toasts = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    message: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  };
  const actions: Record<string, ReturnType<typeof vi.fn>> = {};
  const makeExports = <const T extends readonly string[]>(names: T) => {
    const out: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const name of names) {
      const fn = vi.fn(async () => ({
        ok: true,
        success: true,
        id: "mock-id",
        url: "/signed/mock",
        data: {},
        items: [],
      }));
      actions[name] = fn;
      out[name] = fn;
    }
    return out as { [K in T[number]]: ReturnType<typeof vi.fn> };
  };
  return {
    mockRouter: router,
    mockNavigation: nav,
    toastMocks: toasts,
    adminActionMocks: actions,
    makeActionExports: makeExports,
  };
});

export { adminActionMocks, mockNavigation, mockRouter, toastMocks };

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockNavigation.pathname,
  useSearchParams: () => mockNavigation.searchParams,
  useParams: () => mockNavigation.params,
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string | { pathname?: string };
    children: React.ReactNode;
    [key: string]: unknown;
  }) => {
    const resolved = typeof href === "string" ? href : (href?.pathname ?? "#");
    return React.createElement("a", { href: resolved, ...rest }, children);
  },
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const {
      src,
      alt = "",
      fill: _fill,
      priority: _priority,
      unoptimized: _unoptimized,
      loader: _loader,
      ...rest
    } = props;
    return React.createElement("img", {
      src: typeof src === "string" ? src : "",
      alt: String(alt),
      ...rest,
    });
  },
}));

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<{ default?: React.ComponentType<unknown> } | React.ComponentType<unknown>>) => {
    let Resolved: React.ComponentType<Record<string, unknown>> | null = null;
    void loader().then((m) => {
      Resolved = (typeof m === "function" ? m : m?.default ?? null) as React.ComponentType<Record<string, unknown>> | null;
    });
    return function DynamicWrapper(props: Record<string, unknown>) {
      if (Resolved) return React.createElement(Resolved, props);
      return React.createElement("span", { "data-testid": "dynamic-component" });
    };
  },
}));

vi.mock("sonner", () => {
  const toast = Object.assign(
    vi.fn((..._args: unknown[]) => "toast-id"),
    toastMocks,
  );
  return {
    toast,
    Toaster: () => null,
  };
});

vi.mock("@material/web/ripple/ripple.js", () => ({}));

// Server Action mocks across all 65 action modules in apps/admin/app/actions/
vi.mock("../../app/actions/account-security", () =>
  makeActionExports(["changeMyPasswordAction", "revokeMySessionAction", "revokeOtherSessionsAction"]),
);
vi.mock("../../app/actions/account-settings", () =>
  makeActionExports(["saveAccountSettingsAction", "cancelAccountChangeAction"]),
);
vi.mock("../../app/actions/approval-policies", () =>
  makeActionExports(["updateApprovalPolicyAction"]),
);
vi.mock("../../app/actions/approvals", () =>
  makeActionExports(["decideApprovalAction"]),
);
vi.mock("../../app/actions/assets", () =>
  makeActionExports([
    "saveAssetCategoryAction",
    "saveAssetAction",
    "startAssetHandoverAction",
    "signAssetHandoverAction",
    "signAssetHandoverInPersonAction",
    "cancelAssetHandoverAction",
  ]),
);
vi.mock("../../app/actions/attachments", () =>
  makeActionExports(["createAttachmentAction", "deleteAttachmentAction"]),
);
vi.mock("../../app/actions/calendar", () =>
  makeActionExports([
    "createCalendarEventAction",
    "updateCalendarEventAction",
    "deleteCalendarEventAction",
    "createCalendarFeedAction",
    "updateCalendarFeedLayersAction",
    "revokeCalendarFeedAction",
    "setCalendarSyncEnabledAction",
  ]),
);
vi.mock("../../app/actions/claims", () =>
  makeActionExports([
    "submitExpenseClaimAction",
    "cancelExpenseClaimAction",
    "scheduleExpenseClaimAction",
    "payExpenseClaimAction",
  ]),
);
vi.mock("../../app/actions/client-signatures", () =>
  makeActionExports(["createSigningLinkAction", "revokeSigningLinkAction", "recordSignedCopyAction"]),
);
vi.mock("../../app/actions/cms-articles", () =>
  makeActionExports(["saveCmsArticleAction", "deleteCmsArticleAction"]),
);
vi.mock("../../app/actions/cms-pages", () =>
  makeActionExports([
    "saveCmsPageAction",
    "duplicateCmsPageAction",
    "deleteCmsPageAction",
    "updateCmsPagesListAction",
  ]),
);
vi.mock("../../app/actions/cms", () =>
  makeActionExports([
    "toggleBannerStatusAction",
    "deleteBannerAction",
    "createBannerAction",
    "deleteClientLogoAction",
    "createClientLogoAction",
    "updateClientLogoAction",
    "deleteEquipmentAction",
    "createEquipmentAction",
    "updateEquipmentAction",
    "togglePortfolioFeaturedAction",
    "deletePortfolioItemAction",
    "createPortfolioItemAction",
    "toggleReviewApprovalAction",
    "deleteReviewAction",
    "createFaqAction",
    "updateFaqAction",
    "deleteFaqAction",
    "createStatisticAction",
    "updateStatisticAction",
    "deleteStatisticAction",
    "updateBannerContentAction",
    "updatePortfolioContentAction",
  ]),
);
vi.mock("../../app/actions/commissions", () =>
  makeActionExports([
    "createCommissionRuleAction",
    "recordCommissionSnapshotAction",
    "reverseCommissionSnapshotAction",
  ]),
);
vi.mock("../../app/actions/communications", () =>
  makeActionExports([
    "saveAnnouncementAction",
    "submitAnnouncementAction",
    "archiveAnnouncementAction",
    "announcementReceiptAction",
    "saveOfficialLetterAction",
    "submitOfficialLetterAction",
    "cancelOfficialLetterAction",
    "saveLetterTemplateAction",
    "draftLetterTemplateAction",
    "communicationSettingsAction",
  ]),
);
vi.mock("../../app/actions/crm", () =>
  makeActionExports([
    "updateDealStageAction",
    "createCRMDealAction",
    "updateDealAction",
    "createContactAction",
    "updateContactAction",
    "deleteContactAction",
    "lookupClientAction",
    "searchContactsAction",
    "globalSearchAction",
    "updateInquiryStatusAction",
    "convertInquiryToClientAction",
    "manageInquiryAction",
    "linkInquiryCustomerAction",
  ]),
);
vi.mock("../../app/actions/dashboard", () =>
  makeActionExports([
    "saveDashboardLayoutAction",
    "resetDashboardLayoutAction",
    "saveCustomFolderAction",
    "deleteCustomFolderAction",
  ]),
);
vi.mock("../../app/actions/data-privacy", () =>
  makeActionExports(["eraseCustomerDataAction"]),
);
vi.mock("../../app/actions/delivery", () =>
  makeActionExports([
    "moveShipmentAction",
    "saveDeliverySettingsAction",
    "saveDeliveryZoneAction",
    "saveDeliverySlotAction",
    "deleteDeliverySlotAction",
    "assignShipmentAction",
    "completeDeliveryAction",
    "saveVehicleAction",
    "createRouteSheetAction",
    "startRouteSheetAction",
    "closeRouteSheetAction",
    "settleCashAction",
    "saveCourierAgencyAction",
    "handToAgencyAction",
    "recordAgencyInvoiceAction",
  ]),
);
vi.mock("../../app/actions/departments", () =>
  makeActionExports(["saveDepartmentAction", "deleteDepartmentAction", "addCatalogueDepartmentsAction"]),
);
vi.mock("../../app/actions/documents", () =>
  makeActionExports(["createCompanyDocumentAction", "deleteCompanyDocumentAction"]),
);
vi.mock("../../app/actions/domains", () =>
  makeActionExports(["checkDomainAction", "saveDomainsAction"]),
);
vi.mock("../../app/actions/employee-credentials", () =>
  makeActionExports([
    "updateEmployeeIdentityAction",
    "saveEmployeeCredentialAction",
    "deleteEmployeeCredentialAction",
  ]),
);
vi.mock("../../app/actions/employee-handovers", () =>
  makeActionExports([
    "openEmployeeHandoverAction",
    "setHandoverCaseModeAction",
    "applyHandoverCasesAction",
    "refreshHandoverCasesAction",
    "updateHandoverChecklistAction",
    "submitEmployeeHandoverAction",
    "cancelEmployeeHandoverAction",
  ]),
);
vi.mock("../../app/actions/final-settlements", () =>
  makeActionExports([
    "createFinalSettlementAction",
    "recalculateFinalSettlementAction",
    "setFinalSettlementLinesAction",
    "submitFinalSettlementAction",
    "cancelFinalSettlementAction",
    "signFinalSettlementAction",
    "payFinalSettlementAction",
    "updateSettlementRulesAction",
  ]),
);
vi.mock("../../app/actions/finance", () =>
  makeActionExports([
    "createExpenseAction",
    "updateExpenseAction",
    "deleteExpenseAction",
    "createPaymentAction",
    "createInvoiceAction",
    "updateInvoiceAction",
    "markInvoiceSentAction",
    "voidInvoiceAction",
    "exportFinancialReportCsvAction",
    "createExpenseCategoryAction",
    "updateExpenseCategoryAction",
    "deleteExpenseCategoryAction",
  ]),
);
vi.mock("../../app/actions/hr-settings", () =>
  makeActionExports([
    "updateHrPolicyAction",
    "saveLeaveTypeAction",
    "savePublicHolidayAction",
    "deletePublicHolidayAction",
    "saveShiftTypeAction",
    "addLeaveAdjustmentAction",
    "saveAttendanceAction",
    "deleteAttendanceAction",
    "markMonthPresentAction",
  ]),
);
vi.mock("../../app/actions/hrms", () =>
  makeActionExports([
    "createEmployeeAction",
    "updateEmployeeAction",
    "createDepartmentAction",
    "updateDepartmentAction",
    "saveEmployeeExtendedProfileAction",
  ]),
);
vi.mock("../../app/actions/inventory", () =>
  makeActionExports([
    "changeStockAction",
    "transferStockAction",
    "saveReorderPointsAction",
    "saveWarehouseAction",
    "saveLocationAction",
    "createStockCountAction",
    "saveCountedAction",
    "scanCountItemAction",
    "setStockCountStatusAction",
    "approveStockCountAction",
  ]),
);
vi.mock("../../app/actions/it-support", () =>
  makeActionExports(["createItTicketAction", "commentOnItTicketAction", "transitionItTicketAction"]),
);
vi.mock("../../app/actions/leave", () =>
  makeActionExports(["createLeaveRequestAction", "decideLeaveRequestAction", "cancelLeaveRequestAction"]),
);
vi.mock("../../app/actions/mom", () =>
  makeActionExports([
    "createMomAction",
    "updateMomAction",
    "deleteMomAction",
    "approveAndSignMomAction",
    "shareMomViaEmailAction",
  ]),
);
vi.mock("../../app/actions/notifications", () =>
  makeActionExports([
    "markNotificationReadAction",
    "markAllNotificationsReadAction",
    "updateNotificationAction",
    "bulkNotificationAction",
    "saveNotificationPreferencesAction",
    "muteNotificationRecordAction",
    "unmuteNotificationRecordAction",
  ]),
);
vi.mock("../../app/actions/orders", () =>
  makeActionExports([
    "moveOrderAction",
    "recordOrderPaymentAction",
    "recordOrderRefundAction",
    "addOrderNoteAction",
    "issueOrderInvoiceAction",
    "createStaffOrderAction",
    "saveStoreSettingsAction",
    "saveCouponAction",
    "deleteCouponAction",
    "saveGiftCardAction",
    "deleteGiftCardAction",
    "adjustCustomerWalletAction",
    "adjustCustomerPointsAction",
    "saveCustomerAccountDiscountAction",
    "resolveOrderReturnRequestAction",
    "saveStoreCustomCategoryAction",
    "deleteStoreCustomCategoryAction",
    "recheckOrderPaymentAction",
  ]),
);
vi.mock("../../app/actions/outreach", () =>
  makeActionExports([
    "saveCampaignAction",
    "saveSegmentAction",
    "saveBroadcastAction",
    "sendBroadcastAction",
    "saveMediaContactAction",
    "saveCoverageAction",
    "saveLegalMatterAction",
    "addLegalNoteAction",
  ]),
);
vi.mock("../../app/actions/packages", () =>
  makeActionExports([
    "createStockPackageAction",
    "packSerialsAction",
    "sealStockPackageAction",
    "moveStockPackageAction",
    "unpackStockPackageAction",
  ]),
);
vi.mock("../../app/actions/payroll", () =>
  makeActionExports([
    "generatePayrollRunAction",
    "submitPayrollRunForApprovalAction",
    "approvePayrollRunAction",
    "markPayrollRunPaidAction",
    "payPayrollItemAction",
    "recalculatePayrollRunAction",
    "setPayrollLinesAction",
    "saveRecurringPayAction",
    "deleteRecurringPayAction",
    "recordSupportReimbursementAction",
  ]),
);
vi.mock("../../app/actions/people-import", () =>
  makeActionExports(["previewPeopleImportAction", "importPeopleAction"]),
);
vi.mock("../../app/actions/permission-overrides", () =>
  makeActionExports(["setUserPermissionOverridesAction"]),
);
vi.mock("../../app/actions/pipeline", () =>
  makeActionExports(["saveDealPipelineAction", "resetDealPipelineAction"]),
);
vi.mock("../../app/actions/presence", () =>
  makeActionExports(["setMyStatusAction", "clearMyStatusAction"]),
);
vi.mock("../../app/actions/procurement", () =>
  makeActionExports([
    "saveSupplierAction",
    "saveRequisitionAction",
    "submitRequisitionAction",
    "cancelRequisitionAction",
    "createRfqAction",
    "saveRfqQuotesAction",
    "awardRfqAction",
    "cancelRfqAction",
    "savePurchaseOrderAction",
    "submitPurchaseOrderAction",
    "emailPurchaseOrderAction",
    "markPurchaseOrderSentAction",
    "cancelPurchaseOrderAction",
    "receiveGoodsAction",
    "saveSupplierBillAction",
    "attachSupplierBillFileAction",
    "approveSupplierBillAction",
    "cancelSupplierBillAction",
    "recordSupplierPaymentAction",
  ]),
);
vi.mock("../../app/actions/products", () =>
  makeActionExports([
    "saveProductAction",
    "deleteProductAction",
    "setProductsActiveAction",
    "setProductOnWebsiteAction",
    "saveProductCategoryAction",
    "deleteProductCategoryAction",
  ]),
);
vi.mock("../../app/actions/profile", () =>
  makeActionExports([
    "updateMyProfileAction",
    "requestIdentityChangeAction",
    "decideProfileChangeAction",
    "requestSignatureChangeAction",
    "cancelSignatureChangeAction",
    "cancelMyProfileChangeAction",
    "updateMyAvatarAction",
    "removeMyAvatarAction",
  ]),
);
vi.mock("../../app/actions/quotations", () =>
  makeActionExports([
    "createQuotationAction",
    "updateQuotationAction",
    "submitQuotationForApprovalAction",
    "issueQuotationAction",
    "acceptQuotationAction",
    "rejectQuotationAction",
    "convertQuotationToInvoiceAction",
  ]),
);
vi.mock("../../app/actions/recurring-expenses", () =>
  makeActionExports([
    "saveRecurringExpenseAction",
    "recordRecurringExpenseAction",
    "skipRecurringExpenseAction",
    "deleteRecurringExpenseAction",
  ]),
);
vi.mock("../../app/actions/reports", () =>
  makeActionExports(["saveReportScheduleAction", "stopReportScheduleAction"]),
);
vi.mock("../../app/actions/requests", () =>
  makeActionExports([
    "assignRequestAction",
    "reassignRequestAction",
    "returnRequestAction",
    "approveRequestAction",
    "submitRequestForApprovalAction",
    "confirmRequestAction",
    "resolveRequestAction",
    "createConsolidatedRequestAction",
    "assignRequestWithAvailabilityAction",
    "addRequestCommentAction",
  ]),
);
vi.mock("../../app/actions/retail", () =>
  makeActionExports([
    "saveRegisterAction",
    "saveDrawerAction",
    "openRetailShiftAction",
    "closeRetailShiftAction",
    "openCashierSessionAction",
    "closeCashierSessionAction",
    "recordPaymentCollectionAction",
    "reversePaymentCollectionAction",
    "performRetailClosingAction",
  ]),
);
vi.mock("../../app/actions/roles", () =>
  makeActionExports(["upsertRoleAction", "deleteRoleAction"]),
);
vi.mock("../../app/actions/salary-documents", () =>
  makeActionExports([
    "requestSalaryDocumentAction",
    "reviewSalaryDocumentAction",
    "emailSalaryDocumentAction",
    "whatsappSalaryDocumentAction",
    "payslipMonthsForEmployeeAction",
  ]),
);
vi.mock("../../app/actions/sales", () =>
  makeActionExports(["reassignSalesOwnerAction", "updateUserCommissionRateAction", "recordCommissionPayoutAction"]),
);
vi.mock("../../app/actions/serialized-stock", () =>
  makeActionExports([
    "generateSerialLabelsAction",
    "confirmSerialLabelPrintingAction",
    "verifyGeneratedSerialsAction",
    "moveSerialsBetweenBinsAction",
    "fulfillSerializedOrderAction",
    "returnSerializedOrderAction",
  ]),
);
vi.mock("../../app/actions/service-desk", () =>
  makeActionExports(["replyToRequestAction", "saveServiceSettingsAction", "saveCannedReplyAction"]),
);
vi.mock("../../app/actions/services", () =>
  makeActionExports(["createServiceAction", "updateServiceAction", "deleteServiceAction"]),
);
vi.mock("../../app/actions/settings", () =>
  makeActionExports([
    "updateCompanySettingsAction",
    "saveCompanyAssetAction",
    "deleteCompanyAssetAction",
    "updateWebSettingsAction",
    "revalidateEntireSiteAction",
    "createSocialLinkAction",
    "updateSocialLinkAction",
    "deleteSocialLinkAction",
  ]),
);
vi.mock("../../app/actions/setup", () =>
  makeActionExports([
    "saveSetupCompanyAction",
    "saveSetupThemeAction",
    "saveSetupConfigAction",
    "saveSetupWebsiteAction",
    "completeSetupAction",
    "setupPreviewAction",
    "saveSetupWebsiteDraftAction",
  ]),
);
vi.mock("../../app/actions/signatures", () =>
  makeActionExports([
    "getSignatureModeAction",
    "setSignaturePolicyAction",
    "createHandoverSigningLinkAction",
    "revokeHandoverSigningLinkAction",
    "openMyHandoverSigningPageAction",
  ]),
);
vi.mock("../../app/actions/signing", () =>
  makeActionExports(["signDocumentAction", "requestInvoiceApprovalAction"]),
);
vi.mock("../../app/actions/social-insurance", () =>
  makeActionExports([
    "updateGosiRulesAction",
    "scheduleGosiComponentAction",
    "updateGosiComponentAction",
    "endGosiComponentAction",
    "saveEmployeeGosiRecordAction",
    "deleteEmployeeGosiRecordAction",
    "registerUnregisteredEmployeesAction",
    "saveSupportProgramAction",
    "scheduleSupportRuleAction",
    "deleteSupportRuleAction",
    "saveEmployeeSupportAction",
    "deleteEmployeeSupportAction",
  ]),
);
vi.mock("../../app/actions/social", () =>
  makeActionExports(["refreshSocialAnalyticsAction", "saveSocialPlanAction", "deleteSocialPlanAction"]),
);
vi.mock("../../app/actions/stock-transfers", () =>
  makeActionExports([
    "requestSerialTransferAction",
    "processSerialTransferAction",
    "previewStockHandoverAction",
    "acknowledgeStockHandoverAction",
    "reportMissingTransferUnitsAction",
  ]),
);
vi.mock("../../app/actions/tasks", () =>
  makeActionExports(["saveTaskAction", "moveTaskAction", "addTaskCommentAction", "saveProjectAction"]),
);
vi.mock("../../app/actions/taxes", () =>
  makeActionExports(["saveTaxRateAction", "deleteTaxRateAction"]),
);
vi.mock("../../app/actions/users", () =>
  makeActionExports([
    "createUserAction",
    "updateUserRoleAction",
    "updateUserAction",
    "suspendUserAction",
    "reactivateUserAction",
    "archiveUserAction",
    "deleteUserAction",
    "updateUserDiscountLimitAction",
    "bulkUpdateUsersAction",
  ]),
);
vi.mock("../../app/actions/website", () =>
  makeActionExports([
    "saveWebsiteDraftAction",
    "publishWebsiteAction",
    "restoreWebsiteAction",
    "previewWebsiteAction",
    "updateWebsiteServiceAction",
    "saveWebsiteMenusAction",
  ]),
);

function installDefaultFetch() {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
    if (url.includes("/api/notifications?view=settings")) {
      return new Response(
        JSON.stringify({
          preferences: {
            soundEnabled: true,
            sound: "chime",
            volume: 70,
            popupsEnabled: true,
            desktopEnabled: false,
            categories: [],
          },
          mutes: [],
          categories: ["crm", "finance", "hr"],
        }),
        { status: 200 },
      );
    }
    if (url.includes("/api/notifications?view=preview")) {
      return new Response(
        JSON.stringify({ items: [], unread: 0, unreadCount: 0 }),
        { status: 200 },
      );
    }
    if (url.includes("/api/presence/me")) {
      return new Response(
        JSON.stringify({ presence: { status: "available" }, upcoming: [], chosen: null }),
        { status: 200 },
      );
    }
    if (url.includes("/api/presence")) {
      return new Response(JSON.stringify({ items: {} }), { status: 200 });
    }
    if (url.includes("/api/workspace/prefs")) {
      return new Response(JSON.stringify({ ok: true, data: {} }), { status: 200 });
    }
    if (url.includes("/api/lookups/")) {
      return new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true, items: [], data: {} }), { status: 200 });
  }) as typeof fetch;
}

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  window.scrollTo = vi.fn();

  class ResizeObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);

  class IntersectionObserverMock {
    private callback: IntersectionObserverCallback;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private targets = new Set<Element>();
    constructor(cb: IntersectionObserverCallback) {
      this.callback = cb;
    }
    observe = vi.fn((target: Element) => {
      this.targets.add(target);
      this.timer = setTimeout(() => {
        if (!this.targets.has(target)) return;
        this.callback(
          [{ isIntersecting: true, target, intersectionRatio: 1 } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }, 0);
    });
    unobserve = vi.fn((target: Element) => {
      this.targets.delete(target);
    });
    disconnect = vi.fn(() => {
      this.targets.clear();
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
    });
    takeRecords = vi.fn(() => []);
    root = null;
    rootMargin = "";
    thresholds = [];
  }
  vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);

  class EventSourceMock {
    static instances: EventSourceMock[] = [];
    url: string;
    onopen: ((ev: Event) => void) | null = null;
    onmessage: ((ev: MessageEvent) => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;
    constructor(url: string) {
      this.url = url;
      EventSourceMock.instances.push(this);
      setTimeout(() => this.onopen?.(new Event("open")), 0);
    }
    emit(data: unknown) {
      this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(data) }));
    }
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    close = vi.fn();
  }
  vi.stubGlobal("EventSource", EventSourceMock);

  class BroadcastChannelMock {
    name: string;
    onmessage: ((ev: MessageEvent) => void) | null = null;
    constructor(name: string) {
      this.name = name;
    }
    postMessage = vi.fn();
    close = vi.fn();
  }
  vi.stubGlobal("BroadcastChannel", BroadcastChannelMock);

  class AudioContextMock {
    state: AudioContextState = "running";
    currentTime = 0;
    destination = {};
    resume = vi.fn(async () => {});
    createGain = () => ({
      gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn((dest: unknown) => dest),
    });
    createOscillator = () => ({
      type: "sine",
      frequency: { value: 440 },
      connect: vi.fn((dest: unknown) => dest),
      start: vi.fn(),
      stop: vi.fn(),
    });
  }
  vi.stubGlobal("AudioContext", AudioContextMock);

  class NotificationMock {
    static permission: NotificationPermission = "granted";
    static requestPermission = vi.fn(async () => "granted" as NotificationPermission);
    onclick: (() => void) | null = null;
    close = vi.fn();
    constructor(public title: string, public options?: NotificationOptions) {}
  }
  vi.stubGlobal("Notification", NotificationMock);

  const createMemoryStorage = (): Storage => {
    const store = new Map<string, string>();
    return {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (key: string) => store.get(String(key)) ?? null,
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      removeItem: (key: string) => {
        store.delete(String(key));
      },
      setItem: (key: string, value: string) => {
        store.set(String(key), String(value));
      },
    };
  };
  const memLocal = createMemoryStorage();
  const memSession = createMemoryStorage();
  Object.defineProperty(window, "localStorage", { configurable: true, value: memLocal });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: memLocal });
  Object.defineProperty(window, "sessionStorage", { configurable: true, value: memSession });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: memSession });

  installDefaultFetch();
}

if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.show = function show() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
  };
}

if (typeof Element !== "undefined") {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
}

if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    scale: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    lineCap: "round",
    lineJoin: "round",
    strokeStyle: "#000000",
    lineWidth: 1,
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => "data:image/png;base64,iVBORw0KGgo=");
}

if (typeof URL !== "undefined") {
  if (!URL.createObjectURL) URL.createObjectURL = vi.fn(() => "blob:admin-object-url");
  if (!URL.revokeObjectURL) URL.revokeObjectURL = vi.fn();
}

beforeEach(() => {
  installDefaultFetch();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.clearAllMocks();
  const es = (globalThis as { EventSource?: { instances?: unknown[] } }).EventSource;
  if (es?.instances) es.instances.length = 0;
  mockNavigation.pathname = "/dashboard";
  mockNavigation.searchParams = new URLSearchParams();
  mockNavigation.params = { id: "id-1" };
  document.body.style.overflow = "";
  localStorage.clear();
  sessionStorage.clear();
});
