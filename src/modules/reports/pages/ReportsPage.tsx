import React from 'react';
import { ModulePlaceholder } from '../../../shared/components/ModulePlaceholder';

export function ReportsPage() {
  return (
    <ModulePlaceholder
      icon="📊"
      title="Reports & Analytics"
      description="Financial P&L, occupancy trends, food analytics, and operational KPI dashboards."
      phase="Phase 3"
      kpis={['Net Profit %', 'Cost per Occupied Bed', 'Expense Ratio', 'Revenue Growth']}
      submodules={['Financial Reports', 'Occupancy Reports', 'Food Analytics', 'Operations Analytics']}
    />
  );
}
