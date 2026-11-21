import { expect, type Page } from "@playwright/test";
import path from "node:path";

// Resolve from repo root so each app passes its own @playwright/test `expect`
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createPlaywrightAudit } = require(path.resolve(__dirname, "../../../../../scripts/create-playwright-audit.cjs")) as {
  createPlaywrightAudit: (exp: typeof expect) => StrictAuditKit;
};

export interface ExpectedFailureRule {
  status?: number | number[];
  urlPattern?: RegExp | string;
  requireHit?: boolean;
}

export interface StrictObserver {
  suiteName: string;
  errors: string[];
  unexpectedHttp: string[];
  requests: Array<{
    type: string;
    method: string;
    url: string;
    status: number;
    resourceType: string;
    isServerAction: boolean;
    allowed: boolean;
  }>;
  clear: () => void;
  assertClean: (contextLabel?: string) => Promise<void>;
}

export interface StrictAuditKit {
  ROOT: string;
  LOGS_DIR: string;
  MANIFEST_PATH: string;
  loadRootEnv: () => Record<string, string>;
  mintServiceToken: (caller?: string) => string;
  generateTotp: (secret: string, atMs?: number) => string;
  acquireItTotp: (secret: string) => Promise<{ code: string; step: number }>;
  getCachedItAuth: (gatewayUrl?: string) => Promise<{ accessToken: string; refreshToken: string; subjectId: string; sessionId: string; exp: number }>;
  clearItTokenCache: () => void;
  resetSuiteLog: (suiteName: string) => void;
  appendJsonlLog: (suiteName: string, record: Record<string, unknown>) => void;
  loadManifest: () => Record<string, any>;
  fetchMailpitMessage: (toEmail: string, subjectRegex?: RegExp | null, timeoutMs?: number) => Promise<any>;
  extractOtpCode: (msg: any) => string;
  extractResetUrl: (msg: any) => string;
  fetchWhatsAppMessages: () => Promise<any>;
  createStrictObserver: (page: Page, suiteName: string) => StrictObserver;
  allowExpectedFailure: <T>(observer: StrictObserver, rule: ExpectedFailureRule, fn: () => Promise<T>) => Promise<T>;
  auditAllTabs: (page: Page, options?: { minTabs?: number }) => Promise<string[]>;
  verifyReloadPersistence: (page: Page, assertFn: () => Promise<void>) => Promise<void>;
  gotoStrict: (page: Page, route: string, observer?: StrictObserver) => Promise<any>;
  loginAsAdminStrict: (page: Page, creds?: { username?: string; password?: string } | null) => Promise<void>;
  loadItAccount: () => { email: string; username: string; password: string; secret: string };
  loginToItStrict: (page: Page, account?: any) => Promise<{ email: string; username: string; password: string; secret: string }>;
}

const kit = createPlaywrightAudit(expect);

export const {
  ROOT,
  LOGS_DIR,
  MANIFEST_PATH,
  loadRootEnv,
  mintServiceToken,
  generateTotp,
  acquireItTotp,
  getCachedItAuth,
  clearItTokenCache,
  resetSuiteLog,
  appendJsonlLog,
  loadManifest,
  fetchMailpitMessage,
  extractOtpCode,
  extractResetUrl,
  fetchWhatsAppMessages,
  createStrictObserver,
  allowExpectedFailure,
  auditAllTabs,
  verifyReloadPersistence,
  gotoStrict,
  loginAsAdminStrict,
  loadItAccount,
  loginToItStrict,
} = kit;
