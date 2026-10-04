# Platform source inventory

Generated from current source; excludes dependencies, build output and generated Prisma client. Detection is syntactic, not a statement that every path was exercised.

{"sourceFiles":286,"apiHandlers":12,"serverActions":85,"models":38,"findManyCalls":62,"readsWithoutExplicitTake":48}

## API handlers

| Source | Function | Direct boundary calls |
|---|---|---|
| apps/admin/app/api/auth/login/route.ts:15 | POST | readLoginInput |
| apps/admin/app/api/auth/logout/route.ts:6 | POST | None directly detected; inspect helpers/token validation |
| apps/admin/app/api/auth/me/route.ts:5 | GET | getCurrentUser |
| apps/admin/app/api/calendar/feed/route.ts:22 | GET | getCurrentUser |
| apps/admin/app/api/documents/[id]/pdf/route.ts:15 | GET | getCurrentUser |
| apps/admin/app/api/files/[folder]/[name]/route.ts:8 | GET | getCurrentUser, requireAttachmentAccess |
| apps/admin/app/api/upload/route.ts:13 | POST | getCurrentUser, requireAttachmentAccess |
| apps/web/app/api/inquiry/route.ts:25 | POST | readSubmission |
| apps/web/app/api/preview/route.ts:3 | GET | None directly detected; inspect helpers/token validation |
| apps/web/app/api/preview/route.ts:33 | POST | None directly detected; inspect helpers/token validation |
| apps/web/app/api/revalidate/route.ts:4 | POST | None directly detected; inspect helpers/token validation |
| apps/web/app/api/reviews/route.ts:9 | POST | readSubmission |

## Server actions

| Source | Function | Direct boundary calls |
|---|---|---|
| apps/admin/app/actions/attachments.ts:13 | createAttachmentAction | requireAttachmentAccess |
| apps/admin/app/actions/attachments.ts:47 | deleteAttachmentAction | requireAttachmentAccess |
| apps/admin/app/actions/calendar.ts:11 | createCalendarEventAction | requirePermission |
| apps/admin/app/actions/calendar.ts:45 | deleteCalendarEventAction | requirePermission |
| apps/admin/app/actions/cms.ts:25 | toggleBannerStatusAction | requirePermission |
| apps/admin/app/actions/cms.ts:43 | deleteBannerAction | requirePermission |
| apps/admin/app/actions/cms.ts:59 | createBannerAction | requirePermission |
| apps/admin/app/actions/cms.ts:93 | deleteClientLogoAction | requirePermission |
| apps/admin/app/actions/cms.ts:109 | createClientLogoAction | requirePermission |
| apps/admin/app/actions/cms.ts:134 | deleteEquipmentAction | requirePermission |
| apps/admin/app/actions/cms.ts:150 | createEquipmentAction | requirePermission |
| apps/admin/app/actions/cms.ts:175 | togglePortfolioFeaturedAction | requirePermission |
| apps/admin/app/actions/cms.ts:196 | deletePortfolioItemAction | requirePermission |
| apps/admin/app/actions/cms.ts:213 | createPortfolioItemAction | requirePermission |
| apps/admin/app/actions/cms.ts:262 | createReviewAction | requirePermission |
| apps/admin/app/actions/cms.ts:270 | updateReviewAction | requirePermission |
| apps/admin/app/actions/cms.ts:278 | toggleReviewApprovalAction | requirePermission |
| apps/admin/app/actions/cms.ts:289 | deleteReviewAction | requirePermission |
| apps/admin/app/actions/cms.ts:297 | createFaqAction | requirePermission |
| apps/admin/app/actions/cms.ts:305 | updateFaqAction | requirePermission |
| apps/admin/app/actions/cms.ts:313 | deleteFaqAction | requirePermission |
| apps/admin/app/actions/cms.ts:321 | createStatisticAction | requirePermission |
| apps/admin/app/actions/cms.ts:329 | updateStatisticAction | requirePermission |
| apps/admin/app/actions/cms.ts:337 | deleteStatisticAction | requirePermission |
| apps/admin/app/actions/cms.ts:396 | updateBannerContentAction | requirePermission |
| apps/admin/app/actions/cms.ts:413 | updatePortfolioContentAction | requirePermission |
| apps/admin/app/actions/crm.ts:24 | updateDealStageAction | requirePermission |
| apps/admin/app/actions/crm.ts:45 | createCRMDealAction | requirePermission |
| apps/admin/app/actions/crm.ts:70 | updateDealAction | requirePermission |
| apps/admin/app/actions/crm.ts:89 | createContactAction | requirePermission |
| apps/admin/app/actions/crm.ts:113 | updateContactAction | requirePermission |
| apps/admin/app/actions/crm.ts:131 | deleteContactAction | requirePermission |
| apps/admin/app/actions/crm.ts:146 | lookupClientAction | requirePermission |
| apps/admin/app/actions/crm.ts:152 | searchContactsAction | requirePermission |
| apps/admin/app/actions/crm.ts:158 | globalSearchAction | requireAuth |
| apps/admin/app/actions/crm.ts:184 | updateInquiryStatusAction | requireInquiryAccess |
| apps/admin/app/actions/crm.ts:224 | deleteInquiryAction | requireInquiryAccess |
| apps/admin/app/actions/crm.ts:240 | convertInquiryToClientAction | requireInquiryAccess, requirePermission, requirePermission |
| apps/admin/app/actions/crm.ts:381 | manageInquiryAction | requireInquiryAccess |
| apps/admin/app/actions/documents.ts:13 | createCompanyDocumentAction | requirePermission |
| apps/admin/app/actions/documents.ts:43 | deleteCompanyDocumentAction | requirePermission |
| apps/admin/app/actions/finance.ts:17 | createExpenseAction | requirePermission |
| apps/admin/app/actions/finance.ts:44 | deleteExpenseAction | requirePermission |
| apps/admin/app/actions/finance.ts:61 | createPaymentAction | requirePermission |
| apps/admin/app/actions/finance.ts:103 | createInvoiceAction | requirePermission |
| apps/admin/app/actions/finance.ts:142 | updateInvoiceAction | requirePermission |
| apps/admin/app/actions/finance.ts:182 | voidInvoiceAction | requirePermission |
| apps/admin/app/actions/finance.ts:201 | getUnpaidInvoicesByClientAction | requirePermission |
| apps/admin/app/actions/mom.ts:17 | createMomAction | requirePermission, getCurrentUser |
| apps/admin/app/actions/mom.ts:56 | updateMomAction | requirePermission |
| apps/admin/app/actions/mom.ts:111 | deleteMomAction | requirePermission |
| apps/admin/app/actions/mom.ts:128 | approveAndSignMomAction | requirePermission |
| apps/admin/app/actions/mom.ts:149 | shareMomViaEmailAction | requirePermission |
| apps/admin/app/actions/notifications.ts:12 | getNotificationsAction | requireAuth |
| apps/admin/app/actions/notifications.ts:17 | markNotificationReadAction | requireAuth |
| apps/admin/app/actions/notifications.ts:26 | markAllNotificationsReadAction | requireAuth |
| apps/admin/app/actions/requests.ts:14 | assignRequestAction | requirePermission, getCurrentUser |
| apps/admin/app/actions/requests.ts:41 | reassignRequestAction | requirePermission, getCurrentUser |
| apps/admin/app/actions/requests.ts:68 | returnRequestAction | requirePermission, getCurrentUser |
| apps/admin/app/actions/requests.ts:91 | approveRequestAction | requirePermission, getCurrentUser |
| apps/admin/app/actions/requests.ts:114 | confirmRequestAction | requirePermission, getCurrentUser |
| apps/admin/app/actions/requests.ts:137 | resolveRequestAction | requirePermission, getCurrentUser |
| apps/admin/app/actions/roles.ts:7 | upsertRoleAction | requirePermission |
| apps/admin/app/actions/roles.ts:94 | deleteRoleAction | requirePermission |
| apps/admin/app/actions/services.ts:14 | createServiceAction | requirePermission |
| apps/admin/app/actions/services.ts:42 | updateServiceAction | requirePermission |
| apps/admin/app/actions/services.ts:73 | deleteServiceAction | requirePermission |
| apps/admin/app/actions/settings.ts:13 | updateCompanySettingsAction | requirePermission |
| apps/admin/app/actions/settings.ts:32 | saveCompanyAssetAction | requirePermission |
| apps/admin/app/actions/settings.ts:72 | deleteCompanyAssetAction | requirePermission |
| apps/admin/app/actions/settings.ts:104 | toggleFeatureAction | requirePermission |
| apps/admin/app/actions/settings.ts:112 | updateWebSettingsAction | requirePermission |
| apps/admin/app/actions/settings.ts:136 | revalidateEntireSiteAction | requirePermission |
| apps/admin/app/actions/settings.ts:148 | createSocialLinkAction | requirePermission |
| apps/admin/app/actions/settings.ts:158 | updateSocialLinkAction | requirePermission |
| apps/admin/app/actions/settings.ts:168 | deleteSocialLinkAction | requirePermission |
| apps/admin/app/actions/users.ts:51 | createUserAction | requirePermission |
| apps/admin/app/actions/users.ts:95 | updateUserRoleAction | requirePermission |
| apps/admin/app/actions/users.ts:113 | updateUserAction | requirePermission |
| apps/admin/app/actions/users.ts:164 | deleteUserAction | requirePermission |
| apps/admin/app/actions/website.ts:12 | saveWebsiteDraftAction | requirePermission |
| apps/admin/app/actions/website.ts:40 | publishWebsiteAction | requirePermission |
| apps/admin/app/actions/website.ts:97 | restoreWebsiteAction | requirePermission |
| apps/admin/app/actions/website.ts:152 | previewWebsiteAction | requirePermission |
| apps/admin/app/actions/website.ts:166 | updateWebsiteServiceAction | requirePermission |

## Reads without an explicit take

Some CMS collections are intentionally complete. Transaction/select projections and pagination at callers require manual review. Never add silent limits that hide records.

- apps/admin/app/dashboard/cms/website/page.tsx:10 — db.service.findMany
- apps/admin/app/dashboard/crm/deals/[id]/edit/page.tsx:21 — db.user.findMany
- apps/admin/app/dashboard/requests/page.tsx:25 — db.user.findMany
- apps/admin/app/dashboard/settings/roles/page.tsx:12 — db.role.findMany
- apps/admin/app/dashboard/settings/roles/page.tsx:19 — db.permission.findMany
- apps/admin/app/dashboard/users/new/page.tsx:12 — db.role.findMany
- apps/admin/app/dashboard/users/page.tsx:12 — db.role.findMany
- apps/admin/app/dashboard/users/page.tsx:16 — db.permission.findMany
- packages/database/src/queries/attachments.ts:11 — db.attachment.findMany
- packages/database/src/queries/attachments.ts:35 — db.crmContact.findMany
- packages/database/src/queries/attachments.ts:41 — db.invoice.findMany
- packages/database/src/queries/attachments.ts:47 — db.crmDeal.findMany
- packages/database/src/queries/attachments.ts:53 — db.payment.findMany
- packages/database/src/queries/banners.ts:25 — db.heroBanner.findMany
- packages/database/src/queries/banners.ts:38 — db.heroBanner.findMany
- packages/database/src/queries/clients.ts:18 — db.clientLogo.findMany
- packages/database/src/queries/clients.ts:31 — db.clientLogo.findMany
- packages/database/src/queries/company-assets.ts:29 — db.companyAsset.findMany
- packages/database/src/queries/company-documents.ts:35 — db.companyDocument.findMany
- packages/database/src/queries/crm.ts:51 — db.crmContact.findMany
- packages/database/src/queries/crm.ts:127 — db.inquiry.findMany
- packages/database/src/queries/crm.ts:140 — db.crmDeal.findMany
- packages/database/src/queries/crm.ts:147 — db.invoice.findMany
- packages/database/src/queries/crm.ts:159 — db.payment.findMany
- packages/database/src/queries/crm.ts:170 — db.contract.findMany
- packages/database/src/queries/crm.ts:177 — db.attachment.findMany
- packages/database/src/queries/crm.ts:484 — db.crmDeal.findMany
- packages/database/src/queries/equipment.ts:24 — db.studioEquipment.findMany
- packages/database/src/queries/expenses.ts:37 — db.expenseCategory.findMany
- packages/database/src/queries/expenses.ts:68 — db.expense.findMany
- packages/database/src/queries/faqs.ts:5 — db.faq.findMany
- packages/database/src/queries/features.ts:4 — db.featureToggle.findMany
- packages/database/src/queries/invoices.ts:124 — db.invoice.findMany
- packages/database/src/queries/invoices.ts:147 — db.invoice.findMany
- packages/database/src/queries/moms.ts:66 — db.minuteOfMeeting.findMany
- packages/database/src/queries/payments.ts:126 — db.attachment.findMany
- packages/database/src/queries/payments.ts:174 — db.attachment.findMany
- packages/database/src/queries/permissions.ts:241 — db.permission.findMany
- packages/database/src/queries/permissions.ts:329 — db.permission.findMany
- packages/database/src/queries/portfolio.ts:40 — db.portfolioCategory.findMany
- packages/database/src/queries/portfolio.ts:123 — db.portfolioItem.findMany
- packages/database/src/queries/reviews.ts:5 — db.review.findMany
- packages/database/src/queries/services.ts:44 — db.service.findMany
- packages/database/src/queries/sessions.ts:110 — db.session.findMany
- packages/database/src/queries/social-links.ts:19 — db.socialLink.findMany
- packages/database/src/queries/stats.ts:5 — db.statistic.findMany
- packages/database/src/queries/users.ts:27 — db.user.findMany
- packages/database/src/queries/website.ts:15 — db.service.findMany
