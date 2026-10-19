import { serverMessages } from "@ishoot/locales";
import type { Prisma } from "@prisma/client";
import { resolveSigningSignature } from "./signature-policies";
import { db, runAtomicMutation } from "../db";
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

// ---------- Settings and rights ----------

export async function getCommunicationSettings() {
  const row = await db.communicationSettings.findUnique({
    where: { id: "default" },
  });
  return { managersAnnounceToTeam: row?.managersAnnounceToTeam ?? true };
}

export async function updateCommunicationSettings(
  input: { managersAnnounceToTeam: boolean },
  actorId: string,
) {
  await db.communicationSettings.upsert({
    where: { id: "default" },
    update: {
      managersAnnounceToTeam: !!input.managersAnnounceToTeam,
      updatedById: actorId,
    },
    create: {
      id: "default",
      managersAnnounceToTeam: !!input.managersAnnounceToTeam,
      updatedById: actorId,
    },
  });
  return getCommunicationSettings();
}

async function reportsOf(userId: string): Promise<string[]> {
  const users = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, managerId: true },
  });
  const out: string[] = [];
  const queue = [userId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const u of users)
      if (u.managerId === current && !out.includes(u.id) && u.id !== userId) {
        out.push(u.id);
        queue.push(u.id);
      }
  }
  return out;
}

/**
 * What the person may post: anyone with the permission posts to any audience; reporting managers (when the company
 * allows it) post to their own team. Approving needs the approve permission.
 */
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
  const managesTeam =
    settings.managersAnnounceToTeam &&
    (await db.user.count({ where: { managerId: user.id, isActive: true } })) >
      0;
  return {
    read: can("read"),
    createAny: can("create"),
    createTeam: can("create") || managesTeam,
    approve: can("approve"),
    manageAll: can("approve") || can("delete"),
  };
}

// ---------- Recipients ----------

/** Everyone the announcement is addressed to (always including its author). */
export async function announcementRecipients(a: {
  audience: string;
  audienceDepartmentIds: string[];
  audienceRoles: string[];
  audienceUserIds: string[];
  createdById: string;
}): Promise<string[]> {
  let ids: string[] = [];
  if (a.audience === "company")
    ids = (
      await db.user.findMany({
        where: { isActive: true },
        select: { id: true },
      })
    ).map((u) => u.id);
  else if (a.audience === "team") ids = await reportsOf(a.createdById);
  else if (a.audience === "departments")
    ids = (
      await db.employee.findMany({
        where: {
          departmentId: { in: a.audienceDepartmentIds },
          userId: { not: null },
          user: { isActive: true },
        },
        select: { userId: true },
      })
    ).map((e) => e.userId!);
  else if (a.audience === "roles")
    ids = (
      await db.user.findMany({
        where: { isActive: true, role: { in: a.audienceRoles } },
        select: { id: true },
      })
    ).map((u) => u.id);
  else
    ids = (
      await db.user.findMany({
        where: { isActive: true, id: { in: a.audienceUserIds } },
        select: { id: true },
      })
    ).map((u) => u.id);
  return Array.from(new Set([...ids, a.createdById]));
}

// ---------- Writing ----------

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
  if (!titleEn || !titleAr)
    throw new Error(serverMessages.communicationError0);
  if (!bodyEn || !bodyAr)
    throw new Error(serverMessages.communicationError1);
  if (!(ANNOUNCEMENT_CATEGORIES as readonly string[]).includes(input.category))
    throw new Error(serverMessages.communicationError2);
  if (!(ANNOUNCEMENT_PRIORITIES as readonly string[]).includes(input.priority))
    throw new Error(serverMessages.communicationError3);
  if (!(ANNOUNCEMENT_AUDIENCES as readonly string[]).includes(input.audience))
    throw new Error(serverMessages.communicationError4);
  if (!rights.createAny && input.audience !== "team")
    throw new Error(serverMessages.communicationError5);
  if (!rights.createTeam)
    throw new Error(serverMessages.communicationError6);
  const list = (v?: string[]) =>
    Array.from(new Set((v ?? []).filter((x) => typeof x === "string"))).slice(
      0,
      300,
    );
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
    publishAt: input.publish_at ? new Date(input.publish_at) : null,
    expiresAt: input.expires_at ? new Date(input.expires_at) : null,
  };
  if (
    (data.audience === "departments" && !data.audienceDepartmentIds.length) ||
    (data.audience === "roles" && !data.audienceRoles.length) ||
    (data.audience === "people" && !data.audienceUserIds.length)
  )
    throw new Error(serverMessages.communicationError4);
  if (
    (data.publishAt && Number.isNaN(data.publishAt.getTime())) ||
    (data.expiresAt && Number.isNaN(data.expiresAt.getTime()))
  )
    throw new Error(serverMessages.invalidDate);
  if (data.publishAt && data.expiresAt && data.expiresAt <= data.publishAt)
    throw new Error(serverMessages.communicationError7);
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
      const existing = await db.announcement.findUnique({
        where: { id },
        select: { status: true, createdById: true },
      });
      if (!existing) throw new Error(serverMessages.communicationError8);
      if (existing.createdById !== actor.id && !rights.manageAll)
        throw new Error(serverMessages.communicationError9);
      if (!["draft", "rejected"].includes(existing.status))
        throw new Error(serverMessages.communicationError10);
      return db.announcement.update({
        where: { id },
        data: { ...data, status: "draft" },
      });
    }
    return db.announcement.create({
      data: {
        ...data,
        reference: await getNextSequenceNumber("ANN"),
        createdById: actor.id,
      },
    });
  });
}

/** Sends the announcement for approval, or publishes it at once where the approval policy allows. */
export async function submitAnnouncement(
  id: string,
  actor: { id: string; role: string; permissions?: unknown },
) {
  const rights = await announcementRights(actor);
  return runAtomicMutation(async () => {
    const a = await db.announcement.findUnique({ where: { id } });
    if (!a) throw new Error(serverMessages.communicationError8);
    if (a.createdById !== actor.id && !rights.manageAll)
      throw new Error(serverMessages.communicationError9);
    if (!["draft", "rejected"].includes(a.status))
      throw new Error(serverMessages.communicationError11);
    await db.announcement.update({
      where: { id },
      data: { status: "pending_approval" },
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
  const a = await db.announcement.findUniqueOrThrow({ where: { id } });
  const now = new Date();
  await db.announcement.update({
    where: { id },
    data: {
      status: "published",
      publishedAt: a.publishAt && a.publishAt > now ? a.publishAt : now,
      ...(a.official && signer
        ? {
            signedById: signer.id,
            signatureUrl: signer.signature,
            signedAt: now,
          }
        : {}),
    },
  });
  const recipients = await announcementRecipients(a);
  await db.announcementReceipt.createMany({
    data: recipients.map((userId) => ({ announcementId: id, userId })),
    skipDuplicates: true,
  });
  await db.notification.createMany({
    data: recipients
      .filter((userId) => userId !== a.createdById)
      .map((userId) => ({
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
        createdAt: a.publishAt && a.publishAt > now ? a.publishAt : now,
      })),
  });
}

registerApprovalFinalizer("announcement", {
  async approve(id, decider) {
    const a = await db.announcement.findUniqueOrThrow({
      where: { id },
      select: { status: true, official: true },
    });
    if (a.status !== "pending_approval")
      throw new Error(serverMessages.communicationError12);
    // The signature on an official announcement: drawn by the approver when signing on the spot, else their saved one.
    const decision = await db.approvalDecision.findFirst({
      where: {
        decidedById: decider,
        decision: "approved",
        approvalRequest: { targetType: "announcement", targetId: id },
      },
      orderBy: { decidedAt: "desc" },
      select: { signatureData: true },
    });
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
    await db.announcement.update({
      where: { id },
      data: { status: "rejected", decisionNotes: reason || null },
    });
  },
});

export async function archiveAnnouncement(
  id: string,
  actor: { id: string; role: string; permissions?: unknown },
) {
  const rights = await announcementRights(actor);
  const a = await db.announcement.findUnique({
    where: { id },
    select: { createdById: true, status: true },
  });
  if (!a) throw new Error(serverMessages.communicationError8);
  if (a.createdById !== actor.id && !rights.manageAll)
    throw new Error(serverMessages.communicationError9);
  if (a.status === "pending_approval")
    await cancelPendingApprovals("announcement", id);
  return db.announcement.update({
    where: { id },
    data: { status: "archived", pinned: false },
  });
}

// ---------- Reading ----------

export type AnnouncementView = "inbox" | "unread" | "hidden" | "manage";

const mapAnnouncement = (
  a: Prisma.AnnouncementGetPayload<{ include: { receipts: true } }>,
  userId: string,
) => {
  const mine = a.receipts.find((r) => r.userId === userId);
  return {
    id: a.id,
    reference: a.reference,
    titleEn: a.titleEn,
    titleAr: a.titleAr,
    bodyEn: a.bodyEn,
    bodyAr: a.bodyAr,
    category: a.category,
    priority: a.priority,
    audience: a.audience,
    official: a.official,
    requiresAcknowledgement: a.requiresAcknowledgement,
    pinned: a.pinned,
    status: a.status,
    publishedAt: a.publishedAt?.toISOString() ?? null,
    expiresAt: a.expiresAt?.toISOString() ?? null,
    createdById: a.createdById,
    createdAt: a.createdAt.toISOString(),
    readAt: mine?.readAt?.toISOString() ?? null,
    acknowledgedAt: mine?.acknowledgedAt?.toISOString() ?? null,
    hiddenAt: mine?.hiddenAt?.toISOString() ?? null,
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
  const categoryFilter = category && category !== "all" ? { category } : {};
  if (view === "manage") {
    const rights = await announcementRights(user);
    const rows = await db.announcement.findMany({
      where: {
        ...(rights.manageAll ? {} : { createdById: user.id }),
        ...categoryFilter,
      },
      include: { receipts: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map((a) => mapAnnouncement(a, user.id));
  }
  const rows = await db.announcement.findMany({
    where: {
      status: "published",
      publishedAt: { lte: now },
      ...(view === "hidden"
        ? {}
        : { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }),
      receipts: {
        some: {
          userId: user.id,
          ...(view === "hidden"
            ? { hiddenAt: { not: null } }
            : { hiddenAt: null }),
          ...(view === "unread" ? { readAt: null } : {}),
        },
      },
      ...categoryFilter,
    },
    include: { receipts: true },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    take: 200,
  });
  return rows.map((a) => mapAnnouncement(a, user.id));
}

/** One announcement for its reader, author or an approver; null when the person may not see it. */
export async function getAnnouncement(
  id: string,
  user: { id: string; role: string; permissions?: unknown },
) {
  const a = await db.announcement.findUnique({
    where: { id },
    include: { receipts: true },
  });
  if (!a) return null;
  const rights = await announcementRights(user);
  const recipient =
    a.receipts.some((r) => r.userId === user.id) &&
    a.status === "published" &&
    (!a.publishedAt || a.publishedAt <= new Date());
  const approver = await db.approvalRequest.findFirst({
    where: {
      targetType: "announcement",
      targetId: id,
      OR: [
        { approverIds: { has: user.id } },
        { decisions: { some: { decidedById: user.id } } },
      ],
    },
    select: { id: true },
  });
  if (
    !recipient &&
    a.createdById !== user.id &&
    !rights.manageAll &&
    !approver &&
    user.role !== "super_admin"
  )
    return null;
  const [author, signer, readers] = await Promise.all([
    db.user.findUnique({
      where: { id: a.createdById },
      select: { fullName: true },
    }),
    a.signedById
      ? db.user.findUnique({
          where: { id: a.signedById },
          select: {
            fullName: true,
            employee: {
              select: {
                firstNameEn: true,
                lastNameEn: true,
                firstNameAr: true,
                lastNameAr: true,
                jobTitleEn: true,
                jobTitleAr: true,
              },
            },
          },
        })
      : null,
    a.createdById === user.id || rights.manageAll
      ? db.announcementReceipt.findMany({
          where: { announcementId: id },
          include: { user: { select: { fullName: true } } },
        })
      : Promise.resolve([]),
  ]);
  return {
    ...mapAnnouncement(a, user.id),
    audienceDepartmentIds: a.audienceDepartmentIds,
    audienceRoles: a.audienceRoles,
    audienceUserIds: a.audienceUserIds,
    publishAt: a.publishAt?.toISOString() ?? null,
    author: author?.fullName ?? "",
    signer: signer
      ? {
          nameEn: signer.employee
            ? `${signer.employee.firstNameEn} ${signer.employee.lastNameEn}`
            : signer.fullName,
          nameAr: signer.employee
            ? `${signer.employee.firstNameAr} ${signer.employee.lastNameAr}`
            : signer.fullName,
          titleEn: signer.employee?.jobTitleEn ?? null,
          titleAr: signer.employee?.jobTitleAr ?? null,
        }
      : null,
    signatureUrl: a.signatureUrl,
    signedAt: a.signedAt?.toISOString() ?? null,
    decisionNotes: a.decisionNotes,
    canEdit:
      (a.createdById === user.id || rights.manageAll) &&
      ["draft", "rejected"].includes(a.status),
    canManage: a.createdById === user.id || rights.manageAll,
    readers: readers.map((r) => ({
      name: r.user.fullName,
      readAt: r.readAt?.toISOString() ?? null,
      acknowledgedAt: r.acknowledgedAt?.toISOString() ?? null,
    })),
  };
}
export type AnnouncementDetail = NonNullable<
  Awaited<ReturnType<typeof getAnnouncement>>
>;

/** Read, unread, acknowledge, hide or show again: the person's own copy. */
export async function updateAnnouncementReceipt(
  id: string,
  userId: string,
  change: "read" | "unread" | "acknowledge" | "hide" | "unhide",
) {
  const receipt = await db.announcementReceipt.findUnique({
    where: { announcementId_userId: { announcementId: id, userId } },
  });
  if (!receipt) throw new Error(serverMessages.communicationError8);
  const announcement = await db.announcement.findUniqueOrThrow({
    where: { id },
    select: { status: true, publishedAt: true },
  });
  if (
    announcement.status !== "published" ||
    (announcement.publishedAt && announcement.publishedAt > new Date())
  )
    throw new Error(serverMessages.communicationError8);
  const now = new Date();
  const data =
    change === "read"
      ? { readAt: receipt.readAt ?? now }
      : change === "unread"
        ? { readAt: null }
        : change === "acknowledge"
          ? {
              readAt: receipt.readAt ?? now,
              acknowledgedAt: receipt.acknowledgedAt ?? now,
            }
          : change === "hide"
            ? { hiddenAt: now, readAt: receipt.readAt ?? now }
            : { hiddenAt: null };
  return db.announcementReceipt.update({
    where: { announcementId_userId: { announcementId: id, userId } },
    data,
  });
}

export async function unreadAnnouncementCount(userId: string) {
  const now = new Date();
  return db.announcementReceipt.count({
    where: {
      userId,
      readAt: null,
      hiddenAt: null,
      announcement: {
        status: "published",
        publishedAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    },
  });
}
