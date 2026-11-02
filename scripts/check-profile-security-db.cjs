// Local database only; all accounts, sessions and security changes roll back.
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
const crypto = require("node:crypto");
const path = require("node:path");
const bcrypt = require(
  require.resolve("bcryptjs", {
    paths: [path.resolve(__dirname, "../packages/database")],
  }),
);
const { db } = require("../packages/database/src/db.ts");
const {
  transactionContext,
} = require("../packages/database/src/transaction-context.ts");
const security = require("../packages/database/src/queries/account-security.ts");
const mfa = require("../packages/database/src/services/mfa.ts");
const {
  toNewNotification,
} = require("../packages/database/src/services/notification-handover.ts");
const profile = require("../packages/database/src/queries/profile-changes.ts");
const rollback = new Error("ROLLBACK_PROFILE_SECURITY");
process.env.MFA_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
function unbase32(value) {
  let bits = 0,
    num = 0,
    bytes = [];
  for (const c of value) {
    num = (num << 5) | "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c);
    bits += 5;
    if (bits >= 8) {
      bytes.push((num >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}
(async () => {
  assert.ok(
    ["localhost", "127.0.0.1", "[::1]", "::1"].includes(
      new URL(process.env.DATABASE_URL).hostname,
    ),
  );
  try {
    await db.$transaction(
      (tx) =>
        transactionContext.run(tx, async () => {
          const tag = Date.now();
          const password = "Original-password-strong";
          const fresh = "Replacement-password-strong";
          const user = await tx.user.create({
            data: {
              email: `profile-${tag}@test.invalid`,
              fullName: "Profile test",
              role: "viewer",
              passwordHash: await bcrypt.hash(password, 10),
            },
          });
          const other = await tx.user.create({
            data: {
              email: `other-${tag}@test.invalid`,
              fullName: "Other",
              role: "viewer",
              passwordHash: "x",
            },
          });
          const session = async (userId) =>
            tx.session.create({
              data: {
                userId,
                token: crypto.randomBytes(32).toString("hex"),
                expiresAt: new Date(Date.now() + 86400000),
              },
            });
          const current = await session(user.id),
            remote = await session(user.id),
            foreign = await session(other.id);
          await assert.rejects(
            security.revokeOwnSession(user.id, foreign.id, current.id),
            /Session not found/,
          );
          await assert.rejects(
            security.revokeOwnSession(user.id, current.id, current.id),
            /current session/,
          );
          await security.revokeOtherSessions(user.id, current.id);
          assert.equal(
            await tx.session.count({ where: { userId: user.id } }),
            1,
          );
          assert.ok(await tx.session.findUnique({ where: { id: foreign.id } }));
          await assert.rejects(
            security.changeOwnPassword(user.id, {
              currentPassword: "wrong",
              newPassword: fresh,
            }),
            /incorrect/,
          );
          await assert.rejects(
            security.changeOwnPassword(user.id, {
              currentPassword: password,
              newPassword: "short",
            }),
            /at least 12/,
          );
          await assert.rejects(
            security.changeOwnPassword(user.id, {
              currentPassword: password,
              newPassword: password,
            }),
            /different/,
          );
          await tx.authChallenge.create({
            data: {
              userId: user.id,
              email: user.email,
              type: "password_reset",
              codeHash: "test",
              expiresAt: new Date(Date.now() + 86400000),
            },
          });
          await security.changeOwnPassword(user.id, {
            currentPassword: password,
            newPassword: fresh,
          });
          assert.equal(
            await tx.session.count({ where: { userId: user.id } }),
            0,
          );
          assert.equal(
            await tx.authChallenge.count({ where: { userId: user.id } }),
            0,
          );
          assert.ok(
            await bcrypt.compare(
              fresh,
              (await tx.user.findUniqueOrThrow({ where: { id: user.id } }))
                .passwordHash,
            ),
          );
          assert.ok(await tx.session.findUnique({ where: { id: foreign.id } }));
          await mfa.beginMfaEnrollment(user.id);
          await mfa.cancelMfaEnrollment(user.id);
          assert.equal(
            (await tx.user.findUniqueOrThrow({ where: { id: user.id } }))
              .mfaPendingSecretEncrypted,
            null,
          );
          const setup = await mfa.beginMfaEnrollment(user.id);
          const recovery = await mfa.completeMfaEnrollment(
            user.id,
            mfa.totp(unbase32(setup.secret), Math.floor(Date.now() / 30000)),
          );
          await assert.rejects(
            security.changeOwnPassword(user.id, {
              currentPassword: fresh,
              newPassword: password,
            }),
            /authentication or recovery/,
          );
          await security.changeOwnPassword(user.id, {
            currentPassword: fresh,
            newPassword: password,
            code: recovery[0],
          });
          assert.equal(
            await tx.mfaRecoveryCode.count({
              where: { userId: user.id, usedAt: { not: null } },
            }),
            1,
          );
          assert.equal(
            await mfa.verifyMfa(user.id, recovery[0]),
            false,
            "recovery code is consumed once",
          );
          await assert.rejects(
            profile.requestProfileChange(
              user.id,
              { email: "invalid" },
              user.id,
            ),
            /valid e-mail/,
          );
          await assert.rejects(
            profile.requestProfileChange(
              user.id,
              { fullName: user.fullName, email: user.email },
              user.id,
            ),
            /before submitting/,
          );
          await tx.notification.createMany({
            data: Array.from({ length: 60 }, (_, i) => ({
              userId: user.id,
              title: `Notice ${i}`,
              message: "Test",
              createdAt: new Date(Date.now() - i * 1000),
            })),
          });
          await tx.notification.create({
            data: {
              userId: user.id,
              title: "Future",
              message: "Test",
              createdAt: new Date(Date.now() + 86400000),
            },
          });
          await tx.notification.create({
            data: {
              userId: user.id,
              title: "Hidden",
              message: "Test",
              hiddenAt: new Date(),
            },
          });
          await tx.notification.create({
            data: { userId: other.id, title: "Other", message: "Test" },
          });
          // Unread counts and paging are the notify service's (docs/adr/0012, its Go tests); here the rows must reach it
          // with their state: hidden ones archived, long titles cut to notify's limit.
          const hidden = await tx.notification.findFirstOrThrow({ where: { userId: user.id, title: "Hidden" } });
          const handedHidden = toNewNotification({ ...hidden, messageParams: hidden.messageParams ?? null });
          assert.equal(handedHidden.archivedAt, hidden.hiddenAt.toISOString());
          assert.equal(handedHidden.readAt, null);
          const long = toNewNotification({ ...hidden, title: "x".repeat(400), hiddenAt: null, isRead: true, messageParams: null });
          assert.equal(Array.from(long.title).length, 300);
          assert.equal(long.readAt, hidden.createdAt.toISOString());
          assert.equal(
            await tx.notification.count({ where: { handedOverAt: null, userId: { in: [user.id, other.id] } } }),
            63,
            "every row waits for the hand-over, including the future one",
          );
          throw rollback;
        }),
      { timeout: 120000 },
    );
  } catch (err) {
    if (err !== rollback) throw err;
  }
  console.log(
    "Profile security checks passed and rolled back: password verification, MFA/recovery codes, session ownership and revocation, no-op identity validation and notifications handed over with their state.",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
