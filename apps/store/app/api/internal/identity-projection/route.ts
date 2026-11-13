import { identityProjectionResponse } from "@platform/database/services/identity-projection";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = (request: Request) =>
  identityProjectionResponse(request, "customer");
