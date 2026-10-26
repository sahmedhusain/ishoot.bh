# Admin polish and integration completion

Started 2026-10-26 (Asia/Bahrain), baseline `6b3612c`. This is the execution plan and evidence log. No implementation preceded this plan. Existing design, permission boundaries, encrypted credentials, generated action schemas and locale architecture remain the foundations.

## Evidence and completion rules

- Read: Platform v2 progress log, FEATURES, ARCHITECTURE, API_REFERENCE, shared route catalogue and Sidebar. There are **154 dashboard route templates**; the inventory below follows their local component imports.
- Required preflight: `./run.sh db migrate` passed against local Supabase: 83 migrations, none pending. Initial sandbox attempt failed; the same command passed with local-service access.
- Browser work uses a separate `admin_polish_20261026_test` disposable database, seeded with the existing test-only Super Admin and driver accounts. Never reset the business database.
- Every route needs eight desktop combinations: Super Admin/driver × EN/AR × light/dark, plus mobile width, keyboard and reduced motion. Open all tabs/sub-tabs and non-mutating drawers/menus; exercise destructive actions only on disposable fixtures. Record inaccessible role states as expected denial, not a page pass. A route visit alone does not verify its interactions.
- Source inventories below are findings/candidates, **not completed visual checks**. `Pending` means unverified. Keep the evidence distinction when updating this file.
- Implement sequentially, one commit per group; do not push or merge. Each group records changed pages, confirmations, focused tests and remaining gaps. No external messages or real payments during audit.

## Priorities and root causes

| ID | Priority | Finding and evidence | Complete when |
|---|---|---|---|
| A01 | P1 | Demo volume seed creates 1,089 synthetic social metrics; analytics reads metrics even for disconnected providers (`company/seed/seed-volume.ts:710`, `queries/social-analytics.ts`). | Seeds create no analytics; only attributable provider readings appear; disconnected state has Connect action; existing unknown-provenance history is handled without deleting genuine data. |
| A02 | P1 | Missing provider metrics are coerced to zero (`integrations/providers.ts:n`, sync post defaults); counts can falsely imply measured zero. | Unknown is nullable throughout ingestion/storage/queries/UI and old defaults are not relabelled as measured values. |
| A03 | P1 | LinkedIn version `202405` is sunset; current official versioning page identifies `202609`. | Supported version pinned and outgoing headers regression-tested; actual account check remains credential-gated. |
| A04 | P1 | Shared confirmation allows Esc/backdrop/header dismissal during submission; typed field lacks connected label; async errors can escape click handlers. | Shared confirm keeps pending action visible, announces errors/loading, prevents double submission, labels typed input; e2e keyboard/focus/RTL/mobile/reduced-motion coverage. |
| A05 | P1 | Native confirmations guard stock posting, refunds/order changes, cancellations, broadcasts, account/calendar disconnection and deletion. Other irreversible calls may have none. | Replace listed natives using the shared design; inspect every mutation call for missing confirmation; typed name for destructive bulk/restore/key operations. |
| A06 | P1 | Integration unlink swallows failure in `run`, then closes and locally shows disabled. | Failed unlink stays actionable and does not falsely indicate success. |
| A07 | P2 | Social analytics counts recent-post cumulative counters as period performance; latest 20–25 posts fetched without pagination; missing dates fall back to now. | Clearly label published-in-period snapshots, skip invalid dates, paginate within provider limits, preserve snapshot history; do not claim period insight totals. |
| A08 | P2 | Meta optional Instagram shares Page connection state; filters do not restrict follower totals; zero followers used as a no-data signal. | Account-specific connection/data status, consistent filter scope, true measured zero distinguished from missing data. |
| A09 | P2 | Native prompts/alerts and independent overlay shells listed below; shared modal already exists. | Extend existing Modal/ConfirmDestructiveModal (canonical ConfirmDialog export), migrate all candidates; keep custom form bodies. |
| A10 | P2 | Numerous fields omit expected-format guidance; label/error association needs element-level review. | Review field candidates below; use localised useful placeholders/help/inline validation, preserve native select/date semantics. |
| A11 | P2 | Provider cards link to docs but lack complete in-app step guides with derived callback URLs. | EN/AR steps, copy buttons, permissions, sandbox/live, common errors and a lightweight real health check for each supported provider; mirror in INTEGRATIONS.md. |
| A12 | P2 | No general webhook automation/public API, several requested provider families absent. | Implement and verify each explicitly requested family, or retain an explicit open credential/app-review dependency; do not label missing implementations complete. |
| A13 | P3 | Page states, table/filter/pagination patterns, skeleton shapes, modal mobile layout, toasts and RTL alignment require full browser review. | Every matrix cell and interaction records outcome; shared primitives used consistently without redesign. |

## Ordered implementation groups

Each checkbox is an acceptance criterion. Broad groups are delivered as small provider/page-family commits, never one enormous change. Run focused tests then the full gates before each group is marked complete.

### G0 — audit plan and coverage (this document)
- [x] Preflight migrations and source route/component/action/overlay/field inventories.
- [ ] Browser inventory for every route, tab, drawer, dropdown and toast in all requested combinations, including narrow-role denial paths.
- [ ] Record screenshots or test artifacts for every observed defect and link it to a priority above.
Verification: reconcile route inventory with filesystem and sidebar, inspect matrix output. Dependencies: none. Scope: docs and audit spec.

### G1 — shared dialog foundation (P1, A04)
- [x] Extend existing Modal with description/footer/pending support, mobile sheet and existing motion tokens; preserve callers.
- [x] Extend existing confirmation, export ConfirmDialog without a second implementation; typed label, loading, errors, focus trap/restore, Esc, nested overlays, RTL and reduced motion.
- [x] E2E uses a real destructive fixture and verifies cancel, typed mismatch, pending, failure and focus return.
Files: packages/ui modal and confirm, UI copy locales, e2e. Dependencies: G0 plan. Medium scope.

### G2 — replace native confirmation by page family (P1/P2, A05/A09)
- [ ] Commerce: products/categories, counts, requisitions/RFQ/PO/bills, orders/refunds, shipments/route sheets.
- [ ] Governance: dashboard reset, departments/pipeline, services, calendar token rotate/disconnect, users/roles/bulk changes, website publish/unpublish/restore.
- [ ] People/content: handovers/settlements/supports/GOSI/quotations, articles/pages, broadcasts and rich editor prompts/alerts.
Verification: no native dialogs in admin source, cancel leaves DB unchanged, confirm executes once; existing lifecycle specs pass. Dependencies: G1. One commit per family.

### G3 — remaining overlay shells and unsaved forms (P2)
- [ ] Convert standalone forms/dialog overlays enumerated below to Modal; preserve validation, layout, signatures and error handling.
- [ ] Guard long editors, settings and integration credential forms on dismiss/navigation/reload; saved state clears guard. No secret values in guard output.
Verification: keyboard/focus/scroll checks and dirty vs saved navigation. Dependencies: G1; per-family commits, 3–5 files each.

### G4 — real-only social ingestion/storage (P1/P2, A01–A03/A07)
- [ ] Remove synthetic seed generation; add provider provenance and nullable unsupported counters with a forward migration, preserving real existing history.
- [ ] Validate real response fields, supported versions, dates and paging; prevent secrets leaking in provider errors. Store account/post snapshots with fetch timestamps.
- [ ] Regression checks for missing vs measured zero, hidden subscriber counts, auth errors, rate limits, malformed response/date, partial failure and repeat sync.
Verification: provider unit fixtures and disposable DB tests; no credential or endpoint success claims from mocks. Dependencies: G0 plan. Separate schema/ingestion/provider commits as needed.

### G5 — truthful analytics UI (P1/P2, A01/A08)
- [ ] Disconnected/connected-empty/unavailable/stale/reconnect states with appropriate Connect action; no numeric KPI for unavailable metrics.
- [ ] Filters apply to all totals and accounts; last updated/cache/manual refresh; honest range/timezone semantics and partial-data warning.
- [ ] E2E disconnected state in EN/AR, light/dark and mobile, with old synthetic/unattributed rows present to catch regressions.
Verification: social query unit tests + browser assertions. Dependencies: G4.

### G6 — settings reliability and setup guides (P1/P2, A06/A11)
- [ ] Fix failed disconnect state; validate/label fields and protect unsaved credentials.
- [ ] Localised setup sections and company-origin callback/webhook copy buttons; lightweight real connection checks with safe provider errors.
- [ ] Mirror support/limits and setup in docs/INTEGRATIONS.md. Check every implemented adapter against current official documentation.
Verification: unit request contracts, copy/brand, health-check e2e with stand-ins; sandbox runs separately recorded. Dependencies: G1, provider research. Per-provider/family commits.

### G7 — missing integrations (P2, A12)
- [ ] Payment and courier gaps from table below; implement hosted payment/signature/refund contract and courier contract with sandbox tests.
- [ ] Social/ads/communications gaps; no unsupported metrics or fake connection successes.
- [ ] Signed outgoing webhook outbox/retries, verified inbound delivery/idempotency, scoped API keys; automation, calendars, notifications, accounting/storage and bot protection.
Verification: provider-specific sandbox evidence, signature/replay/scope/SSRF tests; user credentials/app review remain explicitly pending. Dependencies: official provider contracts and existing interfaces; split each vertical provider slice into its own commit.

### G8 — page form/design polish (P2/P3, A10/A13)
- [ ] Complete the field list per page: localised labels/formats, help, inline errors, empty/loading/error states.
- [ ] Consolidate existing table/filter/pagination/status/toast/skeleton patterns; fix mobile overflow and RTL using current design.
Verification: full browser matrix + copy, brand and type/lint gates. Dependencies: G2/G3; one page-family commit each.

### G9 — final verification/report
- [ ] `pnpm type-check`, `pnpm lint`, `pnpm test`, `pnpm test:copy`, `pnpm test:brand`, `pnpm test:action-schemas`, `pnpm audit:unused` all green.
- [ ] Required confirmation and disconnected-analytics e2e plus affected lifecycle/provider tests green; full route interaction matrix complete.
- [ ] Report per-page fixes, every modal/confirmation replacement, provider status table and exact credential/app-review blockers. No push/merge.
Dependencies: all groups. Never equate unrun checks, fixture tests or documentation with sandbox validation.

## Integration inventory at baseline

`IntegrationSetting` holds encrypted credentials, active/health/account/error/check/sync fields and JSON config. Provider catalogue has 19 entries. Social adapters cover six platforms, public counters only; payments have seven hosted adapters, couriers three. Existing payments/couriers have unit fixtures but external sandbox acceptance is unverified. `docs/INTEGRATIONS.md` did not exist at baseline.

Status: **partial** = code exists but requested capabilities/verification incomplete; **missing** = no implementation found; **existing** = existing local flow (still needs runtime audit). Credentials below are types, never actual values. Priorities indicate implementation order, not a claim that every absent optional service breaks the app.

| Integration | Baseline status/use | Credentials | Sandbox / webhook requirement | Priority |
|---|---|---|---|---|
| Stripe, Apple Pay / Google Pay via Stripe | Partial: hosted checkout, refunds, health, verified events | secretKey, webhookSecret; wallet/domain activation | Test keys; signed payment events; local stand-in only verified previously | P1 |
| Tap / BenefitPay via Tap | Partial: hosted charges, refund/health | secretKey; merchant-enabled methods | Test merchant; verify charge hash/reconcile | P1 |
| PayPal | Partial: orders/capture/refund/health | environment, clientId/secret, webhookId | Sandbox account; webhook signature verification API | P1 |
| Checkout.com | Partial: hosted checkout | environment, secretKey, processingChannelId, billingCountry, webhookSecret | Sandbox merchant; HMAC webhook | P1 |
| PayTabs | Partial: regional HPP | region, profileId, serverKey | Test merchant; signed callback | P1 |
| Moyasar | Partial: invoices/refund | secretKey, webhookSecret | Test keys; webhook verification | P1 |
| HyperPay | Partial: COPYandPAY | environment, entityId, accessToken, brands, webhookKey | Test merchant; authenticated encrypted events | P1 |
| Benefit Gateway direct | Missing; separate from Tap method | bank-issued merchant/test credentials | Bank onboarding and callback specification | P2 |
| Tabby | Missing BNPL | public/secret keys, merchant code | Sandbox merchant, callback verification | P2 |
| Tamara | Missing BNPL | API/notification tokens | Sandbox merchant, signed notifications | P2 |
| Apple Pay direct | Missing direct wallet | merchant ID, certificates, verified domain | Apple sandbox; merchant validation, gateway settlement | P2 |
| Cash on delivery | Existing order/fleet/agency reconciliation | none | Disposable order/settlement fixtures | P1 audit |
| Bank transfer | Existing order payment and receipt upload | bank account in company settings | Private receipt access; no provider webhook | P1 audit |
| Payment links | Existing signed hosted-payment flow | chosen gateway credentials | Gateway webhook as above | P1 audit |
| Aramex | Partial booking/label/tracking | environment, username/password, account number/PIN/entity/country | Test account; poll tracking | P1 |
| DHL Express | Partial booking/label/tracking | environment, API key/secret, account number | MyDHL test account; poll tracking | P1 |
| SMSA | Partial booking/label/tracking | environment, API key | Provider test account; poll tracking | P1 |
| FedEx | Missing | OAuth app/client/account | Sandbox OAuth and tracking subscription | P2 |
| UPS | Missing | OAuth app/client/account | CIE sandbox, tracking callbacks if enabled | P2 |
| Local couriers/manual | Existing manual agency records | none | Internal booking/tracking only | P2 audit |
| Generic webhook courier | Missing | endpoint and signing secret | Signed events, retry/idempotency | P2 |
| Instagram / Facebook Pages (Meta) | Partial public counters/posts; no full insights | pageId, optional instagramAccountId, accessToken | App roles/test users; approved permissions; token expiry; insights permissions | P1 |
| TikTok | Partial Display API counters/posts | accessToken; refresh/app credentials missing | Login Kit/Display approval, user.info.basic/stats + video.list | P1 |
| X | Partial public account/post metrics | username, bearerToken | Developer credits/access tier; no automatic refresh for app bearer | P1 |
| LinkedIn | Partial organization follower count; obsolete API version | organizationId, accessToken | Community Management access; token lifetime/permissions | P1 |
| YouTube | Partial public counts/posts; no owner Analytics API | channelId, apiKey; OAuth missing for insights | Restricted API key; OAuth test users for Analytics | P1 |
| Snapchat | Missing | approved OAuth app/org | Marketing/Public Profile access and test org | P2 |
| WhatsApp Cloud API | Partial text send and test number field | phoneId, optional businessId, token | Meta test phone; approved templates for outbound business chats; verify webhook token/signature | P1 |
| Google Business Profile | Missing | OAuth app/location scopes | API access approval/test locations; notifications | P2 |
| Meta Pixel | Existing website tracking setting; audit consent/events | pixel ID; CAPI token if server events added | Events Manager test events | P2 |
| GA4 | Existing website tag; no reporting integration | measurement ID; OAuth/service credentials for reports | GA4 test property, Data API quotas | P2 |
| GTM | Missing dedicated integration | container ID / OAuth if managing | Preview workspace; no webhook for snippet | P2 |
| TikTok Pixel | Existing website tracking setting | pixel ID | Events Manager test events | P2 |
| Google Ads / Meta Ads | Missing reporting adapters | OAuth/developer token/customer ID; Meta ad-account/token | Test accounts; app review/access tiers | P2 |
| SMTP | Missing transport | host/port/user/password/TLS/from | Local SMTP sink | P2 |
| Resend | Partial real outbox, domains health, verified inbound delivery webhook | apiKey, fromEmail, signing secret | Verified test domain; Svix signature | P1 |
| SendGrid / Mailgun | Missing | API key, sender/domain, webhook secret | Test domain/sandbox; event verification | P2 |
| Twilio / local SMS | Missing | account ID/token or API key/sender | Test credentials/provider sandbox; verified delivery callbacks | P2 |
| Push notifications | Missing | VAPID keys/subscriptions | Browser permission + test subscription | P2 |
| Signed outgoing webhooks/retries | Missing general-purpose adapter; email/revalidation outboxes reusable | destination, signing secret | Local receiver with replay/idempotency fixtures | P2 |
| Incoming webhooks | Only Resend and payment routes exist | per-provider verification credentials | General incoming automation missing | P2 |
| Zapier / Make / n8n | Missing public webhook/API integration | scoped API keys, webhook signing | Local receivers; no blanket admin access | P2 |
| Google Sheets | Missing | OAuth app/tokens or service account | Test spreadsheet; quotas | P2 |
| Google Calendar / Outlook | Partial read-only ICS subscription, no two-way sync | revocable feed token; OAuth missing | Read-only calendar URL; OAuth required for writes | P2 |
| Slack / Microsoft Teams | Missing notifications | app token/webhook URL | Test workspace/tenant; signed inbound callbacks if added | P2 |
| Zoho Books / QuickBooks / Xero | Missing accounting sync | OAuth app/company/tenant tokens | Test organization/sandbox; signed events and financial reconciliation | P2 |
| Google Drive / Dropbox | Missing provider storage; local/Supabase uploads already exist | OAuth app/tokens | Test folder, signed change notifications | P2 |
| reCAPTCHA / Turnstile | Missing public-form verification | site key/secret | Provider test keys; server-side token verification | P1 public forms audit |

## Official API research log

Research is endpoint-specific. For every kept adapter record auth, expiration/refresh, exact request/response fields, quota, events/signature, live/test URLs and review/scopes. **Open** means these have not yet been verified from current official docs; do not infer correctness from the v2 progress log.

- LinkedIn versioning: [official versioning](https://learn.microsoft.com/en-us/linkedin/marketing/versioning), inspected 2026-10-26: latest documented `202609`, monthly versions supported at least one year; `202405` is obsolete. Organization/network-size contract and scopes still require review.
- TikTok: [official scopes](https://developers.tiktok.com/docs/en/tiktok-api-scopes), [Display setup](https://developers.tiktok.com/docs/en/display-api-get-started): counters require `user.info.stats`, videos `video.list`; access token response includes expires_in/refresh lifetime. Current code stores only manually supplied access token; refresh support is open.
- YouTube: [channels.list](https://developers.google.com/youtube/data/reference/rest/v3/channels/list): one quota unit; subscriber counts can be hidden/rounded. Current implementation treats missing count as zero. Owner insights need a separate OAuth Analytics API.
- Meta, X, WhatsApp, Resend, sign-in, seven gateways, three couriers: endpoint-by-endpoint review **open**. All missing integrations: documentation/contracts **open** before implementation.

## Execution log

- G1: extended the existing Modal/confirmation implementation; renamed all repository callers to canonical `ConfirmDialog` (no duplicate implementation/export), moved shared UI copy into packages/locales, fixed the i18n checker path. Mobile sheets respect max-width and reduced motion. Nested dialogs trap/restore focus and preserve scroll lock; pending confirmations resist Esc/backdrop/header dismissal, and errors stay visible. Integration disconnect requires the provider name and preserves state on failure. Three focused e2e tests passed (desktop/mobile, labels, typed match, cancel, focus return/trap, reduced motion, pending/failure). Fresh pnpm layout exposed ESLint plugin lookup; FlatCompat now resolves Next plugins from the installed Next config. Validation: type-check, lint, 136 unit/static tests, copy, brand, action schemas and knip passed. pnpm 12 auto dependency verification was disabled only on check invocations after the locked install (`--config.verify-deps-before-run=never`); no project configuration changed.

- 2026-10-26: created plan before source changes, inventoried 154 route templates, recorded native dialogs/overlay candidates and fields. Migration preflight passed. Isolated audit database prepared. No browser matrix cell yet marked complete.

## Route inventory (source evidence)

154 route templates discovered from `apps/admin/app/dashboard/**/page.tsx`. Shared component imports are followed recursively. Entries are code inventory, not claims that browser states passed. Dynamic records, tab keys assembled at runtime, dropdown options and toasts require the browser matrix below.

| Route | Owning components | Explicit tab switches | Actions called | Dialogs/pickers | Fields | Runtime matrix |
|---|---|---|---|---|---|---|
| `/dashboard/analytics` | `PlatformPicker`, `SocialAnalyticsView` | — | `deleteSocialPlanAction`, `refreshSocialAnalyticsAction`, `saveSocialPlanAction` | `ConfirmDestructiveModal`, `Modal` | 12 | Pending |
| `/dashboard/announcements/[id]` | `AnnouncementDetailView`, `AnnouncementForm`, `ApprovalDecisionPanel`, `BilingualPdfActions`, `SignatureCanvas` | — | `announcementReceiptAction`, `archiveAnnouncementAction`, `decideApprovalAction`, `saveAnnouncementAction`, `submitAnnouncementAction` | — | 7 | Pending |
| `/dashboard/announcements/new` | `AnnouncementForm`, `ForbiddenView` | — | `saveAnnouncementAction` | — | 6 | Pending |
| `/dashboard/announcements` | `AnnouncementsListView` | — | `communicationSettingsAction` | — | 1 | Pending |
| `/dashboard/approvals/[type]/[id]` | `ApprovalDecisionPanel`, `ApprovalItemView`, `ContentImage`, `SignatureCanvas` | — | `decideApprovalAction` | — | 1 | Pending |
| `/dashboard/approvals` | `ApprovalsCenterView` | — | — | — | 2 | Pending |
| `/dashboard/archive` | `BilingualPdfActions`, `CompanyArchiveView`, `ForbiddenView`, `LinkOrUploadField` | — | `createAttachmentAction`, `deleteAttachmentAction` | `ConfirmDestructiveModal` | 11 | Pending |
| `/dashboard/assets/[id]` | `AssetDetailView`, `AssetForm`, `AssetsListView`, `HandoverForm`, `SignatureCanvas` | — | `getSignatureModeAction`, `saveAssetAction`, `startAssetHandoverAction` | — | 37 | Pending |
| `/dashboard/assets/categories` | `AssetCategoriesView` | — | `saveAssetCategoryAction` | — | 9 | Pending |
| `/dashboard/assets/handovers/[id]` | `ApprovalDecisionPanel`, `BilingualPdfActions`, `ContentImage`, `ForbiddenView`, `HandoverDetailView`, `HandoverSigningLinkPanel`, `SignatureCanvas` | — | `cancelAssetHandoverAction`, `createHandoverSigningLinkAction`, `decideApprovalAction`, `openMyHandoverSigningPageAction`, `revokeHandoverSigningLinkAction`, `signAssetHandoverInPersonAction` | — | 4 | Pending |
| `/dashboard/assets/new` | `AssetForm`, `NewAssetView` | — | `saveAssetAction` | — | 17 | Pending |
| `/dashboard/assets` | `AssetsListView` | — | — | — | 6 | Pending |
| `/dashboard/calendar` | `EntityLookup`, `OdooCalendarView` | — | `createCalendarEventAction`, `deleteCalendarEventAction`, `updateCalendarEventAction` | `ConfirmDestructiveModal`, `Modal` | 11 | Pending |
| `/dashboard/claims/new` | `EntityLookup`, `LinkOrUploadField`, `NewClaimFormView` | — | `submitExpenseClaimAction` | — | 13 | Pending |
| `/dashboard/claims` | `ClaimsView` | — | `cancelExpenseClaimAction`, `payExpenseClaimAction`, `scheduleExpenseClaimAction` | — | 4 | Pending |
| `/dashboard/cms/articles/[id]` | `ArticleEditorView`, `AssetUrlInput`, `ContentImage`, `LanguageFields`, `RichTextEditor` | — | `deleteCmsArticleAction`, `previewWebsiteAction`, `saveCmsArticleAction` | — | 12 | Pending |
| `/dashboard/cms/articles` | `ArticlesListView`, `UnpublishedChangesNotice` | — | — | — | 3 | Pending |
| `/dashboard/cms/banners` | `AssetUrlInput`, `BannersManagementView`, `ContentImage`, `LanguageFields`, `UnpublishedChangesNotice`, `WebsitePublicationNotice` | — | `createBannerAction`, `deleteBannerAction`, `toggleBannerStatusAction`, `updateBannerContentAction` | `ConfirmDestructiveModal`, `Modal` | 8 | Pending |
| `/dashboard/cms/clients` | `AssetUrlInput`, `ClientsManagementView`, `ContentImage`, `UnpublishedChangesNotice`, `WebsitePublicationNotice` | — | `createClientLogoAction`, `deleteClientLogoAction`, `updateClientLogoAction` | `ConfirmDestructiveModal`, `Modal` | 4 | Pending |
| `/dashboard/cms/code` | `LanguageFields`, `SiteCodeView` | — | `saveWebsiteCodeAction` | — | 4 | Pending |
| `/dashboard/cms/equipment` | `EquipmentManagementView` | — | `createEquipmentAction`, `deleteEquipmentAction`, `updateEquipmentAction` | `ConfirmDestructiveModal`, `Modal` | 6 | Pending |
| `/dashboard/cms/faqs` | `FaqsManagementView`, `LanguageFields`, `UnpublishedChangesNotice`, `WebsitePublicationNotice` | — | `createFaqAction`, `deleteFaqAction`, `updateFaqAction` | `ConfirmDestructiveModal`, `Modal` | 4 | Pending |
| `/dashboard/cms/menus` | `LanguageFields`, `MenusEditorView` | — | `saveWebsiteMenusAction` | — | 6 | Pending |
| `/dashboard/cms/pages/[id]` | `AssetUrlInput`, `ContentImage`, `LanguageFields`, `PageEditorView`, `RichTextEditor` | — | `previewWebsiteAction`, `saveCmsPageAction` | — | 16 | Pending |
| `/dashboard/cms/pages` | `PagesListView`, `UnpublishedChangesNotice` | — | `deleteCmsPageAction`, `duplicateCmsPageAction`, `updateCmsPagesListAction` | — | 1 | Pending |
| `/dashboard/cms/portfolio` | `AssetUrlInput`, `ContentImage`, `LanguageFields`, `PortfolioManagementView`, `UnpublishedChangesNotice`, `WebsitePublicationNotice` | — | `createPortfolioItemAction`, `deletePortfolioItemAction`, `togglePortfolioFeaturedAction`, `updatePortfolioContentAction` | `ConfirmDestructiveModal`, `Modal` | 17 | Pending |
| `/dashboard/cms/reviews` | `ReviewsManagementView` | — | `deleteReviewAction`, `toggleReviewApprovalAction` | `ConfirmDestructiveModal` | 0 | Pending |
| `/dashboard/cms/stats` | `LanguageFields`, `LazyIconPicker`, `StatsManagementView`, `UnpublishedChangesNotice`, `WebsitePublicationNotice` | — | `createStatisticAction`, `deleteStatisticAction`, `updateStatisticAction` | `ConfirmDestructiveModal`, `IconPicker`, `Modal`, `Picker` | 8 | Pending |
| `/dashboard/cms/website` | `AssetUrlInput`, `ContentImage`, `LanguageFields`, `SampleContentCard`, `UnpublishedChangesNotice`, `WebsiteEditor`, `WebsiteSetupFields` | — | `addSampleContentAction`, `exampleWebsiteAction`, `previewWebsiteAction`, `publishWebsiteAction`, `restoreWebsiteAction`, `saveWebsiteDraftAction`, `updateWebsiteServiceAction` | — | 10 | Pending |
| `/dashboard/company/documents/new` | `LinkOrUploadField`, `NewCompanyDocumentFormView` | — | `createCompanyDocumentAction` | — | 10 | Pending |
| `/dashboard/company/documents` | `CompanyDocumentsClientView` | — | `deleteCompanyDocumentAction` | `ConfirmDestructiveModal` | 0 | Pending |
| `/dashboard/crm/contacts` | `ClientsListView` | — | `deleteContactAction` | `ConfirmDestructiveModal` | 9 | Pending |
| `/dashboard/crm/customers/[id]/edit` | `ClientProfileForm` | — | `createContactAction`, `updateContactAction` | — | 38 | Pending |
| `/dashboard/crm/customers/[id]` | `ClientProfilePanel`, `Customer360DossierView`, `RelatedExpensesPanel`, `RelatedListControls` | — | — | — | 1 | Pending |
| `/dashboard/crm/customers/new` | `ClientProfileForm` | — | `createContactAction`, `updateContactAction` | — | 38 | Pending |
| `/dashboard/crm/deals/[id]/edit` | `DealEditFormView`, `EditConfirmModal`, `EntityLookup` | — | `updateDealAction` | `EditConfirmModal`, `Modal` | 11 | Pending |
| `/dashboard/crm/deals/[id]` | `DealDossierView`, `ListControls`, `RelatedExpensesPanel` | — | — | — | 4 | Pending |
| `/dashboard/crm/deals/new` | `ClientAutocomplete`, `NewDealFormView` | — | `createCRMDealAction`, `createContactAction`, `searchContactsAction` | — | 11 | Pending |
| `/dashboard/crm/deals` | `DealCard`, `KanbanBoard`, `KanbanColumn`, `ListControls` | — | `updateDealStageAction` | — | 4 | Pending |
| `/dashboard/crm/leads` | — | — | — | — | 0 | Pending |
| `/dashboard/delivery/[id]` | `LanguageFields`, `ShipmentPills`, `ShipmentView` | — | `assignShipmentAction`, `handToAgencyAction`, `moveShipmentAction` | — | 11 | Pending |
| `/dashboard/delivery/agencies` | `AgenciesView`, `LanguageFields`, `ShipmentPills` | — | `recordAgencyInvoiceAction`, `saveCourierAgencyAction` | — | 13 | Pending |
| `/dashboard/delivery/cash` | `CashSettlementView`, `LanguageFields` | — | `settleCashAction` | — | 4 | Pending |
| `/dashboard/delivery/fleet` | `FleetView`, `LanguageFields` | — | `saveVehicleAction` | — | 7 | Pending |
| `/dashboard/delivery` | `ShipmentPills`, `ShipmentsListView` | — | — | — | 4 | Pending |
| `/dashboard/delivery/routes/[id]` | `RouteSheetView`, `ShipmentPills` | — | `closeRouteSheetAction`, `startRouteSheetAction` | — | 0 | Pending |
| `/dashboard/delivery/routes` | `LanguageFields`, `RouteSheetsView`, `ShipmentPills` | — | `createRouteSheetAction` | — | 7 | Pending |
| `/dashboard/delivery/settings` | `DeliverySettingsView`, `LanguageFields` | — | `deleteDeliverySlotAction`, `saveDeliverySettingsAction`, `saveDeliverySlotAction`, `saveDeliveryZoneAction` | — | 17 | Pending |
| `/dashboard/department` | `DashboardWidgets`, `DeferredCharts`, `DepartmentDashboardView`, `WorkloadPanels` | — | — | — | 1 | Pending |
| `/dashboard/directory/org` | `ContentImage`, `OrgChartView` | — | — | — | 0 | Pending |
| `/dashboard/directory` | `ContentImage`, `DirectoryView` | — | — | — | 2 | Pending |
| `/dashboard/driver` | `DriverView`, `ShipmentPills`, `SignatureCanvas` | — | `completeDeliveryAction`, `moveShipmentAction` | — | 3 | Pending |
| `/dashboard/expenses/categories` | `ExpenseCategoriesView` | — | `createExpenseCategoryAction`, `deleteExpenseCategoryAction`, `updateExpenseCategoryAction` | — | 8 | Pending |
| `/dashboard/expenses/new` | — | — | — | — | 0 | Pending |
| `/dashboard/expenses` | `ExpensesManagementView`, `ListControls` | — | `deleteExpenseAction` | `ConfirmDestructiveModal` | 4 | Pending |
| `/dashboard/expenses/recurring` | `RecurringExpensesView` | — | `deleteRecurringExpenseAction`, `recordRecurringExpenseAction`, `saveRecurringExpenseAction`, `skipRecurringExpenseAction` | — | 15 | Pending |
| `/dashboard/finance/commissions` | `CommissionsView` | — | `recordCommissionPayoutAction` | — | 1 | Pending |
| `/dashboard/finance` | `DeferredCharts`, `FinancialAnalyticsView` | — | — | — | 0 | Pending |
| `/dashboard/finance/reports` | `FinancialReportDetailView`, `FinancialReportsView` | — | `exportFinancialReportCsvAction` | — | 2 | Pending |
| `/dashboard/hr/attendance` | `AttendanceSheetView` | — | `deleteAttendanceAction`, `markMonthPresentAction`, `saveAttendanceAction` | `Modal` | 6 | Pending |
| `/dashboard/hr/documents` | `NoEmployeeProfile`, `SalaryDocumentsView` | — | `emailSalaryDocumentAction`, `requestSalaryDocumentAction`, `whatsappSalaryDocumentAction` | — | 1 | Pending |
| `/dashboard/hr/employees/[id]` | `AccountSettingsDialog`, `CredentialFields`, `EmployeeAccountCard`, `EmployeeAssetsCard`, `EmployeeAttachments`, `EmployeeDetailView`, `EmployeeHandoversCard`, `EmployeePayHistory`, `EmployeeResidencyPanel`, `HandoversListView`, `LeaveBalancesCard`, `LinkOrUploadField`, `NoEmployeeProfile`, `PayrollSettingsFields`, `RecurringPayPanel`, `SalaryDocumentsView` | — | `addLeaveAdjustmentAction`, `cancelAccountChangeAction`, `createAttachmentAction`, `deleteAttachmentAction`, `deleteEmployeeCredentialAction`, `deleteRecurringPayAction`, `emailSalaryDocumentAction`, `openEmployeeHandoverAction`, `requestSalaryDocumentAction`, `saveAccountSettingsAction`, `saveEmployeeCredentialAction`, `saveRecurringPayAction`, `updateEmployeeAction`, `updateEmployeeIdentityAction`, `whatsappSalaryDocumentAction` | `AccountSettingsDialog`, `Modal` | 64 | Pending |
| `/dashboard/hr/employees/import` | `ImportPeopleView` | — | `importPeopleAction`, `previewPeopleImportAction` | — | 1 | Pending |
| `/dashboard/hr/employees/new` | `CredentialFields`, `LinkOrUploadField`, `NewEmployeeFormView`, `PayrollSettingsFields` | — | `createEmployeeAction` | — | 47 | Pending |
| `/dashboard/hr/employees` | `EmployeesListView`, `ExpiringDocumentsCard` | — | — | — | 3 | Pending |
| `/dashboard/hr/gosi` | `GosiView` | — | `deleteEmployeeGosiRecordAction`, `endGosiComponentAction`, `registerUnregisteredEmployeesAction`, `saveEmployeeGosiRecordAction`, `scheduleGosiComponentAction`, `updateGosiComponentAction`, `updateGosiRulesAction` | — | 26 | Pending |
| `/dashboard/hr/handovers/[id]` | `ApprovalDecisionPanel`, `ForbiddenView`, `HandoverForm`, `HandoverWorkspaceView`, `HandoversListView`, `SignatureCanvas` | — | `applyHandoverCasesAction`, `cancelEmployeeHandoverAction`, `decideApprovalAction`, `getSignatureModeAction`, `openEmployeeHandoverAction`, `refreshHandoverCasesAction`, `setHandoverCaseModeAction`, `startAssetHandoverAction`, `submitEmployeeHandoverAction`, `updateHandoverChecklistAction` | — | 24 | Pending |
| `/dashboard/hr/handovers` | `HandoversListView` | — | `openEmployeeHandoverAction` | — | 5 | Pending |
| `/dashboard/hr/leave` | `LeaveBalancesCard`, `LeaveManagementView`, `NoEmployeeProfile` | — | `addLeaveAdjustmentAction`, `cancelLeaveRequestAction`, `createLeaveRequestAction`, `decideLeaveRequestAction` | `Modal` | 12 | Pending |
| `/dashboard/hr` | — | — | — | — | 0 | Pending |
| `/dashboard/hr/payroll/items/[id]` | `PayLinesEditor`, `PayrollItemView` | — | `payPayrollItemAction`, `setPayrollLinesAction` | — | 7 | Pending |
| `/dashboard/hr/payroll` | `PayrollManagementView`, `SupportClaimsPanel` | — | `approvePayrollRunAction`, `generatePayrollRunAction`, `markPayrollRunPaidAction`, `recalculatePayrollRunAction`, `recordSupportReimbursementAction`, `submitPayrollRunForApprovalAction` | `Modal` | 8 | Pending |
| `/dashboard/hr/requests` | `HrRequestsView`, `NoEmployeeProfile`, `SalaryDocumentsView` | — | `createLeaveRequestAction`, `emailSalaryDocumentAction`, `payslipMonthsForEmployeeAction`, `requestSalaryDocumentAction`, `whatsappSalaryDocumentAction` | `FileForEmployeeModal`, `Modal` | 9 | Pending |
| `/dashboard/hr/settings` | `HrSettingsView` | — | `deletePublicHolidayAction`, `saveLeaveTypeAction`, `savePublicHolidayAction`, `saveShiftTypeAction`, `updateHrPolicyAction` | `ConfirmDestructiveModal`, `Modal` | 28 | Pending |
| `/dashboard/hr/settlements/[id]` | `ApprovalDecisionPanel`, `BilingualPdfActions`, `ContentImage`, `ForbiddenView`, `SettlementDetailView`, `SettlementsListView`, `SignatureCanvas` | — | `cancelFinalSettlementAction`, `decideApprovalAction`, `payFinalSettlementAction`, `recalculateFinalSettlementAction`, `setFinalSettlementLinesAction`, `signFinalSettlementAction`, `submitFinalSettlementAction`, `updateSettlementRulesAction` | — | 23 | Pending |
| `/dashboard/hr/settlements/new` | `NewSettlementForm` | — | `createFinalSettlementAction` | — | 4 | Pending |
| `/dashboard/hr/settlements` | `SettlementsListView` | — | `updateSettlementRulesAction` | — | 10 | Pending |
| `/dashboard/hr/supports` | `SupportClaimsPanel`, `SupportProgramsView` | — | `deleteEmployeeSupportAction`, `deleteSupportRuleAction`, `recordSupportReimbursementAction`, `saveEmployeeSupportAction`, `saveSupportProgramAction`, `scheduleSupportRuleAction` | — | 33 | Pending |
| `/dashboard/inventory/counts/[id]` | `LanguageFields`, `StockCountView` | — | `approveStockCountAction`, `saveCountedAction`, `scanCountItemAction`, `setStockCountStatusAction` | — | 5 | Pending |
| `/dashboard/inventory/counts` | `LanguageFields`, `StockCountsView` | — | `createStockCountAction` | — | 6 | Pending |
| `/dashboard/inventory/movements` | `StockMovementsView` | — | — | — | 4 | Pending |
| `/dashboard/inventory` | `InventoryStockView`, `LanguageFields`, `StockDialogs` | — | `changeStockAction`, `transferStockAction` | `Modal`, `StockChangeModal`, `TransferModal` | 17 | Pending |
| `/dashboard/inventory/warehouses` | `LanguageFields`, `WarehousesView` | — | `saveLocationAction`, `saveWarehouseAction` | — | 8 | Pending |
| `/dashboard/invoices/[id]/edit` | `ClientAutocomplete`, `EditConfirmModal`, `InvoiceEditFormView` | — | `createContactAction`, `searchContactsAction`, `updateInvoiceAction`, `voidInvoiceAction` | `ConfirmDestructiveModal`, `EditConfirmModal`, `Modal` | 19 | Pending |
| `/dashboard/invoices/[id]` | `AttributionPanel`, `ClientSignaturePanel`, `ContentImage`, `DeliveryToolbar`, `DocumentLetterhead`, `InvoiceDetailView`, `InvoiceTemplate`, `LinkOrUploadField`, `PaymentRecorder`, `SignatureCanvas`, `SigningPanel` | — | `createPaymentAction`, `createSigningLinkAction`, `markInvoiceSentAction`, `reassignSalesOwnerAction`, `recordSignedCopyAction`, `requestInvoiceApprovalAction`, `revokeSigningLinkAction`, `signDocumentAction` | `Modal` | 16 | Pending |
| `/dashboard/invoices/new` | `ClientAutocomplete`, `NewInvoiceFormView` | — | `convertQuotationToInvoiceAction`, `createContactAction`, `createInvoiceAction`, `searchContactsAction` | — | 19 | Pending |
| `/dashboard/invoices` | `InvoicesListView`, `ListControls` | — | — | — | 4 | Pending |
| `/dashboard/legal/[id]` | `LanguageFields`, `LegalView` | — | `addLegalNoteAction`, `saveLegalMatterAction` | — | 14 | Pending |
| `/dashboard/legal` | `LanguageFields`, `LegalView` | — | `addLegalNoteAction`, `saveLegalMatterAction` | — | 14 | Pending |
| `/dashboard/letters/[id]` | `ApprovalDecisionPanel`, `BilingualPdfActions`, `ForbiddenView`, `LetterWorkspace`, `SignatureCanvas` | — | `cancelOfficialLetterAction`, `decideApprovalAction`, `draftLetterTemplateAction`, `saveLetterTemplateAction`, `saveOfficialLetterAction`, `submitOfficialLetterAction` | — | 14 | Pending |
| `/dashboard/letters/new` | `ApprovalDecisionPanel`, `BilingualPdfActions`, `LetterWorkspace`, `SignatureCanvas` | — | `cancelOfficialLetterAction`, `decideApprovalAction`, `draftLetterTemplateAction`, `saveLetterTemplateAction`, `saveOfficialLetterAction`, `submitOfficialLetterAction` | — | 14 | Pending |
| `/dashboard/letters` | `LettersListView` | — | — | — | 0 | Pending |
| `/dashboard/letters/templates` | `ApprovalDecisionPanel`, `BilingualPdfActions`, `LetterWorkspace`, `SignatureCanvas` | — | `cancelOfficialLetterAction`, `decideApprovalAction`, `draftLetterTemplateAction`, `saveLetterTemplateAction`, `saveOfficialLetterAction`, `submitOfficialLetterAction` | — | 14 | Pending |
| `/dashboard/marketing/audience` | `AudienceView`, `LanguageFields` | — | `saveBroadcastAction`, `saveSegmentAction`, `sendBroadcastAction` | — | 8 | Pending |
| `/dashboard/marketing` | `CampaignsView`, `LanguageFields` | — | `saveCampaignAction` | — | 16 | Pending |
| `/dashboard/moms/[id]` | `BilingualPdfActions`, `ContentImage`, `DocumentLetterhead`, `MomDetailView`, `SignatureCanvas` | — | `approveAndSignMomAction`, `getSignatureModeAction`, `shareMomViaEmailAction` | — | 2 | Pending |
| `/dashboard/moms/new` | `EntityLookup`, `NewMomFormView` | — | `createMomAction` | — | 22 | Pending |
| `/dashboard/moms` | `MomsListView` | — | `deleteMomAction` | `ConfirmDestructiveModal` | 1 | Pending |
| `/dashboard/notifications` | `NotificationInboxView` | — | `markAllNotificationsReadAction`, `updateNotificationAction` | — | 0 | Pending |
| `/dashboard/orders/[id]` | `LanguageFields`, `OrderPills`, `OrderView` | — | `addOrderNoteAction`, `issueOrderInvoiceAction`, `moveOrderAction`, `recordOrderPaymentAction`, `recordOrderRefundAction` | — | 10 | Pending |
| `/dashboard/orders/new` | `LanguageFields`, `NewSaleView` | — | `createStaffOrderAction` | — | 13 | Pending |
| `/dashboard/orders` | `OrderPills`, `OrdersListView` | — | — | — | 3 | Pending |
| `/dashboard/orders/settings` | `LanguageFields`, `StoreSettingsView` | — | `saveCouponAction`, `saveStoreSettingsAction` | — | 15 | Pending |
| `/dashboard` | `DashboardBoard`, `DashboardWidgets`, `DeferredCharts`, `WorkloadPanels` | — | `resetDashboardLayoutAction`, `saveDashboardLayoutAction` | — | 1 | Pending |
| `/dashboard/payments/[id]` | `ContentImage`, `DeliveryToolbar`, `DocumentLetterhead`, `LinkOrUploadField`, `PaymentDetailView`, `ReceiptTemplate`, `SignatureCanvas`, `SigningPanel` | — | `createAttachmentAction`, `requestInvoiceApprovalAction`, `signDocumentAction` | — | 4 | Pending |
| `/dashboard/payments/new` | `ClientAutocomplete`, `EntityLookup`, `LinkOrUploadField`, `NewPaymentFormView` | — | `createContactAction`, `createPaymentAction`, `searchContactsAction` | — | 19 | Pending |
| `/dashboard/payments` | `ListControls`, `PaymentsManagementView` | — | — | — | 4 | Pending |
| `/dashboard/press` | `LanguageFields`, `PressView` | — | `saveCoverageAction`, `saveMediaContactAction` | — | 13 | Pending |
| `/dashboard/procurement/bills/[id]` | `LanguageFields`, `StatusPill`, `SupplierBillView` | — | `approveSupplierBillAction`, `attachSupplierBillFileAction`, `cancelSupplierBillAction`, `recordSupplierPaymentAction`, `saveSupplierBillAction` | — | 17 | Pending |
| `/dashboard/procurement/bills/new` | `LanguageFields`, `StatusPill`, `SupplierBillView` | — | `approveSupplierBillAction`, `attachSupplierBillFileAction`, `cancelSupplierBillAction`, `recordSupplierPaymentAction`, `saveSupplierBillAction` | — | 17 | Pending |
| `/dashboard/procurement/bills` | `StatusPill`, `SupplierBillsListView` | — | — | — | 1 | Pending |
| `/dashboard/procurement/orders/[id]` | `LanguageFields`, `LinesEditor`, `PurchaseOrderView`, `ReceiveGoodsPanel`, `StatusPill` | — | `cancelPurchaseOrderAction`, `emailPurchaseOrderAction`, `markPurchaseOrderSentAction`, `receiveGoodsAction`, `savePurchaseOrderAction`, `submitPurchaseOrderAction` | — | 21 | Pending |
| `/dashboard/procurement/orders/new` | `LanguageFields`, `LinesEditor`, `PurchaseOrderView`, `StatusPill` | — | `cancelPurchaseOrderAction`, `emailPurchaseOrderAction`, `markPurchaseOrderSentAction`, `savePurchaseOrderAction`, `submitPurchaseOrderAction` | — | 14 | Pending |
| `/dashboard/procurement/orders` | `PurchaseOrdersListView`, `StatusPill` | — | — | — | 2 | Pending |
| `/dashboard/procurement/requisitions/[id]` | `LanguageFields`, `LinesEditor`, `RequisitionView`, `StatusPill` | — | `cancelRequisitionAction`, `createRfqAction`, `saveRequisitionAction`, `submitRequisitionAction` | — | 9 | Pending |
| `/dashboard/procurement/requisitions/new` | `LanguageFields`, `LinesEditor`, `RequisitionView`, `StatusPill` | — | `cancelRequisitionAction`, `createRfqAction`, `saveRequisitionAction`, `submitRequisitionAction` | — | 9 | Pending |
| `/dashboard/procurement/requisitions` | `RequisitionsListView`, `StatusPill` | — | — | — | 0 | Pending |
| `/dashboard/procurement/rfqs/[id]` | `LanguageFields`, `RfqView`, `StatusPill` | — | `awardRfqAction`, `cancelRfqAction`, `saveRfqQuotesAction` | — | 6 | Pending |
| `/dashboard/procurement/rfqs` | `LanguageFields`, `LinesEditor`, `RfqsListView`, `StatusPill` | — | `createRfqAction` | — | 9 | Pending |
| `/dashboard/procurement/suppliers` | `LanguageFields`, `SuppliersView` | — | `saveSupplierAction` | — | 4 | Pending |
| `/dashboard/products/[id]` | `AssetUrlInput`, `ContentImage`, `LanguageFields`, `ProductEditorView`, `ProductStockPanel`, `PurchasePricesCard`, `StockDialogs` | — | `changeStockAction`, `deleteProductAction`, `saveProductAction`, `saveReorderPointsAction`, `setProductOnWebsiteAction`, `transferStockAction` | `Modal`, `StockChangeModal` | 32 | Pending |
| `/dashboard/products/categories` | `LanguageFields`, `ProductCategoriesView` | — | `deleteProductCategoryAction`, `saveProductCategoryAction` | — | 4 | Pending |
| `/dashboard/products/new` | `AssetUrlInput`, `ContentImage`, `LanguageFields`, `ProductEditorView` | — | `deleteProductAction`, `saveProductAction`, `setProductOnWebsiteAction` | — | 17 | Pending |
| `/dashboard/products` | `ContentImage`, `ProductsListView` | — | `setProductsActiveAction` | — | 5 | Pending |
| `/dashboard/profile` | `ContentImage`, `EmployeeAssetsCard`, `ProfileSecurityView`, `ProfileWorkspace`, `SecuritySettingsView`, `SignaturePad`, `UserProfileView` | — | `cancelMyProfileChangeAction`, `cancelSignatureChangeAction`, `changeMyPasswordAction`, `requestIdentityChangeAction`, `requestSignatureChangeAction`, `revokeMySessionAction`, `revokeOtherSessionsAction`, `updateMyProfileAction` | `ConfirmDestructiveModal` | 10 | Pending |
| `/dashboard/quotations/[id]` | `AttributionPanel`, `ClientSignaturePanel`, `ContentImage`, `LinkOrUploadField`, `QuotationActionDialog`, `QuotationDetailView`, `SignatureCanvas`, `SigningPanel` | — | `acceptQuotationAction`, `convertQuotationToInvoiceAction`, `createSigningLinkAction`, `decideApprovalAction`, `issueQuotationAction`, `reassignSalesOwnerAction`, `recordSignedCopyAction`, `rejectQuotationAction`, `requestInvoiceApprovalAction`, `revokeSigningLinkAction`, `setLoadingAction`, `signDocumentAction`, `submitQuotationForApprovalAction` | `Modal`, `QuotationActionDialog` | 15 | Pending |
| `/dashboard/quotations/new` | `ClientAutocomplete`, `NewQuotationFormView` | — | `createContactAction`, `createQuotationAction`, `refreshExchangeRatesAction`, `searchContactsAction` | — | 19 | Pending |
| `/dashboard/quotations` | `ListControls`, `QuotationsListView` | — | — | — | 4 | Pending |
| `/dashboard/reports/[key]` | `LanguageFields`, `ReportView` | — | `saveReportScheduleAction`, `stopReportScheduleAction` | — | 9 | Pending |
| `/dashboard/reports` | `ReportsCatalogView` | — | — | — | 0 | Pending |
| `/dashboard/requests/[id]` | `EntityLookup`, `RequestBadges`, `RequestDetailView`, `RequestManagePanel`, `ServiceReplyPanel` | — | `addRequestCommentAction`, `approveRequestAction`, `assignRequestWithAvailabilityAction`, `confirmRequestAction`, `convertInquiryToClientAction`, `linkInquiryCustomerAction`, `manageInquiryAction`, `replyToRequestAction`, `resolveRequestAction`, `returnRequestAction`, `submitRequestForApprovalAction`, `updateInquiryStatusAction` | — | 12 | Pending |
| `/dashboard/requests/new` | `ClientAutocomplete`, `NewRequestFormView` | — | `createConsolidatedRequestAction`, `createContactAction`, `searchContactsAction` | — | 17 | Pending |
| `/dashboard/requests` | `RequestBadges`, `RequestsInboxView` | — | — | — | 13 | Pending |
| `/dashboard/requests/settings` | `LanguageFields`, `ServiceSettingsView` | — | `saveCannedReplyAction`, `saveServiceSettingsAction` | — | 5 | Pending |
| `/dashboard/services` | `LanguageFields`, `ServicesManagementView` | — | `createServiceAction`, `deleteServiceAction`, `updateServiceAction` | — | 9 | Pending |
| `/dashboard/settings/approvals` | `ApprovalPoliciesView`, `SettingsNavTabs`, `SignaturePoliciesPanel` | — | `setSignaturePolicyAction`, `updateApprovalPolicyAction` | — | 14 | Pending |
| `/dashboard/settings/audit` | `AuditSessionsView`, `SettingsNavTabs` | — | `setSelectedAction` | — | 3 | Pending |
| `/dashboard/settings/company` | `BankCoordinatesTab`, `BrandAssetsTab`, `CompanySettingsView`, `ContentImage`, `CustomTaxesPanel`, `GeneralInfoTab`, `InvoiceReceiptSequencesTab`, `LinkOrUploadField`, `SalesDiscountsTab`, `SettingsNavTabs`, `TaxVatSettingsTab`, `ThemeEditor`, `ThemeSettingsTab` | — | `deleteCompanyAssetAction`, `deleteTaxRateAction`, `saveCompanyAssetAction`, `saveSetupThemeAction`, `saveTaxRateAction`, `updateCompanySettingsAction` | — | 42 | Pending |
| `/dashboard/settings/departments` | `DepartmentsSettingsView`, `LanguageFields` | — | `addCatalogueDepartmentsAction`, `deleteDepartmentAction`, `saveDepartmentAction` | — | 6 | Pending |
| `/dashboard/settings/integrations` | `CalendarSyncCard`, `IntegrationsView`, `PlatformPicker`, `SettingsNavTabs` | — | `createCalendarFeedAction`, `revokeCalendarFeedAction`, `sendWhatsAppTestAction`, `setCalendarSyncEnabledAction`, `syncIntegrationAction`, `testIntegrationAction`, `updateCalendarFeedLayersAction` | `ConfirmDestructiveModal` | 8 | Pending |
| `/dashboard/settings/modules` | `ModulesManagementView` | — | `toggleFeatureAction` | — | 0 | Pending |
| `/dashboard/settings` | — | — | — | — | 0 | Pending |
| `/dashboard/settings/pipeline` | `LanguageFields`, `PipelineSettingsView` | — | `resetDealPipelineAction`, `saveDealPipelineAction` | — | 6 | Pending |
| `/dashboard/settings/preferences` | `PreferencesView`, `SettingsNavTabs` | — | — | — | 0 | Pending |
| `/dashboard/settings/roles` | `RolesManagementView` | — | `deleteRoleAction`, `upsertRoleAction` | `ConfirmDestructiveModal`, `Modal` | 4 | Pending |
| `/dashboard/settings/security` | — | — | — | — | 0 | Pending |
| `/dashboard/settings/web` | `DomainSettingsCard`, `LazyIconPicker`, `PlatformPicker`, `SettingsNavTabs`, `WebSettingsView` | `cms`, `hero`, `legal`, `narrative`, `social` | `checkDomainAction`, `createSocialLinkAction`, `deleteSocialLinkAction`, `revalidateEntireSiteAction`, `saveDomainsAction`, `updateSocialLinkAction`, `updateWebSettingsAction` | `IconPicker`, `Picker`, `PlatformPicker` | 26 | Pending |
| `/dashboard/tasks/[id]` | `LanguageFields`, `TaskBits`, `TaskForm`, `TaskView` | — | `addTaskCommentAction`, `moveTaskAction`, `saveTaskAction` | — | 13 | Pending |
| `/dashboard/tasks` | `LanguageFields`, `TaskBits`, `TaskForm`, `TasksPage`, `TasksView` | — | `moveTaskAction`, `saveTaskAction` | — | 17 | Pending |
| `/dashboard/tasks/projects/[id]` | `LanguageFields`, `ProjectsView`, `TaskBits`, `TaskForm`, `TasksView` | — | `moveTaskAction`, `saveProjectAction`, `saveTaskAction` | — | 25 | Pending |
| `/dashboard/tasks/projects` | `LanguageFields`, `ProjectsView`, `TaskBits`, `TaskForm`, `TasksView` | — | `moveTaskAction`, `saveProjectAction`, `saveTaskAction` | — | 25 | Pending |
| `/dashboard/team` | `TeamPerformanceView` | — | — | — | 1 | Pending |
| `/dashboard/users/new` | — | — | — | — | 0 | Pending |
| `/dashboard/users` | `AccountSettingsDialog`, `ContentImage`, `RolePermissionMatrix`, `UserPermissionOverrides`, `UsersManagementView` | `matrix`, `users` | `bulkUpdateUsersAction`, `createUserAction`, `deleteUserAction`, `saveAccountSettingsAction`, `setUserPermissionOverridesAction` | `AccountSettingsDialog`, `ConfirmDestructiveModal`, `Modal` | 22 | Pending |

## Native prompts, overlays and field inventory

Native dialog and overlay candidates below were observed in source. Layout backdrops and status overlays are candidates for classification, not automatically defects.

- `apps/admin/components/cms/ArticleEditorView.tsx:79`: `if (!window.confirm(copy.deleteConfirm)) return;`
- `apps/admin/components/cms/PagesListView.tsx:114`: `<button type="button" aria-label={formatMessage(copy.deleteNamed, { name: title })} disabled={busy} onClick={() => window.confirm(copy.deleteConfirm) && run(() => deleteCmsPageAction(row.id), copy.deleted)} className="h-`
- `apps/admin/components/cms/RichTextEditor.tsx:109`: `const caption = window.prompt(copy.captionPrompt) ?? "";`
- `apps/admin/components/cms/RichTextEditor.tsx:113`: `window.alert(error instanceof Error && error.message ? error.message : copy.uploadFailed);`
- `apps/admin/components/cms/RichTextEditor.tsx:122`: `const href = window.prompt(copy.linkPrompt, previous ?? "https://");`
- `apps/admin/components/cms/RichTextEditor.tsx:129`: `const url = window.prompt(copy.videoPrompt);`
- `apps/admin/components/cms/RichTextEditor.tsx:133`: `else window.alert(copy.videoInvalid);`
- `apps/admin/components/cms/RichTextEditor.tsx:137`: `const preset = window.prompt(${copy.embedPresetPrompt} (${EMBED_PRESETS.join(", ")}), "instagram") as EmbedPreset  /  null;`
- `apps/admin/components/cms/RichTextEditor.tsx:139`: `const url = window.prompt(copy.embedUrlPrompt);`
- `apps/admin/components/cms/RichTextEditor.tsx:141`: `if (!embedSource(preset, url)) return void window.alert(copy.embedInvalid);`
- `apps/admin/components/dashboard/DashboardBoard.tsx:90`: `if (!window.confirm(b.resetConfirm)) return;`
- `apps/admin/components/delivery/RouteSheetView.tsx:23`: `if (confirm && !window.confirm(confirm)) return;`
- `apps/admin/components/delivery/ShipmentView.tsx:55`: `if (confirm && !window.confirm(confirm)) return;`
- `apps/admin/components/gosi/GosiView.tsx:415`: `const end = window.prompt(`
- `apps/admin/components/gosi/GosiView.tsx:953`: `className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto modal-scrim p-4"`
- `apps/admin/components/gosi/GosiView.tsx:954`: `role="dialog"`
- `apps/admin/components/gosi/GosiView.tsx:1146`: `if (!window.confirm(g.deleteConfirm)) return;`
- `apps/admin/components/handovers/HandoverWorkspaceView.tsx:196`: `if (window.confirm(e.cancelConfirm))`
- `apps/admin/components/hr/LeaveManagementView.tsx:450`: `<div className="fixed inset-0 z-50 modal-scrim flex items-center justify-center p-4">`
- `apps/admin/components/hr/LeaveManagementView.tsx:608`: `<div className="fixed inset-0 z-50 modal-scrim flex items-center justify-center p-4">`
- `apps/admin/components/hr/PayrollManagementView.tsx:547`: `<div className="fixed inset-0 z-50 modal-scrim flex items-center justify-center p-4">`
- `apps/admin/components/inventory/StockCountView.tsx:120`: `<Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5" disabled={busy} onClick={() => window.confirm(copy.approveConfirm) && run(async () => { const result = await approveStockCountAction(coun`
- `apps/admin/components/inventory/StockCountView.tsx:126`: `<Button type="button" variant="ghost" size="sm" className="rounded-full text-rose-600" disabled={busy} onClick={() => window.confirm(copy.cancelConfirm) && run(() => setStockCountStatusAction(count.id, "cancelled"))}>{co`
- `apps/admin/components/layout/GlobalQuickJump.tsx:154`: `<div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 modal-scrim animate-fade-in">`
- `apps/admin/components/layout/GlobalQuickJump.tsx:155`: `<div className="fixed inset-0" onClick={() => setIsOpen(false)} />`
- `apps/admin/components/layout/NotificationCenter.tsx:135`: `role="dialog"`
- `apps/admin/components/layout/Sidebar.tsx:856`: `<div className="lg:hidden fixed inset-0 top-14 z-50 flex">`
- `apps/admin/components/layout/Sidebar.tsx:858`: `className="fixed inset-0 top-14 modal-scrim animate-in fade-in duration-base"`
- `apps/admin/components/moms/MomDetailView.tsx:667`: `<div className="fixed inset-0 z-50 modal-scrim flex items-center justify-center p-4 no-print">`
- `apps/admin/components/orders/OrderView.tsx:73`: `<Button key={status} type="button" size="sm" variant={status === "cancelled"  /  /  status === "returned" ? "ghost" : "primary"} className={rounded-full ${status === "cancelled" ? "text-rose-600" : ""}} disabled={busy} o`
- `apps/admin/components/outreach/AudienceView.tsx:128`: `<button type="button" disabled={busy} className="inline-flex items-center gap-1 text-xs font-semibold text-primary dark:text-mint" onClick={() => { if (window.confirm(copy.sendConfirm)) void run(() => sendBroadcastAction`
- `apps/admin/components/payments/NewPaymentFormView.tsx:120`: `alert(errorMessage(err, t, t.newPaymentForm.failedToUploadDocument));`
- `apps/admin/components/payments/PaymentDetailView.tsx:85`: `alert(errorMessage(err, t, t.paymentDetail.failedToUploadDocument));`
- `apps/admin/components/payments/PaymentDetailView.tsx:247`: `return alert(`
- `apps/admin/components/procurement/PurchaseOrderView.tsx:150`: `<Button type="button" variant="ghost" size="sm" className="rounded-full text-rose-600" disabled={busy} onClick={() => window.confirm(common.cancelConfirm) && run(() => cancelPurchaseOrderAction(order.id))}>{copy.cancelOr`
- `apps/admin/components/procurement/RequisitionView.tsx:94`: `<Button type="button" variant="ghost" size="sm" className="rounded-full text-rose-600" disabled={busy} onClick={() => window.confirm(common.cancelConfirm) && run(() => cancelRequisitionAction(requisition.id))}>{common.ca`
- `apps/admin/components/procurement/RfqView.tsx:89`: `<Button type="button" variant="ghost" size="sm" className="rounded-full text-rose-600" disabled={busy} onClick={() => window.confirm(t.procurement.common.cancelConfirm) && run(() => cancelRfqAction(rfq.id))}>{t.procureme`
- `apps/admin/components/procurement/SupplierBillView.tsx:107`: `{bill?.status === "draft" && rights.edit && <Button type="button" variant="ghost" size="sm" className="rounded-full text-rose-600" disabled={busy} onClick={() => window.confirm(common.cancelConfirm) && run(() => cancelSu`
- `apps/admin/components/products/ProductCategoriesView.tsx:130`: `<button type="button" aria-label={formatMessage(copy.delete, { name: name(category) })} disabled={busy} onClick={() => window.confirm(copy.deleteConfirm) && run(() => deleteProductCategoryAction(category.id))} className=`
- `apps/admin/components/products/ProductEditorView.tsx:155`: `<Button type="button" variant="outline" size="sm" className="rounded-full gap-1.5 text-rose-600" disabled={busy} onClick={() => window.confirm(copy.deleteConfirm) && run(async () => { await deleteProductAction(product.id`
- `apps/admin/components/quotations/QuotationDetailView.tsx:238`: `const reason = window.prompt(t.quotationLifecycle.declineReasonPrompt) ?? undefined;`
- `apps/admin/components/requests/RequestDetailView.tsx:925`: `<div className="fixed inset-0 z-50 modal-scrim flex items-center justify-center p-4">`
- `apps/admin/components/services/ServicesManagementView.tsx:140`: `if (!window.confirm(t.servicesView.deleteConfirmDesc)) return;`
- `apps/admin/components/services/ServicesManagementView.tsx:406`: `<div className="fixed inset-0 z-50 modal-scrim flex items-center justify-center p-4">`
- `apps/admin/components/settings/CalendarSyncCard.tsx:231`: `onClick={() => window.confirm(c.rotateConfirm) && create()}`
- `apps/admin/components/settings/CalendarSyncCard.tsx:242`: `window.confirm(c.disconnectConfirm) &&`
- `apps/admin/components/settings/CompanySettingsView.tsx:415`: `<div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-scrim animate-in fade-in duration-150">`
- `apps/admin/components/settings/DepartmentsSettingsView.tsx:175`: `<button type="button" aria-label={formatMessage(copy.deleteNamed, { name: name(node) })} onClick={() => window.confirm(copy.deleteConfirm) && run(() => deleteDepartmentAction(node.id), copy.deleted)} className="h-8 w-8 g`
- `apps/admin/components/settings/PipelineSettingsView.tsx:92`: `if (!window.confirm(copy.resetConfirm)) return;`
- `apps/admin/components/settings/company/TaxVatSettingsTab.tsx:249`: `<div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-scrim animate-in fade-in duration-150">`
- `apps/admin/components/settlements/SettlementDetailView.tsx:576`: `window.confirm(f.cancelConfirm) &&`
- `apps/admin/components/settlements/SettlementDetailView.tsx:692`: `if (window.confirm(f.payConfirm))`
- `apps/admin/components/setup/SetupWizard.tsx:694`: `<motion.div role="status" className="fixed inset-0 z-50 flex items-center justify-center bg-brand-base/90 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>`
- `apps/admin/components/shared/IconPicker.tsx:69`: `<div id={menuId} role="dialog" aria-label={t.iconPicker.selectIcon} onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();setIsOpen(false);}}}`
- `apps/admin/components/supports/SupportProgramsView.tsx:364`: `window.confirm(s.deleteTermsConfirm) &&`
- `apps/admin/components/supports/SupportProgramsView.tsx:920`: `window.confirm(s.deleteConfirm) &&`
- `apps/admin/components/supports/SupportProgramsView.tsx:976`: `className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto modal-scrim p-4"`
- `apps/admin/components/supports/SupportProgramsView.tsx:977`: `role="dialog"`

### Fields needing placeholder/label review

All input-like elements without a placeholder are listed for review. Checkboxes, dates, selects and hidden fields may correctly omit placeholders; inspect their associated labels, help and inline errors instead of adding meaningless text. Line numbers refer to the pre-change baseline.

- `apps/admin/components/analytics/SocialAnalyticsView.tsx:214`: `input`; review label, expected format and validation
- `apps/admin/components/analytics/SocialAnalyticsView.tsx:218`: `textarea`; review label, expected format and validation
- `apps/admin/components/analytics/SocialAnalyticsView.tsx:227`: `input`; non-text field
- `apps/admin/components/analytics/SocialAnalyticsView.tsx:238`: `select`; review label, expected format and validation
- `apps/admin/components/analytics/SocialAnalyticsView.tsx:244`: `input`; non-text field
- `apps/admin/components/analytics/SocialAnalyticsView.tsx:248`: `select`; review label, expected format and validation
- `apps/admin/components/analytics/SocialAnalyticsView.tsx:444`: `select`; review label, expected format and validation
- `apps/admin/components/analytics/SocialAnalyticsView.tsx:447`: `select`; review label, expected format and validation
- `apps/admin/components/approvals/ApprovalDecisionPanel.tsx:75`: `Textarea`; review label, expected format and validation
- `apps/admin/components/approvals/ApprovalsCenterView.tsx:141`: `select`; review label, expected format and validation
- `apps/admin/components/approvals/ApprovalsCenterView.tsx:155`: `select`; review label, expected format and validation
- `apps/admin/components/archive/CompanyArchiveView.tsx:341`: `Input`; review label, expected format and validation
- `apps/admin/components/archive/CompanyArchiveView.tsx:347`: `Select`; review label, expected format and validation
- `apps/admin/components/archive/CompanyArchiveView.tsx:448`: `input`; review label, expected format and validation
- `apps/admin/components/archive/CompanyArchiveView.tsx:456`: `select`; review label, expected format and validation
- `apps/admin/components/archive/CompanyArchiveView.tsx:470`: `select`; review label, expected format and validation
- `apps/admin/components/archive/CompanyArchiveView.tsx:484`: `input`; non-text field
- `apps/admin/components/archive/CompanyArchiveView.tsx:493`: `input`; non-text field
- `apps/admin/components/archive/CompanyArchiveView.tsx:500`: `select`; review label, expected format and validation
- `apps/admin/components/assets/AssetCategoriesView.tsx:73`: `Input`; review label, expected format and validation
- `apps/admin/components/assets/AssetCategoriesView.tsx:74`: `Input`; review label, expected format and validation
- `apps/admin/components/assets/AssetCategoriesView.tsx:84`: `select`; review label, expected format and validation
- `apps/admin/components/assets/AssetCategoriesView.tsx:88`: `input`; non-text field
- `apps/admin/components/assets/AssetCategoriesView.tsx:111`: `input`; non-text field
- `apps/admin/components/assets/AssetForm.tsx:75`: `Select`; review label, expected format and validation
- `apps/admin/components/assets/AssetForm.tsx:79`: `Input`; review label, expected format and validation
- `apps/admin/components/assets/AssetForm.tsx:80`: `Input`; review label, expected format and validation
- `apps/admin/components/assets/AssetForm.tsx:81`: `Input`; review label, expected format and validation
- `apps/admin/components/assets/AssetForm.tsx:82`: `Input`; review label, expected format and validation
- `apps/admin/components/assets/AssetForm.tsx:84`: `Select`; review label, expected format and validation
- `apps/admin/components/assets/AssetForm.tsx:90`: `Select`; review label, expected format and validation
- `apps/admin/components/assets/AssetForm.tsx:97`: `Select`; review label, expected format and validation
- `apps/admin/components/assets/AssetForm.tsx:103`: `Input`; review label, expected format and validation
- `apps/admin/components/assets/AssetForm.tsx:104`: `Input`; non-text field
- `apps/admin/components/assets/AssetForm.tsx:105`: `Input`; review label, expected format and validation
- `apps/admin/components/assets/AssetForm.tsx:106`: `Input`; review label, expected format and validation
- `apps/admin/components/assets/AssetForm.tsx:107`: `Input`; review label, expected format and validation
- `apps/admin/components/assets/AssetForm.tsx:108`: `Input`; non-text field
- `apps/admin/components/assets/AssetForm.tsx:118`: `Select`; review label, expected format and validation
- `apps/admin/components/assets/AssetForm.tsx:124`: `Input`; review label, expected format and validation
- `apps/admin/components/assets/AssetForm.tsx:138`: `textarea`; review label, expected format and validation
- `apps/admin/components/assets/AssetsListView.tsx:108`: `select`; review label, expected format and validation
- `apps/admin/components/assets/AssetsListView.tsx:112`: `select`; review label, expected format and validation
- `apps/admin/components/assets/AssetsListView.tsx:116`: `select`; review label, expected format and validation
- `apps/admin/components/assets/AssetsListView.tsx:120`: `select`; review label, expected format and validation
- `apps/admin/components/assets/AssetsListView.tsx:124`: `select`; review label, expected format and validation
- `apps/admin/components/assets/HandoverDetailView.tsx:368`: `Input`; review label, expected format and validation
- `apps/admin/components/assets/HandoverForm.tsx:144`: `Select`; review label, expected format and validation
- `apps/admin/components/assets/HandoverForm.tsx:157`: `Input`; review label, expected format and validation
- `apps/admin/components/assets/HandoverForm.tsx:173`: `Input`; non-text field
- `apps/admin/components/assets/HandoverForm.tsx:184`: `Select`; review label, expected format and validation
- `apps/admin/components/assets/HandoverForm.tsx:200`: `Select`; review label, expected format and validation
- `apps/admin/components/assets/HandoverForm.tsx:228`: `input`; non-text field
- `apps/admin/components/assets/HandoverForm.tsx:267`: `Input`; review label, expected format and validation
- `apps/admin/components/assets/HandoverForm.tsx:277`: `Input`; review label, expected format and validation
- `apps/admin/components/assets/HandoverForm.tsx:291`: `Input`; review label, expected format and validation
- `apps/admin/components/assets/HandoverForm.tsx:301`: `input`; non-text field
- `apps/admin/components/assets/HandoverForm.tsx:315`: `Input`; review label, expected format and validation
- `apps/admin/components/assets/HandoverForm.tsx:321`: `input`; non-text field
- `apps/admin/components/assets/HandoverForm.tsx:333`: `Input`; review label, expected format and validation
- `apps/admin/components/assets/HandoverSigningLinkPanel.tsx:93`: `Select`; review label, expected format and validation
- `apps/admin/components/assets/HandoverSigningLinkPanel.tsx:111`: `input`; review label, expected format and validation
- `apps/admin/components/auth/AdminLoginFormView.tsx:155`: `Input`; review label, expected format and validation
- `apps/admin/components/calendar/OdooCalendarView.tsx:749`: `Input`; review label, expected format and validation
- `apps/admin/components/calendar/OdooCalendarView.tsx:759`: `Input`; review label, expected format and validation
- `apps/admin/components/calendar/OdooCalendarView.tsx:769`: `Input`; non-text field
- `apps/admin/components/calendar/OdooCalendarView.tsx:780`: `Input`; non-text field
- `apps/admin/components/calendar/OdooCalendarView.tsx:791`: `Select`; review label, expected format and validation
- `apps/admin/components/calendar/OdooCalendarView.tsx:821`: `Input`; review label, expected format and validation
- `apps/admin/components/calendar/OdooCalendarView.tsx:829`: `Input`; review label, expected format and validation
- `apps/admin/components/calendar/OdooCalendarView.tsx:842`: `Select`; review label, expected format and validation
- `apps/admin/components/calendar/OdooCalendarView.tsx:868`: `input`; review label, expected format and validation
- `apps/admin/components/claims/ClaimsView.tsx:289`: `input`; non-text field
- `apps/admin/components/claims/ClaimsView.tsx:301`: `select`; review label, expected format and validation
- `apps/admin/components/claims/ClaimsView.tsx:308`: `select`; review label, expected format and validation
- `apps/admin/components/claims/ClaimsView.tsx:316`: `input`; review label, expected format and validation
- `apps/admin/components/claims/NewClaimFormView.tsx:155`: `Input`; review label, expected format and validation
- `apps/admin/components/claims/NewClaimFormView.tsx:169`: `select`; review label, expected format and validation
- `apps/admin/components/claims/NewClaimFormView.tsx:188`: `Input`; non-text field
- `apps/admin/components/claims/NewClaimFormView.tsx:201`: `select`; review label, expected format and validation
- `apps/admin/components/claims/NewClaimFormView.tsx:269`: `select`; review label, expected format and validation
- `apps/admin/components/claims/NewClaimFormView.tsx:351`: `input`; non-text field
- `apps/admin/components/cms/ArticleEditorView.tsx:19`: `input`; non-text field
- `apps/admin/components/cms/ArticleEditorView.tsx:124`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/ArticleEditorView.tsx:128`: `select`; review label, expected format and validation
- `apps/admin/components/cms/ArticleEditorView.tsx:134`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/ArticleEditorView.tsx:137`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/ArticleEditorView.tsx:140`: `Input`; non-text field
- `apps/admin/components/cms/ArticleEditorView.tsx:147`: `input`; non-text field
- `apps/admin/components/cms/ArticlesListView.tsx:59`: `select`; review label, expected format and validation
- `apps/admin/components/cms/ArticlesListView.tsx:64`: `select`; review label, expected format and validation
- `apps/admin/components/cms/BannersManagementView.tsx:322`: `Select`; review label, expected format and validation
- `apps/admin/components/cms/BannersManagementView.tsx:347`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/BannersManagementView.tsx:380`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/BannersManagementView.tsx:388`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/ClientsManagementView.tsx:198`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/ClientsManagementView.tsx:223`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/EquipmentManagementView.tsx:223`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/EquipmentManagementView.tsx:234`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/EquipmentManagementView.tsx:247`: `Select`; review label, expected format and validation
- `apps/admin/components/cms/EquipmentManagementView.tsx:275`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/EquipmentManagementView.tsx:287`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/EquipmentManagementView.tsx:299`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/FaqsManagementView.tsx:116`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/FaqsManagementView.tsx:118`: `input`; non-text field
- `apps/admin/components/cms/MenusEditorView.tsx:79`: `select`; review label, expected format and validation
- `apps/admin/components/cms/MenusEditorView.tsx:85`: `select`; review label, expected format and validation
- `apps/admin/components/cms/MenusEditorView.tsx:91`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/MenusEditorView.tsx:148`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/PageEditorView.tsx:94`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/PageEditorView.tsx:105`: `select`; review label, expected format and validation
- `apps/admin/components/cms/PageEditorView.tsx:192`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/PageEditorView.tsx:194`: `input`; non-text field
- `apps/admin/components/cms/PageEditorView.tsx:244`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/PageEditorView.tsx:286`: `Textarea`; review label, expected format and validation
- `apps/admin/components/cms/PageEditorView.tsx:289`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/PageEditorView.tsx:334`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/PageEditorView.tsx:342`: `input`; non-text field
- `apps/admin/components/cms/PageEditorView.tsx:385`: `select`; review label, expected format and validation
- `apps/admin/components/cms/PagesListView.tsx:104`: `input`; non-text field
- `apps/admin/components/cms/PortfolioManagementView.tsx:369`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/PortfolioManagementView.tsx:381`: `Select`; review label, expected format and validation
- `apps/admin/components/cms/PortfolioManagementView.tsx:408`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/PortfolioManagementView.tsx:416`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/PortfolioManagementView.tsx:422`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/PortfolioManagementView.tsx:455`: `Select`; review label, expected format and validation
- `apps/admin/components/cms/PortfolioManagementView.tsx:475`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/PortfolioManagementView.tsx:486`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/PortfolioManagementView.tsx:512`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/PortfolioManagementView.tsx:526`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/PortfolioManagementView.tsx:534`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/PortfolioManagementView.tsx:543`: `textarea`; review label, expected format and validation
- `apps/admin/components/cms/PortfolioManagementView.tsx:553`: `input`; non-text field
- `apps/admin/components/cms/RichTextEditor.tsx:188`: `input`; non-text field
- `apps/admin/components/cms/SiteCodeView.tsx:36`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/SiteCodeView.tsx:68`: `Textarea`; review label, expected format and validation
- `apps/admin/components/cms/StatsManagementView.tsx:155`: `Select`; review label, expected format and validation
- `apps/admin/components/cms/StatsManagementView.tsx:162`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/StatsManagementView.tsx:167`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/StatsManagementView.tsx:181`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/StatsManagementView.tsx:191`: `Input`; review label, expected format and validation
- `apps/admin/components/cms/WebsiteEditor.tsx:188`: `textarea`; review label, expected format and validation
- `apps/admin/components/cms/WebsiteEditor.tsx:249`: `input`; non-text field
- `apps/admin/components/cms/WebsiteEditor.tsx:295`: `input`; non-text field
- `apps/admin/components/communications/AnnouncementForm.tsx:101`: `Textarea`; review label, expected format and validation
- `apps/admin/components/communications/AnnouncementForm.tsx:109`: `Input`; review label, expected format and validation
- `apps/admin/components/communications/AnnouncementForm.tsx:129`: `select`; review label, expected format and validation
- `apps/admin/components/communications/AnnouncementForm.tsx:147`: `input`; non-text field
- `apps/admin/components/communications/AnnouncementForm.tsx:167`: `input`; non-text field
- `apps/admin/components/communications/AnnouncementForm.tsx:183`: `input`; non-text field
- `apps/admin/components/communications/AnnouncementsListView.tsx:54`: `input`; non-text field
- `apps/admin/components/communications/LetterWorkspace.tsx:116`: `select`; review label, expected format and validation
- `apps/admin/components/communications/LetterWorkspace.tsx:133`: `select`; review label, expected format and validation
- `apps/admin/components/communications/LetterWorkspace.tsx:149`: `Input`; review label, expected format and validation
- `apps/admin/components/communications/LetterWorkspace.tsx:192`: `Input`; review label, expected format and validation
- `apps/admin/components/communications/LetterWorkspace.tsx:202`: `input`; non-text field
- `apps/admin/components/communications/LetterWorkspace.tsx:229`: `Textarea`; review label, expected format and validation
- `apps/admin/components/communications/LetterWorkspace.tsx:236`: `Input`; review label, expected format and validation
- `apps/admin/components/communications/LetterWorkspace.tsx:248`: `Input`; non-text field
- `apps/admin/components/communications/LetterWorkspace.tsx:257`: `select`; review label, expected format and validation
- `apps/admin/components/communications/LetterWorkspace.tsx:276`: `input`; non-text field
- `apps/admin/components/communications/LetterWorkspace.tsx:439`: `Textarea`; review label, expected format and validation
- `apps/admin/components/communications/LetterWorkspace.tsx:453`: `input`; non-text field
- `apps/admin/components/communications/LetterWorkspace.tsx:463`: `input`; non-text field
- `apps/admin/components/company/NewCompanyDocumentFormView.tsx:117`: `Select`; review label, expected format and validation
- `apps/admin/components/company/NewCompanyDocumentFormView.tsx:159`: `Input`; non-text field
- `apps/admin/components/company/NewCompanyDocumentFormView.tsx:170`: `Input`; non-text field
- `apps/admin/components/crm/ClientAutocomplete.tsx:322`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientAutocomplete.tsx:335`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientAutocomplete.tsx:350`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientAutocomplete.tsx:366`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientAutocomplete.tsx:381`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientAutocomplete.tsx:427`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:143`: `Select`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:200`: `Select`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:234`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:238`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:241`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:244`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:248`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:257`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:260`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:265`: `Select`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:275`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:278`: `Input`; non-text field
- `apps/admin/components/crm/ClientProfileForm.tsx:287`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:295`: `Select`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:306`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:309`: `input`; non-text field
- `apps/admin/components/crm/ClientProfileForm.tsx:315`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:318`: `Select`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:326`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:376`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:379`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:382`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:385`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:388`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:391`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:406`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:409`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:412`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:415`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:418`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:424`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:427`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:430`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:435`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:438`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:446`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:455`: `Select`; review label, expected format and validation
- `apps/admin/components/crm/ClientProfileForm.tsx:462`: `textarea`; review label, expected format and validation
- `apps/admin/components/crm/ClientsListView.tsx:182`: `select`; review label, expected format and validation
- `apps/admin/components/crm/ClientsListView.tsx:188`: `select`; review label, expected format and validation
- `apps/admin/components/crm/ClientsListView.tsx:212`: `select`; review label, expected format and validation
- `apps/admin/components/crm/ClientsListView.tsx:218`: `select`; review label, expected format and validation
- `apps/admin/components/crm/ClientsListView.tsx:223`: `select`; review label, expected format and validation
- `apps/admin/components/crm/ClientsListView.tsx:227`: `select`; review label, expected format and validation
- `apps/admin/components/crm/ClientsListView.tsx:231`: `select`; review label, expected format and validation
- `apps/admin/components/crm/ClientsListView.tsx:235`: `select`; review label, expected format and validation
- `apps/admin/components/crm/DealEditFormView.tsx:161`: `select`; review label, expected format and validation
- `apps/admin/components/crm/DealEditFormView.tsx:168`: `Textarea`; review label, expected format and validation
- `apps/admin/components/crm/DealEditFormView.tsx:211`: `Select`; review label, expected format and validation
- `apps/admin/components/crm/DealEditFormView.tsx:227`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/DealEditFormView.tsx:242`: `Input`; review label, expected format and validation
- `apps/admin/components/crm/DealEditFormView.tsx:256`: `Input`; non-text field
- `apps/admin/components/crm/DealEditFormView.tsx:268`: `Input`; non-text field
- `apps/admin/components/crm/NewDealFormView.tsx:131`: `Select`; review label, expected format and validation
- `apps/admin/components/crm/NewDealFormView.tsx:146`: `Input`; non-text field
- `apps/admin/components/dashboard/DashboardBoard.tsx:148`: `Select`; review label, expected format and validation
- `apps/admin/components/dashboard/DepartmentDashboardView.tsx:43`: `Select`; review label, expected format and validation
- `apps/admin/components/delivery/AgenciesView.tsx:62`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/AgenciesView.tsx:65`: `Select`; review label, expected format and validation
- `apps/admin/components/delivery/AgenciesView.tsx:70`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/AgenciesView.tsx:71`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/AgenciesView.tsx:72`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/AgenciesView.tsx:73`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/AgenciesView.tsx:74`: `input`; non-text field
- `apps/admin/components/delivery/AgenciesView.tsx:138`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/AgenciesView.tsx:139`: `Input`; non-text field
- `apps/admin/components/delivery/AgenciesView.tsx:140`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/AgenciesView.tsx:146`: `input`; non-text field
- `apps/admin/components/delivery/CashSettlementView.tsx:93`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/CashSettlementView.tsx:94`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/DeliverySettingsView.tsx:57`: `Select`; review label, expected format and validation
- `apps/admin/components/delivery/DeliverySettingsView.tsx:62`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/DeliverySettingsView.tsx:64`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/DeliverySettingsView.tsx:65`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/DeliverySettingsView.tsx:67`: `input`; non-text field
- `apps/admin/components/delivery/DeliverySettingsView.tsx:93`: `Textarea`; review label, expected format and validation
- `apps/admin/components/delivery/DeliverySettingsView.tsx:94`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/DeliverySettingsView.tsx:95`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/DeliverySettingsView.tsx:96`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/DeliverySettingsView.tsx:97`: `input`; non-text field
- `apps/admin/components/delivery/DeliverySettingsView.tsx:165`: `input`; non-text field
- `apps/admin/components/delivery/DeliverySettingsView.tsx:171`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/DeliverySettingsView.tsx:172`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/DeliverySettingsView.tsx:173`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/DriverView.tsx:116`: `input`; non-text field
- `apps/admin/components/delivery/DriverView.tsx:122`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/DriverView.tsx:135`: `Select`; review label, expected format and validation
- `apps/admin/components/delivery/FleetView.tsx:56`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/FleetView.tsx:57`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/FleetView.tsx:60`: `Select`; review label, expected format and validation
- `apps/admin/components/delivery/FleetView.tsx:65`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/FleetView.tsx:66`: `input`; non-text field
- `apps/admin/components/delivery/RouteSheetsView.tsx:73`: `Input`; non-text field
- `apps/admin/components/delivery/RouteSheetsView.tsx:76`: `Select`; review label, expected format and validation
- `apps/admin/components/delivery/RouteSheetsView.tsx:83`: `Select`; review label, expected format and validation
- `apps/admin/components/delivery/RouteSheetsView.tsx:89`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/RouteSheetsView.tsx:100`: `input`; non-text field
- `apps/admin/components/delivery/ShipmentView.tsx:102`: `Select`; review label, expected format and validation
- `apps/admin/components/delivery/ShipmentView.tsx:107`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/ShipmentView.tsx:114`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/ShipmentView.tsx:143`: `Select`; review label, expected format and validation
- `apps/admin/components/delivery/ShipmentView.tsx:151`: `Select`; review label, expected format and validation
- `apps/admin/components/delivery/ShipmentView.tsx:201`: `Select`; review label, expected format and validation
- `apps/admin/components/delivery/ShipmentView.tsx:206`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/ShipmentView.tsx:227`: `Input`; review label, expected format and validation
- `apps/admin/components/delivery/ShipmentsListView.tsx:64`: `Select`; review label, expected format and validation
- `apps/admin/components/delivery/ShipmentsListView.tsx:69`: `Select`; review label, expected format and validation
- `apps/admin/components/delivery/ShipmentsListView.tsx:74`: `Input`; non-text field
- `apps/admin/components/directory/DirectoryView.tsx:68`: `select`; review label, expected format and validation
- `apps/admin/components/expenses/ExpenseCategoriesView.tsx:71`: `Input`; review label, expected format and validation
- `apps/admin/components/expenses/ExpenseCategoriesView.tsx:75`: `Input`; review label, expected format and validation
- `apps/admin/components/expenses/ExpenseCategoriesView.tsx:79`: `select`; review label, expected format and validation
- `apps/admin/components/expenses/ExpenseCategoriesView.tsx:85`: `input`; non-text field
- `apps/admin/components/expenses/ExpenseCategoriesView.tsx:107`: `input`; non-text field
- `apps/admin/components/expenses/ExpenseCategoriesView.tsx:108`: `input`; review label, expected format and validation
- `apps/admin/components/expenses/ExpenseCategoriesView.tsx:109`: `input`; review label, expected format and validation
- `apps/admin/components/expenses/ExpenseCategoriesView.tsx:110`: `select`; review label, expected format and validation
- `apps/admin/components/expenses/NewExpenseFormView.tsx:238`: `select`; review label, expected format and validation
- `apps/admin/components/expenses/NewExpenseFormView.tsx:261`: `Input`; non-text field
- `apps/admin/components/expenses/NewExpenseFormView.tsx:315`: `select`; review label, expected format and validation
- `apps/admin/components/expenses/NewExpenseFormView.tsx:338`: `Input`; review label, expected format and validation
- `apps/admin/components/expenses/NewExpenseFormView.tsx:351`: `input`; non-text field
- `apps/admin/components/expenses/NewExpenseFormView.tsx:378`: `select`; review label, expected format and validation
- `apps/admin/components/expenses/NewExpenseFormView.tsx:395`: `input`; non-text field
- `apps/admin/components/expenses/RecurringExpensesView.tsx:122`: `Input`; review label, expected format and validation
- `apps/admin/components/expenses/RecurringExpensesView.tsx:123`: `Input`; review label, expected format and validation
- `apps/admin/components/expenses/RecurringExpensesView.tsx:125`: `Select`; review label, expected format and validation
- `apps/admin/components/expenses/RecurringExpensesView.tsx:130`: `Input`; review label, expected format and validation
- `apps/admin/components/expenses/RecurringExpensesView.tsx:131`: `Input`; review label, expected format and validation
- `apps/admin/components/expenses/RecurringExpensesView.tsx:132`: `Input`; review label, expected format and validation
- `apps/admin/components/expenses/RecurringExpensesView.tsx:134`: `Input`; review label, expected format and validation
- `apps/admin/components/expenses/RecurringExpensesView.tsx:137`: `Select`; review label, expected format and validation
- `apps/admin/components/expenses/RecurringExpensesView.tsx:142`: `Select`; review label, expected format and validation
- `apps/admin/components/expenses/RecurringExpensesView.tsx:146`: `Input`; non-text field
- `apps/admin/components/expenses/RecurringExpensesView.tsx:147`: `Input`; non-text field
- `apps/admin/components/expenses/RecurringExpensesView.tsx:148`: `Input`; review label, expected format and validation
- `apps/admin/components/expenses/RecurringExpensesView.tsx:149`: `Input`; review label, expected format and validation
- `apps/admin/components/expenses/RecurringExpensesView.tsx:166`: `input`; non-text field
- `apps/admin/components/expenses/RecurringExpensesView.tsx:232`: `input`; review label, expected format and validation
- `apps/admin/components/finance/FinancialReportsView.tsx:156`: `input`; non-text field
- `apps/admin/components/finance/FinancialReportsView.tsx:163`: `input`; non-text field
- `apps/admin/components/gosi/GosiView.tsx:210`: `input`; non-text field
- `apps/admin/components/gosi/GosiView.tsx:235`: `Select`; review label, expected format and validation
- `apps/admin/components/gosi/GosiView.tsx:471`: `Input`; review label, expected format and validation
- `apps/admin/components/gosi/GosiView.tsx:482`: `Input`; review label, expected format and validation
- `apps/admin/components/gosi/GosiView.tsx:492`: `Input`; review label, expected format and validation
- `apps/admin/components/gosi/GosiView.tsx:502`: `Input`; review label, expected format and validation
- `apps/admin/components/gosi/GosiView.tsx:517`: `Input`; review label, expected format and validation
- `apps/admin/components/gosi/GosiView.tsx:532`: `Select`; review label, expected format and validation
- `apps/admin/components/gosi/GosiView.tsx:547`: `Input`; review label, expected format and validation
- `apps/admin/components/gosi/GosiView.tsx:560`: `Input`; review label, expected format and validation
- `apps/admin/components/gosi/GosiView.tsx:574`: `Input`; non-text field
- `apps/admin/components/gosi/GosiView.tsx:593`: `input`; non-text field
- `apps/admin/components/gosi/GosiView.tsx:617`: `Input`; review label, expected format and validation
- `apps/admin/components/gosi/GosiView.tsx:635`: `Input`; review label, expected format and validation
- `apps/admin/components/gosi/GosiView.tsx:656`: `Input`; review label, expected format and validation
- `apps/admin/components/gosi/GosiView.tsx:714`: `Input`; review label, expected format and validation
- `apps/admin/components/gosi/GosiView.tsx:749`: `Input`; non-text field
- `apps/admin/components/gosi/GosiView.tsx:981`: `Select`; review label, expected format and validation
- `apps/admin/components/gosi/GosiView.tsx:994`: `Input`; non-text field
- `apps/admin/components/gosi/GosiView.tsx:1005`: `Input`; review label, expected format and validation
- `apps/admin/components/gosi/GosiView.tsx:1015`: `Input`; review label, expected format and validation
- `apps/admin/components/gosi/GosiView.tsx:1061`: `input`; non-text field
- `apps/admin/components/gosi/GosiView.tsx:1069`: `Input`; review label, expected format and validation
- `apps/admin/components/gosi/GosiView.tsx:1084`: `Input`; review label, expected format and validation
- `apps/admin/components/gosi/GosiView.tsx:1099`: `Input`; review label, expected format and validation
- `apps/admin/components/gosi/GosiView.tsx:1119`: `Input`; review label, expected format and validation
- `apps/admin/components/handovers/HandoverWorkspaceView.tsx:312`: `Select`; review label, expected format and validation
- `apps/admin/components/handovers/HandoverWorkspaceView.tsx:332`: `input`; non-text field
- `apps/admin/components/handovers/HandoverWorkspaceView.tsx:371`: `Select`; review label, expected format and validation
- `apps/admin/components/handovers/HandoversListView.tsx:89`: `Select`; review label, expected format and validation
- `apps/admin/components/handovers/HandoversListView.tsx:96`: `Select`; review label, expected format and validation
- `apps/admin/components/handovers/HandoversListView.tsx:103`: `Input`; non-text field
- `apps/admin/components/handovers/HandoversListView.tsx:108`: `Input`; non-text field
- `apps/admin/components/handovers/HandoversListView.tsx:113`: `Input`; review label, expected format and validation
- `apps/admin/components/hr/AttendanceSheetView.tsx:116`: `select`; review label, expected format and validation
- `apps/admin/components/hr/AttendanceSheetView.tsx:127`: `input`; review label, expected format and validation
- `apps/admin/components/hr/AttendanceSheetView.tsx:131`: `input`; review label, expected format and validation
- `apps/admin/components/hr/AttendanceSheetView.tsx:152`: `select`; review label, expected format and validation
- `apps/admin/components/hr/AttendanceSheetView.tsx:162`: `input`; review label, expected format and validation
- `apps/admin/components/hr/CredentialFields.tsx:93`: `Select`; review label, expected format and validation
- `apps/admin/components/hr/CredentialFields.tsx:113`: `Select`; review label, expected format and validation
- `apps/admin/components/hr/CredentialFields.tsx:127`: `Input`; review label, expected format and validation
- `apps/admin/components/hr/CredentialFields.tsx:135`: `Input`; review label, expected format and validation
- `apps/admin/components/hr/CredentialFields.tsx:142`: `Select`; review label, expected format and validation
- `apps/admin/components/hr/CredentialFields.tsx:155`: `Input`; non-text field
- `apps/admin/components/hr/CredentialFields.tsx:162`: `Input`; non-text field
- `apps/admin/components/hr/CredentialFields.tsx:172`: `Input`; review label, expected format and validation
- `apps/admin/components/hr/CredentialFields.tsx:180`: `Input`; review label, expected format and validation
- `apps/admin/components/hr/CredentialFields.tsx:194`: `Select`; review label, expected format and validation
- `apps/admin/components/hr/CredentialFields.tsx:208`: `Input`; review label, expected format and validation
- `apps/admin/components/hr/CredentialFields.tsx:223`: `Select`; review label, expected format and validation
- `apps/admin/components/hr/CredentialFields.tsx:234`: `Input`; review label, expected format and validation
- `apps/admin/components/hr/EmployeeAttachments.tsx:88`: `input`; review label, expected format and validation
- `apps/admin/components/hr/EmployeeDetailView.tsx:206`: `input`; review label, expected format and validation
- `apps/admin/components/hr/EmployeeDetailView.tsx:219`: `input`; review label, expected format and validation
- `apps/admin/components/hr/EmployeeDetailView.tsx:232`: `select`; review label, expected format and validation
- `apps/admin/components/hr/EmployeeDetailView.tsx:250`: `select`; review label, expected format and validation
- `apps/admin/components/hr/EmployeeDetailView.tsx:266`: `input`; review label, expected format and validation
- `apps/admin/components/hr/EmployeeDetailView.tsx:278`: `input`; review label, expected format and validation
- `apps/admin/components/hr/EmployeeDetailView.tsx:299`: `input`; review label, expected format and validation
- `apps/admin/components/hr/EmployeeDetailView.tsx:312`: `input`; review label, expected format and validation
- `apps/admin/components/hr/EmployeeDetailView.tsx:325`: `input`; review label, expected format and validation
- `apps/admin/components/hr/EmployeeDetailView.tsx:340`: `input`; review label, expected format and validation
- `apps/admin/components/hr/EmployeeResidencyPanel.tsx:209`: `Select`; review label, expected format and validation
- `apps/admin/components/hr/EmployeeResidencyPanel.tsx:227`: `Input`; non-text field
- `apps/admin/components/hr/EmployeeResidencyPanel.tsx:239`: `Select`; review label, expected format and validation
- `apps/admin/components/hr/EmployeeResidencyPanel.tsx:258`: `Input`; review label, expected format and validation
- `apps/admin/components/hr/EmployeeResidencyPanel.tsx:272`: `Input`; non-text field
- `apps/admin/components/hr/EmployeeResidencyPanel.tsx:287`: `Input`; review label, expected format and validation
- `apps/admin/components/hr/EmployeeResidencyPanel.tsx:302`: `Select`; review label, expected format and validation
- `apps/admin/components/hr/EmployeeResidencyPanel.tsx:323`: `Input`; non-text field
- `apps/admin/components/hr/EmployeesListView.tsx:166`: `input`; review label, expected format and validation
- `apps/admin/components/hr/EmployeesListView.tsx:184`: `select`; review label, expected format and validation
- `apps/admin/components/hr/EmployeesListView.tsx:198`: `select`; review label, expected format and validation
- `apps/admin/components/hr/HrRequestsView.tsx:93`: `select`; review label, expected format and validation
- `apps/admin/components/hr/HrRequestsView.tsx:99`: `select`; review label, expected format and validation
- `apps/admin/components/hr/HrRequestsView.tsx:105`: `select`; review label, expected format and validation
- `apps/admin/components/hr/HrRequestsView.tsx:218`: `select`; review label, expected format and validation
- `apps/admin/components/hr/HrRequestsView.tsx:238`: `select`; review label, expected format and validation
- `apps/admin/components/hr/HrRequestsView.tsx:244`: `input`; non-text field
- `apps/admin/components/hr/HrRequestsView.tsx:247`: `input`; non-text field
- `apps/admin/components/hr/HrRequestsView.tsx:251`: `textarea`; review label, expected format and validation
- `apps/admin/components/hr/HrSettingsView.tsx:44`: `input`; non-text field
- `apps/admin/components/hr/HrSettingsView.tsx:83`: `input`; review label, expected format and validation
- `apps/admin/components/hr/HrSettingsView.tsx:124`: `input`; non-text field
- `apps/admin/components/hr/HrSettingsView.tsx:135`: `input`; review label, expected format and validation
- `apps/admin/components/hr/HrSettingsView.tsx:144`: `select`; review label, expected format and validation
- `apps/admin/components/hr/HrSettingsView.tsx:152`: `select`; review label, expected format and validation
- `apps/admin/components/hr/HrSettingsView.tsx:159`: `select`; review label, expected format and validation
- `apps/admin/components/hr/HrSettingsView.tsx:171`: `select`; review label, expected format and validation
- `apps/admin/components/hr/HrSettingsView.tsx:186`: `input`; non-text field
- `apps/admin/components/hr/HrSettingsView.tsx:195`: `input`; non-text field
- `apps/admin/components/hr/HrSettingsView.tsx:199`: `input`; non-text field
- `apps/admin/components/hr/HrSettingsView.tsx:243`: `input`; review label, expected format and validation
- `apps/admin/components/hr/HrSettingsView.tsx:249`: `input`; review label, expected format and validation
- `apps/admin/components/hr/HrSettingsView.tsx:250`: `input`; review label, expected format and validation
- `apps/admin/components/hr/HrSettingsView.tsx:251`: `input`; review label, expected format and validation
- `apps/admin/components/hr/HrSettingsView.tsx:256`: `select`; review label, expected format and validation
- `apps/admin/components/hr/HrSettingsView.tsx:276`: `input`; review label, expected format and validation
- `apps/admin/components/hr/HrSettingsView.tsx:277`: `input`; review label, expected format and validation
- `apps/admin/components/hr/HrSettingsView.tsx:290`: `input`; non-text field
- `apps/admin/components/hr/HrSettingsView.tsx:373`: `input`; non-text field
- `apps/admin/components/hr/HrSettingsView.tsx:374`: `input`; review label, expected format and validation
- `apps/admin/components/hr/HrSettingsView.tsx:375`: `input`; review label, expected format and validation
- `apps/admin/components/hr/HrSettingsView.tsx:455`: `input`; review label, expected format and validation
- `apps/admin/components/hr/HrSettingsView.tsx:456`: `input`; review label, expected format and validation
- `apps/admin/components/hr/HrSettingsView.tsx:457`: `input`; review label, expected format and validation
- `apps/admin/components/hr/HrSettingsView.tsx:462`: `select`; review label, expected format and validation
- `apps/admin/components/hr/HrSettingsView.tsx:467`: `input`; review label, expected format and validation
- `apps/admin/components/hr/HrSettingsView.tsx:470`: `input`; non-text field
- `apps/admin/components/hr/ImportPeopleView.tsx:118`: `input`; non-text field
- `apps/admin/components/hr/LeaveBalancesCard.tsx:94`: `select`; review label, expected format and validation
- `apps/admin/components/hr/LeaveBalancesCard.tsx:100`: `input`; review label, expected format and validation
- `apps/admin/components/hr/LeaveBalancesCard.tsx:104`: `input`; review label, expected format and validation
- `apps/admin/components/hr/LeaveManagementView.tsx:468`: `select`; review label, expected format and validation
- `apps/admin/components/hr/LeaveManagementView.tsx:487`: `select`; review label, expected format and validation
- `apps/admin/components/hr/LeaveManagementView.tsx:511`: `input`; non-text field
- `apps/admin/components/hr/LeaveManagementView.tsx:519`: `input`; review label, expected format and validation
- `apps/admin/components/hr/LeaveManagementView.tsx:529`: `input`; non-text field
- `apps/admin/components/hr/LeaveManagementView.tsx:542`: `input`; non-text field
- `apps/admin/components/hr/LeaveManagementView.tsx:575`: `textarea`; review label, expected format and validation
- `apps/admin/components/hr/LeaveManagementView.tsx:617`: `textarea`; review label, expected format and validation
- `apps/admin/components/hr/NewEmployeeFormView.tsx:182`: `input`; review label, expected format and validation
- `apps/admin/components/hr/NewEmployeeFormView.tsx:195`: `input`; review label, expected format and validation
- `apps/admin/components/hr/NewEmployeeFormView.tsx:209`: `input`; review label, expected format and validation
- `apps/admin/components/hr/NewEmployeeFormView.tsx:222`: `input`; review label, expected format and validation
- `apps/admin/components/hr/NewEmployeeFormView.tsx:236`: `input`; review label, expected format and validation
- `apps/admin/components/hr/NewEmployeeFormView.tsx:248`: `input`; review label, expected format and validation
- `apps/admin/components/hr/NewEmployeeFormView.tsx:260`: `input`; review label, expected format and validation
- `apps/admin/components/hr/NewEmployeeFormView.tsx:280`: `Select`; review label, expected format and validation
- `apps/admin/components/hr/NewEmployeeFormView.tsx:287`: `Input`; non-text field
- `apps/admin/components/hr/NewEmployeeFormView.tsx:291`: `Select`; review label, expected format and validation
- `apps/admin/components/hr/NewEmployeeFormView.tsx:299`: `Input`; non-text field
- `apps/admin/components/hr/NewEmployeeFormView.tsx:303`: `Input`; review label, expected format and validation
- `apps/admin/components/hr/NewEmployeeFormView.tsx:307`: `Select`; review label, expected format and validation
- `apps/admin/components/hr/NewEmployeeFormView.tsx:314`: `Input`; non-text field
- `apps/admin/components/hr/NewEmployeeFormView.tsx:341`: `input`; review label, expected format and validation
- `apps/admin/components/hr/NewEmployeeFormView.tsx:354`: `input`; review label, expected format and validation
- `apps/admin/components/hr/NewEmployeeFormView.tsx:368`: `select`; review label, expected format and validation
- `apps/admin/components/hr/NewEmployeeFormView.tsx:385`: `select`; review label, expected format and validation
- `apps/admin/components/hr/NewEmployeeFormView.tsx:400`: `input`; non-text field
- `apps/admin/components/hr/NewEmployeeFormView.tsx:430`: `input`; review label, expected format and validation
- `apps/admin/components/hr/NewEmployeeFormView.tsx:443`: `input`; review label, expected format and validation
- `apps/admin/components/hr/NewEmployeeFormView.tsx:456`: `input`; review label, expected format and validation
- `apps/admin/components/hr/NewEmployeeFormView.tsx:469`: `input`; review label, expected format and validation
- `apps/admin/components/hr/PayLinesEditor.tsx:47`: `select`; review label, expected format and validation
- `apps/admin/components/hr/PayrollItemView.tsx:303`: `input`; review label, expected format and validation
- `apps/admin/components/hr/PayrollItemView.tsx:328`: `select`; review label, expected format and validation
- `apps/admin/components/hr/PayrollItemView.tsx:334`: `input`; non-text field
- `apps/admin/components/hr/PayrollItemView.tsx:339`: `input`; review label, expected format and validation
- `apps/admin/components/hr/PayrollManagementView.tsx:530`: `select`; review label, expected format and validation
- `apps/admin/components/hr/PayrollManagementView.tsx:536`: `input`; review label, expected format and validation
- `apps/admin/components/hr/PayrollManagementView.tsx:564`: `select`; review label, expected format and validation
- `apps/admin/components/hr/PayrollManagementView.tsx:581`: `input`; review label, expected format and validation
- `apps/admin/components/hr/PayrollSettingsFields.tsx:35`: `select`; review label, expected format and validation
- `apps/admin/components/hr/PayrollSettingsFields.tsx:56`: `input`; review label, expected format and validation
- `apps/admin/components/hr/PayrollSettingsFields.tsx:90`: `input`; review label, expected format and validation
- `apps/admin/components/hr/PayrollSettingsFields.tsx:99`: `input`; review label, expected format and validation
- `apps/admin/components/hr/PayrollSettingsFields.tsx:110`: `select`; review label, expected format and validation
- `apps/admin/components/hr/PayrollSettingsFields.tsx:123`: `input`; review label, expected format and validation
- `apps/admin/components/hr/PayrollSettingsFields.tsx:133`: `input`; review label, expected format and validation
- `apps/admin/components/hr/PayrollSettingsFields.tsx:161`: `input`; review label, expected format and validation
- `apps/admin/components/hr/RecurringPayPanel.tsx:67`: `Select`; review label, expected format and validation
- `apps/admin/components/hr/RecurringPayPanel.tsx:73`: `Input`; review label, expected format and validation
- `apps/admin/components/hr/RecurringPayPanel.tsx:77`: `Input`; review label, expected format and validation
- `apps/admin/components/hr/RecurringPayPanel.tsx:81`: `Input`; review label, expected format and validation
- `apps/admin/components/hr/RecurringPayPanel.tsx:85`: `Input`; review label, expected format and validation
- `apps/admin/components/hr/RecurringPayPanel.tsx:89`: `input`; non-text field
- `apps/admin/components/hr/SalaryDocumentsView.tsx:284`: `input`; non-text field
- `apps/admin/components/hr/SupportClaimsPanel.tsx:128`: `input`; review label, expected format and validation
- `apps/admin/components/hr/SupportClaimsPanel.tsx:132`: `input`; non-text field
- `apps/admin/components/hr/SupportClaimsPanel.tsx:136`: `input`; review label, expected format and validation
- `apps/admin/components/inventory/InventoryStockView.tsx:84`: `Select`; review label, expected format and validation
- `apps/admin/components/inventory/InventoryStockView.tsx:88`: `Select`; review label, expected format and validation
- `apps/admin/components/inventory/ProductStockPanel.tsx:71`: `Select`; review label, expected format and validation
- `apps/admin/components/inventory/StockCountView.tsx:141`: `Input`; review label, expected format and validation
- `apps/admin/components/inventory/StockCountView.tsx:147`: `Select`; review label, expected format and validation
- `apps/admin/components/inventory/StockCountView.tsx:186`: `Input`; review label, expected format and validation
- `apps/admin/components/inventory/StockCountsView.tsx:77`: `Select`; review label, expected format and validation
- `apps/admin/components/inventory/StockCountsView.tsx:84`: `Select`; review label, expected format and validation
- `apps/admin/components/inventory/StockCountsView.tsx:93`: `Select`; review label, expected format and validation
- `apps/admin/components/inventory/StockCountsView.tsx:100`: `Input`; review label, expected format and validation
- `apps/admin/components/inventory/StockDialogs.tsx:83`: `Select`; review label, expected format and validation
- `apps/admin/components/inventory/StockDialogs.tsx:89`: `Input`; review label, expected format and validation
- `apps/admin/components/inventory/StockDialogs.tsx:94`: `Select`; review label, expected format and validation
- `apps/admin/components/inventory/StockDialogs.tsx:103`: `Input`; review label, expected format and validation
- `apps/admin/components/inventory/StockDialogs.tsx:109`: `Select`; review label, expected format and validation
- `apps/admin/components/inventory/StockDialogs.tsx:117`: `Input`; review label, expected format and validation
- `apps/admin/components/inventory/StockDialogs.tsx:122`: `Input`; non-text field
- `apps/admin/components/inventory/StockDialogs.tsx:126`: `Input`; review label, expected format and validation
- `apps/admin/components/inventory/StockDialogs.tsx:152`: `Select`; review label, expected format and validation
- `apps/admin/components/inventory/StockDialogs.tsx:165`: `Input`; review label, expected format and validation
- `apps/admin/components/inventory/StockDialogs.tsx:169`: `Input`; review label, expected format and validation
- `apps/admin/components/inventory/StockDialogs.tsx:173`: `Input`; review label, expected format and validation
- `apps/admin/components/inventory/StockMovementsView.tsx:46`: `Select`; review label, expected format and validation
- `apps/admin/components/inventory/StockMovementsView.tsx:50`: `Select`; review label, expected format and validation
- `apps/admin/components/inventory/StockMovementsView.tsx:54`: `Input`; non-text field
- `apps/admin/components/inventory/StockMovementsView.tsx:55`: `Input`; non-text field
- `apps/admin/components/inventory/WarehousesView.tsx:71`: `Input`; review label, expected format and validation
- `apps/admin/components/inventory/WarehousesView.tsx:74`: `Input`; review label, expected format and validation
- `apps/admin/components/inventory/WarehousesView.tsx:78`: `input`; non-text field
- `apps/admin/components/inventory/WarehousesView.tsx:150`: `Input`; review label, expected format and validation
- `apps/admin/components/inventory/WarehousesView.tsx:153`: `Input`; review label, expected format and validation
- `apps/admin/components/inventory/WarehousesView.tsx:156`: `input`; non-text field
- `apps/admin/components/invoices/InvoiceEditFormView.tsx:433`: `Select`; review label, expected format and validation
- `apps/admin/components/invoices/InvoiceEditFormView.tsx:450`: `Select`; review label, expected format and validation
- `apps/admin/components/invoices/InvoiceEditFormView.tsx:464`: `Input`; non-text field
- `apps/admin/components/invoices/InvoiceEditFormView.tsx:478`: `Input`; non-text field
- `apps/admin/components/invoices/InvoiceEditFormView.tsx:532`: `select`; review label, expected format and validation
- `apps/admin/components/invoices/InvoiceEditFormView.tsx:606`: `Input`; review label, expected format and validation
- `apps/admin/components/invoices/InvoiceEditFormView.tsx:622`: `Input`; review label, expected format and validation
- `apps/admin/components/invoices/InvoiceEditFormView.tsx:671`: `Select`; review label, expected format and validation
- `apps/admin/components/invoices/InvoiceEditFormView.tsx:687`: `Input`; review label, expected format and validation
- `apps/admin/components/invoices/NewInvoiceFormView.tsx:359`: `select`; review label, expected format and validation
- `apps/admin/components/invoices/NewInvoiceFormView.tsx:434`: `Select`; review label, expected format and validation
- `apps/admin/components/invoices/NewInvoiceFormView.tsx:451`: `Select`; review label, expected format and validation
- `apps/admin/components/invoices/NewInvoiceFormView.tsx:464`: `Select`; review label, expected format and validation
- `apps/admin/components/invoices/NewInvoiceFormView.tsx:477`: `Input`; non-text field
- `apps/admin/components/invoices/NewInvoiceFormView.tsx:488`: `Input`; non-text field
- `apps/admin/components/invoices/NewInvoiceFormView.tsx:528`: `Select`; review label, expected format and validation
- `apps/admin/components/invoices/NewInvoiceFormView.tsx:604`: `Input`; review label, expected format and validation
- `apps/admin/components/invoices/NewInvoiceFormView.tsx:620`: `Input`; review label, expected format and validation
- `apps/admin/components/invoices/NewInvoiceFormView.tsx:671`: `Select`; review label, expected format and validation
- `apps/admin/components/invoices/NewInvoiceFormView.tsx:688`: `Input`; review label, expected format and validation
- `apps/admin/components/layout/GlobalQuickJump.tsx:161`: `input`; review label, expected format and validation
- `apps/admin/components/moms/MomDetailView.tsx:690`: `input`; review label, expected format and validation
- `apps/admin/components/moms/MomDetailView.tsx:704`: `textarea`; review label, expected format and validation
- `apps/admin/components/moms/NewMomFormView.tsx:256`: `Input`; non-text field
- `apps/admin/components/moms/NewMomFormView.tsx:305`: `Select`; review label, expected format and validation
- `apps/admin/components/moms/NewMomFormView.tsx:360`: `input`; non-text field
- `apps/admin/components/moms/NewMomFormView.tsx:504`: `Input`; non-text field
- `apps/admin/components/moms/NewMomFormView.tsx:511`: `select`; review label, expected format and validation
- `apps/admin/components/orders/NewSaleView.tsx:134`: `Input`; review label, expected format and validation
- `apps/admin/components/orders/NewSaleView.tsx:146`: `Select`; review label, expected format and validation
- `apps/admin/components/orders/NewSaleView.tsx:152`: `Input`; review label, expected format and validation
- `apps/admin/components/orders/NewSaleView.tsx:153`: `Input`; review label, expected format and validation
- `apps/admin/components/orders/NewSaleView.tsx:154`: `Input`; review label, expected format and validation
- `apps/admin/components/orders/NewSaleView.tsx:158`: `Select`; review label, expected format and validation
- `apps/admin/components/orders/NewSaleView.tsx:166`: `Input`; review label, expected format and validation
- `apps/admin/components/orders/NewSaleView.tsx:170`: `Select`; review label, expected format and validation
- `apps/admin/components/orders/NewSaleView.tsx:178`: `Input`; review label, expected format and validation
- `apps/admin/components/orders/OrderView.tsx:133`: `Input`; review label, expected format and validation
- `apps/admin/components/orders/OrderView.tsx:136`: `Select`; review label, expected format and validation
- `apps/admin/components/orders/OrderView.tsx:141`: `Input`; review label, expected format and validation
- `apps/admin/components/orders/OrderView.tsx:147`: `input`; non-text field
- `apps/admin/components/orders/OrderView.tsx:167`: `Input`; review label, expected format and validation
- `apps/admin/components/orders/OrderView.tsx:168`: `Input`; review label, expected format and validation
- `apps/admin/components/orders/OrderView.tsx:179`: `Input`; review label, expected format and validation
- `apps/admin/components/orders/OrdersListView.tsx:56`: `Select`; review label, expected format and validation
- `apps/admin/components/orders/OrdersListView.tsx:60`: `Select`; review label, expected format and validation
- `apps/admin/components/orders/StoreSettingsView.tsx:64`: `input`; non-text field
- `apps/admin/components/orders/StoreSettingsView.tsx:82`: `Input`; review label, expected format and validation
- `apps/admin/components/orders/StoreSettingsView.tsx:83`: `Input`; review label, expected format and validation
- `apps/admin/components/orders/StoreSettingsView.tsx:89`: `Select`; review label, expected format and validation
- `apps/admin/components/orders/StoreSettingsView.tsx:98`: `Input`; review label, expected format and validation
- `apps/admin/components/orders/StoreSettingsView.tsx:120`: `Input`; review label, expected format and validation
- `apps/admin/components/orders/StoreSettingsView.tsx:123`: `Select`; review label, expected format and validation
- `apps/admin/components/orders/StoreSettingsView.tsx:129`: `Input`; review label, expected format and validation
- `apps/admin/components/orders/StoreSettingsView.tsx:130`: `Input`; review label, expected format and validation
- `apps/admin/components/orders/StoreSettingsView.tsx:131`: `Input`; non-text field
- `apps/admin/components/orders/StoreSettingsView.tsx:132`: `Input`; non-text field
- `apps/admin/components/orders/StoreSettingsView.tsx:133`: `Input`; review label, expected format and validation
- `apps/admin/components/orders/StoreSettingsView.tsx:134`: `input`; non-text field
- `apps/admin/components/outreach/AudienceView.tsx:40`: `Input`; review label, expected format and validation
- `apps/admin/components/outreach/AudienceView.tsx:57`: `Input`; review label, expected format and validation
- `apps/admin/components/outreach/AudienceView.tsx:62`: `Input`; review label, expected format and validation
- `apps/admin/components/outreach/AudienceView.tsx:91`: `Input`; review label, expected format and validation
- `apps/admin/components/outreach/AudienceView.tsx:94`: `Select`; review label, expected format and validation
- `apps/admin/components/outreach/AudienceView.tsx:101`: `Select`; review label, expected format and validation
- `apps/admin/components/outreach/CampaignsView.tsx:55`: `Input`; review label, expected format and validation
- `apps/admin/components/outreach/CampaignsView.tsx:58`: `Select`; review label, expected format and validation
- `apps/admin/components/outreach/CampaignsView.tsx:65`: `Select`; review label, expected format and validation
- `apps/admin/components/outreach/CampaignsView.tsx:70`: `Input`; non-text field
- `apps/admin/components/outreach/CampaignsView.tsx:71`: `Input`; non-text field
- `apps/admin/components/outreach/CampaignsView.tsx:72`: `Input`; review label, expected format and validation
- `apps/admin/components/outreach/CampaignsView.tsx:73`: `Input`; review label, expected format and validation
- `apps/admin/components/outreach/CampaignsView.tsx:74`: `Input`; review label, expected format and validation
- `apps/admin/components/outreach/CampaignsView.tsx:75`: `Input`; review label, expected format and validation
- `apps/admin/components/outreach/CampaignsView.tsx:76`: `Textarea`; review label, expected format and validation
- `apps/admin/components/outreach/CampaignsView.tsx:135`: `Input`; review label, expected format and validation
- `apps/admin/components/outreach/CampaignsView.tsx:141`: `Input`; review label, expected format and validation
- `apps/admin/components/outreach/LegalView.tsx:42`: `Input`; review label, expected format and validation
- `apps/admin/components/outreach/LegalView.tsx:45`: `Select`; review label, expected format and validation
- `apps/admin/components/outreach/LegalView.tsx:50`: `Input`; review label, expected format and validation
- `apps/admin/components/outreach/LegalView.tsx:51`: `Input`; review label, expected format and validation
- `apps/admin/components/outreach/LegalView.tsx:54`: `Select`; review label, expected format and validation
- `apps/admin/components/outreach/LegalView.tsx:59`: `Input`; non-text field
- `apps/admin/components/outreach/LegalView.tsx:62`: `Select`; review label, expected format and validation
- `apps/admin/components/outreach/LegalView.tsx:68`: `Input`; review label, expected format and validation
- `apps/admin/components/outreach/LegalView.tsx:69`: `Textarea`; review label, expected format and validation
- `apps/admin/components/outreach/LegalView.tsx:70`: `Textarea`; review label, expected format and validation
- `apps/admin/components/outreach/PressView.tsx:85`: `Input`; review label, expected format and validation
- `apps/admin/components/outreach/PressView.tsx:86`: `Input`; review label, expected format and validation
- `apps/admin/components/outreach/PressView.tsx:87`: `Input`; review label, expected format and validation
- `apps/admin/components/outreach/PressView.tsx:88`: `Input`; non-text field
- `apps/admin/components/outreach/PressView.tsx:89`: `Input`; review label, expected format and validation
- `apps/admin/components/outreach/PressView.tsx:92`: `Select`; review label, expected format and validation
- `apps/admin/components/outreach/PressView.tsx:99`: `Select`; review label, expected format and validation
- `apps/admin/components/outreach/PressView.tsx:105`: `Input`; review label, expected format and validation
- `apps/admin/components/outreach/PressView.tsx:139`: `Input`; review label, expected format and validation
- `apps/admin/components/outreach/PressView.tsx:141`: `Textarea`; review label, expected format and validation
- `apps/admin/components/outreach/PressView.tsx:142`: `input`; non-text field
- `apps/admin/components/payments/NewPaymentFormView.tsx:377`: `Input`; non-text field
- `apps/admin/components/payments/NewPaymentFormView.tsx:388`: `Select`; review label, expected format and validation
- `apps/admin/components/payments/NewPaymentFormView.tsx:453`: `input`; non-text field
- `apps/admin/components/payments/NewPaymentFormView.tsx:549`: `input`; non-text field
- `apps/admin/components/payments/NewPaymentFormView.tsx:647`: `input`; non-text field
- `apps/admin/components/payments/PaymentDetailView.tsx:210`: `input`; non-text field
- `apps/admin/components/payments/PaymentRecorder.tsx:109`: `Input`; review label, expected format and validation
- `apps/admin/components/payments/PaymentRecorder.tsx:128`: `Select`; review label, expected format and validation
- `apps/admin/components/payments/PaymentRecorder.tsx:146`: `Input`; non-text field
- `apps/admin/components/procurement/LinesEditor.tsx:42`: `Select`; review label, expected format and validation
- `apps/admin/components/procurement/LinesEditor.tsx:47`: `Select`; review label, expected format and validation
- `apps/admin/components/procurement/LinesEditor.tsx:53`: `Input`; review label, expected format and validation
- `apps/admin/components/procurement/PurchaseOrderView.tsx:161`: `Select`; review label, expected format and validation
- `apps/admin/components/procurement/PurchaseOrderView.tsx:167`: `Input`; non-text field
- `apps/admin/components/procurement/PurchaseOrderView.tsx:170`: `Input`; non-text field
- `apps/admin/components/procurement/PurchaseOrderView.tsx:174`: `Select`; review label, expected format and validation
- `apps/admin/components/procurement/PurchaseOrderView.tsx:180`: `Input`; review label, expected format and validation
- `apps/admin/components/procurement/PurchaseOrderView.tsx:183`: `Input`; review label, expected format and validation
- `apps/admin/components/procurement/PurchaseOrderView.tsx:186`: `input`; non-text field
- `apps/admin/components/procurement/PurchaseOrdersListView.tsx:54`: `Select`; review label, expected format and validation
- `apps/admin/components/procurement/ReceiveGoodsPanel.tsx:49`: `Select`; review label, expected format and validation
- `apps/admin/components/procurement/ReceiveGoodsPanel.tsx:55`: `Input`; review label, expected format and validation
- `apps/admin/components/procurement/ReceiveGoodsPanel.tsx:71`: `Select`; review label, expected format and validation
- `apps/admin/components/procurement/ReceiveGoodsPanel.tsx:80`: `Input`; non-text field
- `apps/admin/components/procurement/RequisitionView.tsx:105`: `Input`; non-text field
- `apps/admin/components/procurement/RequisitionView.tsx:108`: `Input`; review label, expected format and validation
- `apps/admin/components/procurement/RfqView.tsx:99`: `Select`; review label, expected format and validation
- `apps/admin/components/procurement/RfqView.tsx:157`: `input`; non-text field
- `apps/admin/components/procurement/RfqsListView.tsx:66`: `Input`; review label, expected format and validation
- `apps/admin/components/procurement/RfqsListView.tsx:69`: `Input`; non-text field
- `apps/admin/components/procurement/SupplierBillView.tsx:117`: `Select`; review label, expected format and validation
- `apps/admin/components/procurement/SupplierBillView.tsx:123`: `Input`; review label, expected format and validation
- `apps/admin/components/procurement/SupplierBillView.tsx:126`: `Input`; non-text field
- `apps/admin/components/procurement/SupplierBillView.tsx:129`: `Input`; non-text field
- `apps/admin/components/procurement/SupplierBillView.tsx:132`: `Input`; review label, expected format and validation
- `apps/admin/components/procurement/SupplierBillView.tsx:135`: `Input`; review label, expected format and validation
- `apps/admin/components/procurement/SupplierBillView.tsx:145`: `input`; non-text field
- `apps/admin/components/procurement/SupplierBillView.tsx:166`: `Input`; review label, expected format and validation
- `apps/admin/components/procurement/SupplierBillView.tsx:167`: `Input`; review label, expected format and validation
- `apps/admin/components/procurement/SupplierBillView.tsx:168`: `Input`; review label, expected format and validation
- `apps/admin/components/procurement/SupplierBillView.tsx:235`: `Input`; review label, expected format and validation
- `apps/admin/components/procurement/SupplierBillView.tsx:257`: `Input`; review label, expected format and validation
- `apps/admin/components/procurement/SupplierBillView.tsx:258`: `Input`; non-text field
- `apps/admin/components/procurement/SupplierBillView.tsx:261`: `Select`; review label, expected format and validation
- `apps/admin/components/procurement/SupplierBillView.tsx:266`: `Input`; review label, expected format and validation
- `apps/admin/components/procurement/SupplierBillsListView.tsx:43`: `Select`; review label, expected format and validation
- `apps/admin/components/procurement/SuppliersView.tsx:45`: `Input`; review label, expected format and validation
- `apps/admin/components/products/ProductCategoriesView.tsx:70`: `Select`; review label, expected format and validation
- `apps/admin/components/products/ProductCategoriesView.tsx:77`: `input`; non-text field
- `apps/admin/components/products/ProductEditorView.tsx:176`: `Input`; review label, expected format and validation
- `apps/admin/components/products/ProductEditorView.tsx:179`: `Input`; review label, expected format and validation
- `apps/admin/components/products/ProductEditorView.tsx:183`: `Select`; review label, expected format and validation
- `apps/admin/components/products/ProductEditorView.tsx:190`: `Input`; review label, expected format and validation
- `apps/admin/components/products/ProductEditorView.tsx:194`: `Select`; review label, expected format and validation
- `apps/admin/components/products/ProductEditorView.tsx:207`: `Input`; review label, expected format and validation
- `apps/admin/components/products/ProductEditorView.tsx:210`: `Input`; review label, expected format and validation
- `apps/admin/components/products/ProductEditorView.tsx:215`: `input`; non-text field
- `apps/admin/components/products/ProductEditorView.tsx:315`: `Input`; review label, expected format and validation
- `apps/admin/components/products/ProductEditorView.tsx:316`: `Input`; review label, expected format and validation
- `apps/admin/components/products/ProductEditorView.tsx:319`: `input`; non-text field
- `apps/admin/components/products/ProductsListView.tsx:87`: `Select`; review label, expected format and validation
- `apps/admin/components/products/ProductsListView.tsx:91`: `Select`; review label, expected format and validation
- `apps/admin/components/products/ProductsListView.tsx:121`: `input`; non-text field
- `apps/admin/components/products/ProductsListView.tsx:138`: `input`; non-text field
- `apps/admin/components/profile/ProfileSecurityView.tsx:109`: `Input`; review label, expected format and validation
- `apps/admin/components/profile/ProfileSecurityView.tsx:122`: `Input`; review label, expected format and validation
- `apps/admin/components/profile/ProfileSecurityView.tsx:136`: `Input`; review label, expected format and validation
- `apps/admin/components/profile/ProfileSecurityView.tsx:147`: `Input`; review label, expected format and validation
- `apps/admin/components/profile/UserProfileView.tsx:255`: `input`; review label, expected format and validation
- `apps/admin/components/profile/UserProfileView.tsx:324`: `input`; review label, expected format and validation
- `apps/admin/components/profile/UserProfileView.tsx:347`: `input`; review label, expected format and validation
- `apps/admin/components/profile/UserProfileView.tsx:371`: `textarea`; review label, expected format and validation
- `apps/admin/components/quotations/NewQuotationFormView.tsx:420`: `select`; review label, expected format and validation
- `apps/admin/components/quotations/NewQuotationFormView.tsx:440`: `input`; review label, expected format and validation
- `apps/admin/components/quotations/NewQuotationFormView.tsx:453`: `input`; review label, expected format and validation
- `apps/admin/components/quotations/NewQuotationFormView.tsx:469`: `input`; review label, expected format and validation
- `apps/admin/components/quotations/NewQuotationFormView.tsx:482`: `input`; review label, expected format and validation
- `apps/admin/components/quotations/NewQuotationFormView.tsx:515`: `textarea`; review label, expected format and validation
- `apps/admin/components/quotations/NewQuotationFormView.tsx:526`: `textarea`; review label, expected format and validation
- `apps/admin/components/quotations/NewQuotationFormView.tsx:551`: `select`; review label, expected format and validation
- `apps/admin/components/quotations/NewQuotationFormView.tsx:569`: `input`; review label, expected format and validation
- `apps/admin/components/quotations/NewQuotationFormView.tsx:585`: `select`; review label, expected format and validation
- `apps/admin/components/quotations/NewQuotationFormView.tsx:599`: `select`; review label, expected format and validation
- `apps/admin/components/quotations/NewQuotationFormView.tsx:662`: `select`; review label, expected format and validation
- `apps/admin/components/quotations/NewQuotationFormView.tsx:672`: `input`; review label, expected format and validation
- `apps/admin/components/quotations/QuotationDetailView.tsx:707`: `textarea`; review label, expected format and validation
- `apps/admin/components/quotations/QuotationDetailView.tsx:730`: `select`; review label, expected format and validation
- `apps/admin/components/quotations/QuotationDetailView.tsx:771`: `textarea`; review label, expected format and validation
- `apps/admin/components/quotations/QuotationDetailView.tsx:794`: `input`; review label, expected format and validation
- `apps/admin/components/reports/ReportView.tsx:85`: `Input`; non-text field
- `apps/admin/components/reports/ReportView.tsx:86`: `Input`; non-text field
- `apps/admin/components/reports/ReportView.tsx:95`: `input`; non-text field
- `apps/admin/components/reports/ReportView.tsx:218`: `Select`; review label, expected format and validation
- `apps/admin/components/reports/ReportView.tsx:225`: `Select`; review label, expected format and validation
- `apps/admin/components/reports/ReportView.tsx:230`: `Input`; review label, expected format and validation
- `apps/admin/components/reports/ReportView.tsx:231`: `input`; non-text field
- `apps/admin/components/requests/NewRequestFormView.tsx:259`: `select`; review label, expected format and validation
- `apps/admin/components/requests/NewRequestFormView.tsx:281`: `input`; non-text field
- `apps/admin/components/requests/NewRequestFormView.tsx:327`: `input`; review label, expected format and validation
- `apps/admin/components/requests/NewRequestFormView.tsx:346`: `input`; review label, expected format and validation
- `apps/admin/components/requests/NewRequestFormView.tsx:364`: `input`; review label, expected format and validation
- `apps/admin/components/requests/NewRequestFormView.tsx:381`: `input`; review label, expected format and validation
- `apps/admin/components/requests/NewRequestFormView.tsx:436`: `input`; review label, expected format and validation
- `apps/admin/components/requests/NewRequestFormView.tsx:449`: `input`; review label, expected format and validation
- `apps/admin/components/requests/NewRequestFormView.tsx:465`: `textarea`; review label, expected format and validation
- `apps/admin/components/requests/NewRequestFormView.tsx:492`: `select`; review label, expected format and validation
- `apps/admin/components/requests/NewRequestFormView.tsx:519`: `select`; review label, expected format and validation
- `apps/admin/components/requests/RequestDetailView.tsx:687`: `textarea`; review label, expected format and validation
- `apps/admin/components/requests/RequestDetailView.tsx:700`: `input`; non-text field
- `apps/admin/components/requests/RequestDetailView.tsx:959`: `select`; review label, expected format and validation
- `apps/admin/components/requests/RequestDetailView.tsx:976`: `select`; review label, expected format and validation
- `apps/admin/components/requests/RequestDetailView.tsx:1002`: `textarea`; review label, expected format and validation
- `apps/admin/components/requests/RequestManagePanel.tsx:65`: `select`; review label, expected format and validation
- `apps/admin/components/requests/RequestManagePanel.tsx:71`: `input`; non-text field
- `apps/admin/components/requests/RequestManagePanel.tsx:85`: `select`; review label, expected format and validation
- `apps/admin/components/requests/RequestsInboxView.tsx:127`: `input`; non-text field
- `apps/admin/components/requests/RequestsInboxView.tsx:133`: `select`; review label, expected format and validation
- `apps/admin/components/requests/RequestsInboxView.tsx:137`: `select`; review label, expected format and validation
- `apps/admin/components/requests/RequestsInboxView.tsx:142`: `select`; review label, expected format and validation
- `apps/admin/components/requests/RequestsInboxView.tsx:147`: `select`; review label, expected format and validation
- `apps/admin/components/requests/RequestsInboxView.tsx:165`: `select`; review label, expected format and validation
- `apps/admin/components/requests/RequestsInboxView.tsx:169`: `select`; review label, expected format and validation
- `apps/admin/components/requests/RequestsInboxView.tsx:173`: `select`; review label, expected format and validation
- `apps/admin/components/requests/RequestsInboxView.tsx:177`: `select`; review label, expected format and validation
- `apps/admin/components/requests/RequestsInboxView.tsx:181`: `select`; review label, expected format and validation
- `apps/admin/components/requests/RequestsInboxView.tsx:187`: `input`; non-text field
- `apps/admin/components/requests/RequestsInboxView.tsx:191`: `input`; non-text field
- `apps/admin/components/requests/ServiceReplyPanel.tsx:72`: `Select`; review label, expected format and validation
- `apps/admin/components/requests/ServiceSettingsView.tsx:49`: `Input`; review label, expected format and validation
- `apps/admin/components/requests/ServiceSettingsView.tsx:67`: `Input`; review label, expected format and validation
- `apps/admin/components/requests/ServiceSettingsView.tsx:69`: `input`; non-text field
- `apps/admin/components/sales/AttributionPanel.tsx:72`: `select`; review label, expected format and validation
- `apps/admin/components/sales/CommissionsView.tsx:62`: `input`; review label, expected format and validation
- `apps/admin/components/services/ServicesManagementView.tsx:273`: `input`; review label, expected format and validation
- `apps/admin/components/services/ServicesManagementView.tsx:284`: `select`; review label, expected format and validation
- `apps/admin/components/services/ServicesManagementView.tsx:440`: `select`; review label, expected format and validation
- `apps/admin/components/services/ServicesManagementView.tsx:487`: `select`; review label, expected format and validation
- `apps/admin/components/services/ServicesManagementView.tsx:514`: `input`; non-text field
- `apps/admin/components/settings/ApprovalPoliciesView.tsx:63`: `select`; review label, expected format and validation
- `apps/admin/components/settings/ApprovalPoliciesView.tsx:74`: `select`; review label, expected format and validation
- `apps/admin/components/settings/ApprovalPoliciesView.tsx:80`: `select`; review label, expected format and validation
- `apps/admin/components/settings/ApprovalPoliciesView.tsx:86`: `select`; review label, expected format and validation
- `apps/admin/components/settings/ApprovalPoliciesView.tsx:129`: `input`; non-text field
- `apps/admin/components/settings/ApprovalPoliciesView.tsx:148`: `input`; review label, expected format and validation
- `apps/admin/components/settings/ApprovalPoliciesView.tsx:157`: `select`; review label, expected format and validation
- `apps/admin/components/settings/ApprovalPoliciesView.tsx:167`: `select`; review label, expected format and validation
- `apps/admin/components/settings/ApprovalPoliciesView.tsx:172`: `select`; review label, expected format and validation
- `apps/admin/components/settings/ApprovalPoliciesView.tsx:246`: `input`; non-text field
- `apps/admin/components/settings/ApprovalPoliciesView.tsx:297`: `input`; non-text field
- `apps/admin/components/settings/ApprovalPoliciesView.tsx:334`: `input`; non-text field
- `apps/admin/components/settings/AuditSessionsView.tsx:224`: `select`; review label, expected format and validation
- `apps/admin/components/settings/AuditSessionsView.tsx:239`: `select`; review label, expected format and validation
- `apps/admin/components/settings/CalendarSyncCard.tsx:117`: `input`; non-text field
- `apps/admin/components/settings/CalendarSyncCard.tsx:141`: `input`; non-text field
- `apps/admin/components/settings/CalendarSyncCard.tsx:163`: `input`; review label, expected format and validation
- `apps/admin/components/settings/DepartmentsSettingsView.tsx:80`: `select`; review label, expected format and validation
- `apps/admin/components/settings/DepartmentsSettingsView.tsx:95`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/DepartmentsSettingsView.tsx:107`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/DepartmentsSettingsView.tsx:110`: `input`; non-text field
- `apps/admin/components/settings/IntegrationsView.tsx:261`: `input`; non-text field
- `apps/admin/components/settings/PipelineSettingsView.tsx:179`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/PipelineSettingsView.tsx:183`: `input`; non-text field
- `apps/admin/components/settings/PipelineSettingsView.tsx:186`: `input`; non-text field
- `apps/admin/components/settings/PipelineSettingsView.tsx:207`: `select`; review label, expected format and validation
- `apps/admin/components/settings/RolesManagementView.tsx:157`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/RolesManagementView.tsx:161`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/RolesManagementView.tsx:177`: `select`; review label, expected format and validation
- `apps/admin/components/settings/RolesManagementView.tsx:216`: `input`; non-text field
- `apps/admin/components/settings/SecuritySettingsView.tsx:121`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/SecuritySettingsView.tsx:163`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/WebSettingsView.tsx:317`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/WebSettingsView.tsx:332`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/WebSettingsView.tsx:385`: `textarea`; review label, expected format and validation
- `apps/admin/components/settings/WebSettingsView.tsx:483`: `Textarea`; review label, expected format and validation
- `apps/admin/components/settings/WebSettingsView.tsx:497`: `Textarea`; review label, expected format and validation
- `apps/admin/components/settings/WebSettingsView.tsx:512`: `Textarea`; review label, expected format and validation
- `apps/admin/components/settings/WebSettingsView.tsx:526`: `Textarea`; review label, expected format and validation
- `apps/admin/components/settings/WebSettingsView.tsx:565`: `Textarea`; review label, expected format and validation
- `apps/admin/components/settings/WebSettingsView.tsx:578`: `Textarea`; review label, expected format and validation
- `apps/admin/components/settings/WebSettingsView.tsx:592`: `Textarea`; review label, expected format and validation
- `apps/admin/components/settings/WebSettingsView.tsx:605`: `Textarea`; review label, expected format and validation
- `apps/admin/components/settings/WebSettingsView.tsx:788`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/WebSettingsView.tsx:802`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/WebSettingsView.tsx:816`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/WebSettingsView.tsx:829`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/BankCoordinatesTab.tsx:46`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/BankCoordinatesTab.tsx:60`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/BankCoordinatesTab.tsx:74`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/BankCoordinatesTab.tsx:91`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/BrandAssetsTab.tsx:355`: `input`; review label, expected format and validation
- `apps/admin/components/settings/company/CustomTaxesPanel.tsx:227`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/CustomTaxesPanel.tsx:238`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/CustomTaxesPanel.tsx:249`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/CustomTaxesPanel.tsx:262`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/CustomTaxesPanel.tsx:272`: `Input`; non-text field
- `apps/admin/components/settings/company/CustomTaxesPanel.tsx:297`: `input`; non-text field
- `apps/admin/components/settings/company/CustomTaxesPanel.tsx:305`: `input`; non-text field
- `apps/admin/components/settings/company/CustomTaxesPanel.tsx:313`: `input`; non-text field
- `apps/admin/components/settings/company/GeneralInfoTab.tsx:50`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/GeneralInfoTab.tsx:63`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/GeneralInfoTab.tsx:76`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/GeneralInfoTab.tsx:89`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/GeneralInfoTab.tsx:100`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/GeneralInfoTab.tsx:113`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/GeneralInfoTab.tsx:145`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/GeneralInfoTab.tsx:158`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/GeneralInfoTab.tsx:171`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/GeneralInfoTab.tsx:185`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/InvoiceReceiptSequencesTab.tsx:56`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/InvoiceReceiptSequencesTab.tsx:70`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/InvoiceReceiptSequencesTab.tsx:107`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/InvoiceReceiptSequencesTab.tsx:121`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/InvoiceReceiptSequencesTab.tsx:159`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/SalesDiscountsTab.tsx:37`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/SalesDiscountsTab.tsx:52`: `input`; non-text field
- `apps/admin/components/settings/company/TaxVatSettingsTab.tsx:147`: `Input`; review label, expected format and validation
- `apps/admin/components/settings/company/TaxVatSettingsTab.tsx:161`: `Input`; review label, expected format and validation
- `apps/admin/components/settlements/NewSettlementForm.tsx:85`: `Select`; review label, expected format and validation
- `apps/admin/components/settlements/NewSettlementForm.tsx:102`: `Select`; review label, expected format and validation
- `apps/admin/components/settlements/NewSettlementForm.tsx:115`: `Input`; non-text field
- `apps/admin/components/settlements/NewSettlementForm.tsx:126`: `Input`; review label, expected format and validation
- `apps/admin/components/settlements/SettlementDetailView.tsx:366`: `Input`; non-text field
- `apps/admin/components/settlements/SettlementDetailView.tsx:378`: `Select`; review label, expected format and validation
- `apps/admin/components/settlements/SettlementDetailView.tsx:463`: `Select`; review label, expected format and validation
- `apps/admin/components/settlements/SettlementDetailView.tsx:479`: `Select`; review label, expected format and validation
- `apps/admin/components/settlements/SettlementDetailView.tsx:503`: `Input`; review label, expected format and validation
- `apps/admin/components/settlements/SettlementDetailView.tsx:635`: `Input`; review label, expected format and validation
- `apps/admin/components/settlements/SettlementDetailView.tsx:714`: `Select`; review label, expected format and validation
- `apps/admin/components/settlements/SettlementDetailView.tsx:731`: `Input`; review label, expected format and validation
- `apps/admin/components/settlements/SettlementDetailView.tsx:742`: `Input`; non-text field
- `apps/admin/components/settlements/SettlementsListView.tsx:143`: `input`; non-text field
- `apps/admin/components/settlements/SettlementsListView.tsx:153`: `Select`; review label, expected format and validation
- `apps/admin/components/settlements/SettlementsListView.tsx:168`: `Input`; review label, expected format and validation
- `apps/admin/components/settlements/SettlementsListView.tsx:181`: `Input`; review label, expected format and validation
- `apps/admin/components/settlements/SettlementsListView.tsx:195`: `Input`; review label, expected format and validation
- `apps/admin/components/settlements/SettlementsListView.tsx:209`: `Input`; review label, expected format and validation
- `apps/admin/components/settlements/SettlementsListView.tsx:222`: `Input`; non-text field
- `apps/admin/components/settlements/SettlementsListView.tsx:235`: `Select`; review label, expected format and validation
- `apps/admin/components/settlements/SettlementsListView.tsx:257`: `input`; non-text field
- `apps/admin/components/setup/LanguageFields.tsx:119`: `Textarea`; review label, expected format and validation
- `apps/admin/components/setup/LanguageFields.tsx:119`: `Input`; review label, expected format and validation
- `apps/admin/components/setup/SetupWizard.tsx:374`: `Select`; review label, expected format and validation
- `apps/admin/components/setup/SetupWizard.tsx:470`: `input`; non-text field
- `apps/admin/components/setup/SetupWizard.tsx:513`: `input`; non-text field
- `apps/admin/components/setup/SetupWizard.tsx:523`: `input`; non-text field
- `apps/admin/components/setup/SetupWizard.tsx:539`: `Select`; review label, expected format and validation
- `apps/admin/components/setup/SetupWizard.tsx:545`: `Input`; review label, expected format and validation
- `apps/admin/components/setup/SetupWizard.tsx:550`: `input`; non-text field
- `apps/admin/components/setup/SetupWizard.tsx:556`: `Input`; review label, expected format and validation
- `apps/admin/components/setup/SetupWizard.tsx:566`: `Input`; review label, expected format and validation
- `apps/admin/components/setup/SetupWizard.tsx:569`: `Input`; review label, expected format and validation
- `apps/admin/components/setup/SetupWizard.tsx:572`: `Input`; review label, expected format and validation
- `apps/admin/components/setup/SetupWizard.tsx:575`: `Input`; review label, expected format and validation
- `apps/admin/components/setup/SetupWizard.tsx:588`: `input`; non-text field
- `apps/admin/components/setup/SetupWizard.tsx:614`: `input`; non-text field
- `apps/admin/components/setup/ThemeEditor.tsx:113`: `input`; non-text field
- `apps/admin/components/setup/ThemeEditor.tsx:120`: `Input`; review label, expected format and validation
- `apps/admin/components/setup/ThemeEditor.tsx:258`: `Input`; review label, expected format and validation
- `apps/admin/components/setup/ThemeEditor.tsx:271`: `Select`; review label, expected format and validation
- `apps/admin/components/setup/ThemeEditor.tsx:275`: `input`; non-text field
- `apps/admin/components/setup/ThemeEditor.tsx:332`: `Select`; review label, expected format and validation
- `apps/admin/components/setup/WebsiteSetupFields.tsx:35`: `input`; non-text field
- `apps/admin/components/setup/WebsiteSetupFields.tsx:162`: `Input`; review label, expected format and validation
- `apps/admin/components/setup/WebsiteSetupFields.tsx:175`: `Select`; review label, expected format and validation
- `apps/admin/components/shared/AccountSettingsDialog.tsx:121`: `select`; review label, expected format and validation
- `apps/admin/components/shared/AccountSettingsDialog.tsx:129`: `select`; review label, expected format and validation
- `apps/admin/components/shared/AccountSettingsDialog.tsx:138`: `select`; review label, expected format and validation
- `apps/admin/components/shared/AccountSettingsDialog.tsx:146`: `input`; review label, expected format and validation
- `apps/admin/components/shared/AccountSettingsDialog.tsx:191`: `input`; review label, expected format and validation
- `apps/admin/components/shared/AssetUrlInput.tsx:55`: `Input`; review label, expected format and validation
- `apps/admin/components/shared/AssetUrlInput.tsx:83`: `input`; non-text field
- `apps/admin/components/shared/ClientSignaturePanel.tsx:288`: `input`; review label, expected format and validation
- `apps/admin/components/shared/ClientSignaturePanel.tsx:348`: `input`; review label, expected format and validation
- `apps/admin/components/shared/ClientSignaturePanel.tsx:361`: `input`; review label, expected format and validation
- `apps/admin/components/shared/ClientSignaturePanel.tsx:449`: `input`; review label, expected format and validation
- `apps/admin/components/shared/ClientSignaturePanel.tsx:461`: `input`; review label, expected format and validation
- `apps/admin/components/shared/ClientSignaturePanel.tsx:472`: `input`; non-text field
- `apps/admin/components/shared/LinkOrUploadField.tsx:164`: `input`; non-text field
- `apps/admin/components/shared/ListControls.tsx:49`: `input`; non-text field
- `apps/admin/components/shared/ListControls.tsx:64`: `input`; non-text field
- `apps/admin/components/shared/ListControls.tsx:67`: `select`; review label, expected format and validation
- `apps/admin/components/shared/PlatformPicker.tsx:75`: `select`; review label, expected format and validation
- `apps/admin/components/signing/ClientSigningView.tsx:225`: `input`; review label, expected format and validation
- `apps/admin/components/signing/ClientSigningView.tsx:229`: `input`; review label, expected format and validation
- `apps/admin/components/signing/ClientSigningView.tsx:253`: `input`; non-text field
- `apps/admin/components/signing/HandoverSigningView.tsx:319`: `input`; review label, expected format and validation
- `apps/admin/components/signing/HandoverSigningView.tsx:337`: `input`; non-text field
- `apps/admin/components/supports/SupportProgramsView.tsx:434`: `Input`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:444`: `Input`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:454`: `Input`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:465`: `Input`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:480`: `input`; non-text field
- `apps/admin/components/supports/SupportProgramsView.tsx:490`: `input`; non-text field
- `apps/admin/components/supports/SupportProgramsView.tsx:505`: `Input`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:574`: `Input`; non-text field
- `apps/admin/components/supports/SupportProgramsView.tsx:585`: `Select`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:600`: `Input`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:613`: `Input`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:637`: `Input`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:655`: `Input`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:719`: `Input`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:744`: `Input`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:774`: `Select`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:786`: `Select`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:1003`: `Select`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:1021`: `Select`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:1038`: `Select`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:1053`: `Select`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:1072`: `Input`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:1085`: `Input`; non-text field
- `apps/admin/components/supports/SupportProgramsView.tsx:1095`: `Input`; non-text field
- `apps/admin/components/supports/SupportProgramsView.tsx:1105`: `Input`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:1116`: `Input`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:1134`: `Input`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:1151`: `Input`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:1167`: `Input`; review label, expected format and validation
- `apps/admin/components/supports/SupportProgramsView.tsx:1185`: `Input`; review label, expected format and validation
- `apps/admin/components/tasks/ProjectsView.tsx:39`: `Input`; review label, expected format and validation
- `apps/admin/components/tasks/ProjectsView.tsx:42`: `Select`; review label, expected format and validation
- `apps/admin/components/tasks/ProjectsView.tsx:47`: `Textarea`; review label, expected format and validation
- `apps/admin/components/tasks/ProjectsView.tsx:50`: `Select`; review label, expected format and validation
- `apps/admin/components/tasks/ProjectsView.tsx:58`: `Select`; review label, expected format and validation
- `apps/admin/components/tasks/ProjectsView.tsx:64`: `Input`; non-text field
- `apps/admin/components/tasks/ProjectsView.tsx:65`: `Input`; non-text field
- `apps/admin/components/tasks/ProjectsView.tsx:66`: `input`; non-text field
- `apps/admin/components/tasks/TaskForm.tsx:34`: `Input`; review label, expected format and validation
- `apps/admin/components/tasks/TaskForm.tsx:35`: `Textarea`; review label, expected format and validation
- `apps/admin/components/tasks/TaskForm.tsx:38`: `Select`; review label, expected format and validation
- `apps/admin/components/tasks/TaskForm.tsx:44`: `Input`; non-text field
- `apps/admin/components/tasks/TaskForm.tsx:47`: `Select`; review label, expected format and validation
- `apps/admin/components/tasks/TaskForm.tsx:54`: `Select`; review label, expected format and validation
- `apps/admin/components/tasks/TaskForm.tsx:61`: `Select`; review label, expected format and validation
- `apps/admin/components/tasks/TaskForm.tsx:69`: `Select`; review label, expected format and validation
- `apps/admin/components/tasks/TaskForm.tsx:75`: `Input`; non-text field
- `apps/admin/components/tasks/TaskView.tsx:80`: `Select`; review label, expected format and validation
- `apps/admin/components/tasks/TasksView.tsx:72`: `input`; non-text field
- `apps/admin/components/tasks/TasksView.tsx:87`: `Select`; review label, expected format and validation
- `apps/admin/components/tasks/TasksView.tsx:110`: `Select`; review label, expected format and validation
- `apps/admin/components/tasks/TasksView.tsx:116`: `Select`; review label, expected format and validation
- `apps/admin/components/tasks/TasksView.tsx:122`: `Select`; review label, expected format and validation
- `apps/admin/components/team/TeamPerformanceView.tsx:61`: `select`; review label, expected format and validation
- `apps/admin/components/users/NewUserFormView.tsx:87`: `Select`; review label, expected format and validation
- `apps/admin/components/users/NewUserFormView.tsx:163`: `Select`; review label, expected format and validation
- `apps/admin/components/users/UsersManagementView.tsx:267`: `select`; review label, expected format and validation
- `apps/admin/components/users/UsersManagementView.tsx:271`: `select`; review label, expected format and validation
- `apps/admin/components/users/UsersManagementView.tsx:276`: `select`; review label, expected format and validation
- `apps/admin/components/users/UsersManagementView.tsx:286`: `select`; review label, expected format and validation
- `apps/admin/components/users/UsersManagementView.tsx:291`: `select`; review label, expected format and validation
- `apps/admin/components/users/UsersManagementView.tsx:307`: `input`; non-text field
- `apps/admin/components/users/UsersManagementView.tsx:335`: `input`; non-text field
- `apps/admin/components/users/UsersManagementView.tsx:498`: `Select`; review label, expected format and validation
- `apps/admin/components/users/UsersManagementView.tsx:572`: `Select`; review label, expected format and validation
- `apps/admin/components/users/UsersManagementView.tsx:588`: `Select`; review label, expected format and validation
- `apps/admin/components/users/UsersManagementView.tsx:619`: `Select`; review label, expected format and validation

### G2 execution evidence

- Replaced all 26 `window.confirm` calls (22 component files) with the shared confirmation host: services; requisition/RFQ/PO/supplier bill cancellation; broadcasts; shipment transitions and route departure; stock count post/cancel; support terms/registrations; handover cancellation; article/page/product/category deletion; calendar token rotation/disconnect; department deletion; dashboard/pipeline reset; settlement cancel/pay; GOSI history deletion.
- Added previously absent confirmations for order refunds (typed order number), stock count posting (typed count number), bulk product availability (typed selected count), bulk user role/department changes (typed selected count), website publication and previous-publication restore (typed revision).
- Existing ordinary forms keep their shared Modal. Native prompts/alerts and standalone overlays remain open G3 work; a native confirmation count of zero does not mean every destructive path has been audited.
- Updated six existing lifecycle e2e specs to accept the shared confirmation through a narrowly scoped handler; added real dashboard-reset cancel/success coverage. The three prior confirmation tests and the host reset test passed. A sweep-induced Next restart interrupted one earlier pending request; isolated rerun passed.
- Runtime sweep currently has 199 route visits across EN/light and EN/dark, with 19 missing dynamic fixtures. It observed mobile overflow on archive, banners, contacts/customer/deal details, employees, GOSI, new invoice and departments, plus unlabelled website-editor fields. Remaining modes, roles, drawers and mutating actions are pending. Raw output: tests/.results/admin-polish-inventory.json (local test artifact).
- Concurrent calendar rename and plan-formatting edits were detected in the shared checkout and are being left outside this implementation commit.

### G4–G5 execution evidence: analytics provenance and UI (one compatible vertical slice)

- Removed the volume seed's synthetic social series. Added forward migration `20261027110000_social_metric_provenance`: nullable post counters, provider/account provenance, post snapshot history, and numeric storage that supports counts above PostgreSQL's 32-bit integer range. No old rows are deleted or retroactively called verified.
- Sync records provider/account identity and available metrics; changed credentials clear the attribution until the next successful sync. Queries exclude unverified, disconnected or different-account history. Unsupported/hidden/malformed counts remain unavailable; real zero is retained. Post updates also retain dated snapshots.
- Fixed account-specific Meta/Instagram connection state, platform-filtered follower totals, true zero-vs-empty handling, UTC calendar-day ranges, baseline selection and stale readings. UI states show Connect/Reconnect, unavailable dashes, last successful sync with time, and page-limit warnings. Cached post figures are explicitly labelled cumulative readings from synced posts published in the selected period, not period Insights API totals.
- Social provider clients now page through Meta cursors, YouTube uploads, TikTok videos and X timelines with a bounded ten-page sync; API-supplied next URLs are never followed with credentials. Invalid publication timestamps are skipped instead of replaced with now. Hidden YouTube subscribers no longer become zero; LinkedIn version is `202609`. Social connection tests use a single account endpoint.
- Rate-limit responses retain retry metadata; workers skip accounts waiting for backoff/reconnect. Provider errors redact secrets; no auth token is added to a request URL.
- Verification: 143 unit/static tests, type-check, lint, copy, brand, action schemas and knip passed; the social database check passed and rolled back on the disposable database. All nine focused browser tests passed, including disconnected EN/AR × light/dark, phone widths, connected-without-data, a verified zero, and confirmation behavior. The additive migration was applied to the disposable and local development databases.
- Remaining: owner-only Insights APIs (reach, impressions/profile views and full engagement where the current public APIs do not supply them), OAuth refresh flows, provider-specific timezone/range contracts and external sandbox acceptance. Do not mark those requirements complete based on these fixtures. Meta's current Insights/changelog pages returned HTTP 429 during official-doc research; no speculative Insights metric names were added.
- Official research additions: [LinkedIn organization lookup](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-lookup-api), [LinkedIn follower statistics](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/follower-statistics), [TikTok access/refresh token contract](https://developers.tiktok.com/docs/en/oauth-user-access-token-management) (24-hour access / 365-day refresh at issuance), [X rate limits](https://docs.x.com/x-api/fundamentals/rate-limits), [YouTube Analytics query](https://developers.google.com/youtube/analytics/reference/reports/query) and [YouTube day timezone](https://developers.google.com/youtube/analytics/dimensions) (Pacific calendar days, distinct from the UI's UTC publication-date filter).

### G6a execution evidence: connection checks fail closed (P1)

- Found an additional P1 defect: PayTabs, HyperPay and SMSA caught non-authentication failures (including network outages) and returned healthy; Aramex treated other provider errors as healthy.
- Removed those blanket-success paths. Returned structured provider errors and malformed responses are failures; no booking/payment/message is created by the check. Valid tracking/query response structures are required before success.
- Five regression checks cover network failures and Aramex internal errors. Focused provider/payment/courier tests passed (26 tests). A no-record provider error now remains visible instead of being interpreted as proof of working credentials; actual merchant account acceptance remains pending.
- Official evidence: [PayTabs query contract](https://docs.paytabs.com/manuals/PT-API-Endpoints/Integration-Types-Manuals/Invoices-APIs/Invoices-Step-7-Manage-Transactions/Invoices-Step-7-Query-Transaction/), [PayTabs response codes](https://support.paytabs.com/en/support/solutions/articles/60000711358), [PayTabs callback signature](https://support.paytabs.com/en/support/solutions/articles/60000718961), [Tap webhooks](https://developers.tap.company/docs/webhook), [PayPal event verification](https://developer.paypal.com/api/rest/webhooks/rest/), [Checkout.com webhook verification](https://support.checkout.com/hc/en-us/articles/29686673313426-Verify-a-webhook-was-sent-by-Checkout-com), [Aramex tracking manual](https://www.aramex.com/docs/default-source/resourses/resourcesdata/shipments-tracking-api-manual.pdf).

### G6b added scope before implementation (P1)

Source review found that the Resend settings card stores and tests encrypted credentials, but the actual mailer, email worker, cron gate and Resend webhook verifier use environment variables only. Also, the existing due-social-sync function is not called by the maintenance endpoint. This can make a configured integration appear healthy while delivery/scheduled analytics do not use it. The next group connects these existing paths, preserves the documented environment-only legacy installation when no settings record exists, treats an explicit disabled settings record as disabled, and keeps webhook signing secrets encrypted. Callers reviewed: both apps' mail routes/actions, report delivery, service replies, email outbox, cron, worker and configuration diagnostics. No real mail or external account operation is part of verification.

### G6b execution evidence: encrypted Resend settings reach delivery

- Actual mail delivery now reads the encrypted active Resend integration for API key and sender. Both apps and the email worker use this same path. An explicit disabled/unlinked or unreadable settings record cannot fall back to legacy environment credentials. Environment-only installations continue to work when no Resend settings record exists.
- Added an encrypted optional Resend webhook signing-secret field. The delivery webhook verifier accepts this stored secret; its existing environment-only function contract remains compatible. Provider error output redacts the API key, and mail configuration/network failures return failure without discarding queued work or logging secrets.
- The authenticated cron endpoint now invokes due social syncs, matching the standalone maintenance worker's existing behavior. A compare-and-set lease prevents concurrent maintenance sources from syncing the same due account together; backoff and reconnect exclusions remain in place.
- Updated worker startup, deployment diagnostics, environment guidance and operations documentation for stored settings. No real messages were sent: mail tests stub the HTTP boundary.
- Verification: seven email credential/delivery/webhook tests; social database check including concurrent lease passed and rolled back; type-check, lint, 155 unit/static tests, copy and knip passed. Signing secret acceptance is verified locally with real Svix signing/verification, not a provider delivery claim.

### G8a added scope before implementation (P2)

The eight-combination route sweep reached narrow-role denials and found nested `main` landmarks: the dashboard provides `main`, and shared `ForbiddenView` adds another `main` inside it. This also caused strict-locator errors in the collector, so those entries are unverified denials rather than product render failures. All ForbiddenView callers were checked (root/dashboard forbidden boundaries and six direct dashboard denials). Change the shared denial body to a section, retain the standalone root landmark, and add one narrow-role e2e assertion before rerunning the affected inventory cells.


### G8a execution evidence

- Shared ForbiddenView now renders a section inside dashboard pages; the standalone root boundary retains a single main landmark. This fixes the repeated narrow-role audit collector failures without changing permissions. The new driver denial e2e passed: one main, visible access-denied heading, no user table. Focused lint passed.

### G6c added scope before implementation: current payment contracts (P1/P2)

Official-doc comparison found that Moyasar invoice `callback_url` is a server notification, but the adapter sets it to the browser return URL. The platform already has a separately configured verified payment-webhook path, so remove the incorrect optional invoice callback. HyperPay payment-state reads currently turn every provider/network error into a synthetic pending result; propagate unknown failures instead. Checkout.com documents account-prefixed API hosts for current accounts: add an optional validated prefix while retaining the existing legacy host. PayTabs documents Kuwait, Morocco and Qatar hosts absent from the regional catalogue. DHL's API key is currently marked non-secret in the settings catalogue and reaches the browser in full; mask it like other API keys.

Unresolved courier contract risk: MyDHL booking supplies fixed package dimensions because the shipment input has no dimensions. Real shipping acceptance needs actual package dimensions and a corresponding input/form audit before live use. HyperPay currency precision also needs an account/API contract check before live multi-currency acceptance. These are open implementation items, not credential-only completion claims.

Additional caller review found that payment expiry converts status-read errors to pending, then expires them after a second timeout. A provider outage could therefore cancel an order whose remote payment state was never verified. Keep such attempts open until a provider result is available. Also remove raw provider error bodies from payment/courier logs and persisted payment-start failures; connection tests retain safely redacted provider errors for operators.

HyperPay precision decision: [current COPYandPAY parameter reference](https://hyperpay.docs.oppwa.com/reference/parameters) specifies `N10.N2` for `amount`. Preserve that contract and reject, before any request, charges/refunds whose third decimal would be rounded away. Do not silently change 12.345 BHD into 12.35 BHD. A two-decimal amount such as 12.340 BHD remains representable. Real merchant/currency approval is still required.

### G6c execution: current payment contracts and safe reconciliation

Implemented the contract changes above, masked DHL keys, rejected HyperPay precision loss for both checkout/refund, kept unknown remote payment attempts open on status outages or disconnected credentials, and removed raw provider errors from payment/courier operation logs and persisted start failures. Existing provider connection health still supplies redacted operator diagnostics. Unknown attempts may hold an order/reservation until reconnection or manual reconciliation; this deliberately preserves funds/stock consistency during an outage.

Verification: all 8 workspace type checks, lint, locale/copy checks and 166 unit/static cases passed. Added current-host/notification/precision tests and three expiry regressions proving outages/disconnection cannot cancel old unverified payments, while verified failed payments can still release unpaid orders. No real payment or shipment was created; merchant sandbox, refunds, wallet enablement and actual carrier contracts still need account-backed acceptance.

### G7 scope before implementation: setup guides and integration form feedback (P2)

Reach: all 19 catalog entries, both locale dictionaries, Settings → Integrations server origin derivation/client cards, existing copy feedback, credential validation and matching `docs/INTEGRATIONS.md`. Reuse native disclosure and existing Button/ConfirmDialog; add no dependency or parallel modal system. Only expose URLs backed by actual routes: website sign-in callbacks/payment webhooks and admin Resend webhook. Social tokens, WhatsApp messaging and courier polling have no invented inbound callback. Explain provider permissions, environment, verification limits and recovery in both languages. Apple multiline keys need a bounded file upload rather than a password input that strips line breaks. Required fields and failed saves need field/inline feedback. Preserve saved blank-secret semantics, prevent busy dismissal and guard discarded credential edits. Sign-in credential checks must distinguish local format validation from a completed provider authentication.

G7 browser verification found the Next.js development indicator covering the RTL mobile confirmation button. This is test-server chrome, not an application overlay. Disable only the dev indicator for isolated `.next-e2e*` builds so mobile clicks exercise the actual controls without forced clicks or hiding error overlays.

### G7 execution: bilingual setup and honest connection validation

All 19 catalog cards now have keyboard-accessible English/Arabic setup disclosures covering prerequisites, permissions, environments, steps, verification, errors and current limitations. Callback/webhook copy buttons derive sanitized origins from deployed/company settings and only reference implemented routes. The exact guide text is mirrored in `docs/INTEGRATIONS.md` and checked by a regression test. WhatsApp copy now describes its actual plain-text test capability rather than unimplemented document delivery.

Forms use shared Input/Select controls with format guidance, inline missing-field/save errors, fixed environment/region choices, duplicate-submit protection, pending controls and a shared discard confirmation. Credential edits have browser unload protection; broader internal navigation/back guards remain part of the long-form work. Apple keys can be selected from a bounded PEM/.p8 file without exposing the key, and server validation rejects non-P256 signing keys. Google/Apple tests check format plus public discovery endpoint availability and report Configuration checked; they do not claim a completed authentication.

Verification: 174 unit/static cases, all 8 type-check workspaces, lint, copy, brand, action schema and knip checks passed. Four browser cases passed across EN/AR × light/dark, including all 19 guides, callback copy handler, required-field feedback, cancel/retain/discard and invalid/valid Apple key selection. Arabic used 390px mobile with no main overflow. Initial RTL failures were caused by the dev indicator covering the modal button; isolated test builds now disable that indicator, while keeping error overlays available. Clipboard API calls were stubbed inside the test browser; OS clipboard permissions and real provider authentication were not exercised. No real message, payment, email or shipment was sent.

### G6d scope before implementation: measured carrier booking and uncertain outcomes (P1)

Reach: Shipment handover form/action/schema, shared handover query, courier adapters, Shipment projection/schema/migration, EN/AR fields and setup/docs, controlled tests. Current code supplies 1 kg/one piece and DHL 20×15×10 cm without measured input, defaults unknown recipient countries to the shipper country, validates the fee after the external booking, and can buy duplicate labels on concurrent/retried submissions. Require measured weight and DHL dimensions for one-parcel automatic booking; retain manual tracking for multi-parcel/portal bookings. Validate country/fee before the API. Persist a booking-start marker before a remote side effect, prevent retries when its outcome is uncertain, and preserve the returned tracking number before optional label storage. Do not automatically clear an uncertain marker and risk a duplicate purchase; operators reconcile using the shipment reference and record the confirmed tracking number. No live carrier call is authorized for tests.

G6d recovery refinement: after the original carrier confirms a completed request created no shipment, an operator can approve a retry by typing the shipment reference. The server requires the exact reference, an aged attempt and no stored tracking number; the claim remains atomic and ordinary retries stay blocked. Manual reconciliation can record late tracking even for a cancelled shipment without reopening it. Intended carrier identity is stored separately from confirmed handover so an uncertain request is not presented to customers as a completed carrier assignment. Existing historical attempts have no marker; reconcile outstanding pre-upgrade requests before attempting another booking.

### G6d execution: measured booking and reconciliation

Automatic booking now requires a measured single-parcel weight and all DHL dimensions; manual portal tracking remains available for several parcels. Unknown countries, incomplete addresses and invalid fees/measurements fail before any external side effect. A persisted claim prevents competing submissions/ordinary retries from buying another label. Pending/unknown outcomes pause driver, route and dispatch changes. Intended carrier identity stays separate from confirmed customer handover. Confirmed tracking is saved before label attachment, optional label failure is explicit, and concurrently changed/cancelled shipment states are preserved. Late tracking can be reconciled without reopening a closed shipment. An aged uncertain request can only be retried with an exact reference and explicit operator confirmation that the original carrier completed processing and created no shipment.

The additive migration was applied to both local and disposable audit databases before verification. Required action schemas were regenerated. All 8 workspace type checks, lint, copy, brand, schema and knip checks passed; 175 unit/static cases passed. `scripts/check-courier-booking-db.cjs` passed against the disposable database with all fixtures rolled back: actual parcel payload, validation before any call, competing claims, outage/retry blocking, driver/dispatch blocking, manual and closed-shipment reconciliation, typed aged retry, label failure and concurrent cancellation. HTTP was mocked and no label was purchased. Two browser cases passed in EN desktop/light and AR mobile/dark for empty measured fields, typed retry gating, manual tracking reconciliation and pending-action blocking. Initial AR test-ID duplication came from hidden streamed HTML outside main; the test now targets the live main landmark. Real carrier contract/product/customs/label acceptance still needs merchant credentials and provider-approved test shipments; this is not claimed complete.
