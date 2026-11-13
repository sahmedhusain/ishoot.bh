import { verifyIdentityCaller } from "@platform/api-client";
import { db } from "../atomic";
import { deleteCustomerAccount } from "../queries/customers";

type CustomerProjection = {
  realm: "customer";
  subjectId: string;
  version: number;
  deleted: boolean;
};

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

function customerProjection(value: unknown): CustomerProjection | null {
  if (
    !record(value) ||
    value.realm !== "customer" ||
    typeof value.subjectId !== "string" ||
    !value.subjectId ||
    value.subjectId.length > 200 ||
    !Number.isSafeInteger(value.version) ||
    Number(value.version) < 1 ||
    typeof value.deleted !== "boolean" ||
    !value.deleted
  )
    return null;
  return value as CustomerProjection;
}

async function receipt(id: string): Promise<bigint> {
  const row = (await db.$queryRaw`SELECT version FROM public."IdentityProjectionReceipt" WHERE id=${id}`) as Array<{ version: bigint }>;
  return row[0]?.version ?? BigInt(0);
}

async function received(id: string, version: bigint) {
  await db.$executeRaw`INSERT INTO public."IdentityProjectionReceipt"(id,version) VALUES (${id},${version}) ON CONFLICT(id) DO UPDATE SET version=EXCLUDED.version`;
}

async function lock(id: string) {
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`identity-projection:${id}`},0))`;
}

export async function applyCustomerIdentityProjection(input: CustomerProjection) {
  const id = `customer:${input.subjectId}`;
  const version = BigInt(input.version);
  await lock(id);
  if ((await receipt(id)) >= version) return;
  const existing = await db.customer.findUnique({
    where: { id: input.subjectId },
    select: { id: true },
  });
  if (existing) {
    await deleteCustomerAccount(input.subjectId);
  }
  await received(id, version);
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
    if (realm !== "customer") return respond(400);
    const input = customerProjection(value);
    if (!input) return respond(400);
    await applyCustomerIdentityProjection(input);
    return respond(204);
  } catch {
    return respond(503);
  }
}
