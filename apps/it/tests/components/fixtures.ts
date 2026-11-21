import * as React from "react";
import type {
  ApiKeyRecord,
  AuditEvent,
  BackupRecord,
  CMSContentSnapshot,
  CompanyAsset,
  CompanyConfiguration,
  DatabaseStats,
  DeskIntegration,
  ITAccountPage,
  ITRoleDraft,
  IdentitySessionPage,
  ModuleState,
  NotifyMessage,
  RuntimeConfig,
  SLAPolicy,
  ServiceHealth,
  SiteCode,
  SiteDomains,
  StaffAccountPage,
  StaffRoleDraft,
  StaffRolePage,
  Ticket,
  TicketDetail,
} from "@platform/api-client";
import { CompanyCurrencyProvider, ConfirmationProvider, PhoneCountryProvider, StatusLabelsProvider } from "@platform/ui";
import enCopy from "../../locales/en.json";
import { CopyProvider } from "../../components/CopyProvider";

export function makeCompanyConfig(): CompanyConfiguration {
  return {
    id: "cmp-1",
    websitePublished: true,
    companyNameEn: "Zayed Diversified Group W.L.L.",
    companyNameAr: "مجموعة زايد المتنوعة",
    crNumber: "CR-10099",
    vatId: "BH-2000001",
    vatEnabled: true,
    vatPercentage: 10,
    vatCertificateUrl: null,
    defaultCurrency: "BHD",
    currencyDecimals: 3,
    addressEn: "Seef District, Manama",
    addressAr: "ضاحية السيف، المنامة",
    phone: "+97317000001",
    whatsappPhone: "+97339000001",
    email: "info@example.test",
    website: "https://example.test",
    instagramUrl: null,
    linkedinUrl: null,
    youtubeUrl: null,
    bankName: "National Bank",
    bankIban: "BH67NBOB00000000000001",
    bankAccountNumber: "1234567890",
    bankSwift: "NBOBBHBM",
    timeZone: "Asia/Bahrain",
    logoUrl: "/media/logo.svg",
    darkLogoUrl: "/media/logo-dark.svg",
    fullLogoUrl: "/media/full.svg",
    darkFullLogoUrl: "/media/full-dark.svg",
    iconUrl: "/media/icon.svg",
    darkIconUrl: "/media/icon-dark.svg",
    documentHeaderUrl: null,
    documentFooterUrl: null,
    stampUrl: null,
    signatureUrl: null,
    paymentTermsDays: 30,
    invoicePrefix: "ZDG-INV",
    invoiceNextNumber: 1,
    receiptPrefix: "ZDG-RCP",
    receiptNextNumber: 1,
    ceoNameEn: "Tariq Al-Zayed",
    ceoNameAr: "طارق الزايد",
    ceoTitleEn: "CEO",
    ceoTitleAr: "الرئيس التنفيذي",
    ceoQuoteEn: "Quality first.",
    ceoQuoteAr: "الجودة أولاً.",
    missionEn: "Serve enterprise clients.",
    missionAr: "خدمة العملاء.",
    visionEn: "Market leadership.",
    visionAr: "الريادة.",
    aboutTextEn: "Group overview.",
    aboutTextAr: "نبذة عن المجموعة.",
    termsEn: "Terms",
    termsAr: "الشروط",
    rulesEn: "Rules",
    rulesAr: "القوانين",
    setupCompleted: true,
    primaryLanguage: "en",
    contentLanguages: ["en", "ar"],
    businessActivity: "creative_studio",
    taglineEn: "Integrated Solutions",
    taglineAr: "حلول متكاملة",
    foundedYear: 2018,
    city: "Manama",
    country: "BH",
    mapUrl: null,
    defaultDiscountLimitPercent: 15,
    quotationsAlwaysNeedApproval: false,
    defaultInvoiceNotesEn: null,
    defaultInvoiceNotesAr: null,
    taxRegistrationStatus: true,
    brandTheme: {},
    adminAllowedSettings: {
      company: false,
      web: false,
      tax: false,
      appearance: false,
      domains: false,
      deployments: false,
      roles: false,
      audit: false,
      privacy: true,
      approvals: true,
      departments: true,
      storeSettings: true,
      deliverySettings: true,
      requestsSettings: true,
      hrSettings: true,
    },
  } as unknown as CompanyConfiguration;
}

export function makeCompanyAssets(): CompanyAsset[] {
  return [
    { key: "logoUrl", url: "/media/logo.svg", fileName: "logo.svg", mimeType: "image/svg+xml" } as unknown as CompanyAsset,
  ];
}

export function makeSiteDomains(): SiteDomains {
  return {
    websiteDomain: "example.test",
    adminDomain: "admin.example.test",
    storeDomain: "store.example.test",
    itDomain: "it.example.test",
    updatedAt: "2026-05-01T00:00:00Z",
    updatedBy: "it@example.test",
  } as unknown as SiteDomains;
}

export function makeSiteCode(): SiteCode {
  return {
    googleAnalyticsId: "G-TEST123",
    metaPixelId: "",
    tiktokPixelId: "",
    headHtml: "",
    bodyHtml: "",
  } as unknown as SiteCode;
}

export function makeCmsSnapshot(): CMSContentSnapshot {
  return {
    id: "main",
    revision: 3,
    updatedAt: "2026-05-01T00:00:00Z",
    publishedAt: "2026-05-01T00:00:00Z",
    draft: { socialLinks: [] },
    published: { socialLinks: [] },
  };
}

export function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "tkt-1",
    number: 101,
    requesterId: "emp-1",
    requesterName: "Bader Ali",
    requesterEmail: "bader@example.test",
    category: "access",
    subcategory: "vpn",
    priority: "high",
    status: "open",
    title: "VPN client certificate renewal",
    description: "Need VPN access for remote work.",
    assigneeId: "it-1",
    assigneeName: "IT Lead",
    respondBy: "2026-05-02T12:00:00Z",
    resolveBy: "2026-05-04T12:00:00Z",
    breached: false,
    createdAt: "2026-05-01T09:00:00Z",
    updatedAt: "2026-05-01T09:00:00Z",
    ...overrides,
  };
}

export function makeTicketDetail(): TicketDetail {
  return {
    ticket: makeTicket(),
    comments: [
      {
        id: "cmt-1",
        authorRealm: "it",
        authorName: "IT Lead",
        body: "Reviewing certificate expiry.",
        internal: false,
        createdAt: "2026-05-01T09:30:00Z",
      },
    ],
    events: [
      {
        kind: "created",
        actorRealm: "staff",
        actorId: "emp-1",
        createdAt: "2026-05-01T09:00:00Z",
      },
    ],
    attachments: [],
  };
}

export function makeApiKeys(): ApiKeyRecord[] {
  return [
    {
      id: "key-1",
      name: "ERP Sync",
      keyPrefix: "sk_live_1",
      scopes: ["read", "write"],
      rateLimit: 120,
      createdBy: "it@example.test",
      createdAt: "2026-05-01T00:00:00Z",
    },
  ];
}

export function makeBackups(): BackupRecord[] {
  return [
    {
      id: "bak-1",
      kind: "full",
      fileName: "full-2026-05-01.tar.zst",
      fileSize: 204800,
      checksum: "sha256:abcd",
      status: "verified",
      createdBy: "it@example.test",
      createdAt: "2026-05-01T01:00:00Z",
      verifiedAt: "2026-05-01T01:05:00Z",
    },
  ];
}

export function makeDatabaseStats(): DatabaseStats {
  return {
    schemas: [{ schema: "identity", version: 12, appliedAt: "2026-05-01T00:00:00Z" }],
    outboxLag: [{ schema: "notify", pending: 0 }],
    riverStats: [
      { queue: "default", state: "failed", count: 1 },
      { queue: "default", state: "discarded", count: 2 },
    ],
  };
}

export function makeRuntimeConfig(): RuntimeConfig {
  return {
    environment: "development",
    timeZone: "Asia/Bahrain",
    activeLogLevel: "INFO",
    debugToggles: [
      {
        id: "dbg-1",
        service: "gateway",
        logLevel: "DEBUG",
        enabledBy: "it@example.test",
        enabledAt: "2026-05-01T00:00:00Z",
        expiresAt: "2026-05-02T00:00:00Z",
      },
    ],
  };
}

export function makeServiceHealth(): ServiceHealth[] {
  return [
    {
      name: "gateway",
      status: "healthy",
      latencyMs: 12,
      version: "1.0.0",
      checkedAt: "2026-05-01T10:00:00Z",
    },
  ];
}

export function makeITAccountPage(): ITAccountPage {
  return {
    items: [
      {
        id: "it-1",
        email: "it@example.test",
        roles: ["it_admin"],
        active: true,
        mfaEnabled: false,
        createdAt: "2026-01-01T00:00:00Z",
        lastLoginAt: "2026-05-01T08:00:00Z",
      },
    ],
  } as ITAccountPage;
}

export function makeStaffAccountsPage(): StaffAccountPage {
  return {
    items: [
      {
        id: "st-1",
        email: "bader@example.test",
        displayName: "Bader Ali",
        roles: ["admin"],
        active: true,
        mfaEnabled: false,
        createdAt: "2026-01-01T00:00:00Z",
        lastLoginAt: "2026-05-01T08:00:00Z",
      },
    ],
  } as StaffAccountPage;
}

export function makeStaffRoles(): StaffRoleDraft[] {
  return [
    {
      id: "admin",
      nameEn: "Administrator",
      nameAr: "مدير",
      system: true,
      grants: { "crm:read": true, "crm:edit": true },
      dataScopes: { crm: "all" },
    },
  ];
}

export function makeStaffRolesPage(): StaffRolePage {
  return {
    items: makeStaffRoles(),
  } as StaffRolePage;
}

export function makeITRoles(): ITRoleDraft[] {
  return [
    {
      id: "it_admin",
      nameEn: "IT Administrator",
      nameAr: "مسؤول تقنية المعلومات",
      permissions: { "api_keys:read": true },
      system: true,
    } as unknown as ITRoleDraft,
  ];
}

export function makeSessionsPage(): IdentitySessionPage {
  return {
    items: [
      {
        id: "sess-1",
        realm: "it",
        subjectId: "it-1",
        email: "it@example.test",
        createdAt: "2026-05-01T08:00:00Z",
        expiresAt: "2026-05-08T08:00:00Z",
        revokedAt: null,
      },
    ],
  } as IdentitySessionPage;
}

export function makeAuditPage(): { items: AuditEvent[]; nextCursor?: string } {
  return {
    items: [
      {
        id: "aud-1",
        subject: "company",
        service: "system",
        entity: "cmp-1",
        verb: "updated",
        actor: "it@example.test",
        occurredAt: "2026-05-01T09:00:00Z",
        receivedAt: "2026-05-01T09:00:01Z",
        payload: { field: "vatEnabled" },
        traceId: "tr-100",
      },
    ],
  };
}

export function makeNotifyPage(): { items: NotifyMessage[]; nextCursor?: string } {
  return {
    items: [
      {
        id: "msg-1",
        caller: "identity",
        actor: "system",
        channel: "email",
        recipient: "bader@example.test",
        subject: "Welcome Email",
        status: "failed",
        attempts: 1,
        provider: "smtp",
        providerId: null,
        lastError: "Temporary failure",
        createdAt: "2026-05-01T09:00:00Z",
        sentAt: null,
      },
    ],
  };
}

export function makeModules(): ModuleState[] {
  return [
    {
      key: "crm",
      nameEn: "CRM",
      nameAr: "إدارة العملاء",
      enabledByDefault: true,
      enabled: true,
    },
  ];
}

export function makeSLAPolicies(): SLAPolicy[] {
  return [
    {
      priority: "high",
      responseMinutes: 60,
      resolveMinutes: 480,
      updatedBy: "it@example.test",
      updatedAt: "2026-05-01T00:00:00Z",
    } as unknown as SLAPolicy,
  ];
}

export function makeDeskIntegrations(): DeskIntegration[] {
  return [
    {
      provider: "smtp",
      isActive: true,
      healthStatus: "healthy",
      accountName: "Mailpit SMTP",
      values: { host: "mailpit", port: "1025" },
      secrets: { password: { set: true, hint: "***" } },
      config: {},
    },
  ];
}

export function ItTestProviders({ children }: { children: React.ReactNode }) {
  return React.createElement(
    CopyProvider,
    { copy: enCopy, locale: "en" },
    React.createElement(
      CompanyCurrencyProvider,
      { currency: "BHD" },
      React.createElement(
        PhoneCountryProvider,
        { country: "BH" },
        React.createElement(
          StatusLabelsProvider,
          { value: {} },
          React.createElement(ConfirmationProvider, null, children),
        ),
      ),
    ),
  );
}
