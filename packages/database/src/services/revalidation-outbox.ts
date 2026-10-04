import { db } from "../db";

export async function processRevalidationJobs(options: {
  webUrl: string;
  secret: string;
  fetcher?: typeof fetch;
  now?: Date;
  batchSize?: number;
}) {
  const url = new URL(options.webUrl);
  if (!["http:", "https:"].includes(url.protocol) || !options.secret)
    throw new Error("Configure WEB_URL and REVALIDATION_SECRET for the worker");
  const now = options.now || new Date();
  const size = options.batchSize || 5;
  if (!Number.isInteger(size) || size < 1 || size > 25)
    throw new Error("Invalid batch size");
  const jobs = await db.$transaction(async (tx) => {
    await tx.revalidationJob.updateMany({
      where: {
        status: "processing",
        attempts: { gte: 8 },
        nextAttemptAt: { lte: now },
      },
      data: {
        status: "failed",
        lastError: "Worker lease expired after final attempt",
      },
    });
    const picked = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "RevalidationJob"
      WHERE "status" IN ('pending', 'processing') AND "nextAttemptAt" <= ${now} AND "attempts" < 8
      ORDER BY "nextAttemptAt", "id" LIMIT ${size} FOR UPDATE SKIP LOCKED
    `;
    const claimed = [];
    for (const job of picked)
      claimed.push(
        await tx.revalidationJob.update({
          where: { id: job.id },
          data: {
            status: "processing",
            attempts: { increment: 1 },
            nextAttemptAt: new Date(now.getTime() + 300000),
          },
        }),
      );
    return claimed;
  });
  for (const job of jobs) {
    try {
      const response = await (options.fetcher || fetch)(
        new URL("/api/revalidate", url),
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-revalidate-secret": options.secret,
          },
          body: JSON.stringify(job.payload),
          signal: AbortSignal.timeout(3000),
        },
      );
      if (!response.ok) throw new Error(`Invalidation HTTP ${response.status}`);
      await txResult(job.id, job.attempts, {
        status: "delivered",
        deliveredAt: new Date(),
        lastError: null,
      });
    } catch {
      // Persist only a generic reason; never retain remote responses or authentication headers.
      await txResult(job.id, job.attempts, {
        status: job.attempts >= 8 ? "failed" : "pending",
        lastError: "Invalidation delivery failed",
        nextAttemptAt: new Date(
          now.getTime() + Math.min(1800000, 5000 * 2 ** job.attempts),
        ),
      });
    }
  }
  return { claimed: jobs.length };
}

async function txResult(
  id: string,
  attempts: number,
  data: Parameters<typeof db.revalidationJob.updateMany>[0]["data"],
) {
  // The attempt acts as a lease fence: a late worker cannot overwrite a newer attempt.
  await db.revalidationJob.updateMany({
    where: { id, attempts, status: "processing" },
    data,
  });
}
