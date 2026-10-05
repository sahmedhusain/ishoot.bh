import { redirect } from "next/navigation";
import { ROUTES } from "../../../../constants/routes";

// Website leads live in the single request inbox now.
export default function LeadsInboxPage() {
  redirect(`${ROUTES.requests.list}?kind=inquiry`);
}
