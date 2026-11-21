import "@testing-library/jest-dom/vitest";
import * as React from "react";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

export const mockNavigation = {
  pathname: "/",
  searchParams: new URLSearchParams(),
  params: {} as Record<string, string>,
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockNavigation.push,
    replace: mockNavigation.replace,
    refresh: mockNavigation.refresh,
    back: mockNavigation.back,
    prefetch: mockNavigation.prefetch,
  }),
  usePathname: () => mockNavigation.pathname,
  useSearchParams: () => mockNavigation.searchParams,
  useParams: () => mockNavigation.params,
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string | { pathname?: string } }) =>
    React.createElement(
      "a",
      { href: typeof href === "string" ? href : href?.pathname ?? "#", ...props },
      children,
    ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt = "", ...props }: React.ImgHTMLAttributes<HTMLImageElement>) =>
    React.createElement("img", { src: typeof src === "string" ? src : "", alt, ...props }),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined, getAll: () => [] }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: () => null,
}));

vi.mock("@material/web/ripple/ripple.js", () => ({}));

export const itActionMocks = {
  createAPIKeyAction: vi.fn(async () => ({
    ok: true,
    created: {
      id: "key-new",
      name: "CI Key",
      token: "tok_secret_123",
      keyPrefix: "sk_ci_",
      scopes: ["read"],
      createdAt: "2026-05-01T00:00:00Z",
    },
  })),
  revokeAPIKeyAction: vi.fn(async () => ({ ok: true })),
  triggerBackupAction: vi.fn(async () => ({
    ok: true,
    backup: {
      id: "bak-new",
      kind: "database",
      fileName: "db-2026.sql.gz",
      fileSize: 1024,
      checksum: "abc123",
      status: "completed",
      createdBy: "it@example.test",
      createdAt: "2026-05-01T00:00:00Z",
    },
  })),
  verifyBackupAction: vi.fn(async () => ({ ok: true, valid: true })),
  saveCompanyAction: vi.fn(async () => ({ ok: true })),
  finishCompanySetupAction: vi.fn(async () => ({ ok: true })),
  removeCompanyAssetAction: vi.fn(async () => ({ ok: true })),
  uploadCompanyAssetAction: vi.fn(async () => ({ ok: true, url: "/media/uploaded.png" })),
  createITAccountAction: vi.fn(async () => ({ ok: true })),
  updateITAccountAction: vi.fn(async () => ({ ok: true })),
  retryJobAction: vi.fn(async () => ({ ok: true })),
  discardJobAction: vi.fn(async () => ({ ok: true })),
  setDebugToggleAction: vi.fn(async () => ({ ok: true })),
  removeDebugToggleAction: vi.fn(async () => ({ ok: true })),
  revokeSessionAction: vi.fn(async () => ({ ok: true })),
  getITRolesAction: vi.fn(async () => ({ ok: true, items: [] })),
  saveITRoleAction: vi.fn(async () => ({ ok: true })),
  deleteITRoleAction: vi.fn(async () => ({ ok: true })),
  saveSitePresentationAction: vi.fn(async () => ({ ok: true })),
  createItSocialLinkAction: vi.fn(async () => ({ ok: true, link: { id: "soc-new", platform: "x", url: "https://x.com/test", is_active: true, display_order: 1 } })),
  updateItSocialLinkAction: vi.fn(async () => ({ ok: true })),
  deleteItSocialLinkAction: vi.fn(async () => ({ ok: true })),
  publishItWebsiteSnapshotAction: vi.fn(async () => ({ ok: true, revision: 2 })),
  revalidatePublicSiteFromItAction: vi.fn(async () => ({ ok: true })),
  copyStaffAccessAction: vi.fn(async () => ({ ok: true, overrides: { "crm:read": true }, dataScopes: { crm: "all" } })),
  previewStaffAccessAction: vi.fn(async () => ({ ok: true, preview: { subjectId: "st-1", role: "admin", permissions: { "crm:read": true }, dataScopes: { crm: "all" } } })),
  saveStaffAccountAction: vi.fn(async () => ({ ok: true })),
  inviteStaffAccountAction: vi.fn(async () => ({ ok: true, inviteUrl: "https://admin.example.test/invite/123" })),
  resetStaffMFAAction: vi.fn(async () => ({ ok: true })),
  suspendStaffAccountAction: vi.fn(async () => ({ ok: true })),
  unsuspendStaffAccountAction: vi.fn(async () => ({ ok: true })),
  saveStaffRoleAction: vi.fn(async () => ({ ok: true })),
  deleteStaffRoleAction: vi.fn(async () => ({ ok: true })),
  signInAction: vi.fn(async () => ({ ok: true })),
  signOutAction: vi.fn(async () => ({ ok: true })),
  setLocaleAction: vi.fn(async () => ({ ok: true })),
  transitionAction: vi.fn(async () => ({ ok: true })),
  commentAction: vi.fn(async () => ({ ok: true })),
  uploadAttachmentAction: vi.fn(async () => ({ ok: true })),
  updateSLAAction: vi.fn(async () => ({ ok: true })),
  setModuleAction: vi.fn(async () => ({ ok: true })),
  saveIntegrationAction: vi.fn(async () => ({ ok: true })),
  unlinkIntegrationAction: vi.fn(async () => ({ ok: true })),
  testIntegrationAction: vi.fn(async () => ({ ok: true, status: "healthy" })),
  syncIntegrationAction: vi.fn(async () => ({ ok: true })),
  sendWhatsAppTestAction: vi.fn(async () => ({ ok: true })),
  sendTestMessageAction: vi.fn(async () => ({ ok: true })),
  retryMessageAction: vi.fn(async () => ({ ok: true })),
  saveSiteDomainsAction: vi.fn(async () => ({ ok: true })),
  checkSiteDomainAction: vi.fn(async () => ({ ok: true, result: { valid: true, matched: true, records: [] } })),
  saveSiteCodeAction: vi.fn(async () => ({ ok: true })),
  beginItMFAAction: vi.fn(async () => ({
    ok: true,
    provisioning: {
      subjectId: "it-1",
      secret: "JBSWY3DPEHPK3PXP",
      otpAuthUrl: "otpauth://totp/IT:it@example.test?secret=JBSWY3DPEHPK3PXP",
      recoveryCodes: ["AAAA-BBBB"],
    },
  })),
  cancelItMFAAction: vi.fn(async () => ({ ok: true })),
  confirmItMFAAction: vi.fn(async () => ({ ok: true })),
  disableItMFAAction: vi.fn(async () => ({ ok: true })),
  getItSecurityStatusAction: vi.fn(async () => ({ ok: true, mfaEnabled: false, hasPassword: true })),
  forgotPasswordAction: vi.fn(async () => ({ ok: true })),
  resetPasswordAction: vi.fn(async () => ({ ok: true })),
  setMaintenanceAction: vi.fn(async () => ({ ok: true, active: true })),
  inboxAction: vi.fn(async () => ({ ok: true })),
  savePreferencesAction: vi.fn(async () => ({ ok: true })),
  muteRecordAction: vi.fn(async () => ({ ok: true })),
  unmuteRecordAction: vi.fn(async () => ({ ok: true })),
  setStatusAction: vi.fn(async () => ({ ok: true })),
  clearStatusAction: vi.fn(async () => ({ ok: true })),
};

vi.mock("../../app/(desk)/api-keys/actions", () => ({
  createAPIKeyAction: itActionMocks.createAPIKeyAction,
  revokeAPIKeyAction: itActionMocks.revokeAPIKeyAction,
}));
vi.mock("../../app/(desk)/backups/actions", () => ({
  triggerBackupAction: itActionMocks.triggerBackupAction,
  verifyBackupAction: itActionMocks.verifyBackupAction,
}));
vi.mock("../../app/(desk)/company/actions", () => ({
  saveCompanyAction: itActionMocks.saveCompanyAction,
  finishCompanySetupAction: itActionMocks.finishCompanySetupAction,
  removeCompanyAssetAction: itActionMocks.removeCompanyAssetAction,
  uploadCompanyAssetAction: itActionMocks.uploadCompanyAssetAction,
}));
vi.mock("../../app/(desk)/it-accounts/actions", () => ({
  createITAccountAction: itActionMocks.createITAccountAction,
  updateITAccountAction: itActionMocks.updateITAccountAction,
}));
vi.mock("../../app/(desk)/jobs/actions", () => ({
  retryJobAction: itActionMocks.retryJobAction,
  discardJobAction: itActionMocks.discardJobAction,
}));
vi.mock("../../app/(desk)/logs/actions", () => ({
  setDebugToggleAction: itActionMocks.setDebugToggleAction,
  removeDebugToggleAction: itActionMocks.removeDebugToggleAction,
}));
vi.mock("../../app/(desk)/sessions/actions", () => ({
  revokeSessionAction: itActionMocks.revokeSessionAction,
}));
vi.mock("../../app/(desk)/settings/actions", () => ({
  getITRolesAction: itActionMocks.getITRolesAction,
  saveITRoleAction: itActionMocks.saveITRoleAction,
  deleteITRoleAction: itActionMocks.deleteITRoleAction,
}));
vi.mock("../../app/(desk)/site/actions", () => ({
  saveSitePresentationAction: itActionMocks.saveSitePresentationAction,
  createItSocialLinkAction: itActionMocks.createItSocialLinkAction,
  updateItSocialLinkAction: itActionMocks.updateItSocialLinkAction,
  deleteItSocialLinkAction: itActionMocks.deleteItSocialLinkAction,
  publishItWebsiteSnapshotAction: itActionMocks.publishItWebsiteSnapshotAction,
  revalidatePublicSiteFromItAction: itActionMocks.revalidatePublicSiteFromItAction,
}));
vi.mock("../../app/(desk)/staff-accounts/actions", () => ({
  copyStaffAccessAction: itActionMocks.copyStaffAccessAction,
  previewStaffAccessAction: itActionMocks.previewStaffAccessAction,
  saveStaffAccountAction: itActionMocks.saveStaffAccountAction,
  inviteStaffAccountAction: itActionMocks.inviteStaffAccountAction,
  resetStaffMFAAction: itActionMocks.resetStaffMFAAction,
  suspendStaffAccountAction: itActionMocks.suspendStaffAccountAction,
  unsuspendStaffAccountAction: itActionMocks.unsuspendStaffAccountAction,
}));
vi.mock("../../app/(desk)/staff-roles/actions", () => ({
  saveStaffRoleAction: itActionMocks.saveStaffRoleAction,
  deleteStaffRoleAction: itActionMocks.deleteStaffRoleAction,
}));
vi.mock("../../app/(desk)/database/actions", () => ({
  setMaintenanceAction: itActionMocks.setMaintenanceAction,
}));
vi.mock("../../app/actions", () => ({
  signInAction: itActionMocks.signInAction,
  signOutAction: itActionMocks.signOutAction,
  setLocaleAction: itActionMocks.setLocaleAction,
  transitionAction: itActionMocks.transitionAction,
  commentAction: itActionMocks.commentAction,
  uploadAttachmentAction: itActionMocks.uploadAttachmentAction,
  updateSLAAction: itActionMocks.updateSLAAction,
  setModuleAction: itActionMocks.setModuleAction,
  saveIntegrationAction: itActionMocks.saveIntegrationAction,
  unlinkIntegrationAction: itActionMocks.unlinkIntegrationAction,
  testIntegrationAction: itActionMocks.testIntegrationAction,
  syncIntegrationAction: itActionMocks.syncIntegrationAction,
  sendWhatsAppTestAction: itActionMocks.sendWhatsAppTestAction,
  sendTestMessageAction: itActionMocks.sendTestMessageAction,
  retryMessageAction: itActionMocks.retryMessageAction,
  saveSiteDomainsAction: itActionMocks.saveSiteDomainsAction,
  checkSiteDomainAction: itActionMocks.checkSiteDomainAction,
  saveSiteCodeAction: itActionMocks.saveSiteCodeAction,
  beginItMFAAction: itActionMocks.beginItMFAAction,
  cancelItMFAAction: itActionMocks.cancelItMFAAction,
  confirmItMFAAction: itActionMocks.confirmItMFAAction,
  disableItMFAAction: itActionMocks.disableItMFAAction,
  getItSecurityStatusAction: itActionMocks.getItSecurityStatusAction,
  forgotPasswordAction: itActionMocks.forgotPasswordAction,
  resetPasswordAction: itActionMocks.resetPasswordAction,
}));
vi.mock("../../app/live-actions", () => ({
  inboxAction: itActionMocks.inboxAction,
  savePreferencesAction: itActionMocks.savePreferencesAction,
  muteRecordAction: itActionMocks.muteRecordAction,
  unmuteRecordAction: itActionMocks.unmuteRecordAction,
  setStatusAction: itActionMocks.setStatusAction,
  clearStatusAction: itActionMocks.clearStatusAction,
}));

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
}

if (typeof URL !== "undefined") {
  if (!URL.createObjectURL) URL.createObjectURL = vi.fn(() => "blob:it-object-url");
  if (!URL.revokeObjectURL) URL.revokeObjectURL = vi.fn();
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  const es = (globalThis as { EventSource?: { instances?: unknown[] } }).EventSource;
  if (es?.instances) es.instances.length = 0;
  mockNavigation.pathname = "/";
  mockNavigation.searchParams = new URLSearchParams();
  document.body.style.overflow = "";
  localStorage.clear();
  sessionStorage.clear();
});
