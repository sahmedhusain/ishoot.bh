import * as React from "react";
import { getCompanySettings } from "@ishoot/database";
import { CompanySettingsView } from "../../../../components/settings/CompanySettingsView";

export const dynamic = "force-dynamic";

export default async function CompanySettingsPage() {
  const settings = await getCompanySettings();

  return <CompanySettingsView initialSettings={settings} />;
}
