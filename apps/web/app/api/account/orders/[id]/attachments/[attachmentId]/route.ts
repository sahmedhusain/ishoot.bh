import { lookupFile } from "@platform/api-client";
import { fileResponse } from "@platform/database";
import {
  accountsEnabled,
  currentCustomer,
} from "../../../../../../../lib/customer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  if (!(await accountsEnabled())) return new Response(null, { status: 404 });
  const customer = await currentCustomer();
  if (!customer) return new Response(null, { status: 401 });
  const { id, attachmentId } = await params;
  if (!id || !attachmentId) return new Response(null, { status: 404 });
  return new Response(null, { status: 404 });
}
