import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createTicket } from "../../../lib/api/itsm";
import { getCurrentUser } from "../../../lib/auth";
import {
  buildErrorReportTicket,
  extractClientIp,
  parseUserAgent,
  validateErrorReportPayload,
} from "../../../lib/error-report";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_request", message: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const parsed = validateErrorReportPayload(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: "invalid_request", message: parsed.message },
      { status: 400 },
    );
  }

  const user = await getCurrentUser().catch(() => null);
  const ip = extractClientIp(request.headers);
  const ua = parseUserAgent(request.headers.get("user-agent"));
  const visitorId = crypto.randomUUID().slice(0, 12);

  const ticketInput = buildErrorReportTicket(parsed.data, {
    user,
    ip,
    ua,
    visitorId,
  });

  try {
    const ticket = await createTicket(ticketInput);
    return NextResponse.json(
      {
        ok: true,
        ticketId: ticket.id,
        ticketNumber: ticket.number,
        incidentId: parsed.data.incidentId,
        status: ticket.status,
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to create IT support ticket.";
    return NextResponse.json(
      { ok: false, error: "report_failed", message },
      { status: 502 },
    );
  }
}
