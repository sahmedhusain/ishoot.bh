import { serverMessages } from "@platform/locales";
import { resolveSigningSignature } from "./signature-policies";
import { runAtomicMutation } from "../api/atomic";
import { listTableRows, upsertTableRow } from "../api/tables";
import { ROUTES } from "../constants/routes";
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_PRIORITIES,
} from "../constants/communications";
import {
  registerApprovalFinalizer,
  submitForApproval,
  cancelPendingApprovals,
} from "../services/approval-engine";
import { getEffectivePermissions } from "./permissions";
import { getNextSequenceNumber } from "./sequence";

const toIso = (v: unknown): string | null =>
  v ? new Date(v as any).toISOString() : null;

export async function getCommunicationSettings() {
  const rows = await listTableRows<Record<string, any>>("system", "communication_settings");
  const row = rows.find((r) => r.id === "default");
  return { managersAnnounceToTeam: row?.managersAnnounceToTeam ?? true };
}

export async function updateCommunicationSettings(
  input: { managersAnnounceToTeam: boolean },
  actorId: string,
) {
  await upsertTableRow("system", "communication_settings", {
    id: "default",
    managersAnnounceToTeam: !!input.managersAnnounceToTeam,
    updatedById: actorId,
  });
  return getCommunicationSettings();
}

async function reportsOf(userId: string): Promise<string[]> {
  const users = (await listTableRows<Record<string, any>>("identity", "user")).filter(
    (u) => u.isActive,
  );
  const out: string[] = [];
  const queue = [userId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const u of users)
      if (u.managerId === current && !out.includes(String(u.id)) && u.id !== userId) {
        out.push(String(u.id));
        queue.push(String(u.id));
      }
  }
  return out;
}

export async function announcementRights(user: {
  id: string;
  role: string;
  permissions?: unknown;
}) {
  const permissions = await getEffectivePermissions(
    user.role,
    user.permissions as Record<string, boolean> | null,
  );
  const can = (action: string) =>
    user.role === "super_admin" ||
    permissions[`announcements:${action}`] === true;
  const settings = await getCommunicationSettings();
  let managesTeam = false;
  if (settings.managersAnnounceToTeam) {
    const users = await listTableRows<Record<string, any>>("identity", "user");
    managesTeam = users.some((u) => u.managerId === user.id && u.isActive);
  }
  return {
    read: can("read"),
    createAny: can("create"),
    createTeam: can("create") || managesTeam,
    approve: can("approve"),
    manageAll: can("approve") || can("delete"),
  };
}

export async function announcementRecipients(a: {
  audience: string;
  audienceDepartmentIds: string[];
  audienceRoles: string[];
  audienceUserIds: string[];
  createdById: string;
}): Promise<string[]> {
  const users = (await listTableRows<Record<string, any>>("identity", "user")).filter(
    (u) => u.isActive,
  );
  const activeUserIds = new Set(users.map((u) => String(u.id)));
  let ids: string[] = [];
  if (a.audience === "company") {
    ids = users.map((u) => String(u.id));
  } else if (a.audience === "team") {
    ids = await reportsOf(a.createdById);
  } else if (a.audience === "departments") {
    const deptSet = new Set(a.audienceDepartmentIds);
    const employees = await listTableRows<Record<string, any>>("hr", "employee");
    ids = employees
      .filter(
        (e) =>
          deptSet.has(String(e.departmentId)) &&
          e.userId &&
          activeUserIds.has(String(e.userId)),
      )
      .map((e) => String(e.userId));
  } else if (a.audience === "roles") {
    const roleSet = new Set(a.audienceRoles);
    ids = users
      .filter((u) => roleSet.has(String(u.role)))
      .map((u) => String(u.id));
  } else {
    const targetSet = new Set(a.audienceUserIds);
    ids = users
      .filter((u) => targetSet.has(String(u.id)))
      .map((u) => String(u.id));
  }
  return Array.from(new Set([...ids, a.createdById]));
}

export interface AnnouncementInput {
  title_en: string;
  title_ar: string;
  body_en: string;
  body_ar: string;
  category: string;
  priority: string;
  audience: string;
  audience_department_ids?: string[];
  audience_roles?: string[];
  audience_user_ids?: string[];
  official: boolean;
  requires_acknowledgement: boolean;
  pinned?: boolean;
  publish_at?: string | null;
  expires_at?: string | null;
}

async function normalize(
  input: AnnouncementInput,
  rights: Awaited<ReturnType<typeof announcementRights>>,
) {
  const titleEn = input.title_en?.trim().slice(0, 200);
  const titleAr = input.title_ar?.trim().slice(0, 200);
  const bodyEn = input.body_en?.trim().slice(0, 20000);
  const bodyAr = input.body_ar?.trim().slice(0, 20000);
  if (!titleEn || !titleAr) throw new Error(serverMessages.communicationError0);
  if (!bodyEn || !bodyAr) throw new Error(serverMessages.communicationError1);
  if (!(ANNOUNCEMENT_CATEGORIES as readonly string[]).includes(input.category))
    throw new Error(serverMessages.communicationError2);
  if (!(ANNOUNCEMENT_PRIORITIES as readonly string[]).includes(input.priority))
    throw new Error(serverMessages.communicationError3);
  if (!(ANNOUNCEMENT_AUDIENCES as readonly string[]).includes(input.audience))
    throw new Error(serverMessages.communicationError4);
  if (!rights.createAny && input.audience !== "team")
    throw new Error(serverMessages.communicationError5);
  if (!rights.createTeam) throw new Error(serverMessages.communicationError6);
  const list = (v?: string[]) =>
    Array.from(new Set((v ?? []).filter((x) => typeof x === "string"))).slice(
      0,
      300,
    );
  const publishAt = input.publish_at ? new Date(input.publish_at) : null;
  const expiresAt = input.expires_at ? new Date(input.expires_at) : null;
  if (
    (publishAt && Number.isNaN(publishAt.getTime())) ||
    (expiresAt && Number.isNaN(expiresAt.getTime()))
  )
    throw new Error(serverMessages.invalidDate);
  if (publishAt && expiresAt && expiresAt <= publishAt)
    throw new Error(serverMessages.communicationError7);

  const data = {
    titleEn,
    titleAr,
    bodyEn,
    bodyAr,
    category: input.category,
    priority: input.priority,
    audience: input.audience,
    audienceDepartmentIds:
      input.audience === "departments"
        ? list(input.audience_department_ids)
        : [],
    audienceRoles: input.audience === "roles" ? list(input.audience_roles) : [],
    audienceUserIds:
      input.audience === "people" ? list(input.audience_user_ids) : [],
    official: !!input.official,
    requiresAcknowledgement: !!input.requires_acknowledgement,
    pinned: !!input.pinned && rights.createAny,
    publishAt: publishAt ? publishAt.toISOString() : null,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  };
  if (
    (data.audience === "departments" && !data.audienceDepartmentIds.length) ||
    (data.audience === "roles" && !data.audienceRoles.length) ||
    (data.audience === "people" && !data.audienceUserIds.length)
  )
    throw new Error(serverMessages.communicationError4);
  return data;
}

export async function saveAnnouncement(
  input: AnnouncementInput,
  actor: { id: string; role: string; permissions?: unknown },
  id?: string,
) {
  const rights = await announcementRights(actor);
  const data = await normalize(input, rights);
  return runAtomicMutation(async () => {
    if (id) {
      const rows = await listTableRows<Record<string, any>>("system", "announcement");
      const existing = rows.find((a) => a.id === id);
      if (!existing) throw new Error(serverMessages.communicationError8);
      if (existing.createdById !== actor.id && !rights.manageAll)
        throw new Error(serverMessages.communicationError9);
      if (!["draft", "rejected"].includes(String(existing.status)))
        throw new Error(serverMessages.communicationError10);
      return upsertTableRow("system", "announcement", {
        id,
        ...data,
        status: "draft",
      });
    }
    return upsertTableRow("system", "announcement", {
      id: crypto.randomUUID(),
      ...data,
      status: "draft",
      reference: await getNextSequenceNumber("ANN"),
      createdById: actor.id,
    });
  });
}

export async function submitAnnouncement(
  id: string,
  actor: { id: string; role: string; permissions?: unknown },
) {
  const rights = await announcementRights(actor);
  return runAtomicMutation(async () => {
    const rows = await listTableRows<Record<string, any>>("system", "announcement");
    const a = rows.find((r) => r.id === id);
    if (!a) throw new Error(serverMessages.communicationError8);
    if (a.createdById !== actor.id && !rights.manageAll)
      throw new Error(serverMessages.communicationError9);
    if (!["draft", "rejected"].includes(String(a.status)))
      throw new Error(serverMessages.communicationError11);
    await upsertTableRow("system", "announcement", {
      id,
      status: "pending_approval",
    });
    return submitForApproval({
      targetType: "announcement",
      targetId: id,
      requesterId: actor.id,
      policySnapshot: {
        reference: a.reference,
        official: a.official,
        audience: a.audience,
      },
    });
  });
}

async function publish(
  id: string,
  signer: { id: string; signature: string | null } | null,
) {
  const [rows, existingReceipts] = await Promise.all([
    listTableRows<Record<string, any>>("system", "announcement"),
    listTableRows<Record<string, any>>("system", "announcement_receipt"),
  ]);
  const a = rows.find((r) => r.id === id);
  if (!a) throw new Error(serverMessages.communicationError8);
  const now = new Date();
  const publishDate = a.publishAt && new Date(a.publishAt) > now ? new Date(a.publishAt) : now;
  const publishIso = publishDate.toISOString();

  await upsertTableRow("system", "announcement", {
    id,
    status: "published",
    publishedAt: publishIso,
    ...(a.official && signer
      ? {
          signedById: signer.id,
          signatureUrl: signer.signature,
          signedAt: now.toISOString(),
        }
      : {}),
  });

  const recipients = await announcementRecipients({
    audience: String(a.audience ?? "company"),
    audienceDepartmentIds: Array.isArray(a.audienceDepartmentIds) ? a.audienceDepartmentIds : [],
    audienceRoles: Array.isArray(a.audienceRoles) ? a.audienceRoles : [],
    audienceUserIds: Array.isArray(a.audienceUserIds) ? a.audienceUserIds : [],
    createdById: String(a.createdById ?? ""),
  });
  const existingUsers = new Set(
    existingReceipts.filter((r) => r.announcementId === id).map((r) => String(r.userId)),
  );
  for (const userId of recipients) {
    if (!existingUsers.has(userId)) {
      await upsertTableRow("system", "announcement_receipt", {
        id: crypto.randomUUID(),
        announcementId: id,
        userId,
      });
    }
    if (userId !== a.createdById) {
      await upsertTableRow("notify", "notification", {
        id: crypto.randomUUID(),
        userId,
        title: a.titleEn,
        message: a.titleAr,
        type: a.priority === "urgent" ? "warning" : "info",
        entityType: "announcement",
        entityId: id,
        messageKey: "announcements.notifications.published",
        messageParams: { nameEn: a.titleEn, nameAr: a.titleAr },
        actionUrl: ROUTES.announcements.detail(id),
        eventKey: `announcement:${id}:${userId}`,
        createdAt: publishIso,
      });
    }
  }
}

registerApprovalFinalizer("announcement", {
  async approve(id, decider) {
    const [announcements, requests, decisions] = await Promise.all([
      listTableRows<Record<string, any>>("system", "announcement"),
      listTableRows<Record<string, any>>("workflow", "approval_request"),
      listTableRows<Record<string, any>>("workflow", "approval_decision"),
    ]);
    const a = announcements.find((r) => r.id === id);
    if (!a) throw new Error(serverMessages.communicationError8);
    if (a.status !== "pending_approval")
      throw new Error(serverMessages.communicationError12);
    const reqIds = new Set(
      requests
        .filter((r) => r.targetType === "announcement" && r.targetId === id)
        .map((r) => String(r.id)),
    );
    const decision = decisions
      .filter(
        (d) =>
          d.decidedById === decider &&
          d.decision === "approved" &&
          reqIds.has(String(d.approvalRequestId)),
      )
      .sort((x, y) => new Date(y.decidedAt ?? 0).getTime() - new Date(x.decidedAt ?? 0).getTime())[0];

    const signature = a.official
      ? await resolveSigningSignature(
          "announcement",
          decider,
          decision?.signatureData,
        )
      : null;
    await publish(id, { id: decider, signature });
  },
  async reject(id, _decider, reason) {
    await upsertTableRow("system", "announcement", {
      id,
      status: "rejected",
      decisionNotes: reason || null,
    });
  },
});

export async function archiveAnnouncement(
  id: string,
  actor: { id: string; role: string; permissions?: unknown },
) {
  const rights = await announcementRights(actor);
  const rows = await listTableRows<Record<string, any>>("system", "announcement");
  const a = rows.find((r) => r.id === id);
  if (!a) throw new Error(serverMessages.communicationError8);
  if (a.createdById !== actor.id && !rights.manageAll)
    throw new Error(serverMessages.communicationError9);
  if (a.status === "pending_approval")
    await cancelPendingApprovals("announcement", id);
  return upsertTableRow("system", "announcement", {
    id,
    status: "archived",
    pinned: false,
  });
}

export type AnnouncementView = "inbox" | "unread" | "hidden" | "manage";

const mapAnnouncement = (
  a: Record<string, any> & { receipts: Record<string, any>[] },
  userId: string,
) => {
  const mine = a.receipts.find((r) => r.userId === userId);
  return {
    id: String(a.id),
    reference: String(a.reference ?? ""),
    titleEn: String(a.titleEn ?? ""),
    titleAr: String(a.titleAr ?? ""),
    bodyEn: String(a.bodyEn ?? ""),
    bodyAr: String(a.bodyAr ?? ""),
    category: String(a.category ?? ""),
    priority: String(a.priority ?? "normal"),
    audience: String(a.audience ?? "company"),
    official: Boolean(a.official),
    requiresAcknowledgement: Boolean(a.requiresAcknowledgement),
    pinned: Boolean(a.pinned),
    status: String(a.status ?? "draft"),
    publishedAt: toIso(a.publishedAt),
    expiresAt: toIso(a.expiresAt),
    createdById: String(a.createdById ?? ""),
    createdAt: toIso(a.createdAt) ?? new Date().toISOString(),
    readAt: toIso(mine?.readAt),
    acknowledgedAt: toIso(mine?.acknowledgedAt),
    hiddenAt: toIso(mine?.hiddenAt),
    stats: {
      recipients: a.receipts.length,
      read: a.receipts.filter((r) => r.readAt).length,
      acknowledged: a.receipts.filter((r) => r.acknowledgedAt).length,
    },
  };
};
export type AnnouncementItem = ReturnType<typeof mapAnnouncement>;

export async function listAnnouncements(
  user: { id: string; role: string; permissions?: unknown },
  view: AnnouncementView = "inbox",
  category?: string,
) {
  const now = new Date();
  const [announcements, allReceipts] = await Promise.all([
    listTableRows<Record<string, any>>("system", "announcement"),
    listTableRows<Record<string, any>>("system", "announcement_receipt"),
  ]);
  const receiptsByAnn = new Map<string, Record<string, any>[]>();
  for (const r of allReceipts) {
    const aid = String(r.announcementId ?? "");
    const list = receiptsByAnn.get(aid) ?? [];
    list.push(r);
    receiptsByAnn.set(aid, list);
  }
  const hasCat = category && category !== "all";

  if (view === "manage") {
    const rights = await announcementRights(user);
    return announcements
      .filter((a) => {
        if (!rights.manageAll && a.createdById !== user.id) return false;
        if (hasCat && a.category !== category) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
      .slice(0, 200)
      .map((a) => mapAnnouncement({ ...a, receipts: receiptsByAnn.get(String(a.id)) ?? [] }, user.id));
  }

  return announcements
    .filter((a) => {
      if (a.status !== "published") return false;
      if (!a.publishedAt || new Date(a.publishedAt) > now) return false;
      if (view !== "hidden" && a.expiresAt && new Date(a.expiresAt) <= now) return false;
      if (hasCat && a.category !== category) return false;
      const receipts = receiptsByAnn.get(String(a.id)) ?? [];
      const mine = receipts.find((r) => r.userId === user.id);
      if (!mine) return false;
      if (view === "hidden" && !mine.hiddenAt) return false;
      if (view !== "hidden" && mine.hiddenAt) return false;
      if (view === "unread" && mine.readAt) return false;
      return true;
    })
    .sort((a, b) => {
      const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      if (pinDiff !== 0) return pinDiff;
      return new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime();
    })
    .slice(0, 200)
    .map((a) => mapAnnouncement({ ...a, receipts: receiptsByAnn.get(String(a.id)) ?? [] }, user.id));
}

export async function getAnnouncement(
  id: string,
  user: { id: string; role: string; permissions?: unknown },
) {
  const [announcements, allReceipts, requests, decisions, users, employees] = await Promise.all([
    listTableRows<Record<string, any>>("system", "announcement"),
    listTableRows<Record<string, any>>("system", "announcement_receipt"),
    listTableRows<Record<string, any>>("workflow", "approval_request"),
    listTableRows<Record<string, any>>("workflow", "approval_decision"),
    listTableRows<Record<string, any>>("identity", "user"),
    listTableRows<Record<string, any>>("hr", "employee"),
  ]);
  const raw = announcements.find((r) => r.id === id);
  if (!raw) return null;
  const receipts = allReceipts.filter((r) => r.announcementId === id);
  const a: Record<string, any> = { ...raw, receipts };

  const rights = await announcementRights(user);
  const recipient =
    receipts.some((r) => r.userId === user.id) &&
    a.status === "published" &&
    (!a.publishedAt || new Date(a.publishedAt) <= new Date());

  const annReqIds = new Set(
    requests
      .filter((r) => r.targetType === "announcement" && r.targetId === id)
      .map((r) => String(r.id)),
  );
  const approver =
    requests.some(
      (r) =>
        r.targetType === "announcement" &&
        r.targetId === id &&
        Array.isArray(r.approverIds) &&
        r.approverIds.includes(user.id),
    ) ||
    decisions.some((d) => annReqIds.has(String(d.approvalRequestId)) && d.decidedById === user.id);

  if (
    !recipient &&
    a.createdById !== user.id &&
    !rights.manageAll &&
    !approver &&
    user.role !== "super_admin"
  )
    return null;

  const userById = new Map(users.map((u) => [String(u.id), u]));
  const empByUserId = new Map(
    employees.filter((e) => e.userId).map((e) => [String(e.userId), e]),
  );
  const author = userById.get(String(a.createdById));
  const signerUser = a.signedById ? userById.get(String(a.signedById)) : null;
  const signerEmp = a.signedById ? empByUserId.get(String(a.signedById)) : null;

  const readers =
    a.createdById === user.id || rights.manageAll
      ? receipts.map((r) => ({
          name: String(userById.get(String(r.userId))?.fullName ?? ""),
          readAt: toIso(r.readAt),
          acknowledgedAt: toIso(r.acknowledgedAt),
        }))
      : [];

  return {
    ...mapAnnouncement(a as any, user.id),
    audienceDepartmentIds: Array.isArray(a.audienceDepartmentIds) ? a.audienceDepartmentIds : [],
    audienceRoles: Array.isArray(a.audienceRoles) ? a.audienceRoles : [],
    audienceUserIds: Array.isArray(a.audienceUserIds) ? a.audienceUserIds : [],
    publishAt: toIso(a.publishAt),
    author: String(author?.fullName ?? ""),
    signer: signerUser
      ? {
          nameEn: signerEmp
            ? `${signerEmp.firstNameEn} ${signerEmp.lastNameEn}`
            : String(signerUser.fullName ?? ""),
          nameAr: signerEmp
            ? `${signerEmp.firstNameAr} ${signerEmp.lastNameAr}`
            : String(signerUser.fullName ?? ""),
          titleEn: signerEmp?.jobTitleEn ?? null,
          titleAr: signerEmp?.jobTitleAr ?? null,
        }
      : null,
    signatureUrl: a.signatureUrl ?? null,
    signedAt: toIso(a.signedAt),
    decisionNotes: a.decisionNotes ?? null,
    canEdit:
      (a.createdById === user.id || rights.manageAll) &&
      ["draft", "rejected"].includes(String(a.status)),
    canManage: a.createdById === user.id || rights.manageAll,
    readers,
  };
}
export type AnnouncementDetail = NonNullable<
  Awaited<ReturnType<typeof getAnnouncement>>
>;

export async function updateAnnouncementReceipt(
  id: string,
  userId: string,
  change: "read" | "unread" | "acknowledge" | "hide" | "unhide",
) {
  const [receipts, announcements] = await Promise.all([
    listTableRows<Record<string, any>>("system", "announcement_receipt"),
    listTableRows<Record<string, any>>("system", "announcement"),
  ]);
  const receipt = receipts.find((r) => r.announcementId === id && r.userId === userId);
  if (!receipt) throw new Error(serverMessages.communicationError8);
  const announcement = announcements.find((a) => a.id === id);
  if (
    !announcement ||
    announcement.status !== "published" ||
    (announcement.publishedAt && new Date(announcement.publishedAt) > new Date())
  )
    throw new Error(serverMessages.communicationError8);
  const nowIso = new Date().toISOString();
  const data =
    change === "read"
      ? { readAt: receipt.readAt ?? nowIso }
      : change === "unread"
        ? { readAt: null }
        : change === "acknowledge"
          ? {
              readAt: receipt.readAt ?? nowIso,
              acknowledgedAt: receipt.acknowledgedAt ?? nowIso,
            }
          : change === "hide"
            ? { hiddenAt: nowIso, readAt: receipt.readAt ?? nowIso }
            : { hiddenAt: null };
  return upsertTableRow("system", "announcement_receipt", {
    id: receipt.id,
    ...data,
  });
}

export async function unreadAnnouncementCount(userId: string) {
  const now = new Date();
  const [receipts, announcements] = await Promise.all([
    listTableRows<Record<string, any>>("system", "announcement_receipt"),
    listTableRows<Record<string, any>>("system", "announcement"),
  ]);
  const annById = new Map(announcements.map((a) => [String(a.id), a]));
  return receipts.filter((r) => {
    if (r.userId !== userId || r.readAt != null || r.hiddenAt != null) return false;
    const a = annById.get(String(r.announcementId));
    if (!a || a.status !== "published") return false;
    if (!a.publishedAt || new Date(a.publishedAt) > now) return false;
    if (a.expiresAt && new Date(a.expiresAt) <= now) return false;
    return true;
  }).length;
}
