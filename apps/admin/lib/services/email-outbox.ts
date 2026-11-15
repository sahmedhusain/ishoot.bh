import { serverMessages } from "@platform/locales";
import { listTableRows, upsertTableRow } from "../api/tables";
type Sender = (input: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
  attachments: { filename: string; content: Buffer }[];
}) => Promise<{ success: boolean; id?: string }>;
export async function processEmailJobs(sender: Sender, now = new Date()) {
  const allJobs = await listTableRows<any>("system", "email_job", "next_attempt_at ASC, id ASC").catch(() => []);
  const nowMs = now.getTime();
  for (const j of allJobs) {
    if (
      j.status === "processing" &&
      Number(j.attempts ?? 0) >= 8 &&
      new Date(j.nextAttemptAt || 0).getTime() <= nowMs
    ) {
      await upsertTableRow("system", "email_job", {
        ...j,
        status: "failed",
        lastError:
          "Final worker lease expired; inspect provider evidence before retrying",
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
    .slice(0, 3);
  const jobs = await Promise.all(
    picked.map((job) =>
      upsertTableRow<any>("system", "email_job", {
        ...job,
        status: "processing",
        attempts: Number(job.attempts ?? 0) + 1,
        nextAttemptAt: new Date(nowMs + 300000).toISOString(),
      }),
    ),
  );
  for (const job of jobs) {
    const createdMs = new Date(job.createdAt || nowMs).getTime();
    const attempts = Number(job.attempts ?? 1);
    try {
      if (attempts > 1 && nowMs - createdMs > 23 * 3600000)
        throw new Error(serverMessages.expiredRetryWindow);
      const result = await sender({
        to: job.recipient,
        subject: job.subject,
        html: job.html,
        idempotencyKey: job.eventKey,
        attachments: [
          {
            filename: job.attachmentName,
            content: Buffer.from(job.attachment),
          },
        ],
      });
      if (!result.success || !result.id)
        throw new Error(serverMessages.providerAcceptanceMissing);
      await upsertTableRow("system", "email_job", {
        ...job,
        status: "accepted",
        providerId: result.id,
        acceptedAt: now.toISOString(),
        lastError: null,
      });
    } catch {
      const expired = nowMs - createdMs > 23 * 3600000;
      await upsertTableRow("system", "email_job", {
        ...job,
        status: attempts >= 8 || expired ? "failed" : "pending",
        lastError: expired
          ? "Retry window expired; inspect provider evidence before manual retry"
          : "Provider acceptance failed",
        nextAttemptAt: new Date(
          nowMs + Math.min(1800000, 5000 * 2 ** attempts),
        ).toISOString(),
      });
    }
  }
  return jobs.length;
}
