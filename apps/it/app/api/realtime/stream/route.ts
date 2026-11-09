import { isApiError, openStream } from "@platform/api-client";
import { NextRequest } from "next/server";
import { currentUser } from "../../../../lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return new Response(null, { status: 401 });
  const upstream = new AbortController();
  req.signal.addEventListener("abort", () => upstream.abort(), { once: true });
  let response: Response;
  try {
    response = await openStream({ token: user.token }, upstream.signal);
  } catch (error) {
    const status = isApiError(error) && (error.status === 401 || error.status === 429) ? error.status : 503;
    return new Response(null, { status, headers: { "Retry-After": "5" } });
  }
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
