import { getOwnAccount, listOwnSessions, listEmployees } from "@platform/api-client";
import { getStaffToken } from "../../../lib/auth";
import { ProfileSecurityView } from "../../../components/profile/ProfileSecurityView";
import { ProfileWorkspace } from "../../../components/profile/ProfileWorkspace";
import { requireAuth } from "../../../lib/auth";
import {
  getProfileChangeRequestsForUser,
  listSignatureChanges,
  getEmployeeAssets,
} from "@platform/database";
import { hasPermission } from "../../../lib/auth";
import { EmployeeAssetsCard } from "../../../components/assets/EmployeeAssetsCard";
import { SignaturePad } from "../../../components/profile/SignaturePad";
import { UserProfileView } from "../../../components/profile/UserProfileView";
import { pageMetadata } from "../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("profile");

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireAuth();

  // The profile shows the user's own details and requests only; requests they approve open in the Approvals Center.
  const [rawEmployees, myRequests] = await Promise.all([
    listEmployees().catch(() => []),
    getProfileChangeRequestsForUser(user.id).catch(() => []),
  ]);
  const matchedEmp = rawEmployees.find((e) => e.email === user.email || e.id === user.id);
  const employeeRecord = matchedEmp
    ? {
        ...matchedEmp,
        firstNameEn: matchedEmp.firstNameEn || (matchedEmp as any).first_name_en || "",
        lastNameEn: matchedEmp.lastNameEn || (matchedEmp as any).last_name_en || "",
        leaveBalanceDays: Number((matchedEmp as any).leaveBalanceDays ?? (matchedEmp as any).leave_balance_days ?? 0),
        department: null,
      }
    : null;
  const manager = null;

  // Sign-in security (two-step status, recovery codes and sessions) lives in identity.
  const staff = await getStaffToken();
  const [security, ownSessions] = staff
    ? await Promise.all([getOwnAccount(staff.token), listOwnSessions(staff.token)])
    : [{ mfaEnabled: false, recoveryCodesLeft: 0 }, []];
  const sessions = ownSessions.map((session) => ({
    id: session.id,
    current: session.current,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    userAgent: session.userAgent ?? null,
    ipAddress: session.clientIp ?? null,
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
        recoveryCount={security.recoveryCodesLeft}
      />
    </ProfileWorkspace>
  );
}
