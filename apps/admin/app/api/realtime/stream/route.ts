import { isApiError, openStream } from "@platform/api-client";
import { ALL_RESOURCES } from "@platform/database/constants/permissions";
import { NextRequest } from "next/server";
import { getCurrentUser } from "../../../../lib/auth";
import { myLiveTopics } from "../../../../lib/inbox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The signed-in person's live stream (Server-Sent Events, docs/adr/0012), passed through from the realtime service.
 * The topics follow their permissions; the stream closes when the browser leaves.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });
  const topics = await myLiveTopics(ALL_RESOURCES);
  const upstream = new AbortController();
  req.signal.addEventListener("abort", () => upstream.abort(), { once: true });
  let response: Response;
  try {
    response = await openStream({ realm: "staff", userId: user.id, topics }, upstream.signal);
  } catch (error) {
    const status = isApiError(error) && error.status === 429 ? 429 : 503;
    return new Response(null, { status, headers: { "Retry-After": "5" } });
  }
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // no-transform keeps compression from buffering the events.
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
