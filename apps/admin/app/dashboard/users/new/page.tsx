import { requirePermission } from "../../../../lib/auth";
import { Metadata } from "next";
import { NewUserFormView } from "@/components/users/NewUserFormView";

export const metadata: Metadata = {
  title: "New User | Access Management",
};

export default async function NewUserPage() {
  await requirePermission("users", "write");
  return <NewUserFormView />;
}
