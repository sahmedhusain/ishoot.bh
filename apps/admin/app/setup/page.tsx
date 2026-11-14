import { redirect } from "next/navigation";
import { isCompanySetupCompleted } from "@platform/database";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const configured = await isCompanySetupCompleted().catch(() => false);
  if (!configured) {
    return null;
  }
  redirect("/dashboard");
}
