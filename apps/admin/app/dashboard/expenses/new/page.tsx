import { requirePermission } from "../../../../lib/auth";
import { Metadata } from "next";
import { NewExpenseFormView } from "@/components/expenses/NewExpenseFormView";

export const metadata: Metadata = {
  title: "Log Expense | Finance",
};

export default async function NewExpensePage() {
  await requirePermission("expenses", "write");
  return <NewExpenseFormView />;
}
