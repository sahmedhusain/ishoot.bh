import {
  getGosiRules,
  listGosiComponents,
  listGosiRegistrations,
} from "@platform/database";
import { hasPermission, requirePagePermission } from "../../../../lib/auth";
import { GosiView } from "../../../../components/gosi/GosiView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("hr/pensions");

export const dynamic = "force-dynamic";

/** Social insurance: the rules, dated contribution rates and every employee's registration. */
export default async function PensionPage() {
  await requirePagePermission("payroll", "read");
  const [rules, components, registrations, canEdit] = await Promise.all([
    getGosiRules(),
    listGosiComponents(),
    listGosiRegistrations(),
    hasPermission("payroll", "edit"),
  ]);
  return (
    <GosiView
      rules={rules}
      components={components}
      registrations={registrations}
      canEdit={canEdit}
    />
  );
}
