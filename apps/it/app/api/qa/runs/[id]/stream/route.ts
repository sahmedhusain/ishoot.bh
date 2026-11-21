import { NextRequest } from "next/server";
import { itAllowed } from "@platform/contracts";
import { currentUser } from "../../../../../../lib/session";
import { getQaRun, subscribeQaRun } from "../../../../../../lib/qa-runner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) return new Response(null, { status: 401 });
  if (!itAllowed(user.roles, "system_health", "read")) {
    return new Response(null, { status: 403 });
  }

  const { id } = await context.params;
  const initialRun = getQaRun(id);
  if (!initialRun) return new Response(null, { status: 404 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup();
        }
      };

      let unsubscribe = () => {};
      let heartbeat: ReturnType<typeof setInterval> | null = null;
      const cleanup = () => {
        if (closed) return;
        closed = true;
        unsubscribe();
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // stream already closed
        }
      };

      send("init", { run: initialRun });
      if (initialRun.status !== "running") {
        send("done", { run: initialRun });
        cleanup();
        return;
      }

      unsubscribe = subscribeQaRun(id, (ev) => {
        if (ev.type === "line") {
          send("line", { line: ev.line });
        } else if (ev.type === "done") {
          send("done", { run: ev.run });
          cleanup();
        }
      });

      heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          cleanup();
        }
      }, 15_000);

      req.signal.addEventListener("abort", cleanup, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
