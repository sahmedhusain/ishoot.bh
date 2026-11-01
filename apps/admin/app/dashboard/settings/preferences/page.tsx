import { PreferencesView } from "../../../../components/settings/PreferencesView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("settings/preferences");

export const dynamic = "force-dynamic";

export default function PreferencesPage() {
  return <PreferencesView />;
}
