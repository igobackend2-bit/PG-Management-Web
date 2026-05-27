import React from 'react';
import { ModulePlaceholder } from '../../../shared/components/ModulePlaceholder';

export function LeadsPage() {
  return (
    <ModulePlaceholder
      icon="📣"
      title="Vacancy & Leads"
      description="Bed-wise vacancy tracking, lead management, conversion funnel, and marketing ROI."
      phase="Phase 3"
      kpis={['Occupancy %', 'Vacancy Days', 'Lead Conversion %', 'Cost per Acquisition']}
      submodules={['Vacancy Tracking', 'Lead Management', 'Conversion Funnel', 'Marketing ROI']}
    />
  );
}
