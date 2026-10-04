import { ROUTES } from "../../../constants/routes";
import { redirect } from "next/navigation";

export default function SettingsIndexPage() {
  redirect(ROUTES.settings.preferences);
}
