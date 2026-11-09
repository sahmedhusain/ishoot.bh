import { redirect } from "next/navigation";
import { ROUTES } from "../../../constants/routes";

export default function HrPage() {
  redirect(ROUTES.hr.employees);
}
