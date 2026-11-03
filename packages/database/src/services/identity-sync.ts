// Identity (backend/services/identity) holds staff credentials and checks every session against the account's
// email, role and active flag. The admin still owns those profile fields, so each committed change to a User row
// is pushed to identity here: a deactivated or re-roled person is signed out at once.
import { AsyncLocalStorage } from "node:async_hooks";
import { transactionContext } from "../transaction-context";
import type { Prisma, PrismaClient } from "@prisma/client";
import { setAccountPassword, syncAccount } from "@platform/api-client";

/** The fields identity keeps a copy of. */
const projectingStaff = new AsyncLocalStorage<boolean>();
export const withStaffProjection = <T>(run: () => Promise<T>) =>
  projectingStaff.run(true, run);
const SYNCED_FIELDS = ["email", "role", "roleDefinition", "isActive"];

/** Users written inside an open transaction, pushed once it commits; true marks a deleted user. */
const pendingAccountSync = new AsyncLocalStorage<{
  users: Map<string, boolean>;
  provisioned: Set<string>;
}>();

/** Local scripts and unit tests run without the backend; production always syncs. */
const identityConfigured = () =>
  !!process.env.API_URL || process.env.NODE_ENV === "production";

const touchesSyncedField = (data: unknown) =>
  !!data &&
  typeof data === "object" &&
  SYNCED_FIELDS.some((field) => field in data);

/** Pushes the committed state of these users to identity; a user no longer stored is deactivated. */
export async function pushStaffAccounts(
  client: PrismaClient,
  users: Map<string, boolean>,
) {
  if (!users.size || !identityConfigured()) return;
  const rows = await client.user.findMany({
    where: { id: { in: Array.from(users.keys()) } },
    select: { id: true, email: true, role: true, isActive: true },
  });
  const stored = new Map(rows.map((row) => [row.id, row]));
  for (const [id, deleted] of Array.from(users)) {
    const row = stored.get(id);
    if (row)
      await syncAccount("staff", id, {
        email: row.email,
        roles: [row.role],
        active: row.isActive,
      });
    // The address is freed so it can be given to a new account.
    else if (deleted)
      await syncAccount("staff", id, {
        email: `${id}@deleted.invalid`,
        roles: [],
        active: false,
      });
  }
}

/**
 * Gives a staff account a password in identity. A new account is created there inactive, so a transaction that
 * rolls back leaves nobody able to sign in; the row's own sync activates it once committed.
 */
export async function setStaffPassword(
  id: string,
  password: string,
  newAccount?: { email: string; role: string },
) {
  if (!identityConfigured()) return;
  if (newAccount) {
    await syncAccount("staff", id, {
      email: newAccount.email,
      roles: [newAccount.role],
      active: false,
    });
    pendingAccountSync.getStore()?.provisioned.add(id);
  }
  await setAccountPassword("staff", id, { password });
}

/** Prisma middleware recording which users a write changed; pushes them now, or after the open transaction commits. */
export function staffAccountSyncMiddleware(
  client: PrismaClient,
): Prisma.Middleware {
  return async (params, next) => {
    if (params.model !== "User" || projectingStaff.getStore())
      return next(params);
    const { action, args } = params;
    const reader = transactionContext.getStore() ?? client;
    const users = new Map<string, boolean>();
    if (action === "updateMany" || action === "deleteMany") {
      if (action === "deleteMany" || touchesSyncedField(args?.data))
        for (const row of await reader.user.findMany({
          where: args?.where,
          select: { id: true },
        }))
          users.set(row.id, action === "deleteMany");
    } else if (action === "delete") {
      const row = await reader.user.findUnique({
        where: args.where,
        select: { id: true },
      });
      if (row) users.set(row.id, true);
    }
    // Record the ID even when a writer selects only another field from the updated row.
    if (args?.select && ["create", "upsert", "update"].includes(action))
      args.select.id = true;
    const result = await next(params);
    if (
      (action === "create" ||
        action === "upsert" ||
        (action === "update" && touchesSyncedField(args?.data))) &&
      result?.id
    )
      users.set(result.id, false);
    if (!users.size) return result;
    const pending = pendingAccountSync.getStore();
    if (pending) users.forEach((deleted, id) => pending.users.set(id, deleted));
    else if (params.runInTransaction && identityConfigured())
      throw new Error(
        "Staff account writes must use a transaction with an identity commit hook",
      );
    else await pushStaffAccounts(client, users);
    return result;
  };
}

/** Runs a transaction and pushes the users it changed only after a successful commit; failures reach the caller. */
export async function withAccountSync<T>(
  client: PrismaClient,
  run: () => Promise<T>,
): Promise<T> {
  if (pendingAccountSync.getStore()) return run();
  const pending = {
    users: new Map<string, boolean>(),
    provisioned: new Set<string>(),
  };
  let result: T;
  try {
    result = await pendingAccountSync.run(pending, run);
  } catch (error) {
    for (const id of Array.from(pending.provisioned))
      await syncAccount("staff", id, {
        email: `${id}@deleted.invalid`,
        roles: [],
        active: false,
      });
    throw error;
  }
  await pushStaffAccounts(client, pending.users);
  return result;
}
