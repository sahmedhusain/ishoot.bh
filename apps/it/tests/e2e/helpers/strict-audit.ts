import { expect, type Page } from "@playwright/test";
import path from "node:path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createPlaywrightAudit } = require(path.resolve(__dirname, "../../../../../scripts/create-playwright-audit.cjs"));

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
} = kit as ReturnType<typeof Object> & {
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
  createStrictObserver: (page: Page, suiteName: string) => any;
  allowExpectedFailure: <T>(observer: any, rule: { status?: number | number[]; urlPattern?: RegExp | string; requireHit?: boolean }, fn: () => Promise<T>) => Promise<T>;
  auditAllTabs: (page: Page, options?: { minTabs?: number }) => Promise<string[]>;
  verifyReloadPersistence: (page: Page, assertFn: () => Promise<void>) => Promise<void>;
  gotoStrict: (page: Page, route: string, observer?: any) => Promise<any>;
  loginAsAdminStrict: (page: Page, creds?: { username?: string; password?: string } | null) => Promise<void>;
  loadItAccount: () => { email: string; username: string; password: string; secret: string };
  loginToItStrict: (page: Page, account?: any) => Promise<{ email: string; username: string; password: string; secret: string }>;
};
