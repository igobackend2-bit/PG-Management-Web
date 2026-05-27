import React from 'react';
import { ModulePlaceholder } from '../../../shared/components/ModulePlaceholder';

export function AccountsPage() {
  return (
    <ModulePlaceholder
      icon="₹"
      title="Accounts"
      description="Rent management, advance ledger, expense tracking, cashbook, and P&L reporting."
      phase="Phase 1"
      kpis={['Rent Collection %', 'Pending Dues', 'Profit Margin', 'Revenue per Bed', 'Expense per Tenant']}
      submodules={['Rent Management', 'Advance & Deposit Ledger', 'Expense Management', 'Cashbook', 'Profit & Loss']}
    />
  );
}
