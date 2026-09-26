import * as React from 'react';
import { Badge } from './badge';

export interface StatusBadgeProps {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const statusConfig: Record<string, { variant: 'default' | 'emerald' | 'amber' | 'blue' | 'rose' | 'purple'; text: string }> = {
    // Deal stages
    lead: { variant: 'blue', text: 'Lead' },
    proposal_sent: { variant: 'amber', text: 'Proposal' },
    contract_signed: { variant: 'purple', text: 'Contract' },
    production: { variant: 'emerald', text: 'Production' },
    post_production: { variant: 'purple', text: 'Post-Prod' },
    delivered: { variant: 'emerald', text: 'Delivered' },
    invoiced: { variant: 'blue', text: 'Invoiced' },
    closed_won: { variant: 'emerald', text: 'Won' },
    closed_lost: { variant: 'rose', text: 'Lost' },
    // Invoice statuses
    draft: { variant: 'default', text: 'Draft' },
    sent: { variant: 'blue', text: 'Sent' },
    partially_paid: { variant: 'amber', text: 'Partially Paid' },
    paid: { variant: 'emerald', text: 'Paid' },
    overdue: { variant: 'rose', text: 'Overdue' },
    void: { variant: 'default', text: 'Void' },
    // Inquiries
    new: { variant: 'blue', text: 'New' },
    contacted: { variant: 'amber', text: 'Contacted' },
    qualified: { variant: 'emerald', text: 'Qualified' },
    archived: { variant: 'default', text: 'Archived' },
  };

  const config = statusConfig[status] || { variant: 'default', text: status };

  return <Badge variant={config.variant}>{label || config.text}</Badge>;
}
