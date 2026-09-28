import * as React from "react";
import { getAllServices } from "@ishoot/database";
import { ServicesManagementView } from "../../../components/services/ServicesManagementView";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const services = await getAllServices();

  return <ServicesManagementView initialServices={services} />;
}
