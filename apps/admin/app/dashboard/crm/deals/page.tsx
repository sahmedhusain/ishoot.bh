import * as React from 'react';
import { getCRMDeals, getCRMContacts } from '@ishoot/database';
import { KanbanBoard } from '../../../../components/crm/KanbanBoard';

export const dynamic = 'force-dynamic';

export default async function DealsPipelinePage() {
  const [deals, contacts] = await Promise.all([
    getCRMDeals(),
    getCRMContacts(),
  ]);

  return <KanbanBoard initialDeals={deals} contacts={contacts} />;
}
