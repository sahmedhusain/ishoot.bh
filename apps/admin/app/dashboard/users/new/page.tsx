import { requirePermission } from "../../../../lib/auth";
import { db } from "@ishoot/database";
import { Metadata } from "next";
import { NewUserFormView } from "@/components/users/NewUserFormView";

export const metadata: Metadata = {
  title: "New User | Access Management",
};

export default async function NewUserPage() {
  await requirePermission("users", "write");
  const roles = await db.role.findMany({
    select: { id: true, nameEn: true, nameAr: true },
    orderBy: { createdAt: "asc" },
  });
  return <NewUserFormView roles={roles} />;
}
