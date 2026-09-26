import * as React from 'react';
import { getAllClientLogos } from '@ishoot/database';
import { ClientsManagementView } from '../../../../components/cms/ClientsManagementView';

export const dynamic = 'force-dynamic';

export default async function ClientLogosManagerPage() {
  const logos = await getAllClientLogos();

  return <ClientsManagementView initialLogos={logos} />;
}
