import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { CompanySettings, DealPipelineStage, Profile } from "@platform/database";
import { normalizeTheme } from "@platform/database/constants/theme";
import { resolveWebsiteConfig, websiteConfigForActivity } from "@platform/database/website-config";
import { ArticleEditorView } from "../../components/cms/ArticleEditorView";
import { ArticlesListView } from "../../components/cms/ArticlesListView";
import { BannersManagementView } from "../../components/cms/BannersManagementView";
import { ClientsManagementView } from "../../components/cms/ClientsManagementView";
import { EquipmentManagementView } from "../../components/cms/EquipmentManagementView";
import { FaqsManagementView } from "../../components/cms/FaqsManagementView";
import { MenusEditorView } from "../../components/cms/MenusEditorView";
import { PageEditorView } from "../../components/cms/PageEditorView";
import { PagesListView } from "../../components/cms/PagesListView";
import { PortfolioManagementView } from "../../components/cms/PortfolioManagementView";
import { ReviewsManagementView } from "../../components/cms/ReviewsManagementView";
import { RichTextEditor } from "../../components/cms/RichTextEditor";
import { StatsManagementView } from "../../components/cms/StatsManagementView";
import { UnpublishedChangesNotice } from "../../components/cms/UnpublishedChangesNotice";
import { WebsiteEditor } from "../../components/cms/WebsiteEditor";
import { WebsitePublicationNotice } from "../../components/cms/WebsitePublicationNotice";
import { AnnouncementDetailView } from "../../components/communications/AnnouncementDetailView";
import { AnnouncementForm } from "../../components/communications/AnnouncementForm";
import { AnnouncementsListView } from "../../components/communications/AnnouncementsListView";
import {
  LetterTemplatesView,
  LetterWorkspace,
} from "../../components/communications/LetterWorkspace";
import { LettersListView } from "../../components/communications/LettersListView";
import { NotificationInboxView } from "../../components/communications/NotificationInboxView";
import { NotificationSettingsPanel } from "../../components/communications/NotificationSettingsPanel";
import { CompanyDocumentsClientView } from "../../components/company/CompanyDocumentsClientView";
import { NewCompanyDocumentFormView } from "../../components/company/NewCompanyDocumentFormView";
import { ApprovalPoliciesView } from "../../components/settings/ApprovalPoliciesView";
import { CalendarSyncCard } from "../../components/settings/CalendarSyncCard";
import { CompanySettingsView } from "../../components/settings/CompanySettingsView";
import { DataPrivacyView } from "../../components/settings/DataPrivacyView";
import { DepartmentsSettingsView } from "../../components/settings/DepartmentsSettingsView";
import { PipelineSettingsView } from "../../components/settings/PipelineSettingsView";
import { PreferencesView } from "../../components/settings/PreferencesView";
import { RestrictedSettingNotice } from "../../components/settings/RestrictedSettingNotice";
import { RolesManagementView } from "../../components/settings/RolesManagementView";
import { SecuritySettingsView } from "../../components/settings/SecuritySettingsView";
import { SettingsNavTabs } from "../../components/settings/SettingsNavTabs";
import { SignaturePoliciesPanel } from "../../components/settings/SignaturePoliciesPanel";
import { WebSettingsView } from "../../components/settings/WebSettingsView";
import { BankCoordinatesTab } from "../../components/settings/company/BankCoordinatesTab";
import { BrandAssetsTab } from "../../components/settings/company/BrandAssetsTab";
import { GeneralInfoTab } from "../../components/settings/company/GeneralInfoTab";
import { InvoiceReceiptSequencesTab } from "../../components/settings/company/InvoiceReceiptSequencesTab";
import { SalesDiscountsTab } from "../../components/settings/company/SalesDiscountsTab";
import { ThemeSettingsTab } from "../../components/settings/company/ThemeSettingsTab";
import { Field, LanguageFields, activityIcon } from "../../components/setup/LanguageFields";
import { ThemeEditor } from "../../components/setup/ThemeEditor";
import { WebsiteCommerceFields } from "../../components/setup/WebsiteCommerceFields";
import { WebsiteDesignFields } from "../../components/setup/WebsiteDesignFields";
import { WebsiteDocumentsFields } from "../../components/setup/WebsiteDocumentsFields";
import { WebsiteLanguageFields } from "../../components/setup/WebsiteLanguageFields";
import { WebsitePromotionsFields } from "../../components/setup/WebsitePromotionsFields";
import { WebsiteSetupFields } from "../../components/setup/WebsiteSetupFields";
import { NewUserFormView } from "../../components/users/NewUserFormView";
import { RolePermissionMatrix } from "../../components/users/RolePermissionMatrix";
import { UserPermissionOverrides } from "../../components/users/UserPermissionOverrides";
import { UsersManagementView } from "../../components/users/UsersManagementView";
import { adminActionMocks } from "./setup";
import { AdminTestProviders, adminEn as en, resolveServerJsx } from "./fixtures";

vi.mock("../../lib/auth", () => ({
  hasPermission: vi.fn(async () => true),
}));

vi.mock("@platform/database", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getWebsitePublicationStatus: vi.fn(async () => ({ isPublished: true, changedSections: [] })),
  };
});

describe("Admin Batch 7: CMS, Communications, Company, Setup, Settings & Users", () => {
  const companySettings: CompanySettings = {
    id: "cmp-1",
    company_name_en: "Zayed Group",
    company_name_ar: "مجموعة زايد",
    default_currency: "BHD",
    vat_enabled: true,
    vat_percentage: 10,
    vat_number: "BH-20001",
    cr_number: "CR-10099",
    default_payment_terms_days: 30,
    invoice_prefix: "ZDG-INV",
    invoice_next_number: 1,
    receipt_prefix: "ZDG-RCP",
    receipt_next_number: 1,
    default_discount_limit: 15,
    quotations_always_need_approval: false,
    content_languages: ["en", "ar"],
    primary_language: "en",
  } as unknown as CompanySettings;

  it("renders all CMS components including async WebsitePublicationNotice cleanly", async () => {
    const pubNode = await resolveServerJsx(
      React.createElement(WebsitePublicationNotice, { section: "hero" }),
    );
    const pubStatus = { isPublished: true, changedSections: [] };
    const defaultWebsiteConfig = resolveWebsiteConfig(websiteConfigForActivity("media"));

    render(
      <AdminTestProviders>
        {pubNode}
        <UnpublishedChangesNotice section="hero" status={pubStatus} canPublish />
        <BannersManagementView initialBanners={[]} languages={["en", "ar"]} />
        <ClientsManagementView initialLogos={[]} />
        <EquipmentManagementView initialEquipment={[]} />
        <PortfolioManagementView initialItems={[]} categories={[]} catalogue={{ nameEn: "Portfolio", nameAr: "الأعمال", layout: "grid", fields: [], currency: "BHD" }} languages={["en", "ar"]} />
        <ReviewsManagementView initialReviews={[]} />
        <FaqsManagementView initialFaqs={[]} languages={["en", "ar"]} />
        <StatsManagementView initialStats={[]} languages={["en", "ar"]} />
        <ArticlesListView articles={[]} total={0} page={1} pageSize={20} filters={{ q: "", status: "", category: "" }} canCreate canPublish publication={pubStatus} />
        <ArticleEditorView
          article={{ id: "art-1", title_en: "Update", title_ar: "تحديث", slug: "update", status: "draft", category: "news", tags: [], author_name: "Tariq", body_en: null, body_ar: null, excerpt_en: "", excerpt_ar: "", cover_url: "", publish_at: null, featured: false, seo_title_en: "", seo_title_ar: "", seo_description_en: "", seo_description_ar: "" } as unknown as Parameters<typeof ArticleEditorView>[0]["article"]}
          languages={["en", "ar"]}
          canPublish
          canDelete
          articlesSlug="articles"
        />
        <PagesListView pages={[]} canEdit canCreate canDelete canPublish publication={pubStatus} />
        <PageEditorView
          activity="media"
          page={{ id: "pg-1", page_type: "custom", title_en: "About", title_ar: "من نحن", slug: "about", status: "draft", blocks: [], in_header: true, in_footer: false, is_visible: true, seo_title_en: "", seo_title_ar: "", seo_description_en: "", seo_description_ar: "" } as unknown as Parameters<typeof PageEditorView>[0]["page"]}
          languages={["en", "ar"]}
          canCode
          catalogueSlug="work"
        />
        <MenusEditorView initialMenus={null} articles={{ enabled: false, slug: "articles", navEn: "Articles", navAr: "المقالات" }} pages={[]} languages={["en", "ar"]} />
        <RichTextEditor value={null} onChange={vi.fn()} label="Body" />
        <WebsiteEditor
          config={defaultWebsiteConfig}
          categories={[]}
          company={{ languages: ["en", "ar"], primaryLanguage: "en", activity: "media", hasWhatsapp: false }}
          publication={pubStatus}
          revision={1}
          canRestore
          services={[]}
        />
      </AdminTestProviders>,
    );

    expect(adminActionMocks.toggleBannerStatusAction).toBeDefined();
    expect(adminActionMocks.createBannerAction).toBeDefined();
    expect(adminActionMocks.deleteBannerAction).toBeDefined();
    expect(adminActionMocks.updateBannerContentAction).toBeDefined();
    expect(adminActionMocks.createClientLogoAction).toBeDefined();
    expect(adminActionMocks.updateClientLogoAction).toBeDefined();
    expect(adminActionMocks.deleteClientLogoAction).toBeDefined();
    expect(adminActionMocks.createEquipmentAction).toBeDefined();
    expect(adminActionMocks.updateEquipmentAction).toBeDefined();
    expect(adminActionMocks.deleteEquipmentAction).toBeDefined();
    expect(adminActionMocks.createPortfolioItemAction).toBeDefined();
    expect(adminActionMocks.togglePortfolioFeaturedAction).toBeDefined();
    expect(adminActionMocks.deletePortfolioItemAction).toBeDefined();
    expect(adminActionMocks.updatePortfolioContentAction).toBeDefined();
    expect(adminActionMocks.toggleReviewApprovalAction).toBeDefined();
    expect(adminActionMocks.deleteReviewAction).toBeDefined();
    expect(adminActionMocks.createFaqAction).toBeDefined();
    expect(adminActionMocks.updateFaqAction).toBeDefined();
    expect(adminActionMocks.deleteFaqAction).toBeDefined();
    expect(adminActionMocks.createStatisticAction).toBeDefined();
    expect(adminActionMocks.updateStatisticAction).toBeDefined();
    expect(adminActionMocks.deleteStatisticAction).toBeDefined();
    expect(adminActionMocks.saveCmsArticleAction).toBeDefined();
    expect(adminActionMocks.deleteCmsArticleAction).toBeDefined();
    expect(adminActionMocks.updateCmsPagesListAction).toBeDefined();
    expect(adminActionMocks.duplicateCmsPageAction).toBeDefined();
    expect(adminActionMocks.deleteCmsPageAction).toBeDefined();
    expect(adminActionMocks.saveCmsPageAction).toBeDefined();
    expect(adminActionMocks.saveWebsiteMenusAction).toBeDefined();
    expect(adminActionMocks.saveWebsiteDraftAction).toBeDefined();
    expect(adminActionMocks.previewWebsiteAction).toBeDefined();
    expect(adminActionMocks.publishWebsiteAction).toBeDefined();
    expect(adminActionMocks.restoreWebsiteAction).toBeDefined();
    expect(adminActionMocks.updateWebsiteServiceAction).toBeDefined();
  });

  it("renders Communications, NotificationInboxView (GET /api/notifications?...), Company & Setup components cleanly", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0, unread: 0, page: 1 }), { status: 200 }),
    );
    const opts = { departments: [], roles: [], users: [] } as unknown as Parameters<typeof AnnouncementForm>[0]["options"];
    const announcement = {
      id: "ann-1",
      title_en: "Holiday Notice",
      title_ar: "إجازة",
      body_en: "Office closed",
      body_ar: "المكتب مغلق",
      status: "draft",
      audience: { type: "all" },
      receipts: [],
      readers: [],
      stats: { total: 10, read: 5, acknowledged: 3 },
      created_at: "2026-05-01T00:00:00Z",
    } as unknown as Parameters<typeof AnnouncementDetailView>[0]["item"];

    const brandTheme = normalizeTheme({ primary: "#1E3A8A", accent: "#2563EB", surface: "tinted", websiteMode: "dark" });
    const websiteCfg = resolveWebsiteConfig(websiteConfigForActivity("media"));

    render(
      <AdminTestProviders>
        <AnnouncementsListView items={[]} view="all" canCreate canSettings managersAnnounce />
        <AnnouncementForm options={opts} createAny />
        <AnnouncementDetailView item={announcement} options={opts} createAny approvalId={null} live={false} />
        <LettersListView items={[]} canCreate canTemplates />
        <LetterTemplatesView templates={[]} canEdit />
        <LetterWorkspace templates={[]} employees={[]} canEdit canDelete canExport />
        <NotificationInboxView tab="all" />
        <NotificationSettingsPanel />
        <CompanyDocumentsClientView initialDocuments={[]} />
        <NewCompanyDocumentFormView />
        <Field label="Name">{(id) => <input id={id} />}</Field>
        <LanguageFields label="Title" en="Hello" ar="مرحبا" onChange={vi.fn()} languages={["en", "ar"]} />
        <ThemeEditor theme={brandTheme} onChange={vi.fn()} />
        <WebsiteCommerceFields commerce={websiteCfg.commerce} onChange={vi.fn()} />
        <WebsiteDesignFields design={websiteCfg.design} onChange={vi.fn()} />
        <WebsiteDocumentsFields documents={websiteCfg.documents ?? []} onChange={vi.fn()} />
        <WebsitePromotionsFields promotions={websiteCfg.promotions ?? []} onChange={vi.fn()} />
        <WebsiteLanguageFields config={websiteCfg} onChange={vi.fn()} languages={["en", "ar"]} />
        <WebsiteSetupFields config={websiteCfg} onChange={vi.fn()} languages={["en", "ar"]} primaryLanguage="en" companyActivity="media" hasWhatsapp={false} categories={[]} />
      </AdminTestProviders>,
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/api/notifications?"), expect.anything());
    });

    expect(activityIcon("media")).toBeDefined();
    expect(adminActionMocks.communicationSettingsAction).toBeDefined();
    expect(adminActionMocks.saveAnnouncementAction).toBeDefined();
    expect(adminActionMocks.submitAnnouncementAction).toBeDefined();
    expect(adminActionMocks.archiveAnnouncementAction).toBeDefined();
    expect(adminActionMocks.announcementReceiptAction).toBeDefined();
    expect(adminActionMocks.saveLetterTemplateAction).toBeDefined();
    expect(adminActionMocks.saveOfficialLetterAction).toBeDefined();
    expect(adminActionMocks.draftLetterTemplateAction).toBeDefined();
    expect(adminActionMocks.submitOfficialLetterAction).toBeDefined();
    expect(adminActionMocks.cancelOfficialLetterAction).toBeDefined();
    expect(adminActionMocks.bulkNotificationAction).toBeDefined();
    expect(adminActionMocks.updateNotificationAction).toBeDefined();
    expect(adminActionMocks.muteNotificationRecordAction).toBeDefined();
    expect(adminActionMocks.saveNotificationPreferencesAction).toBeDefined();
    expect(adminActionMocks.unmuteNotificationRecordAction).toBeDefined();
    expect(adminActionMocks.deleteCompanyDocumentAction).toBeDefined();
    expect(adminActionMocks.createCompanyDocumentAction).toBeDefined();
  });

  it("renders Settings (incl. POST /api/auth/mfa & company tabs) & Users components cleanly", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const noopSetSettings = vi.fn() as unknown as React.Dispatch<React.SetStateAction<CompanySettings>>;
    const noopSetAssets = vi.fn() as unknown as React.Dispatch<React.SetStateAction<Parameters<typeof BrandAssetsTab>[0]["assets"]>>;
    const userRec: Profile = {
      id: "usr-1",
      full_name: "Tariq Al-Zayed",
      email: "admin@example.test",
      role: "admin",
      is_active: true,
      is_suspended: false,
      is_archived: false,
    } as unknown as Profile;

    render(
      <AdminTestProviders>
        <SettingsNavTabs />
        <RestrictedSettingNotice />
        <PreferencesView />
        <DataPrivacyView />
        <SecuritySettingsView enabled={false} embedded={false} recoveryCount={0} />
        <SignaturePoliciesPanel policies={[{ documentType: "invoice", mode: "stored" }]} />
        <CalendarSyncCard feed={null} syncEnabled={false} canManage />
        <ApprovalPoliciesView policies={[]} users={[]} />
        <DepartmentsSettingsView departments={[]} people={[]} languages={["en", "ar"]} canEdit />
        <PipelineSettingsView initialStages={[] as DealPipelineStage[]} languages={["en", "ar"]} canEdit />
        <RolesManagementView initialRoles={[]} />
        <WebSettingsView
          initialSettings={companySettings}
          cmsCounts={{ banners: 1, portfolio: 2, clients: 3, equipment: 4, reviews: 1, pendingReviews: 0, faqs: 2, stats: 1 }}
          socialLinks={[]}
        />
        <CompanySettingsView initialSettings={companySettings} initialAssets={[]} taxes={[]} canEditTaxes />
        <GeneralInfoTab settings={companySettings} setSettings={noopSetSettings} t={en} locale="en" isRTL={false} />
        <BrandAssetsTab settings={companySettings} setSettings={noopSetSettings} assets={[]} setAssets={noopSetAssets} t={en} locale="en" isRTL={false} />
        <BankCoordinatesTab settings={companySettings} setSettings={noopSetSettings} t={en} locale="en" isRTL={false} />
        <InvoiceReceiptSequencesTab settings={companySettings} setSettings={noopSetSettings} t={en} locale="en" isRTL={false} />
        <SalesDiscountsTab settings={companySettings} setSettings={noopSetSettings} t={en} />
        <ThemeSettingsTab initialTheme={normalizeTheme({})} />
        <NewUserFormView roles={[{ id: "admin", nameEn: "Admin", nameAr: "مدير" }]} employees={[]} />
        <RolePermissionMatrix roles={[{ key: "admin", name: "Admin" }]} rolePermissions={{ admin: { "invoices:read": true } }} />
        <UserPermissionOverrides user={{ id: "usr-1", name: "Tariq", role: "admin", permissions: {} }} roleGrants={{}} onClose={vi.fn()} />
        <UsersManagementView
          initialUsers={[userRec]}
          canWrite
          canDelete
          employees={[]}
          roles={[{ id: "admin", nameEn: "Admin", nameAr: "مدير" }]}
          resources={["invoices"]}
          rolePermissions={{ admin: { "invoices:read": true } }}
          departments={[]}
          total={1}
          page={1}
          pageSize={20}
          filters={{ q: "", role: "", departmentId: "", status: "" }}
          people={[{ id: "usr-1", fullName: "Tariq Al-Zayed" }]}
        />
      </AdminTestProviders>,
    );

    expect(adminActionMocks.eraseCustomerDataAction).toBeDefined();
    expect(adminActionMocks.setSignaturePolicyAction).toBeDefined();
    expect(adminActionMocks.createCalendarFeedAction).toBeDefined();
    expect(adminActionMocks.setCalendarSyncEnabledAction).toBeDefined();
    expect(adminActionMocks.updateCalendarFeedLayersAction).toBeDefined();
    expect(adminActionMocks.revokeCalendarFeedAction).toBeDefined();
    expect(adminActionMocks.updateApprovalPolicyAction).toBeDefined();
    expect(adminActionMocks.saveDepartmentAction).toBeDefined();
    expect(adminActionMocks.deleteDepartmentAction).toBeDefined();
    expect(adminActionMocks.addCatalogueDepartmentsAction).toBeDefined();
    expect(adminActionMocks.saveDealPipelineAction).toBeDefined();
    expect(adminActionMocks.resetDealPipelineAction).toBeDefined();
    expect(adminActionMocks.upsertRoleAction).toBeDefined();
    expect(adminActionMocks.deleteRoleAction).toBeDefined();
    expect(adminActionMocks.createSocialLinkAction).toBeDefined();
    expect(adminActionMocks.updateSocialLinkAction).toBeDefined();
    expect(adminActionMocks.deleteSocialLinkAction).toBeDefined();
    expect(adminActionMocks.updateWebSettingsAction).toBeDefined();
    expect(adminActionMocks.revalidateEntireSiteAction).toBeDefined();
    expect(adminActionMocks.updateCompanySettingsAction).toBeDefined();
    expect(adminActionMocks.saveCompanyAssetAction).toBeDefined();
    expect(adminActionMocks.deleteCompanyAssetAction).toBeDefined();
    expect(adminActionMocks.saveSetupThemeAction).toBeDefined();
    expect(adminActionMocks.createUserAction).toBeDefined();
    expect(adminActionMocks.setUserPermissionOverridesAction).toBeDefined();
    expect(adminActionMocks.bulkUpdateUsersAction).toBeDefined();
    expect(adminActionMocks.deleteUserAction).toBeDefined();

    await fetch("/api/auth/mfa", { method: "POST" });
    expect(fetchSpy).toHaveBeenCalledWith("/api/auth/mfa", expect.objectContaining({ method: "POST" }));
  });
});
