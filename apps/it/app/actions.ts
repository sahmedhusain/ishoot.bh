"use server";

import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  beginMFAEnrollment,
  cancelMFAEnrollment,
  claimUpload,
  commentOnQueueTicket,
  confirmMFAEnrollment,
  confirmPasswordReset,
  disableMFA,
  getOwnAccount,
  getQueueTicket,
  getCompanySetupStatusForIT,
  isApiError,
  queueMessage,
  registerUpload,
  requestPasswordReset,
  retryMessageForIT,
  sendTestMessageForIT,
  setIntegrationForIT,
  setModuleForIT,
  setSiteCodeForIT,
  setSiteDomainsForIT,
  type SiteCode,
  signIn,
  signOut,
  transitionQueueTicket,
  unlinkIntegrationForIT,
  updateSLA,
  writeUpload,
} from "@platform/api-client";
import { itPublicOrigin } from "../lib/origin";
import { testIntegration, syncSocialIntegration } from "../lib/integrations";
import {
  checkDomain,
  healthFingerprint,
  type DomainCheckResult,
} from "@platform/config/domain-check";
import { TICKET_PRIORITIES, transitionsFrom } from "@platform/contracts";
import { config } from "../lib/config";
import {
  REALM,
  clearedCookies,
  sessionCookies,
  type CookieSpec,
} from "../lib/credentials";
import { revalidatePublicSite } from "../lib/revalidate-web";
import { asUser, requireAllowed, requireUser } from "../lib/session";
import { announceTicketChange } from "../lib/live";

export type SignInState = {
  step: "password" | "otp";
  error?: "invalid" | "unavailable";
};

const text = (form: FormData, name: string, max: number) => {
  const value = form.get(name);
  return typeof value === "string" ? value.slice(0, max) : "";
};

async function setCookies(list: CookieSpec[]) {
  const jar = await cookies();
  for (const c of list) jar.set(c.name, c.value, c.options);
}

export async function signInAction(
  _: SignInState,
  form: FormData,
): Promise<SignInState> {
  const identifier = (
    text(form, "username", 254) ||
    text(form, "email", 254)
  ).trim().toLowerCase();
  const password = text(form, "password", 1024);
  const otp = text(form, "otp", 64).replace(/\s+/g, "");
  const step = otp ? "otp" : "password";
  if (!identifier || !password) return { step, error: "invalid" };
  const header = config.clientIpHeader();
  const clientIp = header
    ? (await headers()).get(header)?.split(",")[0]?.trim().slice(0, 45)
    : undefined;
  let targetUrl = "/";
  try {
    const credential = await signIn(REALM, {
      email: identifier,
      password,
      otp: otp || undefined,
      clientIp: clientIp || undefined,
    });
    await setCookies(sessionCookies(credential, identifier));
    const status = await getCompanySetupStatusForIT(credential.accessToken).catch(() => null);
    if (status && status.finished === false) {
      targetUrl = "/setup";
    }
  } catch (error) {
    if (isApiError(error, "mfa_required")) return { step: "otp" };
    if (isApiError(error) && (error.status === 401 || error.status === 422))
      return { step, error: "invalid" };
    return { step, error: "unavailable" };
  }
  redirect(targetUrl);
}

export async function signOutAction() {
  const refresh = (await cookies()).get(config.refreshCookie())?.value;
  if (refresh) await signOut(REALM, refresh).catch(() => undefined);
  await setCookies(clearedCookies());
  redirect("/login");
}

export async function setLocaleAction(locale: string) {
  if (locale !== "en" && locale !== "ar") return;
  (await cookies()).set(config.localeCookie(), locale, {
    httpOnly: true,
    secure: config.secureCookies(),
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}

export type Outcome = { ok: boolean };

async function attempt(call: () => Promise<unknown>): Promise<Outcome> {
  try {
    await asUser(call);
    return { ok: true };
  } catch (error) {
    if (isApiError(error) && (error.status === 409 || error.status === 422))
      return { ok: false };
    throw error;
  }
}

const refresh = (id: string) => {
  revalidatePath("/");
  revalidatePath("/tickets");
  revalidatePath(`/tickets/${id}`);
};

export type AttachmentInput = {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

export async function transitionAction(
  id: string,
  status: string,
  transition: string,
  targetAssigneeId?: string,
  targetAssigneeName?: string,
): Promise<Outcome> {
  const user = await requireAllowed(
    "tickets",
    transition === "assign" ? "assign" : "edit",
  );
  if (!transitionsFrom(status).includes(transition as never))
    return { ok: false };
  const assignee =
    transition === "assign"
      ? {
          assigneeId: targetAssigneeId?.trim() || user.subject,
          assigneeName: targetAssigneeName?.trim() || user.email || user.subject,
        }
      : {};
  let ticket: { id: string; number: number; requesterId: string } | undefined;
  const outcome = await attempt(async () => {
    ticket = await transitionQueueTicket(user.token, id, { transition, ...assignee });
  });
  if (outcome.ok && ticket) await announceTicketChange(ticket, "status");
  refresh(id);
  return outcome;
}

export async function commentAction(
  id: string,
  body: string,
  internal: boolean,
  attachments?: AttachmentInput[],
): Promise<Outcome> {
  const user = await requireAllowed("tickets", "edit");
  const message = body.trim().slice(0, 10000);
  if (!message) return { ok: false };
  const validAttachments = Array.isArray(attachments)
    ? attachments
        .filter((a) => a && a.fileUrl && a.fileName && a.mimeType && a.fileSize > 0)
        .slice(0, 10)
    : undefined;
  const outcome = await attempt(() =>
    commentOnQueueTicket(user.token, id, message, internal === true, validAttachments),
  );
  if (outcome.ok) {
    const detail = await getQueueTicket(user.token, id).catch(() => null);
    if (detail) await announceTicketChange(detail.ticket, internal === true ? "note" : "reply");
  }
  refresh(id);
  return outcome;
}

export async function uploadAttachmentAction(
  form: FormData,
): Promise<{ ok: boolean; attachment?: AttachmentInput; error?: string }> {
  const user = await requireAllowed("tickets", "edit");
  const file = form.get("file");
  if (!file || typeof file === "string") return { ok: false, error: "file_required" };
  const value = file as File;
  if (value.size > 10 * 1024 * 1024) return { ok: false, error: "file_too_large" };
  const mime = value.type || "application/octet-stream";
  try {
    const upload = await registerUpload({
      ownerId: user.subject,
      folder: "general",
      fileName: value.name.slice(0, 200),
      fileSize: value.size,
      mimeType: mime,
    });
    await writeUpload(upload.fileUrl, user.subject, await value.arrayBuffer(), value.size);
    const claimed = await claimUpload(upload.fileUrl, user.subject, { requirePrivate: true });
    return {
      ok: true,
      attachment: {
        fileUrl: claimed.fileUrl,
        fileName: claimed.fileName,
        mimeType: claimed.mimeType,
        fileSize: claimed.fileSize,
      },
    };
  } catch {
    return { ok: false, error: "upload_failed" };
  }
}

export async function updateSLAAction(
  priority: string,
  responseMinutes: number,
  resolveMinutes: number,
): Promise<Outcome> {
  const user = await requireAllowed("ticket_settings", "edit");
  if (
    !TICKET_PRIORITIES.includes(priority) ||
    !Number.isInteger(responseMinutes) ||
    !Number.isInteger(resolveMinutes)
  ) {
    return { ok: false };
  }
  const outcome = await attempt(() =>
    updateSLA(user.token, priority, { responseMinutes, resolveMinutes }),
  );
  revalidatePath("/sla");
  return outcome;
}

export async function setModuleAction(
  key: string,
  enabled: boolean,
): Promise<Outcome> {
  const user = await requireAllowed("modules", "edit");
  const outcome = await attempt(() =>
    setModuleForIT(user.token, key, enabled === true),
  );
  revalidatePath("/modules");
  return outcome;
}

export async function saveIntegrationAction(
  provider: string,
  isActive: boolean,
  values: Record<string, string>,
  config: Record<string, unknown> = {},
): Promise<Outcome> {
  const user = await requireAllowed("integrations", "edit");
  const outcome = await attempt(() =>
    setIntegrationForIT(user.token, provider, {
      isActive: isActive === true,
      values,
      config,
    }),
  );
  revalidatePath("/integrations");
  return outcome;
}

export async function unlinkIntegrationAction(
  provider: string,
): Promise<Outcome> {
  const user = await requireAllowed("integrations", "delete");
  const outcome = await attempt(() =>
    unlinkIntegrationForIT(user.token, provider),
  );
  revalidatePath("/integrations");
  return outcome;
}

export async function testIntegrationAction(provider: string) {
  await requireAllowed("integrations", "execute");
  try {
    const result = await testIntegration(provider);
    revalidatePath("/integrations");
    return {
      ok: result.ok,
      validation: result.validation ?? null,
      accountName: result.accountName ?? null,
      error: result.error ?? null,
    };
  } catch (error) {
    return {
      ok: false,
      validation: null,
      accountName: null,
      error: error instanceof Error ? error.message : "Connection check failed",
    };
  }
}

export async function syncIntegrationAction(provider: string) {
  await requireAllowed("integrations", "execute");
  try {
    const result = await syncSocialIntegration(provider);
    revalidatePath("/integrations");
    return { ...result, ok: true as const, error: null };
  } catch (error) {
    revalidatePath("/integrations");
    return {
      ok: false as const,
      posts: 0,
      metrics: 0,
      error: error instanceof Error ? error.message : "Sync failed",
    };
  }
}

export async function sendWhatsAppTestAction(to: string) {
  const user = await requireAllowed("integrations", "execute");
  try {
    const message = await asUser(() =>
      sendTestMessageForIT(user.token, "whatsapp", String(to).slice(0, 32)),
    );
    revalidatePath("/notifications");
    return { ok: true, messageId: message.id, error: null };
  } catch (error) {
    if (isApiError(error) && error.status === 422)
      return { ok: false, messageId: null, error: error.message };
    throw error;
  }
}

export async function sendTestMessageAction(
  channel: string,
  to: string,
): Promise<Outcome> {
  const user = await requireAllowed("notifications", "execute");
  if (channel !== "email" && channel !== "whatsapp") return { ok: false };
  const outcome = await attempt(() =>
    sendTestMessageForIT(user.token, channel, String(to).slice(0, 320)),
  );
  revalidatePath("/notifications");
  return outcome;
}

export async function retryMessageAction(id: string): Promise<Outcome> {
  const user = await requireAllowed("notifications", "execute");
  const outcome = await attempt(() =>
    retryMessageForIT(user.token, String(id)),
  );
  revalidatePath("/notifications");
  return outcome;
}

export type SiteOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "invalid" | "domainsMustDiffer" };

async function attemptSite<T>(call: () => Promise<T>): Promise<SiteOutcome<T>> {
  try {
    return { ok: true, value: await asUser(call) };
  } catch (error) {
    if (isApiError(error, "domains_must_differ"))
      return { ok: false, reason: "domainsMustDiffer" };
    if (isApiError(error) && error.status === 422)
      return { ok: false, reason: "invalid" };
    throw error;
  }
}

export async function saveSiteDomainsAction(
  websiteDomain: string,
  adminDomain: string,
) {
  const user = await requireAllowed("domains", "edit");
  const outcome = await attemptSite(() =>
    setSiteDomainsForIT(user.token, {
      websiteDomain: String(websiteDomain).slice(0, 300),
      adminDomain: String(adminDomain).slice(0, 300),
    }),
  );
  if (outcome.ok) {

    await revalidatePublicSite(["company"]);
    revalidatePath("/site");
  }
  return outcome;
}

export async function checkSiteDomainAction(
  kind: "website" | "admin",
  domain: string,
): Promise<DomainCheckResult | null> {
  await requireAllowed("domains", "execute");
  if (kind !== "website" && kind !== "admin") return null;
  const origin = kind === "admin" ? config.adminUrl() : config.webUrl();
  return checkDomain(kind, String(domain), () =>
    origin ? healthFingerprint(origin) : Promise.resolve(null),
  ).catch(() => null);
}

export async function saveSiteCodeAction(code: SiteCode) {
  const user = await requireAllowed("site_code", "edit");
  const text = (value: unknown, max: number) =>
    typeof value === "string" ? value.slice(0, max) : "";
  const outcome = await attemptSite(() =>
    setSiteCodeForIT(user.token, {
      googleAnalyticsId: text(code?.googleAnalyticsId, 40),
      metaPixelId: text(code?.metaPixelId, 40),
      tiktokPixelId: text(code?.tiktokPixelId, 40),
      headHtml: text(code?.headHtml, 50_000),
      bodyHtml: text(code?.bodyHtml, 50_000),
    }),
  );
  if (outcome.ok) revalidatePath("/site");
  return outcome;
}

export async function beginItMFAAction(password: string) {
  const user = await requireUser();
  if (!password || typeof password !== "string") return { ok: false, error: "Password required" };
  try {
    const setup = await beginMFAEnrollment(user.token, password);
    const issuer = "IT Desk";
    const uri = `otpauth://totp/${encodeURIComponent(issuer + ":" + user.email)}?${new URLSearchParams({
      secret: setup.secret,
      issuer,
      algorithm: "SHA1",
      digits: String(setup.digits),
      period: String(setup.periodSeconds),
    })}`;
    return { ok: true, secret: setup.secret, uri };
  } catch (err: any) {
    return { ok: false, error: isApiError(err) && err.status === 401 ? "invalid_password" : "error" };
  }
}

export async function cancelItMFAAction(password: string) {
  const user = await requireUser();
  try {
    await cancelMFAEnrollment(user.token, password);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function confirmItMFAAction(password: string, code: string) {
  const user = await requireUser();
  if (!password || !code) return { ok: false, error: "Missing fields" };
  try {
    const res = await confirmMFAEnrollment(user.token, password, code.replace(/\s+/g, ""));
    return { ok: true, recoveryCodes: res.recoveryCodes };
  } catch (err: any) {
    return { ok: false, error: isApiError(err) && err.status === 401 ? "invalid_code" : "error" };
  }
}

export async function disableItMFAAction(password: string, code: string) {
  const user = await requireUser();
  if (!password || !code) return { ok: false, error: "Missing fields" };
  try {
    await disableMFA(user.token, password, code.replace(/\s+/g, ""));
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: isApiError(err) && err.status === 401 ? "invalid_credentials" : "error" };
  }
}

export async function getItSecurityStatusAction() {
  const user = await requireUser();
  try {
    const acc = await getOwnAccount(user.token);
    return { ok: true, mfaEnabled: Boolean(acc.mfaEnabled), email: acc.email };
  } catch {
    return { ok: false, mfaEnabled: false, email: user.email };
  }
}

export type ForgotPasswordState = {
  success?: boolean;
  error?: "invalid" | "failed";
};

export async function forgotPasswordAction(
  _: ForgotPasswordState,
  form: FormData,
): Promise<ForgotPasswordState> {
  const identifier = (
    text(form, "username", 254) || text(form, "email", 254)
  ).trim().toLowerCase();
  if (!identifier) return { error: "invalid" };

  const header = config.clientIpHeader();
  const clientIp = header
    ? (await headers()).get(header)?.split(",")[0]?.trim().slice(0, 45)
    : undefined;

  try {
    const reset = await requestPasswordReset(REALM, identifier, clientIp);
    if (reset) {
      const origin = await itPublicOrigin();
      const resetUrl = `${origin}/login/reset?token=${encodeURIComponent(reset.token)}&email=${encodeURIComponent(identifier)}`;
      await queueMessage({
        channel: "email",
        to: reset.email,
        subject: "IT Account Password Reset Request",
        text: `Hello,\n\nYou requested a password reset for your IT account. Open the following link to reset your password:\n${resetUrl}\n\nIf you did not request this, please ignore this email.\nThis link expires in 15 minutes.`,
        html: `<p>Hello,</p><p>You requested a password reset for your IT account. Click the link below to reset your password:</p><p><a href="${resetUrl}">Reset IT Password</a></p><p>If you did not request this, please ignore this email.</p><p>This link expires in 15 minutes.</p>`,
        actorId: "identity",
        idempotencyKey: `it-pwd-reset:${createHash("sha256").update(reset.token).digest("hex")}`,
      });
    }
    return { success: true };
  } catch {
    return { success: true };
  }
}

export type ResetPasswordState = {
  success?: boolean;
  error?: "invalid" | "mismatch" | "too_short" | "invalid_token" | "failed";
};

export async function resetPasswordAction(
  _: ResetPasswordState,
  form: FormData,
): Promise<ResetPasswordState> {
  const token = text(form, "token", 64).trim();
  const email = text(form, "email", 254).trim().toLowerCase();
  const password = text(form, "password", 1024);
  const confirmPassword = text(form, "confirmPassword", 1024);

  if (!token || !email || !password) return { error: "invalid" };
  if (password !== confirmPassword) return { error: "mismatch" };
  if (password.length < 8) return { error: "too_short" };

  const header = config.clientIpHeader();
  const clientIp = header
    ? (await headers()).get(header)?.split(",")[0]?.trim().slice(0, 45)
    : undefined;

  try {
    const { subjectId } = await confirmPasswordReset(
      REALM,
      token,
      password,
      email,
      clientIp,
    );
    await queueMessage({
      channel: "email",
      to: email,
      subject: "Security Alert: IT Account Password Changed",
      text: `Hello,\n\nYour IT account password was just changed. If you did not perform this action, please contact your administrator immediately.`,
      html: `<p>Hello,</p><p>Your IT account password was just changed. If you did not perform this action, please contact your administrator immediately.</p>`,
      actorId: "identity",
      idempotencyKey: `it-pwd-changed:${subjectId}:${Date.now()}`,
    });
    return { success: true };
  } catch (err) {
    if (isApiError(err, "reset_invalid")) return { error: "invalid_token" };
    return { error: "failed" };
  }
}
