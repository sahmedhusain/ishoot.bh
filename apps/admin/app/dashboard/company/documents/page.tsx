import { requirePermission } from "../../../../lib/auth";
import * as React from "react";
import Link from "next/link";
import { getCompanyDocuments } from "@ishoot/database";
import { Card, Button, Badge, DateDisplay } from "@ishoot/ui";
import {
  Building2,
  Plus,
  Download,
  FileText,
  ShieldCheck,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { CompanyDocumentsClientView } from "../../../../components/company/CompanyDocumentsClientView";

export default async function CompanyDocumentsPage() {
  await requirePermission("settings", "read");
  const documents = await getCompanyDocuments();

  return <CompanyDocumentsClientView initialDocuments={documents} />;
}
