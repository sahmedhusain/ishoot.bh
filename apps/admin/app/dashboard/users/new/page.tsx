import { Metadata } from "next";
import { NewUserFormView } from "@/components/users/NewUserFormView";

export const metadata: Metadata = {
  title: "New User | Access Management",
};

export default function NewUserPage() {
  return <NewUserFormView />;
}
