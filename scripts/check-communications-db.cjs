// Local database only. All test records and settings are rolled back.
require("dotenv").config({ quiet: true });
require("ts-node").register({
  transpileOnly: true,
  skipProject: true,
  compilerOptions: {
    module: "CommonJS",
    target: "ES2022",
    moduleResolution: "Node",
    esModuleInterop: true,
    resolveJsonModule: true,
  },
});
const assert = require("node:assert/strict");
const { db } = require("../packages/database/src/db.ts");
const {
  transactionContext,
} = require("../packages/database/src/transaction-context.ts");
const announcements = require("../packages/database/src/queries/announcements.ts");
const letters = require("../packages/database/src/queries/official-letters.ts");
const handover = require("../packages/database/src/services/notification-handover.ts");
const engine = require("../packages/database/src/services/approval-engine.ts");
const path = require("node:path");
const sharp = require(
  require.resolve("sharp", {
    paths: [path.resolve(__dirname, "../apps/admin")],
  }),
);
const rollback = new Error("ROLLBACK_COMMUNICATIONS");
async function main() {
  assert.ok(
    ["localhost", "127.0.0.1", "::1"].includes(
      new URL(process.env.DATABASE_URL).hostname,
    ),
  );
  const signature =
    "data:image/png;base64," +
    (
      await sharp(
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200"><path d="M20 150 C 120 20,220 180,320 60 S 520 160,580 40" stroke="#111" stroke-width="5" fill="none"/></svg>',
        ),
      )
        .png()
        .toBuffer()
    ).toString("base64");
  try {
    await db.$transaction(
      (tx) =>
        transactionContext.run(tx, async () => {
          const admin = await tx.user.findFirstOrThrow({
            where: { role: "super_admin", isActive: true },
          });
          const stamp = Date.now();
          const manager = await tx.user.create({
            data: {
              email: `manager-${stamp}@comm.test`,
              fullName: "Manager",
              role: "sales",
              passwordHash: "x",
            },
          });
          const reader = await tx.user.create({
            data: {
              email: `reader-${stamp}@comm.test`,
              fullName: "Reader",
              role: "viewer",
              passwordHash: "x",
              managerId: manager.id,
            },
          });
          const outsider = await tx.user.create({
            data: {
              email: `outside-${stamp}@comm.test`,
              fullName: "Outside",
              role: "viewer",
              passwordHash: "x",
            },
          });
          const input = {
            title_en: "Team news",
            title_ar: "خبر الفريق",
            body_en: "Read this policy.",
            body_ar: "يرجى قراءة السياسة.",
            category: "policy",
            priority: "normal",
            audience: "team",
            official: true,
            requires_acknowledgement: true,
          };
          const a = await announcements.saveAnnouncement(input, manager);
          await assert.rejects(
            announcements.saveAnnouncement(
              { ...input, audience: "company" },
              manager,
            ),
            /own team only/,
          );
          await assert.rejects(
            announcements.submitAnnouncement(a.id, outsider),
            /Only the author/,
          );
          await tx.signaturePolicy.upsert({
            where: { documentType: "announcement" },
            create: { documentType: "announcement", mode: "live" },
            update: { mode: "live" },
          });
          const submitted = await announcements.submitAnnouncement(
            a.id,
            manager,
          );
          assert.equal(submitted.status, "pending");
          await assert.rejects(
            engine.decideApprovalRequest(
              submitted.approvalRequestId,
              admin.id,
              "approved",
            ),
            /must be signed now/,
          );
          await engine.decideApprovalRequest(
            submitted.approvalRequestId,
            admin.id,
            "approved",
            "checked",
            signature,
          );
          const published = await announcements.getAnnouncement(a.id, reader);
          assert.equal(published.status, "published");
          assert.equal(published.signatureUrl, signature);
          assert.equal(
            await announcements.getAnnouncement(a.id, outsider),
            null,
          );
          assert.equal(
            (await announcements.listAnnouncements(reader)).some(
              (x) => x.id === a.id,
            ),
            true,
          );
          await assert.rejects(
            announcements.updateAnnouncementReceipt(a.id, outsider.id, "read"),
            /not found/,
          );
          await announcements.updateAnnouncementReceipt(
            a.id,
            reader.id,
            "acknowledge",
          );
          assert.ok(
            (await announcements.getAnnouncement(a.id, reader)).acknowledgedAt,
          );
          await announcements.updateAnnouncementReceipt(
            a.id,
            reader.id,
            "hide",
          );
          assert.equal(
            (await announcements.listAnnouncements(reader, "hidden")).some(
              (x) => x.id === a.id,
            ),
            true,
          );
          await announcements.updateAnnouncementReceipt(
            a.id,
            reader.id,
            "unhide",
          );
          // The inbox itself (hide, delete, ownership) is the notify service's (docs/adr/0012, its Go tests); here
          // the row is written for the hand-over, which keeps its ID and recipient.
          const message = await tx.notification.findFirstOrThrow({
            where: { userId: reader.id, entityId: a.id },
          });
          assert.equal(message.handedOverAt, null, "new notifications wait for the hand-over");
          const handed = handover.toNewNotification({ ...message, messageParams: message.messageParams ?? null });
          assert.equal(handed.id, message.id);
          assert.equal(handed.recipient, reader.id);
          assert.equal(handed.realm, "staff");
          const employee = await tx.employee.findFirstOrThrow();
          const template = await letters.saveLetterTemplate({
            key: `test_${stamp}`,
            name_en: "Test template",
            name_ar: "قالب اختبار",
            subject_en: "Employment",
            subject_ar: "العمل",
            body_en: "{{employee.name}} at {{company.name}}: {{purpose}}",
            body_ar: "{{employee.name}} لدى {{company.name}}: {{purpose}}",
            about_employee: true,
            is_active: true,
          });
          const draft = await letters.draftFromTemplate(template.id, {
            employeeId: employee.id,
            purpose: "travel",
          });
          assert.ok(!draft.bodyEn.includes("{{employee.name}}"));
          assert.ok(draft.bodyEn.includes("travel"));
          const letter = await letters.saveOfficialLetter(
            {
              languages: ["ar", "en"],
              subject_en: draft.subjectEn,
              subject_ar: draft.subjectAr,
              body_en: draft.bodyEn,
              body_ar: draft.bodyAr,
              letter_date: "2026-10-08",
              classification: "external",
              show_signature: true,
              show_stamp: true,
            },
            admin.id,
          );
          const approval = await letters.submitOfficialLetter(
            letter.id,
            admin.id,
          );
          assert.equal(
            approval.status,
            "pending",
            "live-signature documents never auto-sign, even for Super Admin",
          );
          await engine.decideApprovalRequest(
            approval.approvalRequestId,
            admin.id,
            "approved",
            "checked",
            signature,
          );
          const issued = await letters.getOfficialLetter(letter.id);
          assert.equal(issued.signatureUrl, signature);
          await assert.rejects(
            letters.saveOfficialLetter(
              {
                languages: ["en"],
                subject_en: "Changed",
                body_en: "Changed",
                subject_ar: "",
                body_ar: "",
                letter_date: "2026-10-08",
                classification: "external",
                show_signature: true,
                show_stamp: true,
              },
              admin.id,
              letter.id,
            ),
            /Only a draft/,
          );
          assert.equal(
            (await letters.verifyOfficialLetter(issued.verificationCode)).valid,
            true,
          );
          await letters.cancelOfficialLetter(letter.id);
          assert.equal(
            (await letters.verifyOfficialLetter(issued.verificationCode)).valid,
            false,
          );
          const future = await announcements.saveAnnouncement(
            {
              ...input,
              title_en: "Future announcement",
              publish_at: new Date(Date.now() + 86400000).toISOString(),
            },
            manager,
          );
          const futureApproval = await announcements.submitAnnouncement(
            future.id,
            manager,
          );
          await engine.decideApprovalRequest(
            futureApproval.approvalRequestId,
            admin.id,
            "approved",
            "scheduled",
            signature,
          );
          assert.equal(
            await announcements.getAnnouncement(future.id, reader),
            null,
            "scheduled announcements are not visible early",
          );
          const scheduled = await tx.notification.findFirstOrThrow({
            where: { userId: reader.id, entityId: future.id },
          });
          assert.ok(scheduled.createdAt > new Date(), "scheduled announcements notify at their time");
          assert.equal(
            handover.toNewNotification({ ...scheduled, messageParams: scheduled.messageParams ?? null }).createdAt,
            scheduled.createdAt.toISOString(),
            "the hand-over keeps the time, so notify shows it only then",
          );
          throw rollback;
        }),
      { timeout: 120000 },
    );
  } catch (e) {
    if (e !== rollback) throw e;
  }
  console.log(
    "Communications checks passed and rolled back: manager/team boundaries, approval and live signatures, receipt ownership, notifications handed over with their time, template filling, immutable approved letters, cancellation and verification.",
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
