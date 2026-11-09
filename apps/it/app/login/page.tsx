import { redirect } from "next/navigation";
import { currentUser } from "../../lib/session";
import { getCompanyBranding } from "../../lib/company-branding";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  const branding = await getCompanyBranding();
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <LoginForm branding={branding} />
    </main>
  );
}
