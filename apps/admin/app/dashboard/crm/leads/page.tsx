import { redirect } from "next/navigation";
import { ROUTES } from "../../../../constants/routes";

export default function LeadsInboxPage() {
  redirect(`${ROUTES.requests.list}?kind=inquiry`);
}
