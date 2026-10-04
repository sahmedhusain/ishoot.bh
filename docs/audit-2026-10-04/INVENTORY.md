# Platform source inventory

Generated from current source; excludes dependencies, build output and generated Prisma client. Detection is syntactic, not a statement that every path was exercised.

{"sourceFiles":322,"apiHandlers":21,"serverActions":85,"models":50,"findManyCalls":71,"readsWithoutExplicitTake":45}

## API handlers

| Source | Function | Direct boundary calls |
|---|---|---|
| apps/admin/app/api/auth/forgot-password/route.ts:7 | POST | None directly detected; inspect helpers/token validation |
| apps/admin/app/api/auth/login/route.ts:21 | POST | readLoginInput |
| apps/admin/app/api/auth/logout/route.ts:7 | POST | None directly detected; inspect helpers/token validation |
| apps/admin/app/api/auth/me/route.ts:6 | GET | getCurrentUser |
| apps/admin/app/api/auth/mfa/route.ts:6 | POST | getCurrentUser, readLoginInput |
| apps/admin/app/api/auth/reset-password/route.ts:6 | POST | None directly detected; inspect helpers/token validation |
| apps/admin/app/api/calendar/feed/route.ts:23 | GET | getCurrentUser |
| apps/admin/app/api/cron/route.ts:4 | GET | None directly detected; inspect helpers/token validation |
| apps/admin/app/api/documents/[id]/pdf/route.ts:16 | GET | getCurrentUser |
| apps/admin/app/api/exports/[domain]/route.ts:23 | GET | getCurrentUser, requirePermission, requirePermission, requirePermission, requirePermission |
| apps/admin/app/api/files/[folder]/[name]/route.ts:10 | GET | getCurrentUser, requireAttachmentAccess, requirePermission |
| apps/admin/app/api/lookups/[domain]/route.ts:5 | GET | getCurrentUser, requirePermission |
| apps/admin/app/api/upload/finalize/route.ts:10 | POST | getCurrentUser, requireAttachmentAccess |
| apps/admin/app/api/upload/init/route.ts:10 | POST | getCurrentUser, requireAttachmentAccess |
| apps/admin/app/api/webhooks/resend/route.ts:5 | POST | None directly detected; inspect helpers/token validation |
| apps/web/app/api/files/[folder]/[name]/route.ts:8 | GET | None directly detected; inspect helpers/token validation |
| apps/web/app/api/inquiry/route.ts:26 | POST | readSubmission |
| apps/web/app/api/preview/route.ts:4 | GET | None directly detected; inspect helpers/token validation |
| apps/web/app/api/preview/route.ts:37 | POST | None directly detected; inspect helpers/token validation |
| apps/web/app/api/revalidate/route.ts:5 | POST | None directly detected; inspect helpers/token validation |
| apps/web/app/api/reviews/route.ts:10 | POST | readSubmission |

## Server actions

| Source | Function | Direct boundary calls |
|---|---|---|
| apps/admin/app/actions/attachments.ts:14 | createAttachmentAction | requireAttachmentAccess |
| apps/admin/app/actions/attachments.ts:61 | deleteAttachmentAction | requireAttachmentAccess |
| apps/admin/app/actions/calendar.ts:14 | createCalendarEventAction | requirePermission, requirePermission |
| apps/admin/app/actions/calendar.ts:54 | deleteCalendarEventAction | requirePermission |
| apps/admin/app/actions/cms.ts:26 | toggleBannerStatusAction | requirePermission |
| apps/admin/app/actions/cms.ts:49 | deleteBannerAction | requirePermission |
| apps/admin/app/actions/cms.ts:70 | createBannerAction | requirePermission |
| apps/admin/app/actions/cms.ts:109 | deleteClientLogoAction | requirePermission |
| apps/admin/app/actions/cms.ts:130 | createClientLogoAction | requirePermission |
| apps/admin/app/actions/cms.ts:160 | deleteEquipmentAction | requirePermission |
| apps/admin/app/actions/cms.ts:181 | createEquipmentAction | requirePermission |
| apps/admin/app/actions/cms.ts:211 | togglePortfolioFeaturedAction | requirePermission |
| apps/admin/app/actions/cms.ts:240 | deletePortfolioItemAction | requirePermission |
| apps/admin/app/actions/cms.ts:262 | createPortfolioItemAction | requirePermission |
| apps/admin/app/actions/cms.ts:315 | toggleReviewApprovalAction | requirePermission |
| apps/admin/app/actions/cms.ts:338 | deleteReviewAction | requirePermission |
| apps/admin/app/actions/cms.ts:357 | createFaqAction | requirePermission |
| apps/admin/app/actions/cms.ts:377 | updateFaqAction | requirePermission |
| apps/admin/app/actions/cms.ts:400 | deleteFaqAction | requirePermission |
| apps/admin/app/actions/cms.ts:419 | createStatisticAction | requirePermission |
| apps/admin/app/actions/cms.ts:441 | updateStatisticAction | requirePermission |
| apps/admin/app/actions/cms.ts:464 | deleteStatisticAction | requirePermission |
| apps/admin/app/actions/cms.ts:534 | updateBannerContentAction | requirePermission |
| apps/admin/app/actions/cms.ts:557 | updatePortfolioContentAction | requirePermission |
| apps/admin/app/actions/crm.ts:26 | updateDealStageAction | requirePermission |
| apps/admin/app/actions/crm.ts:52 | createCRMDealAction | requirePermission, requirePermission |
| apps/admin/app/actions/crm.ts:83 | updateDealAction | requirePermission, requirePermission, requirePermission |
| apps/admin/app/actions/crm.ts:124 | createContactAction | requirePermission |
| apps/admin/app/actions/crm.ts:153 | updateContactAction | requirePermission |
| apps/admin/app/actions/crm.ts:179 | deleteContactAction | requirePermission |
| apps/admin/app/actions/crm.ts:200 | lookupClientAction | requirePermission |
| apps/admin/app/actions/crm.ts:209 | searchContactsAction | requirePermission |
| apps/admin/app/actions/crm.ts:218 | globalSearchAction | requireAuth |
| apps/admin/app/actions/crm.ts:247 | updateInquiryStatusAction | requireInquiryAccess |
| apps/admin/app/actions/crm.ts:292 | convertInquiryToClientAction | requireInquiryAccess, requirePermission, requirePermission |
| apps/admin/app/actions/crm.ts:450 | manageInquiryAction | requireInquiryAccess |
| apps/admin/app/actions/crm.ts:501 | linkInquiryCustomerAction | requireInquiryAccess, requirePermission |
| apps/admin/app/actions/documents.ts:15 | createCompanyDocumentAction | requirePermission |
| apps/admin/app/actions/documents.ts:50 | deleteCompanyDocumentAction | requirePermission |
| apps/admin/app/actions/finance.ts:20 | createExpenseAction | requirePermission |
| apps/admin/app/actions/finance.ts:54 | deleteExpenseAction | requirePermission |
| apps/admin/app/actions/finance.ts:77 | createPaymentAction | requirePermission |
| apps/admin/app/actions/finance.ts:123 | createInvoiceAction | requirePermission |
| apps/admin/app/actions/finance.ts:176 | updateInvoiceAction | requirePermission |
| apps/admin/app/actions/finance.ts:230 | voidInvoiceAction | requirePermission |
| apps/admin/app/actions/integrations.ts:10 | saveIntegration | requirePermission |
| apps/admin/app/actions/integrations.ts:45 | unlinkIntegration | requirePermission |
| apps/admin/app/actions/mom.ts:21 | createMomAction | requirePermission, requirePermission, requirePermission, getCurrentUser |
| apps/admin/app/actions/mom.ts:67 | updateMomAction | requirePermission, requirePermission, requirePermission |
| apps/admin/app/actions/mom.ts:129 | deleteMomAction | requirePermission |
| apps/admin/app/actions/mom.ts:151 | approveAndSignMomAction | requirePermission |
| apps/admin/app/actions/mom.ts:177 | shareMomViaEmailAction | requirePermission, requirePermission |
| apps/admin/app/actions/notifications.ts:14 | getNotificationsAction | requireAuth |
| apps/admin/app/actions/notifications.ts:22 | markNotificationReadAction | requireAuth |
| apps/admin/app/actions/notifications.ts:38 | markAllNotificationsReadAction | requireAuth |
| apps/admin/app/actions/requests.ts:16 | assignRequestAction | requirePermission, getCurrentUser |
| apps/admin/app/actions/requests.ts:46 | reassignRequestAction | requirePermission, getCurrentUser |
| apps/admin/app/actions/requests.ts:76 | returnRequestAction | requirePermission, getCurrentUser |
| apps/admin/app/actions/requests.ts:102 | approveRequestAction | requirePermission, getCurrentUser |
| apps/admin/app/actions/requests.ts:128 | confirmRequestAction | requirePermission, getCurrentUser |
| apps/admin/app/actions/requests.ts:154 | resolveRequestAction | requirePermission, getCurrentUser |
| apps/admin/app/actions/roles.ts:9 | upsertRoleAction | requirePermission |
| apps/admin/app/actions/roles.ts:99 | deleteRoleAction | requirePermission |
| apps/admin/app/actions/services.ts:16 | createServiceAction | requirePermission |
| apps/admin/app/actions/services.ts:49 | updateServiceAction | requirePermission |
| apps/admin/app/actions/services.ts:85 | deleteServiceAction | requirePermission |
| apps/admin/app/actions/settings.ts:19 | updateCompanySettingsAction | requirePermission |
| apps/admin/app/actions/settings.ts:43 | saveCompanyAssetAction | requirePermission |
| apps/admin/app/actions/settings.ts:127 | deleteCompanyAssetAction | requirePermission |
| apps/admin/app/actions/settings.ts:161 | toggleFeatureAction | requirePermission |
| apps/admin/app/actions/settings.ts:184 | updateWebSettingsAction | requirePermission |
| apps/admin/app/actions/settings.ts:222 | revalidateEntireSiteAction | requirePermission |
| apps/admin/app/actions/settings.ts:244 | createSocialLinkAction | requirePermission |
| apps/admin/app/actions/settings.ts:275 | updateSocialLinkAction | requirePermission |
| apps/admin/app/actions/settings.ts:309 | deleteSocialLinkAction | requirePermission |
| apps/admin/app/actions/social-metrics.ts:6 | fetchSocialMetrics | requirePermission |
| apps/admin/app/actions/users.ts:87 | createUserAction | requirePermission |
| apps/admin/app/actions/users.ts:139 | updateUserRoleAction | requirePermission |
| apps/admin/app/actions/users.ts:164 | updateUserAction | requirePermission |
| apps/admin/app/actions/users.ts:223 | deleteUserAction | requirePermission |
| apps/admin/app/actions/website.ts:20 | saveWebsiteDraftAction | requirePermission |
| apps/admin/app/actions/website.ts:52 | publishWebsiteAction | requirePermission |
| apps/admin/app/actions/website.ts:117 | restoreWebsiteAction | requirePermission |
| apps/admin/app/actions/website.ts:180 | previewWebsiteAction | requirePermission |
| apps/admin/app/actions/website.ts:198 | updateWebsiteServiceAction | requirePermission |

## Reads without an explicit take

Some CMS collections are intentionally complete. Transaction/select projections and pagination at callers require manual review. Never add silent limits that hide records.

- apps/admin/app/api/auth/reset-password/route.ts:17 — db.authChallenge.findMany
- apps/admin/app/dashboard/cms/website/page.tsx:11 — db.service.findMany
- apps/admin/app/dashboard/crm/deals/[id]/edit/page.tsx:21 — db.user.findMany
- apps/admin/app/dashboard/requests/page.tsx:25 — db.user.findMany
- apps/admin/app/dashboard/settings/integrations/page.tsx:11 — db.integrationSetting.findMany
- apps/admin/app/dashboard/settings/roles/page.tsx:11 — db.role.findMany
- apps/admin/app/dashboard/settings/roles/page.tsx:18 — db.permission.findMany
- apps/admin/app/dashboard/users/new/page.tsx:12 — db.role.findMany
- apps/admin/app/dashboard/users/page.tsx:11 — db.role.findMany
- apps/admin/app/dashboard/users/page.tsx:15 — db.permission.findMany
- packages/database/src/queries/attachments.ts:12 — db.attachment.findMany
- packages/database/src/queries/attachments.ts:37 — db.crmContact.findMany
- packages/database/src/queries/attachments.ts:43 — db.invoice.findMany
- packages/database/src/queries/attachments.ts:49 — db.crmDeal.findMany
- packages/database/src/queries/attachments.ts:55 — db.payment.findMany
- packages/database/src/queries/banners.ts:25 — db.heroBanner.findMany
- packages/database/src/queries/banners.ts:38 — db.heroBanner.findMany
- packages/database/src/queries/clients.ts:18 — db.clientLogo.findMany
- packages/database/src/queries/clients.ts:31 — db.clientLogo.findMany
- packages/database/src/queries/company-assets.ts:29 — db.companyAsset.findMany
- packages/database/src/queries/company-documents.ts:36 — db.companyDocument.findMany
- packages/database/src/queries/crm.ts:52 — db.crmContact.findMany
- packages/database/src/queries/crm.ts:484 — db.crmDeal.findMany
- packages/database/src/queries/equipment.ts:24 — db.studioEquipment.findMany
- packages/database/src/queries/expenses.ts:40 — db.expenseCategory.findMany
- packages/database/src/queries/expenses.ts:71 — db.expense.findMany
- packages/database/src/queries/faqs.ts:5 — db.faq.findMany
- packages/database/src/queries/features.ts:4 — db.featureToggle.findMany
- packages/database/src/queries/invoices.ts:122 — db.invoice.findMany
- packages/database/src/queries/invoices.ts:145 — db.invoice.findMany
- packages/database/src/queries/moms.ts:66 — db.minuteOfMeeting.findMany
- packages/database/src/queries/payments.ts:129 — db.attachment.findMany
- packages/database/src/queries/payments.ts:177 — db.attachment.findMany
- packages/database/src/queries/permissions.ts:260 — db.permission.findMany
- packages/database/src/queries/permissions.ts:347 — db.featureToggle.findMany
- packages/database/src/queries/permissions.ts:349 — db.permission.findMany
- packages/database/src/queries/portfolio.ts:40 — db.portfolioCategory.findMany
- packages/database/src/queries/portfolio.ts:123 — db.portfolioItem.findMany
- packages/database/src/queries/reviews.ts:5 — db.review.findMany
- packages/database/src/queries/services.ts:44 — db.service.findMany
- packages/database/src/queries/sessions.ts:112 — db.session.findMany
- packages/database/src/queries/social-links.ts:19 — db.socialLink.findMany
- packages/database/src/queries/stats.ts:5 — db.statistic.findMany
- packages/database/src/queries/users.ts:27 — db.user.findMany
- packages/database/src/queries/website.ts:15 — db.service.findMany
