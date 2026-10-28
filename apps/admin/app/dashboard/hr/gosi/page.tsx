import { redirect } from "next/navigation";
import { ROUTES } from "../../../../constants/routes";
export default function LegacyPensionPage() { redirect(ROUTES.hr.gosi); }
