import { Metadata } from "next";
import { NewExpenseFormView } from "@/components/expenses/NewExpenseFormView";

export const metadata: Metadata = {
  title: "Log Expense | Finance",
};

export default function NewExpensePage() {
  return <NewExpenseFormView />;
}
