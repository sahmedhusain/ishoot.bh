import { serverMessages } from "@platform/locales";
import { db } from "../db";
type Sender = (input: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
  attachments: { filename: string; content: Buffer }[];
}) => Promise<{ success: boolean; id?: string }>;
export async function processEmailJobs(sender: Sender, now = new Date()) {
  const jobs = await db.$transaction(async (tx) => {
    await tx.emailJob.updateMany({
      where: {
        status: "processing",
        attempts: { gte: 8 },
        nextAttemptAt: { lte: now },
      },
      data: {
        status: "failed",
        lastError:
          "Final worker lease expired; inspect provider evidence before retrying",
      },
    });
    const picked = await tx.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM "EmailJob" WHERE status IN ('pending','processing') AND "nextAttemptAt"<=${now} AND attempts<8 ORDER BY "nextAttemptAt",id LIMIT 3 FOR UPDATE SKIP LOCKED`;
    return Promise.all(
      picked.map((job) =>
        tx.emailJob.update({
          where: { id: job.id },
          data: {
            status: "processing",
            attempts: { increment: 1 },
            nextAttemptAt: new Date(now.getTime() + 300000),
          },
        }),
      ),
    );
  });
  for (const job of jobs) {
    try {
      // Stop automatic retries after one day: provider idempotency retention is finite.
      if (
        job.attempts > 1 &&
        now.getTime() - job.createdAt.getTime() > 23 * 3600000
      )
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
      await db.emailJob.updateMany({
        where: { id: job.id, attempts: job.attempts, status: "processing" },
        data: {
          status: "accepted",
          providerId: result.id,
          acceptedAt: now,
          lastError: null,
        },
      });
    } catch {
      const expired = now.getTime() - job.createdAt.getTime() > 23 * 3600000;
      await db.emailJob.updateMany({
        where: { id: job.id, attempts: job.attempts, status: "processing" },
        data: {
          status: job.attempts >= 8 || expired ? "failed" : "pending",
          lastError: expired
            ? "Retry window expired; inspect provider evidence before manual retry"
            : "Provider acceptance failed",
          nextAttemptAt: new Date(
            now.getTime() + Math.min(1800000, 5000 * 2 ** job.attempts),
          ),
        },
      });
    }
  }
  return jobs.length;
}
