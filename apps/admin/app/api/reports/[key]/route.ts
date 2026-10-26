import { NextRequest, NextResponse } from "next/server";
import { serverMessages, getTranslations } from "@platform/locales";
import { createActivityLog, measureOperation, runReport } from "@platform/database";
import { getCurrentUser } from "../../../../lib/auth";
import { getCachedCompanySettings } from "../../../../lib/cached-queries";
import { exportReport, reportLabels, reportsForUser } from "../../../../lib/reports";
import { reportPeriod } from "../../../../lib/report-params";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** A report as CSV, Excel or PDF, for the period asked, if the person may run it. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  return measureOperation("admin:reports/[key]:GET", async () => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: serverMessages.unauthorized }, { status: 401 });
    const { key } = await params;
    if (!(await reportsForUser(user.id)).some((r) => r.key === key)) return NextResponse.json({ error: serverMessages.reportNotFound }, { status: 403 });
    const q = req.nextUrl.searchParams;
    const locale = q.get("locale") === "en" ? "en" : "ar";
    const format = ["csv", "xlsx", "pdf"].includes(q.get("format") ?? "") ? q.get("format")! : "csv";
    const result = await runReport(key, { ...reportPeriod({ from: q.get("from"), to: q.get("to") }), locale, labels: reportLabels(getTranslations(locale).admin) });
    const file = await exportReport(result, format, locale, await getCachedCompanySettings());
    await createActivityLog({ user_id: user.id, action: "export", entity_type: "report", entity_id: key, details: { format, from: result.from, to: result.to } });
    return new NextResponse(new Uint8Array(file.body), { headers: { "Content-Type": file.type, "Content-Disposition": `attachment; filename="${file.name}"`, "Cache-Control": "private, no-store" } });
  });
}
