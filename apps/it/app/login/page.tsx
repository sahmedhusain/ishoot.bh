import { redirect } from "next/navigation";
import { currentUser } from "../../lib/session";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <LoginForm />
    </main>
  );
}
