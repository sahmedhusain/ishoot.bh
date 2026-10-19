import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { SESSION_COOKIE_NAME } from "../../../lib/auth";
import { ProfileSecurityView } from "../../../components/profile/ProfileSecurityView";
import { ProfileWorkspace } from "../../../components/profile/ProfileWorkspace";
import { requireAuth } from "../../../lib/auth";
import {
  db,
  getProfileChangeRequestsForUser,
  listSignatureChanges,
  getEmployeeAssets,
} from "@platform/database";
import { hasPermission } from "../../../lib/auth";
import { EmployeeAssetsCard } from "../../../components/assets/EmployeeAssetsCard";
import { SignaturePad } from "../../../components/profile/SignaturePad";
import { UserProfileView } from "../../../components/profile/UserProfileView";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireAuth();

  // The profile shows the user's own details and requests only; requests they approve open in the Approvals Center.
  const [manager, employeeRecord, myRequests] = await Promise.all([
    db.user
      .findUniqueOrThrow({
        where: { id: user.id },
        select: {
          manager: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      })
      .then((record) => record.manager),
    db.employee
      .findFirst({
        where: { userId: user.id },
        include: { department: true },
      })
      // Decimals cannot cross to client components.
      .then((employee) =>
        employee
          ? { ...employee, leaveBalanceDays: Number(employee.leaveBalanceDays) }
          : null,
      )
      .catch(() => null),
    getProfileChangeRequestsForUser(user.id).catch(() => []),
  ]);

  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const hash = token ? createHash("sha256").update(token).digest("hex") : null;
  const [security, activeSessions, recoveryCount] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { mfaEnabled: true },
    }),
    db.session.findMany({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        token: true,
        createdAt: true,
        expiresAt: true,
        userAgent: true,
        ipAddress: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.mfaRecoveryCode.count({ where: { userId: user.id, usedAt: null } }),
  ]);
  // Always include the current device, even if there are many newer sessions.
  if (hash && !activeSessions.some((session) => session.token === hash)) {
    const current = await db.session.findFirst({
      where: { userId: user.id, token: hash, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        token: true,
        createdAt: true,
        expiresAt: true,
        userAgent: true,
        ipAddress: true,
      },
    });
    if (current) activeSessions.unshift(current);
  }
  const sessions = activeSessions.map(({ token, ...session }) => ({
    ...session,
    current: token === hash,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  }));
  return (
    <ProfileWorkspace hasEmployee={!!employeeRecord}>
      <UserProfileView
        user={user}
        manager={manager}
        employeeRecord={employeeRecord}
        myRequests={myRequests}
      />
      {employeeRecord && (
        <section id="assets" className="scroll-mt-20">
          <EmployeeAssetsCard
            {...await getEmployeeAssets(employeeRecord.id)}
            own
            canOpenAssets={await hasPermission("assets", "read")}
          />
        </section>
      )}
      <section id="signature" className="scroll-mt-20">
        <SignaturePad
          currentUrl={user.signature_url}
          changes={await listSignatureChanges(user.id)}
        />
      </section>
      <ProfileSecurityView
        mfaEnabled={security.mfaEnabled}
        sessions={sessions}
        recoveryCount={recoveryCount}
      />
    </ProfileWorkspace>
  );
}
