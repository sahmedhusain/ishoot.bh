"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  commentOnQueueTicket,
  isApiError,
  setIntegrationForIT,
  setModuleForIT,
  signIn,
  signOut,
  transitionQueueTicket,
  unlinkIntegrationForIT,
  updateSLA,
} from "@platform/api-client";
import {
  testIntegration,
  syncSocialIntegration,
  sendWhatsAppTestMessage,
} from "@platform/database";
import { TICKET_PRIORITIES, transitionsFrom } from "@platform/contracts";
import { config } from "../lib/config";
import {
  REALM,
  clearedCookies,
  sessionCookies,
  type CookieSpec,
} from "../lib/credentials";
import { asUser, requireAllowed } from "../lib/session";

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

/** Password first; when identity asks for it, the authenticator or recovery code. */
export async function signInAction(
  _: SignInState,
  form: FormData,
): Promise<SignInState> {
  const email = text(form, "email", 254).trim().toLowerCase();
  const password = text(form, "password", 1024);
  const otp = text(form, "otp", 64).replace(/\s+/g, "");
  const step = otp ? "otp" : "password";
  if (!email || !password) return { step, error: "invalid" };
  const header = config.clientIpHeader();
  const clientIp = header
    ? (await headers()).get(header)?.split(",")[0]?.trim().slice(0, 45)
    : undefined;
  try {
    const credential = await signIn(REALM, {
      email,
      password,
      otp: otp || undefined,
      clientIp: clientIp || undefined,
    });
    await setCookies(sessionCookies(credential, email));
  } catch (error) {
    if (isApiError(error, "mfa_required")) return { step: "otp" };
    if (isApiError(error) && (error.status === 401 || error.status === 422))
      return { step, error: "invalid" };
    return { step, error: "unavailable" };
  }
  redirect("/");
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

/** Expected refusals (a stale status, an invalid value) come back as a result; anything else is an error. */
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

/** A catalogue transition; "assign" assigns the ticket to the person acting. */
export async function transitionAction(
  id: string,
  status: string,
  transition: string,
): Promise<Outcome> {
  const user = await requireAllowed(
    "tickets",
    transition === "assign" ? "assign" : "edit",
  );
  if (!transitionsFrom(status).includes(transition as never))
    return { ok: false };
  const assignee =
    transition === "assign"
      ? { assigneeId: user.subject, assigneeName: user.email || user.subject }
      : {};
  const outcome = await attempt(() =>
    transitionQueueTicket(user.token, id, { transition, ...assignee }),
  );
  refresh(id);
  return outcome;
}

export async function commentAction(
  id: string,
  body: string,
  internal: boolean,
): Promise<Outcome> {
  const user = await requireAllowed("tickets", "edit");
  const message = body.trim().slice(0, 10000);
  if (!message) return { ok: false };
  const outcome = await attempt(() =>
    commentOnQueueTicket(user.token, id, message, internal === true),
  );
  refresh(id);
  return outcome;
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

/** Switches a platform module for everyone (modules:edit). */
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

/** Saves an integration's settings (integrations:edit). */
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

/** Disconnects and clears credentials of an integration (integrations:delete). */
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

/** Tests the live connection for an integration (integrations:execute). */
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

/** Syncs social accounts now (integrations:execute). */
export async function syncIntegrationAction(provider: string) {
  await requireAllowed("integrations", "execute");
  try {
    const result = await syncSocialIntegration(provider);
    revalidatePath("/integrations");
    return { ok: true as const, ...result, error: null };
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

/** Sends a test message via WhatsApp (integrations:execute). */
export async function sendWhatsAppTestAction(to: string, message: string) {
  await requireAllowed("integrations", "execute");
  try {
    const result = await sendWhatsAppTestMessage(to, message);
    return { ok: true, messageId: result.messageId, error: null };
  } catch (error) {
    return {
      ok: false,
      messageId: null,
      error: error instanceof Error ? error.message : "WhatsApp send failed",
    };
  }
}
