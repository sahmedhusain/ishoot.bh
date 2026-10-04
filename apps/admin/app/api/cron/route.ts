import { NextResponse } from "next/server";
import { db } from "@ishoot/database";
import { processEmailJobs } from "@ishoot/database";
import { sendEmail } from "@ishoot/email";
import { processRevalidationJobs } from "@ishoot/database";
import { uploadRoot } from "@ishoot/database";
import path from "node:path";
import fs from "node:fs/promises";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (process.env.RESEND_API_KEY && process.env.FROM_EMAIL) {
      await processEmailJobs(sendEmail);
    }
    if (process.env.WEB_URL && process.env.REVALIDATION_SECRET) {
      await processRevalidationJobs({
        webUrl: process.env.WEB_URL,
        secret: process.env.REVALIDATION_SECRET,
      });
    }
    const root = uploadRoot();
    let removed = 0;
    try {
      await db.$transaction(async tx => {
        const rows = await tx.$queryRaw<{id: string, fileUrl: string}[]>`SELECT id,"fileUrl" FROM "UploadObject" WHERE "claimedAt" IS NULL AND "isPublic"=false AND "expiresAt"<CURRENT_TIMESTAMP ORDER BY "expiresAt" LIMIT 25 FOR UPDATE SKIP LOCKED`;
        for (const row of rows) {
          if (!/^\/api\/files\/[a-z]+\/[a-zA-Z0-9_-]+\.(pdf|png|jpg|jpeg|webp)$/.test(row.fileUrl)) continue;
          const relative = row.fileUrl.slice('/api/files/'.length);
          const filename = path.resolve(root, relative);
          if (!filename.startsWith(path.resolve(root) + path.sep)) continue;
          try {
            const canonicalRoot = await fs.realpath(root);
            const canonicalFile = await fs.realpath(filename);
            if (!canonicalFile.startsWith(canonicalRoot + path.sep)) continue;
            await fs.unlink(canonicalFile);
          } catch(error: any) {
            if (error.code !== 'ENOENT') console.error(error);
          }
          await tx.uploadObject.delete({ where: { id: row.id } });
          removed++;
        }
      }, { timeout: 15000 });
      await db.abuseWindow.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86400000) } } });
      await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    } catch (e) {
      console.error("Maintenance task error", e);
    }

    return NextResponse.json({ success: true, removedUploads: removed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
