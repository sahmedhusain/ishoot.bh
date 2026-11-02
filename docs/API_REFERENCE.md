# API reference

Generated from the code by `pnpm docs:api`; do not edit by hand. Input contracts for admin server actions are in `apps/admin/lib/action-schemas.json`; unmigrated data models remain in `packages/database/prisma/schema.prisma` (browse them with `pnpm db:studio`).

## Go service contracts

| Service | OpenAPI contract |
|---|---|
| audit | [OpenAPI](../backend/services/audit/api/openapi.yaml) |
| files | [OpenAPI](../backend/services/files/api/openapi.yaml) |
| identity | [OpenAPI](../backend/services/identity/api/openapi.yaml) |
| itsm | [OpenAPI](../backend/services/itsm/api/openapi.yaml) |
| notify | [OpenAPI](../backend/services/notify/api/openapi.yaml) |
| system | [OpenAPI](../backend/services/system/api/openapi.yaml) |

## Website HTTP routes (`apps/web`)

| Route | Methods | Notes |
|---|---|---|
| `/api/account/[action]/callback` | GET, POST | Where Google (GET) and Apple (form POST) send the person back: the state must match the signed cookie, the code |
| `/api/account/[action]` | POST, GET | Account actions posted from the website's account page. |
| `/api/account/orders/[id]/attachments/[attachmentId]` | GET |  |
| `/api/account/orders/[id]/attachments` | POST | Authenticated raw-body uploads stay private; evidence never modifies payment state. |
| `/api/files/[folder]/[name]` | GET | Public brand files and the website's published documents; nothing private is ever served here. |
| `/api/health` | GET | Whether this app is up and which installation it belongs to (Settings → Website → Check domain). |
| `/api/inquiry/attachments` | POST |  |
| `/api/inquiry` | POST |  |
| `/api/preview` | GET, POST |  |
| `/api/revalidate` | POST | Hashing both sides gives equal lengths, so the comparison takes the same time whatever was sent. |
| `/api/reviews` | POST |  |
| `/api/samples/[name]` | GET | Abstract artwork for sample content ("banner-1.svg" … "item-6.svg"), drawn in the company's own colours so a |
| `/api/store/[action]` | POST | The website's public address, for the gateway's return and notification addresses. |
| `/api/store/payment/return` |  | Where the payment gateway sends the customer back (some gateways by GET, some by a form POST). The result always |
| `/api/store/payment/webhook/[gateway]` | POST | A payment gateway's notification: verified against the gateway's signature, applied once however often it comes. |

## Admin HTTP routes (`apps/admin`)

| Route | Methods | Notes |
|---|---|---|
| `/api/acknowledge/[token]/pdf` | GET | Days the employee can still download their signed copy through the link. |
| `/api/acknowledge/[token]` | POST | Public: the employee signs a handover through their one-time link. Errors come back as codes the page translates. |
| `/api/announcements/[id]/pdf` | GET |  |
| `/api/assets/handovers/[id]/pdf` | GET | The handover form as PDF for staff with asset access, the employee in it and its approvers. |
| `/api/auth/forgot-password` | POST |  |
| `/api/auth/login` | POST |  |
| `/api/auth/logout` | POST |  |
| `/api/auth/me` | GET |  |
| `/api/auth/mfa` | POST |  |
| `/api/auth/reset-password` | POST |  |
| `/api/calendar/events` | GET | The signed-in user's calendar between two dates: what they may see, by layer. |
| `/api/calendar/feed` | GET | Downloads the signed-in user's calendar as an .ics file (only what they may see). |
| `/api/calendar/ics/[token]` | GET | Public: a person's calendar subscription (Google Calendar "From URL", Outlook, Apple Calendar). The secret token |
| `/api/cron` | GET |  |
| `/api/documents/[id]/pdf` | GET |  |
| `/api/exports/[domain]` | GET | A client row for the spreadsheet: the profile flattened, with every point of contact on one cell. |
| `/api/files/[folder]/[name]` | GET | The permission that guards a file stored on a record's own field, if any record holds it. |
| `/api/health` | GET | Whether this app is up and which installation it belongs to (Settings → Website → Check domain). |
| `/api/hr/documents/[id]/pdf` | GET |  |
| `/api/hr/settlements/[id]/pdf` | GET | The settlement statement in Arabic or English, for payroll staff, its approvers and the employee it concerns. |
| `/api/inventory/labels/[id]/pdf` | GET | Returns generated stock labels as an inline printable PDF with exact physical dimensions. |
| `/api/it-support/[id]/attachment` | GET | An attachment of one of the signed-in employee's IT requests. Other people's tickets answer 404. |
| `/api/letterhead` | GET |  |
| `/api/letters/[id]/pdf` | GET |  |
| `/api/lookups/[domain]` | GET |  |
| `/api/moms/[id]/pdf` | GET | Minutes of meeting as PDF, in the viewer's language; the same file is printed, downloaded and e-mailed. |
| `/api/notifications` | GET |  |
| `/api/procurement/orders/[id]/pdf` | GET | The purchase order PDF, in the company's main language unless another is asked for. |
| `/api/reports/[key]` | GET | A report as CSV, Excel or PDF, for the period asked, if the person may run it. |
| `/api/sign/[token]/pdf` | GET | Days a client can still download their signed copy through the link. |
| `/api/sign/[token]` | POST | Public: the client signs through their one-time link. Errors are returned as codes the page translates. |
| `/api/upload/content/[folder]/[name]` | PUT | Receives the bytes of an upload started with /api/upload/init and streams them to the files service. Only the |
| `/api/upload/finalize` | POST |  |
| `/api/upload/init` | POST |  |
| `/api/webhooks/resend` | POST |  |

## Server actions (348 in `apps/admin/app/actions`)

Every action checks the caller's permission (`resource:action`) before touching data, validates its input against the generated schema, and runs its writes in one transaction.

### account-security.ts

| Action | Arguments | Permission |
|---|---|---|
| `changeMyPasswordAction` | `input` | signed in |
| `revokeMySessionAction` | `id` | signed in |
| `revokeOtherSessionsAction` |  | signed in |

### account-settings.ts

| Action | Arguments | Permission |
|---|---|---|
| `saveAccountSettingsAction` | `userId, changes, reason?` |  |
| `cancelAccountChangeAction` | `requestId` |  |

### approval-policies.ts

| Action | Arguments | Permission |
|---|---|---|
| `updateApprovalPolicyAction` | `targetType, policy` | settings:write |

### approvals.ts

| Action | Arguments | Permission |
|---|---|---|
| `decideApprovalAction` | `approvalRequestId, decision, reason?, /** Drawn by the approver now, for documents that must be signed on the spot. */ signature?` | signed in |

### assets.ts

| Action | Arguments | Permission |
|---|---|---|
| `saveAssetCategoryAction` | `data, categoryId?` |  |
| `saveAssetAction` | `data, assetId?` |  |
| `startAssetHandoverAction` | `data, inPerson?, issuerSignature?` |  |
| `signAssetHandoverAction` | `handoverId, data` |  |
| `signAssetHandoverInPersonAction` | `handoverId, data` |  |
| `cancelAssetHandoverAction` | `handoverId` | assets:edit |

### attachments.ts

| Action | Arguments | Permission |
|---|---|---|
| `createAttachmentAction` | `data` |  |
| `deleteAttachmentAction` | `id` |  |

### calendar.ts

| Action | Arguments | Permission |
|---|---|---|
| `createCalendarEventAction` | `data, your team, your department, the company, or a custom audience. */ visibility?` | calendar:write |
| `updateCalendarEventAction` | `id, data` | calendar:write |
| `deleteCalendarEventAction` | `id` | calendar:write |
| `createCalendarFeedAction` | `layers` |  |
| `updateCalendarFeedLayersAction` | `layers` | calendar:read |
| `revokeCalendarFeedAction` |  | calendar:read |
| `setCalendarSyncEnabledAction` | `enabled` |  |

### claims.ts

| Action | Arguments | Permission |
|---|---|---|
| `submitExpenseClaimAction` | `data` |  |
| `cancelExpenseClaimAction` | `id` | self_service:create |
| `scheduleExpenseClaimAction` | `id, payOn?` |  |
| `payExpenseClaimAction` | `id, payment` |  |

### client-signatures.ts

| Action | Arguments | Permission |
|---|---|---|
| `createSigningLinkAction` | `type, id, days, recipientEmail?` |  |
| `revokeSigningLinkAction` | `signatureId` |  |
| `recordSignedCopyAction` | `type, id, input` |  |

### cms-articles.ts

| Action | Arguments | Permission |
|---|---|---|
| `saveCmsArticleAction` | `input` |  |
| `deleteCmsArticleAction` | `id` | articles:delete |

### cms-pages.ts

| Action | Arguments | Permission |
|---|---|---|
| `saveCmsPageAction` | `input` |  |
| `duplicateCmsPageAction` | `id` | pages:create |
| `deleteCmsPageAction` | `id` | pages:delete |
| `updateCmsPagesListAction` | `pages` |  |

### cms.ts

| Action | Arguments | Permission |
|---|---|---|
| `toggleBannerStatusAction` | `id, isActive` | banners:write |
| `deleteBannerAction` | `id` | banners:delete |
| `createBannerAction` | `data` | banners:write |
| `deleteClientLogoAction` | `id` | clients:delete |
| `createClientLogoAction` | `data` | clients:write |
| `updateClientLogoAction` | `id, data` | clients:write |
| `deleteEquipmentAction` | `id` | equipment:delete |
| `createEquipmentAction` | `data` | equipment:write |
| `updateEquipmentAction` | `id, data` | equipment:write |
| `togglePortfolioFeaturedAction` | `id, isFeatured` | portfolio:write |
| `deletePortfolioItemAction` | `id` | portfolio:delete |
| `createPortfolioItemAction` | `input, listings, menu items… */ client_name?` | portfolio:write |
| `toggleReviewApprovalAction` | `id, isApproved` | reviews:write |
| `deleteReviewAction` | `id` | reviews:delete |
| `createFaqAction` | `data` | faqs:write |
| `updateFaqAction` | `id, data` | faqs:write |
| `deleteFaqAction` | `id` | faqs:delete |
| `createStatisticAction` | `data` | stats:write |
| `updateStatisticAction` | `id, data` | stats:write |
| `deleteStatisticAction` | `id` | stats:delete |
| `updateBannerContentAction` | `id, data` | banners:write |
| `updatePortfolioContentAction` | `id, input` | portfolio:write |

### commissions.ts

| Action | Arguments | Permission |
|---|---|---|
| `createCommissionRuleAction` | `input` |  |
| `recordCommissionSnapshotAction` | `input` |  |
| `reverseCommissionSnapshotAction` | `input` |  |

### communications.ts

| Action | Arguments | Permission |
|---|---|---|
| `saveAnnouncementAction` | `input, id?` | signed in |
| `submitAnnouncementAction` | `id` | signed in |
| `archiveAnnouncementAction` | `id` | signed in |
| `announcementReceiptAction` | `id, change` | signed in |
| `saveOfficialLetterAction` | `input, id?` |  |
| `submitOfficialLetterAction` | `id` | letters:edit |
| `cancelOfficialLetterAction` | `id` | letters:delete |
| `saveLetterTemplateAction` | `input, id?` | letters:edit |
| `draftLetterTemplateAction` | `templateId, employeeId?, purpose?, recipient?` | letters:create |
| `communicationSettingsAction` | `managersAnnounceToTeam` | settings:edit |

### crm.ts

| Action | Arguments | Permission |
|---|---|---|
| `updateDealStageAction` | `id, stage` | deals:write |
| `createCRMDealAction` | `data` | deals:write |
| `updateDealAction` | `id, data` | deals:write |
| `createContactAction` | `data` | contacts:write |
| `updateContactAction` | `id, data` | contacts:write |
| `deleteContactAction` | `id` | contacts:delete |
| `lookupClientAction` | `term` | contacts:read |
| `searchContactsAction` | `query` | contacts:read |
| `globalSearchAction` | `query` | signed in |
| `updateInquiryStatusAction` | `id, status` |  |
| `convertInquiryToClientAction` | `inquiryId` | contacts:write |
| `manageInquiryAction` | `id, data` |  |
| `linkInquiryCustomerAction` | `inquiryId, customerId` | contacts:write |

### dashboard.ts

| Action | Arguments | Permission |
|---|---|---|
| `saveDashboardLayoutAction` | `widgets` |  |
| `resetDashboardLayoutAction` |  |  |
| `saveCustomFolderAction` | `input` |  |
| `deleteCustomFolderAction` | `folderId` |  |

### delivery.ts

| Action | Arguments | Permission |
|---|---|---|
| `moveShipmentAction` | `id, input` |  |
| `saveDeliverySettingsAction` | `input` | settings:edit |
| `saveDeliveryZoneAction` | `input` | settings:edit |
| `saveDeliverySlotAction` | `input` | settings:edit |
| `deleteDeliverySlotAction` | `id` | settings:edit |
| `assignShipmentAction` | `id, input` | deliveries:assign |
| `completeDeliveryAction` | `id, input` |  |
| `saveVehicleAction` | `input` | deliveries:assign |
| `createRouteSheetAction` | `input` | deliveries:assign |
| `startRouteSheetAction` | `id` | deliveries:assign |
| `closeRouteSheetAction` | `id` | deliveries:assign |
| `settleCashAction` | `input` |  |
| `saveCourierAgencyAction` | `input` | deliveries:assign |
| `handToAgencyAction` | `id, input` |  |
| `recordAgencyInvoiceAction` | `input` |  |

### departments.ts

| Action | Arguments | Permission |
|---|---|---|
| `saveDepartmentAction` | `input` |  |
| `deleteDepartmentAction` | `id` | settings:edit |
| `addCatalogueDepartmentsAction` | `keys` |  |

### documents.ts

| Action | Arguments | Permission |
|---|---|---|
| `createCompanyDocumentAction` | `data` | settings:write |
| `deleteCompanyDocumentAction` | `id` | settings:delete |

### domains.ts

| Action | Arguments | Permission |
|---|---|---|
| `checkDomainAction` | `kind, domain` |  |
| `saveDomainsAction` | `input` | settings:write |

### employee-credentials.ts

| Action | Arguments | Permission |
|---|---|---|
| `updateEmployeeIdentityAction` | `employeeId, data` |  |
| `saveEmployeeCredentialAction` | `employeeId, data, credentialId?` |  |
| `deleteEmployeeCredentialAction` | `credentialId` | employees:edit |

### employee-handovers.ts

| Action | Arguments | Permission |
|---|---|---|
| `openEmployeeHandoverAction` | `data` |  |
| `setHandoverCaseModeAction` | `handoverId, data` | employees:edit |
| `applyHandoverCasesAction` | `handoverId, choices, string> = {}` |  |
| `refreshHandoverCasesAction` | `handoverId` | employees:edit |
| `updateHandoverChecklistAction` | `handoverId, key, data` | employees:edit |
| `submitEmployeeHandoverAction` | `handoverId` | employees:edit |
| `cancelEmployeeHandoverAction` | `handoverId` | employees:edit |

### final-settlements.ts

| Action | Arguments | Permission |
|---|---|---|
| `createFinalSettlementAction` | `input` |  |
| `recalculateFinalSettlementAction` | `id, input?` | payroll:edit |
| `setFinalSettlementLinesAction` | `id, lines` | payroll:edit |
| `submitFinalSettlementAction` | `id` | payroll:edit |
| `cancelFinalSettlementAction` | `id` | payroll:edit |
| `signFinalSettlementAction` | `id, input` |  |
| `payFinalSettlementAction` | `id, input` | payroll:issue_send |
| `updateSettlementRulesAction` | `input` |  |

### finance.ts

| Action | Arguments | Permission |
|---|---|---|
| `createExpenseAction` | `data` | expenses:write |
| `deleteExpenseAction` | `id` | expenses:delete |
| `createPaymentAction` | `data` | payments:write |
| `createInvoiceAction` | `data` | invoices:write |
| `markInvoiceSentAction` | `id` | invoices:write |
| `voidInvoiceAction` | `id` | invoices:write |
| `exportFinancialReportCsvAction` | `filters` | reports:read |
| `createExpenseCategoryAction` | `data` |  |
| `updateExpenseCategoryAction` | `id, data` | expenses:write |
| `deleteExpenseCategoryAction` | `id` | expenses:delete |

### hr-settings.ts

| Action | Arguments | Permission |
|---|---|---|
| `updateHrPolicyAction` | `policy` |  |
| `saveLeaveTypeAction` | `input` | employees:edit |
| `savePublicHolidayAction` | `input` | employees:edit |
| `deletePublicHolidayAction` | `id` | employees:edit |
| `saveShiftTypeAction` | `input` | payroll:edit |
| `addLeaveAdjustmentAction` | `input` | employees:edit |
| `saveAttendanceAction` | `input` | employees:edit |
| `deleteAttendanceAction` | `employeeId, date` | employees:edit |
| `markMonthPresentAction` | `year, month, employeeIds` | employees:edit |

### hrms.ts

| Action | Arguments | Permission |
|---|---|---|
| `createEmployeeAction` | `data, date of birth, CPR expiry and passport. */ identity?, work permit and other documents entered while onboarding. */ credentials?` | employees:create |
| `updateEmployeeAction` | `id, data` | employees:edit |
| `createDepartmentAction` | `data` | employees:create |
| `updateDepartmentAction` | `id, data` | employees:edit |

### inventory.ts

| Action | Arguments | Permission |
|---|---|---|
| `changeStockAction` | `input` |  |
| `transferStockAction` | `input` | inventory:edit |
| `saveReorderPointsAction` | `productId, levels` |  |
| `saveWarehouseAction` | `input` |  |
| `saveLocationAction` | `input` |  |
| `createStockCountAction` | `input` | inventory:create |
| `saveCountedAction` | `countId, entries` | inventory:edit |
| `scanCountItemAction` | `countId, code, locationId` |  |
| `setStockCountStatusAction` | `countId, status` |  |
| `approveStockCountAction` | `countId` | inventory:approve |

### it-support.ts

| Action | Arguments | Permission |
|---|---|---|
| `createItTicketAction` | `data` |  |
| `commentOnItTicketAction` | `id, body` |  |
| `transitionItTicketAction` | `id, transition` |  |

### leave.ts

| Action | Arguments | Permission |
|---|---|---|
| `createLeaveRequestAction` | `data, "half_am", "half_pm" or "hours". */ dayPortion?` | self_service:create |
| `decideLeaveRequestAction` | `requestId, decision, notes?` | signed in |
| `cancelLeaveRequestAction` | `requestId` | signed in |

### mom.ts

| Action | Arguments | Permission |
|---|---|---|
| `createMomAction` | `data` | moms:write |
| `updateMomAction` | `id, data` | moms:write |
| `deleteMomAction` | `id` | moms:delete |
| `approveAndSignMomAction` | `id, signature?` |  |
| `shareMomViaEmailAction` | `id, recipientEmail` | moms:export |

### notifications.ts

| Action | Arguments | Permission |
|---|---|---|
| `markNotificationReadAction` | `id` | signed in |
| `markAllNotificationsReadAction` | `userId?` | signed in |
| `updateNotificationAction` | `id, change` |  |

### orders.ts

| Action | Arguments | Permission |
|---|---|---|
| `moveOrderAction` | `id, status, note` |  |
| `recordOrderPaymentAction` | `id, input` | orders:edit |
| `recordOrderRefundAction` | `id, amount, reason` | orders:approve |
| `addOrderNoteAction` | `id, note` | orders:edit |
| `issueOrderInvoiceAction` | `id` | orders:edit |
| `createStaffOrderAction` | `input` |  |
| `saveStoreSettingsAction` | `input` | settings:edit |
| `saveCouponAction` | `input` | orders:approve |
| `recheckOrderPaymentAction` | `orderId, attemptId` |  |

### outreach.ts

| Action | Arguments | Permission |
|---|---|---|
| `saveCampaignAction` | `input` |  |
| `saveSegmentAction` | `input` |  |
| `saveBroadcastAction` | `input` |  |
| `sendBroadcastAction` | `id` |  |
| `saveMediaContactAction` | `input` |  |
| `saveCoverageAction` | `input` |  |
| `saveLegalMatterAction` | `input` |  |
| `addLegalNoteAction` | `id, body` | legal:edit |

### packages.ts

| Action | Arguments | Permission |
|---|---|---|
| `createStockPackageAction` | `input` |  |
| `packSerialsAction` | `input` |  |
| `sealStockPackageAction` | `input` |  |
| `moveStockPackageAction` | `input` |  |
| `unpackStockPackageAction` | `input` |  |

### payroll.ts

| Action | Arguments | Permission |
|---|---|---|
| `generatePayrollRunAction` | `month, year` | payroll:create |
| `submitPayrollRunForApprovalAction` | `runId` | payroll:edit |
| `approvePayrollRunAction` | `runId` | signed in |
| `markPayrollRunPaidAction` | `runId, payment` |  |
| `payPayrollItemAction` | `itemId, payment` |  |
| `recalculatePayrollRunAction` | `runId` |  |
| `setPayrollLinesAction` | `itemId, data` |  |
| `saveRecurringPayAction` | `employeeId, data, recurringId?` |  |
| `deleteRecurringPayAction` | `recurringId` | payroll:edit |
| `recordSupportReimbursementAction` | `input` |  |

### people-import.ts

| Action | Arguments | Permission |
|---|---|---|
| `previewPeopleImportAction` | `rows` |  |
| `importPeopleAction` | `rows` |  |

### permission-overrides.ts

| Action | Arguments | Permission |
|---|---|---|
| `setUserPermissionOverridesAction` | `userId, overrides, boolean>` |  |

### pipeline.ts

| Action | Arguments | Permission |
|---|---|---|
| `saveDealPipelineAction` | `stages` |  |
| `resetDealPipelineAction` |  |  |

### procurement.ts

| Action | Arguments | Permission |
|---|---|---|
| `saveSupplierAction` | `input` |  |
| `emailPurchaseOrderAction` | `id` |  |
| `markPurchaseOrderSentAction` | `id, via` | procurement:edit |
| `cancelPurchaseOrderAction` | `id` | procurement:edit |
| `receiveGoodsAction` | `orderId, input` |  |
| `saveSupplierBillAction` | `input` |  |
| `attachSupplierBillFileAction` | `id, fileUrl` |  |
| `approveSupplierBillAction` | `id, overrideReason` |  |
| `cancelSupplierBillAction` | `id` | procurement:edit |
| `recordSupplierPaymentAction` | `billId, input` | procurement:edit |

### products.ts

| Action | Arguments | Permission |
|---|---|---|
| `saveProductAction` | `input` |  |
| `deleteProductAction` | `id` | products:delete |
| `setProductsActiveAction` | `ids, isActive` |  |
| `setProductOnWebsiteAction` | `id, onWebsite` |  |
| `saveProductCategoryAction` | `input` |  |
| `deleteProductCategoryAction` | `id` | products:delete |

### profile.ts

| Action | Arguments | Permission |
|---|---|---|
| `updateMyProfileAction` | `data` | signed in |
| `requestIdentityChangeAction` | `data` | signed in |
| `decideProfileChangeAction` | `requestId, decision, notes?` | signed in |
| `requestSignatureChangeAction` | `fileUrl` |  |
| `cancelSignatureChangeAction` | `id` | signed in |
| `cancelMyProfileChangeAction` | `id` |  |

### quotations.ts

| Action | Arguments | Permission |
|---|---|---|
| `createQuotationAction` | `data` | quotations:create |
| `updateQuotationAction` | `id, data` | quotations:edit |
| `submitQuotationForApprovalAction` | `id, discountReason?` | quotations:edit |
| `issueQuotationAction` | `id, deliveryChannel?` | quotations:issue_send |
| `acceptQuotationAction` | `id, evidence?` | quotations:edit |
| `rejectQuotationAction` | `id, reason?` | quotations:edit |
| `convertQuotationToInvoiceAction` | `id` | quotations:edit |

### recurring-expenses.ts

| Action | Arguments | Permission |
|---|---|---|
| `saveRecurringExpenseAction` | `data, recurringId?` |  |
| `recordRecurringExpenseAction` | `recurringId, actual` |  |
| `skipRecurringExpenseAction` | `recurringId` | expenses:write |
| `deleteRecurringExpenseAction` | `recurringId` | expenses:delete |

### reports.ts

| Action | Arguments | Permission |
|---|---|---|
| `saveReportScheduleAction` | `input` |  |
| `stopReportScheduleAction` | `id, reportKey` |  |

### requests.ts

| Action | Arguments | Permission |
|---|---|---|
| `assignRequestAction` | `id, assignment` | requests:assign |
| `reassignRequestAction` | `id, assignment` | requests:assign |
| `returnRequestAction` | `id, details` | requests:write |
| `approveRequestAction` | `id, details` | signed in |
| `submitRequestForApprovalAction` | `id, details` | requests:write |
| `confirmRequestAction` | `id, details` | requests:approve |
| `resolveRequestAction` | `id, details` | requests:write |
| `createConsolidatedRequestAction` | `data` | requests:write |
| `assignRequestWithAvailabilityAction` | `id, assignment` | requests:assign |
| `addRequestCommentAction` | `inquiryId, body, isClientVisible, attachments?` | requests:write |

### retail.ts

| Action | Arguments | Permission |
|---|---|---|
| `saveRegisterAction` | `input` |  |
| `saveDrawerAction` | `input` |  |
| `openRetailShiftAction` | `input` |  |
| `closeRetailShiftAction` | `input` |  |
| `openCashierSessionAction` | `input` |  |
| `closeCashierSessionAction` | `input` |  |
| `recordPaymentCollectionAction` | `input` |  |
| `reversePaymentCollectionAction` | `input` |  |
| `performRetailClosingAction` | `input` |  |

### roles.ts

| Action | Arguments | Permission |
|---|---|---|
| `upsertRoleAction` | `data, boolean>; /** Which records the role sees per area (constants/data-scope.ts` |  |
| `deleteRoleAction` | `id` | users:delete |

### salary-documents.ts

| Action | Arguments | Permission |
|---|---|---|
| `requestSalaryDocumentAction` | `data, English or both; each language is its own PDF. */ languages` | self_service:create |
| `reviewSalaryDocumentAction` | `id, decision, notes?` | signed in |
| `emailSalaryDocumentAction` | `id, locale` | signed in |
| `whatsappSalaryDocumentAction` | `id, locale` | signed in |
| `payslipMonthsForEmployeeAction` | `employeeId` |  |

### sales.ts

| Action | Arguments | Permission |
|---|---|---|
| `reassignSalesOwnerAction` | `entityType, id, toUserId, reason?` |  |
| `updateUserCommissionRateAction` | `id, rate` | users:write |
| `recordCommissionPayoutAction` | `userId, month` |  |

### samples.ts

| Action | Arguments | Permission |
|---|---|---|
| `addSampleContentAction` | `activity` |  |
| `removeSampleContentAction` |  |  |
| `exampleWebsiteAction` | `activity, locale` |  |

### serialized-stock.ts

| Action | Arguments | Permission |
|---|---|---|
| `generateSerialLabelsAction` | `input` |  |
| `confirmSerialLabelPrintingAction` | `input` |  |
| `verifyGeneratedSerialsAction` | `input` |  |
| `moveSerialsBetweenBinsAction` | `input` |  |
| `fulfillSerializedOrderAction` | `input` |  |
| `returnSerializedOrderAction` | `input` |  |

### service-desk.ts

| Action | Arguments | Permission |
|---|---|---|
| `replyToRequestAction` | `id, input` |  |
| `saveServiceSettingsAction` | `input` | settings:edit |
| `saveCannedReplyAction` | `input` | requests:edit |

### services.ts

| Action | Arguments | Permission |
|---|---|---|
| `createServiceAction` | `data` | invoices:write |
| `updateServiceAction` | `id, data` | invoices:write |
| `deleteServiceAction` | `id` | invoices:delete |

### settings.ts

| Action | Arguments | Permission |
|---|---|---|
| `updateCompanySettingsAction` | `settings` | settings:write |
| `saveCompanyAssetAction` | `assetKey, data` | settings:write |
| `deleteCompanyAssetAction` | `assetKey` | settings:write |
| `updateWebSettingsAction` | `settings` | settings:write |
| `revalidateEntireSiteAction` |  | settings:write |
| `createSocialLinkAction` | `data` | settings:write |
| `updateSocialLinkAction` | `id, data` | settings:write |
| `deleteSocialLinkAction` | `id` | settings:write |

### setup.ts

| Action | Arguments | Permission |
|---|---|---|
| `setupPreviewAction` | `locale` |  |
| `saveSetupWebsiteDraftAction` | `config` |  |

### signatures.ts

| Action | Arguments | Permission |
|---|---|---|
| `getSignatureModeAction` | `documentType` |  |
| `setSignaturePolicyAction` | `documentType, mode` |  |
| `createHandoverSigningLinkAction` | `handoverId, days, recipientEmail?` |  |
| `revokeHandoverSigningLinkAction` | `requestId` | assets:edit |
| `openMyHandoverSigningPageAction` | `handoverId` |  |

### signing.ts

| Action | Arguments | Permission |
|---|---|---|
| `signDocumentAction` | `type, id, signature?` |  |
| `requestInvoiceApprovalAction` | `id` |  |

### social-insurance.ts

| Action | Arguments | Permission |
|---|---|---|
| `updateGosiRulesAction` | `input` |  |
| `scheduleGosiComponentAction` | `input` |  |
| `updateGosiComponentAction` | `id, input, "effective_from" | "code">` | payroll:edit |
| `endGosiComponentAction` | `id, endsOn` | payroll:edit |
| `saveEmployeeGosiRecordAction` | `employeeId, input` |  |
| `deleteEmployeeGosiRecordAction` | `id` | payroll:edit |
| `registerUnregisteredEmployeesAction` | `effectiveFrom` |  |
| `saveSupportProgramAction` | `input, id?` | payroll:edit |
| `scheduleSupportRuleAction` | `programId, input` |  |
| `deleteSupportRuleAction` | `id` | payroll:edit |
| `saveEmployeeSupportAction` | `input, id?` |  |
| `deleteEmployeeSupportAction` | `id` | payroll:edit |

### social.ts

| Action | Arguments | Permission |
|---|---|---|
| `refreshSocialAnalyticsAction` |  |  |
| `saveSocialPlanAction` | `id, input` |  |
| `deleteSocialPlanAction` | `id` | social:delete |

### stock-transfers.ts

| Action | Arguments | Permission |
|---|---|---|
| `requestSerialTransferAction` | `input` | inventory:edit |
| `processSerialTransferAction` | `input` |  |
| `previewStockHandoverAction` | `input` | inventory:edit |
| `acknowledgeStockHandoverAction` | `input` | inventory:edit |
| `reportMissingTransferUnitsAction` | `input` | inventory:edit |

### tasks.ts

| Action | Arguments | Permission |
|---|---|---|
| `saveTaskAction` | `input` |  |
| `moveTaskAction` | `id, status` |  |
| `addTaskCommentAction` | `id, body` |  |
| `saveProjectAction` | `input` | tasks:assign |

### taxes.ts

| Action | Arguments | Permission |
|---|---|---|
| `saveTaxRateAction` | `data` |  |
| `deleteTaxRateAction` | `id` | settings:write |

### users.ts

| Action | Arguments | Permission |
|---|---|---|
| `createUserAction` | `data` | users:write |
| `updateUserRoleAction` | `id, role` | users:write |
| `updateUserAction` | `id, data` | users:write |
| `suspendUserAction` | `id, reason` | users:write |
| `reactivateUserAction` | `id` | users:write |
| `archiveUserAction` | `id` | users:write |
| `deleteUserAction` | `id` | users:delete |
| `updateUserDiscountLimitAction` | `id, limit` |  |
| `bulkUpdateUsersAction` | `change` | users:write |

### website.ts

| Action | Arguments | Permission |
|---|---|---|
| `saveWebsiteDraftAction` | `value, revision` | settings:write |
| `publishWebsiteAction` | `revision` | settings:write |
| `restoreWebsiteAction` | `revision` | settings:write |
| `previewWebsiteAction` | `locale, path?` |  |
| `updateWebsiteServiceAction` | `id, isPublic, imageUrl` | settings:write |
| `saveWebsiteMenusAction` | `menus, articles` |  |

## Database models (205)

`User`, `CompanySetting`, `CompanyAsset`, `HeroBanner`, `PortfolioCategory`, `PortfolioItem`, `ClientLogo`, `StudioEquipment`, `Inquiry`, `InquiryNote`, `WebsiteContent`, `CmsPage`, `CmsArticle`, `CrmContact`, `ClientContactPerson`, `CrmDeal`, `DealPipelineStage`, `Invoice`, `InvoiceLineItem`, `Payment`, `ExpenseCategory`, `Expense`, `CalendarEvent`, `ActivityLog`, `Notification`, `Tag`, `Attachment`, `Permission`, `Session`, `DocumentTemplate`, `Contract`, `MinuteOfMeeting`, `GeneratedDocument`, `CompanyDocument`, `Service`, `SocialLink`, `Role`, `RoleDataScope`, `Review`, `Faq`, `Statistic`, `RevalidationJob`, `AbuseWindow`, `MfaRecoveryCode`, `EmailJob`, `SocialInsightSnapshot`, `AuthChallenge`, `Quotation`, `QuotationLineItem`, `CommunicationThread`, `CommunicationMessage`, `MessageAttachment`, `SocialPost`, `SocialPostSnapshot`, `SocialContentPlan`, `SocialMetric`, `ProfileChangeRequest`, `ApprovalRequest`, `ApprovalDecision`, `ApprovalPolicy`, `ApprovalPolicyStep`, `ReferenceSequence`, `RequestEvent`, `RequestAssignment`, `RequestComment`, `ExchangeRateSnapshot`, `DocumentFx`, `PaymentAllocation`, `BankSettlement`, `Department`, `Employee`, `EmploymentRecord`, `LeaveType`, `LeaveAdjustment`, `HrPolicy`, `PublicHoliday`, `ShiftType`, `LeaveRequest`, `AttendanceEntry`, `BenefitPlan`, `PayrollRun`, `PayrollItem`, `Payslip`, `SalaryDocument`, `ExpenseClaim`, `SalesAttributionChange`, `CommissionPayout`, `SupportReimbursement`, `AccountChangeRequest`, `SignatureChange`, `ClientSignature`, `TaxRate`, `DocumentTax`, `EmployeeCredential`, `PayrollItemLine`, `EmployeeRecurringPay`, `RecurringExpense`, `AssetCategory`, `Asset`, `AssetHandover`, `EmployeeHandover`, `EmployeeHandoverCase`, `SignaturePolicy`, `SignatureRequest`, `GosiSettings`, `GosiComponent`, `EmployeeGosiRecord`, `SupportProgram`, `SupportProgramRule`, `EmployeeSupport`, `EmployeeSupportEvent`, `FinalSettlement`, `FinalSettlementLine`, `CalendarFeedToken`, `CommunicationSettings`, `Announcement`, `AnnouncementReceipt`, `LetterTemplate`, `OfficialLetter`, `ProductCategory`, `Product`, `ProductVariant`, `Warehouse`, `StockLocation`, `StockItem`, `StockBatch`, `StockLevel`, `StockMovement`, `StockCount`, `StockCountLine`, `PurchaseRequisition`, `PurchaseRequisitionLine`, `Rfq`, `RfqLine`, `RfqQuote`, `PurchaseOrder`, `PurchaseOrderLine`, `GoodsReceipt`, `GoodsReceiptLine`, `SupplierBill`, `SupplierBillLine`, `SupplierPayment`, `Customer`, `CustomerSession`, `CustomerAddress`, `CustomerAuthCode`, `WishlistItem`, `StoreSettings`, `PaymentAttempt`, `PaymentWebhookEvent`, `Coupon`, `SalesOrder`, `SalesOrderLine`, `SalesOrderEvent`, `DeliverySettings`, `DeliveryZone`, `DeliverySlot`, `Shipment`, `ShipmentEvent`, `Vehicle`, `RouteSheet`, `CodSettlement`, `CourierAgency`, `AgencyInvoice`, `Project`, `Task`, `TaskComment`, `ServiceSettings`, `CannedReply`, `Campaign`, `CustomerSegment`, `Broadcast`, `BroadcastRecipient`, `MediaContact`, `MediaCoverage`, `LegalMatter`, `LegalMatterEvent`, `ReportSchedule`, `DashboardLayout`, `Branch`, `BranchGrant`, `ProductPackagingUnit`, `StockSerial`, `SerialGeneration`, `StockPackage`, `PackageContent`, `StockTraceEvent`, `LabelPrintJob`, `AccountingAccount`, `AccountingPeriod`, `JournalEntry`, `JournalLine`, `StockAllocation`, `StockAllocationLine`, `StockAcknowledgment`, `RetailRegister`, `CashDrawer`, `CashierSession`, `RetailShift`, `RetailClosing`, `PaymentMethodConfig`, `PaymentCollection`, `CommissionRule`, `CommissionSnapshot`, `StoreRegion`
