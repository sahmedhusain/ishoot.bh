import { verifyIdentityCaller } from "@platform/api-client";
import { getCustomer } from "../api/commerce";
import { deleteCustomerAccount } from "../queries/customers";

type CustomerProjection = {
  realm: "customer";
  subjectId: string;
  version: number;
  deleted: boolean;
};

const projectionReceipts = new Map<string, bigint>();

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

export async function applyCustomerIdentityProjection(input: CustomerProjection) {
  const id = `customer:${input.subjectId}`;
  const version = BigInt(input.version);
  const previous = projectionReceipts.get(id) ?? BigInt(0);
  if (previous >= version) return;

  const existing = await getCustomer(input.subjectId).catch(() => null);
  if (existing) {
    await deleteCustomerAccount(input.subjectId).catch(() => undefined);
  } else {
    await deleteCustomerAccount(input.subjectId).catch(() => undefined);
  }
  projectionReceipts.set(id, version);
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
