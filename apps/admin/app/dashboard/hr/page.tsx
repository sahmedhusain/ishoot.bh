import { redirect } from "next/navigation";
import { ROUTES } from "../../../constants/routes";

// HR has no overview page of its own; the employee directory is its start page.
export default function HrPage() {
  redirect(ROUTES.hr.employees);
}
