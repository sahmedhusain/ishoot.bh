import {
  serverTemplates,
  formatMessage,
  serverMessages,
} from "@platform/locales";

import { listTableRows, upsertTableRow } from "../api/tables";

export async function processRevalidationJobs(options: {
  webUrl: string;
  secret: string;
  fetcher?: typeof fetch;
  now?: Date;
  batchSize?: number;
}) {
  const url = new URL(options.webUrl);
  if (!["http:", "https:"].includes(url.protocol) || !options.secret)
    throw new Error(serverMessages.configureWebUrlAndRevalidationSecretFor);
  const now = options.now || new Date();
  const size = options.batchSize || 5;
  if (!Number.isInteger(size) || size < 1 || size > 25)
    throw new Error(serverMessages.invalidBatchSize);
  const nowMs = now.getTime();
  const allJobs = await listTableRows<any>("system", "revalidation_job", "next_attempt_at ASC, id ASC").catch(() => []);
  for (const j of allJobs) {
    if (
      j.status === "processing" &&
      Number(j.attempts ?? 0) >= 8 &&
      new Date(j.nextAttemptAt || 0).getTime() <= nowMs
    ) {
      await upsertTableRow("system", "revalidation_job", {
        ...j,
        status: "failed",
        lastError: "Worker lease expired after final attempt",
      });
    }
  }
  const picked = allJobs
    .filter(
      (j) =>
        (j.status === "pending" || j.status === "processing") &&
        new Date(j.nextAttemptAt || 0).getTime() <= nowMs &&
        Number(j.attempts ?? 0) < 8,
    )
    .slice(0, size);
  const jobs = await Promise.all(
    picked.map((job) =>
      upsertTableRow<any>("system", "revalidation_job", {
        ...job,
        status: "processing",
        attempts: Number(job.attempts ?? 0) + 1,
        nextAttemptAt: new Date(nowMs + 300000).toISOString(),
      }),
    ),
  );
  for (const job of jobs) {
    const attempts = Number(job.attempts ?? 1);
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
      if (!response.ok)
        throw new Error(
          formatMessage(serverTemplates.invalidationHttp0, {
            0: response.status,
          }),
        );
      await upsertTableRow("system", "revalidation_job", {
        ...job,
        status: "delivered",
        deliveredAt: new Date().toISOString(),
        lastError: null,
      });
    } catch {
      await upsertTableRow("system", "revalidation_job", {
        ...job,
        status: attempts >= 8 ? "failed" : "pending",
        lastError: "Invalidation delivery failed",
        nextAttemptAt: new Date(
          nowMs + Math.min(1800000, 5000 * 2 ** attempts),
        ).toISOString(),
      });
    }
  }
  return { claimed: jobs.length };
}
