import { verifyIdentityCaller } from "@platform/api-client";
import { STAFF_RESOURCES, STAFF_ACTIONS } from "@platform/contracts";
import { db, runAtomicMutation } from "../atomic";
import { withStaffProjection } from "./identity-sync";
import { deleteCustomerAccount } from "../queries/customers";

type Projection = {
  realm: "staff" | "customer";
  subjectId: string;
  version: number;
  deleted: boolean;
  email: string | null;
  roles: string[] | null;
  active: boolean | null;
  displayName: string | null;
  overrides: Record<string, boolean> | null;
  roleNameEn: string | null;
  roleNameAr: string | null;
  roleSystem: boolean | null;
  roleVersion: number | null;
};
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
function projection(
  value: unknown,
  realm: "staff" | "customer",
): Projection | null {
  if (
    !record(value) ||
    value.realm !== realm ||
    typeof value.subjectId !== "string" ||
    !value.subjectId ||
    value.subjectId.length > 200 ||
    !Number.isSafeInteger(value.version) ||
    Number(value.version) < 1 ||
    typeof value.deleted !== "boolean"
  )
    return null;
  if (realm === "customer") return value.deleted ? (value as Projection) : null;
  if (value.deleted) return value as Projection;
  if (
    typeof value.email !== "string" ||
    value.email.length > 254 ||
    !value.email.includes("@") ||
    typeof value.active !== "boolean" ||
    !Array.isArray(value.roles) ||
    value.roles.length > 1 ||
    value.roles.some(
      (role) => typeof role !== "string" || !role || role.length > 200,
    )
  )
    return null;
  if (value.active && value.roles.length !== 1) return null;
  if (
    value.displayName !== null &&
    (typeof value.displayName !== "string" || value.displayName.length > 5000)
  )
    return null;
  if (value.overrides !== null) {
    if (
      !record(value.overrides) ||
      Object.keys(value.overrides).length >
        STAFF_RESOURCES.length * STAFF_ACTIONS.length
    )
      return null;
    for (const [key, allowed] of Object.entries(value.overrides)) {
      const [resource, action, ...extra] = key.split(":");
      if (
        extra.length ||
        !STAFF_RESOURCES.includes(resource) ||
        !STAFF_ACTIONS.includes(action) ||
        typeof allowed !== "boolean"
      )
        return null;
    }
  }
  if (
    value.roles.length &&
    (typeof value.roleNameEn !== "string" ||
      typeof value.roleNameAr !== "string" ||
      value.roleNameEn.length > 5000 ||
      value.roleNameAr.length > 5000 ||
      typeof value.roleSystem !== "boolean" ||
      !Number.isSafeInteger(value.roleVersion) ||
      Number(value.roleVersion) < 1)
  )
    return null;
  return value as Projection;
}
async function receipt(id: string) {
  return (
    (
      await db.$queryRaw<
        Array<{ version: bigint }>
      >`SELECT version FROM public."IdentityProjectionReceipt" WHERE id=${id}`
    )[0]?.version ?? BigInt(0)
  );
}
async function received(id: string, version: bigint) {
  await db.$executeRaw`INSERT INTO public."IdentityProjectionReceipt"(id,version) VALUES (${id},${version}) ON CONFLICT(id) DO UPDATE SET version=EXCLUDED.version`;
}
async function lock(id: string) {
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`identity-projection:${id}`},0))`;
}

export async function applyIdentityProjection(input: Projection) {
  return withStaffProjection(() =>
    runAtomicMutation(async () => {
      const id = `${input.realm}:${input.subjectId}`,
        version = BigInt(input.version),
        role = input.roles?.[0];
      if (input.realm === "staff" && role && !input.deleted)
        await lock(`role:${role}`);
      await lock(id);
      if ((await receipt(id)) >= version) return;
      if (input.realm === "customer") {
        if (
          await db.customer.findUnique({
            where: { id: input.subjectId },
            select: { id: true },
          })
        )
          await deleteCustomerAccount(input.subjectId);
      } else {
        const existing = await db.user.findUnique({
          where: { id: input.subjectId },
          select: { id: true, fullName: true },
        });
        if (input.deleted) {
          if (existing)
            await db.user.update({
              where: { id: input.subjectId },
              data: {
                isActive: false,
                email: `${input.subjectId}@deleted.invalid`,
              },
            });
        } else if (existing || input.active || input.displayName) {
          if (role) {
            const roleId = `role:${role}`,
              roleVersion = BigInt(input.roleVersion!);
            if ((await receipt(roleId)) < roleVersion) {
              await db.role.upsert({
                where: { id: role },
                create: {
                  id: role,
                  nameEn: input.roleNameEn!,
                  nameAr: input.roleNameAr!,
                  isSystem: input.roleSystem!,
                },
                update: {
                  nameEn: input.roleNameEn!,
                  nameAr: input.roleNameAr!,
                  isSystem: input.roleSystem!,
                },
              });
              await received(roleId, roleVersion);
            }
          }
          const data = {
            email: input.email!,
            isActive: input.active!,
            ...(role ? { role } : {}),
            ...(input.displayName ? { fullName: input.displayName } : {}),
            ...(input.overrides ? { permissions: input.overrides } : {}),
          };
          if (existing)
            await db.user.update({ where: { id: input.subjectId }, data });
          else if (role)
            await db.user.create({
              data: {
                ...data,
                id: input.subjectId,
                role,
                fullName: input.displayName || input.email!,
                passwordHash: "!identity-owned",
              },
            });
        }
      }
      await received(id, version);
    }),
  );
}
export async function identityProjectionResponse(
  request: Request,
  realm: "staff" | "customer",
): Promise<Response> {
  const respond = (status: number) =>
    new Response(null, { status, headers: { "cache-control": "no-store" } });
  try {
    if (!(await verifyIdentityCaller(request.headers.get("authorization"))))
      return respond(401);
    const reader = request.body?.getReader();
    if (!reader) return respond(400);
    let length = 0;
    const parts: Uint8Array[] = [];
    try {
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        length += next.value.length;
        if (length > 65536) {
          await reader.cancel();
          return respond(413);
        }
        parts.push(next.value);
      }
    } finally {
      reader.releaseLock();
    }
    let value: unknown;
    try {
      value = JSON.parse(Buffer.concat(parts).toString("utf8"));
    } catch {
      return respond(400);
    }
    const input = projection(value, realm);
    if (!input) return respond(400);
    await applyIdentityProjection(input);
    return respond(204);
  } catch {
    return respond(503);
  }
}
