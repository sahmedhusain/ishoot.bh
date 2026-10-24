# API reference

Generated from the code by `pnpm docs:api`; do not edit by hand. Input contracts for every server action are in `apps/admin/lib/action-schemas.json`, and the full data model is `packages/database/prisma/schema.prisma` (browse it with `pnpm db:studio`).

## Website HTTP routes (`apps/web`)

| Route | Methods | Notes |
|---|---|---|
| `/api/files/[folder]/[name]` | GET |  |
| `/api/inquiry` | POST |  |
| `/api/preview` | GET, POST |  |
| `/api/revalidate` | POST |  |
| `/api/reviews` | POST |  |

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
| `/api/hr/documents/[id]/pdf` | GET |  |
| `/api/hr/settlements/[id]/pdf` | GET | The settlement statement in Arabic or English, for payroll staff, its approvers and the employee it concerns. |
| `/api/letterhead` | GET |  |
| `/api/letters/[id]/pdf` | GET |  |
| `/api/lookups/[domain]` | GET |  |
| `/api/moms/[id]/pdf` | GET | Minutes of meeting as PDF, in the viewer's language; the same file is printed, downloaded and e-mailed. |
| `/api/notifications` | GET |  |
| `/api/sign/[token]/pdf` | GET | Days a client can still download their signed copy through the link. |
| `/api/sign/[token]` | POST | Public: the client signs through their one-time link. Errors are returned as codes the page translates. |
| `/api/upload/finalize` | POST |  |
| `/api/upload/init` | POST |  |
| `/api/upload/local/[folder]/[name]` | PUT | Local-disk upload target used when Supabase Storage is not configured. Only the user who started the upload may |
| `/api/webhooks/resend` | POST |  |

## Server actions (233 in `apps/admin/app/actions`)

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
| `createPortfolioItemAction` | `data` | portfolio:write |
| `toggleReviewApprovalAction` | `id, isApproved` | reviews:write |
| `deleteReviewAction` | `id` | reviews:delete |
| `createFaqAction` | `data` | faqs:write |
| `updateFaqAction` | `id, data` | faqs:write |
| `deleteFaqAction` | `id` | faqs:delete |
| `createStatisticAction` | `data` | stats:write |
| `updateStatisticAction` | `id, data` | stats:write |
| `deleteStatisticAction` | `id` | stats:delete |
| `updateBannerContentAction` | `id, data` | banners:write |
| `updatePortfolioContentAction` | `id, data` | portfolio:write |

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

### documents.ts

| Action | Arguments | Permission |
|---|---|---|
| `createCompanyDocumentAction` | `data` | settings:write |
| `deleteCompanyDocumentAction` | `id` | settings:delete |

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
| `refreshExchangeRatesAction` |  |  |
| `createExpenseCategoryAction` | `data` | expenses:write |
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

### integrations.ts

| Action | Arguments | Permission |
|---|---|---|
| `testIntegrationAction` | `provider` | settings:write |
| `syncIntegrationAction` | `provider` | social:write |
| `sendWhatsAppTestAction` | `to, message` | settings:write |

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

### permission-overrides.ts

| Action | Arguments | Permission |
|---|---|---|
| `setUserPermissionOverridesAction` | `userId, overrides, boolean>` |  |

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

### roles.ts

| Action | Arguments | Permission |
|---|---|---|
| `upsertRoleAction` | `data, boolean>; }` |  |
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
| `toggleFeatureAction` | `moduleKey, isEnabled` | settings:write |
| `updateWebSettingsAction` | `settings` | settings:write |
| `revalidateEntireSiteAction` |  | settings:write |
| `createSocialLinkAction` | `data` | settings:write |
| `updateSocialLinkAction` | `id, data` | settings:write |
| `deleteSocialLinkAction` | `id` | settings:write |

### setup.ts

| Action | Arguments | Permission |
|---|---|---|
| `saveSetupCompanyAction` | `input` | settings:write |
| `saveSetupThemeAction` | `theme` | settings:write |
| `saveSetupConfigAction` | `input` | settings:write |
| `completeSetupAction` |  | settings:write |

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

### website.ts

| Action | Arguments | Permission |
|---|---|---|
| `saveWebsiteDraftAction` | `value, revision` | settings:write |
| `publishWebsiteAction` | `revision` | settings:write |
| `restoreWebsiteAction` | `revision` | settings:write |
| `previewWebsiteAction` | `locale` | settings:read |
| `updateWebsiteServiceAction` | `id, isPublic, imageUrl` | settings:write |

## Database models (116)

`User`, `CompanySetting`, `CompanyAsset`, `HeroBanner`, `PortfolioCategory`, `PortfolioItem`, `ClientLogo`, `StudioEquipment`, `Inquiry`, `InquiryNote`, `WebsiteContent`, `CrmContact`, `ClientContactPerson`, `CrmDeal`, `Invoice`, `InvoiceLineItem`, `Payment`, `ExpenseCategory`, `Expense`, `CalendarEvent`, `ActivityLog`, `Notification`, `Tag`, `Attachment`, `Permission`, `Session`, `DocumentTemplate`, `Contract`, `MinuteOfMeeting`, `GeneratedDocument`, `CompanyDocument`, `Service`, `SocialLink`, `Role`, `FeatureToggle`, `Review`, `Faq`, `Statistic`, `RevalidationJob`, `UploadObject`, `AbuseWindow`, `MfaRecoveryCode`, `EmailJob`, `IntegrationSetting`, `AuthChallenge`, `Quotation`, `QuotationLineItem`, `CommunicationThread`, `CommunicationMessage`, `MessageAttachment`, `SocialPost`, `SocialContentPlan`, `SocialMetric`, `ProfileChangeRequest`, `ApprovalRequest`, `ApprovalDecision`, `ApprovalPolicy`, `ApprovalPolicyStep`, `ReferenceSequence`, `RequestEvent`, `RequestAssignment`, `RequestComment`, `ExchangeRateSnapshot`, `DocumentFx`, `PaymentAllocation`, `BankSettlement`, `Department`, `Employee`, `EmploymentRecord`, `LeaveType`, `LeaveAdjustment`, `HrPolicy`, `PublicHoliday`, `ShiftType`, `LeaveRequest`, `AttendanceEntry`, `BenefitPlan`, `PayrollRun`, `PayrollItem`, `Payslip`, `SalaryDocument`, `ExpenseClaim`, `SalesAttributionChange`, `CommissionPayout`, `SupportReimbursement`, `AccountChangeRequest`, `SignatureChange`, `ClientSignature`, `TaxRate`, `DocumentTax`, `EmployeeCredential`, `PayrollItemLine`, `EmployeeRecurringPay`, `RecurringExpense`, `AssetCategory`, `Asset`, `AssetHandover`, `EmployeeHandover`, `EmployeeHandoverCase`, `SignaturePolicy`, `SignatureRequest`, `GosiSettings`, `GosiComponent`, `EmployeeGosiRecord`, `SupportProgram`, `SupportProgramRule`, `EmployeeSupport`, `EmployeeSupportEvent`, `FinalSettlement`, `FinalSettlementLine`, `CalendarFeedToken`, `CommunicationSettings`, `Announcement`, `AnnouncementReceipt`, `LetterTemplate`, `OfficialLetter`
